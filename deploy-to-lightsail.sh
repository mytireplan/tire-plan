#!/bin/bash

# Lightsail 배포 자동 스크립트
# 사용법: bash deploy-to-lightsail.sh <lightsail-ip> <ssh-key-path>

set -e  # 에러 발생 시 스크립트 중단

if [ $# -lt 1 ]; then
    echo "❌ 사용법: bash deploy-to-lightsail.sh <lightsail-ip>"
    echo "예: bash deploy-to-lightsail.sh 3.35.123.456"
    exit 1
fi

LIGHTSAIL_IP=$1
SSH_KEY=${2:-"~/.ssh/id_rsa"}  # 기본값: ~/.ssh/id_rsa
SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10"
APP_NAME="tire-plan"
REMOTE_PATH="/home/ubuntu/$APP_NAME"

echo "🚀 Lightsail 배포 시작"
echo "Target IP: $LIGHTSAIL_IP"
echo "App Name: $APP_NAME"
echo ""

# Step 1: 로컬 빌드 확인 (Node 메모리 여유 확보)
echo "📦 Step 1: 로컬 빌드 확인..."
NODE_OPTIONS=--max-old-space-size=2048 npm run build
echo "✅ 빌드 완료"
echo ""

# Step 2: Lightsail에 접속하여 기존 프로세스 중지
echo "🛑 Step 2: Lightsail에서 기존 프로세스 중지..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@$LIGHTSAIL_IP << 'SSHEOF'
    # PM2로 중지
    if command -v pm2 &> /dev/null; then
        pm2 stop tire-plan 2>/dev/null || true
        pm2 delete tire-plan 2>/dev/null || true
    fi
    
    # 직접 실행 중인 npm 프로세스 중지
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "npm run preview" 2>/dev/null || true
    
    sleep 2
    echo "✅ 프로세스 중지 완료"
SSHEOF
echo ""

# Step 3: 기존 폴더 백업 및 제거
echo "🗑️  Step 3: 기존 폴더 정리..."
ssh $SSH_OPTS -i $SSH_KEY ubuntu@$LIGHTSAIL_IP << SSHEOF
    if [ -d "$REMOTE_PATH" ]; then
        # 백업
        sudo cp -r $REMOTE_PATH ${REMOTE_PATH}.backup.\$(date +%Y%m%d_%H%M%S)
        echo "✅ 백업 완료: ${REMOTE_PATH}.backup.*"
        
        # 제거
        sudo rm -rf $REMOTE_PATH
        echo "✅ 기존 폴더 삭제 완료"
    else
        echo "ℹ️  기존 폴더 없음 (새로 설치)"
    fi
SSHEOF
echo ""

# Step 4: 코드 배포 (사전 빌드된 dist + 핵심 파일만 배포)
echo "📡 Step 4: 코드 배포 (SCP)..."
# 미리 빌드된 dist 폴더와 필요한 설정 파일만 전송
ssh $SSH_OPTS -i $SSH_KEY ubuntu@$LIGHTSAIL_IP << SSHEOF
    sudo mkdir -p $REMOTE_PATH
SSHEOF

# dist 폴더 전송
scp $SSH_OPTS -i $SSH_KEY -r dist ubuntu@$LIGHTSAIL_IP:/tmp/dist-temp
# package.json 전송 (PM2 실행용)
scp $SSH_OPTS -i $SSH_KEY package.json ubuntu@$LIGHTSAIL_IP:/tmp/package.json

ssh $SSH_OPTS -i $SSH_KEY ubuntu@$LIGHTSAIL_IP << SSHEOF
    # dist 폴더 배포
    sudo cp -r /tmp/dist-temp $REMOTE_PATH/dist
    # package.json 배포
    sudo cp /tmp/package.json $REMOTE_PATH/package.json
    # 권한 설정
    sudo chown -R ubuntu:ubuntu $REMOTE_PATH
    rm -rf /tmp/dist-temp /tmp/package.json
    echo "✅ 코드 배포 완료"
SSHEOF
echo ""

# Step 5: PM2로 앱 시작 (빌드 없이 dist 폴더로 서빙)
echo "🚀 Step 5: 앱 시작..."
ssh $SSH_OPTS -i $SSH_KEY ubuntu@$LIGHTSAIL_IP << SSHEOF
    cd $REMOTE_PATH
    
    # PM2 설치 확인
    if ! command -v pm2 &> /dev/null; then
        echo "PM2 설치 중..."
        sudo npm install -g pm2
    fi
    
    # PM2로 정적 파일 서빙 시작 (http-server 또는 npx serve 사용)
    # package.json에 preview 스크립트가 있으면 사용, 없으면 npx serve 사용
    if grep -q '"preview"' package.json; then
        pm2 start "npm run preview" --name "$APP_NAME"
    else
        pm2 start "npx serve -s dist -l 5173" --name "$APP_NAME"
    fi
    
    pm2 save
    pm2 startup | tail -1 | bash || true
    
    sleep 3
    pm2 list
    
    echo "✅ 앱 시작 완료"
SSHEOF
echo ""

# Step 6: 배포 확인
echo "✅ Step 6: 배포 확인..."
ssh $SSH_OPTS -i $SSH_KEY ubuntu@$LIGHTSAIL_IP << SSHEOF
    sleep 3
    
    # 프로세스 확인
    echo "📋 프로세스 상태:"
    pm2 list
    
    # 앱 접속 확인
    echo ""
    echo "📡 로컬호스트 응답 확인:"
    curl -s http://localhost:5173 | head -20 || echo "⚠️  앱이 아직 시작 중..."
    
    echo ""
    echo "✅ 배포 완료!"
    echo "📍 접근: http://$LIGHTSAIL_IP:5173"
SSHEOF
echo ""

echo "🎉 배포 완료!"
echo "✨ 접근 URL: http://$LIGHTSAIL_IP:5173"
echo ""
echo "로그 확인:"
echo "  ssh $SSH_OPTS -i $SSH_KEY ubuntu@$LIGHTSAIL_IP"
echo "  pm2 logs $APP_NAME"
