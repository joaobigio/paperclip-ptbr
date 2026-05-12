#!/usr/bin/env bash
#
# rebuild-and-deploy.sh
# =====================
# Rebuilda o UI traduzido (pt-BR) e faz deploy no servidor de produção
# do paperclipai self-hosted.
#
# Roda no SERVIDOR remoto (187.77.47.90) onde o paperclipai está instalado.
#
# Fluxo:
#   1. git pull do fork joaobigio/paperclip-ptbr (branch feature/i18n-implementation)
#   2. pnpm --filter @paperclipai/ui build
#   3. Backup do ui-dist atual
#   4. Substituir ui-dist em /usr/lib/node_modules/paperclipai/node_modules/@paperclipai/server/
#   5. systemctl restart paperclip
#   6. Validar health endpoint
#
# Uso:
#   # rodar local (do Windows) via SSH:
#   ssh root@187.77.47.90 'bash /root/paperclip-ptbr/scripts/rebuild-and-deploy.sh'
#
#   # ou local no próprio servidor:
#   cd /root/paperclip-ptbr && bash scripts/rebuild-and-deploy.sh
#
# Quando rodar:
#   - Após `npm install -g paperclipai@latest` (atualizar paperclipai)
#   - Após adicionar mais patches de tradução no fork
#   - Após git push de novas mudanças

set -euo pipefail

REPO_DIR="/root/paperclip-ptbr"
PB_INSTALL_DIR="/usr/lib/node_modules/paperclipai"
UI_DEST="${PB_INSTALL_DIR}/node_modules/@paperclipai/server/ui-dist"

C_RESET=$'\033[0m'
C_OK=$'\033[32m'
C_WARN=$'\033[33m'
C_ERR=$'\033[31m'
C_DIM=$'\033[2m'
C_BOLD=$'\033[1m'

log()  { printf "${C_DIM}[%s]${C_RESET} %s\n" "$(date +"%H:%M:%S")" "$*"; }
ok()   { printf "${C_OK}✓${C_RESET} %s\n" "$*"; }
warn() { printf "${C_WARN}⚠${C_RESET} %s\n" "$*"; }
err()  { printf "${C_ERR}✗ %s${C_RESET}\n" "$*" >&2; }
step() { printf "\n${C_BOLD}▸ %s${C_RESET}\n" "$*"; }

# Pré-requisitos
[ -d "$REPO_DIR" ] || { err "$REPO_DIR não existe. Clone primeiro: git clone https://github.com/joaobigio/paperclip-ptbr.git $REPO_DIR"; exit 1; }
[ -d "$PB_INSTALL_DIR" ] || { err "$PB_INSTALL_DIR não existe. Instale o paperclipai primeiro: npm install -g paperclipai"; exit 1; }
command -v pnpm >/dev/null || { err "pnpm não instalado. apt-get install nodejs npm && npm install -g pnpm"; exit 1; }

# ---------- 1. git pull ----------
step "1/6  Atualizando fork (git pull)"
cd "$REPO_DIR"
PREV=$(git rev-parse HEAD 2>/dev/null || echo "none")
git fetch origin
git reset --hard origin/feature/i18n-implementation
NEW=$(git rev-parse HEAD)
if [ "$PREV" = "$NEW" ]; then
  log "código já estava no HEAD ($NEW) — rebuildando assim mesmo"
else
  ok "código atualizado: $PREV → $NEW"
  git --no-pager log --oneline "$PREV..$NEW" 2>/dev/null | head -5 || true
fi

# ---------- 2. pnpm install (se package.json ou lockfile mudaram) ----------
step "2/6  Verificando dependências"
if git diff --quiet "$PREV" "$NEW" -- 'package.json' '*/package.json' 2>/dev/null; then
  log "package.json igual — pulando pnpm install"
else
  log "package.json mudou — rodando pnpm install"
  pnpm install --prefer-offline 2>&1 | tail -5
fi
ok "deps OK"

# ---------- 3. build UI ----------
step "3/6  Buildando UI (vite build)"
pnpm --filter @paperclipai/ui build 2>&1 | tail -5
[ -f "$REPO_DIR/ui/dist/index.html" ] || { err "ui/dist/index.html não foi gerado"; exit 2; }
ok "ui/dist gerado ($(du -sh "$REPO_DIR/ui/dist" | cut -f1))"

# ---------- 4. backup do ui-dist atual ----------
step "4/6  Backup do ui-dist em produção"
if [ -d "$UI_DEST" ]; then
  BAK="${UI_DEST}.bak-$(date +%Y%m%d-%H%M%S)"
  mv "$UI_DEST" "$BAK"
  ok "backup em $BAK"
  # Manter só os últimos 3 backups
  find "$(dirname "$UI_DEST")" -maxdepth 1 -type d -name "$(basename "$UI_DEST").bak-*" \
    | sort -r | tail -n +4 | xargs -r rm -rf 2>/dev/null || true
else
  warn "ui-dest não existia em $UI_DEST — primeira instalação?"
fi

# ---------- 5. swap do ui-dist ----------
step "5/6  Aplicando novo ui-dist"
cp -R "$REPO_DIR/ui/dist" "$UI_DEST"
LANG_TAG=$(head -3 "$UI_DEST/index.html" | grep -oE 'lang="[^"]*"' | head -1)
log "index.html ${LANG_TAG} (esperado: lang=\"pt-BR\")"
ok "ui-dist instalado"

# ---------- 6. restart + healthcheck ----------
step "6/6  Restart + healthcheck"
systemctl restart paperclip
sleep 3
if systemctl is-active --quiet paperclip; then
  ok "paperclip.service: active"
else
  err "paperclip.service NÃO está active"
  systemctl status paperclip --no-pager | head -10
  exit 3
fi

# Esperar /api/health responder
for i in {1..15}; do
  if curl -fsS -m 3 http://127.0.0.1:3100/api/health >/dev/null 2>&1; then
    ok "/api/health respondendo ($(curl -fsS -m 3 http://127.0.0.1:3100/api/health | jq -r .version 2>/dev/null || echo OK))"
    break
  fi
  [ $i -eq 15 ] && { err "/api/health não respondeu em 30s"; exit 4; }
  sleep 2
done

echo
echo "${C_OK}╔═══════════════════════════════════════════════╗${C_RESET}"
echo "${C_OK}║       REBUILD + DEPLOY CONCLUÍDOS             ║${C_RESET}"
echo "${C_OK}╚═══════════════════════════════════════════════╝${C_RESET}"
echo
log "Acesse: http://localhost:3100 (via SSH tunnel)"
log "Faça Ctrl+Shift+R no navegador pra forçar reload do bundle novo"
