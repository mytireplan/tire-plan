/**
 * 간단한 비밀번호 검증 유틸리티 (로컬 개발용)
 * 
 * 주의: 이는 개발/테스트용 입니다.
 * 실제 배포 시 Firebase Functions에서 서버 검증으로 전환해야 합니다.
 */

import bcrypt from 'bcryptjs';
import { getFromFirestore, saveToFirestore, COLLECTIONS } from './firestore';
import type { User } from '../types';
import { auth } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';

/**
 * 비밀번호 복잡도 검증
 * - 최소 4자
 * - 숫자 포함
 */
export const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 4) {
    return { valid: false, message: '비밀번호는 최소 4자 이상이어야 합니다.' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, message: '비밀번호에 숫자를 포함해야 합니다.' };
  }
  
  return { valid: true };
};

/**
 * 로그인 시도 횟수 추적 (로컬 스토리지 사용)
 */
const getLoginAttempts = (ownerId: string): number => {
  const key = `login_attempts_${ownerId}`;
  const data = localStorage.getItem(key);
  if (!data) return 0;
  
  const { count, timestamp } = JSON.parse(data);
  // 5분 후 초기화
  if (Date.now() - timestamp > 5 * 60 * 1000) {
    localStorage.removeItem(key);
    return 0;
  }
  return count;
};

const incrementLoginAttempts = (ownerId: string): void => {
  const key = `login_attempts_${ownerId}`;
  const attempts = getLoginAttempts(ownerId) + 1;
  localStorage.setItem(key, JSON.stringify({
    count: attempts,
    timestamp: Date.now()
  }));
};

const resetLoginAttempts = (ownerId: string): void => {
  localStorage.removeItem(`login_attempts_${ownerId}`);
};

/**
 * 로그인 시도가 너무 많은지 확인
 */
export const isAccountLocked = (ownerId: string): boolean => {
  return getLoginAttempts(ownerId) >= 5;
};

/**
 * 로컬: Firestore에서 비밀번호 직접 검증 (개발용)
 * 실제 배포: Firebase Functions의 Custom Token 사용
 */
export const validateOwnerPassword = async (
  ownerId: string, 
  password: string
): Promise<{ valid: boolean; owner?: User; error?: string; locked?: boolean }> => {
  try {
    // 1) Prefer server-side auth (Custom Token) so Firestore security rules can use request.auth.uid
    // If function is unavailable, fall back to the legacy local validation path below.
    try {
      const functions = getFunctions();
      const loginWithOwnerId = httpsCallable(functions, 'loginWithOwnerId');
      const result = await loginWithOwnerId({ ownerId, password });
      const data = result.data as {
        success?: boolean;
        customToken?: string;
        user?: { id: string; name: string; role: User['role']; email?: string; storeId?: string };
      };

      if (data?.success && data.customToken && data.user) {
        await signInWithCustomToken(auth, data.customToken);
        const owner: User = {
          id: data.user.id,
          name: data.user.name,
          role: data.user.role,
          storeId: data.user.storeId
        };
        return { valid: true, owner };
      }
    } catch (_cloudErr) {
      // fallback to local validation below
    }

    // 계정 잠금 확인
    if (isAccountLocked(ownerId)) {
      return { 
        valid: false,
        locked: true,
        error: '너무 많은 로그인 실패로 계정이 잠겼습니다. 5분 후 다시 시도해주세요.' 
      };
    }

    // Firestore에서 점주 정보 조회 (직접 쿼리)
    const { db } = await import('../firebase');
    const { getDoc, doc } = await import('firebase/firestore');
    
    const ownerDoc = await getDoc(doc(db, COLLECTIONS.OWNERS, ownerId));
    
    if (!ownerDoc.exists()) {
      incrementLoginAttempts(ownerId);
      return { 
        valid: false, 
        error: '아이디 또는 비밀번호가 잘못되었습니다.' 
      };
    }

    const owner = ownerDoc.data() as User;

    // 비밀번호 검증 (해시 또는 평문)
    let passwordValid = false;
    
    if (owner.passwordHash) {
      // 해시된 비밀번호 검증
      try {
        passwordValid = await bcrypt.compare(password, owner.passwordHash);
      } catch (err) {
        console.error('Hash comparison error:', err);
        passwordValid = false;
      }
    } else if (owner.password) {
      // 평문 비밀번호 (레거시)
      passwordValid = password === owner.password;
    } else {
      incrementLoginAttempts(ownerId);
      return { 
        valid: false, 
        error: '비밀번호가 설정되지 않았습니다.' 
      };
    }

    if (!passwordValid) {
      incrementLoginAttempts(ownerId);
      const attempts = getLoginAttempts(ownerId);
      if (attempts >= 5) {
        return { 
          valid: false,
          locked: true,
          error: '너무 많은 로그인 실패로 계정이 잠겼습니다. 5분 후 다시 시도해주세요.' 
        };
      }
      return { 
        valid: false, 
        error: `아이디 또는 비밀번호가 잘못되었습니다. (${5 - attempts}회 남음)` 
      };
    }

    // 성공 시 시도 횟수 초기화
    resetLoginAttempts(ownerId);
    return { valid: true, owner };
  } catch (error: any) {
    console.error('Password validation error:', error);
    return { 
      valid: false, 
      error: '아이디 또는 비밀번호가 잘못되었습니다.' 
    };
  }
};

