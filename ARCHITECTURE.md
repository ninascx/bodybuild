# 项目架构

## 概述

这是一个基于 React + TypeScript 的减脂增肌追踪应用，采用单页面应用（SPA）架构，使用 Vite 构建。

## 目录结构

```
src/
├── App.tsx                    # 主应用组件（1054 行）
├── tabs/                      # Tab 视图组件（723 行）
│   ├── TodayTab.tsx          # 今日概览
│   ├── DailyRecordTab.tsx    # 每日记录
│   ├── WorkoutTab.tsx        # 训练记录
│   ├── DashboardTab.tsx      # 仪表盘
│   └── WeeklyTab.tsx         # 周报
├── components/               # 可复用 UI 组件
│   ├── ui.tsx               # 基础 UI 组件库
│   ├── workout/             # 训练相关组件
│   └── ...                  # 其他共享组件
├── lib/                     # 业务逻辑和工具函数
│   ├── workout.ts          # 训练相关纯函数
│   ├── metrics.ts          # 指标计算和统计
│   ├── recommendations.ts  # 建议生成逻辑
│   ├── storage.ts          # 数据持久化
│   ├── dates.ts            # 日期工具
│   └── ids.ts              # ID 生成
├── data/                    # 静态数据和配置
│   └── plans.ts            # 训练计划、目标配置
├── types.ts                 # TypeScript 类型定义
└── hooks/                   # 自定义 React Hooks
    └── useColorScheme.ts
```

## 架构原则

### 1. 状态管理
- **集中式状态**：所有状态在 `App.tsx` 中管理
- **Props 透传**：通过 props 将状态和回调传递给子组件
- **无全局状态库**：不使用 Redux/Zustand/Context，保持简单

### 2. 组件分层

#### Tab 组件（`src/tabs/`）
- 每个 tab 是一个独立的视图组件
- 接收分组的 props（状态 + 回调）
- 不包含业务逻辑，只负责 UI 渲染
- Props 类型在各自文件中定义，避免全局耦合

#### 共享组件（`src/components/`）
- 可复用的 UI 组件
- 按功能分组（如 `workout/` 目录）
- 尽可能无状态或只包含 UI 状态

#### 业务逻辑（`src/lib/`）
- 纯函数，无副作用
- 可独立测试
- 按功能模块组织

### 3. 数据流

```
用户操作 → Tab 组件 → 回调函数 → App.tsx 更新状态 → 重新渲染
                                    ↓
                              持久化到服务器/本地
```

### 4. 类型安全
- 严格的 TypeScript 配置
- 所有公共接口都有类型定义
- 类型定义集中在 `types.ts`

## 关键设计决策

### 为什么不用 React Router？
- 应用只有 5 个 tab，使用 sessionStorage 管理即可
- 避免引入额外依赖
- 保持 URL 简洁

### 为什么不用 Context API？
- 组件层级不深（最多 3 层）
- Props 透传清晰可追踪
- 避免隐式依赖

### 为什么拆分 Tab 组件？
- **原 App.tsx 2730 行**，难以维护
- 每个 tab 是独立的功能模块
- 拆分后 App.tsx 降到 1054 行
- 提高代码可读性和可维护性

## 数据持久化

### 本地缓存
- 使用 `localStorage` 缓存数据
- 每次修改立即缓存
- 应用启动时优先加载缓存

### 服务器同步
- 使用 Cloudflare R2 存储 JSON 文件
- 自动保存（防抖 2 秒）
- 支持离线模式

## 性能优化

- **useMemo**: 缓存计算密集型数据（趋势图、统计数据）
- **useCallback**: 稳定回调函数引用
- **代码分割**: Tab 组件独立文件（未来可按需加载）
- **Bundle 大小**: 681 kB（gzip 后 200 kB）

## 开发工作流

```bash
# 开发
npm run dev

# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 未来优化方向

1. **代码分割**: 使用 React.lazy 按需加载 tab 组件
2. **测试**: 添加单元测试和集成测试
3. **性能监控**: 添加性能指标追踪
4. **PWA 增强**: 改进离线体验
