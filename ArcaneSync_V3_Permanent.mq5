//+------------------------------------------------------------------+
//|                                       Arcane_RealTime_Sync.mq5   |
//| EA: Attaches to chart, waits for trades to close, sends them     |
//+------------------------------------------------------------------+
#property version   "1.10"
#property strict

// Simply paste the full URL from the dashboard here
input string API_Link = "http://18.134.126.63:5000/api/webhook/mt5/YOUR_TOKEN_HERE"; 

int OnInit() {
   if(API_Link == "" || API_Link == "http://18.134.126.63:5000/api/webhook/mt5/YOUR_TOKEN_HERE") {
      Alert("Error: Please paste your specific Webhook URL from the Arcane Dashboard.");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
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
         long dealType = HistoryDealGetInteger(ticket, DEAL_TYPE);
         // If deposit/withdrawal/credit/charge, send only status snapshot
         if(dealType == DEAL_TYPE_CREDIT || dealType == DEAL_TYPE_CHARGE || dealType == DEAL_TYPE_BALANCE || dealType == DEAL_TYPE_DEPOSIT || dealType == DEAL_TYPE_WITHDRAWAL) {
            SendStatusSnapshot();
            Print("Deposit/withdrawal detected, sent status snapshot only.");
         }
         // DEAL_ENTRY_OUT means a trade was closed (Profit/Loss realized)
         else if(entry == DEAL_ENTRY_OUT) {
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

   // 1. Send the Trade Deal
   string json = StringFormat("{\"t\":%lld,\"p\":%.2f}", time, total);
   SendData(json);
   PrintFormat("Synced Trade Ticket #%d", ticket);

   // 2. Send the Account Status Snapshot
   SendStatusSnapshot();
// Send only the account status snapshot (for deposit/withdrawal events)
void SendStatusSnapshot() {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   double dailyProfit = equity - balance; // approximation
   string statusJson = StringFormat("{\"balance\":%.2f,\"equity\":%.2f,\"profit\":%.2f,\"dailyProfit\":%.2f}", 
                                     balance, equity, equity - balance, dailyProfit);
   SendData(statusJson);
   Print("Sent status snapshot to server.");
}
}

// Helper function to handle WebRequests
void SendData(string json) {
   char postData[];
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   // Remove null terminator to prevent JSON parse errors on server
   if(ArraySize(postData) > 0) ArrayResize(postData, ArraySize(postData) - 1);

   string headers = "Content-Type: application/json\r\n";
   char result[];
   string responseHeaders;
   
   int res = WebRequest("POST", API_Link, headers, 3000, postData, result, responseHeaders);
   
   if(res == -1) {
      Print("Error in WebRequest. Check 'Tools -> Options -> Expert Advisors -> Allow WebRequest for listed URL'");
   }
}