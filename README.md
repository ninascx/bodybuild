# 减脂增肌追踪

一个小范围多用户训练与饮食记录网站。核心目标是让每个用户持续记录身体变化、训练表现和营养执行情况，并根据个人目标得到简单、可执行的调整建议。

技术栈：Vite 8 + React 19 + TypeScript + Tailwind CSS 4 + Express + Prisma + SQLite。
视觉方向：冷静、精确、训练笔记本式的工具界面。主操作使用克制的青绿/橙色强调，成功状态使用语义绿，正文和表单保持稳定 sans。

## 近期 UI/UX 改进

- **反馈可信度**：保存、创建、密码、导出等操作统一使用顶部同步状态、就近提示和短反馈。
- **记录页收敛**：首屏保留日期、常用录入和备注；复制当前日期记录、导出此日等低频动作收进右上角“更多”菜单。
- **管理员页整理**：当前账号改密码、创建用户、用户列表和用户数据操作拆成更清晰的任务区。
- **移动端训练页**：底部控制改为紧凑常驻栏 + 可展开控制面板，训练中优先显示当前动作和当前组输入。
- **PWA 外壳**：通过 manifest 与 `theme-color` 同步深浅色外壳颜色，安卓添加到桌面后状态栏尽量与页面背景保持一致。

## 功能概览

- 昵称 + 密码登录，不开放自助注册。
- 管理员创建和停用用户、重置密码、查看用户数据概况。
- 每个用户独立保存每日记录、训练记录、训练模板、个人资料、个人计划和规则配置。
- 今日页显示记录缺口、训练节奏建议、本周热量/步数/训练完成度。
- 记录页提供一屏快速记录：日期、体重、热量、蛋白、步数、睡眠、疲劳和备注；目标提示显示为字段辅助说明，日历和围度收在补充详情里。
- 计划页只负责把一周每天关联到训练计划或休息日，不单独维护饮食目标和动作内容。
- 训练页手机端使用当前动作优先视图，底部紧凑栏保留确认本组、下一组/下一动作和休息摘要，展开后显示休息控制、上一动作、快速套用和结束训练。
- 周报页给出趋势提醒和下周调整动作。
- 训练模板支持 64 位 token 导入/导出。
- 管理员可创建 SQLite 备份、按范围导出单用户数据、清空单用户数据。
- API 响应明确 `no-store`，Service Worker 只缓存静态资源，不缓存用户数据。
- 前端启动时会清理旧版本遗留的 API runtime cache，避免升级前缓存继续残留。

## 本地启动

```bash
npm install
npm run prisma:generate
npm run db:init
```

创建第一个管理员：

```bash
npm run admin:create -- --username=你的昵称 --password=你的密码 --name=管理员
```

启动后端：

```bash
npm run server:dev
```

另开一个终端启动前端：

```bash
npm run dev
```

- 前端：http://127.0.0.1:5173
- 后端：http://127.0.0.1:8787

## 生产部署

完整生产部署流程与一键更新脚本见 [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md)。

```bash
npm ci --include=dev
npm run prisma:generate
npm run db:init
npm run build
npm run admin:create -- --username=你的昵称 --password=你的密码 --name=管理员
PORT=8787 npm run start
```

`npm run build` 会同时生成前端 `dist/` 和生产服务端 `dist-server/`。生产环境请使用 `npm run start`，不要用 `npm run dev`、`npm run server:dev` 或 `npm run preview` 对外提供服务。

默认 SQLite 数据库路径是：

```text
./data/bodybuild.db
```

可用环境变量覆盖：

```bash
DATABASE_URL=file:/var/lib/bodybuild/bodybuild.db PORT=8787 npm run start
```

默认只绑定 `127.0.0.1`。如果需要局域网访问：

```bash
BODYBUILD_BIND=0.0.0.0 npm run start
```

