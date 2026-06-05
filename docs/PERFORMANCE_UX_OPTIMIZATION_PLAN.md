# LiftLog 性能与 UX 体验优化方案

**日期：** 2026-06-05  
**范围：** Vite/React 前端、PWA 加载、核心记录流程、训练移动端体验、复盘图表体验  
**目标：** 让高频记录和训练操作更快、更稳、更少打断，同时把低频功能的成本后移。

---

## 1. 当前基线

本次检查命令：

- `npm run build` 通过
- `npm run lint` 通过

生产构建体积：

| 资源 | 体积 | gzip |
|---|---:|---:|
| `dist/assets/index-*.js` | 481.05 kB | 137.22 kB |
| `dist/assets/AnalyticsTab-*.js` | 395.57 kB | 113.48 kB |
| `dist/assets/index-*.css` | 76.46 kB | 12.70 kB |
| PWA precache | 1289.35 KiB | - |

代码结构信号：

- `src/App.tsx` 是状态、数据派生、保存队列、tab 渲染的中心，已有大量 `useMemo` 和保存防抖。
- `src/tabs/AnalyticsTab.tsx` 已经被懒加载，但它静态引入 `DashboardTab`，而 `DashboardTab` 静态引入 Recharts。用户只看周报时仍会加载图表依赖。
- `src/tabs/SettingsTab.tsx`、`src/tabs/AdminUsersTab.tsx`、`src/components/ExportDataDialog.tsx` 属于低频路径，目前进入主包。
- `src/lib/storage.ts` 已经采用“先写本地缓存，再写服务器”的数据安全策略，这是体验底线，应保留。
- `src/components/layout/SyncStatusBar.tsx` 已经有同步状态表达，但还可以更克制地处理成功态，让警告和离线态更突出。
- `src/components/daily/DailyEssentialsForm.tsx` 和训练移动端组件已经围绕高频录入做了较多优化，是后续 UX 深化的基础。

---

## 1.1 执行记录

### 2026-06-05 P0 拆包执行

已完成：

- `SettingsTab`、`AdminUsersTab`、`ExportDataDialog` 改为按需加载。
- `AnalyticsTab` 只保留轻量外壳，`WeeklyTab` 和 `DashboardTab` 分别按需加载。
- `DailyRecordTab` 和 `WorkoutTab` 改为按需加载，首屏今日页不再加载记录/训练 UI。
- 新增 `npm run bundle:check`，用构建产物的 gzip 体积守住主包和关键 chunk 预算。
- `docs/HEALTH_CHECK.md` 增加性能预算检查说明。

优化后生产构建体积：

| 资源 | 体积 | gzip |
|---|---:|---:|
| `dist/assets/index-*.js` | 330.33 kB | 101.31 kB |
| `dist/assets/DailyRecordTab-*.js` | 15.19 kB | 4.97 kB |
| `dist/assets/WorkoutTab-*.js` | 84.43 kB | 20.55 kB |
| `dist/assets/AnalyticsTab-*.js` | 1.80 kB | 0.81 kB |
| `dist/assets/WeeklyTab-*.js` | 5.41 kB | 1.80 kB |
| `dist/assets/DashboardTab-*.js` | 389.17 kB | 112.25 kB |
| `dist/assets/ExportDataDialog-*.js` | 11.68 kB | 4.07 kB |
| `dist/assets/SettingsTab-*.js` | 16.59 kB | 5.00 kB |
| `dist/assets/AdminUsersTab-*.js` | 22.63 kB | 7.16 kB |
| `dist/assets/index-*.css` | 77.31 kB | 12.74 kB |
| PWA precache | 1294.07 KiB | - |

对比原始基线：

- 主包 gzip：`137.22 kB` -> `101.31 kB`，下降约 `26%`。
- 分析入口 gzip：`113.48 kB` -> `0.81 kB`，Recharts 已集中到趋势图表 chunk。
- 首屏已达到“主包 gzip 控制到 110 kB 以下”的阶段目标。

本轮验证：

- `npm run typecheck` 通过
- `npm run lint` 通过
- `npm run build` 通过
- `npm run bundle:check` 通过

---

## 2. 优化目标

### 性能目标

- 首屏主包 gzip 控制到 **110 kB 以下**，优先移动低频功能和图表依赖。
- 复盘页按需加载，首次打开周报不加载 Recharts。
- 高频输入交互保持 **INP < 200 ms**，训练组输入、快速微调、切 tab 不出现明显卡顿。
- 大数据量本地缓存写入不阻塞输入，保存状态在 **300 ms 内**给出可感知反馈。
- PWA 更新不造成白屏、旧缓存残留或 API 数据误缓存。

