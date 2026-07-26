# 阿里云 ECS 自动部署（GitHub Actions）

ECS **不必**访问 `github.com`。流程：`git push` → GitHub Actions 拉取代码 → `rsync` + SSH 到你的服务器。

## 一次性准备（服务器）

### 1. 目录与部署用户密钥

在 ECS 上（root）：

```bash
mkdir -p /opt/outreachhub
# 若用 root 部署，确保目录可写
```

在 **本机或服务器** 生成专用部署密钥（不要用登录密码）：

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_ecs -N ""
```

得到：

- `deploy_ecs` — **私钥** → 放到 GitHub Secrets  
- `deploy_ecs.pub` — **公钥** → 写入服务器

服务器：

```bash
mkdir -p /root/.ssh
chmod 700 /root/.ssh
cat deploy_ecs.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

### 2. 安全组

入方向放行 **22**（建议仅你的 IP；GitHub Actions IP 会变，若 Actions 连不上 SSH，需对 `0.0.0.0/0` 开放 22，并 **只允许密钥登录、禁止密码登录**）。

```bash
# 建议加固
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd
```

### 3. 首次仍需手动：Docker 基础 + `.env` + systemd

Actions **不会**上传 `.env`（已排除）。在服务器：

```bash
cd /opt/outreachhub
# 等第一次 rsync 成功后，或先 SCP 一份代码过来
cp .env.example .env
nano .env   # 填生产密钥，见下文
```

`.env` 关键点示例：

```env
DATABASE_URL="postgresql://postgres:强密码@localhost:5433/outreach_hub?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://121.199.31.190:3030"
APP_URL="http://121.199.31.190:3030"
CRON_SECRET="..."
ENCRYPTION_KEY="64位hex"
SMTP_HOST=...
SMTP_USER=...
SMTP_PASSWORD=...
EMAIL_WORKER_CONCURRENCY=3
```

改 `docker-compose.yml` 里 Postgres 密码与 `DATABASE_URL` 一致，然后：

```bash
docker compose up -d postgres redis
docker compose --profile full up -d --build worker

# 安装 Node 依赖并建库（首次）
npm ci && npm run db:push && npm run build

# systemd
cat >/etc/systemd/system/outreachhub.service <<'EOF'
[Unit]
Description=OutreachHub Next.js
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=/opt/outreachhub
EnvironmentFile=/opt/outreachhub/.env
ExecStart=/usr/bin/npm run start -- -p 3030
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now outreachhub

# Email Worker（宿主机，避免每次 docker build 拉 node 镜像）
cat >/etc/systemd/system/outreachhub-worker.service <<'EOF'
[Unit]
Description=OutreachHub Email Worker
After=network.target docker.service outreachhub.service

[Service]
Type=simple
WorkingDirectory=/opt/outreachhub
Environment=NODE_ENV=production
EnvironmentFile=/opt/outreachhub/.env
ExecStart=/usr/bin/npm run worker:email
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now outreachhub-worker
```

## GitHub Secrets

仓库 → **Settings → Secrets and variables → Actions → New repository secret**：

| Name | 值 |
|------|-----|
| `ECS_HOST` | `121.199.31.190` |
| `ECS_USER` | `root` |
| `ECS_SSH_KEY` | `deploy_ecs` **私钥全文**（含 `BEGIN`/`END` 行） |

## 触发部署

1. 把本仓库的 `.github/workflows/deploy-ecs.yml` 与 `scripts/deploy-remote.sh` **commit 并 push 到 `main`/`master`**
2. 打开 GitHub → **Actions** → **Deploy to Aliyun ECS** 查看日志  
3. 也可手动 **Run workflow**

之后每次 push 到 `main`/`master` 会自动：rsync 代码（不含 `.env`）→ 远程 `npm ci` / `db:push` / `build` → 重启 `outreachhub` 服务。

## 注意

- ECS 直连 `git clone github.com` 仍可能超时，属正常；部署不依赖它。  
- 本地未 push 的改动不会上线，先 `git push`。  
- 2 核 4G：构建较慢、内存紧，可在 Actions 里只传代码、构建仍在服务器完成（当前即此）；若 OOM，再升配或减小并发。
