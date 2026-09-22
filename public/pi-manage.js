// Pi Web 管理中心（应用内左抽屉）
// - 由 pi-web 的注入按钮按需加载：window.__piWebManage.toggle()
// - 也可作为独立页使用：window.__piWebManage.open({ full: true })
(function () {
  if (window.__piWebManage) return;

  var state = {
    home: "",
    sessions: [],
    running: {},
    instances: [],
    filter: "",
    tab: "projects",
    open: false,
    full: false,
    busy: false,
  };
  var root, backdrop, bodyEl, statusEl, summaryEl, searchEl, toolbarEl, closeBtn;
  var timer = null;

  var STYLE = [
    "#pi-manage-root{--pm-bg:var(--bg-panel,#f7f7f8);--pm-bg2:var(--bg,#fff);--pm-hover:var(--bg-hover,#efeff1);--pm-sel:var(--bg-selected,#e8eefc);--pm-border:var(--border,#e2e2e4);--pm-text:var(--text,#1c1c1e);--pm-muted:var(--text-muted,#6b7280);--pm-dim:var(--text-dim,#9aa0a6);--pm-accent:var(--accent,#2563eb);--pm-danger:#dc2626;",
    "position:fixed;top:0;left:0;bottom:0;z-index:999999;width:min(560px,94vw);display:none;flex-direction:column;background:var(--pm-bg);color:var(--pm-text);border-right:1px solid var(--pm-border);box-shadow:10px 0 30px rgba(0,0,0,.18);font:13px/1.55 -apple-system,BlinkMacSystemFont,\"Segoe UI\",system-ui,sans-serif}",
    "@media (prefers-color-scheme:dark){#pi-manage-root{--pm-bg:var(--bg-panel,#202021);--pm-bg2:var(--bg,#1a1a1a);--pm-hover:var(--bg-hover,#2a2a2c);--pm-sel:var(--bg-selected,#233046);--pm-border:var(--border,#333336);--pm-text:var(--text,#e6e6e6);--pm-muted:var(--text-muted,#a1a1a6);--pm-dim:var(--text-dim,#77777d);--pm-accent:var(--accent,#7aa7ff);--pm-danger:#f28b82}}",
    "#pi-manage-backdrop{position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,.3);display:none}",
    "#pi-manage-root.pm-full{width:100vw;border-right:0;box-shadow:none}",
    "#pi-manage-root *{box-sizing:border-box}",
    "#pi-manage-root .pm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:13px 16px 10px}",
    "#pi-manage-root .pm-title{font-size:15px;font-weight:700}",
    "#pi-manage-root .pm-sub{color:var(--pm-muted);font-size:12px}",
    "#pi-manage-root .pm-iconbtn{appearance:none;border:0;background:none;color:var(--pm-muted);font-size:22px;line-height:1;cursor:pointer;padding:0 4px;border-radius:6px}",
    "#pi-manage-root .pm-iconbtn:hover{color:var(--pm-text);background:var(--pm-hover)}",
    "#pi-manage-root .pm-tabs{display:flex;gap:4px;padding:0 12px;border-bottom:1px solid var(--pm-border)}",
    "#pi-manage-root .pm-tab{appearance:none;border:0;background:none;color:var(--pm-muted);font:inherit;font-weight:500;padding:8px 10px;border-bottom:2px solid transparent;cursor:pointer}",
    "#pi-manage-root .pm-tab:hover{color:var(--pm-text)}",
    "#pi-manage-root .pm-tab.active{color:var(--pm-accent);border-bottom-color:var(--pm-accent)}",
    "#pi-manage-root .pm-toolbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--pm-border)}",
    "#pi-manage-root .pm-toolbar input{flex:1;min-width:0;height:32px;padding:0 10px;border:1px solid var(--pm-border);border-radius:7px;background:var(--pm-bg2);color:var(--pm-text);font:inherit;outline:none}",
    "#pi-manage-root .pm-toolbar input:focus{border-color:var(--pm-accent)}",
    "#pi-manage-root .pm-muted{color:var(--pm-muted);font-size:12px;flex-shrink:0}",
    "#pi-manage-root .pm-body{flex:1;min-height:0;overflow:auto;padding:10px 12px 20px}",
    "#pi-manage-root .pm-proj{border:1px solid var(--pm-border);border-radius:9px;margin-bottom:9px;overflow:hidden;background:var(--pm-bg2)}",
    "#pi-manage-root .pm-proj>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:7px;padding:9px 11px;user-select:none}",
    "#pi-manage-root .pm-proj>summary::-webkit-details-marker{display:none}",
    "#pi-manage-root .pm-proj>summary:hover{background:var(--pm-hover)}",
    "#pi-manage-root .pm-caret{width:9px;flex-shrink:0;color:var(--pm-dim);transition:transform .12s}",
    "#pi-manage-root .pm-proj[open] .pm-caret{transform:rotate(90deg)}",
    "#pi-manage-root .pm-path{flex:1;min-width:0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#pi-manage-root .pm-pill{flex-shrink:0;font-size:11px;color:var(--pm-muted);background:var(--pm-hover);border:1px solid var(--pm-border);border-radius:999px;padding:1px 8px}",
    "#pi-manage-root .pm-btn{font:inherit;font-size:12px;cursor:pointer;border:1px solid var(--pm-border);background:var(--pm-hover);color:var(--pm-text);border-radius:7px;padding:3px 9px;white-space:nowrap}",
    "#pi-manage-root .pm-btn:hover{background:var(--pm-sel);color:var(--pm-accent);border-color:var(--pm-accent)}",
    "#pi-manage-root .pm-btn.ghost{background:none;color:var(--pm-muted)}",
    "#pi-manage-root .pm-btn.ghost:hover{color:var(--pm-accent);background:var(--pm-hover)}",
    "#pi-manage-root .pm-btn.danger{color:var(--pm-danger)}",
    "#pi-manage-root .pm-btn.danger:hover{background:var(--pm-sel);border-color:var(--pm-danger);color:var(--pm-danger)}",
    "#pi-manage-root .pm-conv{display:flex;align-items:center;gap:8px;padding:7px 11px 7px 26px;border-top:1px solid var(--pm-border);cursor:pointer}",
    "#pi-manage-root .pm-conv:hover{background:var(--pm-hover)}",
    "#pi-manage-root .pm-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}",
    "#pi-manage-root .pm-dot.run{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}",
    "#pi-manage-root .pm-ctitle{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#pi-manage-root .pm-cmeta{flex-shrink:0;color:var(--pm-dim);font-size:11px;font-variant-numeric:tabular-nums}",
    "#pi-manage-root .pm-cact{display:flex;gap:3px;flex-shrink:0;opacity:0}",
    "#pi-manage-root .pm-conv:hover .pm-cact{opacity:1}",
    "#pi-manage-root .pm-tag{display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;font-size:10px;background:var(--pm-sel);color:var(--pm-accent);border:1px solid var(--pm-accent)}",
    "#pi-manage-root .pm-empty{color:var(--pm-dim);padding:26px 6px;text-align:center}",
    "#pi-manage-root table{width:100%;border-collapse:collapse}",
    "#pi-manage-root th,#pi-manage-root td{text-align:left;padding:8px 8px;border-bottom:1px solid var(--pm-border);vertical-align:middle}",
    "#pi-manage-root th{color:var(--pm-muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em}",
    "#pi-manage-root td.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}",
    "#pi-manage-root td.cwd{max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "#pi-manage-root .pm-err{color:var(--pm-danger)}",
  ].join("");

  function injectStyle() {
    if (document.getElementById("pi-manage-style")) return;
    var s = document.createElement("style");
    s.id = "pi-manage-style";
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function shorten(p) {
    if (!p) return "";
    if (state.home && p === state.home) return "~";
    if (state.home && p.indexOf(state.home + "/") === 0) return "~" + p.slice(state.home.length);
    return p;
  }
  function rel(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return "";
    var s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return "刚刚";
    var m = Math.floor(s / 60); if (m < 60) return m + " 分钟前";
    var h = Math.floor(m / 60); if (h < 24) return h + " 小时前";
    var d = Math.floor(h / 24); if (d < 7) return d + " 天前";
    return new Date(t).toLocaleDateString();
  }
  function title(s) { return (s.name && s.name.trim()) || s.firstMessage || s.id; }

  function build() {
    injectStyle();
    backdrop = document.createElement("div");
    backdrop.id = "pi-manage-backdrop";
    root = document.createElement("div");
    root.id = "pi-manage-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Pi Web 管理中心");
    root.innerHTML =
      '<div class="pm-head"><div><div class="pm-title">管理中心</div><div class="pm-sub" id="pm-status">加载中…</div></div>' +
      '<button class="pm-iconbtn" id="pm-close" title="关闭" aria-label="关闭">×</button></div>' +
      '<div class="pm-tabs"><button class="pm-tab active" data-tab="projects">项目与对话</button>' +
      '<button class="pm-tab" data-tab="instances">运行实例</button></div>' +
      '<div class="pm-toolbar" id="pm-toolbar"><input id="pm-search" type="search" placeholder="搜索对话标题、首条消息或项目路径…"><span class="pm-muted" id="pm-summary"></span></div>' +
      '<div class="pm-body" id="pm-body"><div class="pm-empty">加载中…</div></div>';
    document.body.appendChild(backdrop);
    document.body.appendChild(root);

    bodyEl = root.querySelector("#pm-body");
    statusEl = root.querySelector("#pm-status");
    summaryEl = root.querySelector("#pm-summary");
    toolbarEl = root.querySelector("#pm-toolbar");
    searchEl = root.querySelector("#pm-search");
    closeBtn = root.querySelector("#pm-close");

    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    root.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    searchEl.addEventListener("input", function (e) { state.filter = e.target.value; renderBody(); });
    root.querySelectorAll(".pm-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        state.tab = b.dataset.tab;
        root.querySelectorAll(".pm-tab").forEach(function (x) { x.classList.toggle("active", x === b); });
        toolbarEl.style.display = state.tab === "projects" ? "" : "none";
        renderBody();
        refresh(true);
      });
    });
    bodyEl.addEventListener("click", onBodyClick);
  }

  function groupSessions() {
    var map = {};
    (state.sessions || []).forEach(function (s) {
      if (s.relation && s.relation.kind === "subagent") return;
      var r = s.projectRoot || s.cwd || "(未知)";
      if (!map[r]) map[r] = { root: r, sessions: [], latest: s.modified || "" };
      map[r].sessions.push(s);
      if ((s.modified || "") > map[r].latest) map[r].latest = s.modified || "";
    });
    var groups = Object.keys(map).map(function (k) { return map[k]; });
    groups.forEach(function (g) { g.sessions.sort(function (a, b) { return (b.modified || "").localeCompare(a.modified || ""); }); });
    groups.sort(function (a, b) { return (b.latest || "").localeCompare(a.latest || ""); });
    return groups;
  }
  function matches(s, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return (title(s) + " " + (s.firstMessage || "") + " " + (s.projectRoot || "") + " " + (s.cwd || "")).toLowerCase().indexOf(q) >= 0;
  }

  function renderProjects() {
    var q = state.filter.trim();
    var groups = groupSessions();
    var total = 0, shown = 0, html = "";
    groups.forEach(function (g) {
      var list = g.sessions.filter(function (s) { return matches(s, q); });
      total += g.sessions.length;
      if (!list.length) return;
      shown += list.length;
      var run = list.filter(function (s) { return state.running[s.id]; }).length;
      html += '<details class="pm-proj" open><summary>' +
        '<svg class="pm-caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4"></path></svg>' +
        '<span class="pm-path" title="' + esc(g.root) + '">' + esc(shorten(g.root)) + "</span>" +
        (run ? '<span class="pm-pill">' + run + " 运行中</span>" : "") +
        '<span class="pm-pill">' + list.length + " 个对话</span>" +
        '<button class="pm-btn" data-newcwd="' + esc(g.root) + '">＋ 新会话</button>' +
        "</summary>";
      list.forEach(function (s) {
        html += '<div class="pm-conv" data-id="' + esc(s.id) + '">' +
          '<span class="pm-dot' + (state.running[s.id] ? " run" : "") + '"></span>' +
          '<span class="pm-ctitle" title="' + esc(s.firstMessage || "") + '">' + esc(title(s)) + (s.branch ? '<span class="pm-tag">' + esc(s.branch) + "</span>" : "") + "</span>" +
          '<span class="pm-cmeta">' + esc(rel(s.modified) + " · " + (s.messageCount || 0) + " 条") + "</span>" +
          '<span class="pm-cact">' +
          '<button class="pm-btn ghost" data-open="' + esc(s.id) + '">打开</button>' +
          '<button class="pm-btn ghost" data-rename="' + esc(s.id) + '">重命名</button>' +
          '<button class="pm-btn danger" data-del="' + esc(s.id) + '">删除</button>' +
          "</span></div>";
      });
      html += "</details>";
    });
    bodyEl.innerHTML = html || '<div class="pm-empty">没有匹配的对话</div>';
    summaryEl.textContent = q ? "匹配 " + shown + " / " + total + " 个对话" : groups.length + " 个项目 · " + total + " 个对话";
  }

  function renderInstances() {
    var list = state.instances || [];
    if (!list.length) { bodyEl.innerHTML = '<div class="pm-empty">没有发现运行中的 pi-web 实例</div>'; return; }
    var cur = location.port || (location.protocol === "https:" ? "443" : "80");
    bodyEl.innerHTML = "<table><thead><tr><th style='width:92px'>端口</th><th>工作目录</th><th style='width:74px'>PID</th><th style='width:92px'>操作</th></tr></thead><tbody>" +
      list.map(function (it) {
        return "<tr><td class='mono'>" + esc(it.port) + (String(it.port) === String(cur) ? '<span class="pm-tag">当前</span>' : "") + "</td>" +
          "<td class='mono cwd' title='" + esc(it.cwd || "") + "'>" + esc(shorten(it.cwd) || "(未知)") + "</td>" +
          "<td class='mono'>" + esc(it.pid) + "</td>" +
          "<td><button class='pm-btn danger' data-stop='" + esc(it.pid) + "' data-port='" + esc(it.port) + "' data-cwd='" + esc(it.cwd || "") + "'>停止</button></td></tr>";
      }).join("") + "</tbody></table>";
  }

  function renderBody() {
    if (state.tab === "projects") renderProjects(); else renderInstances();
  }

  async function onBodyClick(e) {
    var t = e.target.closest("[data-newcwd],[data-open],[data-rename],[data-del],[data-stop]");
    if (!t) {
      var row = e.target.closest(".pm-conv");
      if (row) go("/?session=" + encodeURIComponent(row.dataset.id));
      return;
    }
    e.stopPropagation();
    if (t.dataset.newcwd) return go("/?cwd=" + encodeURIComponent(t.dataset.newcwd));
    if (t.dataset.open) return go("/?session=" + encodeURIComponent(t.dataset.open));
    if (t.dataset.stop) {
      var pid = t.dataset.stop, port = t.dataset.port, cwd = shorten(t.dataset.cwd) || "(未知)";
      if (!confirm("确定停止端口 " + port + " 的 pi-web 吗？\n工作目录: " + cwd + "\nPID: " + pid)) return;
      t.disabled = true;
      try {
        var r = await fetch("/api/home", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stop: Number(pid) }) });
        var d = await r.json().catch(function () { return {}; });
        if (!r.ok || d.error) throw new Error(d.error || ("HTTP " + r.status));
        t.textContent = "已停止";
      } catch (err) { alert("停止失败: " + err.message); t.disabled = false; }
      setTimeout(function () { refresh(true); }, 700);
      return;
    }
    var s = state.sessions.find(function (x) { return x.id === (t.dataset.rename || t.dataset.del); });
    if (t.dataset.rename) {
      var name = prompt("新的对话标题：", s ? (s.name || title(s)) : "");
      if (name == null) return;
      try {
        var r2 = await fetch("/api/sessions/" + encodeURIComponent(t.dataset.rename), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
        if (!r2.ok) throw new Error("HTTP " + r2.status);
        await refresh(true);
      } catch (err) { alert("重命名失败: " + err.message); }
      return;
    }
    if (t.dataset.del) {
      if (!confirm("确定删除这个对话吗？\n" + (s ? title(s) : t.dataset.del) + "\n\n此操作不可撤销。")) return;
      try {
        var r3 = await fetch("/api/sessions/" + encodeURIComponent(t.dataset.del), { method: "DELETE" });
        if (!r3.ok) throw new Error("HTTP " + r3.status);
        await refresh(true);
      } catch (err) { alert("删除失败: " + err.message); }
    }
  }

  // 同一窗口切换（不新开标签页）
  function go(url) { close(); location.assign(url); }

  async function refresh(force) {
    try {
      if (state.tab === "instances") {
        var r = await fetch("/api/home?instances=1", { cache: "no-store" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        var d = await r.json();
        state.home = d.home || state.home;
        state.instances = d.instances || [];
        if (state.open) { renderBody(); statusEl.textContent = "共 " + state.instances.length + " 个实例 · " + new Date().toLocaleTimeString(); }
      } else {
        var r2 = await fetch("/api/sessions" + (force ? "?force=1" : ""), { cache: "no-store" });
        if (!r2.ok) throw new Error("HTTP " + r2.status);
        var d2 = await r2.json();
        state.sessions = d2.sessions || [];
        state.running = {};
        (d2.runningSessionIds || []).forEach(function (id) { state.running[id] = true; });
        if (state.open) { renderBody(); statusEl.textContent = "已更新 " + new Date().toLocaleTimeString(); }
      }
    } catch (e) {
      if (state.open) statusEl.innerHTML = '<span class="pm-err">加载失败: ' + esc(e.message) + "</span>";
    }
  }

  function startTimer() {
    if (timer) return;
    timer = setInterval(function () { if (state.open) refresh(false); }, 5000);
  }

  async function open(opts) {
    if (!root) build();
    state.full = !!(opts && opts.full);
    state.open = true;
    root.classList.toggle("pm-full", state.full);
    root.style.display = "flex";
    backdrop.style.display = state.full ? "none" : "block";
    closeBtn.style.display = state.full ? "none" : "";
    try { var h = await (await fetch("/api/home", { cache: "no-store" })).json(); state.home = h.home || ""; } catch (e) {}
    await refresh(true);
    startTimer();
  }
  function close() {
    state.open = false;
    if (root) root.style.display = "none";
    if (backdrop) backdrop.style.display = "none";
  }
  function toggle() { if (state.open) close(); else open(); }

  window.__piWebManage = { open: open, close: close, toggle: toggle };
})();
