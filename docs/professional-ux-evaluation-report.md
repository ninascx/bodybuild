# LiftLog 专业 UX 评估报告

**评估日期:** 2026-06-07  
**评估框架:** Nielsen Norman 10 条启发式原则 + 认知心理学 + WCAG 2.1 AA  
**评估人员:** Senior UX Designer (AI-powered)

---

## 执行摘要

**总体 UX 评分: 82/100** 🎯

LiftLog 展示了强大的 UX 基础，特别在无障碍性、键盘导航和信息架构方面表现优秀。主要优化机会集中在减少训练时的认知负荷、改进移动端触摸目标尺寸、增强反馈机制。

---

## Nielsen Norman 10 条启发式评估

### 1. 系统状态可见性 (9/10) ✅

**优点:**
- 训练进度清晰显示："第 X 组 · 状态 · 完成度%"
- 实时同步状态："已保存"、"保存中"、"待保存"
- 休息计时器醒目（大号字体 + 颜色编码）
- Toast 通知带 `aria-live` 区域

**问题:**
- 切换动作时缺少加载状态
- 键盘快捷键触发时无视觉反馈

**建议:**
- 添加触觉反馈或短暂视觉闪烁
- 实现骨架屏加载

---

### 2. 系统与现实世界匹配 (8/10) ✅

**优点:**
- 自然语言："开始训练"、"记录数据"、"复制昨天"
- 健身术语："组间休息"、"疲劳"、"RIR"
- 中文日期名称集成

**问题:**
- "待补项目" 可能过于口语化
- 技术类名暴露给用户（motion-sheet）

**建议:**
- 考虑"未完成项目"更正式

---

### 3. 用户控制与自由度 (7/10) ⚠️

**优点:**
- 数据输入可撤销（允许空值）
- 导航灵活（左右箭头切换）
- 清晰的退出路径

**严重问题:**
- ❌ **完成组后无法撤销** - 按 Enter 确认后无立即撤销
- ❌ **删除组无确认** - 破坏性操作无安全网
- ❌ **休息计时无法暂停** - 只能跳过到结束

**建议 (P0):**
```typescript
// 添加撤销缓冲区
const [lastCompletedSet, setLastCompletedSet] = useState<{
  exerciseIndex: number;
  setIndex: number;
  data: ExerciseSetLog;
} | null>(null);

// Toast 带撤销按钮
showToast({
  message: '第 3 组已完成',
  action: { label: '撤销', handler: () => undoLastSet() },
  duration: 5000
});
```

---

### 4. 一致性和标准 (9/10) ✅

**优点:**
- 统一的按钮系统
- 颜色编码的色调系统
- 标准焦点环
- 键盘快捷键遵循 OS 约定

**小问题:**
- 按钮高度不一致（min-h-12 vs min-h-11）

**建议:**
- 标准化按钮尺寸变体

---

### 5. 错误预防 (8/10) ✅

**优点:**
- 范围验证实时反馈
- 禁用状态防止无效操作
- 安全默认值

**问题:**
- 退出训练无确认
- 删除最后一组无确认
- 数字输入允许短暂的无效中间状态

**建议 (P1):**
```typescript
// 更早阻止无效输入
const handleChange = (next: string) => {
  if (kind === 'decimal' && (next.match(/\./g) || []).length > 1) return;
  if (!/^[0-9]*\.?[0-9]*$/.test(next)) return;
  setRawValue(next);
};
```

---

### 6. 识别而非回忆 (7/10) ⚠️

**优点:**
- 历史记录始终可见
- 目标范围显示
- 快速填充建议

