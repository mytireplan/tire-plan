#!/bin/bash

# 배포 전 체크리스트 스크립트

echo "=========================================="
echo "  Tire Plan - 배포 사전 체크"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# 함수: 체크 결과 출력
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC} - $1"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} - $1"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "🔍 환경 확인 중..."
echo ""

# 1. Git 저장소 확인
echo -n "Git 저장소 체크: "
git rev-parse --git-dir > /dev/null 2>&1
check_status "Git 저장소"

# 2. Node.js 버전 확인
echo -n "Node.js 버전 확인: "
NODE_VERSION=$(node --version 2>/dev/null)
if [[ $NODE_VERSION =~ ^v1[6-9]|v2[0-9] ]]; then
    echo -e "${GREEN}✅ PASS${NC} - Node.js $NODE_VERSION (최소 v16 필요)"
else
    echo -e "${RED}❌ FAIL${NC} - Node.js $NODE_VERSION (최소 v16 필요)"
    FAILED=$((FAILED + 1))
fi

# 3. npm 설치 확인
echo -n "npm 설치 확인: "
npm --version > /dev/null 2>&1
check_status "npm"

# 4. 의존성 설치 확인
echo -n "node_modules 확인: "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ PASS${NC} - node_modules 존재"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - node_modules 없음 (npm install 필요)"
fi

# 5. TypeScript 컴파일 확인
echo -n "TypeScript 빌드 확인: "
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} - 빌드 성공"
    BUILD_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1)
    echo "  📦 빌드 크기: $BUILD_SIZE"
else
    echo -e "${RED}❌ FAIL${NC} - 빌드 실패"
    echo "  에러 로그:"
    tail -10 /tmp/build.log | sed 's/^/    /'
    FAILED=$((FAILED + 1))
fi

# 6. Lint 확인
echo -n "ESLint 확인: "
npm run lint > /tmp/lint.log 2>&1
LINT_RESULT=$?
if [ $LINT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} - 린트 완료"
else
    LINT_WARNINGS=$(grep -c "warning" /tmp/lint.log 2>/dev/null || echo "0")
    if [ "$LINT_WARNINGS" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  WARNING${NC} - $LINT_WARNINGS개 경고"
    else
        echo -e "${RED}❌ FAIL${NC} - 린트 실패"
        tail -5 /tmp/lint.log | sed 's/^/    /'
    fi
fi

# 7. .gitignore 확인
echo -n ".gitignore 확인: "
if [ -f ".gitignore" ]; then
    if grep -q "node_modules" .gitignore && grep -q "dist" .gitignore; then
        echo -e "${GREEN}✅ PASS${NC} - .gitignore 설정 적절"
    else
        echo -e "${YELLOW}⚠️  WARNING${NC} - node_modules/dist가 .gitignore에 없음"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - .gitignore 없음"
    FAILED=$((FAILED + 1))
fi

# 8. GitHub 원격 저장소 확인
echo -n "GitHub 원격 저장소 확인: "
if git remote get-url origin > /dev/null 2>&1; then
    REMOTE=$(git remote get-url origin)
    echo -e "${GREEN}✅ PASS${NC} - $REMOTE"
else
    echo -e "${RED}❌ FAIL${NC} - 원격 저장소 없음"
    FAILED=$((FAILED + 1))
fi

# 9. 환경 파일 확인
echo -n "환경 설정 파일: "
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ PASS${NC} - .env.production 존재"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - .env.production 없음 (선택사항)"
fi

# 10. 배포 가이드 확인
echo -n "배포 가이드 문서: "
if [ -f "LIGHTSAIL_DEPLOYMENT_GUIDE.md" ]; then
    echo -e "${GREEN}✅ PASS${NC} - LIGHTSAIL_DEPLOYMENT_GUIDE.md"
else
    echo -e "${YELLOW}⚠️  WARNING${NC} - 배포 가이드 없음"
fi

echo ""
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 체크 완료! 배포 준비 완료${NC}"
    echo ""
    echo "🚀 배포 명령어:"
    echo "  bash deploy-to-lightsail.sh <LIGHTSAIL_IP> ~/.ssh/key.pem"
    exit 0
else
    echo -e "${RED}❌ $FAILED개 항목 실패${NC}"
    echo ""
    echo "⚠️  위 오류들을 해결한 후 배포하세요"
    exit 1
fi
