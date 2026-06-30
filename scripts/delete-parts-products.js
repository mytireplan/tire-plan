import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import readline from 'readline';

// WARNING: This script will permanently delete products from your Firestore 'products' collection.
// Run only if you intend to remove all parts-category items so you can re-enter them.

const firebaseConfig = {
  apiKey: 'AIzaSyDT_No1C983ICcO_uc5eRG8I790Soc1B1M',
  authDomain: 'tire-plan.firebaseapp.com',
  projectId: 'tire-plan',
  storageBucket: 'tire-plan.firebasestorage.app',
  messagingSenderId: '280128982798',
  appId: '1:280128982798:web:6fcf69018e30c4b4ae115f',
  measurementId: 'G-ZZ6FK6TRVW'
};

const PART_NAMES = ['브레이크패드', '오일필터', '엔진오일', '에어크리너'];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'products'));
  const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));

  // Candidate if category exactly matches '부품' OR one of PART_NAMES
  const candidates = docs.filter(d => {
    const cat = (d.data.category || '').toString();
    return cat === '부품' || PART_NAMES.includes(cat);
  });

  console.log(`Found ${candidates.length} product(s) matching parts categories.`);
  if (candidates.length === 0) return console.log('No matching products to delete.');

  // Confirm in interactive mode (simple prompt), or accept --yes to skip
  const autoYes = process.argv.includes('--yes') || process.env.FORCE_DELETE === '1';
  if (!autoYes) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => rl.question('Proceed to delete these products? (yes/no) ', resolve));
    rl.close();
    if (String(answer).toLowerCase() !== 'yes') {
      console.log('Aborting. No changes made.');
      process.exit(0);
    }
  } else {
    console.log('Auto-confirm enabled (--yes). Proceeding with deletion.');
  }

  for (const d of candidates) {
    await deleteDoc(doc(db, 'products', d.id));
    console.log(`Deleted ${d.id} (${d.data.name || 'unnamed'})`);
  }
  console.log('Done. All matching part products deleted.');
}

run().catch(err => {
  console.error('Error during deletion:', err);
  process.exit(1);
});
