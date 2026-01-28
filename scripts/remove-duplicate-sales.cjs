#!/usr/bin/env node

/**
 * 중복 판매 데이터 제거 스크립트
 * 
 * 같은 ID를 가진 판매가 여러 개 있을 경우, 가장 최신 것만 남기고 나머지 삭제
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeDuplicateSales() {
  console.log('🔍 중복 판매 데이터 검색 중...\n');
  
  try {
    // 모든 판매 데이터 가져오기
    const salesSnapshot = await db.collection('sales').get();
    
    if (salesSnapshot.empty) {
      console.log('❌ 판매 데이터가 없습니다.');
      return;
    }
    
    console.log(`📊 총 ${salesSnapshot.size}개의 판매 데이터 발견\n`);
    
    // ID별로 그룹화
    const salesById = new Map();
    
    salesSnapshot.forEach(doc => {
      const data = doc.data();
      const saleId = data.id;
      
      if (!salesById.has(saleId)) {
        salesById.set(saleId, []);
      }
      
      salesById.get(saleId).push({
        docId: doc.id,
        data: data,
        ref: doc.ref
      });
    });
    
    // 중복 찾기
    const duplicates = [];
    let totalDuplicates = 0;
    
    salesById.forEach((sales, saleId) => {
      if (sales.length > 1) {
        duplicates.push({ saleId, sales });
        totalDuplicates += sales.length - 1;
        
        console.log(`⚠️  중복 발견: ID="${saleId}" (${sales.length}개)`);
        sales.forEach((sale, idx) => {
          console.log(`   [${idx + 1}] Doc: ${sale.docId}, Date: ${sale.data.date}, Amount: ${sale.data.totalAmount}`);
        });
        console.log('');
      }
    });
    
    if (duplicates.length === 0) {
      console.log('✅ 중복된 판매 데이터가 없습니다!');
      return;
    }
    
    console.log(`\n📌 총 ${duplicates.length}개의 판매 ID에서 ${totalDuplicates}개의 중복 발견\n`);
    
    // 중복 제거 (가장 최신 것만 남기고 나머지 삭제)
    const batch = db.batch();
    let deleteCount = 0;
    
    for (const { saleId, sales } of duplicates) {
      // 날짜순 정렬 (최신순)
      sales.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
      
      // 첫 번째(최신)만 남기고 나머지 삭제
      for (let i = 1; i < sales.length; i++) {
        batch.delete(sales[i].ref);
        deleteCount++;
        console.log(`🗑️  삭제 예정: ${sales[i].docId} (ID: ${saleId})`);
      }
    }
    
    console.log(`\n💾 Firestore에 변경사항 커밋 중... (${deleteCount}개 삭제)`);
    await batch.commit();
    
    console.log('\n✅ 중복 판매 데이터 제거 완료!');
    console.log(`   - 삭제된 중복: ${deleteCount}개`);
    console.log(`   - 남은 고유 판매: ${salesById.size}개\n`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

removeDuplicateSales()
  .then(() => {
    console.log('🎉 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ 치명적 오류:', err);
    process.exit(1);
  });
