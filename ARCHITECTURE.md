# 项目架构

## 概述

BodyBuild 是一个小范围多用户训练与饮食记录应用。前端是 Vite + React + TypeScript 单页面应用，后端是 Express 服务，数据通过 Prisma 写入 SQLite。生产构建会生成：

- `dist/`：前端静态资源和 PWA Service Worker。
- `dist-server/`：打包后的 Express 服务端入口。

## 目录结构

```text
src/
├── App.tsx                    # 应用状态、数据加载、保存、导出和 tab 编排
├── tabs/                      # 顶层页面视图
│   ├── TodayTab.tsx           # 今日概览
│   ├── DailyRecordTab.tsx     # 每日记录
│   ├── WorkoutTab.tsx         # 训练记录
│   ├── AnalyticsTab.tsx       # 复盘分析
│   ├── SettingsTab.tsx        # 设置 / 个人配置
│   └── AdminUsersTab.tsx      # 管理员用户管理
├── components/
│   ├── ui/                    # Button、Field、DropdownMenu 等基础 UI
│   ├── layout/                # AppShell、导航、同步状态、登录页
│   ├── daily/                 # 记录页表单、备注、日历和围度
│   └── workout/               # 训练记录、移动端训练流、模板管理
├── hooks/                     # 自定义 React hooks
├── lib/                       # 日期、指标、导出、同步、推荐、训练纯函数
├── data/                      # 内置计划和默认配置
└── types.ts                   # 共享业务类型

server/
├── index.ts                   # Express API、静态资源托管、缓存策略
├── auth.ts                    # 登录、密码哈希、会话 cookie
├── appData.ts                 # 用户数据读写和迁移兼容
├── db.ts                      # Prisma client
└── ensureDatabase.ts          # SQLite 初始化和 WAL 设置

prisma/
└── schema.prisma              # SQLite 数据模型
```

## 前端数据流

```text
用户操作
  -> Tab / 组件回调
  -> App.tsx 更新内存状态
  -> 本地缓存和服务端保存
  -> 同步状态 / toast / 就近反馈
```

主要状态仍集中在 `App.tsx`，页面组件通过 props 接收数据和操作函数。这样牺牲了一点 props 长度，但避免引入全局状态库，也让多用户数据保存路径更容易追踪。

## 后端数据流

```text
浏览器
  -> Express API
  -> 会话验证
  -> Prisma
  -> SQLite
```

- API 响应默认带 `Cache-Control: no-store`，避免个人数据进入浏览器或 Service Worker 缓存。
- SQLite 启动时启用 WAL、`synchronous=NORMAL` 和 `busy_timeout`，适配小范围多人使用。
- 管理员备份会先 checkpoint WAL，再复制 SQLite 数据库到 `data/backups/`。
- 生产静态资源由同一个 Express 服务托管，PWA 只预缓存静态资源，不缓存 `/api/*`。

## 页面和组件边界

- `AppShell` 负责页面框架、顶部同步状态、导航和右上角“更多”菜单。
- `DailyRecordTab` 负责记录页日期、复制此日、常用录入和补充详情编排。
- `DailyEssentialsForm` 负责每天最常用的 6 个数字字段，目标提示显示在字段旁。
- `WorkoutTab` 负责训练页编排，移动端训练流拆到 `components/workout/`。
- `ExportDataDialog` 是统一导出弹窗，记录页、训练页、周报页和管理员导出都复用它。

## PWA 和缓存

- `vite-plugin-pwa` 生成 manifest 和 Service Worker。
- `manifest.theme_color` / `background_color` 控制安装和启动外壳颜色。
- `useColorScheme` 会根据深浅色模式同步 `<meta name="theme-color">`，尽量让安卓 PWA 状态栏和页面背景一致。
- Service Worker denylist 排除 `/api/*`，只缓存前端静态资源。

## 开发工作流

```bash
npm install
npm run prisma:generate
npm run db:init
npm run server:dev
npm run dev
```

常用校验：

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npm run prod:check
```

## 关键约束

- 不开放自助注册，用户由管理员创建。
- 普通用户只能读取和修改自己的数据。
- 不把 API 响应放进 Service Worker 或 HTTP 缓存。
- 数据库、备份、构建产物和本地工具缓存不进入 Git。
- 产品 UI 优先清晰、稳定、低认知负担；低频动作放进折叠菜单或补充详情。
