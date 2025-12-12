# 🚀 Lightsail 빠른 배포 가이드

## ⚡ 5분 안에 배포하기

### 1️⃣ SSH 키 준비
```bash
# Lightsail 콘솔에서 다운로드한 키 파일을 ~/.ssh에 저장
mv ~/Downloads/your-key.pem ~/.ssh/
chmod 600 ~/.ssh/your-key.pem
```

### 2️⃣ 배포 스크립트 실행
```bash
# 프로젝트 디렉토리에서
cd /Users/misolee/Desktop/mytire/tire-plan

# 배포 실행
bash deploy-to-lightsail.sh <LIGHTSAIL_IP> ~/.ssh/your-key.pem

# 예시
bash deploy-to-lightsail.sh 3.35.123.456 ~/.ssh/lightsail_key.pem
```

**스크립트가 자동으로:**
- ✅ 로컬 빌드 확인
- ✅ 기존 프로세스 중지
- ✅ 코드 배포
- ✅ 의존성 설치
- ✅ PM2로 앱 시작
- ✅ 배포 확인

### 3️⃣ 브라우저에서 확인
```
http://<LIGHTSAIL_IP>:5173
```

---

## 🔍 로그 확인

```bash
# Lightsail에 SSH 접속
ssh -i ~/.ssh/your-key.pem ubuntu@<LIGHTSAIL_IP>

# 실시간 로그 확인
pm2 logs tire-plan

# 앱 상태 확인
pm2 list

# 앱 재시작
pm2 restart tire-plan

# 앱 중지
pm2 stop tire-plan
```

---

## 📝 수동 배포 (스크립트 없이)

```bash
# 1. Lightsail 접속
ssh -i ~/.ssh/your-key.pem ubuntu@<LIGHTSAIL_IP>

# 2. 기존 버전 제거
pm2 stop tire-plan
pm2 delete tire-plan
sudo rm -rf ~/tire-plan

# 3. 새 버전 배포
cd ~
git clone https://github.com/mytireplan/tire-plan.git
cd tire-plan
npm ci --production
npm run build

# 4. 앱 시작
pm2 start "npm run preview" --name "tire-plan"
pm2 save
```

---

## 💡 유용한 명령어

```bash
# Lightsail 접속 후

# 앱 상태
pm2 status

# 앱 재시작
pm2 restart tire-plan

# 앱 중지
pm2 stop tire-plan

# 앱 재개
pm2 start tire-plan

# 로그 보기
pm2 logs tire-plan

# 실시간 모니터링
pm2 monit

# 앱 삭제
pm2 delete tire-plan

# 시스템 재부팅 후 자동 시작
pm2 startup
pm2 save
```

---

## ⚠️ 문제 해결

### 배포 후 페이지가 안 뜨면?

```bash
# 1. Lightsail 접속
ssh -i ~/.ssh/your-key.pem ubuntu@<LIGHTSAIL_IP>

# 2. 앱 상태 확인
pm2 status

# 3. 로그 확인 (에러 메시지)
pm2 logs tire-plan --err

# 4. 포트 확인
sudo netstat -tlnp | grep 5173

# 5. Firewall 확인 (Lightsail 콘솔에서 포트 5173 열기)
```

### "Permission denied" 에러
```bash
# SSH 키 권한 확인
chmod 600 ~/.ssh/your-key.pem

# Lightsail 콘솔에서 해당 키와 인스턴스 매칭 확인
```

### "npm: command not found"
```bash
# Node.js 설치 확인
node --version
npm --version

# 설치 안 되어 있으면
sudo apt-get install -y nodejs npm
```

---

## 🔐 도메인 + HTTPS 설정 (선택)

```bash
# Lightsail 접속 후

# 1. Nginx 설정
sudo tee /etc/nginx/sites-available/tire-plan > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 2. Nginx 활성화
sudo ln -s /etc/nginx/sites-available/tire-plan /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# 3. SSL 인증서 (Let's Encrypt)
sudo certbot --nginx -d your-domain.com
```

---

**🎯 다음 명령어 실행하세요:**
```bash
bash deploy-to-lightsail.sh <LIGHTSAIL_IP> ~/.ssh/your-key.pem
```

Lightsail IP와 SSH 키 경로만 입력하면 완료! 🚀
