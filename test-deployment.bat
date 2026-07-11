@echo off
echo ========================================
echo   LiftLog 部署测试
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 类型检查中...
call npm run typecheck
if %errorlevel% neq 0 (
    echo ❌ 类型检查失败
    pause
    exit /b 1
)
echo ✅ 类型检查通过
echo.

echo [2/4] Lint 检查中...
call npm run lint
if %errorlevel% neq 0 (
    echo ❌ Lint 检查失败
    pause
    exit /b 1
)
echo ✅ Lint 检查通过
echo.

echo [3/4] 构建测试中...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建成功
echo.

echo [4/4] Bundle 大小检查中...
call npm run bundle:check
if %errorlevel% neq 0 (
    echo ⚠️  Bundle 大小超出预期（警告）
) else (
    echo ✅ Bundle 大小正常
)
echo.

echo ========================================
echo   ✅ 所有测试通过！
echo   📦 项目可以部署
echo ========================================
echo.
echo 下一步:
echo 1. 运行 'npm run start' 测试生产构建
echo 2. 访问 http://localhost:3001 验证功能
echo 3. 确认无误后可以部署到生产环境
echo.
pause
