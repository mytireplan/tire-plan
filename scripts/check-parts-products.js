/*
Usage:
  - Install firebase-admin: npm install firebase-admin
  - Set env var: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json (Windows: set)
  - Run: node scripts/check-parts-products.js

This script lists products whose names look like part codes (e.g. SP1234) or whose category contains '부품'.
*/

const admin = require('firebase-admin');

function initAdmin() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    console.error('Provide service account via GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON');
    process.exit(1);
  }
}

initAdmin();
const db = admin.firestore();

(async () => {
  try {
    const snapshot = await db.collection('products').get();
    const PART_CODE_RE = /^(?:YEC|YUMI|XOIL|SP)\d[0-9A-Z]*/i;
    const PART_CATEGORY_KEYWORDS = ['부품', 'part', 'parts'];
    const results = [];
    snapshot.forEach(doc => {
      const p = doc.data();
      const name = (p.name || '').toString();
      const category = (p.category || '').toString();
      const isCode = PART_CODE_RE.test(name.replace(/[^A-Z0-9]/ig, ''));
      const isCat = PART_CATEGORY_KEYWORDS.some(k => category.toLowerCase().includes(k));
      if (isCode || isCat) {
        results.push({ id: doc.id, name, category, ownerId: p.ownerId || null });
      }
    });

    console.log(`Found ${results.length} matching products:`);
    results.forEach(r => console.log(JSON.stringify(r)));
  } catch (err) {
    console.error('Error reading products:', err);
    process.exit(1);
  }
})();
