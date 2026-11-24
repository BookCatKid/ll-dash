#!/bin/bash
# Poll origin/main and deploy when it changes. Installed as a cron job on the
# Oracle VM (see README "Deploy to Oracle Cloud"). Safe to run manually.
set -u
cd /home/ubuntu/lldash || exit 0

git fetch origin -q || exit 0
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[ "$LOCAL" = "$REMOTE" ] && exit 0

git reset --hard origin/main -q || exit 0

# Build the frontend bundle (not committed to git — always built fresh so
# deploys can never serve a stale UI). Log output so failures are debuggable.
if ! corepack pnpm install --frozen-lockfile --prefer-offline >>/home/ubuntu/lldash/deploy.log 2>&1 \
   || ! corepack pnpm run build >>/home/ubuntu/lldash/deploy.log 2>&1 \
   || [ ! -f frontend/static/build/app.js ]; then
  logger -t lldash-deploy "BUILD FAILED for $REMOTE — service not restarted"
  exit 1
fi

.venv/bin/pip install -q -r requirements.txt
sudo -n systemctl restart lldash
logger -t lldash-deploy "deployed $REMOTE"
