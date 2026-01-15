/**
 * Firestore에서 잘못된 직원 데이터 정리
 * "직원"이라는 이름이나 staffList에 없는 직원의 데이터 삭제
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAcxf-YVZbPbdEW1wMLrvWmKCe_wVDpOB0",
  authDomain: "tire-plan.firebaseapp.com",
  projectId: "tire-plan",
  storageBucket: "tire-plan.firebasestorage.app",
  messagingSenderId: "610064809454",
  appId: "1:610064809454:web:e57bc0ac768da4f7f71f79"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanInvalidData() {
  console.log('🔍 잘못된 직원 데이터 검색 중...\n');

  try {
    // 1. 모든 Staff 가져오기
    const staffSnapshot = await getDocs(collection(db, 'staff'));
    const validStaffIds = new Set(staffSnapshot.docs.map(doc => doc.id));
    console.log(`✅ 등록된 직원 수: ${validStaffIds.size}`);
    console.log(`   직원 ID 목록: ${Array.from(validStaffIds).join(', ')}\n`);

    // 2. LeaveRequests 확인 및 정리
    console.log('📋 LeaveRequests 확인 중...');
    const leaveRequestsSnapshot = await getDocs(collection(db, 'leaveRequests'));
    let leaveRequestsDeleted = 0;

    for (const docSnapshot of leaveRequestsSnapshot.docs) {
      const data = docSnapshot.data();
      const shouldDelete = 
        data.staffName === '직원' || 
        !validStaffIds.has(data.staffId);

      if (shouldDelete) {
        console.log(`  ❌ 삭제: ID=${docSnapshot.id}, staffId=${data.staffId}, staffName=${data.staffName}, date=${data.date}`);
        await deleteDoc(doc(db, 'leaveRequests', docSnapshot.id));
        leaveRequestsDeleted++;
      }
    }

    console.log(`✅ LeaveRequests 정리 완료: ${leaveRequestsDeleted}개 삭제\n`);

    // 3. Shifts 확인 및 정리
    console.log('📋 Shifts 확인 중...');
    const shiftsSnapshot = await getDocs(collection(db, 'shifts'));
    let shiftsDeleted = 0;

    for (const docSnapshot of shiftsSnapshot.docs) {
      const data = docSnapshot.data();
      const shouldDelete = 
        data.staffName === '직원' || 
        !validStaffIds.has(data.staffId);

      if (shouldDelete) {
        console.log(`  ❌ 삭제: ID=${docSnapshot.id}, staffId=${data.staffId}, staffName=${data.staffName}, shiftType=${data.shiftType}`);
        await deleteDoc(doc(db, 'shifts', docSnapshot.id));
        shiftsDeleted++;
      }
    }

    console.log(`✅ Shifts 정리 완료: ${shiftsDeleted}개 삭제\n`);

    console.log('🎉 데이터 정리 완료!');
    console.log(`   총 ${leaveRequestsDeleted + shiftsDeleted}개 항목 삭제됨`);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }

  process.exit(0);
}

cleanInvalidData();
