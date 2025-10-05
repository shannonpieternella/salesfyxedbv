#!/bin/bash

# Fyxed Sales Platform - Github Push Script
# Dit script commit en push alle wijzigingen naar Github

set -e  # Stop bij errors

echo "📤 Pushing to Github..."

# Kleuren voor output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check of we in een git repo zitten
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  No git repository found. Initializing...${NC}"
    git init
    git remote add origin https://github.com/shannonpieternella/salesfyxedbv.git
fi

# Get commit message from argument or use default
COMMIT_MSG="${1:-Update: $(date '+%Y-%m-%d %H:%M')}"

echo -e "${BLUE}📝 Commit message: ${COMMIT_MSG}${NC}"

# Add all files
git add .

# Commit
git commit -m "$COMMIT_MSG" || {
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
}

# Push to main branch
echo -e "${BLUE}📤 Pushing to Github...${NC}"
git push -u origin main || git push -u origin master

echo -e "${GREEN}✅ Successfully pushed to Github!${NC}"
