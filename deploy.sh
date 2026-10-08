#!/usr/bin/env bash
#
# 一键发布到 GitHub Pages
# 用法：
#   GH_TOKEN=ghp_xxxxxxxx bash deploy.sh <用户名> <仓库名> [分支名]
#
# 例：
#   GH_TOKEN=ghp_abc123 bash deploy.sh zhangsan ai-ecom-sales-system main
#
set -euo pipefail

USER_NAME="${1:-}"
REPO_NAME="${2:-}"
BRANCH="${3:-main}"

if [[ -z "$USER_NAME" || -z "$REPO_NAME" ]]; then
  echo "用法: GH_TOKEN=ghp_xxx bash deploy.sh <用户名> <仓库名> [分支名]" >&2
  exit 1
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "错误：请先设置环境变量 GH_TOKEN（GitHub Personal Access Token，需 repo 权限）" >&2
  echo "  生成地址：https://github.com/settings/tokens" >&2
  exit 1
fi

REMOTE="https://${USER_NAME}:${GH_TOKEN}@github.com/${USER_NAME}/${REPO_NAME}.git"

echo "▶ 初始化本地仓库…"
git init -q 2>/dev/null || true
git add -A
git -c user.name="${USER_NAME}" -c user.email="${USER_NAME}@users.noreply.github.com" \
    commit -q -m "feat: 智能云 AI 电商在线销售系统" 2>/dev/null || echo "  （无新变更，跳过提交）"

git branch -M "$BRANCH"

echo "▶ 创建 / 连接远程仓库 ${USER_NAME}/${REPO_NAME} …"
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE"
else
  git remote set-url origin "$REMOTE"
fi

# 若远程仓库不存在则通过 API 创建
if ! git ls-remote --exit-code -h "$REMOTE" >/dev/null 2>&1; then
  echo "  远程仓库不存在，尝试创建…"
  curl -sS -H "Authorization: token ${GH_TOKEN}" \
       -H "Accept: application/vnd.github+json" \
       -d "{\"name\":\"${REPO_NAME}\",\"private\":false,\"auto_init\":false}" \
       https://api.github.com/user/repos >/dev/null
fi

echo "▶ 推送代码…"
git push -u origin "$BRANCH" --force

echo
echo "✅ 推送完成。"
echo "   仓库地址：https://github.com/${USER_NAME}/${REPO_NAME}"
echo "   下一步：进入 Settings → Pages → Source 选择 『GitHub Actions』"
echo "   站点地址：https://${USER_NAME}.github.io/${REPO_NAME}/"
echo
echo "   登录信息： admin / admin123   ·   buyer / buyer123   ·   operator / operator123"
