/**
 * 데이터 수정 스크립트
 * 1. 고정지출(fixedCosts)에 storeId 추가
 * 2. 대기중인 휴가 신청 추가
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDSxmjxKzQOtvQbXevhDxZXKkZqO60FG20",
  authDomain: "tire-plan.firebaseapp.com",
  projectId: "tire-plan",
  storageBucket: "tire-plan.firebasestorage.app",
  messagingSenderId: "577926820746",
  appId: "1:577926820746:web:c76e43ee3f1a66eb0dca9c",
  measurementId: "G-0TX0P94YCZ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixFixedCosts() {
  console.log('🔧 고정지출 데이터 수정 시작...');
  
  const fixedCostsRef = collection(db, 'fixedCosts');
  const snapshot = await getDocs(fixedCostsRef);
  
  if (snapshot.empty) {
    console.log('⚠️  고정지출 데이터가 없습니다.');
    return;
  }

  const batch = writeBatch(db);
  let updateCount = 0;

  snapshot.docs.forEach((docSnap, index) => {
    const data = docSnap.data();
    
    // storeId가 없는 경우에만 추가
    if (!data.storeId) {
      // 첫 3개는 ST-1, 나머지는 ST-2에 할당
      const storeId = index < 3 ? 'ST-1' : 'ST-2';
      batch.update(docSnap.ref, { storeId });
      updateCount++;
      console.log(`  ✓ ${data.title} → storeId: ${storeId}`);
    } else {
      console.log(`  - ${data.title} (이미 storeId 있음: ${data.storeId})`);
    }
  });

  if (updateCount > 0) {
    await batch.commit();
    console.log(`✅ ${updateCount}개의 고정지출에 storeId 추가 완료!`);
  } else {
    console.log('✅ 모든 고정지출이 이미 storeId를 가지고 있습니다.');
  }
}

async function addPendingLeaveRequests() {
  console.log('\n🔧 대기중인 휴가 신청 추가 시작...');
  
  const leaveRequestsRef = collection(db, 'leaveRequests');
  const snapshot = await getDocs(leaveRequestsRef);
  
  // 이번 주 월요일 계산
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + daysToMonday);
  
  const toDate = (daysFromMonday) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + daysFromMonday);
    return d.toISOString().split('T')[0];
  };

  // 이미 있는 pending 휴가 확인
  const existingPending = snapshot.docs.filter(d => d.data().status === 'pending');
  
  if (existingPending.length > 0) {
    console.log(`⚠️  이미 ${existingPending.length}개의 대기중인 휴가가 있습니다.`);
    existingPending.forEach(d => {
      const data = d.data();
      console.log(`  - ${data.staffName}: ${data.date} (${data.type})`);
    });
    return;
  }

  const batch = writeBatch(db);
  
  // 2개의 pending 휴가 신청 추가
  const pendingLeaves = [
    {
      id: `L-pending-${Date.now()}-1`,
      date: toDate(1), // 화요일
      staffId: 'staff_1',
      staffName: '이정비',
      type: 'FULL',
      reason: '개인 사정',
      createdAt: new Date().toISOString(),
      status: 'pending'
    },
    {
      id: `L-pending-${Date.now()}-2`,
      date: toDate(3), // 목요일
      staffId: 'staff_2',
      staffName: '박매니저',
      type: 'HALF_AM',
      reason: '병원 검진',
      createdAt: new Date().toISOString(),
      status: 'pending'
    }
  ];

  pendingLeaves.forEach(leave => {
    const leaveRef = doc(db, 'leaveRequests', leave.id);
    batch.set(leaveRef, leave);
    console.log(`  ✓ ${leave.staffName}: ${leave.date} (${leave.type}) - 대기중`);
  });

  await batch.commit();
  console.log(`✅ ${pendingLeaves.length}개의 대기중인 휴가 신청 추가 완료!`);
}

async function main() {
  console.log('🚀 데이터 수정 스크립트 실행\n');
  
  try {
    await fixFixedCosts();
    await addPendingLeaveRequests();
    
    console.log('\n✅ 모든 데이터 수정 완료!');
    console.log('\n📌 다음 단계:');
    console.log('   1. 브라우저를 강력 새로고침 (Cmd+Shift+R)');
    console.log('   2. 근무표에서 "결재중" 뱃지 확인');
    console.log('   3. 재무/결산에서 고정지출 중복 해결 확인');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
