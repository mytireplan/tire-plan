/**
 * 간단한 비밀번호 검증 유틸리티 (로컬 개발용)
 * 
 * 주의: 이는 개발/테스트용 입니다.
 * 실제 배포 시 Firebase Functions에서 서버 검증으로 전환해야 합니다.
 */

import bcrypt from 'bcryptjs';
import { getFromFirestore, COLLECTIONS } from './firestore';
import type { User } from '../types';

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
  // 30분 후 초기화
  if (Date.now() - timestamp > 30 * 60 * 1000) {
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
    // 계정 잠금 확인
    if (isAccountLocked(ownerId)) {
      return { 
        valid: false,
        locked: true,
        error: '너무 많은 로그인 실패로 계정이 잠겼습니다. 30분 후 다시 시도해주세요.' 
      };
    }

    // Firestore에서 점주 정보 조회
    const owner = await getFromFirestore<User>(COLLECTIONS.OWNERS, ownerId);
    
    if (!owner) {
      incrementLoginAttempts(ownerId);
      return { 
        valid: false, 
        error: '아이디 또는 비밀번호가 잘못되었습니다.' 
      };
    }

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
          error: '너무 많은 로그인 실패로 계정이 잠겼습니다. 30분 후 다시 시도해주세요.' 
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
      error: '인증 처리 중 오류가 발생했습니다.' 
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
