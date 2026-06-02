# BodyBuild 设计系统规范

**版本：** 1.0  
**更新日期：** 2026-06-02
**状态：** 草稿

---

## 设计原则

基于 [PRODUCT.md](../PRODUCT.md) 的品牌个性：

1. **Calm（冷静）**：避免过度装饰，使用克制的颜色和动效
2. **Precise（精确）**：清晰的层级，一致的间距，准确的状态反馈
3. **Encouraging（鼓励）**：正向的文案，友好的提示，渐进式引导

---

## 一、字体系统

### 字号规范

```css
/* 标题 */
--text-3xl: 1.875rem;  /* 30px - 特大标题（暂未使用）*/
--text-2xl: 1.5rem;    /* 24px - 页面标题 H1 */
--text-xl: 1.25rem;    /* 20px - 大标题（暂未使用）*/
--text-lg: 1.125rem;   /* 18px - 卡片标题 H2 */
--text-base: 1rem;     /* 16px - 子标题 H3 */

/* 正文 */
--text-sm: 0.875rem;   /* 14px - 正文、按钮文字 */
--text-xs: 0.75rem;    /* 12px - 辅助文本、标签 */
```

### 字重规范

```css
--font-normal: 400;    /* 正文 */
--font-medium: 500;    /* 强调文本 */
--font-semibold: 600;  /* 卡片标题 */
--font-bold: 700;      /* 页面标题、数据值 */
```

### 使用示例

```tsx
// ✅ 正确
<h1 className="text-2xl font-bold">页面标题</h1>
<h2 className="text-lg font-semibold">卡片标题</h2>
<h3 className="text-base font-semibold">子标题</h3>
<p className="text-sm">正文内容</p>
<span className="text-xs text-slate-500">辅助文本</span>
<div className="text-2xl font-bold">75.2kg</div>  {/* 数据值 */}

// ❌ 错误
<h1 className="text-lg">页面标题</h1>  {/* 太小 */}
<h2 className="text-xl">卡片标题</h2>  {/* 太大 */}
<p className="text-base">正文内容</p>  {/* 太大 */}
```

---

## 二、颜色系统

### 主色（Primary - Teal / Cyan）

**用途：** 主要行动按钮、当前选择、聚焦状态、记录页和训练流里的主路径

```css
--teal-50: #f0fdfa;
--teal-100: #ccfbf1;
--teal-600: #0d9488;
--teal-700: #0f766e;
--cyan-400: #22d3ee;  /* 深色模式聚焦环 */
--cyan-600: #0891b2;  /* 深色模式主按钮 */
```

**使用原则：**
- ✅ 主要行动按钮（当前页面最重要的动作）
- ✅ 当前选中的 tab / segmented control / 训练步骤
- ✅ 焦点环和可操作状态
- ❌ 不用于大面积装饰背景
- ❌ 不用于所有卡片标题，避免页面读成单一色块

### 语义绿（Success - Emerald）

**用途：** 达标、完成、保存成功等正向状态

```css
--emerald-50: #ecfdf5;
--emerald-100: #d1fae5;
--emerald-500: #10b981;  /* 深色模式主色 */
--emerald-600: #059669;  /* 浅色模式主色 */
--emerald-700: #047857;
```

**使用原则：**
- ✅ 达标 / 已完成 / 保存成功
- ✅ 成功反馈里的小面积强调
- ❌ 不作为默认主按钮颜色
- ❌ 不用于普通说明文字

### 品牌橙（Accent - Orange）

**用途：** 品牌资产、少量强调、PWA 初始外壳颜色备选

```css
--orange-600: #c2410c;
```

**使用原则：**
- ✅ 图标、品牌资产或需要温度的强调
- ❌ 不与 teal/cyan 在同一层级争抢主操作
- ❌ 不用于错误或警告语义

### 中性色（Neutral - Slate）

**用途：** 文本、边框、背景

```css
/* 浅色模式 */
--slate-50: #f8fafc;   /* 次要背景 */
--slate-100: #f1f5f9;  /* 页面背景 */
--slate-200: #e2e8f0;  /* 边框 */
--slate-500: #64748b;  /* 辅助文本 */
--slate-600: #475569;  /* 次要文本 */
--slate-900: #0f172a;  /* 主要文本 */

/* 深色模式 */
--slate-800: #1e293b;  /* 次要背景 */
--slate-900: #0f172a;  /* 卡片背景 */
--slate-950: #020617;  /* 页面背景 */
```

### 状态色

**警告（Warning - Amber）**
```css
--amber-50: #fffbeb;
--amber-600: #d97706;  /* 警告状态 */
--amber-900: #78350f;
```

**错误（Danger - Rose）**
```css
--rose-50: #fff1f2;
--rose-600: #e11d48;   /* 错误状态 */
--rose-900: #881337;
```

### 颜色使用原则

