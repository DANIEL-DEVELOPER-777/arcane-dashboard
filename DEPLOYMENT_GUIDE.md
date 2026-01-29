# Complete Deployment Guide - Arcane Dashboard
## For Complete Beginners 🚀

---

## PART 1: Understanding What We're Doing

### The Big Picture
You have:
- **Dashboard App** (React frontend + Node.js backend)
- **Database** (Neon PostgreSQL in the cloud)
- **MetaTrader 5** (your trading platform)
- **AWS Lightsail** (cloud server to run your dashboard)

**Goal**: Deploy dashboard to AWS, connect it to Neon database, and let MT5 send trading data to it.

---

## PART 2: Setup Neon Database (Skip if Already Done)

### What is Neon?
Neon is a cloud PostgreSQL database. Your app stores data there (trades, accounts, history).

### Check Your Neon Connection String
1. Go to: https://console.neon.tech
2. Login to your account
3. Click your project
4. You should see a connection string like:
   ```
   postgresql://neondb_owner:YOUR_PASSWORD@ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
   ```
5. Copy it and paste into `.env` file (already done in your case ✓)

**Your Neon is ready!** ✅

---

## PART 3: Create .env File (Local & Server)

### What is .env?
A file with secrets and settings that the app reads. **Never share it or commit to Git.**

### Update Your Local .env

Open: `server/.env` and update:

```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
SERVER_BASE_URL=https://YOUR-DOMAIN-HERE.com

# Neon - Keep your existing connection string
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Session secret (any random string - keep it safe!)
SESSION_SECRET=arcane_secret_key_change_this_in_production

PM2_APP_NAME=arcane-dashboard
```

**Replace:**
- `YOUR-DOMAIN-HERE.com` → Your actual domain (or Lightsail IP for testing)
- Keep Neon DATABASE_URL as is ✓

---

## PART 4: Build Locally (Your Computer)

### Step 1: Open Terminal

1. Windows: Press `Win + R`, type `cmd`, press Enter
2. macOS: Cmd + Space, type `Terminal`, press Enter
3. Linux: Ctrl + Alt + T

### Step 2: Navigate to Project Folder

```bash
cd c:\Users\hp\Downloads\Replit\ SS-\ Arcane\ReplitExport-NoahX36\Arcane-Dashboard
```

(Copy the exact path from your folder)

### Step 3: Install Dependencies

Type this command and press Enter:
```bash
npm install
```

**What it does**: Downloads all required code libraries. Takes 2-5 minutes.

### Step 4: Push Database Schema

Type:
```bash
npm run db:push
```

**What it does**: Creates tables in your Neon database (accounts, equity_snapshots, etc.)

### Step 5: Build the App

Type:
```bash
npm run build
```

**What it does**: Converts your code into production format. Creates a `dist/` folder.

### Step 6: Test Locally

Type:
```bash
npm start
```

**What it does**: Starts the app on `http://localhost:3000`

**To stop**: Press `Ctrl + C`

---

## PART 5: AWS Lightsail Setup (Detailed)

### Step 1: Create Lightsail Instance

1. Go to: https://lightsail.aws.amazon.com
2. Click **"Create Instance"**
3. Choose:
   - **Location**: Pick closest to you
   - **Image**: Ubuntu 22.04 LTS (the operating system)
   - **Plan**: $5-10/month (small plan is fine)