**严重认知负荷问题 (违反 Miller's Law):**
- ❌ **Daily 表单:** 6 个字段同时显示（超过 7±2 限制）
- ❌ **训练卡片:** 需记住 8+ 项（重量、次数、RIR、目标、历史、复制选项）
- ❌ **Today 页:** 次要操作显示 2 个但不指示还有什么

**建议 (P0 - 认知负荷减少):**
```typescript
// 渐进式披露
// 阶段 1: 输入重量 + 次数（2 个字段）
// 阶段 2: 输入后显示 RIR + 完成按钮（1 字段 + 1 动作）
// 阶段 3: 仅在未完成组后显示复制选项
```

---

### 7. 灵活性和使用效率 (9/10) ✅

**优点:**
- 全面的键盘快捷键（Enter、Space、方向键）
- 快速调整按钮（+/-0.1）
- 智能自动填充
- 快捷键帮助面板

**问题:**
- 无快捷键聚焦首个空字段
- 值未定义时快速调整被禁用

**建议:**
```typescript
// 启用快速调整初始化
onIncrease={() => {
  const newValue = field.value ?? field.range.min ?? 0;
  props.onUpdateDailyLog(field.patch(newValue + field.quickStep));
}}
```

---

### 8. 美学和极简设计 (8/10) ✅

**优点:**
- 清晰的表面层次
- 适当的留白
- 精致的动效设计

**问题:**
- 底栏视觉混乱（4 个数据点在小标题中）
- Today 移动版在单卡片中打包太多
- 冗余标签："热量 kcal"（单位在标签和值中重复）

**建议 (Hick's Law - 减少选择):**
```typescript
// 简化底栏标题
<div className="min-w-0 flex-1">
  <p className="text-sm font-semibold">{exerciseName}</p>
  <p className="text-xs text-slate-500">
    第 {setIndex + 1}/{totalSets} 组 · {completionPercent}%
  </p>
</div>
```

---

### 9. 帮助识别、诊断和从错误中恢复 (7/10) ⚠️

**优点:**
- 建设性错误消息
- 视觉错误状态（红色边框 + aria-invalid）
- Toast 通知

**问题:**
- 通用范围错误："应在 负无穷+ 之间"（令人困惑）
- 无错误恢复指导
- 网络错误无重试动作

**建议 (P1):**
```typescript
// 更好的错误消息
const rangeHint = effectiveRange?.min !== undefined && effectiveRange?.max !== undefined
  ? `请输入 ${effectiveRange.min}-${effectiveRange.max} 之间的数值`
  : effectiveRange?.max !== undefined
    ? `不能超过 ${effectiveRange.max}`
    : effectiveRange?.min !== undefined
      ? `不能低于 ${effectiveRange.min}`
      : '请输入有效数字';

// 添加同步重试
{syncState === 'offline' && (
  <Button size="compact" onClick={retrySync}>重试同步</Button>
)}
```

---

### 10. 帮助和文档 (6/10) ⚠️

**优点:**
- 键盘快捷键帮助面板
- 上下文助手："先填关键数据"
- 空状态指导

**严重缺口:**
- ❌ **无首次用户引导**
- ❌ **无 RIR 解释**（健身术语无提示）
- ❌ **疲劳评分无说明**（0-10 含义不清）
- ❌ **按钮上无键盘快捷键提示**

**建议 (P1):**
```typescript
// 添加健身术语提示
<label>
  RIR 
  <Tooltip content="Reps in Reserve: 完成后还能做几次">ⓘ</Tooltip>
</label>

// 按钮上显示快捷键提示
<Button title="快捷键: Enter">完成本组</Button>
<Button title="快捷键: Space">开始休息</Button>

// 首次使用引导标记
{isFirstWorkout && (
  <CoachMark target="set-input" position="bottom">
    输入重量和次数，按 Enter 完成本组
  </CoachMark>
)}
```

---

## 认知负荷分析

### 工作记忆过载 (Miller's Law 7±2)

**严重问题:**

1. **DailyEssentialsForm - 6 个同时字段:**
   - 优先修复：已实现 `priorityKeys` 模式 ✓
   - 但移动端仍显示 3 优先 + 3 补充 = 6 个
   - 建议：补充字段默认隐藏在 `<details>` 中 ✓（已实现）

2. **MobileCurrentSetCard - 8+ 决策点:**
   - 重量、次数、RIR 输入
   - 快速填充、复制上一组、复制记录
   - 添加组、删除组、完成当前组
   - **违反:** 同时选择太多
   - **修复:** 渐进式披露 - 仅在当前组完成后显示复制选项

3. **TodayOverview 次要操作:**
   - 显示 2 个但暗示还有更多
   - **好:** 限制可见为 2，使用 slice(0, 2)
   - **问题:** 无指示其他选项是什么

### 选择过载 (Hick's Law)

**反应时间 = a + b log₂(n+1)**

- **快速调整按钮:** 每字段 2 按钮 × 6 字段 = 12 个交互元素在小区域
- **Fitts's Law 违反:** 快速调整按钮太小（h-7, ~28px）在移动端难以点击
- **建议:** 触摸目标增加到 44×44px 最小值

```typescript
// 修复触摸目标
const buttonClass = 'h-11 min-w-11 px-2 text-sm' // 原: h-7 text-[11px]
```

---

## WCAG 2.1 Level AA 无障碍审计

### ✅ 可感知

**优点:**
- 颜色对比度达标（4.5:1）
- 所有图标有 aria-label
- 一致的焦点指示器

**问题:**
- Toast 自动关闭（2000ms 可能对屏幕阅读器用户太快）
- 无 `prefers-reduced-motion` 媒体查询
- 触摸目标低于 44px 最小值

### ✅ 可操作

**优点:**
- 完整的键盘导航
- 焦点管理良好
- 无键盘陷阱
- 跳过导航

**问题:**
- 休息计时器无暂停机制（可能违反 WCAG 2.2.1）
- 许多按钮低于 44×44px

### ✅ 可理解

**优点:**
- 一致的导航
- 错误识别（aria-invalid）
- 所有表单输入有标签

**问题:**
- 无 `lang` 属性（应为 `lang="zh-CN"`）
- 输入辅助显示错误但无修复建议

### ⚠️ 健壮

**优点:**
- 语义化 HTML
- ARIA 角色正确

**问题:**
- Toast 同时使用 `role` 和 `aria-live`（屏幕阅读器冗余）
- 部分点击处理器在 `<div>` 而非 `<button>`

---

## 优先级建议

### P0 - 严重（高影响，用户体验阻碍）

1. **❗ 添加完成组撤销功能**
   - 文件: `MobileCurrentExerciseView.tsx`
   - 影响: 防止意外完成的挫败感
   - 实现: Toast 带撤销按钮，5秒窗口

2. **❗ 减少组输入的认知负荷**
   - 文件: `MobileCurrentSetCard.tsx`
   - 影响: 更快的训练记录，减少精神疲劳
   - 实现: 渐进式披露 - 输入后隐藏复制选项

3. **❗ 触摸目标增加到 44px 最小值**
   - 文件: `DailyEssentialsForm.tsx`, `MobileWorkoutBottomBar.tsx`
   - 影响: 减少误触，改善移动 UX
   - 修复: 使用 `h-11 min-w-11` 替代 `h-7`

4. **❗ 添加破坏性操作确认**
   - 文件: `MobileCurrentExerciseView.tsx`（删除组、退出训练）
   - 影响: 防止数据丢失
   - 实现: 确认对话框或长按手势

### P1 - 高（改善核心体验）

5. **更好的错误消息与恢复建议**
6. **添加健身术语提示**
7. **按钮上的键盘快捷键提示**
8. **暂停/延长休息计时器**

### P2 - 锦上添花（精致）

9. **支持 prefers-reduced-motion**
10. **首次使用引导**
11. **离线同步重试 UI**

---

## 快速改进（简单修复，高影响）

### 1. 增加快速调整按钮尺寸（2 分钟）
```typescript
// DailyEssentialsForm.tsx line 66
const buttonClass = 'h-11 min-w-11 px-2 text-sm font-semibold'
```

### 2. 添加键盘提示（5 分钟）
```typescript
// MobileWorkoutBottomBar.tsx
<Button title="快捷键: Enter">下一动作</Button>
<Button title="快捷键: Space">开始休息</Button>
```

### 3. 更好的范围错误消息（5 分钟）
```typescript
// NumberField.tsx
const rangeHint = effectiveRange?.min && effectiveRange?.max
  ? `请输入 ${effectiveRange.min}-${effectiveRange.max} 之间的数值`
  : '请输入有效数字'
```

### 4. Toast 撤销操作（10 分钟）
```typescript
// Toast.tsx - 添加 action 属性
export type ToastMessage = {
  // ... 现有
  action?: { label: string; handler: () => void }
}

// 完成组时显示撤销
showToast({
  message: '第 3 组已完成',
  tone: 'success',
  action: { label: '撤销', handler: undoLastSet },
  duration: 5000
})
```

### 5. 添加 lang 属性（1 分钟）
```html
<!-- index.html -->
<html lang="zh-CN">
```

---

## 结论

LiftLog 展示了**强大的 UX 基础**，特别擅长：
- 全面的无障碍性（ARIA、键盘导航、焦点管理）
- 一致的设计系统和视觉层次
- 深思熟虑的渐进式披露模式
- 实时反馈和系统状态可见性

**提升 UX 从 82 到 90+ 的前 3 项改进:**
1. 添加完成组撤销功能（P0）
2. 所有触摸目标增加到 44px 最小值（P0）
3. 通过渐进式披露减少训练流程的认知负荷（P0）

应用已准备好投入生产，但在扩展到更大用户群之前，强烈建议先解决 P0 建议。

---

**评估完成日期:** 2026-06-07  
**使用的专业 Skills:**
- Nielsen Norman 启发式原则
- 认知心理学（Miller's Law, Hick's Law, Fitts's Law）
- WCAG 2.1 Level AA
- 设计系统最佳实践
