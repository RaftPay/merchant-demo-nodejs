#!/usr/bin/env bash
set -euo pipefail

# ─── 颜色 ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }

echo "=============================="
echo " RaftPay Node.js Demo - Bootstrap"
echo "=============================="
echo

# ─── 1. 检查 Node.js ───
if ! command -v node &>/dev/null; then
    fail "未检测到 Node.js，请先安装：brew install node"
fi
NODE_VER=$(node -e 'console.log(process.versions.node)')
NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 14 ]; then
    fail "Node.js 版本过低 ($NODE_VER)，需要 14+"
fi
ok "Node.js $NODE_VER"

# ─── 2. 检查内置模块 ───
node -e "require('crypto'); require('http'); require('https')" 2>/dev/null \
    && ok "内置模块 crypto/http/https 正常" \
    || fail "内置模块加载异常"

# ─── 3. 生成 config.js ───
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.js"
EXAMPLE_FILE="$SCRIPT_DIR/config.example.js"

if [ -f "$CONFIG_FILE" ]; then
    warn "config.js 已存在，跳过生成"
else
    if [ ! -f "$EXAMPLE_FILE" ]; then
        fail "找不到 config.example.js"
    fi
    cp "$EXAMPLE_FILE" "$CONFIG_FILE"
    ok "已从模板生成 config.js，请编辑填入真实凭证"
fi

echo
echo -e "${GREEN}环境就绪！${NC}"
echo "  1. 编辑 config.js 填入商户凭证"
echo "  2. 运行示例：node $SCRIPT_DIR/example.js"
echo "  3. 启动回调：node $SCRIPT_DIR/callback.js"
