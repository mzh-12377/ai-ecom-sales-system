/* =====================================================================
   智能云 AI 电商在线销售系统 · 启动与鉴权
   ===================================================================== */
(function () {
  "use strict";
  const A = window.APP;
  const { $, $$, esc, toast, modal, closeModal, state, save, cartLoad, USERS, go } = A;

  /* ---------------- 主题 ---------------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.settings.theme === "dark" ? "dark" : "light");
    const btn = $("#theme-btn");
    if (btn) btn.textContent = state.settings.theme === "dark" ? "☀️" : "🌙";
  }
  A.applyTheme = applyTheme;

  /* ---------------- 登录页演示账号 ---------------- */
  function renderDemoRows() {
    $("#demo-rows").innerHTML = USERS.map((u, i) =>
      '<div class="demo-row" data-i="' + i + '">' +
      '<span class="avatar" style="width:30px;height:30px;font-size:13px">' + esc(u.avatar) + "</span>" +
      '<span class="who"><b>' + esc(u.roleLabel) + " · " + esc(u.name) + "</b><code>" + esc(u.u) + " / " + esc(u.p) + "</code></span>" +
      '<span style="font-size:11.5px;color:var(--text-3)">填入 →</span></div>').join("");
    $$("#demo-rows .demo-row").forEach(el => el.addEventListener("click", () => {
      const u = USERS[parseInt(el.dataset.i, 10)];
      $("#lg-user").value = u.u;
      $("#lg-pass").value = u.p;
      $("#login-err").style.display = "none";
      $("#lg-pass").focus();
    }));
  }

  function showErr(msg) {
    const el = $("#login-err");
    el.textContent = msg;
    el.style.display = "block";
  }

  /* ---------------- 登录 / 登出 ---------------- */
  function login(user, pass, silent) {
    const u = USERS.find(x => x.u === user && x.p === pass);
    if (!u) { if (!silent) showErr("账号或密码不正确，请使用页面下方演示账号"); return false; }
    state.user = u;
    $("#login-err").style.display = "none";
    $("#login-view").style.display = "none";
    $("#app").classList.add("on");
    $("#u-name").textContent = u.name;
    $("#u-avatar").textContent = u.avatar;
    $("#user-chip").title = u.roleLabel + " · " + u.u;

    // 首屏路由：买家进商城，其他进工作台
    const savedRoute = (A.load() || {}).route;
    if (!location.hash) {
      const def = u.role === "buyer" ? "shop" : "dashboard";
      location.hash = "#/" + (savedRoute && u.scope.indexOf(savedRoute) >= 0 ? savedRoute : def);
    }
    A.parseHash();
    A.render();
    applyTheme();
    A.updateBadges();
    save();
    if (!silent) toast("登录成功，欢迎回来 " + u.name, "ok");
    return true;
  }

  function logout() {
    state.user = null;
    try { localStorage.removeItem("ai-ecom-sales-system/v1"); } catch (e) {}
    $("#app").classList.remove("on");
    $("#login-view").style.display = "flex";
    $("#lg-pass").value = "";
    location.hash = "";
    closeModal();
    toast("已退出登录", "ok");
  }
  A.logout = logout;

  /* ---------------- 事件绑定 ---------------- */
  function bindChrome() {
    $("#login-form").addEventListener("submit", (e) => {
      e.preventDefault();
      login($("#lg-user").value.trim(), $("#lg-pass").value);
    });

    $("#theme-btn").addEventListener("click", () => {
      state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
      applyTheme(); save();
    });

    $("#cart-btn").addEventListener("click", () => go("cart"));

    $("#bell-btn").addEventListener("click", () => {
      const t = A.todos();
      modal("业务待办",
        t.map(x => '<div style="display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--border)">' +
          '<span class="tag ' + (x.level === "high" ? "tag-red" : x.level === "mid" ? "tag-amber" : "tag-blue") + '">' +
          (x.level === "high" ? "高优先级" : x.level === "mid" ? "待补货" : "进行中") + "</span>" +
          '<span style="flex:1"><b style="font-size:13.5px">' + esc(x.title) + '</b>' +
          '<div style="font-size:12px;color:var(--text-3)">' + esc(x.sub) + "</div></span>" +
          '<button class="btn btn-sm" data-jump="' + x.route + '">前往处理</button></div>').join("") +
        (t.length ? "" : '<div class="empty">暂无待办</div>'),
        '<button class="btn" data-close>关闭</button>');
      $$("[data-jump]").forEach(el => el.addEventListener("click", () => { closeModal(); go(el.dataset.jump); }));
    });

    $("#user-chip").addEventListener("click", () => {
      const u = state.user;
      modal("账号信息 · " + u.roleLabel,
        '<div class="kv" style="margin-bottom:14px">' +
        '<div class="item"><span>账号</span><b>' + esc(u.u) + "</b></div>" +
        '<div class="item"><span>姓名</span><b>' + esc(u.name) + "</b></div>" +
        '<div class="item"><span>角色</span><b>' + esc(u.roleLabel) + "</b></div>" +
        '<div class="item"><span>可访问模块</span><b>' + u.scope.length + " 个</b></div></div>" +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
        u.scope.map(k => '<span class="tag tag-blue">' + esc((A.TITLES[k] || [k])[0]) + "</span>").join("") + "</div>",
        '<button class="btn" data-close>关闭</button><button class="btn btn-danger" id="uc-logout">退出登录</button>');
      const b = $("#uc-logout");
      if (b) b.addEventListener("click", () => { closeModal(); logout(); });
    });

    $("#burger").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
    $("#side-mask").addEventListener("click", () => $("#sidebar").classList.remove("open"));
    $("#side-nav").addEventListener("click", (e) => {
      if (e.target.closest(".side-item")) $("#sidebar").classList.remove("open");
    });

    window.addEventListener("hashchange", () => {
      A.parseHash();
      if (state.user) A.render();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* ---------------- 启动 ---------------- */
  async function boot() {
    const data = await A.loadData();
    const missing = Object.keys(data).filter(k => !data[k]);
    if (missing.length) {
      document.body.innerHTML = '<div style="padding:60px 20px;text-align:center;font-family:sans-serif">' +
        "<h2>数据文件加载失败</h2><p style=\"color:#64748b\">缺失：" + missing.join("、") +
        "</p><p style=\"color:#64748b\">请通过 HTTP 服务访问本页面（例如 python3 -m http.server），不要用 file:// 直接打开。</p></div>";
      return;
    }
    state.data = data;
    A.buildView();
    state.cart = cartLoad();

    const saved = A.load();
    if (saved && saved.settings) state.settings = Object.assign({ theme: "light", lowStock: 200 }, saved.settings);
    applyTheme();

    renderDemoRows();
    bindChrome();

    // 自动恢复会话
    if (saved && saved.user) {
      const u = USERS.find(x => x.u === saved.user);
      if (u) { login(u.u, u.p, true); return; }
    }
    $("#login-view").style.display = "flex";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
