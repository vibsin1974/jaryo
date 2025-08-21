#!/bin/bash

# SSH 연결 헬퍼 스크립트
NAS_IP="${1:-119.64.1.86}"
NAS_USER="${2:-vibsin9322}"
COMMAND="${3:-echo 'SSH 연결 성공'}"

# 비밀번호를 입력받아 SSH 연결
echo "🔑 SSH 연결 시도: $NAS_USER@$NAS_IP:2222"
echo "📝 비밀번호를 입력하세요:"

ssh -p 2222 -o StrictHostKeyChecking=no "$NAS_USER@$NAS_IP" "$COMMAND"