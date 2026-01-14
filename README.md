# TirePlan - Multi-location Tire Shop Management System

React + TypeScript + Vite + Firebase 기반 타이어샵 POS 및 재고 관리 시스템

## 🚀 빠른 시작

### 개발 환경 실행
```bash
npm install
npm run dev  # http://localhost:5173
```

### 빌드 및 배포
```bash
# 1. 로컬 빌드 (필수!)
npm run build

# 2. GitHub Actions 자동 배포 (권장)
git add .
git commit -m "feat: 기능명"
git push origin main

# 3. 수동 배포 (긴급 시)
bash deploy-to-lightsail.sh 52.78.72.19 ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem
```

### 서버 접속
```bash
# SSH 키 위치: ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem
ssh -i ~/Downloads/LightsailDefaultKey-ap-northeast-2.pem ubuntu@52.78.72.19

# nginx 상태 확인
sudo systemctl status nginx

# nginx 재시작
sudo systemctl restart nginx
```

## 📦 프로젝트 구조

```
src/
├── components/      # 기능별 컴포넌트 (Dashboard, POS, Inventory 등)
├── utils/          # Firestore 서비스 레이어, 유틸리티
├── hooks/          # 커스텀 React 훅
├── types.ts        # TypeScript 인터페이스 정의
├── firebase.ts     # Firebase 초기화
└── App.tsx         # 메인 앱 (라우팅, 인증)

functions/          # Firebase Cloud Functions
.github/
├── workflows/
│   └── deploy-lightsail.yml  # 자동 배포 워크플로우
└── copilot-instructions.md   # AI 코딩 가이드 (필독!)
```

## 🔧 주요 기술 스택

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **Charts**: Recharts
- **Deployment**: GitHub Actions → AWS Lightsail (nginx)
- **Domain**: https://tireplan.kr

## ⚠️ 배포 시 주의사항

1. **로컬 빌드 먼저**: 서버에서 빌드하지 말 것!
2. **dist 폴더 확인**: 빌드 후 `dist/assets/` 파일명 해시 변경 확인
3. **GitHub Actions 우선 사용**: 수동 배포는 최후의 수단
4. **SSH 키 위치**: `~/Downloads/LightsailDefaultKey-ap-northeast-2.pem` (이미 GitHub Secrets 등록됨)
5. **브라우저 캐시 주의**: 배포 후 강력 새로고침 (Cmd+Shift+R)

## 📚 상세 가이드

- **배포 가이드**: `.github/copilot-instructions.md` - Deployment Workflow 섹션
- **Lightsail 설정**: `LIGHTSAIL_DEPLOYMENT_GUIDE.md`
- **빠른 배포**: `QUICK_DEPLOY.md`

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

Trigger deploy: 2025-12-13


# Test deployment
