# 소셜 로그인 설정 가이드

## 🎯 지원하는 로그인 방식

1. **Google 로그인** ⭐ (권장)
2. **Kakao 로그인** 🇰🇷 (한국 사용자용)
3. **전화번호 인증** 📱 (간편)
4. **이메일/비밀번호** (기본)

---

## 1️⃣ Google 로그인 설정 (가장 쉬움)

### Firebase Console 설정

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/
   ```

2. **Authentication 활성화**
   - 좌측 메뉴 → "Authentication"
   - "Sign-in method" 탭
   - "Google" 제공업체 클릭
   - "사용 설정" 토글 ON
   - "저장" 클릭

3. **완료!** 
   - 별도 API 키 설정 불필요
   - 바로 사용 가능

### 코드 구현 (이미 완료됨)

```tsx
// src/components/LoginScreen.tsx
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  // 로그인 성공!
};
```

---

## 2️⃣ Kakao 로그인 설정

### Kakao Developers 설정

1. **Kakao Developers 계정 생성**
   ```
   https://developers.kakao.com/
   ```

2. **애플리케이션 등록**
   - "내 애플리케이션" → "애플리케이션 추가하기"
   - 앱 이름: "TirePlan"
   - 회사명: 귀사 이름

3. **플랫폼 등록**
   - 앱 설정 → 플랫폼
   - "Web 플랫폼 등록"
   - 사이트 도메인: `https://tireplan.kr`

4. **Redirect URI 설정**
   - 제품 설정 → 카카오 로그인
   - Redirect URI 등록: `https://tire-plan.firebaseapp.com/__/auth/handler`
   - 카카오 로그인 활성화

5. **REST API 키 복사**
   - 앱 설정 → 앱 키
   - "REST API 키" 복사

### Firebase 확장 프로그램 설치

```bash
# Firebase CLI로 설치
firebase ext:install firebase/auth-custom-claims-kakao

# 또는 Firebase Console에서
# Extensions → Kakao Auth 검색 → 설치
```

### 환경 변수 설정

```bash
# .env.local 파일 생성
VITE_KAKAO_API_KEY=your_kakao_rest_api_key
```

### 코드 구현

```tsx
// src/components/LoginScreen.tsx
const handleKakaoLogin = async () => {
  try {
    // Kakao SDK 초기화
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(import.meta.env.VITE_KAKAO_API_KEY);
    }

    // Kakao 로그인
    window.Kakao.Auth.login({
      success: async (authObj: any) => {
        // Firebase Custom Token 발급 (Cloud Function 필요)
        const response = await fetch('/api/kakao-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: authObj.access_token })
        });
        
        const { customToken } = await response.json();
        await signInWithCustomToken(auth, customToken);
      },
      fail: (err: any) => {
        console.error('Kakao login failed:', err);
      }
    });
  } catch (error) {
    console.error('Kakao login error:', error);
  }
};
```

---

## 3️⃣ 전화번호 인증 설정 (추천!)

### Firebase Console 설정

1. **전화번호 로그인 활성화**
   - Authentication → Sign-in method
   - "전화" 제공업체 클릭
   - "사용 설정" ON

2. **reCAPTCHA 설정**
   - 자동으로 활성화됨
   - 테스트용 전화번호 추가 가능

### 코드 구현

```tsx
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const handlePhoneLogin = async (phoneNumber: string) => {
  // reCAPTCHA 초기화
  const recaptchaVerifier = new RecaptchaVerifier(
    'recaptcha-container',
    { size: 'invisible' },
    auth
  );

  // 인증 코드 전송
  const confirmationResult = await signInWithPhoneNumber(
    auth,
    phoneNumber, // +821012345678 형식
    recaptchaVerifier
  );

  // 사용자가 입력한 인증 코드로 로그인
  await confirmationResult.confirm(verificationCode);
};
```

---

## 4️⃣ 추천 UI 구성

### 옵션 A: 모든 로그인 방식 제공

```tsx
<div className="space-y-3">
  {/* Google */}
  <button onClick={handleGoogleLogin}>
    🔵 Google 계정으로 로그인
  </button>
  
  {/* Kakao */}
  <button onClick={handleKakaoLogin}>
    🟡 Kakao 계정으로 로그인
  </button>
  
  {/* 전화번호 */}
  <button onClick={handlePhoneLogin}>
    📱 전화번호로 로그인
  </button>
  
  {/* 이메일 (기존) */}
  <button onClick={handleEmailLogin}>
    ✉️ 이메일로 로그인
  </button>
</div>
```

### 옵션 B: 타이어 매장에 최적화 (권장)

```tsx
// 1. 메인: Google 로그인 (빠르고 간편)
// 2. 서브: 전화번호 인증 (스마트폰 사용자)
// 3. 숨김: 이메일 로그인 (관리자용)

<div className="space-y-4">
  <button className="primary">
    Google 계정으로 시작하기
  </button>
  
  <button className="secondary">
    전화번호로 로그인
  </button>
  
  <a href="#email-login" className="text-sm">
    이메일로 로그인 →
  </a>
</div>
```

---

## 🔒 보안 규칙 업데이트

기존 `firestore.rules`는 그대로 사용 가능! 소셜 로그인도 동일한 UID를 생성합니다.

```javascript
// firestore.rules (변경 불필요)
function isOwner(ownerId) {
  return request.auth.uid == ownerId; // Google/Kakao UID도 동일하게 작동
}
```

단, 최초 로그인 시 `owners` 컬렉션에 사용자 문서를 자동 생성해야 합니다:

```tsx
// src/App.tsx - onAuthStateChanged에서
if (user) {
  const userDoc = await getFromFirestore('owners', user.uid);
  
  if (!userDoc) {
    // 신규 사용자 → 자동 생성
    await saveToFirestore('owners', {
      id: user.uid,
      name: user.displayName || '사용자',
      email: user.email || '',
      role: 'STORE_ADMIN',
      joinDate: new Date().toISOString().slice(0, 10),
      phoneNumber: user.phoneNumber || ''
    });
  }
}
```

---

## 📊 로그인 방식 비교

| 방식 | 설정 난이도 | 사용자 편의성 | 한국 적합도 | 추천도 |
|------|------------|--------------|------------|--------|
| **Google** | ⭐ 쉬움 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ 1순위 |
| **전화번호** | ⭐⭐ 보통 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 2순위 |
| **Kakao** | ⭐⭐⭐ 복잡 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ 옵션 |
| **이메일** | ⭐ 쉬움 | ⭐⭐ | ⭐⭐ | 🔧 관리자용 |

---

## 🚀 빠른 적용 (Google만)

Google 로그인은 **코드가 이미 작성되어 있습니다!**

### 1분 안에 활성화:

```bash
# 1. Firebase Console에서 Google 로그인 활성화

# 2. 테스트
npm run dev

# 3. "Google 계정으로 로그인" 버튼 클릭
# → Gmail 계정으로 바로 로그인됨!
```

---

## 📝 TODO

현재 상태:
- ✅ Google 로그인 코드 추가됨
- ❌ Firebase Console에서 활성화 필요
- ❌ 신규 사용자 자동 생성 로직 추가 필요

다음 단계:
1. Firebase Console → Google 로그인 활성화
2. App.tsx에 신규 사용자 자동 생성 추가
3. 테스트 로그인

궁금한 점 있으면 말씀해주세요! 🎉
