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

const norm = (v='') => String(v).toLowerCase();

const main = async () => {
  const snap = await getDocs(collection(db, 'products'));
  const products = snap.docs.map(d=>({id:d.id,...d.data()}));

  const suspicious = products.filter(p => {
    const name = norm(p.name);
    const spec = norm(p.specification);
    const cat = norm(p.category);
    const isUsedKeyword = name.includes('중고') || spec.includes('중고');
    return isUsedKeyword && cat === '타이어';
  });

  const reverseSuspicious = products.filter(p => {
    const name = norm(p.name);
    const spec = norm(p.specification);
    const cat = norm(p.category);
    const isNewKeyword = name.includes('신품') || name.includes('new') || name.includes('新品');
    return isNewKeyword && cat === '중고타이어';
  });

  const sum = arr => arr.reduce((s,p)=>s+(Number(p.stock)||0),0);

  console.log('중고 키워드인데 카테고리=타이어 건수:', suspicious.length, '재고합:', sum(suspicious));
  suspicious.slice(0,50).forEach(p=>console.log(`${p.id} | ${p.name} | ${p.specification||''} | stock=${p.stock} | owner=${p.ownerId}`));

  console.log('\n신품 키워드인데 카테고리=중고타이어 건수:', reverseSuspicious.length, '재고합:', sum(reverseSuspicious));
  reverseSuspicious.slice(0,50).forEach(p=>console.log(`${p.id} | ${p.name} | ${p.specification||''} | stock=${p.stock} | owner=${p.ownerId}`));
};

main().catch(e=>{console.error(e);process.exit(1);});