建议放在可信网络，或用 Nginx / Caddy 做 HTTPS 和反向代理。
默认 `BODYBUILD_TRUST_PROXY=loopback`，适合 Nginx / Caddy 与应用部署在同一台机器、由 `127.0.0.1:8787` 转发的场景；登录限流会使用真实客户端 IP。若应用直接暴露公网且没有反向代理，可设为 `false`。

### 1GB / 1 核服务器建议

当前应用按小范围 5 名用户同时使用设计：React 静态资源由 Express 直接托管，业务数据写入 SQLite，SQLite 启动时会启用 WAL、`synchronous=NORMAL` 和 5 秒 `busy_timeout`，避免轻微并发写入时直接失败。

在 1GB RAM、1 CPU Core 的 Ubuntu 24.04 服务器上建议这样运行：

```bash
NODE_ENV=production \
NODE_OPTIONS=--max-old-space-size=384 \
DATABASE_URL=file:/var/lib/bodybuild/bodybuild.db \
BODYBUILD_BIND=127.0.0.1 \
BODYBUILD_BCRYPT_ROUNDS=10 \
BODYBUILD_JSON_LIMIT=2mb \
BODYBUILD_SQLITE_BACKUP_KEEP=14 \
PORT=8787 \
npm run start
```

建议配置 1GB swap，避免系统升级、构建或日志轮转时短时内存尖峰导致进程被杀。构建可以在服务器上完成；如果内存紧张，也可以在本地或 CI 执行 `npm run build` 后只上传 `dist/`、`dist-server/`、`package.json`、`package-lock.json`、`prisma/` 和 `server/` 必需文件，再执行 `npm ci --omit=dev`。

systemd 示例：

```ini
[Unit]
Description=Bodybuild Tracker
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
# 默认按请求自动判断：HTTPS 反代加 Secure，本机 HTTP 验收不加。
# 若只允许 HTTPS，可改为 BODYBUILD_SECURE_COOKIES=true。
Environment=PORT=8787
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
MemoryMax=700M

[Install]
WantedBy=multi-user.target
```

健康检查：

```bash
curl http://127.0.0.1:8787/api/health
```

返回值会包含 `ok`、数据库可用状态、数据文件路径、进程运行时间和 RSS 内存占用。5 名用户同时使用时，如果 RSS 长期超过 500MB，优先检查是否误用了开发启动命令或是否有异常大导出。

`BODYBUILD_BCRYPT_ROUNDS` 控制新建用户和重置密码时的 bcrypt 成本，默认 `10`，会被限制在 `8-14` 之间。1 核服务器建议保持 `10`；如果只服务极少用户且更重视密码哈希强度，可以调到 `11` 或 `12`。已有密码会继续按各自 hash 中记录的成本正常验证。

`BODYBUILD_JSON_LIMIT` 控制 API 单次 JSON 提交上限，默认 `2mb`。小范围 5 人使用通常足够，能避免异常大请求拖慢 1GB 服务器；如果长期使用后完整用户数据超过上限，可以调到 `4mb` 或 `5mb`。

上线前可运行一次生产自检：

```bash
npm run build
npm run prod:check
```

自检会用临时 SQLite 数据库启动 `dist-server/index.js`，连续访问首页和 `/api/health`，确认数据库可用，并创建 5 个临时用户并发完成登录、每日记录写入和训练记录写入；随后逐个读取 `/api/app-data`，确认每个用户只能看到自己的记录。它还会检查反向代理 `X-Forwarded-For` 下的登录限流是否按真实用户 IP 隔离。自检不会写入正式数据库。
自检也会确认 API 响应带 `Cache-Control: no-store`，避免多用户数据进入浏览器或 Service Worker 缓存。
自检还会确认 cookie 策略：本机 HTTP 验收不加 `Secure`，HTTPS 反向代理请求会自动加 `Secure`。
自检还会确认构建后的 Service Worker 不包含 API 缓存策略。
自检还会调用管理员 SQLite 备份接口，并打开备份文件确认刚写入的用户、每日记录和训练记录已经进入备份。
自检还会把 API JSON 提交上限临时调低，确认超大请求会返回中文 JSON 错误而不是默认错误页。

