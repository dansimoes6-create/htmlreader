#!/usr/bin/env bash
# Instala o Clipador num servidor Ubuntu/Debian e deixa o site no ar com HTTPS.
#
#   curl -fsSL https://raw.githubusercontent.com/dansimoes6-create/htmlreader/ccr-54468cea-g5zv1a/clipador/deploy/install.sh | sudo bash
#
# Variáveis opcionais (antes do "sudo bash" use: sudo DOMAIN=... bash):
#   DOMAIN             seu domínio (padrão: <ip>.sslip.io, funciona sem comprar domínio)
#   ANTHROPIC_API_KEY  chave para a nota/título com o Claude (também dá para pôr no painel)
#   BRANCH             branch do repositório (padrão: ccr-54468cea-g5zv1a)
set -euo pipefail

REPO="https://github.com/dansimoes6-create/htmlreader.git"
BRANCH="${BRANCH:-ccr-54468cea-g5zv1a}"
DIR="/opt/clipador"

say() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Rode como root (use sudo)." >&2
  exit 1
fi

say "Instalando dependências (git, curl, Docker)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates >/dev/null
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

say "Baixando o Clipador ($BRANCH)…"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  git clone -q --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/clipador"

if [ -z "${DOMAIN:-}" ]; then
  IP="$(curl -fsS4 https://api.ipify.org || curl -fsS4 https://ifconfig.me)"
  DOMAIN="${IP//./-}.sslip.io"
fi

say "Configurando ($DOMAIN)…"
touch .env
set_env() { grep -q "^$1=" .env && sed -i "s|^$1=.*|$1=$2|" .env || echo "$1=$2" >> .env; }
set_env DOMAIN "$DOMAIN"
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then set_env ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"; fi
mkdir -p data

# Abre as portas do site se o firewall do Ubuntu estiver ligado.
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
fi

say "Subindo o site (a primeira vez leva alguns minutos)…"
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml --env-file .env up -d --build

say "Pronto!"
echo "Abra no celular:  https://$DOMAIN"
echo "No primeiro acesso aparece “Criar minha conta”. Crie a sua logo, antes de qualquer outra pessoa."
echo
echo "Atualizar depois:  sudo bash $DIR/clipador/deploy/install.sh"
echo "Ver os registros:  cd $DIR/clipador && docker compose logs -f clipador"
