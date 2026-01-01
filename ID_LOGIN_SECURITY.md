# ID 로그인 보안 가이드

TirePlan의 ID 기반 로그인 시스템은 다음과 같은 보안 기능을 포함합니다.

## 1. 비밀번호 해싱 (Password Hashing)

- **알고리즘**: bcryptjs (솔트 라운드: 10)
- **설명**: 비밀번호는 일방향 암호화되어 저장되므로 관리자도 원본 비밀번호를 알 수 없습니다.
- **마이그레이션**: 기존 평문 비밀번호는 첫 로그인 시 자동으로 해싱됩니다.

## 2. 로그인 시도 제한 (Brute Force Protection)

- **최대 시도 횟수**: 5회 실패 시 계정 잠금
- **잠금 기간**: 30분
- **사용자 피드백**: 로그인 화면에서 남은 시도 횟수 표시
- **저장 위치**: 브라우저 로컬 스토리지 (보안: 클라이언트 사이드)

## 3. 향후 개선 사항

### 3.1 서버 사이드 검증 (권장)
```
현재: 클라이언트 사이드 검증 (개발/테스트용)
↓
향후: Firebase Cloud Functions에서 서버 검증
```

구현 방법:
- Firebase Cloud Functions에서 비밀번호 검증
- 로그인 시도 횟수를 Firestore에 저장
- Custom Token 발급으로 세션 관리

### 3.2 세션 타임아웃 (Session Timeout)
- 자동 로그아웃 시간: 30분 (권장)
- 구현: App.tsx의 useEffect에서 마지막 활동 시간 추적

### 3.3 IP 기반 제한 (IP Restrictions)
- 의심 위치에서의 로그인 감지
- 관리자 알림 시스템
- 구현: Firebase Functions에서 IP 및 지역 정보 로깅

## 4. 설정 변경 방법

### 비밀번호 복잡도 변경
`src/utils/auth.ts` → `validatePasswordStrength()` 함수 수정

```typescript
export const validatePasswordStrength = (password: string) => {
  // 최소 길이 변경
  if (password.length < 6) { // 4 → 6
    return { valid: false, message: '...' };
  }
  
  // 필수 문자 추가 (영문, 숫자, 특수문자 등)
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '대문자를 포함해야 합니다.' };
  }
};
```

### 로그인 시도 제한 변경
`src/utils/auth.ts` → `getLoginAttempts()` 함수 수정

```typescript
// 최대 시도 횟수 변경 (5 → 3)
if (getLoginAttempts(ownerId) >= 3) {
  return { valid: false, locked: true, ... };
}

// 잠금 기간 변경 (30분 → 60분)
if (Date.now() - timestamp > 60 * 60 * 1000) { // 수정
  localStorage.removeItem(key);
  return 0;
}
```

## 5. 운영 가이드

### 계정 잠금 해제
관리자가 계정 잠금을 수동으로 해제하려면:

1. 브라우저 개발자 도구 열기 (F12)
2. 콘솔 탭에서 다음 명령 실행:
```javascript
localStorage.removeItem('login_attempts_250001'); // 250001 계정 잠금 해제
```

### 비밀번호 초기화
1. Settings → 시스템 환경 설정
2. 관리자가 직원 비밀번호 변경 기능 사용 (구현 필요)

## 6. 추가 보안 권장사항

1. **HTTPS 사용**: 모든 통신을 암호화
2. **2FA 도입**: 이중 인증 (향후)
3. **감사 로그**: 모든 로그인 시도 기록 (Firestore)
4. **정기적 보안 업데이트**: bcryptjs 및 Firebase SDK 최신 버전 유지
5. **관리자 권한 분리**: SUPER_ADMIN만 비밀번호 변경 가능하도록 설정

## 7. 문제 해결

### Q: 계정이 잠겼어요
A: 30분 기다리거나, 브라우저에서 localStorage를 삭제하면 됩니다.

### Q: 비밀번호를 잊었어요
A: 관리자(SUPER_ADMIN)에게 연락하여 비밀번호를 재설정받으세요.

### Q: 로그인 시도 제한을 적용하고 싶어요
A: `src/utils/auth.ts`에서 `isAccountLocked()` 함수의 조건을 수정하세요.
