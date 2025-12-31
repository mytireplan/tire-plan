/**
 * Firestore 데이터 마이그레이션 스크립트
 * 
 * 용도: 기존 데이터에 ownerId 필드 추가
 * 
 * 실행 방법:
 * 1. Firebase 프로젝트 설정에서 서비스 계정 키 다운로드
 * 2. 환경변수 설정: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"
 * 3. 실행: node scripts/migrate-add-owner-id.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Admin 초기화
const serviceAccount = JSON.parse(
  readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json', 'utf8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 마이그레이션할 컬렉션 목록
const COLLECTIONS = [
  'products',
  'sales',
  'stockInHistory',
  'customers',
  'staff',
  'expenses',
  'fixedCosts',
  'leaveRequests',
  'reservations',
  'stockTransfers',
  'shifts',
  'stores'
];

// 기본 ownerId (데모 계정)
const DEFAULT_OWNER_ID = '250001';

/**
 * 특정 컬렉션의 모든 문서에 ownerId 추가
 */
async function migrateCollection(collectionName) {
  console.log(`\n🔄 Migrating collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`⚪ No documents found in ${collectionName}`);
      return { total: 0, migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // 이미 ownerId가 있으면 스킵
      if (data.ownerId) {
        skipped++;
        continue;
      }

      // ownerId 추가 전략:
      // 1. storeId가 있으면 해당 store의 ownerId 사용
      // 2. 없으면 DEFAULT_OWNER_ID 사용
      let ownerId = DEFAULT_OWNER_ID;

      if (data.storeId) {
        try {
          const storeDoc = await db.collection('stores').doc(data.storeId).get();
          if (storeDoc.exists && storeDoc.data().ownerId) {
            ownerId = storeDoc.data().ownerId;
          }
        } catch (error) {
          console.warn(`⚠️ Could not find store ${data.storeId}, using default ownerId`);
        }
      }

      batch.update(doc.ref, { ownerId });
      migrated++;
      batchCount++;

      // Firestore batch limit is 500 operations
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`  ✅ Committed batch of ${batchCount} documents`);
        batchCount = 0;
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  ✅ Committed final batch of ${batchCount} documents`);
    }

    console.log(`✅ ${collectionName}: ${migrated} migrated, ${skipped} skipped`);
    return { total: snapshot.size, migrated, skipped };

  } catch (error) {
    console.error(`❌ Error migrating ${collectionName}:`, error);
    return { total: 0, migrated: 0, skipped: 0, error };
  }
}

/**
 * 모든 컬렉션 마이그레이션 실행
 */
async function migrateAll() {
  console.log('🚀 Starting Firestore migration: Add ownerId to all documents\n');
  console.log(`Default Owner ID: ${DEFAULT_OWNER_ID}\n`);

  const results = {};

  for (const collectionName of COLLECTIONS) {
    results[collectionName] = await migrateCollection(collectionName);
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [collection, result] of Object.entries(results)) {
    console.log(`\n${collection}:`);
    console.log(`  Total: ${result.total}`);
    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Skipped: ${result.skipped}`);
    if (result.error) {
      console.log(`  Error: ${result.error.message}`);
      totalErrors++;
    }

    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Total documents migrated: ${totalMigrated}`);
  console.log(`⚪ Total documents skipped: ${totalSkipped}`);
  if (totalErrors > 0) {
    console.log(`❌ Total collections with errors: ${totalErrors}`);
  }
  console.log('='.repeat(60));
}

/**
 * 특정 ownerId로 데이터 재할당
 */
async function reassignOwner(collectionName, oldOwnerId, newOwnerId) {
  console.log(`\n🔄 Reassigning ${collectionName} from ${oldOwnerId} to ${newOwnerId}`);

  try {
    const snapshot = await db.collection(collectionName)
      .where('ownerId', '==', oldOwnerId)
      .get();

    if (snapshot.empty) {
      console.log(`⚪ No documents found with ownerId: ${oldOwnerId}`);
      return 0;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { ownerId: newOwnerId });
      count++;
    });

    await batch.commit();
    console.log(`✅ Reassigned ${count} documents`);
    return count;

  } catch (error) {
    console.error(`❌ Error reassigning owner:`, error);
    return 0;
  }
}

// CLI 실행
const args = process.argv.slice(2);

if (args[0] === 'reassign' && args.length === 4) {
  // 재할당 모드: node migrate-add-owner-id.js reassign <collection> <oldOwnerId> <newOwnerId>
  const [_, collection, oldId, newId] = args;
  reassignOwner(collection, oldId, newId)
    .then(count => {
      console.log(`\n✅ Migration complete: ${count} documents reassigned`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
} else {
  // 기본 모드: 전체 마이그레이션
  migrateAll()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}
