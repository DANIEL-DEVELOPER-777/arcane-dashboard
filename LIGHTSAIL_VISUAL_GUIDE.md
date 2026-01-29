# Step-by-Step AWS Lightsail Deployment (Visual Guide)

## STEP 1: Create Lightsail Instance

### 1.1 - Open AWS Lightsail
- Go to: https://lightsail.aws.amazon.com
- Sign in with your AWS account

### 1.2 - Click "Create Instance"
You'll see a big blue button. Click it.

### 1.3 - Select Region
Choose closest to you (e.g., EU-West-1 if in Europe)

### 1.4 - Select Image
```
You'll see options:
- Linux/Unix → Ubuntu 22.04 LTS ← CHOOSE THIS
- Don't choose Windows, don't choose other Linux versions
```

### 1.5 - Select Plan
```
You'll see pricing. Choose:
- $5/month plan (2GB RAM, 1 vCPU) - Perfect for this app
- $10/month if you want more power
```

### 1.6 - Name Your Instance
```
Type: arcane-dashboard
```

### 1.7 - Create
Click the orange "Create Instance" button.

⏱️ Wait 1-2 minutes. You'll see spinning wheel. When it's green, it's ready.

---

## STEP 2: Connect to Your Instance

### 2.1 - Click Your Instance Name
From the list, click "arcane-dashboard"

### 2.2 - Look for Orange Button
You'll see an orange "Connect using SSH" button on the right side. Click it.

### 2.3 - Terminal Opens
A black terminal window opens in your browser. This is your **command line** on the AWS server.

**Everything you type here runs on AWS, not your computer!**

---

## STEP 3: Update System (Commands to Paste)

### 3.1 - Paste This Command
```bash
sudo apt update
```

