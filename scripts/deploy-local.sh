#!/usr/bin/env bash
set -e

PORT="${PORT:-3001}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "=== 正在本地构建《将·界》生产包 ==="
pnpm build

echo "=== 正在检查旧进程 ==="
PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
if [ -n "$PID" ]; then
  echo "正在停止端口 $PORT 上的旧服务 (PID: $PID)..."
  kill -9 $PID 2>/dev/null || true
  sleep 1
fi

echo "=== 正在启动本地生产服务 (端口: $PORT) ==="
nohup npx tsx server/index.ts > server.log 2>&1 &
NEW_PID=$!
disown $NEW_PID 2>/dev/null || true
sleep 2

if kill -0 $NEW_PID 2>/dev/null; then
  LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
  echo ""
  echo "=========================================="
  echo "  《将 · 界》本地部署成功！"
  echo "  - 本机访问: http://localhost:$PORT"
  if [ -n "$LOCAL_IP" ]; then
    echo "  - 局域网访问: http://$LOCAL_IP:$PORT"
  fi
  echo "  - 进程 PID: $NEW_PID"
  echo "  - 日志文件: $DIR/server.log"
  echo "=========================================="
else
  echo "启动失败，请查看日志:"
  cat server.log
  exit 1
fi