### UX 目标

- 首页只回答“现在该做什么”，每日记录和训练入口保持明确。
- 移动端训练流保持单手可操作：当前动作、当前组、休息计时、下一步动作始终可达。
- 同步状态不抢主任务注意力，但离线、慢保存、失败必须明确。
- 图表优先给结论和可信度，不用稀疏数据误导用户。
- 全局组件保持 44px 触摸目标、可见焦点、AA 对比和 reduced-motion 兼容。

---

## 3. 分阶段方案

### Phase 0：建立可重复测量基线

优先级：P0  
周期：0.5 天

任务：

- 增加构建体积预算记录，至少跟踪主包、复盘包、CSS、PWA precache。
- 用 Lighthouse 或 Playwright 记录三条用户流：登录后进入今日、填写每日记录、进入训练模式录入一组。
- 用 React Profiler 采样两类场景：每日字段连续输入、训练组连续输入。
- 在 `docs/HEALTH_CHECK.md` 中补充性能验收命令和目标阈值。

验收：

- 每次优化前后都有构建体积对比。
- 至少有一份移动端 390px 宽度下的流程截图或录屏作为 UX 回归参考。

### Phase 1：减少首屏与低频路径成本

优先级：P0  
周期：1-2 天

任务：

- 将 `SettingsTab`、`AdminUsersTab` 改为 `React.lazy`，低频 tab 首次进入再加载。
- 将 `ExportDataDialog` 改为懒加载，只有打开导出时加载导出 UI。
- 拆分 `AnalyticsTab`：`WeeklyTab` 和 `DashboardTab` 分别懒加载。默认进入周报时不加载 Recharts。
- 进一步拆分图表组件：把 Recharts 相关组件集中到 chart chunk，空数据状态不加载图表库。
- 评估 `vite.config.ts` 的 `manualChunks`，避免把 React 运行时和业务低频代码混在主包里。

建议目标：

| 指标 | 当前 | 目标 |
|---|---:|---:|
| 主包 gzip | 137.22 kB | <= 110 kB |
| 分析页首开 gzip | 113.48 kB | 按视图拆分，周报明显小于图表页 |
| CSS gzip | 12.70 kB | 保持或略降 |

风险控制：

- 不要过度拆成十几个小 chunk。按 tab、dialog、chart 三类拆分即可。
- PWA precache 会缓存 chunk，拆包后要确认更新提示和旧缓存清理仍正常。

### Phase 2：降低运行时计算和保存阻塞

优先级：P0  
周期：2-3 天

任务：

- 将 `src/App.tsx` 的派生数据分层：全局基础数据、当前 tab 数据、当前日期数据分开。
- 对每日记录和训练记录建立按日期索引的 memo map，减少重复 `find`、`filter`、周范围扫描。
- 把仅 `analytics` 需要的趋势、周报、训练表现计算完全延后到分析视图。
- 对训练页的 `previousRecordsByExerciseKey` 做更窄依赖，避免非训练数据变化触发重算。
- 对连续输入保存继续保留 400ms 防抖，同时评估把 `JSON.stringify` 和 localStorage 写入放进 idle callback 或更粗粒度队列。
- 为初始化和用户切换的 fetch 增加 abort 或版本保护，避免旧请求覆盖新状态。

验收：

- 每日记录连续输入时不掉帧，保存状态不闪烁。
- 训练组快速录入时当前输入不丢焦点，不因保存队列阻塞。
- 切换到非分析 tab 不触发趋势图表计算。

### Phase 3：高频 UX 流程优化

优先级：P1  
周期：2-4 天

#### 今日页

- 今日页只保留一个最明确的主行动：补记录、继续训练、查看风险中的一个。
- 趋势信号保持摘要，不把图表前置到高频入口。
- 新用户或数据不足时，显示“还差哪几项”而不是泛化说明。

#### 每日记录

- 保持 `DailyEssentialsForm` 为第一屏核心，六个常用字段默认可见。
- 快速微调按钮继续保留，但在移动端检查按钮文字和触摸宽度，避免 `+100`、`+1k` 过挤。
- 保存状态放在表单区块右上角即可，全局同步栏只表达异常或持久状态。
- 围度、备注、日历继续折叠，避免挤压常用录入。

#### 训练页

