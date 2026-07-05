(function() {
"use strict";

var KEY = "ac_v6";

function loadStore() {
  try { return JSON.parse(localStorage[KEY] || "null") || {}; } catch(e) { return {}; }
}
function saveStore(d) {
  try { localStorage[KEY] = JSON.stringify(d); } catch(e) {}
}
var store = loadStore();
var curId = null;

// Ensure store structure
if (!store.cards) store.cards = {};
if (!store.config) store.config = {};

function cards() {
  if (!store.user || !store.user.comp) return [];
  return store.cards[store.user.comp] || [];
}
function saveCards(arr) {
  if (!store.user || !store.user.comp) return;
  store.cards[store.user.comp] = arr;
  saveStore(store);
}
function currentCard() {
  var list = cards();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === curId) return list[i];
  }
  return null;
}

function switchPage(id) {
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) pages[i].className = "page";
  var el = document.getElementById(id);
  if (el) el.className = "page active";
  if (id === "p-dash") renderDash();
  if (id === "p-canvas") renderCanvas();
}

function iso() { return new Date().toISOString(); }
function fmt(s) {
  if (!s) return "";
  var d = new Date(s);
  if (isNaN(d)) return "";
  var mm = String(d.getMonth()+1).padStart(2,"0");
  var dd = String(d.getDate()).padStart(2,"0");
  return d.getFullYear() + "/" + mm + "/" + dd;
}
function esc(s) {
  var d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}

function showToast() {
  var t = document.getElementById("toast");
  if (!t) return;
  t.className = "toast-msg show";
  clearTimeout(t._tm);
  t._tm = setTimeout(function(){ t.className = "toast-msg"; }, 1800);
}

function doneCount(c) {
  if (!c) return 0;
  var n = 0;
  if (c.v1 && c.v1.trim()) n++;
  if (c.v2l && c.v2l.trim() && c.v2v && c.v2v.trim()) n++;
  if (c.depts && c.depts.length && c.depts[0] && c.depts[0].name && c.depts[0].name.trim()) n++;
  if (c.v4s && c.v4s.trim() && c.v4methods && c.v4methods.length) n++;
  // Backward compat: also count new methods array
  if (!n && c.methods && c.methods.length) {
    var hasStrat = false;
    for (var mi = 0; mi < c.methods.length; mi++) {
      if (c.methods[mi].strategy && c.methods[mi].strategy.trim()) { hasStrat = true; break; }
    }
    if (hasStrat) n++;
  }
  if (c.v5r && c.v5r.trim()) n++;
  return n;
}

function updateProgress(c) {
  var d = doneCount(c);
  var pct = Math.round(d / 5 * 100);
  var pgTxt = document.getElementById("pg-txt");
  var pgPct = document.getElementById("pg-pct");
  var pgFill = document.getElementById("pg-fill");
  if (pgTxt) pgTxt.textContent = d + " / 5 步骤完成";
  if (pgPct) pgPct.textContent = pct + "%";
  if (pgFill) pgFill.style.width = pct + "%";
  markStepNum(1, !!(c.v1 && c.v1.trim()));
  markStepNum(2, !!(c.v2l && c.v2l.trim() && c.v2v && c.v2v.trim()));
  markStepNum(3, !!(c.depts && c.depts.length && c.depts[0] && c.depts[0].name && c.depts[0].name.trim()));
  markStepNum(4, !!(c.v4s && c.v4s.trim() && c.v4methods && c.v4methods.length));
  markStepNum(5, !!(c.v5r && c.v5r.trim()));
}

function markStepNum(n, ok) {
  var el = document.querySelector("#s" + n + " .step-n");
  if (!el) return;
  if (ok) { el.className = "step-n ok"; el.innerHTML = "&#10003;"; }
  else { el.className = "step-n"; el.textContent = n; }
}

function doLogin() {
  var nameEl = document.getElementById("i-name");
  var compEl = document.getElementById("i-comp");
  if (!nameEl || !compEl) return;
  var name = nameEl.value.trim();
  var comp = compEl.value.trim();
  if (!name || !comp) { alert("请填写姓名和公司/项目"); return; }
  store.user = { name: name, comp: comp };
  if (!store.cards[comp]) store.cards[comp] = [];
  saveStore(store);
  switchPage("p-dash");
}
window.doLogin = doLogin;

