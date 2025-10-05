#!/bin/bash

# Fyxed Sales Platform - Deployment Script
# Dit script upload de applicatie naar Github en Hetzner server

set -e  # Stop bij errors

echo "🚀 Starting deployment to Hetzner..."

# Kleuren voor output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server configuratie
SERVER_USER="root"
SERVER_HOST="116.203.217.151"
SERVER_PATH="/var/www/sales.fyxedbv.nl"
SSH_KEY="~/.ssh/id_rsa"

# Check of we in de juiste directory zitten
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: server.js niet gevonden. Run dit script vanuit de sales.fyxedbv.nl directory${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Build frontend for production${NC}"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✅ Frontend build complete${NC}"

echo -e "${BLUE}📤 Step 2: Upload files to Hetzner server${NC}"
rsync -avz --delete --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.claude' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  --exclude '.env' \
  --exclude '.env.development' \
  --exclude '.env.local' \
  "$(pwd)/" \
  ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

echo -e "${GREEN}✅ Files uploaded${NC}"

echo -e "${BLUE}🔧 Step 3: Setup production environment on server${NC}"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /var/www/sales.fyxedbv.nl

# Copy production env if it exists
if [ -f ".env.production.server" ]; then
    cp .env.production.server .env
    echo "✅ Production .env configured"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install --production --silent

# Install frontend dependencies (needed for potential rebuilds)
cd frontend
npm install --production --silent
cd ..

echo "✅ Dependencies installed"
ENDSSH

echo -e "${GREEN}✅ Server setup complete${NC}"

echo -e "${BLUE}♻️  Step 4: Restart application${NC}"
ssh -i ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd /var/www/sales.fyxedbv.nl

# Stop and delete the PM2 process
pm2 delete sales-fyxedbv 2>/dev/null || true

# Kill any remaining process on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait for port to be free
sleep 2

# Start fresh PM2 process
pm2 start server.js --name sales-fyxedbv

# Wait for startup
sleep 3

# Show status
pm2 list | grep sales-fyxedbv

# Save PM2 configuration
pm2 save

echo "✅ Application restarted"
ENDSSH

echo -e "${GREEN}✅ Server restarted${NC}"

echo -e "${BLUE}🔍 Step 5: Verify deployment${NC}"
sleep 2
HEALTH_CHECK=$(curl -s https://sales.fyxedbv.nl/api/health)

if echo "$HEALTH_CHECK" | grep -q "OK"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Site is live at: https://sales.fyxedbv.nl${NC}"
    echo "$HEALTH_CHECK"
else
    echo -e "${RED}⚠️  Warning: Health check failed${NC}"
    echo "$HEALTH_CHECK"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Deployment complete! ✨${NC}"
echo ""
