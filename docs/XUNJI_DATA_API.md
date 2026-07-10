# 训记训练、饮食与身体数据接入

浏览器只访问本项目的 `/api`。训记 Key 保存在服务端，调用训记时通过
`Authorization: Bearer <token>` 请求头发送，不写入日志、URL 或导出文件。

## 连接配置

“设置 > 个人 > 训记连接”统一管理训练、饮食和身体三类 Key。账户 Key 优先于环境变量；
移除账户 Key 后会恢复使用环境配置。

| 功能 | 路径 |
| --- | --- |
| 读取三类连接能力 | `GET /api/integrations/xunji/connections` |
| 验证并保存 Key | `POST /api/integrations/xunji/connections/:kind/validate` |
| 移除账户 Key | `DELETE /api/integrations/xunji/connections/:kind` |

`:kind` 为 `training`、`food` 或 `body`。验证成功后才保存候选 Key；响应包含
`configured`、`source`、`maskedKey`、`capabilities`、`validationStatus` 和 `validatedAt`。

旧版训练配置和饮食/身体配置路由保留一个兼容周期。

## 从训记导入每日数据

“从训记导入”可以选择训练、饮食汇总和身体数据。三类来源独立处理：

- 未配置的来源不可选，并提供设置入口。
- 饮食和身体预览分别返回 `ready`、`empty`、`unavailable` 或 `error`。
- 单个来源失败不阻止其他来源导入。
- 冲突字段默认不选；没有选中字段时不能提交。
- 结果按来源展示成功数量、无数据或错误，并可只重试失败来源。

| 功能 | 路径 |
| --- | --- |
| 查询饮食原始数据 | `POST /api/xunji/food/records/query` |
| 查询身体原始数据 | `POST /api/xunji/body/records/query` |
| 预览饮食/身体导入 | `POST /api/xunji/daily-sync/:date/preview` |
| 提交选中字段 | `POST /api/xunji/daily-sync/commit` |
| 导入当天训练 | `POST /api/xunji/sync/:date` |

饮食只更新 `calories`、`protein`、`carbs`、`fat`，不提供食物搜索、自定义食物、
模板或饮食写回能力。

## 本地身体记录与写回

身体数据采用“本地记录后按需同步”的模型。编辑输入只保存本项目，不调用训记。
当天所有非训记来源记录可一次选择、dry-run、确认并写回。

| 功能 | 路径 |
| --- | --- |
| 保存本地身体数据 | `POST /api/body-records` |
| 删除本地身体数据 | `DELETE /api/body-records/:date/:type` |
| 写回预检 | `POST /api/xunji/body/records/preview` |
| 确认写回 | `POST /api/xunji/body/records/commit` |

写回必须使用十分钟内相同内容的预检，并在提交时携带 `confirmed: true`。预检响应包含
限频等待时间；写回成功响应包含持久化后的标准 `bodyRecords`，客户端必须以此覆盖本地记录。

删除本地记录不会删除训记中的记录。

## 错误与限频

- Key 未配置或失效：引导到“训记连接”重新配置。
- `仅VIP可用`：明确提示对应接口需要训记 VIP。
- `too frequent`：返回 `retryAfterMs`，界面显示倒计时。
- 预检过期：重新执行预检，不复用旧确认。

身体公开字段继续使用 `datestr`、`type`、`value`、`unit`、`label`、`label_en`；
历史拼写 `weist` 保持不变。`origin` 和同步时间仅用于本项目展示“仅本地、待同步、已同步、旧数据”。
