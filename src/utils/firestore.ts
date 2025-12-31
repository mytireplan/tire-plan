import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryConstraint,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db, auth } from '../firebase';

// Firestore 컬렉션 경로
const COLLECTIONS = {
  STORES: 'stores',
  OWNERS: 'owners',
  PRODUCTS: 'products',
  SALES: 'sales',
  STOCK_IN: 'stockInHistory',
  CUSTOMERS: 'customers',
  STAFF: 'staff',
  EXPENSES: 'expenses',
  FIXED_COSTS: 'fixedCosts',
  LEAVE_REQUESTS: 'leaveRequests',
  RESERVATIONS: 'reservations',
  TRANSFERS: 'stockTransfers',
  SETTINGS: 'settings',
  SHIFTS: 'shifts'
};

// 현재 로그인한 사용자의 UID 가져오기
const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid || null;
};

// 데이터 저장 (ownerId 자동 추가)
export const saveToFirestore = async <T extends { id: string }>(
  collectionName: string, 
  data: T,
  skipOwnerId = false // owners 컬렉션 같은 경우 ownerId 추가 생략
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, data.id);
    
    // ownerId 자동 추가 (owners 컬렉션 제외)
    let dataToSave = { ...data };
    if (!skipOwnerId && collectionName !== COLLECTIONS.OWNERS) {
      const userId = getCurrentUserId();
      if (userId) {
        dataToSave = { ...dataToSave, ownerId: userId } as T;
      }
    }
    
    await setDoc(docRef, dataToSave, { merge: true });
  } catch (error) {
    console.error(`Error saving to ${collectionName}:`, error);
    throw error;
  }
};

// 데이터 일괄 저장 (ownerId 자동 추가)
export const saveBulkToFirestore = async <T extends { id: string }>(
  collectionName: string,
  dataArray: T[],
  skipOwnerId = false
): Promise<void> => {
  try {
    const promises = dataArray.map(item => saveToFirestore(collectionName, item, skipOwnerId));
    await Promise.all(promises);
  } catch (error) {
    console.error(`Error bulk saving to ${collectionName}:`, error);
    throw error;
  }
};

// 단일 문서 가져오기
export const getFromFirestore = async <T>(
  collectionName: string,
  id: string
): Promise<T | null> => {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting from ${collectionName}:`, error);
    throw error;
  }
};

// 컬렉션 전체 가져오기 (ownerId 필터 자동 적용)
export const getAllFromFirestore = async <T>(
  collectionName: string,
  applyOwnerFilter = true // owners 컬렉션 같은 경우 필터 생략
): Promise<T[]> => {
  try {
    const userId = getCurrentUserId();
    
    let q;
    if (applyOwnerFilter && userId && collectionName !== COLLECTIONS.OWNERS) {
      // ownerId 필터 적용
      q = query(collection(db, collectionName), where('ownerId', '==', userId));
    } else {
      // 필터 없이 전체 조회 (SUPER_ADMIN 또는 owners 컬렉션)
      q = collection(db, collectionName);
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as T);
  } catch (error) {
    console.error(`Error getting all from ${collectionName}:`, error);
    throw error;
  }
};

// 컬렉션 페이지네이션 조회 (orderBy + limit + cursor + ownerId 필터)
export const getCollectionPage = async <T>(
  collectionName: string,
  options: {
    pageSize?: number;
    orderByField?: string;
    cursorValue?: unknown;
    direction?: 'asc' | 'desc';
    applyOwnerFilter?: boolean; // 기본값 true
  } = {}
): Promise<{ data: T[]; nextCursor?: unknown; hasMore: boolean }> => {
  const { 
    pageSize = 50, 
    orderByField = 'id', 
    cursorValue, 
    direction = 'asc',
    applyOwnerFilter = true 
  } = options;

  try {
    const userId = getCurrentUserId();
    const constraints: QueryConstraint[] = [];
    
    // ownerId 필터 추가 (조건부)
    if (applyOwnerFilter && userId && collectionName !== COLLECTIONS.OWNERS) {
      constraints.push(where('ownerId', '==', userId));
    }
    
    // 정렬 및 페이지 제한
    constraints.push(orderBy(orderByField, direction));
    constraints.push(limit(pageSize));
    
    // 커서 기반 페이지네이션
    if (cursorValue) {
      constraints.push(startAfter(cursorValue));
    }

    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    const docs = snapshot.docs.map((d) => d.data() as T);
    const hasMore = snapshot.size === pageSize;
    const nextCursor = hasMore ? snapshot.docs[snapshot.docs.length - 1]?.get(orderByField) : undefined;

    return { data: docs, nextCursor, hasMore };
  } catch (error) {
    console.error(`Error getting paged data from ${collectionName}:`, error);
    throw error;
  }
};

// 제한된 범위의 실시간 구독 (where/orderBy/limit 필수 구성 추천)
export const subscribeToQuery = <T>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (data: T[]) => void
) => {
  const q = query(collection(db, collectionName), ...constraints);
  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map((d) => d.data() as T);
      callback(data);
    },
    (error) => {
      console.error(`Error subscribing to query on ${collectionName}:`, error);
    }
  );
  return unsubscribe;
};

// 문서 삭제
export const deleteFromFirestore = async (
  collectionName: string,
  id: string
): Promise<void> => {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    throw error;
  }
};

// 실시간 리스너 등록
export const subscribeToCollection = <T>(
  collectionName: string,
  callback: (data: T[]) => void
) => {
  const unsubscribe = onSnapshot(
    collection(db, collectionName),
    (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map(doc => doc.data() as T);
      callback(data);
    },
    (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
    }
  );
  
  return unsubscribe;
};

// localStorage → Firestore 마이그레이션
export const migrateLocalStorageToFirestore = async (): Promise<void> => {
  try {
    console.log('🔄 Starting migration from localStorage to Firestore...');
    
    const migrations = [
      { key: 'tire-plan-stores', collection: COLLECTIONS.STORES },
      { key: 'tire-plan-products', collection: COLLECTIONS.PRODUCTS },
      { key: 'tire-plan-sales', collection: COLLECTIONS.SALES },
      { key: 'tire-plan-stockInHistory', collection: COLLECTIONS.STOCK_IN },
      { key: 'tire-plan-customers', collection: COLLECTIONS.CUSTOMERS },
      { key: 'tire-plan-staff', collection: COLLECTIONS.STAFF },
      { key: 'tire-plan-expenses', collection: COLLECTIONS.EXPENSES },
      { key: 'tire-plan-fixedCosts', collection: COLLECTIONS.FIXED_COSTS },
      { key: 'tire-plan-leaveRequests', collection: COLLECTIONS.LEAVE_REQUESTS },
      { key: 'tire-plan-reservations', collection: COLLECTIONS.RESERVATIONS },
      { key: 'tire-plan-stockTransfers', collection: COLLECTIONS.TRANSFERS },
    ];

    for (const { key, collection } of migrations) {
      const localData = localStorage.getItem(key);
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          if (Array.isArray(parsedData) && parsedData.length > 0) {
            await saveBulkToFirestore(collection, parsedData);
            console.log(`✅ Migrated ${parsedData.length} items from ${key}`);
          }
        } catch (parseError) {
          console.error(`Error parsing ${key}:`, parseError);
        }
      }
    }
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

export { COLLECTIONS };
