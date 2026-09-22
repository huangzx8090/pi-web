# Pi Web · 个人改进版（类 Codex）

> 这是基于 [agegr/pi-web](https://github.com/agegr/pi-web) 的 **个人 fork / 改进版**，目标是把 Pi Web 的使用体验做得更接近 **Codex**：侧边栏更清爽、以项目为中心、对话标题自动生成。
> **不是官方仓库**，也不发布到 npm；官方版本请看上游 [agegr/pi-web](https://github.com/agegr/pi-web)。

Pi Web 是 [pi coding agent](https://github.com/earendil-works/pi) 的本地浏览器界面，和 pi 共用本机配置与会话文件。这个版本保留原有全部能力，重点重做了**侧边栏，以及项目与对话的组织方式**。

---

## 使用上的优化

### 1. 类 Codex 的清爽侧边栏
- 对话列表改成**单行**：时间、消息数、分支等信息收进 hover 提示；置顶 / 归档 / 重命名 / 删除按钮只在 hover 时出现，不占视觉空间。
- **按项目分组**，项目下的对话缩进显示，层级一眼看清。
- 每个项目默认只显示**最近 5 个对话**，其余收在「展开其余 N 个」里，列表不再臃肿。
- 支持**置顶项目 / 置顶对话**，可拖动排序。
- 去掉了重复的「新对话」整行、常驻的「仅 Git 仓库根目录」提示等冗余控件，整体更通透。

### 2. 以项目为中心
- **创建项目**：填项目名 + 直接选择电脑上的文件夹，创建后立刻可以开聊；还没有对话的项目也会保留在列表里（显示「暂无聊天」）。
- **删除项目**：连同该项目下的**所有对话历史**一起删除（级联删除子智能体），磁盘上的项目源码文件夹**不会**被删除。
- **归档**：可以**按项目归档**（里面的对话一起归档），也可以**单独归档某个对话**。归档是软隐藏，文件仍在磁盘上，随时可恢复。
- 归档内容收进右上角的**弹窗**，不占侧边栏空间。

### 3. 对话标题自动生成
- 新建对话发出**第一条消息后自动生成标题**，不用再手动点按钮。
- 只对本次新建的对话生效，不会为浏览旧对话而偷偷消耗 token；手动改过名字的对话不会被覆盖。

### 4. 原生文件夹选择（macOS）
- 创建项目 / 自定义工作目录时**直接弹出 Finder 选择框**；非 macOS 或没有图形界面时自动回退到应用内目录浏览。

### 5. 本地启动体验
- 从哪个目录启动 pi-web，就默认用哪个目录作为工作区。
- macOS 下以**独立 Chrome 应用窗口**打开，更接近一个桌面应用。
- 附带一个实例管理页（`/instances.html`）。
- 费用显示默认换算为**人民币**。

---

## 安装与运行

需要 Node.js **22.19.0** 或更高版本。

```bash
git clone https://github.com/huangzx8090/pi-web.git
cd pi-web
npm install
npm run dev
```

开发服务器运行在 <http://127.0.0.1:30141>。

生产模式：

```bash
npm run build
node bin/pi-web.js
# 或全局安装本仓库
npm install -g .
pi-web
```

首次使用如果还没有配置模型，请打开界面里的 **Models** 面板登录或填写 API Key。

---

## 数据位置

本版本新增的数据写在 pi 的 agent 目录下，与上游会话文件放在一起：

| 文件 | 内容 |
| --- | --- |
| `~/.pi/agent/pi-web/projects.json` | 手动创建的项目 |
| `~/.pi/agent/pi-web/archive.json` | 已归档的项目 / 对话 |
| `~/.pi/agent/pi-web/pins.json` | 置顶的项目 / 对话 |

删除或归档只影响**对话历史文件**，不会删除你的项目源码目录。

---

## 与上游的关系

- 本仓库是 [agegr/pi-web](https://github.com/agegr/pi-web) 的 fork，保留上游历史与 MIT 协议。
- 同步上游更新：

  ```bash
  git fetch origin
  git rebase origin/main
  git push --force-with-lease fork main
  ```

- 其中「独立 Chrome 窗口 / 实例管理」等属于**本地个性化定制**，与上游的通用功能无关，提 PR 时建议拆分。

---

## 致谢与许可

基于 [agegr/pi-web](https://github.com/agegr/pi-web) 与 [pi](https://github.com/earendil-works/pi)。

[MIT](./LICENSE)
