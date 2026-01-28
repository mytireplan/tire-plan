#!/usr/bin/env node

/**
 * 중복 판매 제거 스크립트 (간단 버전)
 * Firebase 콘솔에서 수동 실행
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Firebase 설정 (환경변수나 하드코딩)
const firebaseConfig = {
  // 여기에 Firebase 설정 입력
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function removeDuplicates() {
  console.log('🔍 중복 판매 데이터 검색 중...\n');
  
  const salesSnapshot = await getDocs(collection(db, 'sales'));
  
  console.log(`📊 총 ${salesSnapshot.size}개의 판매 데이터\n`);
  
  const salesById = new Map();
  
  salesSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const saleId = data.id;
    
    if (!salesById.has(saleId)) {
      salesById.set(saleId, []);
    }
    
    salesById.get(saleId).push({
      docId: docSnap.id,
      ref: docSnap.ref,
      data: data
    });
  });
  
  let duplicateCount = 0;
  let deletedCount = 0;
  
  for (const [saleId, sales] of salesById.entries()) {
    if (sales.length > 1) {
      duplicateCount++;
      console.log(`⚠️  중복: ID="${saleId}" (${sales.length}개)`);
      
      // 날짜순 정렬 (최신순)
      sales.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
      
      // 첫 번째만 남기고 나머지 삭제
      for (let i = 1; i < sales.length; i++) {
        console.log(`   🗑️  삭제: ${sales[i].docId}`);
        await deleteDoc(sales[i].ref);
        deletedCount++;
      }
    }
  }
  
  console.log(`\n✅ 완료!`);
  console.log(`   - 중복 판매 ID: ${duplicateCount}개`);
  console.log(`   - 삭제된 문서: ${deletedCount}개`);
}

removeDuplicates().catch(console.error);
