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
.venv/bin/pip install -q -r requirements.txt
sudo -n systemctl restart lldash
logger -t lldash-deploy "deployed $REMOTE"
