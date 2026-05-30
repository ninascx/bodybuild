# 表单标准规范

本文档定义了 BodyBuild 应用中表单的统一样式和使用模式。

## 核心组件

### Field 组件
所有表单字段的标准包装器，提供统一的标签、错误提示和辅助文本。

```tsx
<Field label="字段名称" error={errorMessage} helper="辅助说明">
  <TextInput value={value} onChange={onChange} />
</Field>
```

**特性：**
- 标签位置：字段上方
- 错误提示：字段下方，红色文字，带 `role="alert"`
- 辅助文本：字段下方，灰色小字
- 间距：`gap-1.5` 统一间距
- 无障碍：自动添加 `aria-describedby` 和 `aria-invalid`

### NumberField 组件
数字输入的专用组件，内置验证和错误处理。

```tsx
<NumberField 
  label="体重 kg" 
  value={weight} 
  range={{ min: 20, max: 300 }} 
  onChange={setWeight} 
/>
```

**特性：**
- 自动范围验证
- 支持整数/小数
- 超出范围时自动显示错误提示
- 内部使用 Field 组件

## 布局模式

### 响应式网格
```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <NumberField label="字段1" ... />
  <NumberField label="字段2" ... />
</div>
```

**断点：**
- 移动端（< 640px）：单列
- 平板（≥ 640px）：2列
- 桌面（≥ 1024px）：3-5列

### 表单区块
```tsx
<FormSection title="区块标题">
  {/* 表单字段 */}
</FormSection>
```

## 样式规范

### 字段高度
- 标准字段：`h-11` (44px)
- 快速录入：`h-12` (48px) - 更大的触摸目标

### 间距
- 字段间距：`gap-3` (12px)
- 标签与输入：`gap-1.5` (6px)
- 区块间距：`gap-4` (16px)

### 颜色
- 标签：`text-slate-700 dark:text-slate-300`
- 错误：`text-rose-600 dark:text-rose-400`
- 辅助：`text-slate-500 dark:text-slate-400`

## 使用示例

### 基础表单
```tsx
<FormSection title="基础资料">
  <div className="grid gap-3 md:grid-cols-2">
    <Field label="姓名">
      <TextInput value={name} onChange={setName} />
    </Field>
    <NumberField 
      label="年龄" 
      value={age} 
      range={{ min: 1, max: 150 }} 
      onChange={setAge} 
    />
  </div>
</FormSection>
```

### 带验证的表单
```tsx
<Field label="邮箱" error={emailError}>
  <TextInput 
    type="email" 
    value={email} 
    onChange={handleEmailChange} 
  />
</Field>
```

## 注意事项

1. **始终使用 Field 包装器** - 确保标签、错误提示和无障碍属性一致
2. **数字输入用 NumberField** - 自动处理验证和格式化
3. **响应式布局** - 使用网格系统适配不同屏幕
4. **错误提示即时显示** - 不要等到提交时才显示错误
5. **保持简洁** - 避免过多的辅助文本，只在必要时使用
