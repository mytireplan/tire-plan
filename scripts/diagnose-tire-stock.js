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

const n = (v='') => String(v).toLowerCase().trim();

const main = async () => {
  const [prodSnap, storeSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'stores')),
  ]);

  const stores = storeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const products = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const tireProducts = products.filter(p => n(p.category) === '타이어');
  const usedProducts = products.filter(p => n(p.category) === '중고타이어');

  const sumStock = (arr) => arr.reduce((s,p)=>s+(Number(p.stock)||0),0);

  const ownerMap = new Map();
  for (const p of tireProducts) {
    const owner = p.ownerId || '(missing-ownerId)';
    ownerMap.set(owner, (ownerMap.get(owner) || 0) + (Number(p.stock)||0));
  }

  const storeSums = new Map(stores.map(s => [s.id, 0]));
  for (const p of tireProducts) {
    const sb = p.stockByStore || {};
    for (const [sid, qty] of Object.entries(sb)) {
      storeSums.set(sid, (storeSums.get(sid)||0) + (Number(qty)||0));
    }
  }

  const missingOwner = tireProducts.filter(p => !p.ownerId);

  console.log('타이어 총:', sumStock(tireProducts));
  console.log('중고타이어 총:', sumStock(usedProducts));
  console.log('타이어+중고타이어:', sumStock(tireProducts)+sumStock(usedProducts));
  console.log('타이어 문서 수:', tireProducts.length);
  console.log('ownerId 없는 타이어 문서 수:', missingOwner.length, '재고합:', sumStock(missingOwner));

  console.log('\n[타이어 ownerId별 재고]');
  Array.from(ownerMap.entries()).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(k, v));

  console.log('\n[타이어 store별 재고]');
  stores.forEach(s => {
    console.log(`${s.id} (${s.name || ''}) owner=${s.ownerId || ''}: ${storeSums.get(s.id)||0}`);
  });
};

main().catch(e=>{ console.error(e); process.exit(1); });