4. Name it: `arcane-dashboard`
5. Click **Create**
6. Wait 1-2 minutes for it to start (you'll see a green dot)

### Step 2: Connect to Your Instance

1. Click your instance name
2. Click **"Connect using SSH"** button (orange button on right)
3. A terminal opens in your browser

**Congratulations!** You're now inside your cloud server. 🎉

### Step 3: Update System

Copy and paste this one line at a time:

```bash
sudo apt update
```

Wait for it to finish, then:

```bash
sudo apt upgrade -y
```

This takes 2-5 minutes. Let it finish.

### Step 4: Install Node.js

Copy and paste:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

Then:

```bash
sudo apt install -y nodejs
```

Verify it worked:
```bash
node --version
```

Should show: `v20.x.x` ✓

### Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

PM2 keeps your app running even if it crashes. It auto-restarts.

---

## PART 6: Upload Your Project to AWS

### Option A: Using Git (Recommended)

**If you haven't set up Git:**

1. Go to: https://github.com (create free account if needed)
2. Create a **new private repository** (e.g., `arcane-dashboard`)
3. Don't add README yet
4. Copy the repository URL

**On your local computer (in terminal):**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/arcane-dashboard.git
git push -u origin main
```

(Replace `YOUR-USERNAME` with your GitHub username)

**On AWS Lightsail (in the browser terminal):**

```bash
cd /home/ubuntu
git clone https://github.com/YOUR-USERNAME/arcane-dashboard.git
cd arcane-dashboard
```

### Option B: Using SCP (If No Git)

**On your local computer terminal:**

```bash
scp -r -i "c:\path\to\lightsail_key.pem" "c:\Users\hp\Downloads\Replit SS- Arcane\ReplitExport-NoahX36\Arcane-Dashboard" ubuntu@YOUR-LIGHTSAIL-IP:/home/ubuntu/
```

(Get your SSH key and IP from Lightsail dashboard)

---

## PART 7: Install & Start App on AWS

**In the Lightsail browser terminal:**

### Step 1: Go to Project Folder

```bash
cd /home/ubuntu/Arcane-Dashboard
```

### Step 2: Install Dependencies

```bash
npm install
```

(This takes 3-5 minutes)

### Step 3: Run Database Migration

```bash
npm run db:push
```

### Step 4: Build the App

```bash
npm run build
```

### Step 5: Start with PM2

```bash
pm2 start npm --name "arcane-dashboard" -- start
```

### Step 6: Setup Auto-Start on Reboot

```bash
pm2 startup
pm2 save
```

Copy the command it shows and run it (includes `sudo`).

### Step 7: Verify App is Running

```bash
pm2 list
```

You should see `arcane-dashboard` with status **"online"** ✓

---

## PART 8: Setup Nginx (Reverse Proxy)

### What is Nginx?
A web server that forwards requests to your app. Also handles SSL (HTTPS).

### Install Nginx

```bash
sudo apt install -y nginx
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/arcane-dashboard
```

Paste this (Ctrl + Shift + V):

```nginx
server {
    listen 80;
    server_name YOUR-LIGHTSAIL-IP-OR-DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Replace `YOUR-LIGHTSAIL-IP-OR-DOMAIN` with your Lightsail public IP.

**Save**: Press `Ctrl + X`, then `Y`, then Enter.

### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/arcane-dashboard /etc/nginx/sites-enabled/
```

### Test Nginx Config

```bash
sudo nginx -t
```

Should say: `ok` ✓

### Start Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## PART 9: Open Ports in Lightsail

1. Go back to Lightsail dashboard (browser)
2. Click your instance
3. Click **"Networking"** tab
4. Click **"Edit Rules"**
5. Add these rules:
   - **HTTP** (port 80) - from anywhere
   - **HTTPS** (port 443) - from anywhere
6. Click **Save**

---

## PART 10: Setup SSL (HTTPS) - Let's Encrypt

This makes your site **secure** (https:// instead of http://).

**On Lightsail terminal:**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Then:

```bash
sudo certbot --nginx -d YOUR-LIGHTSAIL-IP-OR-DOMAIN
```

Follow the prompts:
- Enter email
- Accept terms (Y)
- Share email (N is fine)

Certbot auto-updates Nginx config ✓

---

## PART 11: Test Your Dashboard

Open your browser and go to:

```
https://YOUR-LIGHTSAIL-IP-OR-DOMAIN
```

**You should see the login page!** 🎉

**Login credentials** (hardcoded in the app):
- Username: `NoahX36`
- Password: `ArcaneX36$!Noah100922`

---

## PART 12: MT5 History Sync (Simplified)

You **don't need a webhook token** yet. The app already accepts MT5 data via:

**Endpoint**: `/api/webhook/mt5/:token`

**What you need to do:**

1. In your Lightsail instance, generate a simple token:

```bash
node -e "console.log(require('crypto').randomUUID())"
```

Copy the output (it looks like: `a1b2c3d4-e5f6-7890...`)

2. Update `.env` on Lightsail:

```bash
sudo nano /home/ubuntu/Arcane-Dashboard/server/.env
```

Add:
```
MT5_TOKEN=PASTE-YOUR-TOKEN-HERE
```

3. Restart app:

```bash
pm2 restart arcane-dashboard
```

---

## PART 13: MT5 Script Setup (Simple Version)

For now, **just post account data manually** or use a simple Expert Advisor:

**In MT5, create a script** (File → New → Script):

```mql5
#property script_show_inputs

input string ServerURL = "https://YOUR-LIGHTSAIL-IP-OR-DOMAIN";
input string Token = "YOUR-TOKEN-HERE";

void OnStart() {
  double balance = AccountInfoDouble(ACCOUNT_BALANCE);
  double equity = AccountInfoDouble(ACCOUNT_EQUITY);
  double profit = equity - balance;

  string json = StringFormat(
    "{\"balance\":%.2f,\"equity\":%.2f,\"profit\":%.2f}",
    balance, equity, profit
  );

  char post[];
  StringToCharArray(json, post);
  char result[];
  string headers = "Content-Type: application/json\r\n";
  
  string url = ServerURL + "/api/webhook/mt5/" + Token;
  int res = WebRequest("POST", url, headers, post, 5000, result);
  
  if (res == -1) {
    Print("Error: ", GetLastError());
  } else {
    Print("Success!");
  }
}
```

Replace:
- `ServerURL` with your Lightsail domain
- `Token` with the token you generated

**Before running:**
1. Tools → Options → Expert Advisors → Add your domain to "Allow WebRequest..."
2. Compile script (F5)
3. Attach to any chart and run

---

## PART 14: Troubleshooting

### App won't start?

**Check logs:**
```bash
pm2 logs arcane-dashboard
```

**Common issues:**
- Database connection: Check `DATABASE_URL` in `.env`
- Port in use: Change `PORT` in `.env`

### Can't reach website?

1. Check Lightsail public IP is correct
2. Verify ports 80 & 443 are open
3. Check Nginx: `sudo systemctl status nginx`

### Neon database error?

1. Test connection: `psql postgresql://neondb_owner:password@host/db`
2. Check `.env` DATABASE_URL is correct
3. Re-run: `npm run db:push`

---

## PART 15: Key Commands Cheat Sheet

**On Lightsail:**

```bash
# View logs
pm2 logs arcane-dashboard

# Restart app
pm2 restart arcane-dashboard

# Stop app
pm2 stop arcane-dashboard

# Edit .env
sudo nano /home/ubuntu/Arcane-Dashboard/server/.env

# Check Nginx status
sudo systemctl status nginx

# View active connections
netstat -tuln

# SSH back in (from your computer)
ssh -i "path/to/key.pem" ubuntu@YOUR-IP
```

---

## PART 16: Summary ✅

1. ✅ Neon database ready
2. ✅ `.env` file configured
3. ✅ Built locally & tested
4. ✅ Uploaded to Lightsail
5. ✅ Installed Node, PM2, Nginx
6. ✅ App running on AWS with auto-restart
7. ✅ HTTPS enabled (SSL certificate)
8. ✅ Dashboard accessible: `https://YOUR-DOMAIN`
9. ✅ MT5 can send data to `/api/webhook/mt5/:token`

**You're live!** 🚀

---

## Questions?

If something fails:
1. Read the **error message carefully**
2. Check the Troubleshooting section
3. Look at `pm2 logs`
4. Verify `.env` variables are correct

**Good luck!** 🎯
