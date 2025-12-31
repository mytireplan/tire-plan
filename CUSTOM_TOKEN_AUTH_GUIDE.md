# Custom Token 인증 설정 가이드

Firebase Custom Token 인증 방식은 점주 ID + 비밀번호로 로그인하면서도 Firebase Auth의 보안 기능을 사용할 수 있는 최선의 방법입니다.

## ✅ 보안 장점

1. **서버 검증**: Firebase Functions에서 비밀번호 검증 (클라이언트 조작 불가)
2. **비밀번호 해싱**: bcrypt로 비밀번호 자동 해싱 저장
3. **세션 관리**: Firebase Auth 토큰으로 자동 세션 유지
4. **Firestore 보안**: `request.auth.uid` 사용 가능

## 📋 설치 및 배포 단계

### 1. Firebase Functions 패키지 설치

```bash
cd functions
npm install
```

### 2. Firebase CLI 설치 (없는 경우)

```bash
npm install -g firebase-tools
firebase login
```

### 3. Firebase 프로젝트 초기화

```bash
# 프로젝트 루트에서
firebase init

# 선택 항목:
# ✓ Functions: Configure and deploy Cloud Functions
# ✓ Use an existing project (현재 Firebase 프로젝트 선택)
# ✓ TypeScript
# ✓ ESLint (선택사항)
# ✓ Install dependencies with npm
```

### 4. Firebase Functions 배포

```bash
# functions/ 디렉토리에서
npm run build

# 프로젝트 루트에서
firebase deploy --only functions
```

배포 완료 후 출력되는 URL 확인:
```
✔ functions[loginWithOwnerId(us-central1)] deployed successfully
Function URL: https://us-central1-YOUR_PROJECT.cloudfunctions.net/loginWithOwnerId
```

## 🔧 프론트엔드 설정

`src/firebase.ts`에 Functions 초기화가 필요합니다:

```typescript
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Functions 초기화
export const functions = getFunctions(app);

// 로컬 개발 시 에뮬레이터 사용
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## 🧪 로컬 테스트 (선택사항)

Firebase Emulator로 로컬 테스트 가능:

```bash
# Firebase Emulator 설치
firebase init emulators

# Emulator 시작
cd functions
npm run serve
```

별도 터미널에서 프론트엔드 실행:
```bash
npm run dev
```

## 🔐 사용 가능한 Functions

### 1. `loginWithOwnerId` - 로그인

점주 ID + 비밀번호로 로그인하고 Custom Token 발급:

```typescript
const functions = getFunctions();
const loginFunction = httpsCallable(functions, 'loginWithOwnerId');
const response = await loginFunction({ 
  ownerId: '250001', 
  password: '1234' 
});
const { customToken } = response.data;
await signInWithCustomToken(auth, customToken);
```

### 2. `changePassword` - 비밀번호 변경

인증된 사용자만 자신의 비밀번호 변경 가능:

```typescript
const functions = getFunctions();
const changePasswordFunction = httpsCallable(functions, 'changePassword');
await changePasswordFunction({
  currentPassword: '1234',
  newPassword: 'new_password'
});
```

### 3. `createOwnerAccount` - 점주 계정 생성

SUPER_ADMIN만 새 점주 계정 생성 가능:

```typescript
const functions = getFunctions();
const createOwnerFunction = httpsCallable(functions, 'createOwnerAccount');
await createOwnerFunction({
  ownerId: '250002',
  name: '이점주',
  password: '1234',
  phoneNumber: '010-1234-5678'
});
```

## 🔄 기존 비밀번호 마이그레이션

기존 평문 비밀번호는 첫 로그인 시 자동으로 해시로 마이그레이션됩니다:

1. 사용자가 평문 비밀번호로 로그인
2. Function이 평문으로 검증 성공
3. 자동으로 bcrypt 해시 생성 및 저장
4. 평문 `password` 필드 삭제
5. 다음 로그인부터 `passwordHash` 사용

## ⚠️ 주의사항

1. **Firebase Blaze 요금제 필요**: Cloud Functions는 무료 요금제에서 외부 API 호출 불가
2. **CORS 설정**: 필요시 Firebase Functions에 CORS 설정 추가
3. **에러 처리**: 클라이언트에서 `functions/` 에러 코드 처리 필요
4. **Region 설정**: Functions는 기본적으로 us-central1에 배포 (변경 가능)

## 📊 비용

- **무료 할당량**: 월 200만 호출, 400,000 GB-초
- **초과 비용**: 호출당 $0.40/백만, GB-초당 $0.0000025
- **예상 비용**: 소규모 사업(일 100회 로그인) 월 $0 ~ $1 미만

## 🔍 디버깅

Functions 로그 확인:

```bash
firebase functions:log
```

실시간 로그 스트리밍:

```bash
firebase functions:log --only loginWithOwnerId
```

## 📝 다음 단계

1. ✅ Functions 배포 완료
2. ⬜ 프론트엔드에서 로그인 테스트
3. ⬜ 기존 계정 비밀번호 마이그레이션 확인
4. ⬜ Settings에서 비밀번호 변경 기능 추가
5. ⬜ SUPER_ADMIN 전용 계정 생성 UI 추가

## 🚀 배포 후 확인

1. Firebase Console → Functions → loginWithOwnerId 확인
2. 프론트엔드에서 250001/1234로 로그인 테스트
3. 브라우저 콘솔에서 "✅ 로그인 성공" 메시지 확인
4. Firebase Console → Authentication → Users에서 Custom UID(250001) 확인
