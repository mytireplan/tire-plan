# Firestore 보안 규칙 배포 가이드

## 📋 개요

이 가이드는 TirePlan 프로젝트에 Firebase Authentication과 Firestore 보안 규칙을 적용하는 방법을 설명합니다.

## 🔒 보안 규칙의 이점

### 1. **데이터 보안 강화**
- 인증되지 않은 사용자의 데이터 접근 완전 차단
- 각 매장 소유자는 자신의 데이터만 접근 가능
- 타 매장의 재고, 매출, 고객 정보 완전 격리

### 2. **비용 절감**
- 악의적인 대량 데이터 읽기/쓰기 방지
- API 남용으로 인한 과금 방지
- Firestore 읽기/쓰기 작업 최적화

### 3. **데이터 무결성 보장**
- 매출/결제 내역 변조 방지
- 구독 정보는 Cloud Functions만 수정 가능
- 중요 데이터의 감사 추적(audit trail) 가능

### 4. **규정 준수**
- GDPR, 개인정보보호법 등 데이터 보호 규정 준수
- 고객 정보 접근 제어 강화

## 📝 적용 단계

### Step 1: Firebase Authentication 활성화

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/
   ```

2. **Authentication 활성화**
   - 좌측 메뉴에서 "Authentication" 클릭
   - "시작하기" 버튼 클릭
   - "Sign-in method" 탭 선택
   - "이메일/비밀번호" 활성화

3. **테스트 계정 생성**
   - "Users" 탭으로 이동
   - "사용자 추가" 클릭
   - 이메일: `250001@tireplan.kr`
   - 비밀번호: `1234` (또는 원하는 비밀번호)
   - 사용자 UID 복사 (예: `abc123def456...`)

### Step 2: Firestore에 사용자 문서 생성

Firebase Console의 Firestore에서 수동으로 생성:

```
컬렉션: owners
문서 ID: [위에서 복사한 UID]
필드:
  - id: "250001" (string)
  - name: "김대표" (string)
  - role: "STORE_ADMIN" (string)
  - password: "1234" (string)
  - ownerPin: "1234" (string)
  - phoneNumber: "010-1234-5678" (string)
  - joinDate: "2025.01.01" (string)
```

### Step 3: Firestore 보안 규칙 배포

#### 방법 1: Firebase Console (권장 - 초보자)

1. Firebase Console > Firestore Database > 규칙
2. `firestore.rules` 파일의 내용을 복사
3. 규칙 편집기에 붙여넣기
4. "게시" 버튼 클릭

#### 방법 2: Firebase CLI (권장 - 개발자)

```bash
# Firebase CLI 설치 (한 번만)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# 프로젝트 초기화 (최초 1회)
firebase init firestore

# 보안 규칙 배포
firebase deploy --only firestore:rules
```

### Step 4: 기존 데이터 마이그레이션

기존 Firestore 데이터에 `ownerId` 필드가 없다면 마이그레이션이 필요합니다.

#### 4-1. Firebase Admin SDK 설정

1. **서비스 계정 키 다운로드**
   - Firebase Console > 프로젝트 설정 > 서비스 계정
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드 → `serviceAccountKey.json`으로 저장
   - 프로젝트 루트에 복사

2. **Firebase Admin 패키지 설치**
   ```bash
   npm install firebase-admin --save-dev
   ```

#### 4-2. 마이그레이션 실행

```bash
# 환경변수 설정 (macOS/Linux)
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"

# Windows PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"

# 마이그레이션 실행
node scripts/migrate-add-owner-id.js
```

#### 4-3. 특정 데이터 재할당 (옵션)

```bash
# 특정 컬렉션의 ownerId 변경
node scripts/migrate-add-owner-id.js reassign products OLD_OWNER_ID NEW_OWNER_ID
```

### Step 5: 테스트

1. **로그인 테스트**
   ```bash
   npm run dev
   ```
   - 브라우저에서 `http://localhost:5173` 접속
   - 아이디: `250001`, 비밀번호: `1234` 로 로그인
   - Firebase Auth 콘솔에서 로그인 확인

