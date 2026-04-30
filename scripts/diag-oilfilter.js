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

const main = async () => {
  const snap = await getDocs(collection(db, 'products'));
  const products = snap.docs.map(d=>({id:d.id,...d.data()}));

  const oilFilters = products.filter(p =>
    (p.category === '오일필터' || (p.name||'').includes('오일필터') || (p.specification||'').includes('오일필터'))
  );

  console.log(`\n총 오일필터 제품: ${oilFilters.length}개\n`);
  
  // name === specification 인 것 (오류 의심)
  const suspicious = oilFilters.filter(p => p.name && p.specification && p.name.trim() === p.specification.trim());
  console.log(`name === specification 인 항목: ${suspicious.length}개`);
  suspicious.forEach(p => console.log(`  [의심] id=${p.id} | name="${p.name}" | spec="${p.specification}" | category=${p.category} | ownerId=${p.ownerId}`));

  // name이 FOR/YEC/등 파트넘버 패턴인 것
  const partNumPattern = /^(FOR|YEC|MAN|HYD|TOY|CAS|KIA|HM|MOB|SHE|BOS|MAH|MHB)[^a-z]/i;
  const nameLooksLikePartNum = oilFilters.filter(p => partNumPattern.test((p.name||'').trim()));
  console.log(`\nname이 파트번호 패턴인 항목: ${nameLooksLikePartNum.length}개`);
  nameLooksLikePartNum.forEach(p => console.log(`  [파트넘버명] id=${p.id} | name="${p.name}" | spec="${p.specification}" | ownerId=${p.ownerId}`));

  // 정상으로 보이는 것
  const normal = oilFilters.filter(p => !(p.name && p.specification && p.name.trim() === p.specification.trim()) && !partNumPattern.test((p.name||'').trim()));
  console.log(`\n정상 항목 (이름이 descriptive): ${normal.length}개`);
  normal.forEach(p => console.log(`  [정상] id=${p.id} | name="${p.name}" | spec="${p.specification}" | ownerId=${p.ownerId}`));
};

main().catch(e=>{console.error(e);process.exit(1);});
