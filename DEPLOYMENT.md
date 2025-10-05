# 🚀 Deployment Guide - Fyxed Sales Platform

## Quick Deploy

Voor een snelle deployment naar Hetzner:

```bash
./deploy.sh
```

## Deploy Scripts

### 1. `deploy.sh` - Deploy naar Hetzner Server

Dit script doet het volgende:
1. ✅ Build de frontend voor productie
2. ✅ Upload alle bestanden naar de Hetzner server via rsync
3. ✅ Installeer dependencies op de server
4. ✅ Herstart de applicatie via PM2
5. ✅ Verificeer dat de deployment succesvol is

**Gebruik:**
```bash
./deploy.sh
```

### 2. `push-to-github.sh` - Push naar Github

Dit script commit en push alle wijzigingen naar Github.

**Gebruik:**
```bash
# Met automatische commit message
./push-to-github.sh

# Met custom commit message
./push-to-github.sh "Fix: data isolatie tussen gebruikers"
```

## Volledige Deployment Workflow

Voor een complete deployment (Github + Hetzner):

```bash
# 1. Push naar Github
./push-to-github.sh "Feature: nieuwe functionaliteit"

# 2. Deploy naar server
./deploy.sh
```

## Server Informatie

- **Host:** 116.203.217.151
- **User:** root
- **Path:** /var/www/sales.fyxedbv.nl
- **URL:** https://sales.fyxedbv.nl
- **PM2 Process:** sales-fyxedbv

## Handmatige Commands

Als je handmatig wilt deployen:

### Backend Deploy
```bash
# Upload files
rsync -avz --delete --exclude 'node_modules' --exclude '.git' \
  ./ root@116.203.217.151:/var/www/sales.fyxedbv.nl/

# SSH naar server
ssh root@116.203.217.151

# Ga naar directory
cd /var/www/sales.fyxedbv.nl

# Install dependencies
npm install --production

# Restart applicatie
pm2 restart sales-fyxedbv

# Check logs
pm2 logs sales-fyxedbv --lines 50
```

### Frontend Build
```bash
cd frontend
npm run build
cd ..
```

## Troubleshooting

### Port 3000 is in gebruik
```bash
ssh root@116.203.217.151
lsof -ti:3000 | xargs kill -9
pm2 restart sales-fyxedbv
```

### PM2 Status Check
```bash
ssh root@116.203.217.151
pm2 status
pm2 logs sales-fyxedbv
```

### Nginx Config
```bash
ssh root@116.203.217.151
nginx -t
systemctl reload nginx
```

### Health Check
```bash
curl https://sales.fyxedbv.nl/api/health
```

## Environment Variables

De productie environment variabelen staan in `.env.production.server` en worden automatisch gekopieerd naar `.env` tijdens deployment.

**Belangrijk:** Commit nooit `.env` bestanden naar git!

## Database

De applicatie gebruikt MongoDB Atlas:
- Connection string staat in `.env`
- Database naam: `salesfyxedbv`

## Rollback

Als er iets misgaat:

```bash
ssh root@116.203.217.151
cd /var/www/sales.fyxedbv.nl
git log --oneline -10  # Zie recente commits
git checkout <commit-hash>  # Ga terug naar werkende versie
pm2 restart sales-fyxedbv
```

## Monitoring

- **PM2 Dashboard:** `pm2 monit`
- **Logs:** `pm2 logs sales-fyxedbv`
- **Status:** https://sales.fyxedbv.nl/api/health