// ========= DASHBOARD =========
function renderDash() {
  if (!store.user) return;
  var list = cards();
  var prog = store.config.program || store.user.comp;
  var course = store.config.course || "";
  var dMeta = document.getElementById("d-meta");
  var dSub = document.getElementById("d-sub");
  if (dMeta) dMeta.textContent = store.user.name + " · " + (prog || "");
  if (dSub) dSub.textContent = (course || "未配置课程") + " · " + list.length + "个行动计划";

  // Render config banner (shows audience context from admin)
  renderConfigBanner();

  var stTot = document.getElementById("st-tot");
  var stAct = document.getElementById("st-act");
  var stDone = document.getElementById("st-done");
  if (stTot) stTot.textContent = list.length;
  if (stAct) stAct.textContent = list.filter(function(c){ return c.status === "active"; }).length;
  if (stDone) stDone.textContent = list.filter(function(c){ return c.status === "done"; }).length;

  var grid = document.getElementById("c-grid");
  var empty = document.getElementById("d-empty");
  if (!list.length) {
    if (grid) grid.style.display = "none";
    if (empty) empty.style.display = "block";
    return;
  }
  if (grid) grid.style.display = "grid";
  if (empty) empty.style.display = "none";

  var html = "";
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    var st = c.status || "draft";
    var tc = st === "done" ? "tag-x" : (st === "active" ? "tag-a" : "tag-d");
    var tname = st === "done" ? "已完成" : (st === "active" ? "进行中" : "草稿");
    var dc = doneCount(c);
    var dots = "";
    for (var j = 0; j < 5; j++) dots += '<div class="dot' + (j < dc ? ' ok' : '') + '"></div>';
    var title = c.title || (c.v1 ? c.v1.slice(0,50) + "…" : "新建行动计划");
    html += '<div class="acard" data-id="' + c.id + '"><span class="tag ' + tc + '">' + tname + '</span><h3>' + esc(title) + '</h3><div class="meta">' + esc(c.course || store.config.course || "未指定课程") + " · " + fmt(c.updated || c.created) + '</div><div class="foot"><div class="dots">' + dots + '</div><button class="btn-del" data-id="' + c.id + '" title="删除">&#128465;</button></div></div>';
  }
  if (grid) grid.innerHTML = html;
  if (grid) {
    grid.onclick = function(e) {
      var delBtn = e.target.closest(".btn-del");
      if (delBtn) {
        e.stopPropagation();
        var id = delBtn.getAttribute("data-id");
        if (confirm("确认删除此行动计划？此操作不可恢复。")) {
          var list = cards();
          var idx = -1;
          for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
          if (idx >= 0) {
            list.splice(idx, 1);
            saveCards(list);
            renderDash();
          }
        }
        return;
      }
      var card = e.target.closest(".acard");
      if (card) { curId = card.getAttribute("data-id"); switchPage("p-canvas"); }
    };
  }
}

// Render config banner on dashboard
function renderConfigBanner() {
  var banner = document.getElementById("config-banner");
  var text = document.getElementById("config-banner-text");
  if (!banner || !text) return;
  var aud = store.config.audience || {};
  var purpose = store.config.purpose || {};
  var parts = [];
  if (aud.level) parts.push("受众：" + aud.level);
  if (aud.challenge) parts.push("核心挑战：" + aud.challenge.slice(0, 40) + (aud.challenge.length > 40 ? "…" : ""));
  if (purpose.why) parts.push("培训目的：" + purpose.why.slice(0, 50) + (purpose.why.length > 50 ? "…" : ""));
  if (parts.length) {
    text.textContent = parts.join("。");
    banner.style.display = "flex";
  } else {
    banner.style.display = "none";
  }
}

function createCard() {
  var now = iso();
  var c = {
    id: "c_" + Date.now(),
    status: "draft",
    title: "",
    course: store.config.course || "",
    v1:"", v2l:"", v2v:"",
    v4s:"", v4methods:[], v4notes:{},
    v5r:"", v5mp:"", v5mr:"",
    depts:[{}], tasks:[{}], metrics:[],
    created: now, updated: now
  };
  var list = cards();
  list.push(c);
  saveCards(list);
  curId = c.id;
  switchPage("p-canvas");
}

