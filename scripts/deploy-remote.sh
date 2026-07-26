#!/usr/bin/env bash
# 在阿里云 ECS 上执行（由 GitHub Actions SSH 调用）
set -euo pipefail

# 非交互 SSH 下补齐常见 PATH（node / npm / docker）
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

APP_DIR="${APP_DIR:-/opt/outreachhub}"
cd "$APP_DIR"

echo "==> Deploy at $(date -Is) in $APP_DIR"
echo "==> node=$(command -v node || echo MISSING) npm=$(command -v npm || echo MISSING)"

if [[ ! -f .env ]]; then
  echo "ERROR: $APP_DIR/.env 不存在。请先在服务器上手动创建生产 .env 后再部署。"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: 找不到 npm，请确认 Node.js 已安装且在 PATH 中。"
  exit 127
fi

# 基础设施（若未启动则启动；不重建以免丢数据）
if command -v docker >/dev/null 2>&1; then
  echo "==> Ensure postgres + redis"
  docker compose up -d postgres redis

  echo "==> Ensure email worker"
  docker compose --profile full up -d --build worker || {
    echo "WARN: worker 启动失败，请检查 Dockerfile.worker / 内存"
  }
fi

echo "==> npm ci"
npm ci

echo "==> db:push"
npm run db:push

echo "==> build"
npm run build

# systemd 服务存在则重启；否则用 nohup 兜底提示
if systemctl list-unit-files | grep -q '^outreachhub.service'; then
  echo "==> systemctl restart outreachhub"
  systemctl restart outreachhub
  systemctl --no-pager -l status outreachhub || true
else
  echo "WARN: 未找到 outreachhub.service"
  echo "请在服务器执行一次手动安装 systemd（见 docs/deploy-aliyun-ecs.md）"
fi

echo "==> Done"
