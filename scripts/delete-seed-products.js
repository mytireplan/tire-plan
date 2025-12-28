import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

// Delete demo products by explicit ID pattern (numeric IDs or the sentinel 99999)
const firebaseConfig = {
  apiKey: 'AIzaSyDT_No1C983ICcO_uc5eRG8I790Soc1B1M',
  authDomain: 'tire-plan.firebaseapp.com',
  projectId: 'tire-plan',
  storageBucket: 'tire-plan.firebasestorage.app',
  messagingSenderId: '280128982798',
  appId: '1:280128982798:web:6fcf69018e30c4b4ae115f',
  measurementId: 'G-ZZ6FK6TRVW'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'products'));
  const candidates = snap.docs.filter(d => {
    const id = d.id;
    if (id === '99999') return true;
    return /^\d+$/.test(id); // numeric seed IDs
  });

  console.log(`Found ${candidates.length} candidate seed products (numeric IDs or 99999).`);
  for (const docSnap of candidates) {
    await deleteDoc(doc(db, 'products', docSnap.id));
    console.log(`Deleted ${docSnap.id}`);
  }
  console.log('Done.');
}

run().catch(err => {
  console.error('Error during deletion:', err);
  process.exit(1);
});
