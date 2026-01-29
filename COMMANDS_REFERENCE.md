# Command Reference - Copy & Paste Everything

## 🖥️ PART 1: Local Setup (Your Computer)

### Windows Command Prompt Steps

```bash
REM Navigate to project
cd "c:\Users\hp\Downloads\Replit SS- Arcane\ReplitExport-NoahX36\Arcane-Dashboard"

REM Install dependencies
npm install

REM Create database schema
npm run db:push

REM Build for production
npm run build

REM Test locally (optional)
npm start
REM Then open: http://localhost:3000
REM Press Ctrl+C to stop
```

---

## ☁️ PART 2: AWS Lightsail Setup

### Step 2.1 - Create Instance (In Browser)

1. Go to: https://lightsail.aws.amazon.com
2. Click "Create Instance"
3. Region: Pick closest to you
4. Image: Ubuntu 22.04 LTS
5. Plan: $5/month
6. Name: `arcane-dashboard`
7. Click "Create Instance"
8. Wait for green dot (2-3 minutes)

### Step 2.2 - Connect via SSH

1. Click instance name
2. Click "Connect using SSH" (orange button on right)
3. A browser terminal opens

---

### Step 2.3 - Update System (Paste These One at a Time)

```bash
sudo apt update
```

Wait for it to finish, then:

```bash
sudo apt upgrade -y
```

Wait 2-5 minutes for completion.

---

### Step 2.4 - Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

Wait, then:

```bash
sudo apt install -y nodejs
```

Verify:

```bash
node --version
```

Should show `v20.x.x` ✓

---

### Step 2.5 - Install PM2

```bash
sudo npm install -g pm2
```

---

### Step 2.6 - Upload Code (Using GitHub)

#### 6A - Create GitHub Repo (On Your Computer)

On your computer, go to: https://github.com
- Click "+" menu
- "New repository"
- Name: `arcane-dashboard`
- Choose "Private"
- Click "Create repository"
- Copy the URL shown

#### 6B - Push Code (On Your Computer Terminal)

```bash
cd "c:\Users\hp\Downloads\Replit SS- Arcane\ReplitExport-NoahX36\Arcane-Dashboard"

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/arcane-dashboard.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

#### 6C - Clone on AWS (In Lightsail Terminal)

```bash
cd /home/ubuntu
git clone https://github.com/YOUR-USERNAME/arcane-dashboard.git
cd arcane-dashboard
```

Replace `YOUR-USERNAME`.

---

### Step 2.7 - Install & Build on Lightsail

```bash
npm install
```

Wait 3-5 minutes.

```bash
npm run db:push
```

```bash
npm run build
```

---

### Step 2.8 - Start with PM2

```bash
pm2 start npm --name "arcane-dashboard" -- start
```

Check:

```bash
pm2 list
```

Should show status: `online` ✓

Auto-start on reboot:

```bash
pm2 startup
```

Copy the command it shows and paste it (includes `sudo`).

Then:

```bash
pm2 save
```

---

### Step 2.9 - Get Your Server IP

```bash
curl https://checkip.amazonaws.com
```

Copy the IP shown (e.g., `18.123.45.67`)

---

### Step 2.10 - Install Nginx

```bash
sudo apt install -y nginx
```

---

### Step 2.11 - Configure Nginx

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

**IMPORTANT:** Replace `18.123.45.67` with YOUR actual IP from step 2.9!

Save: `Ctrl + X` → `Y` → `Enter`

---

### Step 2.12 - Enable Nginx

```bash
sudo ln -s /etc/nginx/sites-available/arcane-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

### Step 2.13 - Open Firewall Ports

In Lightsail browser dashboard:

1. Click your instance
2. Click "Networking" tab
3. Click "Edit Rules"
4. Add HTTP (port 80): Click "Create"
5. Add HTTPS (port 443): Click "Create"

Both from "Anywhere"

---

### Step 2.14 - Enable HTTPS (SSL)

In Lightsail terminal:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 18.123.45.67
```

Replace IP with YOUR actual IP.

Answer prompts:
- Email: Type your email
- Agree: `y`
- Share email: `n`
- Redirect HTTP to HTTPS: `y`

---

### Step 2.15 - Test Dashboard

Open browser, go to:

```
http://18.123.45.67
```

(Replace with YOUR IP)

Login:
- User: `NoahX36`
- Pass: `ArcaneX36$!Noah100922`

See dashboard? ✓ Success!

---

## 🛰️ PART 3: MT5 Script Setup

### Step 3.1 - Copy Script Code

In your project, open: `Arcane_Dashboard_Sync.mq5`

Copy ALL the code.

### Step 3.2 - In MetaTrader 5

1. Open MetaEditor
2. File → New → Script
3. Paste the code
4. Save as `Arcane_Dashboard_Sync.mq5`

### Step 3.3 - Edit Script Settings

Find these lines:

```mql5
input string ServerURL = "https://YOUR-LIGHTSAIL-IP-OR-DOMAIN";
input string Token = "default-token";
```

Replace with YOUR IP:

```mql5
input string ServerURL = "http://18.123.45.67";
input string Token = "default-token";
```

### Step 3.4 - Compile

Press F5 or File → Compile

Should say: "0 errors" ✓

### Step 3.5 - Add to Whitelist

In MT5:
1. Tools → Options
2. Expert Advisors tab
3. Check "Allow WebRequest for listed URL"
4. Add: `http://18.123.45.67`
5. Click OK

