// 브라우저 콘솔에서 실행 - 중복 판매 ID 확인
// https://tireplan.kr 접속 후 F12 개발자 도구에서 실행

const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

// 이미 로드된 Firestore 인스턴스 사용
const db = window.firebase?.firestore || (await import('./firebase.js')).db;

async function findDuplicateSales() {
  console.log('🔍 중복 판매 데이터 검색 중...');
  
  const salesSnapshot = await getDocs(collection(db, 'sales'));
  
  console.log(`📊 총 ${salesSnapshot.size}개의 판매 데이터 확인`);
  
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
      ...data
    });
  });
  
  // 중복 찾기
  const duplicates = [];
  
  salesById.forEach((sales, saleId) => {
    if (sales.length > 1) {
      duplicates.push({ saleId, count: sales.length, sales });
    }
  });
  
  if (duplicates.length === 0) {
    console.log('✅ 중복된 판매 데이터가 없습니다!');
    return;
  }
  
  console.log(`\n⚠️  ${duplicates.length}개의 판매 ID에서 중복 발견:\n`);
  
  duplicates.forEach(({ saleId, count, sales }) => {
    console.log(`ID: ${saleId} (${count}개 중복)`);
    sales.forEach((sale, idx) => {
      console.log(`  [${idx + 1}] Date: ${sale.date}, Amount: ${sale.totalAmount}, Store: ${sale.storeId}`);
    });
    console.log('');
  });
  
  return duplicates;
}

findDuplicateSales();