```tsx
// ✅ 正确：只在需要强调状态时使用颜色
<Badge tone="warning">还差 200kcal</Badge>
<Badge tone="danger">超出 500kcal</Badge>

// ❌ 错误：正常状态不需要颜色强调
<Badge tone="positive">已达标</Badge>  {/* 改为纯文本 */}
<Badge tone="neutral">训练日</Badge>   {/* 改为纯文本 */}
```

---

## 三、间距系统

### 间距值

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
```

### 使用规范

**组件内边距（Padding）**
```tsx
// 卡片内边距：标准 p-4
<Card className="p-4">...</Card>

// 按钮内边距：px-4 py-2
<Button className="px-4 py-2">...</Button>

// 列表项内边距：紧凑 p-3
<li className="p-3">...</li>
```

**组件间距（Gap）**
```tsx
// 页面主区域：标准 gap-4
<div className="grid gap-4">...</div>

// 按钮组：紧凑 gap-2
<div className="flex gap-2">...</div>

// 表单字段：标准 gap-4
<form className="space-y-4">...</form>
```

**外边距（Margin）**
```tsx
// 优先使用 gap 而不是 margin
// ✅ 推荐
<div className="flex gap-2">
  <Button>按钮1</Button>
  <Button>按钮2</Button>
</div>

// ❌ 不推荐
<div className="flex">
  <Button className="mr-2">按钮1</Button>
  <Button>按钮2</Button>
</div>
```

---

## 四、圆角系统

### 圆角值

```css
--radius-sm: 0.375rem;  /* 6px - 按钮、输入框 */
--radius-md: 0.5rem;    /* 8px - 小卡片 */
--radius-lg: 0.5rem;    /* 8px - 主要卡片 */
--radius-xl: 0.75rem;   /* 12px - Hero 区块、EmptyState */
--radius-full: 9999px;  /* 圆形 - Badge、头像 */
```

### 使用规范

```tsx
// 卡片：rounded-lg
<Card className="rounded-lg">...</Card>

// 按钮：rounded-md
<Button className="rounded-md">...</Button>

// 输入框：rounded-md
<Input className="rounded-md" />

// Badge：rounded-full
<Badge className="rounded-full">...</Badge>
```

---

## 五、阴影系统

### 阴影值

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

### 使用原则

```tsx
// ✅ 正确：只有顶层卡片有阴影
<Card className="shadow-sm">
  <div className="border rounded-lg p-3">  {/* 嵌套卡片无阴影 */}
    嵌套内容
  </div>
</Card>

// ❌ 错误：嵌套卡片也有阴影
<Card className="shadow-sm">
  <Card className="shadow-sm">嵌套内容</Card>
</Card>
```

---

## 六、组件规范

### 按钮（Button）

**变体（Variant）**
```tsx
// Primary：主要行动（每页只有1个）
<Button variant="primary">开始训练</Button>

// Secondary：次要行动
<Button variant="secondary">查看详情</Button>

// Ghost：工具栏、低优先级操作
<Button variant="ghost">编辑</Button>

// Danger：危险操作
<Button variant="danger">删除</Button>
```

**尺寸**
```tsx
// 标准：min-h-11 px-4 py-2
<Button>标准按钮</Button>

// 紧凑：px-3
<Button className="px-3">紧凑</Button>

// 全宽：w-full
<Button className="w-full">全宽按钮</Button>
```

### 卡片（Card）

**变体**
```tsx
// 默认：有阴影
<Card>主要卡片</Card>

// 嵌套：无阴影
<Card variant="nested">嵌套卡片</Card>
```

**内边距**
```tsx
// 标准：p-4
<Card className="p-4">...</Card>

// 不要覆盖内边距
// ❌ 错误
<Card className="p-3">...</Card>
```

### 徽章（Badge）

**使用原则**
```tsx
// ✅ 只在警告和错误时使用
<Badge tone="warning">还差 200kcal</Badge>
<Badge tone="danger">超出阈值</Badge>

// ❌ 正常状态不使用 Badge
// 改为纯文本显示
<span className="text-sm text-slate-600">已达标</span>
```

### 输入框（Input）

**标准样式**
```tsx
<Input
  className="min-h-11 w-full rounded-md border border-slate-200 px-3 py-2"
  placeholder="请输入..."
/>
```

**表单字段**
```tsx
// 标签在上方
<div className="space-y-2">
  <label className="text-sm font-medium">体重</label>
  <Input type="number" />
  <p className="text-xs text-slate-500">单位：kg</p>
</div>
```

---

### 记录页信息架构

记录页是高频录入工具，不做仪表盘式重复总结。

- 首屏优先级：日期 → 常用录入 → 备注。
- 常用录入只保留每天最常用的 6 个数字：体重、热量、蛋白、步数、睡眠、疲劳。
- 目标值提示作为字段辅助说明，例如“目标 170g”，不要与 +/- 微调按钮挤在同一行，也不要另起一张“今日还差”卡重复字段信息。
- “填入昨天值”和“填入目标值”属于批量录入工具，放在常用录入区底部。
- 日历、围度、更多记录放进补充详情，避免打断日常录入。
- 复制当前日期记录和导出都属于低频动作，放在右上角“更多”菜单，不放在记录页主体。

---

## 七、响应式规范

### 断点

```css
/* Tailwind 默认断点 */
sm: 640px   /* 小屏幕（手机横屏、小平板）*/
md: 768px   /* 中屏幕（平板）*/
lg: 1024px  /* 大屏幕（桌面）*/
xl: 1280px  /* 超大屏幕 */
```

### 使用策略

**移动优先（Mobile First）**
```tsx
// ✅ 正确：默认移动端，sm: 以上适配桌面端
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  ...
</div>

