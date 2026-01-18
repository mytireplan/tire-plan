# 빈 상품 삭제 가이드

## 문제 상황
POS 화면의 상품 리스트에서 이름과 사양이 비어있는 "블랭크" 상품들이 표시됩니다.
이는 Firestore에 `name`이나 `specification` 필드가 비어있거나 공백만 있는 상품 문서가 저장되어 있기 때문입니다.

## 원인
- 데이터베이스에서 상품을 삭제했지만, `name`과 `specification` 필드가 빈 문자열("")이거나 공백(" ")인 문서들이 남아있음
- 이전 필터 로직이 빈 문자열과 공백을 구분하지 못했음

## 해결 방법

### 방법 1: Firestore 콘솔에서 수동 삭제 (권장)

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: **tire-plan-c02d4**
3. Firestore Database 메뉴 선택
4. `products` 컬렉션 선택
5. 각 문서를 확인하며 다음 조건에 해당하는 문서 삭제:
   - `name` 필드가 비어있거나 공백만 있음
   - `specification` 필드가 비어있거나 공백만 있음
   - `price`가 0이거나 없음

### 방법 2: 브라우저 개발자 콘솔에서 실행

1. https://tireplan.kr 접속 후 로그인
2. 브라우저 개발자 도구 열기 (F12 또는 Cmd+Option+I)
3. Console 탭 선택
4. 아래 코드 복사 후 붙여넣기:

```javascript
// Firestore에서 빈 상품 찾아서 삭제
(async () => {
  const { collection, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  // firebase는 이미 앱에서 초기화됨
  const db = window.firebase?.firestore || firebase.firestore();
  
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);
  
  const toDelete = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const hasName = data.name && data.name.trim() !== '';
    const hasSpec = data.specification && data.specification.trim() !== '';
    
    if (!hasName || !hasSpec) {
      toDelete.push({
        id: docSnap.id,
        name: data.name || '(없음)',
        spec: data.specification || '(없음)'
      });
    }
  });
  
  console.log(`삭제할 빈 상품: ${toDelete.length}개`);
  toDelete.forEach(p => console.log(`- ${p.id}: "${p.name}" / "${p.spec}"`));
  
  if (toDelete.length > 0) {
    const confirmed = confirm(`${toDelete.length}개의 빈 상품을 삭제하시겠습니까?`);
    if (confirmed) {
      for (const item of toDelete) {
        await deleteDoc(doc(db, 'products', item.id));
        console.log(`✅ 삭제됨: ${item.id}`);
      }
      console.log('🎉 모든 빈 상품이 삭제되었습니다!');
      alert('빈 상품 삭제 완료! 페이지를 새로고침하세요.');
    }
  } else {
    console.log('✅ 삭제할 빈 상품이 없습니다.');
  }
})();
```

5. Enter 키 눌러 실행
6. 확인 대화상자에서 "확인" 클릭
7. 페이지 새로고침 (Cmd+R)

### 방법 3: 앱 코드 수정으로 자동 필터링 (이미 적용됨)

아래 코드 변경으로 빈 상품이 UI에 표시되지 않도록 필터링이 강화되었습니다:

**src/App.tsx - Products 구독 필터**
```typescript
const validProducts = data.filter(p => 
    p.name && p.name.trim() !== '' && 
    p.specification && p.specification.trim() !== ''
);
```

**src/App.tsx - visibleProducts 필터**
```typescript
if (!p.name || p.name.trim() === '' || 
    !p.specification || p.specification.trim() === '') return false;
```

## 배포 후 확인

1. 로컬 빌드:
```bash
npm run build
```

2. 변경사항 커밋 & 푸시 (GitHub Actions 자동 배포):
```bash
git add .
git commit -m "fix: 빈 상품 필터링 강화 (공백 문자열 처리)"
git push origin main
```

3. 배포 후 https://tireplan.kr 접속하여 POS 화면 확인
4. 강력 새로고침 (Cmd+Shift+R)으로 캐시 제거 후 확인

## 예방 조치

**향후 상품 추가 시 주의사항:**
- 상품 이름과 사양은 필수 입력
- 빈 문자열이나 공백만 있는 값 입력 금지
- 상품 추가 폼에 유효성 검증 추가 권장

## 문제가 계속되는 경우

1. **브라우저 캐시 완전 삭제**:
   - Chrome: 설정 > 개인정보 및 보안 > 인터넷 사용 기록 삭제
   - 전체 기간 / 캐시된 이미지 및 파일 체크 / 삭제

2. **Firestore 데이터 재확인**:
   - Firebase Console에서 `products` 컬렉션 전체 검토
   - 의심스러운 문서는 직접 삭제

3. **로그 확인**:
   - 브라우저 개발자 콘솔에서 에러 메시지 확인
   - "📥 Products updated from Firestore: X" 로그에서 상품 개수 확인
   - "✅ Valid products after filter: Y" 로그에서 필터링 후 개수 확인
