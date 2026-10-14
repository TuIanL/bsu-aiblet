#!/bin/bash
# 安行护腰 · 关闭平台
# 双击本文件即可停止后台服务与设备模拟器。

cd "$(dirname "$0")" || exit 1
PORT=8848

echo "=============================================="
echo "  安行护腰 · 关闭平台"
echo "=============================================="
echo ""

stopped=0

# ---- 1. 停模拟器（按脚本文件名匹配，范围最窄）
sim_pids=$(pgrep -f "server/simulator\.py" 2>/dev/null)
if [ -n "$sim_pids" ]; then
  for p in $sim_pids; do
    kill "$p" 2>/dev/null && echo "  ✓ 已停止设备模拟器 (pid $p)" && stopped=1
  done
fi

# ---- 2. 停平台服务：先按端口定位（最准），再按脚本名兜底
#      注意必须加 -sTCP:LISTEN：否则 lsof 会把连着该端口的浏览器（Chrome/Safari
#      打开后台页时会保持 SSE 长连接）也列出来，导致误杀用户浏览器。
srv_pids=""
if command -v lsof >/dev/null 2>&1; then
  srv_pids=$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null)
fi
if [ -z "$srv_pids" ]; then
  srv_pids=$(pgrep -f "server/app\.py" 2>/dev/null)
fi

if [ -n "$srv_pids" ]; then
  for p in $srv_pids; do
    # 不要误杀当前脚本自身
    [ "$p" = "$$" ] && continue
    if kill "$p" 2>/dev/null; then
      echo "  ✓ 已停止平台服务 (pid $p, 端口 $PORT)"
      stopped=1
    fi
  done
  # 若仍未退出，强制结束
  sleep 1
  for p in $srv_pids; do
    [ "$p" = "$$" ] && continue
    if kill -0 "$p" 2>/dev/null; then
      kill -9 "$p" 2>/dev/null && echo "  ✓ 已强制结束残留进程 (pid $p)"
    fi
  done
fi

echo ""
if [ "$stopped" = "0" ]; then
  echo "  没有找到正在运行的平台进程。"
  echo "  可能服务已经停止，或不是通过本文件夹的脚本启动的。"
else
  echo "  平台已全部关闭，端口 $PORT 已释放。"
fi
echo ""
echo "  如需重新启动，双击「启动平台.command」。"
echo "=============================================="
echo ""

# 双击运行时保留窗口 3 秒，便于查看结果
sleep 3