// ❌ 错误：默认桌面端
<div className="grid grid-cols-3 sm:grid-cols-1">
  ...
</div>
```

### 常见模式

**导航栏**
```tsx
// 移动端：底部导航
// 桌面端：顶部导航
<nav className="fixed bottom-0 md:static md:top-0">
  ...
</nav>
```

**卡片布局**
```tsx
// 移动端：单列
// 平板：双列
// 桌面：三列
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  ...
</div>
```

**按钮**
```tsx
// 移动端：全宽
// 桌面端：自适应宽度
<Button className="w-full sm:w-auto">
  提交
</Button>
```

---

## 八、无障碍规范

### 触摸目标

**最小尺寸：44px × 44px**
```tsx
// ✅ 正确
<Button className="min-h-11">按钮</Button>  {/* 44px */}

// ❌ 错误
<button className="h-8">按钮</button>  {/* 32px，太小 */}
```

### 颜色对比度

**WCAG AA 标准**
- 正文文字：至少 4.5:1
- 大文字（18px+）：至少 3:1
- UI 组件：至少 3:1

```tsx
// ✅ 正确：足够的对比度
<p className="text-slate-900 dark:text-slate-100">
  正文内容
</p>

// ❌ 错误：对比度不足
<p className="text-slate-400">
  正文内容
</p>
```

### 键盘导航

**焦点样式**
```tsx
// 所有交互元素必须有焦点样式
<Button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
  按钮
</Button>
```

---

## 九、动效规范

### 过渡时间

```css
--duration-fast: 150ms;    /* 快速：hover、focus */
--duration-normal: 200ms;  /* 标准：颜色、背景 */
--duration-slow: 300ms;    /* 慢速：布局、位置 */
```

### 缓动函数

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### 使用原则

```tsx
// ✅ 正确：只过渡颜色相关属性
<Button className="transition-colors duration-200">
  按钮
</Button>

// ❌ 错误：过渡所有属性（性能差）
<Button className="transition-all duration-200">
  按钮
</Button>
```

### 尊重用户偏好

```css
/* 已在 index.css 中实现 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}
```

---

## 十、文案规范

### 按钮文案

**使用动词开头**
```tsx
// ✅ 正确
<Button>开始训练</Button>
<Button>保存修改</Button>
<Button>查看详情</Button>

// ❌ 错误
<Button>训练</Button>  {/* 不明确 */}
<Button>确定</Button>  {/* 太泛化 */}
```

### 状态文案

**简洁明确**
```tsx
// ✅ 正确
"加载中..."
"已同步"
"离线模式"

// ❌ 错误
"正在连接服务器数据文件..."  {/* 太长 */}
"已同步到服务器数据文件。"  {/* 冗余 */}
```

### 错误提示

**说明原因和解决方案**
```tsx
// ✅ 正确
"网络连接失败，请检查网络后重试"

// ❌ 错误
"错误"  {/* 不明确 */}
"操作失败"  {/* 没有解决方案 */}
```

---

## 十一、代码规范

### 组件命名

```tsx
// ✅ 正确：PascalCase
export function UserProfile() { ... }
export function DailyRecordTab() { ... }

// ❌ 错误
export function userProfile() { ... }
export function daily_record_tab() { ... }
```

### Props 命名

```tsx
// ✅ 正确：camelCase，语义清晰
interface ButtonProps {
  variant?: 'primary' | 'secondary'
  loading?: boolean
  onClick?: () => void
}

// ❌ 错误
interface ButtonProps {
  type?: string  {/* 太泛化 */}
  isLoading?: boolean  {/* 冗余的 is */}
}
```

### 类名顺序

**推荐顺序：布局 → 尺寸 → 间距 → 字体 → 颜色 → 其他**
```tsx
// ✅ 正确
<div className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700">
  ...
</div>

// ❌ 错误：顺序混乱
<div className="text-white hover:bg-emerald-700 flex bg-emerald-600 px-4 gap-2 py-2">
  ...
</div>
```

---

## 十二、检查清单

### 新组件检查

- [ ] 字号符合规范
- [ ] 间距符合规范
- [ ] 颜色使用克制
- [ ] 触摸目标≥44px
- [ ] 有焦点样式
- [ ] 响应式适配
- [ ] 深色模式适配
- [ ] 文案简洁明确

### 代码审查检查

- [ ] 组件命名规范
- [ ] Props 类型完整
- [ ] 类名顺序合理
- [ ] 无硬编码颜色
- [ ] 无硬编码间距
- [ ] 无重复代码

---

**规范结束**
