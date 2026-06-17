#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! railway whoami >/dev/null 2>&1; then
  echo "Log in first: railway login"
  exit 1
fi

if [[ ! -f .railway/project.json ]]; then
  echo "Linking new Railway project..."
  railway init --name makeamag
fi

echo "Deploying MakeAMag..."
railway up --detach

echo ""
echo "Deployment started. Next steps:"
echo "1. railway open — open the Railway dashboard"
echo "2. Add env vars from .env.production.example"
echo "3. Settings → Networking → add custom domain makeamag.com"
echo "4. Point your DNS A/CNAME record to Railway's target"
