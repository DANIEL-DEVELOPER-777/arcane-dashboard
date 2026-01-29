//+------------------------------------------------------------------+
//| Arcane_Full_History_Sync.mq5                                     |
//| Script: Run this ONCE to upload all past history                 |
//+------------------------------------------------------------------+
#property script_show_inputs

input string ServerURL = "http://18.134.126.63:5000"; 
input string Token = "0f73c586-13cf-4252-be59-5523a273e628"; 

void OnStart() {
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
      
      // Filter: We only want closed trades (Entry Out) that aren't zero-value ops
      if(entry == DEAL_ENTRY_OUT) {
         long time = HistoryDealGetInteger(ticket, DEAL_TIME);
         double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double comm = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double totalProfit = profit + swap + comm;

         // Add comma if not the first item
         if(count > 0) jsonPayload += ",";
         
         // Format: {"t": timestamp, "p": profit}
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
   }
}

void SendToServer(string json) {
   string url = ServerURL + "/api/webhook/mt5/" + Token; // Ensure your server handles arrays!
   
   char postData[];
   StringToCharArray(json, postData, 0, WHOLE_ARRAY, CP_UTF8);
   
   // --- FIX FOR ERROR 400 ---
   // Remove the null terminator byte from the end
   if(ArraySize(postData) > 0) ArrayResize(postData, ArraySize(postData) - 1);
   // -------------------------

   string headers = "Content-Type: application/json\r\n";
   char result[];
   string responseHeaders;

   int code = WebRequest("POST", url, headers, 10000, postData, result, responseHeaders);
   
   if(code == 200) Print("SUCCESS: History Uploaded.");
   else PrintFormat("ERROR: Server returned %d", code);
}