#!/bin/bash
# 安行护腰 · 一键启动
# 双击本文件即可启动平台服务并打开浏览器。
cd "$(dirname "$0")" || exit 1

PORT=8848
PY=""
for c in python3 /usr/bin/python3 python; do
  if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
done
if [ -z "$PY" ]; then
  echo "未找到 Python，请先安装 Python 3.8 及以上版本。"
  read -r -p "按回车键退出…" _; exit 1
fi

echo "=============================================="
echo "  安行护腰 · 社区管理平台"
echo "=============================================="
echo "启动服务中…（首次会自动初始化演示数据库）"
echo ""
echo "  前台展示      http://127.0.0.1:$PORT/index.html"
echo "  后台管理      http://127.0.0.1:$PORT/admin.html    演示口令 8888"
echo "  事件流程回放  http://127.0.0.1:$PORT/event-flow.html"
echo ""
echo "如需同时启动设备模拟器（让数据持续流动），另开一个终端执行："
echo "  $PY server/simulator.py"
echo ""
echo "关闭本窗口即停止服务。"
echo "=============================================="
echo ""

sleep 1
open "http://127.0.0.1:$PORT/admin.html" 2>/dev/null || \
  xdg-open "http://127.0.0.1:$PORT/admin.html" 2>/dev/null || true

exec "$PY" server/app.py --port "$PORT"
