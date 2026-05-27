# 多用户改造设计文档

## 背景

当前应用是个人训练和饮食记录工具，前端通过 `/api/data` 读取和保存整包数据，服务端将数据写入单个 JSON 文件。训练计划、饮食目标和个人资料主要来自 `src/data/plans.ts` 的静态配置。

多用户化后，应用需要支持多个用户按各自计划记录训练、饮食、体重、围度和周报数据，同时避免数据串用、误覆盖和隐私泄露。

## 目标

第一阶段目标是做成邀请制多用户版本，而不是公开注册产品。

- 管理员可以创建用户、查看用户列表、分配训练和饮食计划。
- 普通用户登录后只看到自己的计划、记录和趋势。
- 每个用户拥有独立的每日记录、训练记录、自定义训练模板和偏好设置。
- 当前个人数据可以迁移为第一个管理员账号的数据。
- 保留现有前端体验，包括今日页、每日记录、训练模式、仪表盘和周报。

## 非目标

第一阶段不做以下能力：

- 公开注册和邮箱验证。
- 支付、订阅、套餐。
- 多教练组织架构。
- 实时协作编辑。
- 复杂权限矩阵。
- 医疗建议或自动诊断能力。

这些可以在数据模型里预留空间，但不要在 MVP 阶段实现。

## 用户角色

### 管理员

- 创建和禁用用户。
- 重置用户密码。
- 查看任意用户的记录和趋势。
- 创建计划模板。
- 将训练计划和饮食目标分配给用户。
- 迁移旧数据。

### 普通用户

- 登录和退出。
- 查看自己的今日计划、饮食目标和训练安排。
- 填写自己的每日记录。
- 填写自己的训练记录。
- 管理自己的自定义训练模板。
- 导出自己的数据。

### 未来可选：教练

教练可以管理一组被分配的用户，但不能管理系统设置和其他教练的数据。MVP 阶段可以暂不实现，只在 schema 里保留 `role` 扩展。

## 推荐技术方案

### MVP 推荐

- 后端继续使用 Express。
- 数据库使用 SQLite。
- ORM 使用 Prisma。
- 登录使用 cookie session。
- 密码使用 bcrypt 哈希。
- 前端继续使用 React + Vite。

这个方案部署简单，适合从个人工具平滑升级到小规模多人使用。

### 后续升级

当用户数量增加或需要云部署高可用时，可以从 SQLite 迁移到 PostgreSQL。Prisma schema 可以尽量保持数据库无关，减少迁移成本。

## 数据隔离原则

所有用户私有数据必须带 `userId`：

- 每日记录。
- 训练记录。
- 用户自定义模板。
- 用户个人资料。
- 用户饮食目标。
- 用户训练计划。
- 用户偏好设置。

服务端不能信任前端传入的 `userId`。普通用户接口必须从 session 中读取当前登录用户，再用该用户 id 查询和写入数据。

管理员接口可以带目标用户 id，但必须先校验当前用户角色是 `admin`。

## 数据库 Schema 草案

以下是 Prisma schema 草案，用于指导后续实现。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum UserRole {
  admin
  member
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  displayName  String
  passwordHash String
  role         UserRole @default(member)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  profile          UserProfile?
  dailyLogs        DailyLog[]
  workoutLogs      WorkoutLog[]
  workoutTemplates WorkoutTemplate[]
  workoutPlans     WorkoutPlan[]
  nutritionTargets NutritionTarget[]
  preferences      UserPreference?
  sessions         Session[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserProfile {
  id                       String   @id @default(cuid())
  userId                   String   @unique
  sex                      String?
  birthDate                String?
  heightCm                 Float?
  initialWeightKg          Float?
  estimatedBodyFatPercent  Float?
  targetWeeks              String?
  goal                     String?
  sleepHours               Float?
  averageSteps             Int?
  trainingDaysJson         String   @default("[]")
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model NutritionTarget {
  id             String   @id @default(cuid())
  userId         String
  dayOfWeek      Int
  workoutName    String
  calories       Int?
  calorieMin     Int?
  calorieMax     Int?
  protein        Int
  carbs          Int?
  fat            Int?
  stepTarget     Int
  notesJson      String   @default("[]")
  isTrainingDay  Boolean
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, dayOfWeek])
}

model WorkoutPlan {
  id          String   @id @default(cuid())
  userId      String
  dayOfWeek   Int
  name        String
  focus       String
  exercisesJson String @default("[]")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, dayOfWeek])
}

