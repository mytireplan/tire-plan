/**
 * 간단한 비밀번호 검증 유틸리티 (로컬 개발용)
 * 
 * 주의: 이는 개발/테스트용 입니다.
 * 실제 배포 시 Firebase Functions에서 서버 검증으로 전환해야 합니다.
 */

import bcrypt from 'bcryptjs';
import { getFromFirestore, COLLECTIONS } from './firestore';
import type { OwnerAccount } from '../types';

/**
 * 로컬: Firestore에서 비밀번호 직접 검증 (개발용)
 * 실제 배포: Firebase Functions의 Custom Token 사용
 */
export const validateOwnerPassword = async (
  ownerId: string, 
  password: string
): Promise<{ valid: boolean; owner?: OwnerAccount; error?: string }> => {
  try {
    // Firestore에서 점주 정보 조회
    const owner = await getFromFirestore<OwnerAccount>(COLLECTIONS.OWNERS, ownerId);
    
    if (!owner) {
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
      return { 
        valid: false, 
        error: '비밀번호가 설정되지 않았습니다.' 
      };
    }

    if (!passwordValid) {
      return { 
        valid: false, 
        error: '아이디 또는 비밀번호가 잘못되었습니다.' 
      };
    }

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
