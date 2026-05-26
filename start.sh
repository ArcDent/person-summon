#!/bin/bash
set -e

echo "=== person-summon 启动脚本 ==="

# 1. Check Node.js
if ! command -v node &> /dev/null; then
  echo "错误: 未检测到 Node.js。请安装 Node.js >= 20"
  echo "  安装指引: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "错误: Node.js 版本过低 (当前: $(node -v))。需要 >= 20"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 2. Check npm
if ! command -v npm &> /dev/null; then
  echo "错误: 未检测到 npm"
  exit 1
fi
echo "✓ npm $(npm -v)"

# 3. Check port 3000
if ss -tlnp 2>/dev/null | grep -q ":3000 "; then
  echo "错误: 端口 3000 已被占用"
  echo "  占用进程: $(ss -tlnp 2>/dev/null | grep ':3000 ')"
  exit 1
fi
echo "✓ 端口 3000 可用"

# 4. Check disk space (>100MB in current dir)
DISK_SPACE=$(df -BM . | tail -1 | awk '{print $4}' | sed 's/M//')
if [ "$DISK_SPACE" -lt 100 ]; then
  echo "错误: 磁盘空间不足 (当前可用: ${DISK_SPACE}MB, 需要 >= 100MB)"
  exit 1
fi
echo "✓ 磁盘空间充足 (${DISK_SPACE}MB)"

# 5. Generate ENCRYPTION_KEY if not set
if [ -z "$ENCRYPTION_KEY" ]; then
  ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  export ENCRYPTION_KEY
  echo "✓ 已生成 ENCRYPTION_KEY"
fi

# 6. Create data directory
mkdir -p data

# 7. Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "→ 安装依赖..."
  npm install
fi

# 8. Build
echo "→ 构建项目..."
npm run build

# 9. Start
echo ""
echo "  人格生成器已启动: http://localhost:3000"
echo ""
npm start
