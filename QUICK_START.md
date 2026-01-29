# QUICK REFERENCE - Copy & Paste Commands

## 🖥️ BEFORE DEPLOYMENT (Your Computer)

### 1️⃣ Open Terminal/Command Prompt
```
On Windows: Win + R → type "cmd" → Enter
```

### 2️⃣ Navigate to Project
```bash
cd "c:\Users\hp\Downloads\Replit SS- Arcane\ReplitExport-NoahX36\Arcane-Dashboard"
```

### 3️⃣ Install Dependencies
```bash
npm install
```
⏱️ Takes 3-5 minutes. Get some coffee ☕

### 4️⃣ Create Database Tables
```bash
npm run db:push
```

### 5️⃣ Build for Production
```bash
npm run build
```
DATABASE_URL="postgresql://neondb_owner:npg_FG7PYDR1cATg@ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" NODE_ENV="production"  pm2 start dist/index.cjs --name "arcane-dashboard"
### 6️⃣ Test Locally (Optional)
```bash
npm start
```
Then open: http://localhost:3000
Login: `NoahX36` / `ArcaneX36$!Noah100922`

---

## ☁️ AWS LIGHTSAIL DEPLOYMENT

### 1️⃣ Create Lightsail Instance
1. Go to: https://lightsail.aws.amazon.com
2. Click "Create Instance"
3. Choose: Ubuntu 22.04 LTS
4. Select cheapest plan ($5-10/month)
5. Click "Create"
6. Click "Connect using SSH" (orange button)

### 2️⃣ In Lightsail Terminal - Update System
```bash
sudo apt update
```

Wait for it to finish, then:
```bash
sudo apt upgrade -y
```

### 3️⃣ Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

Then:
```bash
sudo apt install -y nodejs
```

Check: `node --version`

### 4️⃣ Install PM2 (App Manager)
```bash
sudo npm install -g pm2
```

### 5️⃣ Upload Project (Using Git)

**If using GitHub:**

**On your computer:**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/arcane-dashboard.git
git push -u origin main
``` 

**On Lightsail terminal:**
```bash
cd /home/ubuntu
git clone https://github.com/YOUR-USERNAME/arcane-dashboard.git
cd arcane-dashboard
```

### 6️⃣ Install & Build on Lightsail
```bash
npm install
```

Then:
```bash
npm run build
```

### 7️⃣ Start App with PM2
```bash
pm2 start npm --name "arcane-dashboard" -- start
```


Check status:
```bash
pm2 list
```

### 8️⃣ Auto-Start on Reboot
```bash
pm2 startup
pm2 save
```



Copy & run the command it shows.

### 9️⃣ Install Nginx
```bash
sudo apt install -y nginx
```

### 🔟 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/arcane-dashboard
```

Paste this (Ctrl + Shift + V):
```
server {
    listen 80;
    server_name YOUR-LIGHTSAIL-IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Replace `YOUR-LIGHTSAIL-IP` with actual IP.

Save: `Ctrl + X` → `Y` → Enter

### 1️⃣1️⃣ Enable Nginx
```bash
sudo ln -s /etc/nginx/sites-available/arcane-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1️⃣2️⃣ Open Ports in Lightsail
1. Go to Lightsail dashboard
2. Click your instance
3. Click "Networking"
4. Click "Edit Rules"
5. Add: HTTP (80) and HTTPS (443) - both from anywhere
6. Save

### 1️⃣3️⃣ Enable HTTPS (SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR-LIGHTSAIL-IP
```

Say "yes" to the prompts.

---

## ✅ TEST IT

Open your browser:
```
https://YOUR-LIGHTSAIL-IP
```

You should see login page! 🎉

---

## 🎯 SETUP MT5 SCRIPT

### 1️⃣ In MetaTrader 5
1. Open MetaEditor (File → New → Script)
2. Paste code from: `Arcane_Dashboard_Sync.mq5`
3. Compile (F5)

### 2️⃣ Configure Script
In the script, change:
```
ServerURL = "https://YOUR-LIGHTSAIL-IP"
Token = "default-token"
```

### 3️⃣ Add Domain to MT5 Whitelist
1. Tools → Options → Expert Advisors
2. Add your Lightsail IP/domain to "Allow WebRequest"

### 4️⃣ Run Script
1. Attach to any chart
2. Script will send account data to dashboard
3. Check logs in MT5 Journal tab

---

## 🔧 TROUBLESHOOTING

### "Connection refused"
- Is Lightsail instance running? (Green dot in dashboard)
- Is Nginx running? `sudo systemctl status nginx`
- Check logs: `pm2 logs arcane-dashboard`

### "Database error"
- Check DATABASE_URL in `.env` is correct
- Run: `npm run db:push`

### MT5 Won't Send Data
- Check domain is in MT5 whitelist
- Check ServerURL in script matches actual URL
- Check response in MT5 Journal (View → Toolbox → Journal)

### Can't SSH into Lightsail
- Make sure you're clicking "Connect using SSH" button (orange)
- Or use terminal with SSH key file

---

## 📝 KEY COMMANDS (Lightsail)

```bash
# See app logs
pm2 logs arcane-dashboard

# Restart app
pm2 restart arcane-dashboard

# Stop app
pm2 stop arcane-dashboard

# Edit .env
sudo nano /home/ubuntu/arcane-dashboard/server/.env

# Check what's using port 3000
netstat -tuln | grep 3000

# SSH into instance (from your computer)
ssh -i "path/to/key.pem" ubuntu@YOUR-IP
```

---

## 🚀 YOU'RE DONE!

Congrats! Your dashboard is:
✅ Running on AWS  
✅ Connected to Neon database  
✅ Ready to receive MT5 data  
✅ Accessible from browser  

Next: Connect MT5 and watch the magic! ✨
