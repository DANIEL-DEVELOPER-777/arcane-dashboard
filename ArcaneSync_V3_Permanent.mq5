//+------------------------------------------------------------------+
//| Arcane_RealTime_Sync.mq5                                         |
//| EA: Attaches to chart, waits for trades to close, sends them     |
//+------------------------------------------------------------------+
#property version   "1.00"

input string ServerURL = "http://18.134.126.63:5000"; 
input string Token = "0f73c586-13cf-4252-be59-5523a273e628"; 

int OnInit() {
   Print("=== Arcane Real-Time Sync Active ===");
   return(INIT_SUCCEEDED);
}

// This function triggers automatically when trade history changes
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result) {

   // Check if a deal was added to history
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      ulong ticket = trans.deal;
      
      if(HistoryDealSelect(ticket)) {
         long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
         
         // DEAL_ENTRY_OUT means a trade was closed (Profit/Loss realized)
         if(entry == DEAL_ENTRY_OUT) {
            SendTrade(ticket);
         }
      }
   }
}

void SendTrade(ulong ticket) {
   long time = HistoryDealGetInteger(ticket, DEAL_TIME);
   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
   double comm = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double total = profit + swap + comm;

   // JSON Payload for single trade
   string json = StringFormat("{\"t\":%lld,\"p\":%.2f}", time, total);
   
   string url = ServerURL + "/api/webhook/mt5/" + Token;
   
   char postData[];
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   // --- FIX FOR ERROR 400 ---
   if(ArraySize(postData) > 0) ArrayResize(postData, ArraySize(postData) - 1);
   // -------------------------

   string headers = "Content-Type: application/json\r\n";
   char result[];
   string responseHeaders;
   
   WebRequest("POST", url, headers, 3000, postData, result, responseHeaders);
   PrintFormat("Synced Trade Ticket #%d", ticket);

   // SEND STATUS SNAPSHOT (balance/equity) so server records latest account balance
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyProfit = equity - balance; // approximation
   string statusJson = StringFormat("{\"balance\":%.2f,\"equity\":%.2f,\"profit\":%.2f,\"dailyProfit\":%.2f}", balance, equity, equity - balance, dailyProfit);

   char statusData[];
   StringToCharArray(statusJson, statusData, 0, WHOLE_ARRAY, CP_UTF8);
   if(ArraySize(statusData) > 0) ArrayResize(statusData, ArraySize(statusData) - 1);

   WebRequest("POST", url, headers, 3000, statusData, result, responseHeaders);
   Print("Sent status snapshot to server.");
}