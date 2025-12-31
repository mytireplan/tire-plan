#!/usr/bin/env node

/**
 * Firestore 운영 계정 설정 스크립트
 * 250001 계정의 정보를 확인하고 필요하면 업데이트합니다
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK 초기화
const serviceAccountPath = path.join(__dirname, '..', 'firebase-adminsdk-key.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'tire-plan'
  });
} catch (error) {
  console.error('❌ Firebase 인증 파일이 없습니다: firebase-adminsdk-key.json');
  console.error('Firebase Console에서 다운로드하세요:');
  console.error('Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const db = admin.firestore();

async function setupOwnerAccount() {
  try {
    console.log('🔍 250001 계정 확인 중...\n');

    const ownerRef = db.collection('owners').doc('250001');
    const ownerSnap = await ownerRef.get();

    if (!ownerSnap.exists) {
      console.log('❌ 250001 계정이 없습니다. 생성합니다...\n');
      
      const newOwner = {
        id: '250001',
        name: '점주',
        email: '250001@tireplan.kr',
        role: 'STORE_ADMIN',
        password: '1234', // 평문 (개발용)
        ownerPin: '1234',
        phoneNumber: '',
        joinDate: new Date().toISOString().slice(0, 10),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await ownerRef.set(newOwner);
      console.log('✅ 250001 계정이 생성되었습니다!');
      console.log('\n📋 계정 정보:');
      Object.entries(newOwner).forEach(([key, value]) => {
        if (key !== 'createdAt') {
          console.log(`  ${key}: ${value}`);
        }
      });
    } else {
      console.log('✅ 250001 계정이 이미 존재합니다!\n');
      console.log('📋 현재 계정 정보:');
      const data = ownerSnap.data();
      Object.entries(data).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });

      // 비밀번호 확인
      if (!data.password) {
        console.log('\n⚠️  비밀번호가 설정되지 않았습니다!');
        console.log('비밀번호를 설정하세요: 1234\n');
        
        await ownerRef.update({
          password: '1234'
        });
        console.log('✅ 비밀번호가 설정되었습니다: 1234');
      }
    }

    console.log('\n✅ 계정 설정 완료!\n');
    console.log('🧪 로그인 테스트:');
    console.log('  아이디: 250001');
    console.log('  비밀번호: 1234\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

setupOwnerAccount();
