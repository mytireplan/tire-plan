#!/bin/bash

# Custom Token 인증 업그레이드 배포 스크립트

echo "🚀 Firebase Custom Token 인증 배포 시작..."

# 1. Cloud Functions 빌드
echo ""
echo "📦 Cloud Functions 빌드 중..."
cd functions
npm install
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Cloud Functions 빌드 실패"
    exit 1
fi

echo "✅ Cloud Functions 빌드 완료"

# 2. Cloud Functions 배포
echo ""
echo "☁️  Cloud Functions 배포 중..."
cd ..
firebase deploy --only functions

if [ $? -ne 0 ]; then
    echo "❌ Cloud Functions 배포 실패"
    exit 1
fi

echo "✅ Cloud Functions 배포 완료"

# 3. Firestore 보안 규칙 배포
echo ""
echo "🔒 Firestore 보안 규칙 배포 중..."
firebase deploy --only firestore:rules

if [ $? -ne 0 ]; then
    echo "❌ Firestore 규칙 배포 실패"
    exit 1
fi

echo "✅ Firestore 규칙 배포 완료"

# 4. 프론트엔드 빌드 & 배포
echo ""
echo "🌐 프론트엔드 빌드 중..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 프론트엔드 빌드 실패"
    exit 1
fi

echo "✅ 프론트엔드 빌드 완료"

echo ""
echo "📤 Lightsail 배포 중..."
bash deploy-to-lightsail.sh 52.78.72.19 ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem

if [ $? -ne 0 ]; then
    echo "❌ Lightsail 배포 실패"
    exit 1
fi

echo ""
echo "✅ 모든 배포 완료!"
echo ""
echo "🔍 테스트 순서:"
echo "1. https://tireplan.kr 접속"
echo "2. 기존 계정으로 로그인 (Cloud Function이 Custom Token 발급)"
echo "3. 설정에서 비밀번호 변경"
echo "4. 로그아웃 후 새 비밀번호로 로그인"
echo ""