/**
 * 비밀번호를 해시로 변환
 * 향후 설정 화면에서 비밀번호 변경 시 사용
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * 이메일 형식 검증
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 회원가입 (신규 점주 등록)
 */
export const registerOwner = async (data: {
  id: string; // 점주 고유번호
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  businessName?: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    // 이메일 형식 검증
    if (!validateEmail(data.email)) {
      return { success: false, error: '올바른 이메일 형식이 아닙니다.' };
    }

    // 비밀번호 복잡도 검증
    const passwordCheck = validatePasswordStrength(data.password);
    if (!passwordCheck.valid) {
      return { success: false, error: passwordCheck.message };
    }

    // 중복 ID 확인
    const existing = await getFromFirestore<User>(COLLECTIONS.OWNERS, data.id);
    if (existing) {
      return { success: false, error: '이미 사용 중인 ID입니다.' };
    }

    // 비밀번호 해싱
    const passwordHash = await hashPassword(data.password);

    // 새 계정 생성
    const newOwner: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      passwordHash,
      phoneNumber: data.phoneNumber,
      role: 'STORE_ADMIN',
      emailVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    // Firestore에 저장
    await saveToFirestore(COLLECTIONS.OWNERS, newOwner, true);

    return { success: true };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error: '회원가입 처리 중 오류가 발생했습니다.' };
  }
};

/**
 * 비밀번호 재설정 요청 (이메일로 임시 비밀번호 발송)
 */
export const requestPasswordReset = async (
  id: string,
  email: string
): Promise<{ success: boolean; error?: string; tempPassword?: string }> => {
  try {
    // 사용자 확인
    const owner = await getFromFirestore<User>(COLLECTIONS.OWNERS, id);
    
    if (!owner) {
      return { success: false, error: '존재하지 않는 계정입니다.' };
    }

    if (owner.email !== email) {
      return { success: false, error: '등록된 이메일과 일치하지 않습니다.' };
    }

    // 임시 비밀번호 생성 (6자리 숫자)
    const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const tempPasswordHash = await hashPassword(tempPassword);

    // 임시 비밀번호로 업데이트
    const updatedOwner: User = {
      ...owner,
      passwordHash: tempPasswordHash,
      password: undefined // 평문 비밀번호 제거
    };

    await saveToFirestore(COLLECTIONS.OWNERS, updatedOwner, true);

    // TODO: 실제로는 이메일 발송 서비스 연동 (SendGrid, AWS SES 등)
    console.log(`📧 임시 비밀번호: ${tempPassword}`);

    return { 
      success: true, 
      tempPassword // 개발용: 실제로는 이메일로만 전송
    };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: '비밀번호 재설정 처리 중 오류가 발생했습니다.' };
  }
};
