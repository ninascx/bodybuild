# 部署测试指南

## 🧪 测试项目是否可正常部署

按照以下步骤在本地测试：

---

## 步骤 1: 类型检查

```bash
cd C:\Users\www20\OneDrive\文档\bodybuild
npm run typecheck
```

**预期结果**: 无类型错误

**可能遇到的错误**:
- 缺少类型定义
- Props 不匹配
- 导入路径错误

---

## 步骤 2: Lint 检查

```bash
npm run lint
```

**预期结果**: 无 lint 错误或警告

**常见警告**:
- 未使用的变量
- 缺少 key prop
- 依赖数组问题

---

## 步骤 3: 构建测试

```bash
npm run build
```

**预期结果**: 
- ✅ TypeScript 编译成功
- ✅ Vite 构建成功
- ✅ Server 构建成功
- ✅ 生成 `dist/` 和 `dist-server/` 目录

**构建产物检查**:
```bash
# Windows
dir dist
dir dist-server

# 检查文件大小
npm run bundle:check
```

---

## 步骤 4: 本地开发测试

### 4.1 启动后端
```bash
npm run server:dev
```

**预期结果**: 
```
Server running on http://localhost:3001
Database connected
```

### 4.2 启动前端（新终端）
```bash
npm run dev
```

**预期结果**:
```
VITE v8.x.x ready in xxx ms
Local: http://localhost:5179/
```

### 4.3 浏览器测试

访问 `http://localhost:5179`

**测试清单**:
- [ ] 登录页面正常显示
- [ ] 可以登录（或注册）
- [ ] 侧边栏导航显示正常（桌面端）
- [ ] 可以切换标签页
- [ ] 键盘快捷键工作（Ctrl+1/2/3/4）
- [ ] 统计卡片显示 TrendIndicator
- [ ] 图表有 ChartToolbar
- [ ] 空状态显示友好
- [ ] 上下文栏显示（超宽屏 ≥1920px）
- [ ] 深色/浅色模式切换正常

---

## 步骤 5: 生产构建测试

```bash
npm run build
npm run start
```

访问 `http://localhost:3001`

**测试清单**:
- [ ] 生产构建可以启动
- [ ] 所有功能正常工作
- [ ] 性能正常（无明显卡顿）
- [ ] 控制台无错误

---

## 🔍 常见问题排查

### 问题 1: TypeScript 错误

**症状**: `npm run typecheck` 报错

**解决**:
```bash
# 重新安装依赖
npm install

# 清理缓存
rm -rf node_modules/.vite
npm run typecheck
```

### 问题 2: 导入错误

**症状**: `Cannot find module 'xxx'`

**检查**:
1. 文件是否存在
2. 导入路径是否正确
3. 导出语句是否正确

**示例**:
```tsx
// 错误
import { DailyContextRail } from './components/context/DailyContextRail'

// 正确
import { DailyContextRail } from '../components/context/DailyContextRail'
```

### 问题 3: Props 类型错误

**症状**: Type 'X' is not assignable to type 'Y'

**解决**:
1. 检查组件 Props 定义
2. 确保传入的数据类型正确
3. 添加必要的类型转换

### 问题 4: 构建失败

**症状**: `npm run build` 失败

**检查**:
```bash
# 查看详细错误
npm run build -- --debug

# 检查磁盘空间
df -h

# 清理后重试
rm -rf dist dist-server node_modules/.vite
npm install
npm run build
```

---

## 📊 性能检查

### Bundle 大小检查
```bash
npm run bundle:check
```

**预期**:
- Main bundle: < 500KB (gzipped)
- Vendor chunks: 合理分割
- No huge modules

### 运行时性能

打开 Chrome DevTools:
1. Performance tab
2. 录制 10 秒交互
3. 检查指标:
   - FPS: 应保持 60
   - Long tasks: < 50ms
   - Memory: 无泄漏

---

## 🐛 调试技巧

### 1. 查看构建产物
```bash
# 分析 bundle
npm install -g vite-bundle-visualizer
vite-bundle-visualizer
```

### 2. 检查运行时错误
```javascript
// 在浏览器控制台
// 查看所有错误
window.addEventListener('error', (e) => console.error('Error:', e))
window.addEventListener('unhandledrejection', (e) => console.error('Promise:', e))
```

### 3. React DevTools
- 安装 React DevTools 扩展
- 检查组件树
- 查看 Props 和 State
- 性能分析

---

## ✅ 完整测试脚本

保存为 `test-deployment.sh` (Linux/Mac) 或 `test-deployment.bat` (Windows):

### Linux/Mac
```bash
#!/bin/bash
set -e

echo "🧪 开始测试部署..."

echo "1️⃣ 类型检查..."
npm run typecheck

echo "2️⃣ Lint 检查..."
npm run lint

echo "3️⃣ 构建测试..."
npm run build

echo "4️⃣ Bundle 大小检查..."
npm run bundle:check

echo "✅ 所有测试通过！"
echo "📦 可以部署到生产环境"
```

### Windows
```batch
@echo off
echo 🧪 开始测试部署...

echo 1️⃣ 类型检查...
call npm run typecheck
if %errorlevel% neq 0 exit /b %errorlevel%

echo 2️⃣ Lint 检查...
call npm run lint
if %errorlevel% neq 0 exit /b %errorlevel%

echo 3️⃣ 构建测试...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo 4️⃣ Bundle 大小检查...
call npm run bundle:check
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✅ 所有测试通过！
echo 📦 可以部署到生产环境
```

运行：
```bash
# Linux/Mac
chmod +x test-deployment.sh
./test-deployment.sh

# Windows
test-deployment.bat
```

---

## 🚀 部署检查清单

在部署到生产环境前：

- [ ] 所有测试通过
- [ ] 无 TypeScript 错误
- [ ] 无 Lint 警告
- [ ] 构建成功
- [ ] Bundle 大小合理
- [ ] 本地测试正常
- [ ] 性能指标正常
- [ ] 浏览器兼容性测试
- [ ] 移动端测试
- [ ] 深色模式测试
- [ ] 数据库迁移（如需要）
- [ ] 环境变量配置
- [ ] 备份数据

---

## 📝 测试记录模板

```
测试日期: 2026-06-12
测试人员: [你的名字]
环境: [开发/预生产/生产]

类型检查: ✅/❌
Lint 检查: ✅/❌
构建测试: ✅/❌
功能测试: ✅/❌
性能测试: ✅/❌

问题记录:
1. [问题描述] - [解决方案]
2. ...

结论: ✅ 可以部署 / ❌ 需要修复
```

---

**创建日期**: 2026-06-12
**适用版本**: 所有阶段改进后
**预计测试时间**: 15-20 分钟
