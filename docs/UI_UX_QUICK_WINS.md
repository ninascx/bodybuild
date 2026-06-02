# LiftLog UI/UX 快速修复清单

**目标：** 立即可执行的改进，无需重构，高影响低成本  
**预计时间：** 4-6小时  
**优先级：** 全部 P0

---

## ✅ 文案优化（30分钟）

### 任务：重命名标签页
**文件：** `src/App.tsx`

```typescript
// 第82-90行，修改 baseTabs 数组
const baseTabs: Array<{ key: TabKey; label: string }> = [
  { key: 'today', label: '概览' },      // 改：原为「今日」
  { key: 'profile', label: '设置' },    // 改：原为「个人」
  { key: 'plan', label: '计划' },       // 保持不变
  { key: 'daily', label: '日志' },      // 改：原为「记录」
  { key: 'workout', label: '训练' },    // 保持不变
  { key: 'dashboard', label: '趋势' },  // 改：原为「仪表盘」
  { key: 'weekly', label: '周报' },     // 保持不变
]
```

**验收：**
- [ ] 导航栏文字已更新
- [ ] 页面标题同步更新
- [ ] 刷新页面验证

---

## ✅ 简化同步状态文案（30分钟）

### 任务：缩短状态提示文字
**文件：** `src/App.tsx`

**修改位置和内容：**

```typescript
// 第200行附近
setSyncMessage('加载中...')  // 原：'正在连接服务器数据文件...'

// 第402行附近
setSyncMessage('已同步')  // 原：'已同步到服务器数据文件。'

// 第411行附近
setSyncMessage('离线模式，数据已缓存')  // 原：'服务器保存失败，已先保存在浏览器缓存；恢复连接后请再次保存。'

// 第534行附近
setSyncMessage('请登录后同步数据')  // 原：'请登录后同步个人数据。'

// 第613行附近
setSyncMessage('已同步')  // 原：'已同步到当前用户数据。'

// 第618行附近
setSyncMessage('离线模式，使用缓存')  // 原：'服务器连接失败，当前使用浏览器缓存；恢复连接后请再次保存。'

// 第663行附近
setSyncMessage('已同步')  // 原：'已同步到服务器数据文件。'
```

**验收：**
- [ ] 所有状态文案长度减少50%
- [ ] 移动端不会截断文字
- [ ] 语义保持清晰

---

## ✅ 移除冗余 Badge（1小时）

### 任务1：移除「今日」页面的中性 Badge
**文件：** `src/components/today/TodayOverview.tsx`

```typescript
// 第52-57行，删除或注释掉这段代码：
<div className="flex flex-wrap gap-2">
  <Badge tone={target.isTrainingDay ? 'positive' : 'neutral'}>
    {target.isTrainingDay ? '训练日' : '休息日'}
  </Badge>
  <Badge tone="neutral">{target.workoutName}</Badge>
</div>

// 改为纯文本显示：
<p className="text-sm text-slate-600 dark:text-slate-400">
  {target.isTrainingDay ? '训练日' : '休息日'} · {target.workoutName}
</p>
```

### 任务2：只在警告状态显示 Badge
**原则：** 全局搜索 `<Badge`，只保留 `tone="warning"` 和 `tone="danger"`

**验收：**
- [ ] 正常状态不显示 Badge
- [ ] 只在警告/错误时显示 Badge
- [ ] 页面视觉更清爽

---

## ✅ 统一卡片内边距（1小时）

### 任务：全局统一为 p-4
**方法：** 全局搜索替换

**搜索和替换：**
1. 搜索：`p-3 sm:p-4` → 替换：`p-4`
2. 搜索：`p-4 sm:p-5` → 替换：`p-4`
3. 搜索：`p-5` → 替换：`p-4`（仅在 Card 组件内）

**例外：** 保留以下特殊情况的 `p-3`
- 列表项内边距
- 小型卡片（如 Badge、Tag）
- 移动端紧凑布局

**验收：**
- [ ] 所有主要卡片内边距为 p-4
- [ ] 视觉对齐整齐
- [ ] 无明显过大或过小的间距

---

## ✅ 增大页面标题（15分钟）

### 任务：让页面标题更突出
**文件：** `src/components/layout/AppShell.tsx`

```typescript
// 第78行，修改页面标题样式
<h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
  {activeLabel}
</h1>

// 原样式：text-lg font-semibold tracking-tight sm:text-xl
// 新样式：text-2xl font-bold tracking-tight
```

