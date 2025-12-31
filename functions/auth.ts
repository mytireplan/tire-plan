import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as bcrypt from 'bcryptjs';

// Firebase Admin 초기화 (functions/subscription.ts와 공유)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 점주 ID + 비밀번호로 로그인하고 Custom Token 발급
 * 
 * 사용법:
 * const response = await fetch('https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/loginWithOwnerId', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ ownerId: '250001', password: '1234' })
 * });
 * const { customToken } = await response.json();
 * await signInWithCustomToken(auth, customToken);
 */
export const loginWithOwnerId = functions.https.onCall(async (data, context) => {
  const { ownerId, password } = data;

  // 입력 검증
  if (!ownerId || !password) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '아이디와 비밀번호를 입력해주세요.'
    );
  }

  try {
    // Firestore에서 점주 계정 조회
    const ownerDoc = await db.collection('owners').doc(ownerId).get();

    if (!ownerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        '아이디 또는 비밀번호가 잘못되었습니다.'
      );
    }

    const ownerData = ownerDoc.data();
    if (!ownerData) {
      throw new functions.https.HttpsError(
        'not-found',
        '계정 정보를 찾을 수 없습니다.'
      );
    }

    // 비밀번호 검증
    let passwordValid = false;
    
    // 해시된 비밀번호가 있으면 bcrypt로 검증
    if (ownerData.passwordHash) {
      passwordValid = await bcrypt.compare(password, ownerData.passwordHash);
    } 
    // 레거시: 평문 비밀번호 (개발/마이그레이션용)
    else if (ownerData.password) {
      passwordValid = password === ownerData.password;
      
      // 평문 비밀번호를 해시로 자동 마이그레이션
      if (passwordValid) {
        const passwordHash = await bcrypt.hash(password, 10);
        await ownerDoc.ref.update({
          passwordHash,
          password: admin.firestore.FieldValue.delete() // 평문 삭제
        });
        console.log(`✅ Migrated password to hash for owner: ${ownerId}`);
      }
    } else {
      throw new functions.https.HttpsError(
        'failed-precondition',
        '비밀번호가 설정되지 않았습니다.'
      );
    }

    if (!passwordValid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '아이디 또는 비밀번호가 잘못되었습니다.'
      );
    }

    // Custom Token 발급 (ownerId를 uid로 사용)
    const customToken = await admin.auth().createCustomToken(ownerId, {
      role: ownerData.role,
      name: ownerData.name,
      email: ownerData.email || `${ownerId}@tireplan.kr`
    });

    // 마지막 로그인 시간 업데이트
    await ownerDoc.ref.update({
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      customToken,
      user: {
        id: ownerId,
        name: ownerData.name,
        role: ownerData.role,
        email: ownerData.email || `${ownerId}@tireplan.kr`
      }
    };
  } catch (error: any) {
    console.error('❌ Login error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      '로그인 처리 중 오류가 발생했습니다.'
    );
  }
});

/**
 * 비밀번호 변경 (인증된 사용자만)
 */
export const changePassword = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '로그인이 필요합니다.'
    );
  }

  const { currentPassword, newPassword } = data;
  const ownerId = context.auth.uid;

  if (!currentPassword || !newPassword) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '현재 비밀번호와 새 비밀번호를 입력해주세요.'
    );
  }

  if (newPassword.length < 4) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '비밀번호는 최소 4자 이상이어야 합니다.'
    );
  }

  try {
    const ownerDoc = await db.collection('owners').doc(ownerId).get();
    if (!ownerDoc.exists) {
      throw new functions.https.HttpsError('not-found', '계정을 찾을 수 없습니다.');
    }

    const ownerData = ownerDoc.data();
    if (!ownerData) {
      throw new functions.https.HttpsError('not-found', '계정 정보를 찾을 수 없습니다.');
    }

    // 현재 비밀번호 확인
    let currentPasswordValid = false;
    if (ownerData.passwordHash) {
      currentPasswordValid = await bcrypt.compare(currentPassword, ownerData.passwordHash);
    } else if (ownerData.password) {
      currentPasswordValid = currentPassword === ownerData.password;
    }

    if (!currentPasswordValid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        '현재 비밀번호가 일치하지 않습니다.'
      );
    }

    // 새 비밀번호 해시 생성 및 저장
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await ownerDoc.ref.update({
      passwordHash: newPasswordHash,
      password: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, message: '비밀번호가 변경되었습니다.' };
  } catch (error: any) {
    console.error('❌ Change password error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      '비밀번호 변경 중 오류가 발생했습니다.'
    );
  }
});

/**
 * 점주 계정 생성 (SUPER_ADMIN만 가능)
 */
export const createOwnerAccount = functions.https.onCall(async (data, context) => {
  // 인증 및 권한 확인
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '로그인이 필요합니다.');
  }

  const callerDoc = await db.collection('owners').doc(context.auth.uid).get();
  const callerData = callerDoc.data();
  
  if (!callerData || callerData.role !== 'SUPER_ADMIN') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'SUPER_ADMIN 권한이 필요합니다.'
    );
  }

  const { ownerId, name, password, phoneNumber } = data;

  if (!ownerId || !name || !password) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '아이디, 이름, 비밀번호는 필수입니다.'
    );
  }

  try {
    // 중복 체크
    const existingDoc = await db.collection('owners').doc(ownerId).get();
    if (existingDoc.exists) {
      throw new functions.https.HttpsError(
        'already-exists',
        '이미 존재하는 점주 ID입니다.'
      );
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10);

    // 계정 생성
    const newOwner = {
      id: ownerId,
      name,
      passwordHash,
      role: 'STORE_ADMIN',
      email: `${ownerId}@tireplan.kr`,
      phoneNumber: phoneNumber || '',
      ownerPin: '1234', // 기본 PIN
      joinDate: new Date().toISOString().slice(0, 10),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid
    };

    await db.collection('owners').doc(ownerId).set(newOwner);

    return {
      success: true,
      message: '점주 계정이 생성되었습니다.',
      ownerId
    };
  } catch (error: any) {
    console.error('❌ Create owner error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      '계정 생성 중 오류가 발생했습니다.'
    );
  }
});