## 更新部署

已有服务器更新时建议按这个顺序：

```bash
cd /opt/bodybuild
sqlite3 /var/lib/bodybuild/bodybuild.db "PRAGMA wal_checkpoint(TRUNCATE);"
cp /var/lib/bodybuild/bodybuild.db "/var/lib/bodybuild/bodybuild-$(date +%F-%H%M%S).db"
git pull
npm ci --include=dev
npm run prisma:generate
npm run db:init
npm run build
sudo systemctl restart bodybuild
curl http://127.0.0.1:8787/api/health
```

如果服务器没有 `sqlite3` 命令，可先执行 `sudo apt update && sudo apt install -y sqlite3`，或直接使用管理员页面“创建备份”。
如果用的是管理员页面的“创建备份”，可以先在网页里创建备份，再从 `git pull` 开始执行。更新后第一次访问建议强制刷新浏览器，确保加载最新静态资源。

## 管理员流程

1. 首次部署后用 `npm run admin:create` 创建管理员。
2. 管理员登录后进入“用户管理”。
3. 创建普通用户，设置昵称和初始密码。
4. 新用户默认不需要自助注册；训练模板为空，可由用户自己创建或用 token 导入。
5. 如需给用户恢复内置计划，可在用户管理里点“默认计划”。

## 个性化配置

用户进入“个人”页即可设置：

- 当前目标：减脂 / 增肌 / 维持
- 每周体重变化目标
- 训练天数
- 日热量目标
- 蛋白目标
- 步数底线
- 睡眠底线
- 疲劳阈值
- 周末热量上限

不配置也可以直接使用，系统会采用默认计划和默认阈值。

## 数据安全

- 管理员“创建备份”会先对 SQLite WAL 做 checkpoint，再复制当前数据库到 `data/backups/`，避免漏掉最近写入；默认保留最近 14 个 SQLite 备份，可用 `BODYBUILD_SQLITE_BACKUP_KEEP` 调整。
- 导出弹窗默认以当前锚定日期为结束日导出近 30 天每日记录和训练记录，也可切换当天、本周、近 7 天、本月、全部或自定义日期。
- 导出弹窗可选择是否包含训练模板、个人资料、个人计划和规则配置；默认精简记录，去掉空日期、空动作和空组。
- 导出前可展开预览，先看将导出的日期、字段、动作数和组数。
- 可下载 JSON 备份、轻量文本摘要，或 CSV 表格用于表格软件继续分析；摘要和 CSV 都会跳过空记录，CSV 只保留当前范围实际出现过的字段。
- 普通导出默认使用文本摘要；训练页的本日训练导出默认使用 CSV；点“完整备份”会自动切回 JSON。
- “完整备份”会一次性勾选全部内容，并保留完整训练结构。
- “精简默认”可一键回到当前入口的轻量导出设置。
- 记录页右上角“更多”菜单提供“复制当前日期记录”和“导出此日”，导出默认锚定当前记录日期。
- 训练页可在“更多训练操作”里直接导出本日训练，只包含训练记录。
- 周报页可直接“导出本周”，历史周也会按当前查看周导出。
- 用户管理里的“导出用户”使用同样的范围和内容选择，默认锚到该用户最近记录日期，适合只交付需要的记录片段。
- 用户管理里的“清空数据”会清空该用户记录、计划、资料、偏好和模板分享 token，但保留账户。
- 登录接口有简单内存限流：同一 IP + 昵称 10 分钟内失败 5 次后会短暂拒绝继续尝试。

建议在生产环境额外做系统级备份，例如每天复制 `bodybuild.db` 到另一块磁盘或对象存储。

## 常用命令

```bash
npm run lint
npm run typecheck
npm run build
npm run db:init
npm run admin:create -- --username=你的昵称 --password=你的密码
```

## 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