// ========= CONTEXT PANEL =========
function toggleCtx() {
  var body = document.getElementById("ctx-body");
  var arr = document.getElementById("ctx-arr");
  var txt = document.getElementById("ctx-toggle-text");
  if (!body) return;
  if (body.classList.contains("open")) {
    body.classList.remove("open");
    if (arr) arr.classList.remove("open");
    if (txt) txt.textContent = "查看培训背景";
  } else {
    body.classList.add("open");
    if (arr) arr.classList.add("open");
    if (txt) txt.textContent = "收起培训背景";
  }
}
window.toggleCtx = toggleCtx;

function renderContextPanel() {
  var panel = document.getElementById("ctx-panel");
  if (!panel) return;

  var aud = store.config.audience || {};
  var pur = store.config.purpose || {};

  // Check if there is any meaningful config
  var hasContent = !!(aud.level || aud.challenge || pur.why || pur.do_ || pur.measure || pur.change);
  if (!hasContent) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";

  // Audience block
  var el = document.getElementById("ctx-aud-level");
  if (el) el.textContent = aud.level || "";
  el = document.getElementById("ctx-aud-challenge");
  if (el) el.textContent = aud.challenge ? "核心挑战：" + aud.challenge : "";

  // Purpose block
  el = document.getElementById("ctx-pur-why");
  if (el) el.textContent = pur.why || "";
  el = document.getElementById("ctx-pur-do");
  if (el) el.textContent = pur.do_ ? "课后目标：" + pur.do_ : "";

  // Measure block
  el = document.getElementById("ctx-pur-measure");
  if (el) el.textContent = pur.measure || "";
  el = document.getElementById("ctx-pur-change");
  if (el) el.textContent = pur.change ? "3/6个月目标：" + pur.change : "";
}

// ========= CANVAS =========
function renderCanvas() {
  var c = currentCard();
  if (!c) { switchPage("p-dash"); return; }
  var cMeta = document.getElementById("c-meta");
  var cCourse = document.getElementById("c-course-display");
  var cTitle = document.getElementById("c-title");
  var cCreated = document.getElementById("c-created");
  var cUpdated = document.getElementById("c-updated");
  if (cMeta) cMeta.textContent = store.user.name + " · " + (store.config.program || store.user.comp);
  if (cCourse) cCourse.value = c.course || store.config.course || "";
  if (cTitle) cTitle.value = c.title || "";
  if (cCreated) cCreated.textContent = fmt(c.created);
  if (cUpdated) cUpdated.textContent = fmt(c.updated);

  var st = c.status || "draft";
  var tn = st === "done" ? "已完成" : (st === "active" ? "进行中" : "草稿");
  var cStatus = document.getElementById("c-status");
  if (cStatus) {
    cStatus.textContent = tn;
    cStatus.className = "status-badge " + (st === "done" ? "done" : (st === "active" ? "open" : ""));
  }
  var bToggle = document.getElementById("b-toggle");
  if (bToggle) bToggle.textContent = st === "done" ? "标记为进行中" : "标记为已完成";

  var v1 = document.getElementById("v1");
  var v2l = document.getElementById("v2l");
  var v2v = document.getElementById("v2v");
  var v5r = document.getElementById("v5r");
  var v5mp = document.getElementById("v5mp");
  var v5mr = document.getElementById("v5mr");
  if (v1) v1.value = c.v1 || "";
  if (v2l) v2l.value = c.v2l || "";
  if (v2v) v2v.value = c.v2v || "";
  var v4s = document.getElementById("v4s");
  if (v4s) v4s.value = c.v4s || "";
  if (v5r) v5r.value = c.v5r || "";
  if (v5mp) v5mp.value = c.v5mp || "";
  if (v5mr) v5mr.value = c.v5mr || "";
  renderMethodTags(c);
  renderMethodNotes(c);

  renderContextPanel();
  updateHintsFromConfig();
  renderMethodTags(c);
  renderMethodNotes(c);
  renderDepts(c);
  renderTasks(c);
  renderMetrics(c);
  updateProgress(c);
  toggleStep(1, true);
}

function toggleStep(n, forceOpen) {
  var step = document.getElementById("s" + n);
  if (!step) return;
  if (forceOpen) step.classList.add("open");
  else step.classList.toggle("open");
}

