# Bodybuild Tracker

个人减脂增肌追踪网站。前端使用 Vite + React + TypeScript + Tailwind CSS，数据通过 Node/Express API 保存到服务器目录中的 JSON 文件。

## 本地开发

安装依赖：

```bash
npm install
```

启动后端 API：

```bash
npm run server:dev
```

另开一个终端启动前端：

```bash
npm run dev
```

前端默认访问：

```text
http://127.0.0.1:5173
```

后端默认监听：

```text
http://127.0.0.1:8787
```

## 数据文件

默认数据文件：

```text
./data/bodybuild-data.json
```

可以用环境变量覆盖：

```bash
BODYBUILD_DATA_FILE=/var/lib/bodybuild/bodybuild-data.json npm run start
```

首次启动时，如果文件不存在，服务会自动创建空数据文件。

数据文件会保存：

- 每日记录
- 训练记录
- 今日任务勾选状态
- 自定义训练模板

训练模块支持从内置计划或自定义模板快速生成当天训练，也可以只编辑当天动作和组数；当天编辑不会反向修改模板。

## 生产部署

在服务器上构建：

```bash
npm install
npm run build
```

启动服务：

```bash
PORT=8787 BODYBUILD_DATA_FILE=/var/lib/bodybuild/bodybuild-data.json npm run start
```

Nginx 反向代理示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 常用命令

```bash
npm run test
npm run build
npm run start
```

## 注意

当前版本公开无密码访问。任何能访问站点的人都可能查看或修改数据。建议只放在可信网络，或后续增加 Basic Auth / 登录保护。
