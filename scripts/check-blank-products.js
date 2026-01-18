/**
 * Firestore에서 빈 이름 또는 사양을 가진 제품 확인
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDmE_IuYBCIVpQWZPyoXWKlJfmqWhPGfHk",
  authDomain: "tire-plan-c02d4.firebaseapp.com",
  projectId: "tire-plan-c02d4",
  storageBucket: "tire-plan-c02d4.firebasestorage.app",
  messagingSenderId: "444785877556",
  appId: "1:444785877556:web:fefa53d5e2de7a3d8a8af1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkBlankProducts() {
  console.log('🔍 빈 상품 검색 중...\n');

  try {
    const productsRef = collection(db, 'products');
    const snapshot = await getDocs(productsRef);
    
    console.log(`전체 상품 수: ${snapshot.size}\n`);
    
    const blankProducts = [];
    const validProducts = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const hasName = data.name && data.name.trim() !== '';
      const hasSpec = data.specification && data.specification.trim() !== '';
      
      if (!hasName || !hasSpec) {
        blankProducts.push({
          id: doc.id,
          name: data.name || '(없음)',
          specification: data.specification || '(없음)',
          ownerId: data.ownerId || '(없음)',
          category: data.category || '(없음)',
          price: data.price || 0,
          brand: data.brand || '(없음)'
        });
      } else {
        validProducts.push(doc.id);
      }
    });
    
    console.log(`정상 상품: ${validProducts.length}개`);
    console.log(`문제 상품: ${blankProducts.length}개\n`);
    
    if (blankProducts.length > 0) {
      console.log('❌ 문제가 있는 상품 목록:\n');
      blankProducts.forEach((p, idx) => {
        console.log(`${idx + 1}. Document ID: ${p.id}`);
        console.log(`   이름: "${p.name}"`);
        console.log(`   사양: "${p.specification}"`);
        console.log(`   소유자 ID: ${p.ownerId}`);
        console.log(`   카테고리: ${p.category}`);
        console.log(`   브랜드: ${p.brand}`);
        console.log(`   가격: ₩${p.price.toLocaleString()}`);
        console.log('');
      });
      
      console.log('\n💡 해결 방법:');
      console.log('   이 문서들을 Firestore 콘솔에서 수동으로 삭제하거나');
      console.log('   아래 스크립트를 실행하세요:');
      console.log('   node scripts/delete-blank-products.js');
    } else {
      console.log('✅ 모든 상품이 정상입니다!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkBlankProducts();
