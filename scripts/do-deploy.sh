#!/usr/bin/env bash
# Deploy StarLink Resume Maker to a DigitalOcean Ubuntu droplet.
# Usage (run on the server as root):
#   curl -fsSL https://raw.githubusercontent.com/<your_repo>/scripts/do-deploy.sh | bash

set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-/root/resume}
APP_DIR=${APP_DIR:-/var/www/starlink-resume}
NODE_VERSION=${NODE_VERSION:-20}
BRANCH=${BRANCH:-test-branch}
REPO_URL=${REPO_URL:-https://github.com/zhanghj/resume.git}
PUBLIC_IP=${PUBLIC_IP:-152.42.172.247}

log() {
  echo -e "[deploy] $1"
}

install_packages() {
  apt-get update
  apt-get install -y curl git nginx rsync
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    log "Node already installed: $(node -v)"
    return
  fi
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
}

prepare_repo() {
  if [ ! -d "$PROJECT_DIR/.git" ]; then
    rm -rf "$PROJECT_DIR"
    git clone --depth=1 --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
  else
    git -C "$PROJECT_DIR" fetch origin "$BRANCH"
    git -C "$PROJECT_DIR" reset --hard "origin/$BRANCH"
  fi
}

build_app() {
  cd "$PROJECT_DIR"
  corepack enable
  pnpm install --frozen-lockfile
  pnpm run build
}

publish_assets() {
  mkdir -p "$APP_DIR/app"
  cp "$PROJECT_DIR/简介页面.html" "$APP_DIR/index.html"
  rsync -a --delete "$PROJECT_DIR/public/" "$APP_DIR/app/"
}

configure_nginx() {
  cat >/etc/nginx/sites-available/starlink-resume <<NGINX
server {
    listen 80;
    server_name _;

    root $APP_DIR;
    index index.html;

    location /app/ {
        alias $APP_DIR/app/;
        try_files \$uri \$uri/ /app/index.html;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/starlink-resume /etc/nginx/sites-enabled/starlink-resume
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl restart nginx
}

main() {
  install_packages
  install_node
  prepare_repo
  build_app
  publish_assets
  configure_nginx
  log "Deploy complete. Visit http://$PUBLIC_IP to view the landing page."
  log "React app is served under http://$PUBLIC_IP/app/."
}

main "$@"
