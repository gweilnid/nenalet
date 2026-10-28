#!/usr/bin/env bash
# Nasazení Nenaleť na server (spouští se z Macu - zkratku lze podepsat jen na macOS).
#   ./deploy.sh            push -> build -> git pull na serveru -> závislosti -> restart -> ověření
set -euo pipefail

SERVER="root@134.209.247.219"
APP="/opt/nenalet"
BASE="https://b2bsaas.cz/nenalet"
PORT=8011

cd "$(dirname "$0")"

echo "== push"
git push -q origin main

echo "== build (rozšíření + podepsaná zkratka pro $BASE)"
python3 build_dist.py "$BASE" >/dev/null

echo "== build webu (React)"
(cd web && npm ci --silent && npx vite build --logLevel error)

echo "== server: kód a závislosti"
ssh "$SERVER" "set -e
  if [ ! -d $APP/.git ]; then git clone -q https://github.com/gweilnid/nenalet.git $APP; fi
  cd $APP && git pull -q --ff-only
  cd backend
  [ -d .venv ] || python3 -m venv .venv
  .venv/bin/pip install -q --upgrade pip >/dev/null
  .venv/bin/pip install -q -r requirements.txt"

echo "== server: sestavené soubory"
scp -q backend/nenalet/static/Nenalet.shortcut backend/nenalet/static/nenalet-chrome.zip "$SERVER:$APP/backend/nenalet/static/"
[ -f backend/nenalet/static/video.mp4 ] && scp -q backend/nenalet/static/video.mp4 backend/nenalet/static/video.jpg "$SERVER:$APP/backend/nenalet/static/"
rsync -a --delete backend/nenalet/web/ "$SERVER:$APP/backend/nenalet/web/"

if ! ssh "$SERVER" "test -f $APP/backend/.env"; then
  echo "== server: .env (jen poprvé)"
  scp -q backend/.env "$SERVER:$APP/backend/.env"
  ssh "$SERVER" "chmod 600 $APP/backend/.env && printf 'NENALET_TRUSTED_PROXIES=1\n' >> $APP/backend/.env"
fi

echo "== server: restart"
ssh "$SERVER" "cd $APP/backend && if pm2 describe nenalet >/dev/null 2>&1; then pm2 restart nenalet --update-env >/dev/null;
  else pm2 start .venv/bin/python --name nenalet --interpreter none --cwd $APP/backend -- -m uvicorn nenalet.app:app --host 127.0.0.1 --port $PORT >/dev/null; fi
  pm2 save >/dev/null"

echo "== ověření"
for i in $(seq 1 15); do
  if ssh "$SERVER" "curl -fsS -m 3 http://127.0.0.1:$PORT/api/health" 2>/dev/null; then echo; break; fi
  sleep 1
done
ssh "$SERVER" "pm2 logs nenalet --lines 30 --nostream 2>&1 | grep -E 'Traceback|Error' | tail -5 || true"
curl -fsS -m 10 "$BASE/api/health" && echo && echo "OK: $BASE/"