function updateHintsFromConfig() {
  var aud = store.config.audience || {};
  var pur = store.config.purpose || {};

  // Step 1 hint: add challenge context if available
  var s1Hint = document.querySelector("#s1 .hint ul");
  if (s1Hint) {
    var extra = "";
    if (aud.challenge) extra = '<li style="color:#0d9488;font-weight:500">本次培训关注：' + esc(aud.challenge.slice(0, 60)) + (aud.challenge.length > 60 ? "\u2026" : "") + "</li>";
    // Keep original 3 hints, prepend context if available
    if (extra && !s1Hint.innerHTML.match(/本次培训关注/)) {
      s1Hint.innerHTML = extra + s1Hint.innerHTML;
    }
  }

  // Step 5 measure hint: add measure context
  var s5mp = document.getElementById("v5mp");
  if (s5mp && pur.measure) {
    s5mp.placeholder = "参考培训目标：" + pur.measure.slice(0, 30) + (pur.measure.length > 30 ? "\u2026" : "") + "\n\n例：客户偏好矩阵完成";
  }
  var s5mr = document.getElementById("v5mr");
  if (s5mr && pur.change) {
    s5mr.placeholder = "参考 3/6 个月目标：" + pur.change.slice(0, 30) + (pur.change.length > 30 ? "\u2026" : "") + "\n\n例：销量环比增长 15%";
  }
}

// ========= METHOD TAGS =========
// Step 4 Part 2: select methods after writing strategy
function renderMethodTags(c) {
  var el = document.getElementById("method-tags");
  var hint = document.getElementById("no-methods-hint");
  if (!el) return;
  var methods = store.config.methods || [];

  if (!methods.length) {
    el.innerHTML = "";
    if (hint) hint.style.display = "block";
    return;
  }
  if (hint) hint.style.display = "none";

  // Build selected set from c.v4methods (array of names)
  var selSet = {};
  if (c.v4methods) {
    for (var i = 0; i < c.v4methods.length; i++) selSet[c.v4methods[i]] = true;
  }

  var html = '<div class="method-tags">';
  for (var j = 0; j < methods.length; j++) {
    var isSel = !!selSet[methods[j]];
    html += '<span class="mtag' + (isSel ? ' sel' : '') + '" data-mname="' + esc(methods[j]) + '">' + esc(methods[j]) + '</span>';
  }
  html += '</div>';
  el.innerHTML = html;

  var tags = el.querySelectorAll(".mtag");
  for (var k = 0; k < tags.length; k++) {
    (function(tag) {
      tag.addEventListener("click", function() {
        var mname = tag.getAttribute("data-mname");
        var cc = currentCard();
        if (!cc) return;
        if (!cc.v4methods) cc.v4methods = [];
        var idx = cc.v4methods.indexOf(mname);
        if (idx >= 0) {
          // Deselect
          cc.v4methods.splice(idx, 1);
          // Clean up v4notes
          if (cc.v4notes) delete cc.v4notes[mname];
        } else {
          cc.v4methods.push(mname);
        }
        saveStore(store);
        renderMethodTags(cc);
        renderMethodNotes(cc);
        updateProgress(cc);
        showToast();
      });
    })(tags[k]);
  }
}

// ========= METHOD NOTES =========
// Render one note field per selected method
function renderMethodNotes(c) {
  var el = document.getElementById("method-notes");
  if (!el) return;
  var names = c.v4methods || [];
  if (!names.length) { el.innerHTML = ""; return; }

  var html = "";
  for (var i = 0; i < names.length; i++) {
    var mname = names[i];
    var note = (c.v4notes && c.v4notes[mname]) || "";
    html += '<div class="method-note">';
    html +=   '<div class="method-note-hd">';
    html +=     '<span class="method-note-badge">' + esc(mname) + '</span>';
    html +=     '<span style="font-size:11px;color:var(--muted)">方法如何支撑你的策略？</span>';
    html +=   '</div>';
    html +=   '<div class="method-note-bd">';
    html +=     '<div class="flbl">用法备注（选填）</div>';
    html +=     '<textarea class="fta method-note-ta" data-mname="' + esc(mname) + '" placeholder="例：用「战略地图」厘清华东区市场细分维度，输出3个高潜力客户群...">' + esc(note) + '</textarea>';
    html +=   '</div>';
    html += '</div>';
  }
  el.innerHTML = html;

  var tas = el.querySelectorAll(".method-note-ta");
  for (var j = 0; j < tas.length; j++) {
    (function(ta) {
      ta.addEventListener("input", function() {
        var cc = currentCard();
        if (!cc) return;
        if (!cc.v4notes) cc.v4notes = {};
        cc.v4notes[ta.getAttribute("data-mname")] = ta.value;
        clearTimeout(autoSave._tm);
        autoSave._tm = setTimeout(function() {
          updateProgress(cc); doSave();
        }, 600);
      });
    })(tas[j]);
  }
}

