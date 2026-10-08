/* =====================================================================
   智能云 AI 电商在线销售系统 · 视图（后台经营模块）
   ---------------------------------------------------------------------
   商品 / 库存 / 订单 / 直播 / 利润 / 极限词自检 / 达人 / 销售明细 / 设置
   ===================================================================== */
(function () {
  "use strict";
  const A = window.APP;
  const { $, $$, esc, money, num, pct, toast, modal, closeModal, state, save,
          D, lowStockList, ROUTES, go, COVER, SESSION_ICON, scanText, highlight, LEVEL_TAG,
          svgDonut, shortNum, liveStats, talentFunnel } = A;
  const H = A.helpers;
  const kpiMini = H.kpiMini;

  /* ---------------- 通用：防抖搜索 ---------------- */
  function bindSearch(sel, obj, key, after) {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("input", function () {
      obj[key] = this.value;
      clearTimeout(el._t);
      el._t = setTimeout(() => {
        const pos = this.selectionStart;
        render();
        const n = $(sel);
        if (n) { n.focus(); n.setSelectionRange(pos, pos); }
      }, 280);
    });
  }

  /* ==================================================================
     商品管理
     ================================================================== */
  const prodFilter = { q: "", cat: "全部", status: "全部" };

  ROUTES.products = function () {
    const cats = ["全部"].concat(Array.from(new Set(state.view.products.map(p => p.category))));
    const list = state.view.products.filter(p =>
      (prodFilter.cat === "全部" || p.category === prodFilter.cat) &&
      (prodFilter.status === "全部" || p.status === prodFilter.status) &&
      (!prodFilter.q || (p.name + p.brand).toLowerCase().indexOf(prodFilter.q.toLowerCase()) >= 0));
    const low = state.view.products.filter(p => p.stock <= state.settings.lowStock).length;

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("商品总数", num(state.view.products.length)) +
      kpiMini("在售商品", num(state.view.products.filter(p => p.status === "在售").length)) +
      kpiMini("低库存预警", '<span class="up">' + low + "</span>") +
      kpiMini("全量销量", num(state.view.products.reduce((s, p) => s + p.salesVolume, 0)) + " 件") + "</div>";

    h += '<div class="filters">' +
      '<input class="input" id="pd-q" placeholder="🔍 搜索商品名称 / 品牌" value="' + esc(prodFilter.q) + '" />' +
      '<select class="select" id="pd-cat">' + cats.map(c => "<option" + (prodFilter.cat === c ? " selected" : "") + ">" + esc(c) + "</option>").join("") + "</select>" +
      '<select class="select" id="pd-st">' + ["全部", "在售", "已下架"].map(c => "<option" + (prodFilter.status === c ? " selected" : "") + ">" + c + "</option>").join("") + "</select>" +
      '<button class="btn btn-primary" style="margin-left:auto" id="pd-new">+ 新增商品</button></div>';

    h += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
      ["商品编号", "商品名称", "品牌", "分类", "售价", "成本价", "抽成", "库存", "销量", "状态", "操作"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" +
      (list.length ? list.map(p => "<tr>" +
        '<td class="num">' + esc(p.id) + "</td>" +
        '<td><b style="color:var(--text)">' + esc(p.name) + '</b><div style="font-size:11.5px;color:var(--text-3)">' + esc(p.spec) + "</div></td>" +
        "<td>" + esc(p.brand) + "</td><td>" + esc(p.category) + "</td>" +
        '<td class="num up">' + money(p.price, 2) + '</td><td class="num">' + money(p.costPrice, 2) + "</td>" +
        '<td class="num">' + pct(p.commissionRate) + "</td>" +
        '<td class="num">' + num(p.stock) + (p.stock <= state.settings.lowStock ? ' <span class="tag tag-red">低</span>' : "") + "</td>" +
        '<td class="num">' + num(p.salesVolume) + "</td>" +
        '<td><span class="tag ' + (p.status === "在售" ? "tag-green" : "tag-gray") + '">' + esc(p.status) + "</span></td>" +
        '<td><button class="btn btn-sm" data-edit="' + p.id + '">编辑</button> <button class="btn btn-sm" data-toggle="' + p.id + '">' +
        (p.status === "在售" ? "下架" : "上架") + "</button></td></tr>").join("")
        : '<tr><td colspan="11"><div class="empty">没有匹配的商品</div></td></tr>') +
      "</tbody></table></div></div>";

    window.__afterRender__ = function () {
      bindSearch("#pd-q", prodFilter, "q");
      $("#pd-cat").addEventListener("change", function () { prodFilter.cat = this.value; render(); });
      $("#pd-st").addEventListener("change", function () { prodFilter.status = this.value; render(); });
      $("#pd-new").addEventListener("click", () => productForm(null));
      $$("[data-edit]").forEach(el => el.addEventListener("click", () => productForm(el.dataset.edit)));
      $$("[data-toggle]").forEach(el => el.addEventListener("click", () => {
        const p = state.view.products.find(x => x.id === el.dataset.toggle);
        p.status = p.status === "在售" ? "已下架" : "在售";
        save(); toast(p.name + " 已" + p.status, "ok"); render();
      }));
    };
    return h;
  };

  function productForm(id) {
    const isNew = !id;
    const p = isNew
      ? { id: "", name: "", brand: "", category: "数码家电", spec: "", price: 0, costPrice: 0, otherChannelPrice: 0,
          commissionRate: 0.1, salesVolume: 0, stock: 0, status: "在售", cover: "phone", desc: "", warehouse: "", shelf: "", sessionIds: [] }
      : state.view.products.find(x => x.id === id);
    const cats = Array.from(new Set(state.view.products.map(x => x.category)));
    const body = '<div class="form-grid">' +
      '<div class="field"><label>商品编号 *</label><input class="input" id="pf-id" value="' + esc(p.id) + '" ' + (isNew ? "" : "readonly") + ' /></div>' +
      '<div class="field"><label>商品名称 *</label><input class="input" id="pf-name" value="' + esc(p.name) + '" /></div>' +
      '<div class="field"><label>品牌</label><input class="input" id="pf-brand" value="' + esc(p.brand) + '" /></div>' +
      '<div class="field"><label>分类</label><input class="input" id="pf-cat" list="pf-cats" value="' + esc(p.category) + '" /><datalist id="pf-cats">' +
        cats.map(c => '<option value="' + esc(c) + '">').join("") + "</datalist></div>" +
      '<div class="field full"><label>规格</label><input class="input" id="pf-spec" value="' + esc(p.spec) + '" /></div>' +
      '<div class="field"><label>售价（元）*</label><input class="input" id="pf-price" type="number" step="0.01" value="' + p.price + '" /></div>' +
      '<div class="field"><label>成本价（元）</label><input class="input" id="pf-cost" type="number" step="0.01" value="' + p.costPrice + '" /></div>' +
      '<div class="field"><label>其他渠道价（元）</label><input class="input" id="pf-other" type="number" step="0.01" value="' + p.otherChannelPrice + '" /></div>' +
      '<div class="field"><label>抽成比例（0–1）</label><input class="input" id="pf-comm" type="number" step="0.01" min="0" max="1" value="' + p.commissionRate + '" /></div>' +
      '<div class="field"><label>库存</label><input class="input" id="pf-stock" type="number" value="' + p.stock + '" /></div>' +
      '<div class="field"><label>累计销量</label><input class="input" id="pf-sales" type="number" value="' + p.salesVolume + '" /></div>' +
      '<div class="field"><label>状态</label><select class="select" id="pf-status"><option' + (p.status === "在售" ? " selected" : "") +
        '>在售</option><option' + (p.status === "已下架" ? " selected" : "") + ">已下架</option></select></div>" +
      '<div class="field full"><label>商品描述</label><textarea class="input" id="pf-desc" rows="2">' + esc(p.desc) + "</textarea></div></div>";

    modal(isNew ? "新增商品" : "编辑商品 · " + p.name, body,
      '<button class="btn" data-close>取消</button><button class="btn btn-primary" id="pf-save">保存</button>');

    $("#pf-save").addEventListener("click", () => {
      const pid = $("#pf-id").value.trim(), name = $("#pf-name").value.trim(), price = parseFloat($("#pf-price").value);
      if (!pid) { toast("请填写商品编号", "err"); return; }
      if (!name) { toast("请填写商品名称", "err"); return; }
      if (!(price > 0)) { toast("请填写有效售价", "err"); return; }
      if (isNew && state.view.products.some(x => x.id === pid)) { toast("商品编号已存在", "err"); return; }
      const obj = {
        id: pid, name: name, brand: $("#pf-brand").value.trim(), category: $("#pf-cat").value.trim() || "未分类",
        spec: $("#pf-spec").value.trim(), price: price, costPrice: parseFloat($("#pf-cost").value) || 0,
        otherChannelPrice: parseFloat($("#pf-other").value) || price,
        commissionRate: Math.min(1, Math.max(0, parseFloat($("#pf-comm").value) || 0)),
        stock: parseInt($("#pf-stock").value, 10) || 0, salesVolume: parseInt($("#pf-sales").value, 10) || 0,
        status: $("#pf-status").value, desc: $("#pf-desc").value.trim(),
        cover: p.cover || "phone", warehouse: p.warehouse || "", shelf: p.shelf || "", sessionIds: p.sessionIds || []
      };
      if (isNew) state.view.products.unshift(obj); else Object.assign(p, obj);
      save(); closeModal(); toast(isNew ? "商品已新增" : "商品已更新", "ok"); render();
    });
  }

  /* ==================================================================
     库存管理
     ================================================================== */
  const invTab = { t: "in", q: "" };

  ROUTES.inventory = function () {
    const low = lowStockList();
    const inRows = state.view.invIn.filter(r => !invTab.q ||
      (r.product + r.batch).toLowerCase().indexOf(invTab.q.toLowerCase()) >= 0);
    const outRows = D.invOut().filter(r => !invTab.q ||
      (r.product + r.batch).toLowerCase().indexOf(invTab.q.toLowerCase()) >= 0);

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("入库批次", num(state.view.invIn.length) + " 批") +
      kpiMini("出库批次", num(D.invOut().length) + " 批") +
      kpiMini("在架库存合计", num(state.view.invIn.reduce((s, r) => s + r.stock, 0)) + " 件") +
      kpiMini("低库存商品", '<span class="up">' + low.length + " 款</span>") + "</div>";

    if (low.length) {
      h += '<div class="card" style="margin-bottom:16px"><div class="card-head">' +
        '<div class="card-title">⚠️ 低库存预警<span class="card-sub">库存 ≤ ' + state.settings.lowStock + ' 件</span></div>' +
        '<span class="tag tag-red">' + low.length + ' 款待补货</span></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr><th>商品</th><th>当前库存</th><th>安全线</th><th>缺口</th><th>所在库房</th><th>操作</th></tr></thead><tbody>' +
        low.map(p => '<tr><td><b style="color:var(--text)">' + esc(p.name) + '</b></td><td class="num up">' + num(p.stock) +
          '</td><td class="num">' + state.settings.lowStock + '</td><td class="num up">' + num(Math.max(0, state.settings.lowStock - p.stock)) +
          "</td><td>" + esc(p.warehouse || "—") + '</td><td><button class="btn btn-sm btn-primary" data-in="' + p.id + '">登记入库</button></td></tr>').join("") +
        "</tbody></table></div></div>";
    }

    h += '<div class="filters">' +
      '<div class="chips"><span class="chip' + (invTab.t === "in" ? " on" : "") + '" data-inv="in">入库记录</span>' +
      '<span class="chip' + (invTab.t === "out" ? " on" : "") + '" data-inv="out">出库记录</span></div>' +
      '<input class="input" id="iv-q" placeholder="🔍 搜索商品 / 批次号" value="' + esc(invTab.q) + '" style="min-width:240px" />' +
      '<button class="btn btn-primary" style="margin-left:auto" data-in="">+ 入库登记</button>' +
      '<button class="btn" data-out="">+ 出库登记</button></div>';

    if (invTab.t === "in") {
      h += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
        ["入存批次编号", "商品", "采购负责人", "货架", "入库数量", "累计出库", "调整", "在架库存", "货架所在位置", "入库时间"].map(c => "<th>" + c + "</th>").join("") +
        "</tr></thead><tbody>" + (inRows.length ? inRows.map(r => "<tr>" +
          '<td class="num">' + esc(r.batch) + '</td><td><b style="color:var(--text)">' + esc(r.product) + "</b></td>" +
          "<td>" + esc(r.buyer || "—") + '</td><td class="num">' + esc(r.shelf || "—") + "</td>" +
          '<td class="num">' + num(r.inQty) + '</td><td class="num">' + num(r.outQty) + "</td>" +
          '<td class="num">' + (r.adjust ? (r.adjust > 0 ? "+" : "") + r.adjust : "—") + "</td>" +
          '<td class="num ' + (r.stock <= state.settings.lowStock ? "up" : "") + '"><b>' + num(r.stock) + "</b></td>" +
          '<td style="color:var(--text-3)">' + esc(r.warehouse || "—") + '</td><td style="color:var(--text-3)">' + esc(r.inTime || "—") + "</td></tr>").join("")
          : '<tr><td colspan="10"><div class="empty">没有匹配的入库记录</div></td></tr>') + "</tbody></table></div></div>";
    } else {
      h += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
        ["出库批次编号", "商品", "货架位置描述", "出库货架", "出库数量", "负责人", "出库时间"].map(c => "<th>" + c + "</th>").join("") +
        "</tr></thead><tbody>" + (outRows.length ? outRows.map(r => "<tr>" +
          '<td class="num">' + esc(r.batch) + '</td><td><b style="color:var(--text)">' + esc(r.product) + "</b></td>" +
          '<td style="color:var(--text-3)">' + esc(r.shelfDesc || "—") + '</td><td class="num">' + esc(r.outShelf || "—") + "</td>" +
          '<td class="num up">' + num(r.outQty) + '</td><td>' + esc(r.owner || "—") + '</td><td style="color:var(--text-3)">' + esc(r.outTime || "—") + "</td></tr>").join("")
          : '<tr><td colspan="7"><div class="empty">没有匹配的出库记录</div></td></tr>') + "</tbody></table></div></div>";
    }

    window.__afterRender__ = function () {
      $$("[data-inv]").forEach(el => el.addEventListener("click", () => { invTab.t = el.dataset.inv; render(); }));
      bindSearch("#iv-q", invTab, "q");
      $$("[data-in]").forEach(el => el.addEventListener("click", () => invForm("in", el.dataset.in || null)));
      $$("[data-out]").forEach(el => el.addEventListener("click", () => invForm("out", null)));
    };
    return h;
  };

  function invForm(kind, pid) {
    const isIn = kind === "in";
    const sel = pid ? state.view.products.find(x => x.id === pid) : null;
    const opts = state.view.products.map(x => '<option value="' + x.id + '"' + (sel && sel.id === x.id ? " selected" : "") + ">" +
      esc(x.name) + "（库存 " + x.stock + "）</option>").join("");
    const body = '<div class="form-grid">' +
      '<div class="field full"><label>选择商品 *</label><select class="select" id="iv-prod"><option value="">请选择</option>' + opts + "</select></div>" +
      '<div class="field"><label>' + (isIn ? "入库数量 *" : "出库数量 *") + '</label><input class="input" id="iv-qty" type="number" min="1" value="' +
        (isIn ? 100 : 1) + '" /></div>' +
      '<div class="field"><label>负责人</label><input class="input" id="iv-owner" value="' + esc(state.user.name) + '" /></div>' +
      '<div class="field"><label>货架编号</label><input class="input" id="iv-shelf" value="HUOJIA0001" /></div>' +
      '<div class="field"><label>货架位置描述</label><input class="input" id="iv-wh" placeholder="如：星空仓2号架8号位" /></div></div>';

    modal(isIn ? "入库登记 · 样品入库管理" : "出库登记 · 样品出库管理", body,
      '<button class="btn" data-close>取消</button><button class="btn btn-primary" id="iv-save">提交</button>');

    $("#iv-save").addEventListener("click", () => {
      const id = $("#iv-prod").value, qty = parseInt($("#iv-qty").value, 10);
      if (!id) { toast("请选择商品", "err"); return; }
      if (!(qty > 0)) { toast("请填写有效数量", "err"); return; }
      const prod = state.view.products.find(x => x.id === id);
      const owner = $("#iv-owner").value.trim();
      const shelf = $("#iv-shelf").value.trim() || "HUOJIA0001";
      const wh = $("#iv-wh").value.trim();
      const seq = state.view.invIn.length + D.invOut().length + 21;
      const batch = (isIn ? "PUTIN" : "OUTPUT") + String(seq).padStart(5, "0");
      const today = A.today();

      if (isIn) {
        state.view.invIn.unshift({ batch: batch, product: prod.name, buyer: owner, shelf: shelf,
          inQty: qty, outQty: 0, adjust: 0, stock: qty, warehouse: wh, location: "", inTime: today });
        prod.stock += qty;
        toast("入库成功：+" + qty + " 件 " + prod.name, "ok");
      } else {
        if (qty > prod.stock) { toast("出库数量超过当前库存（" + prod.stock + " 件）", "err"); return; }
        D.invOut().unshift({ batch: batch, product: prod.name, shelfDesc: wh, outShelf: shelf,
          latestStock: String(prod.stock - qty), outQty: qty, owner: owner, outTime: today });
        prod.stock -= qty;
        const line = state.view.invIn.find(r => r.product === prod.name);
        if (line) { line.outQty += qty; line.stock = line.inQty + (line.adjust || 0) - line.outQty; }
        toast("出库成功：-" + qty + " 件 " + prod.name, "ok");
      }
      save(); closeModal(); render();
    });
  }

  /* ==================================================================
     订单管理
     ================================================================== */
  const ordFilter = { q: "", status: "全部" };
  const ORDER_FLOW = { "进行中": ["已完成", "退单", "已取消"], "已完成": ["退单"], "已取消": [], "退单": [] };

  ROUTES.orders = function () {
    const biz = state.view.orders;
    const shop = state.view.shopOrders || [];
    const list = biz.filter(o =>
      (ordFilter.status === "全部" || o.status === ordFilter.status) &&
      (!ordFilter.q || (o.orderNo + o.customer + o.productName).toLowerCase().indexOf(ordFilter.q.toLowerCase()) >= 0));
    const amount = biz.filter(o => o.status !== "已取消" && o.status !== "退单").reduce((s, o) => s + o.amount, 0);
    const shopAmt = shop.filter(o => o.status !== "已取消").reduce((s, o) => s + o.amount, 0);

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("订单总数", num(biz.length + shop.length)) +
      kpiMini("进行中", num(biz.filter(o => o.status === "进行中").length + shop.filter(o => o.status === "进行中").length)) +
      kpiMini("有效订单金额", money(amount + shopAmt, 0)) +
      kpiMini("异常订单", '<span class="up">' + num(biz.filter(o => o.status === "退单" || o.status === "已取消").length) + " 笔</span>") + "</div>";

    if (shop.length) {
      h += '<div class="card" style="margin-bottom:16px"><div class="card-head">' +
        '<div class="card-title">🛒 商城前台订单<span class="card-sub">演示账号实时下单</span></div>' +
        '<span class="tag tag-blue">' + shop.length + ' 笔</span></div>' +
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        ["订单号", "收货人", "商品", "件数", "实付", "状态", "下单时间", "操作"].map(c => "<th>" + c + "</th>").join("") +
        "</tr></thead><tbody>" + shop.map(o => '<tr><td class="num">' + esc(o.orderNo) + "</td><td>" + esc(o.customer) + "</td>" +
          '<td style="max-width:260px;overflow:hidden;text-overflow:ellipsis">' + o.items.map(i => esc(i.name) + " ×" + i.qty).join("、") + "</td>" +
          '<td class="num">' + o.qty + '</td><td class="num up">' + money(o.amount, 2) + "</td>" +
          '<td><span class="tag ' + (o.status === "已完成" ? "tag-green" : o.status === "进行中" ? "tag-blue" : "tag-gray") + '">' + esc(o.status) + "</span></td>" +
          '<td style="color:var(--text-3)">' + esc(o.createDate) + "</td>" +
          '<td><button class="btn btn-sm" data-shop="' + esc(o.orderNo) + '">详情</button></td></tr>').join("") +
        "</tbody></table></div></div>";
    }

    h += '<div class="filters">' +
      '<input class="input" id="od-q" placeholder="🔍 搜索订单号 / 客户 / 商品" value="' + esc(ordFilter.q) + '" style="min-width:260px" />' +
      '<select class="select" id="od-st">' + ["全部", "进行中", "已完成", "已取消", "退单"].map(s =>
        "<option" + (ordFilter.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select></div>";

    h += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
      ["订单编号", "客户", "商品名称", "订单类型", "订单金额", "数量", "订单状态", "折扣率", "签约日期", "创建日期", "订单负责人", "操作"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + (list.length ? list.map(o => "<tr>" +
        '<td class="num">' + esc(o.orderNo) + "</td><td>" + esc(o.customer) + "</td>" +
        '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">' + esc(o.productName) + "</td>" +
        '<td><span class="tag tag-gray">' + esc(o.type) + "</span></td>" +
        '<td class="num up">' + money(o.amount, 2) + '</td><td class="num">' + num(o.qty) + "</td>" +
        '<td><span class="tag ' + (o.status === "已完成" ? "tag-green" : o.status === "进行中" ? "tag-blue" : "tag-red") + '">' + esc(o.status) + "</span></td>" +
        '<td class="num">' + esc(o.discount) + '</td><td style="color:var(--text-3)">' + esc(o.signDate) + "</td>" +
        '<td style="color:var(--text-3)">' + esc(o.createDate) + "</td><td>" + esc(o.owner) + "</td>" +
        '<td><button class="btn btn-sm" data-ord="' + esc(o.orderNo) + '">状态流转</button></td></tr>').join("")
        : '<tr><td colspan="12"><div class="empty">没有匹配的订单</div></td></tr>') + "</tbody></table></div></div>";

    window.__afterRender__ = function () {
      bindSearch("#od-q", ordFilter, "q");
      $("#od-st").addEventListener("change", function () { ordFilter.status = this.value; render(); });
      $$("[data-ord]").forEach(el => el.addEventListener("click", () => orderFlow(el.dataset.ord)));
      $$("[data-shop]").forEach(el => el.addEventListener("click", () => shopOrderDetail(el.dataset.shop)));
    };
    return h;
  };

  function orderFlow(orderNo) {
    const o = state.view.orders.find(x => x.orderNo === orderNo);
    if (!o) return;
    const next = ORDER_FLOW[o.status] || [];
    if (!next.length) { toast("当前状态（" + o.status + "）已为终态，无需流转", "warn"); return; }
    modal("订单状态流转 · " + orderNo,
      '<div style="font-size:13.5px;line-height:2;color:var(--text-2)">' +
      "<div>客户：<b style=\"color:var(--text)\">" + esc(o.customer) + "</b></div>" +
      "<div>商品：<b style=\"color:var(--text)\">" + esc(o.productName) + "</b></div>" +
      "<div>金额：<b class=\"up\">" + money(o.amount, 2) + "</b> · 数量 " + num(o.qty) + "</div>" +
      "<div>当前状态：<b style=\"color:var(--text)\">" + esc(o.status) + "</b></div></div>" +
      '<div class="form-grid" style="margin-top:16px"><div class="field full"><label>流转为</label><select class="select" id="of-next">' +
      next.map(s => "<option>" + s + "</option>").join("") + "</select></div></div>",
      '<button class="btn" data-close>取消</button><button class="btn btn-primary" id="of-save">确认流转</button>');
    $("#of-save").addEventListener("click", () => {
      const to = $("#of-next").value;
      o.status = to;
      if (to === "退单") {
        const p = state.view.products.find(x => x.name === o.productName);
        if (p) p.stock += o.qty;
      }
      save(); closeModal(); toast(orderNo + " 已流转为「" + to + "」", "ok"); render();
    });
  }

  function shopOrderDetail(orderNo) {
    const o = state.view.shopOrders.find(x => x.orderNo === orderNo);
    if (!o) return;
    modal("商城订单详情 · " + orderNo,
      '<div style="font-size:13.5px;line-height:2;color:var(--text-2)">' +
      "<div>收货人：<b style=\"color:var(--text)\">" + esc(o.customer) + "</b></div>" +
      "<div>联系电话：" + esc(o.phone || "—") + "</div>" +
      "<div>收货地址：" + esc(o.address) + "</div>" +
      "<div>支付方式：" + esc(o.pay) + "</div>" +
      "<div>下单时间：" + esc(o.createDate) + "</div>" +
      (o.note ? "<div>备注：" + esc(o.note) + "</div>" : "") + "</div>" +
      '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">' +
      o.items.map(i => '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:13.5px">' +
        "<span style=\"font-size:20px\">" + (COVER[i.cover] || "📦") + "</span><span style=\"flex:1\">" + esc(i.name) + "</span>" +
        '<span style="color:var(--text-3)">×' + i.qty + '</span><b class="num">' + money(i.qty * i.price, 2) + "</b></div>").join("") +
      '<div class="summary-row" style="margin-top:8px"><span>商品金额</span><b class="num">' + money(o.goodsAmount, 2) + "</b></div>" +
      '<div class="summary-row"><span>运费</span><b class="num">' + money(o.freight, 2) + "</b></div>" +
      '<div class="summary-row"><span>优惠</span><b class="num down">-' + money(o.discount, 2) + "</b></div>" +
      '<div class="summary-row total"><span>实付</span><span class="v num">' + money(o.amount, 2) + "</span></div></div>",
      '<button class="btn" data-close>关闭</button>');
  }

  /* ==================================================================
     直播运营
     ================================================================== */
  ROUTES.live = function () {
    const stats = liveStats().slice().sort((a, b) => a.date < b.date ? 1 : -1);
    const totalGmv = stats.reduce((s, x) => s + x.gmv, 0);
    const totalProfit = stats.reduce((s, x) => s + x.profit, 0);
    const line = stats.slice().sort((a, b) => a.date < b.date ? -1 : 1).map(s => ({ label: s.date.slice(5), value: s.gmv }));

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("直播场次", num(stats.length) + " 场") +
      kpiMini("场次 GMV 合计", money(totalGmv, 0)) +
      kpiMini("场次利润合计", '<span class="down">' + money(totalProfit, 0) + "</span>") +
      kpiMini("场均 GMV", money(totalGmv / (stats.length || 1), 0)) + "</div>";

    h += '<div class="grid g2" style="margin-bottom:16px">' +
      '<div class="card"><div class="card-head"><div class="card-title">📈 场次 GMV 趋势</div></div><div class="card-pad">' + A.svgLine(line) + "</div></div>" +
      '<div class="card"><div class="card-head"><div class="card-title">🎯 达人合作漏斗</div></div><div class="card-pad">' +
      (function () {
        const f = talentFunnel(), mx = Math.max.apply(null, f.map(x => x.count)) || 1;
        const tot = D.talents().length;
        return f.map(x => '<div class="funnel-row"><span class="fl">' + esc(x.stage) + '</span><span class="ft2">' +
          '<span class="ff" style="width:' + (x.count / mx * 100).toFixed(1) + '%">' + x.count + "</span></span>" +
          '<span class="fp">' + pct(x.count / tot) + "</span></div>").join("");
      })() + "</div></div></div>";

    h += '<div class="card" style="margin-bottom:16px"><div class="card-head"><div class="card-title">📺 直播场次列表<span class="card-sub">' +
      stats.length + ' 场</span></div></div><div class="table-wrap"><table class="data"><thead><tr>' +
      ["场次编号", "直播标题", "直播日期", "主播 / 达人", "平台", "关联单品", "销量", "场次 GMV", "场次利润", "状态"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + stats.map(s => "<tr>" +
        '<td class="num">' + esc(s.id) + "</td>" +
        '<td><b style="color:var(--text)">' + esc(s.title) + "</b></td>" +
        '<td style="color:var(--text-3)">' + esc(s.date) + "</td>" +
        "<td>" + esc(s.talent) + "</td>" +
        "<td>" + (SESSION_ICON[s.platform] || "") + " " + esc(s.platform) + "</td>" +
        '<td class="num">' + s.itemCount + '</td><td class="num">' + num(s.qty) + "</td>" +
        '<td class="num up">' + money(s.gmv, 0) + '</td><td class="num down">' + money(s.profit, 0) + "</td>" +
        '<td><span class="tag tag-gray">' + esc(s.status) + "</span></td></tr>").join("") +
      "</tbody></table></div></div>";

    h += '<div class="card"><div class="card-head"><div class="card-title">🔍 近期直播复盘建议<span class="card-sub">workbuddy 复盘专家</span></div></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      ["关联场次", "指标", "本场数据", "行业均值", "问题等级", "归因", "改进方案"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + D.review().map(r => "<tr>" +
        '<td class="num">' + esc(r.session) + "</td><td>" + esc(r.metric) + "</td>" +
        '<td class="num up">' + esc(r.value) + '</td><td class="num">' + esc(r.benchmark) + "</td>" +
        '<td><span class="tag tag-red">' + esc(r.level) + "</span></td>" +
        '<td style="white-space:normal;max-width:240px">' + esc(r.cause) + "</td>" +
        '<td style="white-space:normal;max-width:300px">' + esc(r.action) + "</td></tr>").join("") +
      "</tbody></table></div></div>";
    return h;
  };

  /* ==================================================================
     利润分析
     ================================================================== */
  ROUTES.profit = function () {
    const pf = D.profit();
    const gmv = A.totalGmv(), comm = A.totalComm(), cost = pf.reduce((s, r) => s + r.liveCost, 0);
    const profit = A.totalProfit();

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("全量 GMV", money(gmv, 0)) +
      kpiMini("抽佣提成合计", money(comm, 0)) +
      kpiMini("直播运营成本", money(cost, 0)) +
      kpiMini("净利润合计", '<span class="down">' + money(profit, 0) + "</span>") + "</div>";

    h += '<div class="grid g3" style="margin-bottom:16px">' +
      '<div class="card span2"><div class="card-head"><div class="card-title">💹 利润构成</div>' +
      '<div class="card-sub">GMV = 抽佣 + 运营成本 + 净利润</div></div>' +
      '<div class="card-pad" style="display:flex;align-items:center;gap:26px;flex-wrap:wrap">' +
      svgDonut([{ label: "抽佣提成", value: comm, color: "#f59e0b" },
                { label: "直播运营成本", value: cost, color: "#8b5cf6" },
                { label: "净利润", value: profit, color: "#16a34a" }]) +
      '<div style="flex:1;min-width:200px;font-size:13.5px">' +
      [["GMV 合计", money(gmv, 0), ""], ["抽佣提成合计", money(comm, 0), ""],
       ["直播运营成本", money(cost, 0), ""], ["净利润合计", money(profit, 0), "down"],
       ["综合利润率", pct(profit / (gmv || 1)), "down"]].map(x =>
        '<div style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid var(--border)">' +
        '<span style="flex:1;color:var(--text-2)">' + x[0] + '</span><b class="num ' + x[2] + '">' + x[1] + "</b></div>").join("") +
      "</div></div></div>" +
      '<div class="card"><div class="card-head"><div class="card-title">📐 计算公式</div></div><div class="card-pad" style="font-size:12.5px;color:var(--text-2);line-height:2.1">' +
      "<div>1. GMV = 销量 × 单品产品价格</div>" +
      "<div>2. 抽佣提成金额 = GMV × 抽成比例</div>" +
      "<div>3. 利润 = GMV − 抽佣提成金额 − 直播运营成本</div>" +
      "<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid var(--border)\">表内 10 个单品的 GMV、抽佣、利润与上述公式逐项校验一致。</div>" +
      "</div></div></div>";

    const sorted = pf.slice().sort((a, b) => b.profit - a.profit);
    const maxP = sorted.length ? Math.abs(sorted[0].profit) : 1;
    h += '<div class="card" style="margin-bottom:16px"><div class="card-head"><div class="card-title">🏅 单品利润排行</div></div><div class="card-pad">' +
      sorted.map((p, i) => '<div class="bar-row"><span class="rk">' + (i + 1) + '</span>' +
        '<span class="nm">' + esc(p.name) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + (Math.abs(p.profit) / maxP * 100).toFixed(1) + '%"></span></span>' +
        '<span class="vl down">' + money(p.profit, 0) + "</span></div>").join("") + "</div></div>";

    h += '<div class="card"><div class="card-head"><div class="card-title">📋 单品利润表<span class="card-sub">成果包原始字段</span></div>' +
      '<button class="btn btn-sm" id="pf-export">导出 CSV</button></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      ["产品编号", "产品名称", "销量", "单品产品价格", "抽成比例", "GMV", "抽佣提成金额", "直播运营成本", "利润", "利润率", "上播次数", "关联直播场次"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + pf.slice().sort((a, b) => a.seq - b.seq).map(p => "<tr>" +
        '<td class="num">' + p.seq + '</td><td><b style="color:var(--text)">' + esc(p.name) + "</b></td>" +
        '<td class="num">' + num(p.salesVolume) + '</td><td class="num">' + money(p.price, 2) + "</td>" +
        '<td class="num">' + pct(p.commissionRate) + '</td><td class="num up">' + money(p.gmv, 0) + "</td>" +
        '<td class="num">' + money(p.commission, 0) + '</td><td class="num">' + money(p.liveCost, 2) + "</td>" +
        '<td class="num down"><b>' + money(p.profit, 0) + "</b></td>" +
        '<td class="num">' + pct(p.profit / (p.gmv || 1)) + "</td>" +
        '<td class="num">' + p.liveSessions + "</td>" +
        '<td style="color:var(--text-3);max-width:200px;overflow:hidden;text-overflow:ellipsis">' + esc((p.sessionIds || []).join(", ")) + "</td></tr>").join("") +
      "</tbody></table></div></div>";

    window.__afterRender__ = function () {
      $("#pf-export").addEventListener("click", () => exportCSV("单品利润表.csv",
        ["产品编号", "产品名称", "销量", "单品产品价格", "抽成比例", "GMV", "抽佣提成金额", "直播运营成本", "利润", "上播次数", "关联直播场次"],
        pf.slice().sort((a, b) => a.seq - b.seq).map(p => [p.seq, p.name, p.salesVolume, p.price, p.commissionRate, p.gmv, p.commission, p.liveCost, p.profit, p.liveSessions, (p.sessionIds || []).join(" ")])));
    };
    return h;
  };

  function exportCSV(filename, header, rows) {
    const csv = [header].concat(rows).map(r => r.map(c => {
      const s = String(c == null ? "" : c);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("已导出 " + filename, "ok");
  }

  /* ==================================================================
     极限词智能自检
     ================================================================== */
  const ckState = { text: "诗黎娜黑绷带面霜 · 国家级检测报告 · 全网最低价 · 100% 纯天然成分 · 无效退款", scanned: false, rating: {} };

  ROUTES.compliance = function () {
    const recs = state.view.ckRecords;
    const hi = recs.filter(r => r.level === "high").length;
    const mid = recs.filter(r => r.level === "mid").length;
    const pass = recs.filter(r => r.level === "low").length;
    const dict = D.dict();

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("审核记录", num(recs.length) + " 条") +
      kpiMini("高风险", '<span class="up">' + hi + " 条</span>") +
      kpiMini("中风险", '<span style="color:#b45309">' + mid + " 条</span>") +
      kpiMini("通过", '<span class="down">' + pass + " 条</span>") + "</div>";

    h += '<div class="card" style="margin-bottom:16px"><div class="card-head">' +
      '<div class="card-title">🛡️ 文案合规检测<span class="card-sub">本地规则引擎 · 词库 ' + dict.length + " 条</span></div>" +
      '<button class="btn btn-sm" id="ck-sample">载入示例文案</button></div>' +
      '<div class="card-pad">' +
      '<textarea class="input" id="ck-input" rows="4" placeholder="粘贴商品标题、详情页文案或直播话术，系统将自动标出命中的极限词并给出替换建议">' + esc(ckState.text) + "</textarea>" +
      '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" id="ck-scan">开始检测</button>' +
      '<button class="btn" id="ck-clear">清空</button>' +
      '<span style="display:flex;align-items:center;font-size:12.5px;color:var(--text-3);margin-left:auto">已审核 ' +
        Object.keys(ckState.rating).length + " 条评分</span></div></div>";

    if (ckState.scanned) {
      const res = scanText(ckState.text);
      h += '<div class="card" style="margin-bottom:16px"><div class="card-head">' +
        '<div class="card-title">检测结果 ' + LEVEL_TAG[res.level] + "</div>" +
        '<div class="card-sub">命中 ' + res.hits.length + " 处</div></div>" +
        '<div class="card-pad">' +
        '<div class="scan-text">' + (ckState.text ? highlight(ckState.text, res.hits) : '<span style="color:var(--text-3)">（空文本）</span>') + "</div>" +
        (res.hits.length
          ? '<div style="margin-top:16px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">命中明细与替换建议</div>' +
            '<div class="table-wrap"><table class="data"><thead><tr><th>命中词</th><th>风险等级</th><th>类别</th><th>替换建议</th></tr></thead><tbody>' +
            res.hits.map(x => "<tr><td><b class=\"up\">" + esc(x.word) + "</b></td><td>" + LEVEL_TAG[x.level] +
              "</td><td>" + esc(x.category) + "</td><td>" + esc(x.suggest) + "</td></tr>").join("") +
            "</tbody></table></div>" +
            '<div style="display:flex;gap:10px;margin-top:14px;align-items:center;flex-wrap:wrap">' +
            '<span style="font-size:13px;color:var(--text-3)">本次评分</span>' +
            ["通过", "中风险", "高风险"].map(g => '<button class="btn btn-sm' + (ckState.rating[ckState.text] === g ? " btn-primary" : "") +
              '" data-rate="' + g + '">' + g + "</button>").join("") +
            (ckState.rating[ckState.text] ? '<span class="tag tag-blue">已记录：' + ckState.rating[ckState.text] + "</span>" : "") +
            "</div></div>"
          : '<div style="margin-top:16px;color:var(--down);font-size:13.5px">✅ 未命中极限词库，文案可正常发布。</div>') +
        "</div></div>";
    }

    h += '<div class="card" style="margin-bottom:16px"><div class="card-head"><div class="card-title">📋 审核记录<span class="card-sub">极限词智能自检</span></div></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr>' +
      ["记录编号", "创建日期", "识别图片", "提取文字", "审核结果", "命中词", "卖点关键词", "审核人"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + recs.map(r => "<tr>" +
        '<td class="num">' + esc(r.id) + "</td>" +
        '<td style="color:var(--text-3)">' + esc(r.createdAt) + "</td>" +
        "<td>" + esc(r.image) + "</td>" +
        '<td style="white-space:normal;max-width:340px;color:var(--text-2)">' + esc(r.extractedText) + "</td>" +
        "<td>" + LEVEL_TAG[r.level] + "</td>" +
        '<td style="white-space:normal;max-width:200px">' + (r.hits.length ? r.hits.map(x => '<span class="tag tag-red" style="margin:1px 2px">' + esc(x) + "</span>").join("") : "—") + "</td>" +
        "<td>" + esc((r.sellingPoints || []).join("、") || "—") + "</td>" +
        "<td>" + esc(r.reviewer) + "</td></tr>").join("") +
      "</tbody></table></div></div>";

    h += '<div class="card"><div class="card-head"><div class="card-title">📚 极限词库<span class="card-sub">' + dict.length + ' 条规则</span></div>' +
      '<div class="card-sub">高风险 ' + dict.filter(d => d.level === "high").length + " · 中风险 " + dict.filter(d => d.level === "mid").length + "</div></div>" +
      '<div class="card-pad" style="max-height:360px;overflow:auto">' +
      dict.map(d => '<div class="dict-row"><span class="w up">' + esc(d.word) + "</span>" + LEVEL_TAG[d.level] +
        '<span class="tag tag-gray">' + esc(d.category) + '</span><span class="s">' + esc(d.suggest) + "</span></div>").join("") +
      "</div></div>";

    window.__afterRender__ = function () {
      const ta = $("#ck-input");
      ta.addEventListener("input", function () { ckState.text = this.value; });
      $("#ck-scan").addEventListener("click", () => {
        ckState.text = ta.value;
        if (!ckState.text.trim()) { toast("请先输入待检测文案", "warn"); return; }
        ckState.scanned = true;
        render();
        const res = scanText(ckState.text);
        toast(res.level === "high" ? "检测完成：命中 " + res.hits.length + " 处，存在高风险" :
              res.level === "mid" ? "检测完成：命中 " + res.hits.length + " 处中风险表述" : "检测通过：未命中极限词",
              res.level === "low" ? "ok" : "warn");
      });
      $("#ck-clear").addEventListener("click", () => { ckState.text = ""; ckState.scanned = false; render(); });
      $("#ck-sample").addEventListener("click", () => {
        ckState.text = "诗黎娜黑绷带面霜 · 国家级检测报告 · 全网最低价 · 100% 纯天然成分 · 无效退款";
        ckState.scanned = false; render();
      });
      $$("[data-rate]").forEach(el => el.addEventListener("click", () => {
        ckState.rating[ckState.text] = el.dataset.rate;
        toast("已记录评分：" + el.dataset.rate, "ok"); render();
      }));
    };
    return h;
  };

  /* ==================================================================
     达人合作
     ================================================================== */
  const talFilter = { q: "", stage: "全部", province: "全部" };

  ROUTES.talents = function () {
    const all = D.talents();
    const stages = state.data.talents.stages;
    const provinces = ["全部"].concat(Array.from(new Set(all.map(t => t.province))).sort());
    const list = all.filter(t =>
      (talFilter.stage === "全部" || t.stage === talFilter.stage) &&
      (talFilter.province === "全部" || t.province === talFilter.province) &&
      (!talFilter.q || (t.nickname + t.region + t.mainProducts + t.brandFocus).toLowerCase().indexOf(talFilter.q.toLowerCase()) >= 0));
    const mx = Math.max.apply(null, stages.map(s => all.filter(t => t.stage === s).length)) || 1;

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("合作达人总数", num(all.length) + " 位") +
      kpiMini("已出单", '<span class="down">' + all.filter(t => t.stage === "已出单").length + " 位</span>") +
      kpiMini("已寄样", all.filter(t => t.stage === "已寄样").length + " 位") +
      kpiMini("覆盖省份", new Set(all.map(t => t.province)).size + " 个") + "</div>";

    h += '<div class="card" style="margin-bottom:16px"><div class="card-head"><div class="card-title">🎯 合作漏斗</div>' +
      '<div class="card-sub">已建联 → 已寄样 → 已挂车 → 已出单</div></div><div class="card-pad">' +
      stages.map(s => {
        const c = all.filter(t => t.stage === s).length;
        return '<div class="funnel-row"><span class="fl">' + esc(s) + '</span><span class="ft2">' +
          '<span class="ff" style="width:' + (c / mx * 100).toFixed(1) + '%">' + c + "</span></span>" +
          '<span class="fp">' + pct(c / all.length) + "</span></div>";
      }).join("") + "</div></div>";

    h += '<div class="filters">' +
      '<input class="input" id="tl-q" placeholder="🔍 搜索达人 / 地区 / 主推产品 / 品牌" value="' + esc(talFilter.q) + '" style="min-width:280px" />' +
      '<select class="select" id="tl-stage"><option>全部</option>' + stages.map(s =>
        "<option" + (talFilter.stage === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select>" +
      '<select class="select" id="tl-prov">' + provinces.map(p =>
        "<option" + (talFilter.province === p ? " selected" : "") + ">" + esc(p) + "</option>").join("") + "</select>" +
      '<span style="margin-left:auto;font-size:12.5px;color:var(--text-3)">共 ' + list.length + " 条</span></div>";

    h += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
      ["达人昵称", "等级", "地区", "一级类目", "主推产品", "月GMV", "平均单价", "形式", "商品数", "店铺数", "品牌集中度", "登记人", "合作进度"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + (list.length ? list.map(t => "<tr>" +
        '<td><b style="color:var(--text)">' + esc(t.nickname) + "</b></td>" +
        '<td><span class="tag tag-blue">' + esc(t.level) + "</span></td>" +
        "<td>" + esc(t.region) + "</td>" +
        '<td style="white-space:normal;max-width:150px">' + esc(t.category) + "</td>" +
        '<td style="white-space:normal;max-width:170px">' + esc(t.mainProducts) + "</td>" +
        '<td class="num">' + esc(t.monthlyGmv || "—") + '</td><td class="num">' + num(t.avgPrice) + "</td>" +
        "<td>" + esc(t.type) + '</td><td class="num">' + num(t.productCount) + '</td><td class="num">' + num(t.shopCount) + "</td>" +
        '<td style="white-space:normal;max-width:160px">' + esc(t.brandFocus || "—") + "</td>" +
        "<td>" + esc(t.registrar) + "</td>" +
        '<td><span class="tag ' + (t.stage === "已出单" ? "tag-green" : t.stage === "已挂车" ? "tag-blue" : t.stage === "已寄样" ? "tag-amber" : "tag-gray") + '">' + esc(t.stage) + "</span></td></tr>").join("")
        : '<tr><td colspan="13"><div class="empty">没有匹配的达人</div></td></tr>') + "</tbody></table></div></div>";

    window.__afterRender__ = function () {
      bindSearch("#tl-q", talFilter, "q");
      $("#tl-stage").addEventListener("change", function () { talFilter.stage = this.value; render(); });
      $("#tl-prov").addEventListener("change", function () { talFilter.province = this.value; render(); });
    };
    return h;
  };

  /* ==================================================================
     销售明细
     ================================================================== */
  const salFilter = { q: "", platform: "全部", brand: "全部", month: "全部" };

  ROUTES.sales = function () {
    const all = D.sales();
    const platforms = ["全部"].concat(Array.from(new Set(all.map(r => r.platform))).sort());
    const brands = ["全部"].concat(Array.from(new Set(all.map(r => r.brand))).sort());
    const months = ["全部"].concat(Array.from(new Set(all.map(r => r.month))).sort().reverse());
    const list = all.filter(r =>
      (salFilter.platform === "全部" || r.platform === salFilter.platform) &&
      (salFilter.brand === "全部" || r.brand === salFilter.brand) &&
      (salFilter.month === "全部" || r.month === salFilter.month) &&
      (!salFilter.q || (r.product + r.talent + r.address + r.session).toLowerCase().indexOf(salFilter.q.toLowerCase()) >= 0));
    const amt = list.reduce((s, r) => s + r.amount, 0);
    const ref = list.reduce((s, r) => s + r.refund, 0);

    let h = '<div class="grid g4" style="margin-bottom:16px">' +
      kpiMini("明细条数", num(list.length) + " 条") +
      kpiMini("订单金额合计", money(amt, 0)) +
      kpiMini("退货金额合计", '<span class="up">' + money(ref, 0) + "</span>") +
      kpiMini("实际销售额", '<span class="down">' + money(amt - ref, 0) + "</span>") + "</div>";

    h += '<div class="filters">' +
      '<input class="input" id="sa-q" placeholder="🔍 搜索商品 / 达人 / 地址 / 场次" value="' + esc(salFilter.q) + '" style="min-width:280px" />' +
      '<select class="select" id="sa-plat">' + platforms.map(p => "<option" + (salFilter.platform === p ? " selected" : "") + ">" + esc(p) + "</option>").join("") + "</select>" +
      '<select class="select" id="sa-brand">' + brands.map(p => "<option" + (salFilter.brand === p ? " selected" : "") + ">" + esc(p) + "</option>").join("") + "</select>" +
      '<select class="select" id="sa-month">' + months.map(p => "<option" + (salFilter.month === p ? " selected" : "") + ">" + esc(p) + "</option>").join("") + "</select>" +
      '<button class="btn" style="margin-left:auto" id="sa-export">导出 CSV</button></div>';

    h += '<div class="card"><div class="table-wrap"><table class="data"><thead><tr>' +
      ["编号", "销售商品", "所属直播场次", "收货地址", "达人名称", "所属品牌", "销售平台", "订单金额", "退货金额", "年月"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + (list.length ? list.map(r => "<tr>" +
        '<td class="num">' + esc(r.id) + '</td><td><b style="color:var(--text)">' + esc(r.product) + "</b></td>" +
        '<td class="num">' + esc(r.session) + "</td>" +
        '<td style="white-space:normal;max-width:260px;color:var(--text-3)">' + esc(r.address) + "</td>" +
        "<td>" + esc(r.talent || "—") + "</td><td>" + esc(r.brand) + "</td>" +
        '<td>' + (SESSION_ICON[r.platform] || "") + " " + esc(r.platform) + "</td>" +
        '<td class="num up">' + money(r.amount, 0) + "</td>" +
        '<td class="num">' + (r.refund ? '<span class="up">' + money(r.refund, 0) + "</span>" : money(0, 0)) + "</td>" +
        '<td style="color:var(--text-3)">' + esc(r.month) + "</td></tr>").join("")
        : '<tr><td colspan="10"><div class="empty">没有匹配的销售明细</div></td></tr>') + "</tbody></table></div></div>";

    window.__afterRender__ = function () {
      bindSearch("#sa-q", salFilter, "q");
      $("#sa-plat").addEventListener("change", function () { salFilter.platform = this.value; render(); });
      $("#sa-brand").addEventListener("change", function () { salFilter.brand = this.value; render(); });
      $("#sa-month").addEventListener("change", function () { salFilter.month = this.value; render(); });
      $("#sa-export").addEventListener("click", () => exportCSV("销售明细记录.csv",
        ["编号", "销售商品", "所属直播场次", "收货地址", "达人名称", "所属品牌", "销售平台", "订单金额", "退货金额", "年月"],
        list.map(r => [r.id, r.product, r.session, r.address, r.talent, r.brand, r.platform, r.amount, r.refund, r.month])));
    };
    return h;
  };

  /* ==================================================================
     系统设置
     ================================================================== */
  ROUTES.settings = function () {
    const mf = D.manifest();
    let h = '<div class="grid g2" style="margin-bottom:16px">';
    h += '<div class="card"><div class="card-head"><div class="card-title">⚙️ 系统偏好</div></div><div class="card-pad">' +
      '<div class="field" style="margin-bottom:14px"><label>主题模式</label>' +
      '<select class="select" id="st-theme"><option value="light"' + (state.settings.theme === "light" ? " selected" : "") + ">浅色</option>" +
      '<option value="dark"' + (state.settings.theme === "dark" ? " selected" : "") + ">深色</option></select></div>" +
      '<div class="field" style="margin-bottom:14px"><label>低库存安全线（件）</label>' +
      '<input class="input" id="st-low" type="number" min="1" value="' + state.settings.lowStock + '" /></div>' +
      '<div style="font-size:12.5px;color:var(--text-3);line-height:1.9">' +
      "· 低库存安全线影响「经营工作台待办」「商品管理预警」「库存管理预警」的判定" +
      "</div>" +
      '<div style="display:flex;gap:10px;margin-top:16px"><button class="btn btn-primary" id="st-save">保存设置</button>' +
      '<button class="btn" id="st-reset">恢复默认</button></div></div></div>';

    h += '<div class="card"><div class="card-head"><div class="card-title">👤 当前账号</div></div><div class="card-pad">' +
      '<div class="kv" style="margin-bottom:16px">' +
      '<div class="item"><span>账号</span><b>' + esc(state.user.u) + "</b></div>" +
      '<div class="item"><span>姓名</span><b>' + esc(state.user.name) + "</b></div>" +
      '<div class="item"><span>角色</span><b>' + esc(state.user.roleLabel) + "</b></div>" +
      '<div class="item"><span>权限模块</span><b>' + state.user.scope.length + " 个</b></div></div>" +
      '<div style="font-size:12.5px;color:var(--text-3);margin-bottom:14px">可访问模块：</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      state.user.scope.map(k => '<span class="tag tag-blue">' + esc((A.TITLES[k] || [k])[0]) + "</span>").join("") + "</div>" +
      '<button class="btn btn-danger" style="margin-top:18px" id="st-logout">退出登录</button></div></div>';
    h += "</div>";

    h += '<div class="card" style="margin-bottom:16px"><div class="card-head"><div class="card-title">🗄️ 数据来源与资产</div>' +
      '<div class="card-sub">完整成果包 · 最后同步 ' + esc(mf.lastSync) + '</div></div>' +
      '<div class="card-pad"><div class="grid g3" style="margin-bottom:16px">' +
      kpiMini("业务数据表", mf.summary.tableCount + " 张") +
      kpiMini("总记录数", num(mf.summary.recordCount) + " 条") +
      kpiMini("覆盖业务模块", mf.summary.moduleCount + " 个") + "</div>" +
      '<div class="table-wrap" style="max-height:300px"><table class="data"><thead><tr>' +
      ["数据表名称", "数据文件", "记录数"].map(c => "<th>" + c + "</th>").join("") +
      "</tr></thead><tbody>" + mf.tables.map(t => "<tr><td><b style=\"color:var(--text)\">" + esc(t.name) + "</b></td>" +
        '<td style="color:var(--text-3)">' + esc(t.file) + '</td><td class="num">' + t.records + "</td></tr>").join("") +
      "</tbody></table></div></div></div>";

    h += '<div class="card"><div class="card-head"><div class="card-title">🧪 演示数据管理</div></div><div class="card-pad">' +
      '<div style="font-size:12.5px;color:var(--text-3);line-height:1.9;margin-bottom:14px">' +
      "本系统的商品、订单、库存、审核记录等可变数据保存在浏览器本地存储中。<br>" +
      "重置后将恢复到成果包原始数据状态，并清空购物车与商城订单。</div>" +
      '<button class="btn btn-danger" id="st-wipe">重置演示数据</button>' +
      '<button class="btn" style="margin-left:10px" id="st-export">导出全部数据（JSON）</button></div></div>';

    window.__afterRender__ = function () {
      $("#st-save").addEventListener("click", () => {
        const low = parseInt($("#st-low").value, 10);
        if (!(low > 0)) { toast("请填写有效的安全线数值", "err"); return; }
        state.settings.theme = $("#st-theme").value;
        state.settings.lowStock = low;
        A.applyTheme();
        save(); A.updateBadges(); toast("设置已保存", "ok"); render();
      });
      $("#st-reset").addEventListener("click", () => {
        state.settings = { theme: "light", lowStock: 200 };
        A.applyTheme(); save(); toast("已恢复默认设置", "ok"); render();
      });
      $("#st-logout").addEventListener("click", () => A.logout());
      $("#st-wipe").addEventListener("click", () => {
        modal("确认重置演示数据",
          '<div style="font-size:13.5px;line-height:1.9;color:var(--text-2)">此操作会清空浏览器中保存的全部演示数据：<br>' +
          "· 商品与库存的修改<br>· 商城订单与购物车<br>· 入库/出库登记记录<br>· 极限词审核评分<br>· 系统设置<br><br>" +
          "<b style=\"color:var(--danger)\">重置后无法撤销，页面将自动刷新。</b></div>",
          '<button class="btn" data-close>取消</button><button class="btn btn-danger" id="wipe-ok">确认重置</button>');
        $("#wipe-ok").addEventListener("click", () => A.resetData());
      });
      $("#st-export").addEventListener("click", () => {
        const dump = { exportedAt: new Date().toISOString(), settings: state.settings,
          cart: state.cart, view: state.view, source: D.manifest().source };
        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ai-ecom-demo-data.json";
        document.body.appendChild(a); a.click(); a.remove();
        toast("已导出演示数据", "ok");
      });
    };
    return h;
  };
})();
