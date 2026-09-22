<div align="center">
  <img src="./docs/banner.svg" alt="pi-web · Codex-style" width="100%" />
  <h1>pi-web · Codex-style</h1>
  <p><b>A cleaner, project-first UI for the <a href="https://github.com/earendil-works/pi">pi coding agent</a>.</b><br/>
  Click a folder, create a project, start chatting — without the sidebar clutter.</p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" />
    <img src="https://img.shields.io/badge/node-%E2%89%A522.19.0-brightgreen.svg" alt="Node >= 22.19.0" />
    <img src="https://img.shields.io/badge/UI-English%20%7C%20%E4%B8%AD%E6%96%87-blueviolet.svg" alt="i18n" />
    <a href="https://github.com/huangzx8090/pi-web/stargazers"><img src="https://img.shields.io/github/stars/huangzx8090/pi-web?style=social" alt="Stars" /></a>
  </p>
  <p><a href="./README.md">English</a> · <a href="./README.zh-CN.md">简体中文</a></p>
</div>

> ⚠️ **This is a personal fork**, not the official project. Upstream is
> [agegr/pi-web](https://github.com/agegr/pi-web). It is not published to npm.

Pi-web · Codex-style uses the **same local config and session files as pi**
(`~/.pi/agent`), so you keep every existing conversation, model, and skill —
only the interface is rethought around *projects*.

---

## Why this fork?

The original sidebar lists every conversation in a dense, flat tree. Once you
have a few projects and dozens of chats, it gets crowded fast. This fork
redesigns the whole sidebar after **Codex**:

- conversations become **single-line** rows, actions only appear on hover;
- everything is grouped **by project**, with the newest **5** chats shown first;
- there is a real **Create project** flow and a place for **archived** work.

If you like pi but find the UI busy, this is for you.

## ✨ Highlights

| | |
| --- | --- |
| 🧹 **Codex-style sidebar** | Single-line chats, hover-only actions, grouped by project, newest 5 with “Show N more”. |
| 📁 **Create projects** | Pick a name and a folder, then chat. Empty projects stay visible as “No chats yet”. |
| 🗑️ **Delete a project** | Removes the project **and all its conversation history** (the source folder is untouched). |
| 🗄️ **Archive** | Archive a whole project (its chats go with it) or a single conversation. Soft-hide, restore anytime, managed from a dialog. |
| ✨ **Automatic titles** | A new chat is titled from its **first message** — no button to click. Existing/renamed chats are never overwritten. |
| 🔎 **Native folder picker** | On macOS the Create-project dialog opens **Finder** directly; falls back to the in-app browser elsewhere. |
| 📌 **Pins** | Pin projects and conversations, reorder by dragging. |
| 🌏 **i18n** | English, 简体中文, 繁體中文. |

## 📸 Screenshots

> Add your own demo GIF and screenshots, then uncomment the block below —
> visuals are what sell the fork.
> Files: `docs/demo.gif`, `docs/sidebar.png`, `docs/create-project.png`.

<!--
<p align="center">
  <img src="./docs/demo.gif" alt="Codex-style sidebar demo" width="820" />
</p>
<p align="center">
  <img src="./docs/sidebar.png" alt="Codex-style sidebar" width="820" />
</p>
<p align="center">
  <img src="./docs/create-project.png" alt="Create project" width="820" />
</p>
-->

## 🚀 Quick start

Requires **Node.js 22.19.0+**.

```bash
git clone https://github.com/huangzx8090/pi-web.git
cd pi-web
npm install
npm run dev
```

Open <http://127.0.0.1:30141>. If no model is configured yet, open the
**Models** panel and sign in or add an API key.

Production:

```bash
npm run build
node bin/pi-web.js
# or install globally
npm install -g .
pi-web
```

## Differences from upstream

| Area | Upstream | This fork |
| --- | --- | --- |
| Sidebar rows | Two lines + always-visible actions | One line, hover actions |
| Grouping | Flat list / recent projects | Project groups with indent + collapse |
| Project lifecycle | Implicit (derived from cwd) | Create / delete / archive |
| Session titles | Manual button | Automatic from the first message |
| Folder picking | In-app browser | Native macOS Finder (+ fallback) |
| Cost display | USD | CNY |

Everything else — agent turns, branching, file explorer, Git worktrees, model
and skill config — is inherited from upstream.

## Data

This fork stores its own state next to pi's session files:

| File | Contents |
| --- | --- |
| `~/.pi/agent/pi-web/projects.json` | Projects you created |
| `~/.pi/agent/pi-web/archive.json` | Archived projects / conversations |
| `~/.pi/agent/pi-web/pins.json` | Pinned projects / conversations |

Deleting or archiving only affects **conversation history files**; your project
source folders are never deleted.

## Staying in sync with upstream

```bash
git fetch origin
git rebase origin/main
git push --force-with-lease fork main
```

## Credits & license

Built on [agegr/pi-web](https://github.com/agegr/pi-web) and
[earendil-works/pi](https://github.com/earendil-works/pi).

[MIT](./LICENSE)

<div align="center"><sub>If this saves you time, a ⭐ helps others find it.</sub></div>
