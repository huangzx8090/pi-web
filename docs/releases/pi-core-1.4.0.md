# 定制版 Pi Web：升级 Pi 核心至 1.4.0

本次从定制版提交 `33654ab` 升级，保留现有侧边栏、标题模型设置、文件面板和本机启动逻辑。Pi Web 的应用版本号仍为定制版的 `0.9.1`，内嵌 Pi SDK 从 `0.85.1` 升至 `1.4.0`；安装终端 Pi 不会替换 Web 内嵌的 SDK。

## 核心兼容

- 将七个 `@earendil-works/pi-*` 包全部锁定为 `1.4.0`，并检查依赖树不存在嵌套的另一版本，避免独立安装时出现内部包混用。
- 新版 Pi 将系统提示词和工具配置写入会话记录。聊天、分支预览和 SSE 隐藏这些系统消息；统计继续覆盖完整记录，并计入缓存预热的 usage。
- 用 `before_agent_start` 内部扩展传递纯聊天及替换模式子代理的完整提示词，避免写入新版只读的 `agent.state.systemPrompt`。纯聊天也绑定这个内部桥接，第三方扩展、技能和工具仍保持禁用。
- 适配新的 prompt 预检结果以及 steer/follow-up 返回值；生成短标题前规范化模型上下文；保持原有标题模型和分支逻辑。
- 调整会话列表的同时间排序，以及用户消息立即保存后的分支测试。

主要参考上游兼容提交 [`da1b28b`](https://github.com/agegr/pi-web/commit/da1b28b) 和 [`v0.13.0`](https://github.com/agegr/pi-web/releases/tag/v0.13.0) 的依赖锁定方式。

## 回移的上游改进

| 改进 | 行为 | 上游提交 |
| --- | --- | --- |
| 命令搜索 | 优先匹配命令名，技能可以直接按名称搜索；无名称匹配时再搜索描述 | [`1fefdf0`](https://github.com/agegr/pi-web/commit/1fefdf0) |
| Mac 快捷键 | `Ctrl+Option+N` 正确处理 Option+N 产生的 Dead key，同时保留 AltGr 字符输入 | [`e533d9b`](https://github.com/agegr/pi-web/commit/e533d9b) |
| 同名模型筛选 | 裸模型名可以匹配多个提供商，并显示歧义提示 | [`5c033d2`](https://github.com/agegr/pi-web/commit/5c033d2) |
| 完成通知 | 手动停止的任务不发成功完成通知；没有启动代理运行的扩展命令不误发完成通知 | [`86dea26`](https://github.com/agegr/pi-web/commit/86dea26)、[`d4849e4`](https://github.com/agegr/pi-web/commit/d4849e4) |

## 验证

```bash
npm test
npm run lint
node_modules/.bin/tsc --noEmit
npm run build
E2E_SERVER_MODE=start npm run test:e2e
```

另用隔离的配置和临时项目验证真实模型的 read 工具、流式事件、会话分支，以及纯聊天的完整上下文提示词。验收只创建临时会话，不改写个人历史会话。

本机未提交的壁纸 CSS 调整独立保留，不包含在本次提交中。