// ========= DEPTS =========
function renderDepts(c) {
  var el = document.getElementById("dept-list");
  if (!el) return;
  var ds = (c.depts && c.depts.length) ? c.depts : [{}];
  var html = "";
  for (var i = 0; i < ds.length; i++) {
    html += '<div class="row"><input class="fti" style="flex:1" placeholder="部门名称" value="' + esc(ds[i].name || "") + '"><input class="fti" style="flex:2" placeholder="该部门需要提供的支持" value="' + esc(ds[i].role || "") + '"><button class="btnDel" type="button">&times;</button></div>';
  }
  el.innerHTML = html;
  var dels = el.querySelectorAll(".btnDel");
  for (var i = 0; i < dels.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        btn.parentElement.remove();
        autoSave();
      });
    })(dels[i]);
  }
}
function addDeptRow() {
  var c = currentCard();
  if (!c) return;
  if (!c.depts) c.depts = [];
  c.depts.push({});
  saveStore(store);
  renderDepts(c);
}

// ========= TASKS =========
function renderTasks(c) {
  var el = document.getElementById("task-list");
  if (!el) return;
  var ts = (c.tasks && c.tasks.length) ? c.tasks : [{}];
  var html = "";
  for (var i = 0; i < ts.length; i++) {
    html += '<div class="row"><input class="fti" style="flex:3" placeholder="任务描述" value="' + esc(ts[i].desc || "") + '"><input class="fti" style="flex:1" placeholder="负责人" value="' + esc(ts[i].owner || "") + '"><input class="fti" style="flex:1" placeholder="截止时间" value="' + esc(ts[i].dl || "") + '"><button class="btnDel" type="button">&times;</button></div>';
  }
  el.innerHTML = html;
  var dels = el.querySelectorAll(".btnDel");
  for (var i = 0; i < dels.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        btn.parentElement.remove();
        autoSave();
      });
    })(dels[i]);
  }
}
function addTaskRow() {
  var c = currentCard();
  if (!c) return;
  if (!c.tasks) c.tasks = [];
  c.tasks.push({});
  saveStore(store);
  renderTasks(c);
}

// ========= METRICS =========
function renderMetrics(c) {
  var tb = document.getElementById("mtbody");
  if (!tb) return;
  var ms = (c.metrics && c.metrics.length && c.metrics[0] && c.metrics[0].n) ? c.metrics : [];
  if (!ms.length) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;font-size:13px;padding:16px">暂无追踪指标</td></tr>';
    return;
  }
  var html = "";
  for (var i = 0; i < ms.length; i++) {
    html += '<tr><td><input class="fti" style="font-size:13px;padding:7px 10px" value="' + esc(ms[i].n || "") + '"></td><td><input class="fti" style="font-size:13px;padding:7px 10px" value="' + esc(ms[i].t || "") + '"></td><td><input class="fti" style="font-size:13px;padding:7px 10px" value="' + esc(ms[i].cur || "") + '"></td><td><input class="fti" style="font-size:13px;padding:7px 10px" value="' + esc(ms[i].dt || "") + '"></td><td><button class="btnDel" data-i="' + i + '" type="button">&times;</button></td></tr>';
  }
  tb.innerHTML = html;
  var dels = tb.querySelectorAll(".btnDel");
  for (var i = 0; i < dels.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(btn.getAttribute("data-i"), 10);
        var cc = currentCard();
        if (cc && cc.metrics) {
          cc.metrics.splice(idx, 1);
          saveStore(store);
          renderMetrics(cc);
          autoSave();
        }
      });
    })(dels[i]);
  }
}
function addMetricRow() {
  var c = currentCard();
  if (!c) return;
  if (!c.metrics) c.metrics = [];
  c.metrics.push({});
  saveStore(store);
  renderMetrics(c);
}

