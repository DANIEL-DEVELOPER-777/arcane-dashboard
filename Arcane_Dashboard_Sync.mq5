//+------------------------------------------------------------------+
//| Arcane_Dashboard_Sync.mq5                                        |
//| Simple daily account sync for Arcane Dashboard                  |
//| - Sends current balance, equity, profit to dashboard             |
//| - No history collection (data already in Neon from manual import)|
//| - Runs daily or on demand                                        |
//+------------------------------------------------------------------+
#property script_show_inputs

// USER SETTINGS - Change these
input string ServerURL = "http://18.134.126.63:5000";  // Your dashboard URL
input string Token = "0f73c586-13cf-4252-be59-5523a273e628";                             // Will be set by server admin

// INTERNAL SETTINGS
input int RequestTimeoutMs = 10000;  // How long to wait for response
input bool VerboseLogging = true;    // Print detailed logs

//+------------------------------------------------------------------+
//| MAIN FUNCTION - Runs when script is executed                    |
//+------------------------------------------------------------------+
void OnStart() {
  Print("=== Arcane Dashboard Sync Started ===");
  
  // Step 1: Collect current account data
  double balance = AccountInfoDouble(ACCOUNT_BALANCE);
  double equity = AccountInfoDouble(ACCOUNT_EQUITY);
  double dailyProfit = 0;  // Will calculate below
  
  if(VerboseLogging) {
    PrintFormat("Account Balance: %.2f", balance);
    PrintFormat("Account Equity: %.2f", equity);
  }
  
  // Step 2: Calculate daily profit
  // This is simplified - real daily profit requires trade analysis
  // For now, we use equity - balance as an approximation
  dailyProfit = equity - balance;
  
  if(VerboseLogging) {
    PrintFormat("Daily Profit (approx): %.2f", dailyProfit);
  }
  
  // Step 3: Create JSON data
  string jsonData = CreateJsonPayload(balance, equity, dailyProfit);
  
  if(VerboseLogging) {
    PrintFormat("Payload: %s", jsonData);
  }
  
  // Step 4: Send to server
  SendToServer(jsonData);
  
  Print("=== Arcane Dashboard Sync Complete ===");
}

//+------------------------------------------------------------------+
//| CREATE JSON PAYLOAD                                              |
//+------------------------------------------------------------------+
string CreateJsonPayload(double balance, double equity, double dailyProfit) {
  // Format: {"balance": 10000.00, "equity": 10500.00, "profit": 500.00, "dailyProfit": 500.00}
  
  string json = StringFormat(
    "{\"balance\":%.2f,\"equity\":%.2f,\"profit\":%.2f,\"dailyProfit\":%.2f}",
    balance,
    equity,
    equity - balance,  // Total profit = equity - starting balance
    dailyProfit        // Daily profit
  );
  
  return json;
}

//+------------------------------------------------------------------+
//| SEND TO SERVER                                                  |
//+------------------------------------------------------------------+
void SendToServer(string json) {
  
  // Step 1: Validate server URL
  if(ServerURL == "https://YOUR-LIGHTSAIL-IP-OR-DOMAIN") {
    Print("ERROR: ServerURL not configured! Update script settings.");
    return;
  }
  
  // Step 2: Build full URL
  string url = ServerURL + "/api/webhook/mt5/" + Token;
  
  if(VerboseLogging) {
    PrintFormat("Sending to: %s", url);
  }
  
  // Step 3: Convert string to bytes
  char postData[];
  StringToCharArray(json, postData);
  
  // Step 4: Prepare headers
  string headers = "Content-Type: application/json\r\n";
  
  // Step 5: Send request
  char result[];
  string responseHeaders;
  
  int httpCode = WebRequest(
    "POST",
    url,
    headers,
    RequestTimeoutMs,
    postData,
    result,
    responseHeaders
  );
  
  // Step 6: Handle response
  if(httpCode == -1) {
    int lastError = GetLastError();
    PrintFormat("ERROR: WebRequest failed! Error code: %d", lastError);
    
    if(lastError == 4013) {
      Print("  → MT5 WebRequest not allowed for this domain");
      Print("  → Solution: Add your domain to Tools → Options → Expert Advisors");
    }
    else if(lastError == 4014) {
      Print("  → Timeout waiting for server response");
      Print("  → Solution: Check if server is online and responding");
    }
    else {
      PrintFormat("  → See MT5 error code reference: %d", lastError);
    }
  }
  else {
    PrintFormat("SUCCESS: Server responded with HTTP %d", httpCode);
    
    if(ArraySize(result) > 0) {
      string response = CharArrayToString(result, 0, ArraySize(result));
      if(VerboseLogging) {
        PrintFormat("Response: %s", response);
      }
    }
  }
}

//+------------------------------------------------------------------+
// OPTIONAL: Timer-based auto-sync (uncomment to use)
//+------------------------------------------------------------------+
// void OnTick() {
//   static datetime lastSync = 0;
//   datetime now = TimeCurrent();
//   
//   // Sync once per day at 00:00
//   if(TimeDay(now) != TimeDay(lastSync)) {
//     Print("Daily sync triggered...");
//     OnStart();  // Run sync
//     lastSync = now;
//   }
// }
