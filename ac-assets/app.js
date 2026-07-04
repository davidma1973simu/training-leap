(function () {
  "use strict";

  var K = "ac-data";

  function load() {
    try { return JSON.parse(localStorage[K] || "null") || { u: null, c: {} }; } catch (e) { return { u: null, c: {} }; }
  }
  function save(d) {
    try { localStorage[K] = JSON.stringify(d); } catch (e) {}
  }

  var S = load();
  var curId = null;

  /* ===== Util ===== */
  function iso() { return new Date().toISOString(); }
  function fmtD(s) {
    if (!s) return "";
    var d = new Date(s);
    if (isNaN(d)) return "";
    return d.getFullYear() + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + String(d.getDate()).padStart(2, "0");
  }
  function escH(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

  function getCards() {
    if (!S.u || !S.u.company) return [];
    return S.c[S.u.company] || [];
  }
  function setCards(arr) {
    if (!S.u || !S.u.company) return;
    S.c[S.u.company] = arr;
  }
  function getCard() {
    var cards = getCards();
    for (var i = 0; i < cards.length; i++) if (cards[i].id === curId) return cards[i];
    return null;
  }

  function countDone(c) {
    if (!c) return 0;
    var n = 0;
    if (c.steps && c.steps["1"] && c.steps["1"].trim()) n++;
    if (c.steps && c.steps["2l"] && c.steps["2l"].trim() && c.steps["2v"] && c.steps["2v"].trim()) n++;
    if (c.depts && c.depts.length && c.depts[0].n && c.depts[0].n.trim()) n++;
    if (c.steps && c.steps["4m"] && c.steps["4m"].trim() && c.steps["4s"] && c.steps["4s"].trim()) n++;
    if (c.steps && c.steps["5r"] && c.steps["5r"].trim()) n++;
    return n;
  }

  function flash() {
    var t = document.getElementById("stoast");
    if (!t) return;
    t.classList.add("show");
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  /* ===== View ===== */
  function go(v) {
    var vs = document.querySelectorAll(".view");
    for (var i = 0; i < vs.length; i++) vs[i].classList.remove("active");
    var el = document.getElementById("view-" + v);
    if (el) el.classList.add("active");
    if (v === "dash") rDash();
    if (v === "canvas") rCanvas();
  }

  /* ===== Login ===== */
  function doLogin() {
    var n = document.getElementById("fname").value.trim();
    var c = document.getElementById("fcomp").value.trim();
    if (!n || !c) { alert("请填写姓名和公司/项目"); return; }
    S.u = { n: n, c: c };
    if (!S.c[c]) S.c[c] = [];
    save(S);
    go("dash");
  }

  /* ===== Dash ===== */
  function rDash() {
    if (!S.u) return;
    var cards = getCards();
    var m = document.getElementById("dmeta");
    if (m) m.textContent = S.u.n + " · " + S.u.c;
    var sub = document.getElementById("dsub");
    if (sub) sub.textContent = S.u.c + " · " + cards.length + "个行动计划";
    var stt = document.getElementById("stt");
    if (stt) stt.textContent = cards.length;
    var stp = document.getElementById("stp");
    if (stp) stp.textContent = cards.filter(function (x) { return x.status === "ing"; }).length;
    var std = document.getElementById("std");
    if (std) std.textContent = cards.filter(function (x) { return x.status === "done"; }).length;

    var grid = document.getElementById("cgrid");
    var empty = document.getElementById("dempty");
    if (!cards.length) {
      if (grid) grid.style.display = "none";
      if (empty) empty.style.display = "block";
      return;
    }
    if (grid) grid.style.display = "grid";
    if (empty) empty.style.display = "none";

    var h = "";
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var st = c.status || "draft";
      var tc = st === "done" ? "tg-done" : (st === "ing" ? "tg-ing" : "tg-draft");
      var dc = countDone(c);
      var dots = "";
      for (var j = 0; j < 5; j++) dots += '<div class="sd' + (j < dc ? ' sd-d' : '') + '"></div>';
      var title = c.title || (c.steps && c.steps["1"] ? c.steps["1"].slice(0, 50) + "…" : "新建行动计划");
      h += '<div class="ac" data-id="' + escH(c.id) + '">'
        + '<span class="tg ' + tc + '">' + escH(st) + '</span>'
        + '<div class="act">' + escH(title) + '</div>'
        + '<div class="acm">' + escH(c.course || "未指定课程") + " · " + fmtD(c.updatedAt || c.createdAt) + '</div>'
        + '<div class="aft"><div class="sds">' + dots + '</div><span class="arr">→</span></div>'
        + '</div>';
    }
    if (grid) grid.innerHTML = h;

    // bind click
    var acs = grid ? grid.querySelectorAll(".ac") : [];
    for (var i = 0; i < acs.length; i++) {
      acs[i].addEventListener("click", function (e) {
        var id = this.getAttribute("data-id");
        openCard(id);
      });
    }
  }

  /* ===== Card CRUD ===== */
  function newCard() {
    var cards = getCards();
    var now = iso();
    var c = { id: "c-" + Date.now(), status: "draft", title: "", course: "", steps: {}, depts: [{}], tasks: [{}], metrics: [], createdAt: now, updatedAt: now };
    cards.push(c);
    setCards(cards);
    save(S);
    openCard(c.id);
  }

  function openCard(id) {
    curId = id;
    go("canvas");
  }

  function closeCanvas() {
    saveCard();
    go("dash");
  }

  /* ===== Canvas ===== */
  function rCanvas() {
    var c = getCard();
    if (!c) { go("dash"); return; }

    var cmeta = document.getElementById("cmeta");
    if (cmeta) cmeta.textContent = S.u.n + " · " + S.u.c;

    var cclabel = document.getElementById("cclabel");
    if (cclabel) cclabel.textContent = c.course || "未指定课程";

    var ctitle = document.getElementById("ctitle");
    if (ctitle) ctitle.value = c.title || "";

    var ccreated = document.getElementById("ccreated");
    if (ccreated) ccreated.textContent = fmtD(c.createdAt);
    var cupdated = document.getElementById("cupdated");
    if (cupdated) cupdated.textContent = fmtD(c.updatedAt);

    var st = c.status || "draft";
    var tc = st === "done" ? "tg-done" : (st === "ing" ? "tg-ing" : "tg-draft");
    var cstat = document.getElementById("cstat");
    if (cstat) cstat.innerHTML = '<span class="tg ' + tc + '">' + escH(st) + '</span>';
    var btnst = document.getElementById("btnst");
    if (btnst) btnst.textContent = st === "done" ? "标记为进行中" : "标记为已完成";

    // steps
    var fs1 = document.getElementById("fs1"); if (fs1) fs1.value = (c.steps && c.steps["1"]) || "";
    var fs2l = document.getElementById("fs2l"); if (fs2l) fs2l.value = (c.steps && c.steps["2l"]) || "";
    var fs2v = document.getElementById("fs2v"); if (fs2v) fs2v.value = (c.steps && c.steps["2v"]) || "";
    var fs4m = document.getElementById("fs4m"); if (fs4m) fs4m.value = (c.steps && c.steps["4m"]) || "";
    var fs4s = document.getElementById("fs4s"); if (fs4s) fs4s.value = (c.steps && c.steps["4s"]) || "";
    var fs5r = document.getElementById("fs5r"); if (fs5r) fs5r.value = (c.steps && c.steps["5r"]) || "";
    var fs5mp = document.getElementById("fs5mp"); if (fs5mp) fs5mp.value = (c.steps && c.steps["5mp"]) || "";
    var fs5mr = document.getElementById("fs5mr"); if (fs5mr) fs5mr.value = (c.steps && c.steps["5mr"]) || "";

    rDepts(c);
    rTasks(c);
    rMetrics(c);
    updProg(c);
    tglStep(1, true);
  }

  /* ===== Steps ===== */
  function tglStep(n, force) {
    var el = document.getElementById("step" + n);
    if (!el) return;
    if (force) el.classList.add("open"); else el.classList.toggle("open");
  }

  function updProg(c) {
    if (!c) return;
    var d = countDone(c);
    var pct = Math.round(d / 5 * 100);
    var pgtxt = document.getElementById("pgtxt");
    if (pgtxt) pgtxt.textContent = d + " / 5 步骤完成";
    var pgpct = document.getElementById("pgpct");
    if (pgpct) pgpct.textContent = pct + "%";
    var pfill = document.getElementById("pfill");
    if (pfill) pfill.style.width = pct + "%";
    setSD(1, !!(c.steps && c.steps["1"] && c.steps["1"].trim()));
    setSD(2, !!(c.steps && c.steps["2l"] && c.steps["2l"].trim() && c.steps["2v"] && c.steps["2v"].trim()));
    setSD(3, !!(c.depts && c.depts.length && c.depts[0].n && c.depts[0].n.trim()));
    setSD(4, !!(c.steps && c.steps["4m"] && c.steps["4m"].trim() && c.steps["4s"] && c.steps["4s"].trim()));
    setSD(5, !!(c.steps && c.steps["5r"] && c.steps["5r"].trim()));
  }

  function setSD(n, done) {
    var el = document.getElementById("step" + n);
    if (!el) return;
    if (done) el.classList.add("done"); else el.classList.remove("done");
  }

  /* ===== Departments ===== */
  function rDepts(c) {
    var rows = document.getElementById("deptrows");
    if (!rows) return;
    var ds = (c.depts && c.depts.length) ? c.depts : [{}];
    var h = "";
    for (var i = 0; i < ds.length; i++) {
      h += '<div class="lr">'
        + '<input class="ti" style="flex:1" placeholder="部门名称" value="' + escA(ds[i].n || "") + '">'
        + '<input class="ti" style="flex:2" placeholder="该部门需要提供的支持或做出的动作" value="' + escA(ds[i].r || "") + '">'
        + '<button class="rd" data-i="' + i + '">×</button>'
        + '</div>';
    }
    rows.innerHTML = h;
    bindInputs(rows);
    // delete buttons
    var btns = rows.querySelectorAll(".rd");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () { this.parentElement.remove(); aSave(); });
    }
  }

  function addDept() {
    var c = getCard(); if (!c) return;
    if (!c.depts) c.depts = [];
    c.depts.push({});
    save(S);
    rDepts(c);
    aSave();
  }

  /* ===== Tasks ===== */
  function rTasks(c) {
    var rows = document.getElementById("taskrows");
    if (!rows) return;
    var ts = (c.tasks && c.tasks.length) ? c.tasks : [{}];
    var h = "";
    for (var i = 0; i < ts.length; i++) {
      h += '<div class="lr">'
        + '<input class="ti" style="flex:3" placeholder="任务描述" value="' + escA(ts[i].d || "") + '">'
        + '<input class="ti" style="flex:1" placeholder="负责人" value="' + escA(ts[i].o || "") + '">'
        + '<input class="ti" style="flex:1" placeholder="截止时间" value="' + escA(ts[i].dl || "") + '">'
        + '<button class="rd">×</button>'
        + '</div>';
    }
    rows.innerHTML = h;
    bindInputs(rows);
    var btns = rows.querySelectorAll(".rd");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () { this.parentElement.remove(); aSave(); });
    }
  }

  function addTask() {
    var c = getCard(); if (!c) return;
    if (!c.tasks) c.tasks = [];
    c.tasks.push({});
    save(S);
    rTasks(c);
    aSave();
  }

  /* ===== Metrics ===== */
  function rMetrics(c) {
    var tb = document.getElementById("metrtb");
    if (!tb) return;
    var ms = (c.metrics && c.metrics.length && c.metrics[0] && c.metrics[0].n) ? c.metrics : [];
    if (!ms.length) {
      tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;font-size:13px;padding:16px">暂无追踪指标，点击下方按钮添加</td></tr>';
      return;
    }
    var h = "";
    for (var i = 0; i < ms.length; i++) {
      h += '<tr>'
        + '<td><input class="ti" style="font-size:13px;padding:7px 10px" value="' + escA(ms[i].n || "") + '"></td>'
        + '<td><input class="ti" style="font-size:13px;padding:7px 10px" value="' + escA(ms[i].t || "") + '"></td>'
        + '<td><input class="ti" style="font-size:13px;padding:7px 10px" value="' + escA(ms[i].c || "") + '"></td>'
        + '<td><input class="ti" style="font-size:13px;padding:7px 10px" value="' + escA(ms[i].d || "") + '"></td>'
        + '<td><button class="rd">×</button></td>'
        + '</tr>';
    }
    tb.innerHTML = h;
    bindInputs(tb);
    var btns = tb.querySelectorAll(".rd");
    for (var i = 0; i < btns.length; i++) {
      (function (idx) {
        btns[idx].addEventListener("click", function () { rmMet(idx); });
      })(i);
    }
  }

  function addMetric() {
    var c = getCard(); if (!c) return;
    if (!c.metrics) c.metrics = [];
    c.metrics.push({});
    save(S);
    rMetrics(c);
    aSave();
  }

  function rmMet(i) {
    var c = getCard(); if (!c || !c.metrics) return;
    c.metrics.splice(i, 1);
    save(S);
    rMetrics(c);
    aSave();
  }

  /* ===== Collect ===== */
  function collect() {
    var c = getCard(); if (!c) return;
    var ctitle = document.getElementById("ctitle");
    if (ctitle) c.title = ctitle.value;
    if (!c.steps) c.steps = {};
    var fs1 = document.getElementById("fs1"); if (fs1) c.steps["1"] = fs1.value;
    var fs2l = document.getElementById("fs2l"); if (fs2l) c.steps["2l"] = fs2l.value;
    var fs2v = document.getElementById("fs2v"); if (fs2v) c.steps["2v"] = fs2v.value;
    var fs4m = document.getElementById("fs4m"); if (fs4m) c.steps["4m"] = fs4m.value;
    var fs4s = document.getElementById("fs4s"); if (fs4s) c.steps["4s"] = fs4s.value;
    var fs5r = document.getElementById("fs5r"); if (fs5r) c.steps["5r"] = fs5r.value;
    var fs5mp = document.getElementById("fs5mp"); if (fs5mp) c.steps["5mp"] = fs5mp.value;
    var fs5mr = document.getElementById("fs5mr"); if (fs5mr) c.steps["5mr"] = fs5mr.value;

    // depts
    c.depts = [];
    var dr = document.querySelectorAll("#deptrows .lr");
    for (var i = 0; i < dr.length; i++) {
      var ins = dr[i].querySelectorAll("input");
      if (ins[0] && (ins[0].value || (ins[1] && ins[1].value))) c.depts.push({ n: ins[0].value, r: ins[1] ? ins[1].value : "" });
    }
    // tasks
    c.tasks = [];
    var tr = document.querySelectorAll("#taskrows .lr");
    for (var i = 0; i < tr.length; i++) {
      var ins = tr[i].querySelectorAll("input");
      if (ins[0] && ins[0].value) c.tasks.push({ d: ins[0].value, o: ins[1] ? ins[1].value : "", dl: ins[2] ? ins[2].value : "" });
    }
    // metrics
    c.metrics = [];
    var mr = document.querySelectorAll("#metrtb tr");
    for (var i = 0; i < mr.length; i++) {
      var ins = mr[i].querySelectorAll("input");
      if (ins.length >= 4 && ins[0] && ins[0].value) c.metrics.push({ n: ins[0].value, t: ins[1] ? ins[1].value : "", c: ins[2] ? ins[2].value : "", d: ins[3] ? ins[3].value : "" });
    }

    c.updatedAt = iso();
  }

  function saveCard() { collect(); save(S); flash(); updProg(getCard()); }
  function aSave() { collect(); save(S); flash(); updProg(getCard()); }

  function tglStatus() {
    var c = getCard(); if (!c) return;
    if (c.status === "done") c.status = "ing";
    else if (c.status === "ing") c.status = "done";
    else c.status = "ing";
    save(S);
    rCanvas();
  }

  /* ===== Bind inputs auto-save ===== */
  function bindInputs(container) {
    var inputs = container.querySelectorAll("input,textarea");
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener("input", function () { aSave(); });
    }
  }

  function escA(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ===== Init ===== */
  // Bind login
  var loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.addEventListener("click", doLogin);

  // Bind new card
  var newBtn = document.getElementById("newBtn");
  if (newBtn) newBtn.addEventListener("click", newCard);

  // Bind back
  var backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", closeCanvas);

  // Bind save
  var saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveCard);

  // Bind status toggle
  var statusBtn = document.getElementById("btnst");
  if (statusBtn) statusBtn.addEventListener("click", tglStatus);

  // Bind add dept/task/metric
  var addDeptBtn = document.getElementById("addDeptBtn");
  if (addDeptBtn) addDeptBtn.addEventListener("click", addDept);
  var addTaskBtn = document.getElementById("addTaskBtn");
  if (addTaskBtn) addTaskBtn.addEventListener("click", addTask);
  var addMetBtn = document.getElementById("addMetBtn");
  if (addMetBtn) addMetBtn.addEventListener("click", addMetric);

  // Bind step headers
  for (var i = 1; i <= 5; i++) {
    (function (n) {
      var hdr = document.getElementById("step" + n + "hdr");
      if (hdr) hdr.addEventListener("click", function () { tglStep(n); });
    })(i);
  }

  if (S.u && S.u.n) go("dash");
})();
