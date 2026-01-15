/**
 * 이번 주 대기중인 휴가 신청 추가 (1/12-1/18 주간)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';

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

async function addThisWeekPendingLeaves() {
  console.log('🔧 이번 주 대기중인 휴가 신청 추가...\n');
  
  // 오늘이 2026년 1월 15일 (수요일)
  // 이번 주는 1/12 (일) ~ 1/18 (토)
  const weekDates = [
    '2026-01-16', // 목요일 - staff_1 (이정비)
    '2026-01-17', // 금요일 - staff_2 (박매니저)
  ];

  const leaveRequestsRef = collection(db, 'leaveRequests');
  
  // 기존 pending 휴가 확인
  const q = query(leaveRequestsRef, where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  
  console.log(`📋 기존 대기중인 휴가: ${snapshot.size}개`);
  snapshot.docs.forEach(d => {
    const data = d.data();
    console.log(`  - ${data.staffName}: ${data.date} (${data.status})`);
  });

  const batch = writeBatch(db);
  
  const pendingLeaves = [
    {
      id: `L-pending-20260116`,
      date: '2026-01-16',
      staffId: 'staff_1',
      staffName: '이정비',
      type: 'FULL',
      reason: '개인 사정',
      createdAt: new Date().toISOString(),
      status: 'pending'
    },
    {
      id: `L-pending-20260117`,
      date: '2026-01-17',
      staffId: 'staff_2',
      staffName: '박매니저',
      type: 'HALF_AM',
      reason: '병원 검진',
      createdAt: new Date().toISOString(),
      status: 'pending'
    }
  ];

  console.log(`\n✨ 추가할 휴가 신청:`);
  pendingLeaves.forEach(leave => {
    const leaveRef = doc(db, 'leaveRequests', leave.id);
    batch.set(leaveRef, leave);
    console.log(`  ✓ ${leave.staffName}: ${leave.date} (목/금요일) - 대기중`);
  });

  await batch.commit();
  console.log(`\n✅ ${pendingLeaves.length}개의 대기중인 휴가 신청 추가 완료!`);
  console.log('\n📌 브라우저를 새로고침하세요!');
  
  process.exit(0);
}

addThisWeekPendingLeaves().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