### Step 3.6 - Run Script

1. Attach to any chart
2. Right-click → Scripts → Arcane_Dashboard_Sync
3. Click OK
4. Check MT5 Journal tab for "SUCCESS" message

---

## 🔧 Common Maintenance Commands

### Check App Status

```bash
pm2 list
```

### View App Logs

```bash
pm2 logs arcane-dashboard
```

### Restart App

```bash
pm2 restart arcane-dashboard
```

### Stop App

```bash
pm2 stop arcane-dashboard
```

### Start App Again

```bash
pm2 start npm --name "arcane-dashboard" -- start
```

### Update Code (If Using Git)

```bash
cd /home/ubuntu/arcane-dashboard
git pull origin main
npm run build
pm2 restart arcane-dashboard
```

### Check Nginx Status

```bash
sudo systemctl status nginx
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### View Nginx Config (No Edit)

```bash
sudo cat /etc/nginx/sites-available/arcane-dashboard
```

### Edit Nginx Config

```bash
sudo nano /etc/nginx/sites-available/arcane-dashboard
```

Save: `Ctrl + X` → `Y` → `Enter`

Then reload:

```bash
sudo systemctl reload nginx
```

### Check Port Usage

```bash
netstat -tuln | grep 3000
```

### Check System Resources

```bash
top
```

Press `q` to exit.

### SSH into Server (From Your Computer)

First, get the SSH key from Lightsail dashboard → Download → Static IP → Download

Then (on your computer):

```bash
ssh -i "path/to/lightsail_key.pem" ubuntu@18.123.45.67
```

Replace IP with YOUR IP and path with actual key location.

Or just use the browser "Connect using SSH" button. Much easier!

---

## 🛠️ Database Maintenance

### Backup Database (From Lightsail)

```bash
pg_dump -U neondb_owner -h ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech -d neondb > backup.sql
```

### See Database Size

```bash
psql -U neondb_owner -h ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech -d neondb -c "SELECT pg_size_pretty(pg_database_size('neondb'));"
```

### Connect to Database (For Queries)

```bash
psql postgresql://neondb_owner:PASSWORD@ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

(Replace PASSWORD)

Type `\q` to exit.

---

## 📝 Edit Config Files

### Edit .env

```bash
sudo nano /home/ubuntu/arcane-dashboard/server/.env
```

Save: `Ctrl + X` → `Y` → `Enter`

Then restart app:

```bash
pm2 restart arcane-dashboard
```

### View .env (Without Editing)

```bash
sudo cat /home/ubuntu/arcane-dashboard/server/.env
```

---

## 🚨 Emergency Commands

### Kill Stuck Process on Port 3000

```bash
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

Then restart:

```bash
pm2 restart arcane-dashboard
```

### Restart Everything Fresh

```bash
pm2 stop arcane-dashboard
pm2 restart arcane-dashboard
pm2 logs arcane-dashboard
```

### Clear PM2 Logs

```bash
pm2 flush
```

### Full System Reboot

```bash
sudo reboot
```

(App will auto-start after reboot if you ran `pm2 startup` + `pm2 save`)

---

## ✅ Verification Checklist

Run these to ensure everything is working:

```bash
# Check app status
pm2 list

# Check app logs (should show no errors)
pm2 logs arcane-dashboard --lines 20

# Check Nginx status
sudo systemctl status nginx

# Test local port
curl http://localhost:3000

# Test public IP
curl http://18.123.45.67
```

If all are working, you're golden! 🎯

---

## 📚 Quick Reference

| Task | Command |
|------|---------|
| View logs | `pm2 logs arcane-dashboard` |
| Restart app | `pm2 restart arcane-dashboard` |
| Check status | `pm2 list` |
| Stop app | `pm2 stop arcane-dashboard` |
| Start app | `pm2 start npm --name "arcane-dashboard" -- start` |
| Edit .env | `sudo nano /home/ubuntu/arcane-dashboard/server/.env` |
| Restart Nginx | `sudo systemctl restart nginx` |
| Check Nginx | `sudo systemctl status nginx` |
| Rebuild code | `cd /home/ubuntu/arcane-dashboard && npm run build` |
| Pull latest code | `cd /home/ubuntu/arcane-dashboard && git pull origin main` |
| System reboot | `sudo reboot` |

---

Done! Everything is copy-paste. 🚀