// ========= SAVE =========
function collectData() {
  var c = currentCard();
  if (!c) return;
  var cTitle = document.getElementById("c-title");
  var cCourse = document.getElementById("c-course-display");
  var v1 = document.getElementById("v1");
  var v2l = document.getElementById("v2l");
  var v2v = document.getElementById("v2v");
  var v5r = document.getElementById("v5r");
  var v5mp = document.getElementById("v5mp");
  var v5mr = document.getElementById("v5mr");
  if (cTitle) c.title = cTitle.value;
  if (cCourse) c.course = cCourse.value;
  if (v1) c.v1 = v1.value;
  if (v2l) c.v2l = v2l.value;
  if (v2v) c.v2v = v2v.value;
  if (v5r) c.v5r = v5r.value;
  if (v5mp) c.v5mp = v5mp.value;
  if (v5mr) c.v5mr = v5mr.value;

  // v4s is already loaded in renderCanvas, collect it
  var v4s = document.getElementById("v4s");
  if (v4s) c.v4s = v4s.value;
  // v4notes are saved in real-time by input handlers, nothing to collect here

  c.depts = [];
  var drs = document.querySelectorAll("#dept-list > div");
  for (var i = 0; i < drs.length; i++) {
    var ins = drs[i].querySelectorAll("input");
    if (ins[0] && (ins[0].value || (ins[1] && ins[1].value))) {
      c.depts.push({ name: ins[0].value, role: ins[1] ? ins[1].value : "" });
    }
  }
  c.tasks = [];
  var trs = document.querySelectorAll("#task-list > div");
  for (var i = 0; i < trs.length; i++) {
    var ins = trs[i].querySelectorAll("input");
    if (ins[0] && ins[0].value) {
      c.tasks.push({ desc: ins[0].value, owner: ins[1]?ins[1].value:"", dl: ins[2]?ins[2].value:"" });
    }
  }
  c.metrics = [];
  var mtrs = document.querySelectorAll("#mtbody tr");
  for (var i = 0; i < mtrs.length; i++) {
    var ins = mtrs[i].querySelectorAll("input");
    if (ins.length >= 4 && ins[0] && ins[0].value) {
      c.metrics.push({ n: ins[0].value, t: ins[1]?ins[1].value:"", cur: ins[2]?ins[2].value:"", dt: ins[3]?ins[3].value:"" });
    }
  }
  c.updated = iso();
}

function doSave() {
  collectData();
  saveStore(store);
  showToast();
  var c = currentCard();
  if (c) updateProgress(c);
}
function autoSave() { doSave(); }

function toggleStatus() {
  var c = currentCard();
  if (!c) return;
  if (c.status === "done") c.status = "active";
  else if (c.status === "active") c.status = "done";
  else c.status = "active";
  saveStore(store);
  renderCanvas();
}
function goBack() { doSave(); switchPage("p-dash"); }

// ========= EXPORT =========
function doExportPDF() {
  // Collect latest data first
  collectData();
  var c = currentCard();
  if (!c) return;

  // Set document title for PDF filename
  var title = c.title || "行动计划";
  var userName = store.user ? store.user.name : "学员";
  document.title = title + " - " + userName + " - Training Leap";

  // Trigger print dialog (user can "Save as PDF")
  window.print();
}

function doExportJSON() {
  collectData();
  var c = currentCard();
  if (!c) return;

  var exportData = {
    user: store.user,
    config: {
      program: store.config.program,
      course: store.config.course
    },
    card: c,
    exportedAt: iso()
  };

  var blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = (c.title || "行动计划") + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function doSubmitCode() {
  collectData();
  var c = currentCard();
  if (!c) {
    toast("请先创建或选择一个行动计划");
    return;
  }

  // Build submission data
  var submitData = {
    user: { name: store.user ? store.user.name : "学员", comp: store.user ? store.user.comp : "" },
    card: c,
    config: {
      program: store.config.program || "",
      course: store.config.course || ""
    },
    submittedAt: iso()
  };

  var jsonStr = JSON.stringify(submitData, null, 2);

  // Copy to clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(function() {
      showSubmitModal(jsonStr);
    });
  } else {
    // Fallback: show modal with text to copy manually
    showSubmitModal(jsonStr);
  }
}

