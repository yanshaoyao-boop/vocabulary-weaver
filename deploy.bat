@echo off
chcp 65001 >nul
echo ==========================================
echo       Vocabulary Weaver 部署脚本
echo ==========================================
echo.
echo 正在准备部署到 GitHub...
echo.

:: 1. Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Git。请先下载并安装 Git: https://git-scm.com/
    pause
    exit /b
)

:: 2. Initialize Git if not already
if not exist ".git" (
    echo [信息] 初始化 Git 仓库...
    git init
    git add .
    git commit -m "Initial commit"
) else (
    echo [信息] Git 仓库已存在，添加新更改...
    git add .
    git commit -m "Update for deployment"
)

echo.
echo ==========================================
echo [重要步骤] 请按照以下步骤操作：
echo 1. 打开浏览器访问: https://github.com/new
echo 2. 创建一个名为 vocabulary-weaver 的新仓库 (Public)
echo 3. 不要勾选 Initialize README/gitignore
echo 4. 创建成功后，复制 HTTPS 链接 (例如 https://github.com/Username/Repo.git)
echo ==========================================
echo.

set /p RepoUrl="请粘贴您的 GitHub 仓库链接并回车: "

if "%RepoUrl%"=="" (
    echo [错误] 链接不能为空！
    pause
    exit /b
)

:: 3. Add Remote and Push
echo.
echo [信息] 正在关联远程仓库...
git remote remove origin >nul 2>nul
git remote add origin %RepoUrl%

echo.
echo [信息] 正在推送到 GitHub (可能需要登录)...
git branch -M main
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo [错误] 推送失败。请检查网络或是否已登录 GitHub。
    echo 如果是第一次使用，可能需要输入账号密码或 Token。
    pause
    exit /b
)

echo.
echo ==========================================
echo             部署成功！ (1/2)
echo ==========================================
echo.
echo [最后一步] 开启 GitHub Pages:
echo 1. 在浏览器打开您的仓库页面
echo 2. 点击顶部 "Settings" (设置)
echo 3. 左侧栏找到 "Pages"
echo 4. 在 "Build and deployment" -> "Branch" 下选择 "main" 分支
echo 5. 点击 "Save"
echo.
echo 等待约 1-2 分钟，您将获得通过手机访问的链接！
echo.
pause