- 移动端训练模式优先显示当前动作和当前组，模板管理、动作编辑保持次级入口。
- 当前组输入区固定稳定尺寸，键盘打开时不被底栏遮挡。
- “下一组 / 下一个动作 / 完成训练”按状态只出现一个主按钮，减少训练中判断成本。
- 休息计时结束反馈要明显但短暂，不长期占据视觉中心。

#### 复盘页

- 周报和趋势的入口文案要明确：周报用于行动建议，趋势用于长期判断。
- 图表空态继续先讲记录缺口，数据少时不展示低可信图表。
- 图例和 tooltip 保持可读，长动作名截断但不丢失完整信息。

### Phase 4：视觉一致性、可访问性和响应式硬化

优先级：P1  
周期：1-2 天

任务：

- 全局复查 `Button`、`TextInput`、`Select`、`SegmentedControl` 的 disabled、focus、loading、error 状态。
- 复查移动端底部导航和训练底栏的 `safe-area-inset-bottom`，确认 320px 宽度无横向溢出。
- 图表容器保留 `role="img"` 和摘要文本，补齐 tooltip 键盘不可达时的文本替代。
- 对低于首屏的长列表、图表区和设置面板评估 `content-visibility: auto`。
- 收敛 motion：保留状态反馈和短 transition，避免每次 tab 切换都让用户等待。

验收：

- 320px、390px、768px、1280px 四档视口无文本重叠和横向滚动。
- 键盘只用 Tab 可以完成登录、切 tab、录入每日字段、打开菜单、关闭弹窗。
- reduced-motion 下无长动画和强制平滑滚动。

### Phase 5：生产监控和持续回归

优先级：P2  
周期：1 天起，持续维护

任务：

- 接入轻量 Web Vitals 上报或本地 debug 面板，记录 LCP、INP、CLS。
- 记录保存耗时分布：本地缓存耗时、服务器 PUT 耗时、失败重试次数。
- 在健康检查中加入 bundle budget，超过阈值时提醒。
- 为 PWA 更新流程保留手动回归：安装态、离线态、新版本提示、刷新后数据仍在。

---

## 4. 推荐执行顺序

1. 做 Phase 0，先把体积和三条用户流固定下来。
2. 做 Phase 1，优先拆低频 tab、导出弹窗和 Recharts。
3. 做 Phase 2，把 `App.tsx` 的运行时计算从“全局一起算”改成“当前任务需要再算”。
4. 做 Phase 3，围绕每日记录和训练移动端做 UX 收口。
5. 做 Phase 4 和 Phase 5，作为发版前硬化和长期守门。

---

## 5. 首批任务清单

| 优先级 | 任务 | 主要文件 | 验收 |
|---|---|---|---|
| P0 | 懒加载设置页和管理页 | `src/App.tsx` | 主包 gzip 下降，功能不变 |
| P0 | 懒加载导出弹窗 | `src/App.tsx`, `src/components/ExportDataDialog.tsx` | 未打开导出时不进主包 |
| P0 | 拆分周报与图表页 | `src/tabs/AnalyticsTab.tsx`, `src/tabs/DashboardTab.tsx`, `src/tabs/WeeklyTab.tsx` | 只看周报不加载 Recharts |
| P0 | 给构建体积设预算 | `package.json`, `scripts/`, `docs/HEALTH_CHECK.md` | CI 或本地检查能发现体积回涨 |
| P0 | 当前 tab 派生数据收敛 | `src/App.tsx`, `src/lib/metrics.ts` | 非分析 tab 不做趋势重算 |
| P1 | 每日记录移动端复查 | `src/components/daily/*`, `src/components/NumberField.tsx` | 390px 下快速录入无拥挤 |
| P1 | 训练模式键盘与底栏复查 | `src/components/workout/*` | 输入不被底栏遮挡 |
| P1 | 同步状态降噪 | `src/components/layout/SyncStatusBar.tsx` | 成功态安静，异常态明确 |

---

## 6. 不建议做的事

- 不建议重写路由或引入复杂状态库作为第一步。当前问题主要是拆包和派生计算边界，不是状态库缺失。
- 不建议为了图表体积直接替换 Recharts。先拆分加载边界，只有拆分后仍慢再评估轻量图表方案。
- 不建议削弱本地优先保存策略。训练记录的信任感比少一次 localStorage 写入更重要。
- 不建议把所有页面做成更大的 dashboard。LiftLog 的优势应该是任务明确，不是信息越多越好。
