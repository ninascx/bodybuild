# LiftLog 界面审查报告

**Target**
- Homepage
- Record page
- Workout page

**Date**
- 2026-06-06

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | 保存、完成、休息状态能看见，但局部回退和确认不够强。 |
| 2 | Match System / Real World | 2 | 仍有不少内部任务语言，结果导向不够直白。 |
| 3 | User Control and Freedom | 2 | 折叠、模式切换、底部抽屉让退出和回主路径不够直接。 |
| 4 | Consistency and Standards | 2 | Today、Record、Workout 的视觉和操作语法不完全一致。 |
| 5 | Error Prevention | 2 | 快捷填入、微调、批量套用容易误改已有值。 |
| 6 | Recognition Rather Than Recall | 2 | 关键动作分散在折叠区和模式切换里。 |
| 7 | Flexibility and Efficiency | 3 | 速度型功能有，但不够显眼。 |
| 8 | Aesthetic and Minimalist Design | 2 | 分区和状态块偏多，视觉层次显得拥挤。 |
| 9 | Error Recovery | 2 | 有反馈，但可回滚和二次确认偏弱。 |
| 10 | Help and Documentation | 1 | 辅助文案存在，但不够把新用户真正带过去。 |
| **Total** |  | **21/40** | **一般，可用，但还不够利落** |

## Anti-Patterns Verdict

整体不是典型 AI 拼贴风，但有几个 slop-adjacent 信号：
- 重复的框
- 太多状态芯片
- 说明文案像拼出来的

骨架可信，问题在于太忙，动作太平均。

## Overall Impression

这是一个能用的产品 UI，不是坏设计。最大问题不是美丑，而是首页、记录、训练三页都把“决定下一步”这件事做得太费力。

## What's Working

- Today、Record、Workout 的任务边界清楚。
- Workout 的底部控制条和安全区处理是对的。
- Record 里的快捷填入和微调是实用加速器。

## Priority Issues

### [P1] Today 表面信息太多
**Location**
- [TodayOverview.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/today/TodayOverview.tsx)

**Problem**
- 主行动、次行动、缺口清单、桌面/移动双版本并列，用户要先筛选再行动。

**Why it matters**
- 首屏决策成本过高。

**Fix**
- 只保留一个主动作。
- 次动作收进次级区。
- 缺口清单默认只露 3 条。

### [P1] Workout 移动端把核心控制藏到第二层抽屉里
**Location**
- [MobileCurrentExerciseView.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/workout/MobileCurrentExerciseView.tsx)
- [MobileWorkoutBottomBar.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/workout/MobileWorkoutBottomBar.tsx)

**Problem**
- finish、previous、rest 先要点开再找。

**Why it matters**
- 训练现场感被打断。

**Fix**
- 把最常用控制常驻在底栏。
- 展开只放低频项。

### [P2] Daily 录入密度偏高
**Location**
- [DailyEssentialsForm.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/daily/DailyEssentialsForm.tsx)

**Problem**
- 一口气摆 6 个字段，再加两个快捷动作和下方折叠区。

**Why it matters**
- 首轮录入负担大。

**Fix**
- 把“必填”和“补充”拆开。
- 默认先看 2 到 3 个关键字段。

### [P2] 文案还不够直白
**Location**
- Today and Daily related surfaces

**Problem**
- 仍有很多“任务计划”“缺口”“状态”类内部语义。

**Why it matters**
- 界面在说术语，不是在说结果。

**Fix**
- 把按钮和标签改成“动作 + 结果”。

### [P2] 重复框和状态块有点多
**Location**
- Across Today, Record, Workout

**Problem**
- 各页都用了很多边框、卡片、chip 和辅助说明，视觉权重差不多。

**Why it matters**
- 看起来忙，但不够确定。

**Fix**
- 减少容器层数。
- 给主内容更强的留白和对比。

## Persona Red Flags

- **Alex，重度用户**: 快捷功能有，但最快路径仍然藏在卡片、折叠面板和模式切换后面。
- **Sam，需要无障碍支持的用户**: 底部抽屉和微调按钮可用，但路径太分散，不够顺手。
- **Casey，分心的移动用户**: Workout 里主操作和次操作分离，回来后要重新找状态。

## Minor Observations

- Today 移动版和桌面版逻辑一致，但视觉像两个版本。
- Record 的命中区域和按钮尺寸基本合格。
- 完成 toast 有帮助，但悬浮感稍强，容易抢当前内容注意力。

## Questions to Consider

- What if Today 只保留一个决定性动作？
- Could the workout bottom bar become the full control surface?
- Do first-time users really need six daily fields on screen at once?

## Assessment Notes

- 代码探针结果: 7 个 TSX 目标，0 findings。
- 浏览器证据: 本轮未拿到稳定桌面/移动截图，运行器出现 sandbox spawn error。

## Reference Files

- [TodayOverview.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/today/TodayOverview.tsx)
- [DailyEssentialsForm.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/daily/DailyEssentialsForm.tsx)
- [MobileCurrentExerciseView.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/workout/MobileCurrentExerciseView.tsx)
- [MobileWorkoutBottomBar.tsx](C:/Users/www20/OneDrive/文档/bodybuild/src/components/workout/MobileWorkoutBottomBar.tsx)
