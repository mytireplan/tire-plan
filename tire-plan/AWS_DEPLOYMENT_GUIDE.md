# AWS 배포 준비 가이드

## 🚀 빠른 시작 (Amplify 추천)

### 1단계: AWS 계정 및 CLI 설정
```bash
# AWS CLI 설치
brew install awscliv2

# AWS 자격증명 설정
aws configure
```
입력할 정보:
- **AWS Access Key ID**: AWS 콘솔에서 발급받은 키
- **AWS Secret Access Key**: 위의 시크릿 키
- **Default region**: `ap-northeast-2` (서울)
- **Output format**: `json`

### 2단계: Amplify 설치 및 초기화
```bash
# Amplify CLI 설치
npm install -g @aws-amplify/cli

# 프로젝트 디렉토리에서 초기화
cd /Users/misolee/Desktop/mytire/tire-plan
amplify init
```

초기화 설정:
- Project name: `tire-plan`
- Environment: `dev`
- App type: `javascript`
- Framework: `react`
- Source Directory: `./`
- Distribution directory: `./dist`
- Build command: `npm run build`
- Start command: `npm run dev`

### 3단계: Hosting 추가
```bash
amplify add hosting
```

선택사항:
- Hosting with Amplify Console: **Yes**
- Environment: `dev`

### 4단계: 배포
```bash
# 빌드 및 배포
amplify publish
```

완료! 콘솔에 라이브 URL이 표시됩니다 🎉

---

## 💰 비용 절감: S3 + CloudFront

더 저렴한 옵션:

```bash
# 1. 빌드
npm run build

# 2. S3 버킷 생성
aws s3 mb s3://mytire-plan-prod --region ap-northeast-2

# 3. 배포
aws s3 sync ./dist s3://mytire-plan-prod --delete

# 4. CloudFront 배포 (AWS 콘솔에서 수동 설정)
```

**비용 추정**:
- S3: ~$0.023/GB (월)
- CloudFront: ~$0.085/GB (첫 10TB)
- Amplify: 무료 티어로 충분

---

## ✅ 배포 전 체크리스트

- [ ] `npm run build` 성공 (에러 없음)
- [ ] `npm run lint` 통과 (경고 최소화)
- [ ] `.gitignore` 확인 (민감한 파일 제외)
- [ ] `.env.production` 설정 완료
- [ ] GitHub 저장소 연결됨
- [ ] AWS 계정 활성화됨
- [ ] AWS CLI 자격증명 설정 완료

---

## 🔄 배포 후 자동 업데이트

GitHub에 푸시하면 자동으로 배포됩니다 (GitHub Actions 워크플로우):

```bash
git add .
git commit -m "Deploy to AWS"
git push origin main
```

---

## 🆘 문제 해결

### "amplify command not found"
```bash
npm install -g @aws-amplify/cli
```

### "Invalid AWS credentials"
```bash
aws configure
# 자격증명 다시 입력
```

### "Build failed"
```bash
npm run build  # 로컬에서 먼저 테스트
npm run lint   # 에러 수정
```

---

## 📊 권장 구조

```
tire-plan/
├── src/              # React 소스
├── dist/             # 빌드 결과 (배포용)
├── .github/workflows # GitHub Actions (자동 배포)
├── .env.production   # 프로덕션 환경 변수
├── amplify/          # Amplify 설정 (init 후 생성)
└── package.json
```

---

**다음 명령어로 시작하세요:**
```bash
npm install -g @aws-amplify/cli
amplify init
```
