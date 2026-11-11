#!/bin/bash
# 클라우드 세션 시작 때 REA(Reverse Engineer Anything)와 Craft Anything CLI를 설치한다.
# 공식 출처: github.com/morluto/rea (npm: rea-agents), github.com/storytold/craft-anything
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# --- REA: npm 전역 설치 후 Claude Code에 등록 ---
if ! command -v rea >/dev/null 2>&1; then
  npm install --global rea-agents
fi
# 이미 등록돼 있으면 건너뛴다. 실패해도 세션 시작은 막지 않는다.
rea setup --client claude_code --yes --json >/dev/null 2>&1 || \
  echo "rea setup 실패: 'rea setup --client claude_code'를 직접 실행하세요" >&2

# --- Craft Anything CLI: 소스에서 빌드(Rust 1.97 이상 필요) ---
if ! command -v craft-anything-cli >/dev/null 2>&1; then
  for pkg in libxkbcommon-dev libwayland-dev libx11-dev libxrandr-dev libxi-dev libgl1-mesa-dev libgtk-3-dev; do
    dpkg -s "$pkg" >/dev/null 2>&1 || missing="${missing:-} $pkg"
  done
  if [ -n "${missing:-}" ]; then
    apt-get update -qq
    apt-get install -y $missing
  fi
  cargo install --locked --git https://github.com/storytold/craft-anything craft-anything-cli
fi
