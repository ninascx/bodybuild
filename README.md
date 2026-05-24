# 减脂增肌追踪

个人减脂增肌日常记录工具。围绕"记录→反馈→调整"循环设计，覆盖每日饮食、训练、体测和趋势分析。

**技术栈**: Vite + React 19 + TypeScript + Tailwind CSS v4，数据通过 Node/Express API 持久化为服务器端 JSON 文件。PWA 离线可用。

## 功能概览

五个标签页：

| 标签 | 功能 |
|---|---|
| **今日** | 当天训练计划预览、一键勾选（饮食/训练/步数/睡眠）、本周热量预算、宏量营养剩余额度、肩部保护提醒 |
| **记录** | 体重/热量/蛋白质/步数/睡眠快捷输入、是否训练切换、6 周迷你日历、围度与身体状态补充记录 |
| **训练** | 日期与计划选择、当天动作组次记录（kg/次数/RIR）、上次成绩自动对照、PR 标记、快速填充空组、自定义模板管理 |
| **仪表盘** | 体重/腰围/热量/蛋白质/肩痛趋势图、训练表现曲线、本周 KPI 与上周对比 |
| **周报** | 周均体重/腰围变化/训练完成率/热量总结、周末规则检查、下一周建议 |

## 内置训练计划

5 天分化 + 周末休息：

| 日 | 计划 | 重点 |
|---|---|---|
| 周日 | 推 A | 胸部主刺激 |
| 周一 | 拉 A | 背阔 + 后束 |
| 周二 | 腿 | 完整下肢 |
| 周三 | 推 B | 上胸与胸型 |
| 周四 | 拉 B + 腿部补量 | 背部 + 下肢补量 |
| 周五、六 | 休息 / 自由饮食 | 恢复与活动量 |

内置计划只读；如需调整，可用"从当前训练保存为模板"或"新建模板"创建自定义副本。

## 训练记录亮点

- **动作卡片自动折叠** — 全部组填完后自动收起，减少滚动
- **只看未填写** — 分段控件快速筛选未完成的动作
- **折叠全部/展开全部** — 一键控制所有动作卡片
- **快速填充空组** — 套用上次重量，或复制已填组到同动作空组
- **上次成绩对照** — 每个动作自动查找历史最佳重量和 PR 标记
- **快速跳转条** — 粘性导航条，长列表中快速跳到指定动作

## 本地开发

```bash
npm install
```

启动后端 API：

```bash
npm run server:dev
```

另开终端启动前端：

```bash
npm run dev
```

- 前端 `http://127.0.0.1:5173`
- 后端 `http://127.0.0.1:8787`

## 数据文件

默认路径：

```
./data/bodybuild-data.json
```

环境变量覆盖：

```bash
BODYBUILD_DATA_FILE=/var/lib/bodybuild/bodybuild-data.json npm run start
```

首次启动时文件不存在会自动创建。数据结构：

- 每日记录（体重、热量、蛋白质、碳水、脂肪、步数、睡眠、围度、身体状态）
- 训练记录（日期、名称、动作列表、每组重量/次数/RIR）
- 自定义训练模板

默认绑定 `127.0.0.1`。如需同一局域网内的手机访问，设置 `BODYBUILD_BIND=0.0.0.0`。建议只在受信任网络中使用。

训练记录与模板独立——当天编辑不会反向修改模板。

## 生产部署

```bash
npm install
npm run build
PORT=8787 BODYBUILD_DATA_FILE=/var/lib/bodybuild/bodybuild-data.json npm run start
```

Nginx 反向代理：

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

## 导入导出

页面顶部提供 JSON 导入/导出。导出会备份全部数据（记录 + 任务 + 模板），导入前自动下载当前数据快照、确认后覆盖。

## 注意

当前版本无登录鉴权。建议部署在可信网络内，或通过 Nginx Basic Auth / 反向代理层加保护。
