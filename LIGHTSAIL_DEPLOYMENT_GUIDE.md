# AWS Lightsail 배포 가이드 - 기존 버전 제거 및 새 버전 업데이트

## 🚀 Lightsail SSH 접속 및 기존 버전 제거

### Step 1: Lightsail 인스턴스 접속

```bash
# AWS 콘솔에서 Lightsail 인스턴스 정보 확인
# 1. AWS Lightsail 콘솔 열기: https://lightsail.aws.amazon.com
# 2. 인스턴스 클릭 → "SSH 연결" 버튼 (브라우저 SSH 사용)
# 또는 터미널에서:

ssh -i /path/to/your/key.pem ec2-user@your-instance-ip
# 또는
ssh ubuntu@your-instance-ip  # 인스턴스 OS에 따라 다름
```

### Step 2: 기존 프로젝트 백업 및 제거

```bash
# 인스턴스 접속 후 실행

# 1. 홈 디렉토리 이동
cd ~

# 2. 기존 프로젝트 백업 (선택)
sudo cp -r tire-plan tire-plan.backup.$(date +%Y%m%d)

# 3. 기존 프로세스 중지
# Node.js 앱이 실행 중이면 중지
pm2 stop tire-plan      # PM2로 관리 중이면
pm2 delete tire-plan
# 또는
pkill -f "npm run dev"  # 직접 실행 중이면

# 4. 기존 프로젝트 제거
sudo rm -rf tire-plan

# 5. npm/node 캐시 정리 (선택)
npm cache clean --force
```

### Step 3: Node.js 및 필수 도구 설치 확인

```bash
# 설치된 버전 확인
node --version   # v16 이상 필요
npm --version
git --version

# 설치 안 되어 있으면:
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nodejs npm git

# Amazon Linux 2
sudo yum install -y nodejs npm git
```

---

## 📥 새 버전 배포

### Step 4: GitHub에서 새 코드 클론

```bash
# 인스턴스에서
cd ~

# GitHub 저장소 클론
git clone https://github.com/mytireplan/tire-plan.git
cd tire-plan

# 또는 기존 저장소가 있으면 최신 버전 가져오기
cd tire-plan
git pull origin main
```

### Step 5: 의존성 설치 및 빌드

```bash
# 의존성 설치
npm ci  # 또는 npm install

# 린트/타입체크 확인 (선택)
npm run lint  # 에러 확인

# 프로덕션 빌드
npm run build

# 빌드 완료 확인
ls -la dist/  # dist 폴더 생성 확인
```

### Step 6: 서버 실행 방법 선택

#### **옵션 A: PM2로 관리 (권장 - 자동 재시작)**

```bash
# PM2 설치 (처음 한 번만)
sudo npm install -g pm2

# 프로덕션으로 실행
pm2 start "npm run dev" --name "tire-plan"

# 또는 빌드 결과 미리보기
pm2 start "npm run preview" --name "tire-plan"

# 자동 시작 설정
pm2 startup
pm2 save

# 상태 확인
pm2 list
pm2 logs tire-plan
```

#### **옵션 B: 백그라운드 실행 (간단)**

```bash
# nohup으로 백그라운드 실행
nohup npm run dev > app.log 2>&1 &

# 또는 screen/tmux 사용
screen -S tire-plan
npm run dev
# Ctrl+A then D로 분리

# 다시 접속
screen -r tire-plan
```

#### **옵션 C: systemd 서비스 (권장 - 최고 안정성)**

`/etc/systemd/system/tire-plan.service` 파일 생성:

```bash
sudo tee /etc/systemd/system/tire-plan.service > /dev/null << 'EOF'
[Unit]
Description=Tire Plan Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/tire-plan
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 서비스 활성화 및 시작
sudo systemctl daemon-reload
sudo systemctl enable tire-plan
sudo systemctl start tire-plan

# 상태 확인
sudo systemctl status tire-plan
sudo journalctl -u tire-plan -f  # 로그 실시간 확인
```

---

## 🌐 Nginx 리버스 프록시 설정 (선택)

포트 80/443으로 접근 가능하게 설정:

```bash
# Nginx 설치
sudo apt-get install -y nginx

# Nginx 설정
sudo tee /etc/nginx/sites-available/tire-plan > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 또는 인스턴스 IP

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

# 설정 활성화
sudo ln -s /etc/nginx/sites-available/tire-plan /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Nginx 테스트 및 시작
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔍 배포 확인

```bash
# 1. 인스턴스에서 로컬 확인
curl http://localhost:5173

# 2. 브라우저에서 확인
# http://your-instance-ip:5173
# 또는 도메인 설정했으면
# http://your-domain.com

# 3. 로그 확인
tail -f ~/tire-plan/app.log          # nohup인 경우
pm2 logs tire-plan                   # PM2인 경우
sudo journalctl -u tire-plan -f      # systemd인 경우
```

---

## 🔐 SSL/HTTPS 설정 (선택 - 권장)

```bash
# Let's Encrypt 인증서 설정 (Nginx 사용 시)
sudo apt-get install -y certbot python3-certbot-nginx

sudo certbot --nginx -d your-domain.com

# 인증서 자동 갱신
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 📝 배포 체크리스트

- [ ] Lightsail 인스턴스 SSH 접속 성공
- [ ] 기존 프로세스 중지 및 폴더 삭제
- [ ] GitHub에서 새 코드 클론
- [ ] npm install 완료
- [ ] npm run build 성공 (에러 없음)
- [ ] 서버 실행 선택 (PM2/systemd/nohup)
- [ ] 포트 확인 (기본 5173)
- [ ] 브라우저에서 접속 확인
- [ ] 로그 확인 (에러 없음)
- [ ] Nginx/SSL 설정 (필요시)

---

## 🆘 문제 해결

### "Permission denied"
```bash
sudo chmod +x /path/to/file
```

### "Port already in use"
```bash
# 포트 5173 사용 중인 프로세스 찾기
lsof -i :5173
# 프로세스 강제 종료
kill -9 <PID>
```

### "npm: command not found"
```bash
node --version  # Node.js 설치 확인
npm install     # 의존성 재설치
```

### "Git: permission denied"
```bash
# SSH 키 설정 (GitHub 계정 필요)
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub  # 출력 결과를 GitHub에 등록
```

---

## 🔄 향후 업데이트 자동화

GitHub에서 Pull로 자동 업데이트하는 스크립트:

`/home/ubuntu/tire-plan/deploy.sh` 생성:

```bash
#!/bin/bash
cd /home/ubuntu/tire-plan
git pull origin main
npm ci
npm run build
pm2 restart tire-plan
echo "배포 완료: $(date)" >> deploy.log
```

Cron으로 정기적 업데이트 (선택):
```bash
# 매일 자정에 배포
0 0 * * * /home/ubuntu/tire-plan/deploy.sh
```

---

**다음 명령어로 시작하세요:**
```bash
# 1. Lightsail 접속 (SSH)
ssh -i /path/to/key.pem ubuntu@your-instance-ip

# 2. 기존 버전 제거
sudo rm -rf ~/tire-plan

# 3. 새 버전 배포
git clone https://github.com/mytireplan/tire-plan.git
cd tire-plan
npm ci
npm run build
pm2 start "npm run dev" --name "tire-plan"
```