Wait for it to finish (you'll see text scroll). This takes ~30 seconds.

### 3.2 - Paste This Next
```bash
sudo apt upgrade -y
```

This takes 2-5 minutes. Lots of text will scroll. **Let it finish!**

---

## STEP 4: Install Node.js

### 4.1 - Paste This Long Command
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

Wait for it to finish.

### 4.2 - Paste This
```bash
sudo apt install -y nodejs
```

Takes ~1 minute.

### 4.3 - Verify It Worked
```bash
node --version
```

You should see: `v20.x.x` ✓

If you see version number, perfect! If not, go back and retry step 4.1 & 4.2.

---

## STEP 5: Install PM2 (Process Manager)

### 5.1 - Paste This
```bash
sudo npm install -g pm2
```

Wait for it to finish.

**What is PM2?**
- Keeps your app running 24/7
- Auto-restarts if it crashes
- Very common on production servers

---

## STEP 6: Upload Your Project

### OPTION A: Using GitHub (Easiest)

#### 6A.1 - Create GitHub Repo (On Your Computer)
1. Go to: https://github.com
2. Click "+" → "New repository"
3. Name: `arcane-dashboard`
4. Choose "Private" (optional but recommended)
5. Click "Create repository"
6. Copy the URL (looks like: `https://github.com/YOUR-USERNAME/arcane-dashboard.git`)

#### 6A.2 - Upload Your Local Code (On Your Computer)
Open your computer's terminal:

```bash
cd "c:\Users\hp\Downloads\Replit SS- Arcane\ReplitExport-NoahX36\Arcane-Dashboard"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/arcane-dashboard.git
git push -u origin main
```

(Replace `YOUR-USERNAME` with your actual GitHub username)

#### 6A.3 - Download on AWS (In Lightsail Terminal)
Paste this:
```bash
cd /home/ubuntu
git clone https://github.com/YOUR-USERNAME/arcane-dashboard.git
cd arcane-dashboard
```

(Replace `YOUR-USERNAME`)

✓ Your code is now on AWS!

---

## STEP 7: Install Dependencies & Build

### 7.1 - Install (In Lightsail Terminal)
```bash
npm install
```

⏱️ Takes 3-5 minutes. Lots of text will scroll. Let it finish.

### 7.2 - Create Database Tables
```bash
npm run db:push
```

Should say "✓ All migrations applied"

### 7.3 - Build for Production
```bash
npm run build
```

Should say "✓ Built successfully" or similar.

---

## STEP 8: Start Your App with PM2

### 8.1 - Start App
```bash
pm2 start npm --name "arcane-dashboard" -- start
```

Should say: "App started"

### 8.2 - Check Status
```bash
pm2 list
```

You should see:
```
id  name                status  uptime
0   arcane-dashboard    online  X mins
```

**Status = "online"** = ✓ Working!

**Status = "errored"** = Check logs with: `pm2 logs arcane-dashboard`

### 8.3 - Auto-Start on Reboot
```bash
pm2 startup
```

It will show a command. **Copy it** and paste it (includes `sudo`).

Then:
```bash
pm2 save
```

Now if server restarts, your app auto-starts. ✓

---

## STEP 9: Install & Configure Nginx

### 9.1 - Install Nginx
```bash
sudo apt install -y nginx
```

**What is Nginx?**
- Acts like a traffic cop
- Routes web requests (port 80) to your app (port 3000)
- Handles HTTPS/SSL
- Very standard, secure, reliable

### 9.2 - Get Your Server IP
```bash
curl https://checkip.amazonaws.com
```

Copy the IP that appears (e.g., `18.123.45.67`)

### 9.3 - Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/arcane-dashboard
```

Paste this (use Ctrl + Shift + V):
```nginx
server {
    listen 80;
    server_name 18.123.45.67;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**Replace `18.123.45.67`** with your actual IP from step 9.2!

### 9.4 - Save File
- Press: `Ctrl + X`
- Type: `Y`
- Press: `Enter`

### 9.5 - Enable Nginx
```bash
sudo ln -s /etc/nginx/sites-available/arcane-dashboard /etc/nginx/sites-enabled/
```

### 9.6 - Test Config
```bash
sudo nginx -t
```

Should say: `ok` ✓

### 9.7 - Start Nginx
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## STEP 10: Open Ports (Firewall Rules)

### 10.1 - Back to Lightsail Dashboard
Go back to browser tab with Lightsail (not terminal)

### 10.2 - Click Your Instance
Click "arcane-dashboard" instance

### 10.3 - Click "Networking" Tab
You'll see networking options

### 10.4 - Click "Edit Rules"
You'll see firewall rules

### 10.5 - Add HTTP Rule
- Protocol: HTTP
- Port: 80
- Source: Anywhere (0.0.0.0/0)

Click "Create"

### 10.6 - Add HTTPS Rule
- Protocol: HTTPS
- Port: 443
- Source: Anywhere (0.0.0.0/0)

Click "Create"

You should now see both rules listed. ✓

---

## STEP 11: Enable HTTPS (SSL Certificate)

### 11.1 - Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 - Get Free Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d YOUR-IP-ADDRESS
```

(Replace `YOUR-IP-ADDRESS` with your IP)

### 11.3 - Answer Prompts
- Email: Type your email, press Enter
- Terms: Type `y` for yes
- Share email: Type `n` for no
- Should redirect HTTP to HTTPS: Type `y` for yes

✓ Certificate installed!

---

## STEP 12: Test Your Dashboard

### 12.1 - Open Browser
Go to:
```
http://YOUR-IP-ADDRESS
```

(Example: `http://18.123.45.67`)

You should see your **Arcane Dashboard login page!** 🎉

### 12.2 - Login
```
Username: NoahX36
Password: ArcaneX36$!Noah100922
```

You should see the dashboard! ✓

---

## STEP 13: Setup MT5 Sync Script

### 13.1 - Open MetaTrader 5
On your trading computer, open MetaTrader 5

### 13.2 - Open MetaEditor
File → New → Script

### 13.3 - Copy Script Code
Open file: `Arcane_Dashboard_Sync.mq5` from your project folder.
Copy all the code.

### 13.4 - Paste in MetaEditor
Paste into the new script window in MT5.

### 13.5 - Edit Script Settings
Find these lines near the top:
```mql5
input string ServerURL = "https://YOUR-LIGHTSAIL-IP-OR-DOMAIN";
input string Token = "default-token";
```

Replace:
- `YOUR-LIGHTSAIL-IP-OR-DOMAIN` with your IP (e.g., `http://18.123.45.67`)
- `Token` with: `default-token` (for now)

### 13.6 - Compile
Press `F5` or File → Compile

Should say "0 errors" ✓

### 13.7 - Add Domain to Whitelist
1. In MT5: Tools → Options → Expert Advisors
2. Add your IP/domain to "Allow WebRequest"
3. Click OK

### 13.8 - Run Script
1. Attach script to any chart (right-click → Scripts → Arcane_Dashboard_Sync)
2. Press OK
3. Check MT5 Journal tab for logs

Should see: "SUCCESS: Server responded with HTTP 200" ✓

---

## ✅ YOU'RE DONE!

Your dashboard is now:
- ✅ Running on AWS Lightsail
- ✅ Connected to Neon database
- ✅ Accessible via HTTPS
- ✅ Auto-starting on reboot
- ✅ Ready to receive MT5 data

---

## 🆘 Quick Troubleshooting

### "Cannot reach dashboard"
1. Check Lightsail instance is running (green dot)
2. Check ports 80 & 443 are open in networking
3. Try: `curl http://localhost:3000` in Lightsail terminal

### "MT5 says permission denied"
1. Go to Tools → Options → Expert Advisors
2. Add your domain to whitelist
3. Restart MT5

### "App crashed / gone offline"
Check logs:
```bash
pm2 logs arcane-dashboard
```

Look for error messages. Common: database connection, wrong .env

### "Can't SSH into Lightsail"
Just use the orange "Connect using SSH" button in browser. Much easier than command line SSH.

---

**Questions?** Check the DEPLOYMENT_GUIDE.md for more details!
