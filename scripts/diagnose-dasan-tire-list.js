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
  const products = (await getDocs(collection(db, 'products'))).docs.map(d=>({id:d.id,...d.data()}));
  const da = 'ST-1766011970377'; // 다산점

  const tireDa = products
    .filter(p => norm(p.category) === '타이어' && (Number(p.stockByStore?.[da]||0) > 0))
    .map(p => ({id:p.id, name:p.name, spec:p.specification||'', qty:Number(p.stockByStore?.[da]||0), category:p.category}))
    .sort((a,b)=>b.qty-a.qty);

  const suspicious = tireDa.filter(p => norm(p.name).includes('중고') || norm(p.spec).includes('중고'));

  console.log('다산점 타이어 재고합:', tireDa.reduce((s,p)=>s+p.qty,0));
  console.log('다산점 중고키워드-타이어 재고합:', suspicious.reduce((s,p)=>s+p.qty,0));
  console.log('중고키워드 제외 후:', tireDa.reduce((s,p)=>s+p.qty,0)-suspicious.reduce((s,p)=>s+p.qty,0));

  console.log('\n[다산점 타이어 상위 40]');
  tireDa.slice(0,40).forEach(p=>{
    const mark = (norm(p.name).includes('중고') || norm(p.spec).includes('중고')) ? ' <-- suspicious' : '';
    console.log(`${p.qty} | ${p.name} | ${p.spec} | ${p.id}${mark}`);
  });
};

main().catch(e=>{console.error(e);process.exit(1);});
