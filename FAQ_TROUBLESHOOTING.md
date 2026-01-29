# FAQ & Troubleshooting Guide

## General Questions

### Q: Do I need to pay for everything?
**A:**
- ✅ **Free**: GitHub (private repos free)
- ✅ **Free**: Let's Encrypt SSL certificate
- ✅ **Free tier**: Neon database (very generous)
- 💰 **$5-10/month**: AWS Lightsail (cheapest option)
- **Total**: ~$5-10/month for cloud server

### Q: Can I test locally before deploying?
**A:** Yes! Run `npm run dev` or `npm start` on your computer to test everything.

### Q: Do I need to know Linux?
**A:** No! All commands are copy-paste. I've provided every single one.

### Q: What if my database gets too big?
**A:** Neon scales automatically. For small accounts, you'll never hit limits. Upgrade plan if needed.

---

## Building & Deployment Issues

### Q: "npm install" fails
**Symptoms:** Error messages about missing packages

**Try:**
```bash
rm -rf node_modules package-lock.json
npm install
```

Or check you have Node 18+ installed:
```bash
node --version
```

---

### Q: "npm run build" fails with TypeScript errors
**Symptoms:** "Cannot find module" or "Type errors"

**Try:**
```bash
npm run check
```

This shows actual errors. Fix them, then try build again.

---

### Q: DATABASE_URL is wrong / "connection refused"
**Symptoms:** App crashes with database error

**Check:**
1. Copy DATABASE_URL from Neon console: https://console.neon.tech
2. Paste into `.env` exactly
3. Make sure you're not on Neon free tier without SSL enabled
4. Restart app: `npm start`

---

### Q: "Port 3000 is already in use"
**Symptoms:** "EADDRINUSE :::3000"

