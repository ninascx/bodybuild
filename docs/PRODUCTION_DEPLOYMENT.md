# BodyBuild 生产部署与自动更新

这份文档面向一台普通 Linux 服务器，例如 Ubuntu 24.04。项目约定：

- 生产构建命令：`npm run build`
- 生产启动命令：`npm run start`
- 默认服务端口：`8787`
- 默认服务绑定：`127.0.0.1`
- 默认 SQLite 数据库：`/var/lib/bodybuild/bodybuild.db`
- 推荐应用目录：`/opt/bodybuild`

## 首次部署

1. 安装基础依赖：

```bash
sudo apt update
sudo apt install -y git curl sqlite3 nodejs npm
```

建议使用 Node.js 20 或更高版本。

2. 拉取代码：

```bash
sudo mkdir -p /opt/bodybuild /var/lib/bodybuild
sudo chown -R "$USER":"$USER" /opt/bodybuild /var/lib/bodybuild
git clone <你的仓库地址> /opt/bodybuild
cd /opt/bodybuild
```

3. 安装依赖并初始化：

```bash
npm ci --include=dev
npm run prisma:generate
npm run db:init
npm run build
```

4. 创建管理员：

```bash
npm run admin:create -- --username=你的昵称 --password=你的密码 --name=管理员
```

## systemd 服务

创建 `/etc/systemd/system/bodybuild.service`：

```ini
[Unit]
Description=BodyBuild Tracker
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/bodybuild
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=384
Environment=DATABASE_URL=file:/var/lib/bodybuild/bodybuild.db
Environment=BODYBUILD_BIND=127.0.0.1
Environment=BODYBUILD_TRUST_PROXY=loopback
Environment=BODYBUILD_BCRYPT_ROUNDS=10
Environment=BODYBUILD_JSON_LIMIT=2mb
Environment=BODYBUILD_SQLITE_BACKUP_KEEP=14
Environment=PORT=8787
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
MemoryMax=700M

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable bodybuild
sudo systemctl start bodybuild
curl http://127.0.0.1:8787/api/health
```

## 自动更新脚本

脚本位置：`scripts/deploy-update.sh`

首次在服务器上赋予执行权限：

```bash
cd /opt/bodybuild
chmod +x scripts/deploy-update.sh
```

常规更新：

```bash
APP_DIR=/opt/bodybuild \
SERVICE_NAME=bodybuild \
DATABASE_URL=file:/var/lib/bodybuild/bodybuild.db \
scripts/deploy-update.sh
```

默认会执行：

1. 检查工作区是否干净；
2. 备份 SQLite 数据库；
3. 备份当前 `dist/` 和 `dist-server/`；
4. `git pull --ff-only`；
5. `npm ci --include=dev`；
6. `npm run prisma:generate`；
7. `npm run db:init`；
8. `npm run build`；
9. `npm run export:check`；
10. `systemctl restart bodybuild`；
11. 访问 `/api/health` 做健康检查。

可选变量：

```bash
APP_DIR=/opt/bodybuild
SERVICE_NAME=bodybuild
BRANCH=main
DATABASE_URL=file:/var/lib/bodybuild/bodybuild.db
BACKUP_DIR=/var/lib/bodybuild/backups/deploy
HEALTH_URL=http://127.0.0.1:8787/api/health
RUN_LINT=0
RUN_PROD_CHECK=0
ALLOW_DIRTY=0
```

如果你想每次部署前也跑 lint：

```bash
RUN_LINT=1 scripts/deploy-update.sh
```

如果你想跑完整生产自检：

```bash
RUN_PROD_CHECK=1 scripts/deploy-update.sh
```

## 回滚思路

脚本会输出本次更新前的 commit 和构建备份路径。若发布后健康检查失败，优先：

```bash
cd /opt/bodybuild
git reset --hard <上一个 commit>
npm ci --include=dev
npm run prisma:generate
npm run db:init
npm run build
sudo systemctl restart bodybuild
curl http://127.0.0.1:8787/api/health
```

如果是数据问题，使用脚本生成的数据库备份恢复。恢复数据库前务必先停服务：

```bash
sudo systemctl stop bodybuild
cp /var/lib/bodybuild/backups/deploy/bodybuild-YYYYmmdd-HHMMSS.db /var/lib/bodybuild/bodybuild.db
sudo systemctl start bodybuild
```

## 反向代理建议

应用默认只监听 `127.0.0.1:8787`。公网访问建议用 Nginx 或 Caddy 做 HTTPS 反向代理，转发到：

```text
http://127.0.0.1:8787
```

不要把 `npm run dev`、`npm run server:dev` 或 `npm run preview` 暴露到生产环境。