2. **데이터 접근 테스트**
   - 제품 추가/수정/삭제 테스트
   - 매출 기록 생성 테스트
   - 다른 계정으로 로그인하여 데이터 격리 확인

3. **보안 규칙 검증**
   - Firebase Console > Firestore > 규칙 탭
   - "규칙 시뮬레이터" 사용하여 테스트

   ```javascript
   // 테스트 예시
   Authenticated: Yes
   Location: /databases/(default)/documents/products/P-001
   Provider: custom
   UID: [your-user-uid]
   
   Operation: get
   Expected: Allow
   ```

## 🚨 주의사항

### 보안 규칙 적용 전

현재 Firestore는 **테스트 모드**로 되어 있어 누구나 데이터에 접근 가능합니다:

```javascript
// ⚠️ 현재 상태 (위험!)
allow read, write: if true;
```

### 보안 규칙 적용 후

인증되지 않은 사용자는 데이터 접근 불가:

```javascript
// ✅ 적용 후 (안전)
allow read: if isAuthenticated() && isOwner(resource.data.ownerId);
```

### 기존 앱 사용자에게 미치는 영향

1. **Firebase Auth 없이 로그인한 사용자**
   - 보안 규칙 적용 후 데이터 접근 차단됨
   - Firebase Authentication으로 재로그인 필요

2. **localStorage에 저장된 세션**
   - 자동으로 무효화됨
   - 사용자에게 재로그인 요청

3. **데이터 마이그레이션 필수**
   - `ownerId` 없는 문서는 접근 불가
   - 마이그레이션 스크립트 반드시 실행

## 📚 관련 파일

- `firestore.rules` - Firestore 보안 규칙
- `src/firebase.ts` - Firebase 초기화 (Auth 추가됨)
- `src/components/LoginScreen.tsx` - Firebase Auth 로그인
- `src/App.tsx` - 인증 상태 관리
- `src/utils/firestore.ts` - ownerId 자동 추가 로직
- `scripts/migrate-add-owner-id.js` - 데이터 마이그레이션

## 🔧 문제 해결

### 로그인 시 "auth/user-not-found" 오류

**원인**: Firebase Authentication에 사용자가 없음

**해결**:
1. Firebase Console > Authentication > Users
2. 사용자 수동 추가
3. 이메일: `250001@tireplan.kr`, 비밀번호 설정

### "permission-denied" 오류

**원인**: Firestore 보안 규칙이 접근 차단

**해결**:
1. Firebase Console > Firestore > 규칙 확인
2. 사용자의 UID가 문서의 `ownerId`와 일치하는지 확인
3. 마이그레이션 스크립트 실행 확인

### 데이터가 보이지 않음

**원인**: `ownerId` 필드 누락

**해결**:
```bash
node scripts/migrate-add-owner-id.js
```

## 📞 지원

문제가 발생하면:
1. Firebase Console > Firestore > 규칙 > 시뮬레이터로 테스트
2. 브라우저 콘솔(F12)에서 에러 확인
3. `firebase-debug.log` 파일 확인

## ✅ 체크리스트

배포 전 확인사항:

- [ ] Firebase Authentication 활성화
- [ ] 테스트 계정 생성 (250001@tireplan.kr)
- [ ] Firestore에 owners 문서 생성
- [ ] firestore.rules 파일 배포
- [ ] 마이그레이션 스크립트 실행
- [ ] 로그인 테스트 완료
- [ ] 데이터 접근 권한 테스트 완료
- [ ] 다른 계정으로 격리 테스트 완료

## 🚀 프로덕션 배포

모든 테스트 완료 후:

```bash
# 1. 코드 커밋
git add .
git commit -m "Implement Firebase Auth and Firestore security rules"
git push origin main

# 2. Firebase 배포
firebase deploy --only firestore:rules

# 3. 앱 빌드 및 배포
npm run build
# (AWS Lightsail 또는 호스팅 서비스에 배포)
```

---

**마지막 업데이트**: 2025년 12월 31일