// Show submission code in a modal for user to copy
function showSubmitModal(jsonStr) {
  // Remove existing modal if any
  var existing = document.getElementById("submit-modal");
  if (existing) existing.remove();

  var overlay = document.createElement("div");
  overlay.id = "submit-modal";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px";
  overlay.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:540px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 60px rgba(0,0,0,.15);padding:28px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">' +
        '<h3 style="font-size:17px;font-weight:700;color:#0f172a">提交码已生成</h3>' +
        '<button id="submit-modal-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1">&times;</button>' +
      '</div>' +
      '<p style="font-size:13px;color:#64748b;margin-bottom:14px;line-height:1.6">将下方内容复制后，发送给培训管理员（HR 或培训师），管理员将在后台导入查看你的进度。</p>' +
      '<textarea readonly style="width:100%;min-height:160px;padding:12px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:monospace;font-size:11px;background:#f8fafc;color:#334155;resize:vertical;line-height:1.6;word-break:break-all" onclick="this.select()">'+ jsonStr.replace(/</g,"&lt;") +'</textarea>' +
      '<div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">' +
        '<button id="btn-copy-submit" style="padding:9px 22px;background:#0f172a;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">复制到剪贴板</button>' +
        '<button id="btn-close-submit" style="padding:9px 18px;background:#fff;color:#64748b;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:500;cursor:pointer">关闭</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  document.getElementById("submit-modal-close").onclick = function(){overlay.remove()};
  document.getElementById("btn-close-submit").onclick = function(){overlay.remove()};
  document.getElementById("btn-copy-submit").onclick = function(){
    navigator.clipboard.writeText(jsonStr).then(function(){
      var btn = document.getElementById("btn-copy-submit");
      btn.textContent = "已复制!";
      btn.style.background = "#059669";
      setTimeout(function(){btn.textContent = "复制到剪贴板";btn.style.background = "#0f172a"},1500);
    }).catch(function(){
      // Fallback: select all text
      var ta = overlay.querySelector("textarea");
      ta.select();
      document.execCommand("copy");
    });
  };

  // Close on backdrop click
  overlay.addEventListener("click", function(e){
    if(e.target === overlay) overlay.remove();
  });
}
window.showSubmitModal = showSubmitModal;

// ========= INIT =========
function initBindings() {
  var bLogin = document.getElementById("b-login");
  if (bLogin) bLogin.addEventListener("click", function(e) { e.preventDefault(); doLogin(); });

  var bNew = document.getElementById("b-new");
  if (bNew) bNew.addEventListener("click", createCard);
  var bNewEmpty = document.getElementById("b-new-empty");
  if (bNewEmpty) bNewEmpty.addEventListener("click", createCard);

  var bBack = document.getElementById("b-back");
  if (bBack) bBack.addEventListener("click", goBack);

  var bSave = document.getElementById("b-save");
  if (bSave) bSave.addEventListener("click", doSave);

  var bToggle = document.getElementById("b-toggle");
  if (bToggle) bToggle.addEventListener("click", toggleStatus);

  var bExport = document.getElementById("b-export");
  if (bExport) bExport.addEventListener("click", doExportPDF);

  var bSubmit = document.getElementById("b-submit");
  if (bSubmit) bSubmit.addEventListener("click", doSubmitCode);

  var bLogout = document.getElementById("b-logout");
  if (bLogout) bLogout.addEventListener("click", function() {
    if (confirm("退出后将清除当前登录状态，确认退出？")) {
      delete store.user;
      saveStore(store);
      curId = null;
      switchPage("p-login");
    }
  });

  var bLogo = document.getElementById("b-logo");
  if (bLogo) bLogo.addEventListener("click", function() { switchPage("p-dash"); });

  for (var i = 1; i <= 5; i++) {
    (function(n) {
      var hdr = document.querySelector("#s" + n + " .step-hdr");
      if (hdr) hdr.addEventListener("click", function() { toggleStep(n); });
    })(i);
  }

  var bAddDept = document.getElementById("b-add-dept");
  if (bAddDept) bAddDept.addEventListener("click", addDeptRow);
  var bAddTask = document.getElementById("b-add-task");
  if (bAddTask) bAddTask.addEventListener("click", addTaskRow);
  var bAddMet = document.getElementById("b-add-met");
  if (bAddMet) bAddMet.addEventListener("click", addMetricRow);

  var inputs = document.querySelectorAll("input, textarea");
  for (var j = 0; j < inputs.length; j++) {
    inputs[j].addEventListener("input", function() {
      clearTimeout(autoSave._tm);
      autoSave._tm = setTimeout(autoSave, 800);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBindings);
} else {
  initBindings();
}

if (store.user && store.user.name) {
  switchPage("p-dash");
}

})();
