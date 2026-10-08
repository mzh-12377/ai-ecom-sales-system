/* =====================================================================
   智能云 AI 电商在线销售系统 · 核心
   零依赖单页应用 · 数据源自完整成果包（25 张业务表 / 895 条记录）
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     1. 演示账号
     ------------------------------------------------------------------ */
  const USERS = [
    { u: "admin", p: "admin123", name: "系统管理员", role: "admin", roleLabel: "系统管理员", avatar: "管", desc: "全部后台模块",
      scope: ["dashboard","shop","product","cart","checkout","my-orders","products","inventory","orders","live","profit","compliance","talents","sales","settings"] },
    { u: "buyer", p: "buyer123", name: "张小明", role: "buyer", roleLabel: "电商买家", avatar: "张", desc: "商城前台 · 下单与订单",
      scope: ["shop","product","cart","checkout","my-orders"] },
    { u: "operator", p: "operator123", name: "运营小林", role: "operator", roleLabel: "运营人员", avatar: "林", desc: "商品/库存/直播/合规",
      scope: ["dashboard","products","inventory","live","compliance","talents","sales","profit","settings"] }
  ];

  const NAV = [
    { group: "商城前台", items: [
      { key: "shop", label: "商品大厅", icon: "🏬" },
      { key: "cart", label: "购物车", icon: "🛒", badgeKey: "cart" },
      { key: "my-orders", label: "我的订单", icon: "📦" }
    ]},
    { group: "经营分析", items: [
      { key: "dashboard", label: "经营工作台", icon: "📊" },
      { key: "profit", label: "利润分析", icon: "💰" },
      { key: "sales", label: "销售明细", icon: "📈" }
    ]},
    { group: "业务运营", items: [
      { key: "products", label: "商品管理", icon: "🗂️" },
      { key: "inventory", label: "库存管理", icon: "🏭" },
      { key: "orders", label: "订单管理", icon: "🧾" },
      { key: "live", label: "直播运营", icon: "📺" },
      { key: "talents", label: "达人合作", icon: "🤝" }
    ]},
    { group: "风险与设置", items: [
      { key: "compliance", label: "极限词自检", icon: "🛡️" },
      { key: "settings", label: "系统设置", icon: "⚙️" }
    ]}
  ];

  const TITLES = {
    dashboard: ["经营工作台", "经营数据、待办任务与快捷操作"],
    shop: ["商品大厅", "商城前台 / 全量上架商品"],
    product: ["商品详情", "商城前台 / 商品详情"],
    cart: ["购物车", "商城前台 / 购物车"],
    checkout: ["确认订单", "商城前台 / 结算"],
    "my-orders": ["我的订单", "商城前台 / 我的订单"],
    products: ["商品管理", "业务运营 / 商品主数据"],
    inventory: ["库存管理", "业务运营 / 入库 · 出库 · 在架库存"],
    orders: ["订单管理", "业务运营 / 订单创建与状态流转"],
    live: ["直播运营", "业务运营 / 直播场次与复盘建议"],
    profit: ["利润分析", "经营分析 / 单品利润表"],
    compliance: ["极限词智能自检", "风险管控 / 文案合规审核"],
    talents: ["达人合作", "业务运营 / 达人数据与合作漏斗"],
    sales: ["销售明细", "经营分析 / 销售明细记录"],
    settings: ["系统设置", "系统 / 偏好与数据管理"]
  };

  const COVER = { cushion:"🪑", mask:"🧖", jacket:"🧥", powerbank:"🔋", dock:"🔌", cream:"🧴", food:"🥘", bag:"👜", phone:"📱" };
  const SESSION_ICON = { "抖音":"🎵", "淘宝":"🛍️", "京东":"🐶", "快手":"⚡", "Amazon":"🌐" };

  /* ------------------------------------------------------------------
     2. 工具
     ------------------------------------------------------------------ */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  const money = (n, dec) => {
    const d = dec == null ? 2 : dec;
    return "¥" + Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const num = (n) => Number(n || 0).toLocaleString("zh-CN");
  const pct = (n, dec) => (Number(n || 0) * 100).toFixed(dec == null ? 1 : dec) + "%";
  const today = () => { const d = new Date(); const p = (x) => String(x).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth()+1) + "-" + p(d.getDate()); };

  let toastSeq = 0;
  function toast(msg, type) {
    const box = $("#toast-wrap");
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = msg;
    box.appendChild(el);
    const id = ++toastSeq;
    setTimeout(() => { if (el) { el.style.transition = "opacity .25s,transform .25s"; el.style.opacity = "0"; el.style.transform = "translateX(20px)"; } }, 2100);
    setTimeout(() => el.remove(), 2450);
  }

  function modal(titleText, bodyHTML, footHTML) {
    closeModal();
    $("#modal-root").innerHTML =
      '<div class="modal-mask" id="modal-mask"><div class="modal">' +
      '<div class="modal-head"><h3>' + esc(titleText) + '</h3><button class="icon-btn" data-close>✕</button></div>' +
      '<div class="modal-body">' + bodyHTML + '</div>' +
      (footHTML ? '<div class="modal-foot">' + footHTML + '</div>' : "") +
      '</div></div>';
    $("#modal-mask").addEventListener("click", (e) => {
      if (e.target.id === "modal-mask" || e.target.hasAttribute("data-close")) closeModal();
    });
  }
  function closeModal() { $("#modal-root").innerHTML = ""; }

  /* ------------------------------------------------------------------
     3. 状态
     ------------------------------------------------------------------ */
  const LS_KEY = "ai-ecom-sales-system/v1";
  const CART_KEY = "ai-ecom-cart/v1";
  const DEFAULT_SETTINGS = { theme: "light", lowStock: 200 };

  const state = {
    data: null, view: null, user: null,
    route: "dashboard", param: null,
    cart: [], settings: Object.assign({}, DEFAULT_SETTINGS)
  };

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        view: state.view, cart: state.cart, settings: state.settings,
        user: state.user ? state.user.u : null, route: state.route
      }));
    } catch (e) {}
  }
  function load() {
    try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function cartSave() { try { localStorage.setItem(CART_KEY, JSON.stringify(state.cart)); } catch (e) {} }
  function cartLoad() { try { const r = localStorage.getItem(CART_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
  function resetData() {
    Object.keys(localStorage).forEach(k => { if (k.indexOf("ai-ecom") === 0) localStorage.removeItem(k); });
    location.hash = ""; location.reload();
  }

  /* ------------------------------------------------------------------
     4. 数据装载（fetch + 内联兜底）
     ------------------------------------------------------------------ */
  const FILES = {
    products: "data/products.json", profit: "data/profit.json", sales: "data/sales-detail.json",
    orders: "data/orders.json", talents: "data/talents.json", invIn: "data/inventory-in.json",
    invOut: "data/inventory-out.json", live: "data/live-sessions.json",
    compliance: "data/compliance.json", manifest: "data/manifest.json"
  };

  async function loadData() {
    const out = {};
    const base = location.protocol === "file:" ? "" : new URL(".", location.href).href;
    await Promise.all(Object.keys(FILES).map(async (k) => {
      try {
        const r = await fetch(base + FILES[k], { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        out[k] = await r.json();
      } catch (e) {
        out[k] = (window.__SEED__ && window.__SEED__[k]) || null;
      }
    }));
    return out;
  }

  /* ------------------------------------------------------------------
     5. 派生数据 —— 与成果包口径一致
     ------------------------------------------------------------------ */
  const D = {
    products: () => state.data.products.products,
    profit:   () => state.data.profit.records,
    sales:    () => state.data.sales.records,
    orders:   () => state.data.orders.orders,
    talents:  () => state.data.talents.records,
    invIn:    () => state.data.invIn.records,
    invOut:   () => state.data.invOut.records,
    live:     () => state.data.live.sessions,
    dict:     () => state.data.compliance.dictionary,
    ckRecords:() => state.data.compliance.records,
    review:   () => state.data.compliance.reviewSuggestions,
    manifest: () => state.data.manifest
  };

  const totalSales  = () => D.sales().reduce((s, r) => s + (r.amount || 0) - (r.refund || 0), 0);
  const totalProfit = () => D.profit().reduce((s, r) => s + (r.profit || 0), 0);
  const totalGmv    = () => D.profit().reduce((s, r) => s + (r.gmv || 0), 0);
  const totalComm   = () => D.profit().reduce((s, r) => s + (r.commission || 0), 0);
  const lowStockList    = () => state.view.products.filter(p => p.stock <= state.settings.lowStock);
  const highRiskRecords = () => state.view.ckRecords.filter(r => r.level === "high");
  const pendingTalents  = () => D.talents().filter(t => t.stage !== "已出单");
  const talentFunnel    = () => state.data.talents.stages.map(s => ({ stage: s, count: D.talents().filter(t => t.stage === s).length }));

  function todos() {
    return [
      { level: "high", title: "处理 " + highRiskRecords().length + " 条高风险极限词记录", sub: "合规整改 · 高优先级", route: "compliance", n: highRiskRecords().length },
      { level: "mid",  title: "关注 " + lowStockList().length + " 个低库存商品待补货", sub: "库存低于 " + state.settings.lowStock + " 件安全线", route: "inventory", n: lowStockList().length },
      { level: "low",  title: "推进达人合作漏斗中的待转化任务", sub: pendingTalents().length + " 位达人尚未出单", route: "talents", n: pendingTalents().length },
      { level: "low",  title: "复核近期直播复盘建议", sub: D.review().length + " 条复盘结论待确认", route: "live", n: D.review().length }
    ];
  }

  function liveStats() {
    return D.live().map(s => {
      const items = D.profit().filter(p => (p.sessionIds || []).indexOf(s.id) >= 0);
      return Object.assign({}, s, {
        itemCount: items.length,
        gmv: items.reduce((a, b) => a + b.gmv, 0),
        profit: items.reduce((a, b) => a + b.profit, 0),
        qty: items.reduce((a, b) => a + b.salesVolume, 0),
        names: items.map(i => i.name)
      });
    });
  }

  /* ------------------------------------------------------------------
     6. 图表（手写 SVG）
     ------------------------------------------------------------------ */
  function niceCeil(v) {
    if (v <= 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(v))), n = v / e;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
  }
  function shortNum(v) {
    const a = Math.abs(v);
    if (a >= 1e8) return (v / 1e8).toFixed(1) + "亿";
    if (a >= 1e4) return (v / 1e4).toFixed(a >= 1e6 ? 0 : 1) + "万";
    if (a >= 1e3) return (v / 1e3).toFixed(0) + "k";
    return String(Math.round(v));
  }

  function svgLine(points, opts) {
    const o = Object.assign({ w: 720, h: 220, pad: { t: 18, r: 16, b: 34, l: 54 } }, opts || {});
    if (!points.length) return '<div class="empty">暂无数据</div>';
    const iw = o.w - o.pad.l - o.pad.r, ih = o.h - o.pad.t - o.pad.b;
    const niceMax = niceCeil(Math.max.apply(null, points.map(p => p.value)) || 1);
    const step = points.length > 1 ? iw / (points.length - 1) : 0;
    const X = i => o.pad.l + i * step;
    const Y = v => o.pad.t + ih - (v / niceMax) * ih;

    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const v = (niceMax / 4) * i, y = Y(v);
      grid += '<line x1="' + o.pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (o.w - o.pad.r) + '" y2="' + y.toFixed(1) +
        '" stroke="var(--border)" stroke-width="1"' + (i === 0 ? "" : ' stroke-dasharray="3 4"') + '/>';
      grid += '<text x="' + (o.pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="10.5" fill="var(--text-3)">' + shortNum(v) + '</text>';
    }
    let line = "", dots = "", labels = "";
    const every = Math.max(1, Math.ceil(points.length / 7));
    points.forEach((p, i) => {
      const x = X(i), y = Y(p.value);
      line += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      dots += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.4" fill="var(--surface)" stroke="var(--brand)" stroke-width="2"><title>' +
        esc(p.label) + "：" + money(p.value, 0) + '</title></circle>';
      if (i % every === 0 || i === points.length - 1)
        labels += '<text x="' + x.toFixed(1) + '" y="' + (o.h - 12) + '" text-anchor="middle" font-size="10.5" fill="var(--text-3)">' + esc(p.label) + '</text>';
    });
    const area = line + " L" + X(points.length - 1).toFixed(1) + " " + Y(0) + " L" + X(0).toFixed(1) + " " + Y(0) + " Z";
    const gid = "g" + Math.random().toString(36).slice(2, 8);
    return '<svg viewBox="0 0 ' + o.w + " " + o.h + '" style="width:100%;height:auto;display:block" role="img">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="var(--brand)" stop-opacity=".26"/><stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="var(--brand)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';
  }

  function svgDonut(parts, opts) {
    const o = Object.assign({ size: 190, thick: 22 }, opts || {});
    const total = parts.reduce((s, p) => s + p.value, 0) || 1;
    const r = (o.size - o.thick) / 2, cx = o.size / 2, cy = o.size / 2, C = 2 * Math.PI * r;
    let off = 0, arcs = "";
    parts.forEach(p => {
      const frac = p.value / total, len = frac * C;
      arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="' + o.thick +
        '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) +
        '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(p.label) + "：" + money(p.value, 0) + "（" + pct(frac) + '）</title></circle>';
      off += len;
    });
    return '<svg viewBox="0 0 ' + o.size + " " + o.size + '" style="width:' + o.size + 'px;max-width:100%;height:auto;display:block" role="img">' + arcs +
      '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="11" fill="var(--text-3)">合计</text>' +
      '<text x="' + cx + '" y="' + (cy + 17) + '" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">' + shortNum(total) + '</text></svg>';
  }

  /* ------------------------------------------------------------------
     7. 极限词规则引擎
     ------------------------------------------------------------------ */
  function scanText(text) {
    const sorted = D.dict().slice().sort((a, b) => b.word.length - a.word.length);
    const used = new Array(text.length).fill(false);
    const hits = [];
    sorted.forEach(d => {
      let from = 0, idx;
      while ((idx = text.indexOf(d.word, from)) >= 0) {
        const end = idx + d.word.length;
        let clear = true;
        for (let i = idx; i < end; i++) if (used[i]) { clear = false; break; }
        if (clear) {
          for (let i = idx; i < end; i++) used[i] = true;
          hits.push({ word: d.word, level: d.level, start: idx, end: end, suggest: d.suggest, category: d.category });
        }
        from = idx + d.word.length;
      }
    });
    hits.sort((a, b) => a.start - b.start);
    const level = hits.some(h => h.level === "high") ? "high" : hits.length ? "mid" : "low";
    return { hits: hits, level: level };
  }
  function highlight(text, hits) {
    let out = "", last = 0;
    hits.forEach(h => {
      out += esc(text.slice(last, h.start));
      out += '<span class="hit ' + (h.level === "mid" ? "mid" : "") + '" title="' + esc(h.category + " · 建议：" + h.suggest) + '">' +
        esc(text.slice(h.start, h.end)) + "</span>";
      last = h.end;
    });
    return out + esc(text.slice(last));
  }
  const LEVEL_TAG = {
    high: '<span class="tag tag-red">高风险</span>',
    mid:  '<span class="tag tag-amber">中风险</span>',
    low:  '<span class="tag tag-green">通过</span>'
  };

  /* ------------------------------------------------------------------
     8. 购物车
     ------------------------------------------------------------------ */
  const cartCount = () => state.cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = () => state.cart.reduce((s, i) => s + i.qty * i.price, 0);

  function addToCart(pid, qty) {
    qty = qty || 1;
    const p = state.view.products.find(x => x.id === pid);
    if (!p) return;
    if (p.status !== "在售") { toast("该商品已下架", "warn"); return; }
    const line = state.cart.find(i => i.id === pid);
    const has = line ? line.qty : 0;
    if (has + qty > p.stock) { toast("库存不足，当前仅剩 " + p.stock + " 件", "err"); return; }
    if (line) line.qty += qty;
    else state.cart.push({ id: p.id, name: p.name, price: p.price, qty: qty, cover: p.cover, brand: p.brand, stock: p.stock });
    cartSave(); save(); toast("已加入购物车：" + p.name, "ok"); updateBadges();
  }
  function setQty(pid, qty) {
    const line = state.cart.find(i => i.id === pid);
    if (!line) return;
    const p = state.view.products.find(x => x.id === pid);
    line.qty = Math.max(1, Math.min(qty, p ? p.stock : 999));
    cartSave();
  }
  function removeFromCart(pid) {
    state.cart = state.cart.filter(i => i.id !== pid);
    cartSave(); save(); updateBadges(); render();
  }

  /* ------------------------------------------------------------------
     9. 视图状态
     ------------------------------------------------------------------ */
  function buildView() {
    const saved = load();
    const fresh = {
      products: JSON.parse(JSON.stringify(D.products())),
      orders: JSON.parse(JSON.stringify(D.orders())),
      invIn: JSON.parse(JSON.stringify(D.invIn())),
      ckRecords: JSON.parse(JSON.stringify(D.ckRecords())),
      shopOrders: []
    };
    state.view = saved && saved.view ? Object.assign(fresh, saved.view) : fresh;
    state.view.shopOrders = state.view.shopOrders || [];
    state.cart = saved && saved.cart && saved.cart.length ? saved.cart : cartLoad();
    if (saved && saved.settings) state.settings = Object.assign({}, DEFAULT_SETTINGS, saved.settings);
  }

  /* ------------------------------------------------------------------
     10. 渲染框架
     ------------------------------------------------------------------ */
  function can(k) {
    if (!state.user) return false;
    if (state.user.role === "admin") return true;
    return state.user.scope.indexOf(k) >= 0;
  }

  function renderNav() {
    const c = cartCount();
    let h = "";
    NAV.forEach(g => {
      const items = g.items.filter(it => can(it.key));
      if (!items.length) return;
      h += '<div class="side-group">' + esc(g.group) + "</div>";
      items.forEach(it => {
        const on = state.route === it.key;
        let badge = "";
        if (it.badgeKey === "cart" && c > 0) badge = '<span class="cnt">' + c + "</span>";
        h += '<a class="side-item' + (on ? " on" : "") + '" href="#/' + it.key + '">' +
          '<span class="ic">' + it.icon + "</span><span>" + esc(it.label) + "</span>" + badge + "</a>";
      });
    });
    $("#side-nav").innerHTML = h;
  }

  function updateBadges() {
    const c = cartCount(), btn = $("#cart-count");
    btn.style.display = c > 0 ? "" : "none";
    btn.textContent = c > 9 ? "9+" : String(c);
    const n = todos().reduce((s, t) => s + t.n, 0), b = $("#bell-count");
    b.style.display = n > 0 ? "" : "none";
    b.textContent = n > 9 ? "9+" : String(n);
  }

  function setTitle(k) {
    const t = TITLES[k] || ["智能云 AI 电商在线销售系统", ""];
    $("#pg-title").textContent = t[0];
    $("#pg-crumb").textContent = t[1];
    document.title = t[0] + " · 智能云 AI 电商在线销售系统";
  }

  const ROUTES = {};

  function render() {
    const k = state.route;
    if (!can(k)) {
      $("#view").innerHTML = '<div class="card empty"><div class="empty-icon">🔒</div><div>当前账号（' + esc(state.user.roleLabel) +
        '）无权访问该模块</div><div style="margin-top:14px"><a class="btn btn-primary" href="#/shop">返回商品大厅</a></div></div>';
      setTitle(k); renderNav(); updateBadges(); return;
    }
    const fn = ROUTES[k] || ROUTES.dashboard;
    $("#view").innerHTML = '<div class="page-head"><h2>' + esc(TITLES[k][0]) + "</h2><p>" + esc(TITLES[k][1]) + "</p></div>" + fn();
    setTitle(k); renderNav(); updateBadges();
    if (window.__afterRender__) { const f = window.__afterRender__; window.__afterRender__ = null; f(); }
    window.scrollTo(0, 0);
  }

  function go(route, param) {
    location.hash = "#/" + route + (param ? "/" + param : "");
  }

  function parseHash() {
    const parts = (location.hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    const def = state.user && state.user.role === "buyer" ? "shop" : "dashboard";
    state.route = parts[0] || def;
    state.param = parts[1] || null;
    if (!ROUTES[state.route]) state.route = def;
  }

  // 暴露给后续模块
  window.APP = {
    USERS: USERS, NAV: NAV, TITLES: TITLES, COVER: COVER, SESSION_ICON: SESSION_ICON,
    $: $, $$: $$, esc: esc, money: money, num: num, pct: pct, today: today,
    toast: toast, modal: modal, closeModal: closeModal,
    state: state, save: save, load: load, cartSave: cartSave, cartLoad: cartLoad, resetData: resetData,
    loadData: loadData, buildView: buildView, D: D,
    totalSales: totalSales, totalProfit: totalProfit, totalGmv: totalGmv, totalComm: totalComm,
    lowStockList: lowStockList, highRiskRecords: highRiskRecords, pendingTalents: pendingTalents,
    talentFunnel: talentFunnel, todos: todos, liveStats: liveStats,
    svgLine: svgLine, svgDonut: svgDonut, shortNum: shortNum,
    scanText: scanText, highlight: highlight, LEVEL_TAG: LEVEL_TAG,
    cartCount: cartCount, cartTotal: cartTotal, addToCart: addToCart, setQty: setQty, removeFromCart: removeFromCart,
    can: can, renderNav: renderNav, updateBadges: updateBadges, setTitle: setTitle,
    ROUTES: ROUTES, render: render, go: go, parseHash: parseHash
  };
})();