model WorkoutTemplate {
  id            String   @id @default(cuid())
  userId        String?
  name          String
  focus         String
  category      String
  exercisesJson String   @default("[]")
  isBuiltin     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model DailyLog {
  id                   String   @id @default(cuid())
  userId               String
  date                 String
  morningWeightKg      Float?
  waistCm              Float?
  chestCm              Float?
  upperArmCm           Float?
  thighCm              Float?
  calories             Int?
  protein              Int?
  carbs                Int?
  fat                  Int?
  steps                Int?
  sleepHours           Float?
  trained              Boolean?
  workoutCompletion    Int?
  fatigueScore         Int?
  notes                String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

model WorkoutLog {
  id            String   @id @default(cuid())
  userId        String
  date          String
  workoutName   String
  exercisesJson String   @default("[]")
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
}

model UserPreference {
  id                 String   @id @default(cuid())
  userId             String   @unique
  theme              String?
  restDurationSec    Int      @default(90)
  autoStartRest      Boolean  @default(false)
  activeTab          String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model AuditLog {
  id          String   @id @default(cuid())
  actorUserId String?
  action      String
  targetType  String?
  targetId    String?
  detailsJson String   @default("{}")
  createdAt   DateTime @default(now())
}
```

## Schema 说明

### 为什么部分字段使用 JSON 字符串

`exercisesJson`、`notesJson`、`trainingDaysJson` 暂时使用 JSON 字符串保存，是为了降低第一阶段改造成本，复用现有前端类型：

- `ExercisePlan[]`
- `ExerciseLog[]`
- `string[]`
- `DayKey[]`

后续如果要做动作库、动作统计、跨用户模板搜索，再拆成关系表。

### 内置模板归属

`WorkoutTemplate.userId` 允许为空：

- `userId = null` 且 `isBuiltin = true` 表示系统内置模板。
- `userId = 当前用户 id` 表示用户自己的模板。

普通用户读取模板时返回“系统内置模板 + 自己的模板”。

### 每日记录和训练记录的唯一性

`DailyLog` 和 `WorkoutLog` 使用 `@@unique([userId, date])`，保证同一用户同一天只有一份主记录。

如果未来支持一天多练，可以将 `WorkoutLog` 改成 `@@index([userId, date])`，并增加 `sessionName` 或 `startedAt`。

## API 设计草案

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 当前用户数据

- `GET /api/app-data`
- `PUT /api/daily-logs/:date`
- `PUT /api/workout-logs/:date`
- `GET /api/workout-templates`
- `POST /api/workout-templates`
- `PUT /api/workout-templates/:id`
- `DELETE /api/workout-templates/:id`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/nutrition-targets`
- `PUT /api/nutrition-targets`
- `GET /api/workout-plans`
- `PUT /api/workout-plans`

### 管理员接口

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:userId`
- `POST /api/admin/users/:userId/reset-password`
- `GET /api/admin/users/:userId/app-data`
- `PUT /api/admin/users/:userId/nutrition-targets`
- `PUT /api/admin/users/:userId/workout-plans`
- `POST /api/admin/users/:userId/clone-default-plan`

## 前端改造点

### 新增状态

- `currentUser`
- `authState`
- `selectedUserId`，仅管理员视图需要。
- `appData` 按当前用户加载。

### 页面调整

- 未登录时显示登录页。
- 顶部显示当前用户和退出按钮。
- 管理员显示用户切换入口。
- 今日页、记录页、训练页、仪表盘、周报均读取当前用户数据。

### storage.ts 调整

现有 `src/lib/storage.ts` 需要从整包 `/api/data` 改为：

- 登录后请求 `/api/app-data`。
- 保存每日记录时只保存当天 `DailyLog`。
- 保存训练记录时只保存当天 `WorkoutLog`。
- 模板、计划、目标使用独立接口。
- localStorage key 增加用户维度。

示例：

```ts
const DAILY_LOGS_KEY = (userId: string) => `bodybuild:v2:${userId}:dailyLogs`
const WORKOUT_LOGS_KEY = (userId: string) => `bodybuild:v2:${userId}:workoutLogs`
const WORKOUT_TEMPLATES_KEY = (userId: string) => `bodybuild:v2:${userId}:workoutTemplates`
```

### plans.ts 调整

`src/data/plans.ts` 不再作为用户个人计划来源，只保留：

- 默认计划模板。
- 默认饮食目标模板。
- 默认个人资料种子数据。

用户登录后的真实计划从 API 返回。

## 迁移计划

### 第 0 步：备份

在任何迁移前备份：

- `data/bodybuild-data.json`
- `data/*.bak.json`
- 当前 git commit

也可以通过页面导出一份 JSON 备份。

### 第 1 步：引入 Prisma 和 SQLite

安装依赖：

```bash
npm install @prisma/client bcrypt cookie
npm install -D prisma @types/bcrypt
```

新增：

- `prisma/schema.prisma`
- `.env` 中加入 `DATABASE_URL="file:./bodybuild.db"`
- `server/db.ts`

执行：

```bash
npx prisma migrate dev --name init_multi_user
```

### 第 2 步：创建首个管理员

新增脚本：

- `scripts/create-admin.ts`

功能：

- 读取邮箱、显示名、初始密码。
- 生成 `passwordHash`。
- 创建 `role = admin` 用户。

### 第 3 步：迁移现有 JSON 数据

新增脚本：

- `scripts/migrate-json-to-db.ts`

输入：

- `BODYBUILD_DATA_FILE` 或默认 `data/bodybuild-data.json`
- 目标管理员用户 email

处理：

- 将 `dailyLogs` 写入 `DailyLog`，附上管理员 `userId`。
- 将 `workoutLogs` 写入 `WorkoutLog`，`exercises` 序列化为 `exercisesJson`。
- 将 `workoutTemplates` 写入 `WorkoutTemplate`，附上管理员 `userId`。
- 将 `src/data/plans.ts` 中的默认个人资料、饮食目标、训练计划写入对应表。

迁移策略：

- 对 `DailyLog` 使用 `upsert(userId, date)`。
- 对 `WorkoutLog` 使用 `upsert(userId, date)`。
- 对模板优先按原 id 保留，冲突时跳过或追加后缀。

### 第 4 步：后端接口双轨运行

短期保留旧接口：

- `/api/data`

同时新增新接口：

- `/api/auth/*`
- `/api/app-data`
- `/api/daily-logs/:date`
- `/api/workout-logs/:date`

这样可以分批迁移前端，降低一次性改动风险。

### 第 5 步：前端接入登录

实现登录页和 `GET /api/auth/me`。

启动流程改为：

1. 请求当前登录用户。
2. 未登录显示登录页。
3. 已登录加载 `/api/app-data`。
4. 将数据写入带 `userId` 的本地缓存。

### 第 6 步：改造保存逻辑

将整包保存拆成小接口：

- 每日记录变更保存当天。
- 训练记录变更保存当天。
- 模板变更保存模板。
- 计划和目标仅由管理员或用户设置页保存。

保留现有保存队列思路，但保存粒度变小，失败提示更明确。

### 第 7 步：加入管理员页面

MVP 管理页只需要：

- 用户列表。
- 新建用户。
- 禁用用户。
- 重置密码。
- 查看用户数据。
- 克隆默认计划给用户。

不建议第一版做复杂图表管理端。

### 第 8 步：移除旧 JSON 主存储

确认数据库版本稳定后：

- `/api/data` 改为只读兼容或删除。
- `BODYBUILD_DATA_FILE` 不再作为主数据源。
- README 更新为数据库部署方式。

## 部署和安全要求

### 必须项

- 使用 HTTPS。
- Cookie 设置 `HttpOnly`。
- 生产环境 cookie 设置 `Secure`。
- Session 有过期时间。
- 密码只保存 bcrypt hash。
- 所有写接口校验登录态。
- 管理员接口校验 `role = admin`。
- 数据库文件定期备份。

### 建议项

- 登录失败限流。
- 管理员操作写入 `AuditLog`。
- 提供用户数据导出。
- 提供用户数据删除。
- 服务端对请求 body 做 schema 校验。

## 测试计划

### 单元和类型检查

- `npm test`
- 新增 server 数据转换函数测试。
- 新增迁移脚本 dry-run 测试。

### 手动验收

- 管理员可以登录。
- 管理员可以创建普通用户。
- 普通用户只能看到自己的数据。
- A 用户填写体重后，B 用户看不到。
- A 用户训练模板不出现在 B 用户模板列表。
- 管理员可以查看 A 用户数据。
- 旧 JSON 数据成功迁移到管理员账号。
- 离线缓存不会跨用户串数据。
- 退出登录后无法访问 `/api/app-data`。

## 风险点

### 数据误覆盖

当前应用是整包保存，多用户后必须拆成按资源保存，否则容易出现不同标签页互相覆盖。

### localStorage 串用户

所有缓存 key 必须加入 `userId`。退出登录时不能简单复用上一位用户缓存。

### 管理员视图误编辑

管理员查看用户数据时，界面要明确显示“正在查看谁”。保存接口也要区分“编辑自己”和“管理员编辑目标用户”。

### 训练计划版本

用户的训练记录应该保存当时动作名称和目标，不应因为后续改计划而改变历史记录。当前 `WorkoutLog` 已经保存 `workoutName` 和 `exercises`，这个方向可以保留。

### 隐私

体重、围度、饮食、训练表现都属于敏感个人数据。即使是小范围使用，也应该默认只让用户看到自己的数据。

## 推荐实施顺序

1. 新增 Prisma schema 和数据库连接。
2. 实现用户表、session、登录/退出。
3. 实现 `/api/app-data`，先保持前端数据结构不变。
4. 编写 JSON 到数据库迁移脚本。
5. 前端接入登录和当前用户。
6. localStorage key 加 `userId`。
7. 将保存从 `/api/data` 拆到每日记录、训练记录、模板接口。
8. 增加管理员用户管理页。
9. 更新 README 和部署说明。
10. 删除或降级旧 JSON 接口。

## 第一阶段完成标准

- 可以创建至少 2 个普通用户。
- 两个用户登录后看到的数据完全隔离。
- 每个用户可以使用自己的饮食目标和训练计划。
- 当前个人历史记录成功迁移到管理员账号。
- 管理员可以查看和管理用户。
- `npm test` 通过。
- 旧 JSON 文件有备份，且迁移脚本可重复安全执行。