**Try:**
1. Change PORT in `.env`: `PORT=3001`
2. Or kill existing process:
   ```bash
   # On Mac/Linux
   lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
   
   # On Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

---

## AWS Lightsail Issues

### Q: "Connection refused" when accessing dashboard
**Symptoms:** Browser says "Cannot reach server"

**Checklist:**
1. Is instance running? (Green dot in Lightsail dashboard)
2. Is port 80 open? (Check Networking → Edit Rules)
3. Is Nginx running?
   ```bash
   sudo systemctl status nginx
   ```
   Should say "running". If not:
   ```bash
   sudo systemctl start nginx
   ```
4. Is your app running?
   ```bash
   pm2 list
   ```
   Should show "online". If not:
   ```bash
   pm2 start npm --name "arcane-dashboard" -- start
   ```
5. Check logs:
   ```bash
   pm2 logs arcane-dashboard
   ```

---

### Q: Got "502 Bad Gateway" error
**Symptoms:** Browser shows 502 error

**Means:** Nginx can't reach your app

**Try:**
1. Check app is running: `pm2 list`
2. Check app logs: `pm2 logs arcane-dashboard`
3. Restart: `pm2 restart arcane-dashboard`
4. Check Nginx config:
   ```bash
   sudo nginx -t
   ```
   Should say "ok"

---

### Q: "Can't SSH into instance"
**Symptoms:** Terminal won't connect

**Easiest Fix:**
- Don't use command line SSH! Just click the orange "Connect using SSH" button in Lightsail browser dashboard. Much easier.

**If you need CLI SSH:**
1. Download key from Lightsail
2. Set permissions: `chmod 600 key.pem`
3. Connect: `ssh -i key.pem ubuntu@YOUR-IP`

---

### Q: App runs but database not working
**Symptoms:** Dashboard loads but crashes when you click things

**Check:**
1. DATABASE_URL in `.env` is correct
2. Neon database is running
3. Tables exist:
   ```bash
   npm run db:push
   ```
4. Check app logs:
   ```bash
   pm2 logs arcane-dashboard
   ```

---

### Q: Want to restart everything from scratch
**All-in-one restart:**
```bash
cd /home/ubuntu/arcane-dashboard
npm run build
pm2 restart arcane-dashboard
pm2 logs arcane-dashboard
```

---

## MT5 Script Issues

### Q: MT5 script won't compile
**Symptoms:** MetaEditor shows "errors"

**Try:**
1. Check syntax: Look for red squiggly lines in MetaEditor
2. Close/reopen MetaEditor
3. Recompile: F5

---

### Q: MT5 script runs but doesn't send data
**Symptoms:** Journal shows no logs or errors

**Checklist:**
1. Is domain whitelisted?
   - Tools → Options → Expert Advisors → Check "Allow WebRequest for..." → Add your domain
2. Is ServerURL correct? (Check script input)
3. Is domain actually reachable? Try in browser first
4. Check response in MT5 Journal tab

---

### Q: "WebRequest failed. Error=4013"
**Symptoms:** MT5 won't send to server

**Means:** Domain not in whitelist

**Fix:**
1. Tools → Options → Expert Advisors
2. Add your domain to list
3. Restart MT5
4. Rerun script

---

### Q: "WebRequest failed. Error=4014"
**Symptoms:** Timeout

**Means:** Server not responding or too slow

**Try:**
1. Is server running? Check: `pm2 list`
2. Is server reachable? Test in browser
3. Check server logs: `pm2 logs arcane-dashboard`
4. Increase timeout in script: `RequestTimeoutMs = 20000`

---

## Nginx Issues

### Q: "Address already in use" when starting Nginx
**Symptoms:** Can't start Nginx

**Try:**
```bash
sudo killall nginx
sudo systemctl start nginx
```

---

### Q: Modified Nginx config but changes not applied
**Try:**
```bash
sudo nginx -t
```

If it says "ok":
```bash
sudo systemctl reload nginx
```

If it says error, fix the syntax and try again.

---

## Neon Database Issues

### Q: "Too many connections"
**Symptoms:** Database rejects new connections

**Neon has connection limits. For free tier:**
- 20 simultaneous connections

**Fix:**
1. Check if other apps are connected
2. Upgrade to paid plan
3. Use connection pooling (app already does this)

---

### Q: "SSL certificate problem: unable to get local issuer"
**Symptoms:** Can't connect to Neon

**Try:**
1. Make sure you're using DATABASE_URL with `?sslmode=require`
2. Update Node:
   ```bash
   sudo apt install -y nodejs
   ```

---

### Q: Want to reset database
**Warning: This deletes all data!**

```bash
# On Neon dashboard, delete the database and recreate it
# Then on server:
npm run db:push
```

---

## Security Issues

### Q: How to change admin password?
**Located in:** `server/routes.ts`

Find:
```typescript
if (username === "NoahX36" && password === "ArcaneX36$!Noah100922")
```

Change the credentials and rebuild:
```bash
npm run build
pm2 restart arcane-dashboard
```

### Q: Is my database password secure?
**Yes!** Neon requires:
- SSL connection
- Strong passwords
- IP whitelisting available

Just never share DATABASE_URL.

### Q: Do I need HTTPS?
**Yes!** Let's Encrypt is free. Already covered in guides.

---

## Performance Questions

### Q: Dashboard is slow
**Try:**
1. Check server CPU: `top` (press Q to quit)
2. Check database: Query browser in Neon console
3. Upgrade Lightsail plan if needed (2GB → 4GB RAM)

### Q: MT5 data not syncing
**Try:**
1. Run script manually to test
2. Check logs: `pm2 logs arcane-dashboard`
3. Verify endpoint: Try POST with curl
   ```bash
   curl -X POST http://localhost:3000/api/webhook/mt5/test-token \
     -H "Content-Type: application/json" \
     -d '{"balance":1000,"equity":1100,"profit":100}'
   ```

---

## Getting Help

### If something breaks:

1. **Read the error message carefully** - They're usually helpful
2. **Check relevant log file:**
   - App: `pm2 logs arcane-dashboard`
   - Nginx: `sudo journalctl -u nginx -n 20`
   - Database: Neon dashboard console
3. **Try restarting:**
   ```bash
   pm2 restart arcane-dashboard
   sudo systemctl restart nginx
   ```
4. **Check internet connection** - Obviously!

### Useful commands to debug:

```bash
# Is app running?
pm2 list

# Check app logs
pm2 logs arcane-dashboard

# Is Nginx running?
sudo systemctl status nginx

# Is port 3000 listening?
netstat -tuln | grep 3000

# Is database reachable?
psql -U neondb_owner -h ep-spring-grass-abyv4ixv-pooler.eu-west-2.aws.neon.tech -d neondb

# Check system resources
top
```

---

## Final Checklist ✅

Before declaring success:

- [ ] Can login to dashboard
- [ ] See Connected Accounts
- [ ] Can create a new account
- [ ] Charts display data
- [ ] MT5 script runs without errors
- [ ] App auto-restarts if Lightsail reboots
- [ ] Database is accessible from app
- [ ] HTTPS works (no browser warnings)
- [ ] Can login from different device

If all checked: **You're good to go!** 🚀

---

**Still stuck?** Save error messages & check again with fresh eyes. 99% of issues are:
1. Typo in .env
2. Port not open in firewall
3. App not running (`pm2 list`)
4. Neon credentials wrong

Good luck! 🎯