**验收：**
- [ ] 页面标题明显变大
- [ ] 字重增加（semibold → bold）
- [ ] 移动端和桌面端一致

---

## ✅ 简化「今日」页面（2小时）

### 任务1：折叠「待补记录」区域
**文件：** `src/components/today/TodayOverview.tsx`

```typescript
// 第61-74行，修改「待补记录」区域
// 原：独立的 section 卡片
// 改：折叠为 StatusHero 中的一行提示

// 在 StatusHero 的 message 中添加待补提示
message={
  missingItems.length > 0
    ? `${todaySnapshot.headline}（还有 ${missingItems.length} 项待补）`
    : todaySnapshot.headline
}
```

### 任务2：只显示1个主要行动
**文件：** `src/components/today/TodayOverview.tsx`

```typescript
// 第96-109行，简化次要行动
// 原：显示所有 secondaryActions
// 改：只显示前2个，或移到下拉菜单

{secondaryActions.length > 0 && secondaryActions.length <= 2 ? (
  <div className="flex flex-wrap gap-2">
    {secondaryActions.slice(0, 2).map((action) => (
      <Button key={action} variant="secondary" className="px-3" onClick={...}>
        {action}
      </Button>
    ))}
  </div>
) : null}
```

**验收：**
- [ ] 「待补记录」不占用独立卡片
- [ ] 主要行动按钮突出
- [ ] 次要行动不超过2个

---

## ✅ 统一按钮高度（30分钟）

### 任务：确保所有按钮和输入框高度一致
**文件：** `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`

**验证和修复：**
1. Button 组件已有 `min-h-11`（第32行）✓
2. Input 组件需要添加 `min-h-11`
3. Select 组件需要添加 `min-h-11`

**修改 Input.tsx：**
```typescript
// 确保 className 包含 min-h-11
className={cn(
  'min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ...',
  className,
)}
```

**验收：**
- [ ] 所有按钮高度44px
- [ ] 所有输入框高度44px
- [ ] 表单字段视觉对齐

---

## ✅ 移除嵌套卡片阴影（30分钟）

### 任务：减少视觉噪音
**方法：** 为嵌套卡片创建变体

**文件：** `src/components/ui/Card.tsx`

```typescript
// 添加 variant 属性
export interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'nested'  // 新增
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
        variant === 'default' && 'shadow-sm',  // 只有 default 有阴影
        className,
      )}
    >
      {children}
    </section>
  )
}
```

**使用：**
```typescript
// 嵌套卡片使用 variant="nested"
<Card variant="nested">...</Card>
```

**验收：**
- [ ] 嵌套卡片无阴影
- [ ] 顶层卡片保留阴影
- [ ] 视觉层级清晰

---

## 📋 执行检查清单

### 开始前
- [ ] 创建新分支：`git checkout -b ui-ux-quick-fixes`
- [ ] 备份当前代码
- [ ] 确保开发环境正常

### 执行顺序（按优先级）
1. [ ] 文案优化（30分钟）
2. [ ] 简化同步状态文案（30分钟）
3. [ ] 增大页面标题（15分钟）
4. [ ] 统一按钮高度（30分钟）
5. [ ] 移除冗余 Badge（1小时）
6. [ ] 统一卡片内边距（1小时）
7. [ ] 移除嵌套卡片阴影（30分钟）
8. [ ] 简化「今日」页面（2小时）

### 完成后
- [ ] 本地测试所有页面
- [ ] 移动端测试（Chrome DevTools）
- [ ] 提交代码：`git commit -m "feat: UI/UX quick fixes"`
- [ ] 创建 PR 并请求评审

---

## 🎯 预期效果

完成这些快速修复后，你应该看到：

1. **导航更清晰**
   - 标签页名称更直观
   - 页面标题更突出

2. **视觉更清爽**
   - Badge 减少70%
   - 卡片阴影减少50%
   - 间距更统一

3. **文案更简洁**
   - 状态提示长度减少50%
   - 移动端不会截断

4. **「今日」页面更聚焦**
   - 信息块减少
   - 主要行动更突出

---

## ⚠️ 注意事项

1. **不要改变功能**：只改视觉和文案，不改逻辑
2. **保持响应式**：确保移动端和桌面端都正常
3. **测试深色模式**：所有改动都要在深色模式下测试
4. **逐项验收**：完成一项勾选一项，确保质量

---

**清单结束**
