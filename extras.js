/* «Мои задачи» (личные напоминания), значок непрочитанных напоминаний и меню «Ещё» на телефоне.
   После входа напоминания хранятся на сервере, без входа — на этом устройстве (localStorage: ds_my). Подключается в index.html после основных скриптов. */
(function () {
  "use strict";
  var X = window.MPBX = {};
  var DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  /* ---------- утилиты ---------- */
  function $(id) { return document.getElementById(id); }
  function E(s) { return window.esc ? window.esc(s) : String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function p2(n) { return n < 10 ? "0" + n : "" + n; }
  function iso(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function pd(s) {                              // "2026-10-09" -> локальная дата без времени
    if (!s) return null;
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    var d = new Date(s); return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function addD(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function diffD(a, b) { return Math.round((b - a) / 864e5); }
  function dmy(d) { return p2(d.getDate()) + "." + p2(d.getMonth() + 1); }
  function ic(n) { return window.icon ? window.icon(n) : ""; }
  function when(d) {                            // человеческая подпись даты
    var df = diffD(today(), d);
    return df === 0 ? "сегодня" : df === 1 ? "завтра" : df === -1 ? "вчера" : dmy(d);
  }
  function head(title, sub, extra) {
    return '<header class="top"><div class="brand"><div><h1>' + title + "</h1><p>" + sub + "</p></div></div>" + (extra || "") + "</header>";
  }
  function go(h) { location.hash = h; }

  var root = {};
  function mount(id) { if (!root[id]) root[id] = $(id); return root[id]; }
  function cur() { return window.sectionForHash ? sectionForHash(location.hash) : ""; }

  /* ================================================================
     МОИ ЗАДАЧИ + напоминания
     Режим «сервер» (после входа по PIN): напоминания хранятся на сервере, приходят на все устройства,
     в Telegram и push даже при закрытом приложении. Режим «устройство» (без входа): как раньше — localStorage.
     ================================================================ */
  var MY = null, myNext = 1, mySel = null;
  function srv() { return !!(window.MPBC && MPBC.loggedIn()); }
  function fromServer(r) {
    return { id: r.id, t: r.title, d: r.d, tm: r.tm, b: r.before, rep: r.rep, task: r.task_row, tl: r.task_label, done: !!r.done, fired: !!r.fired, fireTs: r.fire_ts * 1000, created: (r.created || 0) * 1000, link: r.link || "", server: true };
  }
  function localLoad() {
    var a; try { a = JSON.parse(localStorage.getItem("ds_my") || "[]"); } catch (e) { a = []; }
    a.forEach(function (x) { if (x.id >= myNext) myNext = x.id + 1; });
    return a;
  }
  function myList() { if (!MY) MY = srv() ? [] : localLoad(); return MY; }
  function mySave() { if (!srv()) { try { localStorage.setItem("ds_my", JSON.stringify(MY)); } catch (e) {} } X.badge(); }

  /* загрузка списка: с сервера или с устройства; при первом входе переносит локальные записи на сервер */
  function myLoad() {
    if (!srv()) { MY = localLoad(); return Promise.resolve(MY); }
    return MPBC.call("/reminders").then(function (rs) {
      MY = rs.map(fromServer);
      var done = false; try { done = localStorage.getItem("ds_my_imported") === "1"; } catch (e) {}
      var loc = done ? [] : localLoad().filter(function (x) { return !x.done && fireAtLocal(x) > Date.now() - 29 * 864e5; });
      if (!loc.length) { try { localStorage.setItem("ds_my_imported", "1"); } catch (e) {} return MY; }
      var items = loc.map(function (x) { return { title: x.t, d: x.d || "", tm: x.tm || "", before: x.b || 0, fire_ts: fireAtLocal(x) / 1000, rep: x.rep || "", task_row: x.task || 0, task_label: x.tl || "" }; });
      return MPBC.call("/reminders/import", { body: { items: items } }).then(function () {
        try { localStorage.setItem("ds_my_backup", localStorage.getItem("ds_my") || "[]"); localStorage.removeItem("ds_my"); localStorage.setItem("ds_my_imported", "1"); } catch (e) {}
        toast("Перенёс личные напоминания на сервер: " + loc.length);
        return MPBC.call("/reminders").then(function (rs2) { MY = rs2.map(fromServer); return MY; });
      }, function () { return MY; });
    }).catch(function () { return MY || []; });
  }
  function fireAtLocal(x) {
    var d = pd(x.d); if (!d) return 0;
    var hm = String(x.tm || "09:00").split(":");
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +hm[0] || 0, +hm[1] || 0).getTime() - (x.b || 0) * 60000;
  }
  function fireAt(x) {
    if (x.server) return x.fireTs;
    if (x.snoozeTo) return x.snoozeTo;
    var f = fireAtLocal(x); return f || null;
  }
  var BEFORE = [[0, "в момент срока"], [15, "за 15 минут"], [60, "за 1 час"], [1440, "за 1 день"]];
  function beforeLabel(b) { for (var i = 0; i < BEFORE.length; i++) if (BEFORE[i][0] === b) return BEFORE[i][1]; return "за " + b + " мин"; }
  var REPS = [["", "не повторять"], ["day", "каждый день"], ["week", "каждую неделю"], ["month", "каждый месяц"]];
  function repLabel(r) { for (var i = 0; i < REPS.length; i++) if (REPS[i][0] === r) return REPS[i][1]; return ""; }
  function nextDate(x) {
    var d = pd(x.d) || today();
    if (x.rep === "day") d = addD(d, 1); else if (x.rep === "week") d = addD(d, 7); else if (x.rep === "month") d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return iso(d);
  }

  /* всплывающие уведомления внутри приложения + системные (если разрешены) */
  function banners() { var b = $("xBanners"); if (!b) { b = document.createElement("div"); b.id = "xBanners"; b.className = "x-banners"; document.body.appendChild(b); } return b; }
  function toast(msg, undo) {
    var t = $("xToast"); if (!t) { t = document.createElement("div"); t.id = "xToast"; t.className = "x-toast"; document.body.appendChild(t); }
    t.innerHTML = "<span>" + msg + "</span>" + (undo ? '<button id="xUndo">Отменить</button>' : ""); t.className = "x-toast on";
    if (undo) $("xUndo").onclick = function () { undo(); t.className = "x-toast"; };
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.className = "x-toast"; }, undo ? 7000 : 3200);
  }
  function notifState() { return ("Notification" in window) ? Notification.permission : "unsupported"; }
  function systemNotify(x) {
    if (notifState() !== "granted") return;
    if (srv() && window.MPBC && MPBC.pushOn()) return;          // push с сервера уже покажет системное уведомление
    var opts = { body: x.t, icon: "icon-512.png", badge: "icon-180.png", tag: "mpb-my-" + x.id, renotify: true, data: { url: "./index.html#/my" } };
    var title = "Проекты DS · " + (x.b ? "напоминание " + beforeLabel(x.b) : "напоминание");
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
      navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.showNotification(title, opts); else new Notification(title, opts); }, function () { try { new Notification(title, opts); } catch (e) {} });
    } else { try { new Notification(title, opts); } catch (e) {} }
  }
  var shown = {};
  try { shown = JSON.parse(localStorage.getItem("ds_shown") || "{}"); } catch (e) {}
  function markShown(k) {
    shown[k] = Date.now();
    var ks = Object.keys(shown); if (ks.length > 200) ks.sort(function (a, b) { return shown[a] - shown[b]; }).slice(0, ks.length - 200).forEach(function (z) { delete shown[z]; });
    try { localStorage.setItem("ds_shown", JSON.stringify(shown)); } catch (e) {}
  }
  function fire(x) {
    if (x.server) markShown(x.id + ":" + x.fireTs); else { x.fired = true; x.snoozeTo = null; mySave(); }
    var b = document.createElement("div"); b.className = "x-banner";
    b.innerHTML = "<b>Напоминание" + (x.b ? " · " + beforeLabel(x.b) : "") + "</b><p>" + E(x.t) + (x.tm ? " — " + E(when(pd(x.d) || today())) + ", " + E(x.tm) : "") + '</p><div class="acts"><button class="x-btn primary" data-a="done" style="padding:8px 14px">Выполнено</button><button class="x-btn ghost" data-a="snz" style="padding:8px 14px">Через 10 мин</button>' + (x.task ? '<button class="x-btn ghost" data-a="open" style="padding:8px 14px">Открыть задачу</button>' : "") + "</div>";
    b.querySelector('[data-a="done"]').onclick = function () { setDone(x, true); b.remove(); };
    b.querySelector('[data-a="snz"]').onclick = function () { snooze(x); b.remove(); };
    var op = b.querySelector('[data-a="open"]'); if (op) op.onclick = function () { go("#/task/" + x.task); b.remove(); };
    banners().appendChild(b);
    systemNotify(x); paintMyIfOpen();
  }
  function snooze(x) {
    if (x.server) { MPBC.call("/reminders/" + x.id + "/snooze", { body: { minutes: 10 } }).then(function () { return myLoad(); }).then(function () { paintMyIfOpen(); toast("Напомню через 10 минут"); }).catch(function (e) { toast(E(e)); }); return; }
    x.fired = false; x.snoozeTo = Date.now() + 10 * 60000; mySave(); paintMyIfOpen(); toast("Напомню через 10 минут");
  }
  function tick() {
    var now = Date.now(), changed = false;
    myList().forEach(function (x) {
      if (x.done) return;
      var t = fireAt(x); if (t == null || now < t) return;
      if (x.server) { if (!shown[x.id + ":" + x.fireTs] && now - Math.max(t, x.created || 0) < 12 * 3600e3) { fire(x); changed = true; } else if (!shown[x.id + ":" + x.fireTs]) markShown(x.id + ":" + x.fireTs); }
      else if (!x.fired) { fire(x); changed = true; }
    });
    return changed;
  }
  function setDone(x, done) {
    if (x.server) {
      MPBC.call("/reminders/" + x.id + "/done", { body: { done: done } }).then(function () { return myLoad(); }).then(function () { X.badge(); paintMyIfOpen(); }).catch(function (e) { toast(E(e)); });
      return;
    }
    x.done = done;
    if (done && x.rep) { var nx = JSON.parse(JSON.stringify(x)); nx.id = myNext++; nx.d = nextDate(x); nx.done = false; nx.fired = false; nx.snoozeTo = null; MY.push(nx); }
    mySave(); paintMyIfOpen();
  }
  function paintMyIfOpen() { if (cur() === "my") paintMy(); }

  X.badge = function () {
    var n = myList().filter(function (x) { return !x.done && pd(x.d) && pd(x.d) <= today(); }).length;
    document.querySelectorAll('#topnav button[data-goto="#/my"], #bottomnav button[data-goto="#/my"]').forEach(function (b) {
      var o = b.querySelector(".chat-badge"); if (o) o.remove();
      if (n) { var s = document.createElement("span"); s.className = "chat-badge"; s.textContent = n; b.appendChild(s); }
    });
  };

  X.reload = function () { return myLoad().then(function () { X.badge(); paintMyIfOpen(); tick(); }); };

  function renderMy() {
    if (window.DS && DS.ownsMy && DS.ownsMy() && !window.__myRem) return;      /* у проектировщиков «Мои задачи» — вкладка «План на неделю» (ds.js); вкладка «Мои напоминания» — этот экран */
    var el = mount("my-app");
    el.innerHTML = head("Мои задачи", "Поставьте себе задачу — приложение напомнит в нужное время", "") + '<div class="wrap"><div id="myBody"></div></div>';
    paintMy();
    myLoad().then(function () { if (cur() === "my") paintMy(); X.badge(); });
    (window.DS && DS.ensureOrders ? DS.ensureOrders() : Promise.resolve()).then(function () { if (cur() === "my") fillTaskSelect(); }, function () {});
  }
  function fillTaskSelect() {
    var sel = $("myTask"); if (!sel) return;
    var keep = sel.value, list = window.DS && DS.orders ? DS.orders() : [];
    sel.innerHTML = '<option value="">— без привязки —</option>' + list.map(function (o) { return '<option value="' + o.id + '">' + E(o.label) + "</option>"; }).join("");
    sel.value = keep;
  }
  function taskLabel(row) { var o = (window.DS && DS.orders ? DS.orders() : []).filter(function (x) { return x.id === +row; })[0]; return o ? o.label : "Задача"; }

  var myEdit = 0;                                  // какое напоминание сейчас правят
  function opts(list, val) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + o[1] + "</option>"; }).join(""); }
  function todoEditHtml(x) {
    return '<div class="x-todo x-todo-ed" data-id="' + x.id + '"><div class="bx">'
      + '<input type="text" data-f="t" value="' + E(x.t) + '" maxlength="300" placeholder="Что нужно сделать">'
      + '<div class="x-opts"><div class="x-opt"><label>Дата</label><input type="date" data-f="d" value="' + E(x.d || iso(today())) + '"></div>'
      + '<div class="x-opt"><label>Время</label><input type="time" data-f="tm" value="' + E(x.tm || "09:00") + '"></div>'
      + '<div class="x-opt"><label>Напомнить</label><select data-f="b">' + opts(BEFORE, x.b || 0) + "</select></div>"
      + '<div class="x-opt"><label>Повтор</label><select data-f="rep">' + opts(REPS, x.rep || "") + "</select></div></div>"
      + '<div class="x-ed-acts"><button class="x-btn primary" data-a="save">Сохранить</button><button class="x-btn ghost" data-a="cancel">Отмена</button></div></div></div>';
  }
  function todoHtml(x) {
    if (myEdit === x.id && !x.done) return todoEditHtml(x);
    var d = pd(x.d), over = d && d < today() && !x.done;
    return '<div class="x-todo ' + (x.done ? "done" : "") + '" data-id="' + x.id + '"><button class="ck" data-a="ck" title="Выполнено">' + ic("check") + '</button><div class="bx"><div class="tt">' + E(x.t) + '</div><div class="mt">'
      + '<span class="x-pill ' + (over ? "over" : "blue") + '">' + ic("bell") + (d ? when(d) : "без даты") + (x.tm ? ", " + E(x.tm) : "") + " · " + beforeLabel(x.b || 0) + "</span>"
      + (x.rep ? '<span class="x-pill">' + ic("repeat") + repLabel(x.rep) + "</span>" : "")
      + (x.task ? '<span class="x-pill acc" style="cursor:pointer" data-a="task">' + ic("tasks") + E(x.tl || taskLabel(x.task)) + "</span>" : "")
      + (x.link ? '<span class="x-pill acc" style="cursor:pointer" data-a="lnk" title="Открыть диалог">' + ic("chat") + E(x.tl || "Открыть диалог") + "</span>" : "") + "</div></div>"
      + (x.done ? "" : '<button class="del" data-a="ed" title="Изменить текст, день и время">✎</button>') + '<button class="del" data-a="del" title="Удалить">' + ic("trash") + "</button></div>";
  }
  function saveEdit(x, r) {
    var v = function (f) { return r.querySelector('[data-f="' + f + '"]').value; };
    var t = v("t").trim(); if (!t) { r.querySelector('[data-f="t"]').focus(); return; }
    var nx = { t: t, d: v("d") || iso(today()), tm: v("tm") || "09:00", b: +v("b") || 0, rep: v("rep") };
    var f = fireAtLocal({ d: nx.d, tm: nx.tm, b: nx.b });
    var btn = r.querySelector('[data-a="save"]'); btn.disabled = true;
    var done = function () { myEdit = 0; paintMy(); X.badge(); toast("Напоминание изменено" + (f && f <= Date.now() ? " — сработает сразу" : "")); tick(); };
    if (x.server) {
      MPBC.call("/reminders/" + x.id + "/edit", { body: { title: nx.t, d: nx.d, tm: nx.tm, before: nx.b, fire_ts: f / 1000, rep: nx.rep, task_row: x.task || 0, task_label: x.tl || "", link: x.link || "" } })
        .then(function () { return myLoad(); }).then(done).catch(function (e) { btn.disabled = false; toast(E(e)); });
      return;
    }
    x.t = nx.t; x.d = nx.d; x.tm = nx.tm; x.b = nx.b; x.rep = nx.rep; x.fired = false; mySave(); done();
  }
  function paintMy() {
    if (window.DS && DS.ownsMy && DS.ownsMy() && !window.__myRem) return;
    var body = $("myBody"); if (!body) return;
    var list = myList(), tdy = today(), tdyIso = iso(tdy), i;
    var keepText = $("myText") ? $("myText").value : "";
    var kd = $("myDate") ? $("myDate").value : tdyIso, kt = $("myTime") ? $("myTime").value : "16:00", kb = $("myBefore") ? $("myBefore").value : "60", kr = $("myRep") ? $("myRep").value : "", kk = $("myTask") ? $("myTask").value : "";
    var wk = "";
    for (i = -2; i < 5; i++) { var d = addD(tdy, i), k = iso(d), n = list.filter(function (x) { return x.d === k && !x.done; }).length;
      wk += '<div class="' + (i === 0 ? "today" : "") + " " + (mySel === k ? "sel" : "") + '" data-d="' + k + '"><small>' + DAYS[(d.getDay() + 6) % 7] + "</small><b>" + d.getDate() + "</b><i>" + (n ? n + " зад." : "") + "</i></div>"; }
    var items = list.filter(function (x) { return !mySel || x.d === mySel; });
    var open = items.filter(function (x) { return !x.done; }).sort(function (a, b) { return (fireAt(a) || 0) < (fireAt(b) || 0) ? -1 : 1; });
    function grp(t, arr, cls) { return arr.length ? '<div class="x-gl ' + (cls || "") + '">' + t + " · " + arr.length + "</div>" + arr.map(todoHtml).join("") : ""; }
    var t1 = iso(addD(tdy, 1));
    var done = items.filter(function (x) { return x.done; }).slice(-5).reverse();
    var lh = grp("Просрочено", open.filter(function (x) { return x.d < tdyIso; }), "red") + grp("Сегодня", open.filter(function (x) { return x.d === tdyIso; })) + grp("Завтра", open.filter(function (x) { return x.d === t1; })) + grp("Позже", open.filter(function (x) { return x.d > t1; })) + grp("Выполнено", done);
    var nx = list.filter(function (x) { return !x.done; }).sort(function (a, b) { return (fireAt(a) || 0) - (fireAt(b) || 0); })[0];
    var ns = notifState(), nCls = ns === "granted" ? "on" : ns === "denied" ? "bad" : "", nTxt = ns === "granted" ? ["Системные уведомления включены", "Напоминания появятся и в системе, пока приложение открыто (в том числе свёрнутое)"] : ns === "denied" ? ["Уведомления заблокированы в браузере", "Разрешите их в настройках сайта — иначе будут только сообщения внутри приложения"] : ns === "unsupported" ? ["Браузер не поддерживает уведомления", "Напоминания будут показываться внутри приложения"] : ["Системные уведомления выключены", "Включите, чтобы напоминания приходили поверх других окон"];
    var mode = srv() ? ["on", "Напоминания на сервере", "Хранятся на сервере и придут на все ваши устройства, в Telegram и push — даже при закрытом приложении (если включены в «Личном кабинете»)"] : ["", "Только на этом устройстве", "Напоминания придут, пока приложение открыто. Войдите по PIN в «Личном кабинете» — тогда они переедут на сервер"];
    var now = new Date(), nowTxt = p2(now.getHours()) + ":" + p2(now.getMinutes());
    var phone = nx ? '<div class="x-push"><span class="pi"><img src="logo.png" alt=""></span><div><b>Проекты DS · напоминание' + (nx.b ? " " + beforeLabel(nx.b) : "") + "</b><small>" + E(nx.t) + '</small></div><span class="pt">' + E(nx.tm || "") + "</span></div>" : '<div class="x-push"><div><b>Пока пусто</b><small>Добавьте первое напоминание слева</small></div></div>';
    body.innerHTML = '<div class="x-two"><div>'
      + '<div class="x-wk" id="myWk">' + wk + "</div>"
      + '<div class="x-panel pad x-qadd" style="margin-bottom:18px"><div class="big"><input type="text" id="myText" placeholder="Что нужно сделать? Например: позвонить заказчику по пропускам" autocomplete="off"><button class="x-btn accent" id="myAdd">' + ic("plus") + "Добавить</button></div>"
      + '<div style="margin-top:10px"><button class="x-btn ghost" id="myAssign">' + ic("plus") + "Поставить задачу сотруднику…</button></div>"
      + '<div class="x-opts"><div class="x-opt"><label>Дата</label><input type="date" id="myDate"></div><div class="x-opt"><label>Время</label><input type="time" id="myTime"></div>'
      + '<div class="x-opt"><label>Напомнить</label><select id="myBefore">' + BEFORE.map(function (b) { return '<option value="' + b[0] + '">' + b[1] + "</option>"; }).join("") + "</select></div>"
      + '<div class="x-opt"><label>Повтор</label><select id="myRep">' + REPS.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + "</option>"; }).join("") + "</select></div>"
      + '<div class="x-opt"><label>Привязать к задаче</label><select id="myTask"><option value="">— без привязки —</option></select></div></div></div>'
      + '<div class="x-panel">' + (lh || '<div class="x-empty">Пока ничего нет. Добавьте напоминание — оно сработает в нужное время</div>') + "</div></div>"
      + '<div class="x-sticky"><div class="x-panel pad" style="margin-bottom:16px"><h3>Как придёт оповещение</h3><p class="x-sub">Telegram и push — в «Личном кабинете»</p>'
      + '<div class="x-notif ' + (mode[0] ? "on" : "") + '"><span class="dot"></span><div><b>' + mode[1] + "</b><small>" + mode[2] + "</small></div></div>"
      + (srv() ? "" : '<button class="x-btn ghost" id="myLogin" style="width:100%;justify-content:center;margin-bottom:12px">Войти по PIN</button>')
      + '<div class="x-notif ' + nCls + '"><span class="dot"></span><div><b>' + nTxt[0] + "</b><small>" + nTxt[1] + "</small></div></div>"
      + (ns === "default" ? '<button class="x-btn primary" id="myAllow" style="width:100%;justify-content:center;margin-bottom:14px">' + ic("bell") + "Включить уведомления</button>" : "")
      + '<div class="x-phone"><div class="clk"><b>' + nowTxt + "</b><small>так выглядит напоминание</small></div>" + phone + "</div></div></div></div>";
    $("myText").value = keepText || ""; $("myDate").value = kd || tdyIso; $("myTime").value = kt || "16:00"; $("myBefore").value = kb || "60"; $("myRep").value = kr || "";
    fillTaskSelect(); if (kk && $("myTask")) $("myTask").value = kk;
    function add() {
      var tx = $("myText").value.trim(); if (!tx) { $("myText").focus(); return; }
      var row = +$("myTask").value || 0;
      var it = { id: myNext++, t: tx, d: $("myDate").value || tdyIso, tm: $("myTime").value || "09:00", b: +$("myBefore").value || 0, rep: $("myRep").value, task: row, tl: row ? taskLabel(row) : "", done: false, fired: false };
      var f = fireAtLocal(it), soon = f && f <= Date.now();
      if (srv()) {
        $("myAdd").disabled = true;
        MPBC.call("/reminders", { body: { title: it.t, d: it.d, tm: it.tm, before: it.b, fire_ts: f / 1000, rep: it.rep, task_row: it.task, task_label: it.tl } })
          .then(function () { mySel = null; return myLoad(); }).then(function () { $("myText").value = ""; paintMy(); X.badge(); toast("Напоминание создано" + (soon ? " — сработает сразу" : "")); tick(); })
          .catch(function (e) { $("myAdd").disabled = false; toast(E(e)); });
        return;
      }
      myList().push(it); mySave(); mySel = null; $("myText").value = ""; paintMy();
      toast("Напоминание создано" + (soon ? " — сработает сразу" : ""));
      tick();
    }
    $("myAdd").onclick = add; $("myText").onkeydown = function (e) { if (e.key === "Enter") add(); };
    var as_ = $("myAssign"); if (as_) as_.onclick = function () { if (window.DS && DS.newTask) DS.newTask({}); else toast("Раздел задач ещё не загрузился — обновите страницу"); };
    var al = $("myAllow"); if (al) al.onclick = function () { Notification.requestPermission().then(function () { paintMy(); }); };
    var ml = $("myLogin"); if (ml) ml.onclick = function () { MPBC.requireLogin().then(function () { renderMy(); }, function () {}); };
    body.querySelectorAll("#myWk div").forEach(function (b) { b.onclick = function () { mySel = (mySel === b.dataset.d) ? null : b.dataset.d; paintMy(); }; });
    body.querySelectorAll(".x-todo").forEach(function (r) {
      var x = myList().filter(function (z) { return z.id === +r.dataset.id; })[0]; if (!x) return;
      if (r.classList.contains("x-todo-ed")) {                                   // открыта правка
        r.querySelector('[data-a="save"]').onclick = function () { saveEdit(x, r); };
        r.querySelector('[data-a="cancel"]').onclick = function () { myEdit = 0; paintMy(); };
        r.querySelector('[data-f="t"]').onkeydown = function (e) { if (e.key === "Enter") saveEdit(x, r); if (e.key === "Escape") { myEdit = 0; paintMy(); } };
        return;
      }
      var ed = r.querySelector('[data-a="ed"]'); if (ed) ed.onclick = function () { myEdit = x.id; paintMy(); var i = document.querySelector('.x-todo-ed [data-f="t"]'); if (i) { i.focus(); i.select(); } };
      r.querySelector('[data-a="ck"]').onclick = function () { var was = x.done; setDone(x, !was); if (!was) toast("Готово", function () { setDone(x, false); }); };
      r.querySelector('[data-a="del"]').onclick = function () {
        if (x.server) {
          var back = { title: x.t, d: x.d, tm: x.tm, before: x.b, fire_ts: x.fireTs / 1000, rep: x.rep, task_row: x.task || 0, task_label: x.tl || "" };
          MPBC.call("/reminders/" + x.id + "/delete", { body: {} }).then(function () { return myLoad(); }).then(function () { paintMy(); X.badge(); toast("Напоминание удалено", function () { MPBC.call("/reminders", { body: back }).then(myLoad).then(function () { paintMy(); X.badge(); }); }); }).catch(function (e) { toast(E(e)); });
          return;
        }
        var ix = MY.indexOf(x); MY.splice(ix, 1); mySave(); paintMy(); toast("Напоминание удалено", function () { MY.splice(ix, 0, x); mySave(); paintMy(); });
      };
      var tl = r.querySelector('[data-a="task"]'); if (tl) tl.onclick = function () { go("#/task/" + x.task); };
      var lk = r.querySelector('[data-a="lnk"]'); if (lk) lk.onclick = function () { go(x.link); };
    });
  }

  /* при входе/выходе список перечитывается из нужного места */
  if (window.MPBC) {
    MPBC.on("login", function () { MY = null; myLoad().then(function () { X.badge(); paintMyIfOpen(); }); });
    MPBC.on("logout", function () { MY = null; myList(); X.badge(); paintMyIfOpen(); });
  }

  /* ================================================================
     «Ещё» на телефоне
     ================================================================ */
  X.more = function () {
    var ps = (window.MPBC && MPBC.me && (MPBC.me.position || (MPBC.me.role === "admin" ? "owner" : ""))) || "";
    var ALL = [["flow", "flow", "Конвейер", "#/flow"], ["tasks", "tasks", ps === "designer" ? "Мои проекты" : ps === "acc" ? "Закрытие" : "Задачи", "#/"], ["tz", "list", "Технические задания", "#/tz"],
      ["cal", "cal", "Занятость", "#/cal"], ["my", "bell", ps === "designer" ? "План на неделю" : "Мои задачи", "#/my"], ["clients", "users", ps === "design" ? "Кому звонить" : "База заказчиков", "#/clients"],
      ["kpreg", "list", "Реестр КП", "#/kpreg/"], ["kpc", "calc", "Конструктор КП", "#/kpc"], ["price", "list", "Прайс", "#/price"], ["contracts", "file", "Договоры", "#/contracts"],
      ["team", "team", "Внутренние", "#/team"], ["chat", "chat", "Мессенджеры", "#/chat"], ["mail", "mail", "Почта", "#/mail"], ["report", "list", "Недельный отчёт", "#/report"], ["stats", "lock", "Статистика", "#/stats"],
      ["stages", "layers", "Этапы и сроки", "#/stages"], ["onec", "wallet", "Оплаты из 1С", "#/onec"], ["auto", "zap", "Автоматизация", "#/auto"], ["log", "history", "Журнал", "#/log"], ["me", "user", "Кабинет", "#/me"]];
    var L = ALL.filter(function (x) { return window.dsAllowed ? window.dsAllowed(x[0]) : true; }).map(function (x) { return [x[3], x[1], x[2]]; });
    var v = document.createElement("div"); v.className = "x-veil on";
    v.innerHTML = '<div class="x-sheet"><h3>Все разделы</h3><div class="grid">' + L.map(function (x) { return '<button data-g="' + x[0] + '">' + ic(x[1]) + x[2] + "</button>"; }).join("") + "</div></div>";
    v.onclick = function (e) { if (e.target === v) v.remove(); };
    v.querySelectorAll("[data-g]").forEach(function (b) { b.onclick = function () { v.remove(); go(b.dataset.g); }; });
    document.body.appendChild(v);
  };

  /* ---------- маршрутизация ---------- */
  X.render = function (sec) {
    if (sec === "my") renderMy();
  };
  X.ready = true;
  if (cur() === "my") X.render("my");
  X.badge();
  tick();
  setInterval(function () { if (tick()) X.badge(); }, 20000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { tick(); X.badge(); } });
})();
