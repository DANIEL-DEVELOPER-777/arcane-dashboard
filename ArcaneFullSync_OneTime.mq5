//+------------------------------------------------------------------+
//|                                   Arcane_Full_History_Sync.mq5   |
//| Script: Run this ONCE to upload all past history using one URL   |
//+------------------------------------------------------------------+
#property script_show_inputs
#property strict

// Simply paste the full URL from the dashboard here
input string API_Link = "http://18.134.126.63:5000/api/webhook/mt5/YOUR_TOKEN_HERE";

void OnStart() {
   if(API_Link == "" || API_Link == "http://18.134.126.63:5000/api/webhook/mt5/YOUR_TOKEN_HERE") {
      Alert("Error: Please paste your specific Webhook URL from the Arcane Dashboard.");
      return;
   }

   Print("=== Arcane History Sync Started ===");

   // 1. Select Entire Account History
   if(!HistorySelect(0, TimeCurrent())) {
      Print("Error: Could not select history");
      return;
   }

   int totalDeals = HistoryDealsTotal();
   string jsonPayload = "[";
   int count = 0;

   // 2. Loop through every deal
   for(int i = 0; i < totalDeals; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      
      // Filter: We only want closed trades (Entry Out)
      if(entry == DEAL_ENTRY_OUT) {
         long time = HistoryDealGetInteger(ticket, DEAL_TIME);
         double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double comm = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double totalProfit = profit + swap + comm;

         if(count > 0) jsonPayload += ",";
         
         jsonPayload += StringFormat("{\"t\":%lld,\"p\":%.2f}", time, totalProfit);
         count++;
      }
   }
   jsonPayload += "]";

   // 3. Send if we found trades
   if(count > 0) {
      PrintFormat("Syncing %d historical trades...", count);
      SendToServer(jsonPayload);
   } else {
      Print("No historical trades found.");
      // Even if no trades, send the current balance snapshot
      SendStatus();
   }
}

void SendToServer(string json) {
   char postData[];
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   // Fix for JSON Parsing: Remove null terminator
   if(ArraySize(postData) > 0) ArrayResize(postData, ArraySize(postData) - 1);

   string headers = "Content-Type: application/json\r\n";
   char result[];
   string responseHeaders;

   int code = WebRequest("POST", API_Link, headers, 10000, postData, result, responseHeaders);
   
   if(code == 200) {
      Print("SUCCESS: History Uploaded.");
      SendStatus(); // Send balance after successful history upload
   }
   else PrintFormat("ERROR: Server returned %d. Check if URL is whitelisted.", code);
}

void SendStatus() {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   
   string statusJson = StringFormat("{\"balance\":%.2f,\"equity\":%.2f}", balance, equity);

   char statusData[];
   StringToCharArray(statusJson, statusData, 0, WHOLE_ARRAY, CP_UTF8);
   if(ArraySize(statusData) > 0) ArrayResize(statusData, ArraySize(statusData) - 1);

   string headers = "Content-Type: application/json\r\n";
   char result[];
   string responseHeaders;

   int code2 = WebRequest("POST", API_Link, headers, 10000, statusData, result, responseHeaders);
   if(code2 == 200) Print("SUCCESS: Account balance synced.");
}