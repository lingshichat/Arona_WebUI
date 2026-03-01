# WebUI 登录凭证迁移说明（2026-03-01）

## 背景

本次更新后，WebUI 登录逻辑改为校验“用户名 + 密码”。
此前运行环境未显式设置登录环境变量，导致默认用户名生效（`admin`），从而出现“账号不认识”的现象。

## 本次变更内容

### 1) 服务配置改为读取环境文件

`/etc/systemd/system/openclaw-mvp.service` 中已改为：

- 保留：
  - `Environment=NODE_ENV=production`
  - `Environment=PORT=18790`
- 新增：
  - `EnvironmentFile=-/etc/default/openclaw-mvp`

说明：
- 前缀 `-` 表示该文件缺失时不阻塞启动。

### 2) 凭证从服务文件中移出，写入独立环境文件

已创建：`/etc/default/openclaw-mvp`

当前内容（示例，敏感信息已脱敏）：

- `WEBUI_USERNAME=<your-username>`
- `WEBUI_PASSWORD=<your-password>`

并已设置权限：`600`（仅 root 可读写）。

### 3) 已完成生效验证

执行了：

- `systemctl daemon-reload`
- `systemctl restart openclaw-mvp`

验证结果：

- 服务状态 `active (running)`
- 使用新账号密码调用 `/api/login` 返回 `200`

## 行为说明

- WebUI 登录用户名优先读取 `WEBUI_USERNAME`（兼容旧变量 `GATEWAY_USERNAME`），未设置时默认 `admin`。
- WebUI 登录密码优先读取 `WEBUI_PASSWORD`，未设置时回退到网关配置中的密码/令牌。
- Gateway WebSocket 连接认证不再使用 WebUI 登录变量，避免出现“登录能过但网关 unauthorized”的冲突。

## 与 Git 的关系

- 以上配置位于系统路径（`/etc/systemd/system` 与 `/etc/default`），不在项目仓库内。
- `git pull` 只更新仓库文件，不会覆盖上述系统级环境配置。

## 后续维护

如需修改登录账号或密码：

1. 编辑 `/etc/default/openclaw-mvp`
2. 执行 `systemctl restart openclaw-mvp`
3. 重新登录验证

