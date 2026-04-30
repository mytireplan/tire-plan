import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

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

  const targets = products.filter(p =>
    p.ownerId === '250002' &&
    norm(p.category) === '타이어' &&
    (norm(p.name).includes('중고') || norm(p.specification||'').includes('중고'))
  );

  console.log('수정 대상 문서 수:', targets.length);
  targets.forEach(p => console.log(`${p.id} | ${p.name} | ${p.specification||''} | stock=${p.stock}`));

  if (targets.length === 0) { console.log('수정할 대상 없음'); process.exit(0); }

  // writeBatch는 최대 500개씩
  let count = 0;
  for (let i = 0; i < targets.length; i += 499) {
    const batch = writeBatch(db);
    const chunk = targets.slice(i, i + 499);
    chunk.forEach(p => {
      const ref = doc(db, 'products', p.id);
      batch.update(ref, { category: '중고타이어' });
    });
    await batch.commit();
    count += chunk.length;
    console.log(`✅ batch committed: ${count}/${targets.length}`);
  }

  console.log('\n✅ 완료: category 타이어 → 중고타이어 수정됨');
};

main().catch(e=>{console.error(e);process.exit(1);});
