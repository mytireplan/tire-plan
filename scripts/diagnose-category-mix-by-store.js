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
  const [prodSnap, storeSnap] = await Promise.all([
    getDocs(collection(db, 'products')),
    getDocs(collection(db, 'stores')),
  ]);
  const stores = storeSnap.docs.map(d=>({id:d.id,...d.data()}));
  const products = prodSnap.docs.map(d=>({id:d.id,...d.data()}));

  const suspicious = products.filter(p => norm(p.category)==='타이어' && (norm(p.name).includes('중고') || norm(p.specification).includes('중고')));
  const storeTotals = new Map(stores.map(s=>[s.id,0]));
  const tireTotals = new Map(stores.map(s=>[s.id,0]));

  const sumMap = (m) => Object.values(m||{}).reduce((a,b)=>a+(Number(b)||0),0);

  for (const p of products.filter(x=>norm(x.category)==='타이어')) {
    for (const [sid,qty] of Object.entries(p.stockByStore||{})) {
      tireTotals.set(sid, (tireTotals.get(sid)||0) + (Number(qty)||0));
    }
  }
  for (const p of suspicious) {
    for (const [sid,qty] of Object.entries(p.stockByStore||{})) {
      storeTotals.set(sid, (storeTotals.get(sid)||0) + (Number(qty)||0));
    }
  }

  console.log('suspicious total stock:', suspicious.reduce((s,p)=>s+(Number(p.stock)||0),0));
  stores.forEach(s => {
    const tire = tireTotals.get(s.id)||0;
    const sus = storeTotals.get(s.id)||0;
    console.log(`${s.name} | tire=${tire} | suspicious=${sus} | tire-after-rollback=${tire-sus}`);
  });
};

main().catch(e=>{console.error(e);process.exit(1);});
