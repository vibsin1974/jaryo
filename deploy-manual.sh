#!/bin/bash

# 수동 배포 스크립트 - 각 단계를 개별 실행
NAS_IP="119.64.1.86"
NAS_USER="vibsin9322"
DEPLOY_DIR="/volume1/web/jaryo"
GITEA_URL="http://119.64.1.86:3000/vibsin9322/jaryo.git"

echo "=========================================="
echo "🔧 수동 배포 가이드"
echo "=========================================="
echo "다음 명령들을 하나씩 실행하세요:"
echo ""

echo "1️⃣ SSH 연결 테스트:"
echo "ssh -p 2222 $NAS_USER@$NAS_IP"
echo ""

echo "2️⃣ 기존 배포 백업 (있는 경우):"
echo "ssh -p 2222 $NAS_USER@$NAS_IP 'sudo cp -r $DEPLOY_DIR ${DEPLOY_DIR}_backup_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true'"
echo ""

echo "3️⃣ 배포 디렉토리 준비:"
echo "ssh -p 2222 $NAS_USER@$NAS_IP 'sudo rm -rf $DEPLOY_DIR && sudo mkdir -p $DEPLOY_DIR && sudo chown $NAS_USER:users $DEPLOY_DIR'"
echo ""

echo "4️⃣ Git 클론:"
echo "ssh -p 2222 $NAS_USER@$NAS_IP 'cd $DEPLOY_DIR && git clone $GITEA_URL .'"
echo ""

echo "5️⃣ 의존성 설치:"
echo "ssh -p 2222 $NAS_USER@$NAS_IP 'cd $DEPLOY_DIR && npm install'"
echo ""

echo "6️⃣ 데이터베이스 처리:"
echo "ssh -p 2222 $NAS_USER@$NAS_IP 'cd $DEPLOY_DIR && if [ -f data/database.db ]; then echo \"기존 DB 유지\"; else npm run init-db; fi'"
echo ""

echo "7️⃣ 서비스 시작:"
echo "ssh -p 2222 $NAS_USER@$NAS_IP 'cd $DEPLOY_DIR && PORT=3005 nohup node server.js > logs/app.log 2>&1 & echo \$! > jaryo.pid'"
echo ""

echo "8️⃣ 서비스 확인:"
echo "curl http://$NAS_IP:3005"
echo ""
echo "=========================================="