#!/usr/bin/env bash
# 小程序全量测试编排器
#   1) 刷新五角色 token（自愈校管脏数据）
#   2) 全功能 API 测试（241 断言）
#   3) 全页面冒烟（超管/校管/教师/家长 四角色，含家长端 3 页）
#   4) 生成汇总报告
#
# 设计要点：
#   - 由定时自动化(automation)调用，也可手工执行。
#   - 自行构建 H5 等价包，构建失败则降级使用已有的 dist/build/h5（不阻断测试）。
#   - 校验器读取 mini-test-tokens.json / mini-smoke.json / mini-api-test-results.json，
#     与具体执行顺序解耦，任一步失败仍尽量产出报告。
#
# 用法: bash scripts/run-mini-e2e.sh
set -u
cd "$(dirname "$0")/.." || exit 1

API_BASE="${SMOKE_API_BASE:-https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api}"
NODE="${NODE_BIN:-C:/Users/admin/.workbuddy/binaries/node/versions/22.22.2/node.exe}"

export SMOKE_API_BASE="$API_BASE"
export SMOKE_BROWSER_PATH="${SMOKE_BROWSER_PATH:-C:/Users/admin/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe}"
export SMOKE_SUPER_USER=admin
export SMOKE_SUPER_PASS=admin
export SMOKE_TEACHER_USER=qa_teacher1_MSDGCIUN
export SMOKE_TEACHER_PASS=Test@2026
export SMOKE_PARENT_NO=8803619508
export SMOKE_PARENT_PASS=123456
export SMOKE_SETTLE=1100
# 编排脚本自行构建，冒烟脚本跳过构建（构建失败则降级用旧 dist）
export SMOKE_MINI_SKIP_BUILD=1

# 复用上一轮刷新得到的校管凭证（若有），避免重复新建脏数据
if [ -f scripts/mini-sa.env ]; then
  set -a; . "./scripts/mini-sa.env"; set +a
fi

echo "══════════════════════════════════════════════════"
echo " 小程序全量测试编排  @ $(date '+%Y-%m-%d %H:%M:%S')"
echo " 后端: $API_BASE"
echo "══════════════════════════════════════════════════"

echo "== [0/4] 构建 H5 等价包 =="
(cd mini-program && npm run build:h5) && echo "  build: ok" || echo "  WARN: build 失败，降级使用已有 dist/build/h5"

echo "== [1/4] 刷新五角色 token =="
"$NODE" scripts/refresh-tokens.mjs || { echo "refresh-tokens 失败，终止"; exit 1; }
# 刷新后重新载入校管凭证（自愈可能更新）
if [ -f scripts/mini-sa.env ]; then
  set -a; . "./scripts/mini-sa.env"; set +a
fi

echo "== [2/4] 全功能 API 测试 =="
"$NODE" scripts/mini-api-test.mjs
API_RC=$?

echo "== [3/4] 全页面冒烟（含家长端）=="
"$NODE" e2e/mini.smoke.mjs
SMOKE_RC=$?

echo "== [4/4] 生成汇总报告 =="
"$NODE" scripts/gen-mini-report.mjs

echo ""
echo "══════════════════════════════════════════════════"
echo " 完成: api_rc=$API_RC smoke_rc=$SMOKE_RC"
echo " 报告: test-deliverables/09-小程序全量测试报告.md"
echo "══════════════════════════════════════════════════"

# 任一步出现真实失败（API 脚本虽退出 0，但报告会标明失败数；冒烟新失败退出 1）→ 非 0 退出
[ "$SMOKE_RC" = "0" ]
