/* =====================================================================
   智能云 AI 电商在线销售系统 · 视图（前台商城主流程）
   ---------------------------------------------------------------------
   经营工作台 / 商品大厅 / 商品详情 / 购物车 / 确认订单 / 我的订单
   ===================================================================== */
(function () {
  "use strict";
  const A = window.APP;
  const { $, $$, esc, money, num, pct, toast, modal, closeModal, state, save,
          D, totalSales, totalProfit, totalGmv, totalComm, lowStockList, highRiskRecords,
          pendingTalents, talentFunnel, todos, liveStats, svgLine, svgDonut, shortNum,
          cartCount, cartTotal, addToCart, setQty, removeFromCart, ROUTES, go, COVER, SESSION_ICON } = A;

  const LEVEL_CLS = { high: "tag-red", mid: "tag-amber", low: "tag-blue" };
  const LEVEL_TXT = { high: "高优先级", mid: "待补货", low: "进行中" };

  function kpi(cls, icon, label, value, sub, tip) {
    return '<div class="kpi ' + cls + '"><div class="lb"><span>' + icon + "</span>" + esc(label) + "</div>" +
      '<div class="vl">' + value + '</div><div class="ft">' + esc(sub) + "</div>" +
      (tip ? '<div class="ft" style="opacity:.85">' + esc(tip) + "</div>" : "") + "</div>";
  }
  function kpiMini(label, value) {
    return '<div style="padding:13px 15px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px">' +
      '<div style="font-size:12.5px;color:var(--text-3)">' + esc(label) + '</div>' +
      '<div style="font-size:20px;font-weight:700;font-variant-numeric:tabular-nums">' + value + "</div></div>";
  }
  function quick(icon, title, sub, route) {
    return '<button class="quick-btn" data-go="' + route + '"><span class="qi">' + icon +
      "</span><span><b>" + esc(title) + "</b><span>" + esc(sub) + "</span></span></button>";
  }
  function kvItem(k, v) { return '<div class="item"><span>' + esc(k) + "</span><b>" + v + "</b></div>"; }
  A.kpiMiniExport = { kpi: kpi, kpiMini: kpiMini, quick: quick, kvItem: kvItem };
  A.helpers = A.helpers || {};
  A.helpers.kpi = kpi; A.helpers.kpiMini = kpiMini; A.helpers.quick = quick; A.helpers.kvItem = kvItem;

  /* ==================================================================
     经营工作台
     ================================================================== */
  ROUTES.dashboard = function () {
    const sales = totalSales(), profit = totalProfit(), gmv = totalGmv(), comm = totalComm();
    const tl = D.talents().length, mf = D.manifest();
    const funnel = talentFunnel();
    const maxF = Math.max.apply(null, funnel.map(f => f.count)) || 1;

    const line = liveStats().slice().sort((a, b) => a.date < b.date ? -1 : 1)
      .map(s => ({ label: s.date.slice(5), value: s.gmv }));

    const top = D.profit().slice().sort((a, b) => b.salesVolume - a.salesVolume).slice(0, 10);
    const topMax = top.length ? top[0].salesVolume : 1;

    const parts = [
      { label: "抽佣提成", value: comm, color: "#f59e0b" },
      { label: "直播运营成本", value: D.profit().reduce((s, r) => s + r.liveCost, 0), color: "#8b5cf6" },
      { label: "净利润", value: profit, color: "#16a34a" }
    ];

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpi("k1", "📈", "全年实际销售额", money(sales, 0), "来自销售明细记录（实时）", "订单金额扣除退货金额后的净值") +
      kpi("k2", "💵", "直播净利润", money(profit, 0), "来自单品利润表（实时）", "GMV " + money(gmv, 0) + " − 抽佣 " + money(comm, 0) + " − 运营成本") +
      kpi("k3", "🤝", "合作达人", num(tl) + " <small>位</small>", "达人数据列表（实时）", "已出单 " + D.talents().filter(t => t.stage === "已出单").length + " 位") +
      kpi("k4", "🗄️", "数据资产", num(mf.summary.recordCount) + " <small>条</small>", mf.summary.tableCount + " 张业务数据表", "覆盖 " + mf.summary.moduleCount + " 个业务模块") +
      "</div>";

    h += '<div class="grid g2" style="margin-bottom:16px">' +
      '<div class="card"><div class="card-head"><div class="card-title">📺 每日直播 GMV<span class="card-sub">时间趋势 · 按直播场次</span></div></div>' +
      '<div class="card-pad">' + svgLine(line) + "</div></div>" +
      '<div class="card"><div class="card-head"><div class="card-title">🏆 单品销量榜<span class="card-sub">Top 10</span></div></div>' +
      '<div class="card-pad" style="max-height:290px;overflow:auto">' +
      top.map((p, i) => '<div class="bar-row"><span class="rk">' + (i + 1) + '</span><span class="nm" title="' + esc(p.name) + '">' +
        esc(p.name) + '</span><span class="track"><span class="fill" style="width:' + (p.salesVolume / topMax * 100).toFixed(1) +
        '%"></span></span><span class="vl">' + num(p.salesVolume) + "</span></div>").join("") +
      "</div></div></div>";

    h += '<div class="grid g3" style="margin-bottom:16px">' +
      '<div class="card"><div class="card-head"><div class="card-title">⚡ 业务待办</div></div><div>' +
      todos().map(t => '<div class="todo ' + (t.level === "mid" ? "mid" : t.level === "low" ? "low" : "") + '" data-go="' + t.route + '">' +
        '<span class="bar"></span><span class="tx"><b>' + esc(t.title) + '</b><span>' + esc(t.sub) + "</span></span>" +
        '<span class="tag ' + LEVEL_CLS[t.level] + '">' + LEVEL_TXT[t.level] + "</span></div>").join("") +
      "</div></div>" +
      '<div class="card"><div class="card-head"><div class="card-title">🚀 快捷操作</div></div><div class="card-pad"><div class="quick">' +
      quick("🛡️", "产品自检", "发起极限词审核", "compliance") +
      quick("🎬", "生成爆款", "创建内容任务", "live") +
      quick("🏭", "库存登记", "入库 / 出库处理", "inventory") +
      quick("📺", "创建直播", "策划与话术协同", "live") +
      "</div></div></div>" +
      '<div class="card"><div class="card-head"><div class="card-title">🎯 达人合作漏斗</div></div><div class="card-pad">' +
      funnel.map(f => '<div class="funnel-row"><span class="fl">' + esc(f.stage) + '</span><span class="ft2">' +
        '<span class="ff" style="width:' + (f.count / maxF * 100).toFixed(1) + '%">' + f.count + "</span></span>" +
        '<span class="fp">' + pct(f.count / tl) + "</span></div>").join("") +
      "</div></div></div>";

    h += '<div class="grid g3" style="margin-bottom:16px">' +
      '<div class="card span2"><div class="card-head"><div class="card-title">💹 利润构成</div><div class="card-sub">单位 CNY · 全量单品合计</div></div>' +
      '<div class="card-pad" style="display:flex;align-items:center;gap:26px;flex-wrap:wrap">' + svgDonut(parts) +
      '<div style="flex:1;min-width:210px">' +
      parts.map(p => '<div style="display:flex;align-items:center;gap:9px;padding:7px 0;font-size:13.5px">' +
        '<span style="width:9px;height:9px;border-radius:3px;background:' + p.color + '"></span>' +
        '<span style="flex:1;color:var(--text-2)">' + p.label + '</span><b class="num">' + money(p.value, 0) + "</b></div>").join("") +
      '<div style="border-top:1px solid var(--border);margin-top:9px;padding-top:11px;display:flex;gap:9px;font-size:13.5px">' +
      '<span style="flex:1;color:var(--text-2)">利润率</span><b class="num down">' + pct(profit / (gmv || 1)) + "</b></div>" +
      "</div></div></div>" +
      '<div class="card"><div class="card-head"><div class="card-title">📌 核心口径</div></div><div class="card-pad" style="font-size:12.5px;color:var(--text-2);line-height:2">' +
      "<div>· 全年实际销售额 = Σ 销售明细（订单金额 − 退货金额）</div>" +
      "<div>· GMV = 销量 × 单品产品价格</div>" +
      "<div>· 抽佣提成金额 = GMV × 抽成比例</div>" +
      "<div>· 利润 = GMV − 抽佣提成 − 直播运营成本</div>" +
      "<div>· 在架库存 = 入库数量 + 调整 − 累计出库</div>" +
      "</div></div></div>";

    h += '<div class="card"><div class="card-head"><div class="card-title">🗂️ 系统数据概况</div><div class="card-sub">最后同步 ' + esc(mf.lastSync) + '</div></div><div class="card-pad">' +
      '<div class="grid g3" style="margin-bottom:16px">' +
      kpiMini("业务数据表", mf.summary.tableCount) + kpiMini("总记录数", num(mf.summary.recordCount)) + kpiMini("覆盖业务模块", mf.summary.moduleCount) +
      "</div><div class=\"grid g4\">" +
      mf.modules.map(m => '<div style="padding:12px 14px;background:var(--surface-2);border:1px solid var(--border);border-radius:9px">' +
        '<div style="font-size:13.5px;font-weight:650;margin-bottom:4px">' + esc(m.name) + "</div>" +
        '<div style="font-size:12px;color:var(--text-3);line-height:1.6">' + esc(m.desc) + "</div>" +
        '<div style="font-size:11.5px;color:var(--text-3);margin-top:7px">' + m.tables.length + " 张表</div></div>").join("") +
      "</div></div></div>";

    window.__afterRender__ = function () {
      $$("[data-go]").forEach(el => el.addEventListener("click", () => go(el.dataset.go)));
    };
    return h;
  };

  /* ==================================================================
     商品大厅
     ================================================================== */
  const shopFilter = { q: "", cat: "全部", sort: "default" };

  ROUTES.shop = function () {
    const all = state.view.products.filter(p => p.status === "在售");
    const cats = ["全部"].concat(Array.from(new Set(all.map(p => p.category))));
    let list = all.filter(p =>
      (shopFilter.cat === "全部" || p.category === shopFilter.cat) &&
      (!shopFilter.q || (p.name + p.brand + p.spec).toLowerCase().indexOf(shopFilter.q.toLowerCase()) >= 0));
    if (shopFilter.sort === "price-asc") list = list.slice().sort((a, b) => a.price - b.price);
    else if (shopFilter.sort === "price-desc") list = list.slice().sort((a, b) => b.price - a.price);
    else if (shopFilter.sort === "sales") list = list.slice().sort((a, b) => b.salesVolume - a.salesVolume);

    let h = '<div class="shop-hero"><h2>商品大厅</h2>' +
      '<p>智能云 AI 电商在线销售系统在售商品。价格、库存、销量与关联直播场次均取自成果包业务数据表。</p>' +
      '<div class="pills"><span>在售 ' + all.length + ' 款</span>' +
      "<span>全量销量 " + num(all.reduce((s, p) => s + p.salesVolume, 0)) + " 件</span>" +
      "<span>覆盖 " + (cats.length - 1) + " 个分类</span>" +
      "<span>数据同步 " + esc(D.manifest().lastSync) + "</span></div></div>";

    h += '<div class="filters">' +
      '<input class="input" id="sp-q" placeholder="🔍 搜索商品名称 / 品牌 / 规格" value="' + esc(shopFilter.q) + '" style="min-width:280px" />' +
      '<select class="select" id="sp-sort">' +
      [["default", "综合排序"], ["sales", "销量优先"], ["price-asc", "价格从低到高"], ["price-desc", "价格从高到低"]]
        .map(o => '<option value="' + o[0] + '"' + (shopFilter.sort === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") +
      "</select>" +
      '<div class="chips" style="margin-left:auto">' +
      cats.map(c => '<span class="chip' + (shopFilter.cat === c ? " on" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</span>").join("") +
      "</div></div>";

    if (!list.length) h += '<div class="card empty"><div class="empty-icon">🔍</div><div>没有找到匹配的商品</div></div>';
    else h += '<div class="prod-grid">' + list.map(p => {
      const off = Math.round((1 - p.price / p.otherChannelPrice) * 100);
      return '<div class="prod-card">' +
        '<div class="prod-thumb" data-prod="' + p.id + '"><span>' + (COVER[p.cover] || "📦") + '</span><span class="cat">' + esc(p.category) + "</span></div>" +
        '<div class="prod-body">' +
        '<div class="pn" data-prod="' + p.id + '">' + esc(p.name) + "</div>" +
        '<div class="meta"><span>' + esc(p.brand) + '</span><span>·</span><span>销量 ' + num(p.salesVolume) + "</span></div>" +
        '<div class="meta"><span>库存 ' + num(p.stock) + (p.stock <= state.settings.lowStock ? ' <span class="up">偏低</span>' : "") + "</span></div>" +
        '<div class="price-row"><span class="price"><small>¥</small>' + p.price + "</span>" +
        (off > 0 ? '<span class="price-old">¥' + p.otherChannelPrice + '</span><span class="tag tag-red">省 ' + off + "%</span>" : "") + "</div>" +
        '<div class="acts"><button class="btn btn-sm" data-prod="' + p.id + '">详情</button>' +
        '<button class="btn btn-primary btn-sm" data-add="' + p.id + '"' + (p.stock <= 0 ? " disabled" : "") + ">加购</button></div>" +
        "</div></div>";
    }).join("") + "</div>";

    window.__afterRender__ = function () {
      const q = $("#sp-q");
      q.addEventListener("input", function () {
        shopFilter.q = this.value;
        clearTimeout(q._t);
        q._t = setTimeout(() => { const pos = this.selectionStart; render(); const n = $("#sp-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 280);
      });
      $("#sp-sort").addEventListener("change", function () { shopFilter.sort = this.value; render(); });
      $$("[data-cat]").forEach(el => el.addEventListener("click", () => { shopFilter.cat = el.dataset.cat; render(); }));
      $$("[data-prod]").forEach(el => el.addEventListener("click", () => go("product", el.dataset.prod)));
      $$("[data-add]").forEach(el => el.addEventListener("click", (e) => { e.stopPropagation(); addToCart(el.dataset.add, 1); }));
    };
    return h;
  };

  /* ==================================================================
     商品详情
     ================================================================== */
  ROUTES.product = function () {
    const p = state.view.products.find(x => x.id === state.param);
    if (!p) return '<div class="card empty"><div class="empty-icon">📦</div><div>商品不存在</div><div style="margin-top:14px"><a class="btn btn-primary" href="#/shop">返回商品大厅</a></div></div>';
    const pf = D.profit().find(x => x.productId === p.id) || {};
    const sessions = D.live().filter(s => (p.sessionIds || []).indexOf(s.id) >= 0);
    const off = Math.round((1 - p.price / p.otherChannelPrice) * 100);

    let h = '<div style="margin-bottom:16px"><button class="btn btn-sm" data-back>← 返回商品大厅</button></div>';
    h += '<div class="detail"><div><div class="detail-thumb">' + (COVER[p.cover] || "📦") + "</div></div><div>" +
      "<h2>" + esc(p.name) + '</h2><div class="spec">' + esc(p.spec) + " · " + esc(p.brand) + " · " + esc(p.category) + "</div>" +
      '<p style="color:var(--text-2);margin-top:12px;line-height:1.8">' + esc(p.desc) + "</p>" +
      '<div class="price-box"><div style="font-size:12.5px;color:var(--text-3);margin-bottom:4px">直播带货价</div>' +
      '<div class="now"><small>¥</small>' + p.price +
      (off > 0 ? ' <span style="font-size:13px;color:var(--text-3);font-weight:500">原价 ¥' + p.otherChannelPrice + " · 省 " + off + "%</span>" : "") +
      "</div></div>" +
      '<div class="kv" style="margin-bottom:18px">' +
      kvItem("库存", num(p.stock) + " 件" + (p.stock <= state.settings.lowStock ? "（低于安全线）" : "")) +
      kvItem("累计销量", num(p.salesVolume) + " 件") +
      kvItem("抽成比例", pct(p.commissionRate)) +
      kvItem("单品成本价", money(p.costPrice, 0)) +
      kvItem("所在库房", esc(p.warehouse || "—")) +
      kvItem("货架编号", esc(p.shelf || "—")) +
      "</div>";

    if (pf.gmv != null) {
      h += '<div class="card" style="margin-bottom:18px"><div class="card-head"><div class="card-title">💰 经营数据 · 单品利润表</div></div>' +
        '<div class="card-pad"><div class="kv">' + kvItem("GMV", money(pf.gmv, 0)) + kvItem("抽佣提成金额", money(pf.commission, 0)) +
        kvItem("直播运营成本", money(pf.liveCost, 0)) + kvItem("利润", '<span class="down">' + money(pf.profit, 0) + "</span>") +
        "</div></div></div>";
    }

    h += '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
      '<span style="font-size:13px;color:var(--text-3)">购买数量</span>' +
      '<span class="qty"><button data-dec>−</button><input id="dt-qty" value="1" inputmode="numeric" /><button data-inc>+</button></span>' +
      '<button class="btn btn-primary btn-lg" id="dt-add"' + (p.stock <= 0 ? " disabled" : "") + '>🛒 加入购物车</button>' +
      (p.stock <= 0 ? '<span class="tag tag-red">暂时缺货</span>' : "") + "</div>";

    if (sessions.length) {
      h += '<div class="card" style="margin-top:20px"><div class="card-head"><div class="card-title">📺 关联直播场次</div><div class="card-sub">' +
        sessions.length + ' 场</div></div><div class="card-pad"' + (sessions.length > 4 ? ' style="max-height:280px;overflow:auto"' : "") + ">" +
        sessions.map(s => '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13.5px;border-bottom:1px solid var(--border)">' +
          "<span>" + (SESSION_ICON[s.platform] || "📺") + "</span><b>" + esc(s.title) + '</b><span style="color:var(--text-3)">' + esc(s.id) +
          '</span><span style="margin-left:auto;color:var(--text-3)">' + esc(s.date) + "</span></div>").join("") +
        "</div></div>";
    }
    h += "</div></div>";

    window.__afterRender__ = function () {
      $("[data-back]").addEventListener("click", () => go("shop"));
      const inp = $("#dt-qty"), max = Math.max(1, p.stock);
      const clamp = () => { let v = parseInt(inp.value, 10) || 1; inp.value = Math.max(1, Math.min(v, max)); };
      $("[data-dec]").addEventListener("click", () => { inp.value = Math.max(1, (parseInt(inp.value, 10) || 1) - 1); });
      $("[data-inc]").addEventListener("click", () => { inp.value = Math.min(max, (parseInt(inp.value, 10) || 1) + 1); });
      inp.addEventListener("change", clamp);
      const b = $("#dt-add");
      if (b) b.addEventListener("click", () => { clamp(); addToCart(p.id, parseInt(inp.value, 10) || 1); });
    };
    return h;
  };

  /* ==================================================================
     购物车
     ================================================================== */
  function cartMath() {
    const total = cartTotal();
    const ship = total >= 199 || total === 0 ? 0 : 12;
    const discount = total >= 1000 ? Number((total * 0.03).toFixed(2)) : 0;
    return { total: total, ship: ship, discount: discount, pay: Number((total + ship - discount).toFixed(2)) };
  }
  A.cartMath = cartMath;

  ROUTES.cart = function () {
    if (!state.cart.length) {
      return '<div class="card empty"><div class="empty-icon">🛒</div><div>购物车还是空的</div>' +
        '<div style="margin-top:14px"><a class="btn btn-primary" href="#/shop">去逛逛商品大厅</a></div></div>';
    }
    const m = cartMath();
    let h = '<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start">';
    h += '<div class="card"><div class="card-head"><div class="card-title">购物车<span class="card-sub">' + cartCount() + ' 件商品</span></div>' +
      '<button class="btn btn-sm btn-ghost" id="ct-clear">清空</button></div>' +
      state.cart.map(i => '<div class="cart-line"><div class="th">' + (COVER[i.cover] || "📦") + "</div>" +
        '<div class="info"><b>' + esc(i.name) + "</b><span>" + esc(i.brand) + " · " + money(i.price, 2) + " / 件 · 库存 " + num(i.stock) + "</span></div>" +
        '<span class="qty"><button data-cdec="' + i.id + '">−</button><input data-cqty="' + i.id + '" value="' + i.qty +
        '" inputmode="numeric" /><button data-cinc="' + i.id + '">+</button></span>' +
        '<b class="num" style="width:92px;text-align:right">' + money(i.qty * i.price, 2) + "</b>" +
        '<button class="btn btn-sm btn-danger" data-cdel="' + i.id + '">删除</button></div>').join("") + "</div>";

    h += '<div class="card card-pad"><div class="card-title" style="margin-bottom:12px">订单摘要</div>' +
      '<div class="summary-row"><span>商品件数</span><b class="num">' + cartCount() + " 件</b></div>" +
      '<div class="summary-row"><span>商品金额</span><b class="num">' + money(m.total, 2) + "</b></div>" +
      '<div class="summary-row"><span>运费</span><b class="num">' + (m.ship ? money(m.ship, 2) : '<span class="down">免运费</span>') + "</b></div>" +
      '<div class="summary-row"><span>满 1000 减 3%</span><b class="num down">' + (m.discount ? "-" + money(m.discount, 2) : money(0, 2)) + "</b></div>" +
      '<div class="summary-row total"><span>应付</span><span class="v num">' + money(m.pay, 2) + "</span></div>" +
      '<button class="btn btn-primary btn-lg" style="width:100%;margin-top:16px" id="ct-checkout">去结算</button>' +
      (m.ship ? '<div style="font-size:12px;color:var(--text-3);margin-top:9px;text-align:center">再买 ' + money(199 - m.total, 2) + " 可免运费</div>" : "") +
      "</div></div>";

    window.__afterRender__ = function () {
      $$("[data-cinc]").forEach(el => el.addEventListener("click", () => { const i = state.cart.find(x => x.id === el.dataset.cinc); setQty(el.dataset.cinc, i.qty + 1); render(); }));
      $$("[data-cdec]").forEach(el => el.addEventListener("click", () => { const i = state.cart.find(x => x.id === el.dataset.cdec); setQty(el.dataset.cdec, i.qty - 1); render(); }));
      $$("[data-cqty]").forEach(el => el.addEventListener("change", () => { setQty(el.dataset.cqty, parseInt(el.value, 10) || 1); render(); }));
      $$("[data-cdel]").forEach(el => el.addEventListener("click", () => removeFromCart(el.dataset.cdel)));
      $("#ct-clear").addEventListener("click", () => { state.cart = []; A.cartSave(); A.save(); A.updateBadges(); toast("购物车已清空", "ok"); render(); });
      $("#ct-checkout").addEventListener("click", () => go("checkout"));
    };
    return h;
  };

  /* ==================================================================
     确认订单
     ================================================================== */
  ROUTES.checkout = function () {
    if (!state.cart.length) return '<div class="card empty"><div class="empty-icon">🧾</div><div>购物车为空，无法结算</div>' +
      '<div style="margin-top:14px"><a class="btn btn-primary" href="#/shop">去选购</a></div></div>';
    const m = cartMath();
    let h = '<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start">';
    h += '<div class="card"><div class="card-head"><div class="card-title">收货信息</div></div><div class="card-pad"><div class="form-grid">' +
      '<div class="field full"><label>收货人姓名 *</label><input class="input" id="ck-name" value="' + esc(state.user.name) + '" /></div>' +
      '<div class="field full"><label>联系电话 *</label><input class="input" id="ck-phone" placeholder="11 位手机号" value="" /></div>' +
      '<div class="field full"><label>收货地址 *</label><input class="input" id="ck-addr" placeholder="省 / 市 / 区 / 详细地址" value="浙江省杭州市西湖区文三路 90 号" /></div>' +
      '<div class="field full"><label>支付方式</label><select class="select" id="ck-pay"><option>支付宝</option><option>微信支付</option><option>银行卡</option><option>对公转账</option></select></div>' +
      '<div class="field full"><label>订单备注</label><textarea class="input" id="ck-note" rows="2" placeholder="选填"></textarea></div>' +
      "</div></div></div>";

    h += '<div class="card"><div class="card-head"><div class="card-title">商品清单<span class="card-sub">' + cartCount() + " 件</span></div></div>" +
      state.cart.map(i => '<div style="display:flex;align-items:center;gap:11px;padding:12px 18px;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:22px">' + (COVER[i.cover] || "📦") + "</span>" +
        '<span style="flex:1;min-width:0;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(i.name) + "</span>" +
        '<span style="color:var(--text-3);font-size:12.5px">×' + i.qty + '</span><b class="num" style="font-size:13px">' + money(i.qty * i.price, 2) + "</b></div>").join("") +
      "</div></div>";

    h += '<div class="card card-pad"><div class="card-title" style="margin-bottom:12px">支付明细</div>' +
      '<div class="summary-row"><span>商品金额</span><b class="num">' + money(m.total, 2) + "</b></div>" +
      '<div class="summary-row"><span>运费</span><b class="num">' + (m.ship ? money(m.ship, 2) : '<span class="down">免运费</span>') + "</b></div>" +
      '<div class="summary-row"><span>满减优惠</span><b class="num down">' + (m.discount ? "-" + money(m.discount, 2) : money(0, 2)) + "</b></div>" +
      '<div class="summary-row total"><span>应付</span><span class="v num">' + money(m.pay, 2) + "</span></div>" +
      '<button class="btn btn-primary btn-lg" style="width:100%;margin-top:16px" id="ck-submit">提交订单</button>' +
      '<button class="btn btn-ghost" style="width:100%;margin-top:8px" id="ck-back">返回购物车</button></div>';
    h += "</div>";

    window.__afterRender__ = function () {
      $("#ck-back").addEventListener("click", () => go("cart"));
      $("#ck-submit").addEventListener("click", () => {
        const name = $("#ck-name").value.trim(), phone = $("#ck-phone").value.trim(), addr = $("#ck-addr").value.trim();
        if (!name) { toast("请填写收货人姓名", "err"); return; }
        if (!/^1\d{10}$/.test(phone)) { toast("请填写正确的 11 位手机号", "err"); return; }
        if (addr.length < 6) { toast("请填写完整收货地址", "err"); return; }

        const d = new Date(), p = (x) => String(x).padStart(2, "0");
        const stamp = "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
        const orderNo = "SO" + stamp;
        const order = {
          orderNo: orderNo, customer: name, phone: phone, address: addr, pay: $("#ck-pay").value,
          note: $("#ck-note").value.trim(), amount: m.pay, freight: m.ship, discount: m.discount,
          goodsAmount: m.total, qty: cartCount(), status: "进行中",
          createDate: d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()),
          owner: state.user.name, plate: "自有商城", source: "商城下单",
          items: state.cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, cover: i.cover }))
        };
        state.cart.forEach(i => { const pr = state.view.products.find(x => x.id === i.id); if (pr) pr.stock = Math.max(0, pr.stock - i.qty); });
        state.view.shopOrders.unshift(order);
        state.cart = []; A.cartSave(); save(); A.updateBadges();

        modal("订单提交成功",
          '<div style="text-align:center;padding:8px 0 4px"><div style="font-size:44px;margin-bottom:10px">✅</div>' +
          '<div style="font-size:16px;font-weight:650;margin-bottom:6px">订单号 ' + esc(orderNo) + "</div>" +
          '<div style="color:var(--text-3);font-size:13px">支付金额 <b class="up">' + money(order.amount, 2) + "</b> · " + esc(order.pay) + "</div>" +
          '<div style="color:var(--text-3);font-size:13px;margin-top:6px">收货人 ' + esc(name) + " " + esc(phone) + "</div>" +
          '<div style="color:var(--text-3);font-size:12.5px;margin-top:4px">' + esc(addr) + "</div></div>",
          '<button class="btn" data-close>继续购物</button><button class="btn btn-primary" id="to-my-orders">查看我的订单</button>');
        const b = $("#to-my-orders");
        if (b) b.addEventListener("click", () => { closeModal(); go("my-orders"); });
        toast("订单提交成功", "ok");
      });
    };
    return h;
  };

  /* ==================================================================
     我的订单
     ================================================================== */
  ROUTES["my-orders"] = function () {
    const mine = state.view.shopOrders || [];
    let h;
    if (!mine.length) {
      h = '<div class="card empty"><div class="empty-icon">📦</div><div>还没有订单记录</div><div style="margin-top:14px"><a class="btn btn-primary" href="#/shop">去下单</a></div></div>';
    } else {
      h = '<div class="grid" style="gap:14px">' + mine.map(o =>
        '<div class="card"><div class="card-head"><div class="card-title">订单号 ' + esc(o.orderNo) +
        '<span class="card-sub">' + esc(o.createDate) + "</span></div>" +
        '<span class="tag ' + (o.status === "已完成" ? "tag-green" : o.status === "进行中" ? "tag-blue" : "tag-gray") + '">' + esc(o.status) + "</span></div>" +
        '<div class="card-pad">' +
        o.items.map(i => '<div style="display:flex;align-items:center;gap:11px;padding:7px 0;font-size:13.5px">' +
          '<span style="font-size:20px">' + (COVER[i.cover] || "📦") + '</span>' +
          '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(i.name) + "</span>" +
          '<span style="color:var(--text-3)">×' + i.qty + '</span><b class="num">' + money(i.qty * i.price, 2) + "</b></div>").join("") +
        '<div style="border-top:1px solid var(--border);margin-top:10px;padding-top:11px;display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:var(--text-3)">' +
        "<span>收货人：" + esc(o.customer) + "</span><span>电话：" + esc(o.phone || "—") + "</span><span>支付：" + esc(o.pay) + "</span>" +
        "<span>地址：" + esc(o.address) + "</span></div>" +
        '<div style="margin-top:12px;display:flex;align-items:center;gap:10px">' +
        '<span style="font-size:12.5px;color:var(--text-3)">实付</span><b class="up num" style="font-size:18px">' + money(o.amount, 2) + "</b>" +
        (o.status === "进行中"
          ? '<button class="btn btn-sm" style="margin-left:auto" data-recv="' + esc(o.orderNo) + '">确认收货</button>' +
            '<button class="btn btn-sm btn-danger" data-cancel="' + esc(o.orderNo) + '">取消订单</button>'
          : "") +
        "</div></div></div>").join("") + "</div>";
    }
    window.__afterRender__ = function () {
      $$("[data-recv]").forEach(el => el.addEventListener("click", () => {
        const o = state.view.shopOrders.find(x => x.orderNo === el.dataset.recv);
        if (o) o.status = "已完成";
        save(); toast("已确认收货", "ok"); render();
      }));
      $$("[data-cancel]").forEach(el => el.addEventListener("click", () => {
        const o = state.view.shopOrders.find(x => x.orderNo === el.dataset.cancel);
        if (!o) return;
        o.status = "已取消";
        o.items.forEach(i => { const p = state.view.products.find(x => x.id === i.id); if (p) p.stock += i.qty; });
        save(); toast("订单已取消，库存已回退", "ok"); render();
      }));
    };
    return h;
  };
})();
