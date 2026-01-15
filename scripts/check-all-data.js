/**
 * Firestore의 모든 Staff, LeaveRequest, Shift 데이터 확인
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkAllData() {
  console.log('📊 Firestore 데이터 확인\n');

  try {
    // 1. Staff
    console.log('👥 등록된 직원:');
    const staffSnapshot = await getDocs(collection(db, 'staff'));
    staffSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.name} (ID: ${doc.id}, storeId: ${data.storeId})`);
    });

    // 2. LeaveRequests
    console.log('\n📅 휴가 신청:');
    const leaveSnapshot = await getDocs(collection(db, 'leaveRequests'));
    leaveSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.staffName} (staffId: ${data.staffId}, date: ${data.date}, status: ${data.status})`);
    });

    // 3. Shifts (최근 20개만)
    console.log('\n⏰ 근무 일정 (최근 20개):');
    const shiftsSnapshot = await getDocs(collection(db, 'shifts'));
    const shifts = shiftsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.start || '').localeCompare(a.start || ''))
      .slice(0, 20);
    
    shifts.forEach(shift => {
      console.log(`  - ${shift.staffName} (staffId: ${shift.staffId}, type: ${shift.shiftType}, start: ${shift.start})`);
    });

  } catch (error) {
    console.error('❌ 에러:', error);
  }

  process.exit(0);
}

checkAllData();
