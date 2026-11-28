/* Проекты DS — экран «Задачи» и окно задачи. Данные — только с моста (/api/ds), уже отфильтрованные по роли:
   скрытые стадии сюда не приходят, поэтому интерфейс их не «прячет», а просто не получает. */
(function () {
  "use strict";
  var C = window.MPBC;
  var DS = window.DS = {};
  var S = { orders: null, meta: null, kb: "p", open: null, tab: "info", err: "", customers: null, people: null, history: null, tasks: null, form: null, busy: false, mount: null, ov: { type: "p", tile: "", stage: "", q: "" }, ld: "week", edit: null, cu: { sel: null, draft: null, err: "" }, wk: null, kp: null, kpf: null, ct: null, rp: null, st: null, price: null, pd: null, pdErr: "", comp: null, compErr: "", stg: null, stgD: null, stgErr: "", au: null, fl: null, flStep: null, flTab: "map", flOrder: 0, flHist: null, tzov: null, tz: null, tzNew: "" };

  var STAGE_COLOR = { "Ожидает аванс": "#b0883a", "Сбор данных": "#8794ab", "Готов к проектированию": "#2b8a9a", "В проектировании": "#3a86d6", "Проверка": "#8b6fe0", "На согласовании": "#e0a21c", "Корректировка": "#d9782f", "Сдано": "#1f9d63", "Пауза": "#9aa3b2", "Закрыто": "#6a768c" };
  /* Вкладка «Тех. задание» в карточке задачи спрятана у всех (решение владельца 15.11, вместе с разделом «Технические задания»).
     Данные ds_tz и сервер не тронуты; «Сбор данных → Готов» — кнопкой операционного менеджера. Вернуть — true. */
  var TZ_TAB = false;
  var STAGE_ORDER = ["Ожидает аванс", "Сбор данных", "Готов к проектированию", "В проектировании", "Проверка", "На согласовании", "Корректировка", "Сдано", "Пауза", "Закрыто"];
  /* «Пауза» по заказчику (шаг 11, план 10): ставят и снимают owner, ops, design кнопками (POST /orders/{id}/pause, /resume) — обычным переводом нельзя.
     На паузе срок не горит: вместо «Просрочено» — «⏸ на паузе N р.д.»; прежняя стадия — pause_from. */
  var PAUSE = "Пауза", PAUSE_FROM = ["Сбор данных", "Готов к проектированию", "В проектировании", "Проверка", "На согласовании", "Корректировка", "Сдано"];
  function paused(o) { return !!o && o.stage === PAUSE; }
  function pauseLate(o) { return !paused(o) && o.left_days != null && o.left_days < 0; }       // просрочено, если не на паузе
  function pauseText(o) { return "⏸ на паузе " + (o.pause_days || 0) + " р.д."; }
  var ROLE_NAME = { owner: "Руководитель", design: "Руководитель проектного отдела", sales: "Руководитель отдела продаж", ops: "Операционный менеджер", acc: "Бухгалтер", designer: "Проектировщик", norm: "Нормативный специалист" };
  var ROLE_NOTE = {
    owner: "Вы видите всё, включая закрытый кабинет «Статистика».",
    design: "Вы видите проекты на стадиях «Готов к проектированию», «В проектировании», «Проверка» и «Корректировка». Звонки заказчикам делаете вы.",
    sales: "Проектные, операционные и продажи, заказчики, договоры, реестр КП и переписка.",
    ops: "Проектные, операционные и продажи, заказчики, договоры, реестр КП и переписка.",
    acc: "Закрытие проектов: акт, счёт, оплата и галочка «Закрыто».",
    designer: "Только ваши проекты. Договорных сумм, контактов заказчиков и чужих проектов здесь нет.",
    norm: "Поставленные вам задачи (например, «Разработка пожарного риска») и диалоги ваших заказчиков. Финансов здесь нет."
  };
  var COL = { Ольга: "linear-gradient(135deg,#f5ab86,#e07a46)", Кристина: "linear-gradient(135deg,#bd96ee,#8a5fd0)", Иван: "linear-gradient(135deg,#46c28a,#238a58)", Мария: "linear-gradient(135deg,#5aa2ee,#2f6fbd)", Пётр: "linear-gradient(135deg,#4fc3c3,#1f9a9a)", Елена: "linear-gradient(135deg,#e58bb0,#c2527f)" };

  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plural(n, f) { n = Math.abs(n); var a = n % 10, b = n % 100; return n + " " + (a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]); }
  function leftText(l) { if (l == null) return "Без срока"; if (l < 0) return "Просрочено " + plural(l, ["день", "дня", "дней"]); if (l === 0) return "Срок сегодня"; return "Осталось " + plural(l, ["день", "дня", "дней"]); }
  function tone(o) { var l = o.left_days; return l == null ? "muted" : l < 0 ? "bad" : l <= 3 ? "warn" : "info"; }
  function dmy(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1] : "—"; }
  function money(n) { return Number(n || 0).toLocaleString("ru-RU") + " ₽"; }
  var PCOLORS = { "Ольга": "#e07a46", "Оля": "#e07a46", "Кристина": "#8a5fd0", "Иван": "#238a58", "Мария": "#2f6fbd", "Пётр": "#1f9a9a", "Елена": "#c2527f", "Дмитрий": "#b8892a" };
  var PALETTE = ["#2f6fbd", "#238a58", "#8a5fd0", "#1f9a9a", "#c2527f", "#b8892a", "#5a6fd0", "#4c8f2f"];
  function personColor(n) {
    n = n || "?";
    if (PCOLORS[n]) return PCOLORS[n];
    var h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  function ava(n, c) { n = n || "?"; var col = COL[n] || ("linear-gradient(135deg," + personColor(n) + "," + personColor(n) + ")"); return '<span class="ava ' + (c || "") + '" style="background:' + col + '">' + E(n[0]) + "</span>"; }
  function pos() { return (C && C.me && (C.me.position || (C.me.role === "admin" ? "owner" : ""))) || ""; }
  /* должность в проектах: нормативный специалист с признаком «Исполнитель» работает со своими проектами как проектировщик */
  function projPos() { var p = pos(); return p === "norm" && C.me.executor ? "designer" : p; }
  function api(path, body) { return C.call("/../ds" + path, body ? { body: body } : {}); }
  DS.commerceApi = api;
  DS.tzRegistryApi = api;
  DS.commerceOpen = function (row) {
    if (row.order_id) { location.hash = "#/task/" + row.order_id; return; }
    loadKp().then(function () {
      var k = (S.kp || []).find(function (item) { return item.id === row.id; });
      if (k) openKpCard(k);
      else toast("КП не найдено");
    });
  };
  DS.reportKp = function (id) {
    return loadKp().then(function () {
      var kp = (S.kp || []).find(function (item) { return item.id === id; });
      if (!kp) throw new Error("КП не найдено");
      return {kp: kp, systems: KP_SYS};
    });
  };
  DS.commerceCall = function (contact, row) {
    if (!contact || !contact.phone || !window.DSCalls || !DSCalls.enabled) {
      toast("Телефония недоступна");
      return;
    }
    DSCalls.dial(contact.phone, contact.name || row.customer, row.order_id, row.customer_id);
  };
  /* оплата задачи: аванс на всю сумму — оплачено; часть — «Аванс получен»; аванс предусмотрен, но не пришёл — «Ждём аванс» */
  function prepaid(o) { return !!o.adv_paid && +o.amount > 0 && +o.adv_sum >= +o.amount; }
  function payPill(o) {
    if (o.post_paid || prepaid(o)) return '<span class="pill ok">₽ Оплачено</span>';
    if (o.adv_paid) return '<span class="pill info" title="Остаток по акту: ' + E(String(Math.max(0, (+o.amount || 0) - (+o.adv_sum || 0)))) + ' ₽">₽ Аванс получен</span>';
    return '<span class="pill warn">₽ ' + (o.adv_mode === "advance" ? "Ждём аванс" : "Не оплачено") + "</span>";
  }
  function toast(m) {           /* своя плашка вместо alert(): в приложении на телефоне и во встроенных браузерах alert() часто не показывается */
    if (window.toast) return window.toast(m);
    var t = document.getElementById("xToast"); if (!t) { t = document.createElement("div"); t.id = "xToast"; t.className = "x-toast"; document.body.appendChild(t); }
    t.innerHTML = "<span>" + E(m) + "</span>"; t.className = "x-toast on"; clearTimeout(toast.h); toast.h = setTimeout(function () { t.className = "x-toast"; }, 4000);
  }
  function can(k) { return S.meta && S.meta.can && S.meta.can[k]; }
  /* телефония Sipuni (calls.js): кнопка 📞 у номера и журнал звонков в карточке */
  function callBtn(ph, oid, cid) { return window.DSCalls ? DSCalls.btn(ph, oid, cid) : ""; }
  function callsPanel(kind, id) { return window.DSCalls ? DSCalls.panel(kind, id) : ""; }
  function callBar(contacts, oid, cid) { var b = window.DSCalls && DSCalls.bar ? DSCalls.bar(contacts, oid, cid) : ""; return b ? '<div class="callrow">' + b + "</div>" : ""; }
  function taskCallHtml(o) { var cu = customerOf(o); return o.customer_id && cu && projPos() !== "designer" ? callBar(cu.contacts, o.id, o.customer_id) : ""; }
  function find(id) { return (S.orders || []).filter(function (o) { return o.id === id; })[0]; }
  var ICON = { plus: '<path d="M12 5v14M5 12h14"/>', down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>' };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24">' + (ICON[n] || "") + "</svg>"; }

  /* ---------- загрузка ---------- */
  var CUST_POS = ["owner", "sales", "ops", "design", "acc"], PEOPLE_POS = ["owner", "design", "ops", "sales"], KP_POS = ["owner", "sales", "ops"], ONEC_POS = ["owner", "acc", "sales"];      // ONEC_POS — как onec.ROLES в мосте
  function lastPos() { try { return localStorage.getItem("ds_pos") || ""; } catch (e) { return ""; } }
  /* Задачи, настройки роли, заказчики и сотрудники — одним залпом (раньше заказчики и сотрудники ждали настроек роли).
     Роль берётся из входа или запомненная с прошлого раза; если она неизвестна или сменилась — догружаем после настроек. */
  function load() {
    if (BOOT && BOOT.load) return BOOT.load;
    S.err = "";
    var p0 = pos() || lastPos(), extra = [];
    // не загрузилось (сессия истекла, нет сети) — остаётся null, при следующей загрузке запросим снова, а не будем показывать пустой список
    function cust() { return S.customers == null ? api("/customers").then(function (c) { S.customers = c; }, function () { S.customers = null; }) : null; }
    function people() { return S.people == null ? api("/people").then(function (x) { S.people = x; }, function () { S.people = null; }) : null; }
    if (CUST_POS.indexOf(p0) >= 0) extra.push(cust());
    if (PEOPLE_POS.indexOf(p0) >= 0) extra.push(people());
    return Promise.all([api("/meta"), api("/orders"), api("/tasks")].concat(extra)).then(function (r) {
      S.meta = r[0]; S.orders = r[1]; S.tasks = r[2]; S.loadedAt = Date.now();
      var p = r[0].position;
      try { localStorage.setItem("ds_pos", p || ""); } catch (e) {}
      if (p === p0) return null;
      return Promise.all([r[0].can.customers ? cust() : null, PEOPLE_POS.indexOf(p) >= 0 ? people() : null]);
    });
  }
  function loadComments() {
    if (BOOT && BOOT.cm) return BOOT.cm;
    return api("/comments").then(function (c) { S.cm = c; }, function () { S.cm = S.cm || {}; });
  }
  /* Сессия уже есть: данные первого экрана запрашиваются сразу, не дожидаясь ответа «кто вошёл» (crm.js).
     Экран потом подхватывает уже идущие запросы, а не шлёт их заново; после первой отрисовки BOOT больше не нужен. */
  var BOOT = null;
  function bootShare(name, p) {
    BOOT[name] = p.then(null, function (e) { if (BOOT) BOOT[name] = null; throw e; });       // ошибка (например, сессия истекла) — повторим обычным порядком
    BOOT[name].catch(function () {});
  }
  function bootStart() {
    var sess = ""; try { sess = localStorage.getItem("ds_session") || ""; } catch (e) {}
    var p = lastPos(), home = !location.hash || /^#\/?($|task\/|t\/|dash)/.test(location.hash);
    if (!sess || !p || !C || !C.configured || !C.configured()) return;
    BOOT = {};
    bootShare("load", load());
    if (home && KP_POS.indexOf(p) >= 0) bootShare("kp", api("/kp").then(function (k) { S.kp = k; }, function () {}));      // тихо: роль могли сменить, ошибку не показываем
    if (home) bootShare("cm", loadComments());
  }
  /* Приложение с иконки на телефоне не перезапускается днями: при возвращении в него подтягиваем свежие задачи
     (иначе этапы на экране устаревают и сервер отклоняет переход), а если на сайте новая версия — перезагружаем страницу. */
  /* Новая версия сайта: проверка раз в 3 минуты (и при возвращении в CRM), чтобы весь день открытая вкладка не работала со старым кодом.
     Ничего не набирается — страница обновляется сама; есть набранный текст или открыта форма — плашка «Обновить», текст не теряется. */
  var VER = (function () { var s = document.querySelector('script[src*="ds.js?v="]'); return s ? s.getAttribute("src").split("?v=")[1] : ""; })(), verAt = 0, newVer = "";
  function typing() {
    var a = document.activeElement, tIn = document.getElementById("tIn"), cIn = document.getElementById("chatText");
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && String(a.value || "").trim()) return true;
    return editing() || !!(tIn && tIn.value.trim()) || !!(cIn && cIn.value.trim()) || !!document.querySelector(".x-pend");
  }
  function applyUpdate() {
    if (!newVer) return;
    if (!typing()) { location.reload(); return; }
    if (document.getElementById("dsUpd")) return;
    var d = document.createElement("div"); d.id = "dsUpd"; d.className = "ds-upd";
    d.innerHTML = "<span>Вышла новая версия CRM</span><button type=\"button\">Обновить</button>";
    d.querySelector("button").onclick = function () { location.reload(); };
    document.body.appendChild(d);
  }
  function checkVersion() {
    if (!VER) return;
    if (newVer) return applyUpdate();
    if (Date.now() - verAt < 60000) return;
    verAt = Date.now();
    fetch("index.html?_=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (h) {
      var m = /ds\.js\?v=([\w.-]+)/.exec(h || "");
      if (m && m[1] !== VER) { newVer = m[1]; applyUpdate(); }
    }, function () {});
  }
  setInterval(function () { if (!document.hidden) checkVersion(); }, 3 * 60000);
  function editing() { return !!(S.form || S.tm || S.nt || S.te || S.ke || S.edit || S.busy); }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || !C || !C.loggedIn()) return;
    checkVersion();
    if (S.mount && S.orders && Date.now() - (S.loadedAt || 0) > 60000 && !editing()) load().then(paint, function () {});
  });
  function root() { return document.getElementById("tasks-app"); }
  function modalRoot() {
    var m = document.getElementById("ds-modal");
    if (!m) { m = document.createElement("div"); m.id = "ds-modal"; m.className = "ds"; document.body.appendChild(m); }
    return m;
  }
  var __modalHtml = null;                    // фикс двойного открытия (план 17.11): идентичную разметку не переписываем — карточка не моргает, ввод и прокрутка не теряются
  function setModal(html) { var m = modalRoot(); if (html === __modalHtml) return; __modalHtml = html; m.innerHTML = html; }

  var TITLES = { risk: "Просрочено и зависло", tasks: "Задачи", scripts: "Скрипты", onec: "Оплаты из 1С", load: "Занятость", cust: "База заказчиков", week: "План на неделю", kp: "Таблица РОП старая", orders: "Заказы", kpc: "Конструктор КП", contract: "Конструктор договора", report: "Пятничный созвон", stats: "Статистика", price: "Прайс", stages: "Этапы и сроки", auto: "Автоматизация", flow: "Конвейер заказа", tz: "Технические задания" };
  function mount(kind, el) {
    if (!el) return;
    S.mount = { kind: kind, el: el };
    var m = /^#\/task\/(\d+)/.exec(location.hash);
    if (m) S.open = +m[1];
    var mt = /^#\/t\/(\d+)/.exec(location.hash);           // оповещение о задаче: окно задачи (папка на сервере, потом задача в CRM)
    if (mt) { S.topen = +mt[1]; S.open = null; }
    if (!C || !C.loggedIn()) {
      if (BOOT) { el.innerHTML = '<div class="ds dspage"><div class="loading">Загружаю…</div></div>'; return; }      // сессия есть, вход ещё проверяется — данные уже идут
      el.innerHTML ='<div class="ds dspage"><div class="head"><div><h1>' + TITLES[kind] + '</h1><p>Войдите, чтобы увидеть данные вашей роли</p></div><button class="btn primary" id="dsLogin">Войти по PIN</button></div></div>';
      var b = document.getElementById("dsLogin"); if (b) b.onclick = function () { C.requireLogin().then(function () { mount(kind, el); }); };
      setModal("");
      return;
    }
    var key = kind + "|" + (el.id || "");
    if (S.mounting === key) return;                // этот экран уже загружается (при запуске его открывают подряд несколько раз) — без второй загрузки
    S.mounting = key;
    if (S.orders == null) { el.innerHTML = '<div class="ds dspage"><div class="loading">Загружаю…</div></div>'; }
    // всё, что нужно экрану, — одновременно (раньше цепочкой: задачи → КП → комментарии…); черновик договора ждёт только список КП
    var jobs = [S.orders == null ? load() : null], add = function (f) { jobs.push(f()); };
    if (kind === "tasks" && KP_POS.indexOf(pos()) >= 0) add(loadKp);
    if (kind === "tasks") add(loadComments);
    if (kind === "week" && pos() !== "norm") add(loadWeek);
    if (kind === "scripts") add(loadScripts);
    if (kind === "risk") add(loadRisk);
    if (kind === "load") add(function () { return api("/load/history").then(function (r) { S.lh = r; }, function () { S.lh = []; }); });      // кто что делал раньше
    if (kind === "load" && pos() === "designer") add(function () { return api("/load").then(function (r) { S.lo = r; }, function () { S.lo = []; }); });
    if (kind === "kp" || kind === "kpc") add(loadKp);
    if (kind === "contract") add(function () { return loadKp().then(loadContractDraft); });
    if (kind === "price" || kind === "kpc" || kind === "contract") add(loadPrice);
    if (kind === "price") add(loadCompany);
    if (kind === "stages") add(loadStages);
    if (kind === "flow") add(loadFlow);
    if (kind === "tz") add(loadTz);
    if (kind === "auto") add(loadAuto);
    if (kind === "onec") add(loadOnec);
    if (kind === "report") add(loadReport);
    if (kind === "stats") add(loadStats);
    var need = Promise.all(jobs);
    var done = function () { BOOT = null; if (S.mounting === key) S.mounting = ""; };
    need.then(function () { return S.open ? api("/orders/" + S.open + "/history").then(function (h2) { S.history = h2; }, function () { S.history = []; }) : null; })
      .then(paint, function (e) { S.err = String(e); paint(); }).then(done, done);
  }
  DS.route = function () {
    if (!/^#\/t(ask)?\//.test(location.hash)) S.cvRoute = /^#\/conv/.test(location.hash);      // «Работа → Конвейер» у проектировщика и бухгалтера — #/conv (у них #/ — «Мои проекты» / «Закрытие»)
    mount("tasks", root());
  };
  DS.mount = mount;
  DS.reload = function () { S.orders = null; S.history = null; S.mounting = ""; if (S.mount) mount(S.mount.kind, S.mount.el); };
  /* ---------- экран «Задачи» ---------- */
  function needPhone(o) {
    if (!o.customer_id || !(S.customers || []).length) return false;
    var cu = (S.customers || []).filter(function (c) { return c.id === o.customer_id; })[0];
    return !!cu && !(cu.contacts || []).some(function (x) { return x.phone && String(x.phone).trim(); });
  }
  /* ---------- проектируемые системы: справочник (из /meta), плашки, мультивыбор ---------- */
  var SYS_FALLBACK = ["СПС", "СОУЭ", "АУП", "ВПВ", "АПТ", "ДУ", "ФЭС", "АО", "ОГЗ", "СКУД", "СВН", "СКС", "ПЭ", "РР", "Декларация", "ИД", "Спецификация"];
  function sysCat() { return (S.meta && S.meta.systems && S.meta.systems.items) || SYS_FALLBACK.map(function (c) { return { code: c, name: c }; }); }
  function sysName(c) { var x = sysCat().filter(function (s) { return s.code === c; })[0]; return x ? x.name : c; }
  function sysSec(c) { return c === "СПС" || c === "СОУЭ" ? "СПС.СОУЭ" : c; }
  /* плашки систем: каждая отдельно; система другого раздела (ВПВ, АУП рядом с СПС/СОУЭ) — фиолетовая, с исполнителем раздела */
  function sysChips(o, sm) {
    var codes = (o && o.systems) || [], main = codes.length ? sysSec(codes[0]) : "", out = codes.map(function (c) {
      var part = ((o.parts || []).filter(function (p) { return p.system === c; })[0]), other = sysSec(c) !== main;
      var who = part ? (part.delivered ? "сдан" : part.executor || "не назначен") : "";
      return '<span class="sysch' + (other ? " oth" : "") + '" title="' + E(sysName(c) + (part ? " · отдельный раздел: " + who + (part.plan_end ? ", срок " + dmy(part.plan_end) : "") : other ? " · другой раздел" : "")) + '">'
        + E(c) + (part ? "<small>" + E(who) + "</small>" : "") + "</span>";
    });
    if (o && o.systems_other) out.push('<span class="sysch o" title="Нет в справочнике">' + E(o.systems_other) + "</span>");
    if (o && o.modern) out.push('<span class="sysch m">модернизация</span>');
    if (!out.length && o && o.system) out.push('<span class="sysch o">' + E(o.system) + "</span>");      // мост ещё без списка систем
    return out.length ? '<div class="syschips' + (sm ? " sm" : "") + '">' + out.join("") + "</div>" : "";
  }
  function sysLabel(st) { return ((st.systems || []).join(".") + (st.systems_other ? " " + st.systems_other : "") + (st.modern ? " модернизация" : "")).trim(); }      // строка для старого моста
  function sysText(o) { return o ? ((o.systems || []).join(".") + (o.systems_other ? " " + o.systems_other : "") + (o.modern ? " модернизация" : "")).trim() || o.system || "" : ""; }
  /* мультивыбор: кнопки справочника + «прочее» + метка «модернизация»; who — "form" (новая задача) или "oe" (меню задачи) */
  function sysPick(st, who) {
    var sel = st.systems || [];
    return '<div class="fld"><label>Проектируемые системы <small style="color:var(--muted);font-weight:500">— отметьте все, что есть в задаче</small></label><div class="syspick">'
      + sysCat().map(function (s) { return '<button type="button" class="' + (sel.indexOf(s.code) >= 0 ? "on" : "") + '" data-syspk="' + who + ":" + E(s.code) + '" title="' + E(s.name) + '">' + E(s.code) + "</button>"; }).join("")
      + '</div><div class="sysrow"><input type="text" data-sysoth="' + who + '" value="' + E(st.systems_other || "") + '" placeholder="Прочее — чего нет в списке" ' + (who === "oe" ? OE_FIELD : "") + ">"
      + '<label style="display:flex;gap:6px;align-items:center;white-space:nowrap"><input type="checkbox" data-sysmod="' + who + '"' + (st.modern ? " checked" : "") + "> модернизация</label></div>"
      + (sel.filter(function (c) { return sysSec(c) !== sysSec(sel[0]); }).length ? '<div class="note" style="margin:8px 0 0">Системы другого раздела станут отдельными подзадачами со своим исполнителем и сроком — вкладка «Разделы и корректировки».</div>' : "")
      + "</div>";
  }
  function sysTarget(who) { return who === "oe" ? S.oe : S.form; }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-syspk]") : null; if (!t) return;
    var a = t.dataset.syspk.split(":"), st = sysTarget(a[0]); if (!st) return;
    var cur = (st.systems || []).slice(), i = cur.indexOf(a[1]);
    if (i >= 0) cur.splice(i, 1); else cur.push(a[1]);
    var order = sysCat().map(function (s) { return s.code; });
    st.systems = cur.sort(function (x, y) { return order.indexOf(x) - order.indexOf(y); });
    if (a[0] === "oe") tmRepaint(); else paint();
  });
  document.addEventListener("input", function (e) {
    var w = e.target.dataset && (e.target.dataset.sysoth || e.target.dataset.sysmod); if (!w) return;
    var st = sysTarget(w); if (!st) return;
    if (e.target.dataset.sysoth) st.systems_other = e.target.value; else st.modern = e.target.checked ? 1 : 0;
  });
  document.addEventListener("change", function (e) {
    var w = e.target.dataset && e.target.dataset.sysmod; if (!w) return;
    var st = sysTarget(w); if (st) st.modern = e.target.checked ? 1 : 0;
  });

  /* кнопка «Начать работу» у исполнителя: план уже начался, а «Начато» не отмечено (подтверждение старта, 25.11) */
  function startPill(o, cls) {
    var today = isoDay(new Date());
    if (!(C && C.me && o.executor_id === C.me.id && o.stage === "В проектировании" && o.plan_start && o.plan_start <= today && !o.started_man)) return "";
    return '<span class="' + (cls || "pill go") + '" data-ostart="' + o.id + '" title="План начался ' + E(dmy(o.plan_start).slice(0, 5)) + ', а «Начато» не отмечено — нажмите, когда приступите к работе">▶ Начать работу</span>';
  }
  function card(o, withStage) {
    var stage = o.stage, money_ = can("money") && o.amount != null, pz = paused(o), late = pauseLate(o);
    return '<button class="task ' + (o.urgent ? "urgent" : "") + '" data-open="' + o.id + '"' + (taskCtl() ? ' draggable="true" data-dragid="' + o.id + '"' : "") + '><span class="stripe" style="--c:' + (o.urgent || late ? "var(--bad)" : (STAGE_COLOR[stage] || "var(--brand)")) + '"></span><span class="body">'
      + '<span class="r1"><span class="num">№' + E(o.number) + "</span><span>" + E(o.customer || "") + '</span><span class="fl">' + (o.urgent ? '<span class="pill urg">⚡ Срочно</span>' : "") + "</span></span>"
      + '<span class="ttl" style="display:block">' + E(o.object) + "</span>"
      + sysChips(o, true)
      + '<span class="con ' + (late ? "bad" : "") + '" style="display:block">Договор до ' + dmy(o.due_date) + "</span>"
      + '<span class="meta">' + (o.executor ? ava(o.executor, "sm") + '<span style="font-size:.84rem;margin-right:auto">' + E(o.executor) + "</span>" : '<span class="pill muted" style="margin-right:auto">не назначен</span>')
      + (needPhone(o) ? '<span class="pill bad" title="В карточке заказчика не указан сотовый телефон">Нет телефона</span>' : "")
      + (withStage ? '<span class="pill muted"><i class="dot" style="background:' + (STAGE_COLOR[stage] || "#999") + '"></i>' + E(stage) + "</span>" : "")
      + startPill(o)
      + (money_ ? payPill(o) : "")
      + (pz ? '<span class="pill muted" title="' + E("до " + dmy(o.pause_until) + " · " + (o.pause_reason || "")) + '">' + E(pauseText(o)) + "</span>" : '<span class="pill ' + tone(o) + '">' + E(leftText(o.left_days)) + "</span>") + "</span></span></button>";
  }
  /* ---------- операционные задачи и продажи: сроки, ответственные, состояния ---------- */
  function taskTone(t) { return t.left_days == null ? "muted" : t.left_days < 0 ? "bad" : t.left_days <= 2 ? "warn" : "info"; }
  function ackMine(t) { return !!(t.ack_wait && C && C.me && t.assignee_id === C.me.id); }      // личная задача ждёт, что я подтвержу получение
  function ackWhen(t) { return new Date(t.ack_at * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  function taskCard(t) {
    var tn = taskTone(t), kindName = t.kind === "acc" ? "Бухгалтерия" : t.kind === "ops" ? "Операционная" : t.kind === "chat" ? "Переписка" : t.kind === "design" ? "Проектный отдел" : t.kind === "norm" ? "Нормативный специалист" : "Продажи";
    var btns = [];
    if (t.step === "a1" || t.step === "a2") {
      btns.push('<button class="btn ghost sm" data-lead="' + t.id + ':skip" title="Закрыть: по этому обращению задача не нужна">Задача не требуется</button>');
      btns.push('<button class="btn primary sm" data-lead="' + t.id + ':next">Передать дальше → ' + (t.step === "a1" ? "Сбор вводных" : "КП") + "</button>");
    }
    if (t.visit_id) btns.push('<a class="btn primary sm" style="text-decoration:none" href="#/visits?v=' + t.visit_id + '">📍 Открыть выезд</a>');
    if (t.thread_id) btns.push('<button class="btn primary sm" data-chatopen="' + E(t.thread_id) + '">Открыть диалог</button>');
    if (t.order_id && t.order_number && !t.visit_id) btns.push('<a class="btn ' + (find(t.order_id) ? "ghost" : "primary") + ' sm" style="text-decoration:none" href="' + folderUrl({ number: t.order_number, object: t.object }, false) + '" title="Папка задачи на сервере">📂 Папка на сервере</a>');
    if (t.order_id && t.kind === "design" && !t.visit_id && find(t.order_id)) btns.push('<button class="btn primary sm" data-open="' + t.order_id + '">Открыть задачу</button>');
    if (ackMine(t)) btns.unshift('<button class="btn primary sm" data-tack="' + t.id + '">✓ Подтвердить получение</button>');
    if (t.state !== "work") btns.push('<button class="btn ghost sm" data-tstate="' + t.id + ':work">В работу</button>');
    if (t.state !== "wait") btns.push('<button class="btn ghost sm" data-tstate="' + t.id + ':wait">Ждём ответа</button>');
    btns.push('<button class="btn ok sm" data-tstate="' + t.id + ':done">Выполнено</button>');
    if (t.can_reply) btns.push('<button class="btn ghost sm" data-trep="' + t.id + '" title="' + (t.src_room ? "Ответ уйдёт в чат, откуда задача" : "Ответ уйдёт личным сообщением: " + E(t.author || "")) + '">💬 Написать ответ</button>');
    if (taskCtl() || taskMine(t)) btns.push('<button class="btn ghost sm" data-tedit="' + t.id + '" title="Править задачу: название, срок, комментарий">✎</button>');
    if (taskCtl() || taskAuthor(t)) btns.push('<button class="btn ghost sm" data-tdel="' + t.id + '" title="Удалить задачу" style="color:var(--bad)">🗑</button>');
    var proj = t.order_id && !!find(t.order_id);      /* карточка проекта открывается, только если она вам видна (иначе — папка на сервере) */
    var openAttr = proj ? ' data-open="' + t.order_id + '" title="Открыть карточку задачи"' : (t.thread_id ? ' data-chatopen="' + E(t.thread_id) + '" title="Открыть диалог"' : "");
    return '<div class="task"' + openAttr + '><span class="stripe" style="--c:' + (tn === "bad" ? "var(--bad)" : tn === "warn" ? "var(--accent)" : "var(--org)") + '"></span><span class="body">'
      + '<span class="r1">' + (proj ? '<button class="num" style="color:var(--org);font-size:1.1rem" data-open="' + t.order_id + '">№' + E(t.order_number) + "</button>" : t.order_id ? '<span class="num" style="color:var(--org);font-size:1.1rem">№' + E(t.order_number) + "</span>" : '<span class="num" style="color:var(--org);font-size:1.1rem">' + E(kindName) + "</span>")
      + "<span>" + E(t.assignee || "") + "</span></span>"
      + '<span class="ttl" style="display:block">' + E(t.title.replace(/:\s*№.*$/, "")) + "</span>"
      + (t.object ? '<span class="con" style="display:block">' + E(t.object) + "</span>" : "")
      + (t.note ? '<span class="con" style="display:block;color:var(--muted)">' + E(t.note) + "</span>" : "")
      + (t.author ? '<span class="con" style="display:block;font-size:.78rem;color:var(--muted)">Поставил(а): ' + E(t.author) + "</span>" : "")
      + (t.need_ack ? '<span class="con" style="display:block;font-size:.78rem;color:' + (t.ack_wait ? "var(--warn)" : "var(--muted)") + '">' + (t.ack_wait ? "Получение не подтверждено" : "Получено " + E(ackWhen(t))) + "</span>" : "")
      + '<span class="meta" style="margin-bottom:8px"><span class="pill ' + tn + '">' + (t.due ? "до " + dmy(t.due).slice(0, 5) + " · " : "") + E(leftText(t.left_days)) + "</span></span>"
      + '<span class="meta" style="gap:6px">' + btns.join("") + "</span>" + replyBox(t) + "</span></div>";
  }
  function kpNo(n) { return "КП №" + String(n == null ? "" : n).replace(/^К-/, ""); }
  function kpTone(k) { return k.last_days == null ? "muted" : k.last_days > 5 ? "bad" : k.last_days >= 3 ? "warn" : "info"; }
  function kpCard(k) {
    var tn = kpTone(k);
    return '<a class="task" href="#/kpreg/" style="text-decoration:none;color:inherit"><span class="stripe" style="--c:' + (tn === "bad" ? "var(--bad)" : "var(--org)") + '"></span><span class="body">'
      + '<span class="r1"><span class="num" style="color:var(--org);font-size:1.1rem">' + E(kpNo(k.number)) + "</span><span>" + E(k.customer) + '</span><span class="fl"><b>' + money(k.amount) + "</b></span></span>"
      + '<span class="ttl" style="display:block">' + E(k.object || "—") + "</span>"
      + '<span class="meta"><span class="pill ' + tn + '">' + (k.last_days == null ? "нет общения" : k.last_days === 0 ? "общались сегодня" : "без общения " + plural(k.last_days, ["день", "дня", "дней"])) + "</span>"
      + (k.issued_date ? '<span class="pill muted">выставлено ' + dmy(k.issued_date).slice(0, 5) + "</span>" : "") + (k.manager ? '<span class="pill muted">' + E(k.manager) + "</span>" : "") + "</span></span></a>";
  }
  /* ---------- экран «Задачи» — вынесен в web/ds_tasks.js (24.11); здесь — точки входа ---------- */
  function screen() { return window.DSTasks.screen.apply(null, arguments); }
  function olCss() { return window.DSTasks.olCss(); }
  function olDrawer() { return window.DSTasks.olDrawer.apply(null, arguments); }
  function replyBox(t) { return window.DSTasks.replyBox(t); }
  function cityNames() { return window.DSTasks.cityNames(); }
  function cityZone(s) { return window.DSTasks.cityZone(s); }
  function tzLabel(z) { return window.DSTasks.tzLabel(z); }
  /* ---------- шрифт реестра КП ---------- */
  function kpFont() { var z = S.kpz; if (!z) { try { z = +localStorage.getItem("ds_kpz") || 0; } catch (e) { z = 0; } } return Math.max(10, Math.min(17, z || 13)); }
  /* ---------- правка КП в реестре ---------- */
  function keHtml() {
    var e = S.ke, cs = S.customers || [], mg = S.assignable || [], locked = !!e.order_id;
    var inp = function (label, k, type, extra) { return '<div class="fld"><label>' + label + '</label><input ' + (type ? 'type="' + type + '" ' : "") + 'data-ke="' + k + '" value="' + E(e[k] == null ? "" : e[k]) + '" ' + (extra || "") + "></div>"; };
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:12px"><div class="modal" style="width:min(560px,100%);height:auto;max-height:90vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.2rem">Правка ' + E(kpNo(e.number)) + '</h2>' + (locked ? '<div class="sub">КП привязано к проектной задаче: суммы и объект изменятся и в ней</div>' : "") + '</div><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
      + keOrderSel(e)
      + '<div class="fld"><label>Заказчик</label><select data-ke="customer_id"><option value="0">— без привязки —</option>' + cs.map(function (c) { return '<option value="' + c.id + '"' + (c.id === +e.customer_id ? " selected" : "") + ">" + E(c.name) + "</option>"; }).join("") + "</select></div>"
      + (+e.customer_id ? "" : inp("Для кого КП (текстом)", "customer_text"))
      + inp("Объект", "object")
      + ((e.services || []).length ? '<div class="fld"><label>Услуги</label><div class="kesvc">' + e.services.map(function (s) { return "<div>" + E(s.name) + "<span>" + money(s.price) + "</span></div>"; }).join("") + '</div><div class="note" style="margin-top:4px">Состав и цены — кнопка «Состав услуг…» внизу</div></div>' : "")
      + '<div class="fld"><label>Вид работ</label><div class="kesys">'
      + KP_SYS.map(function (s) {
          var on = (e.systems || []).indexOf(s) >= 0;
          return '<button type="button" class="kpsys' + (on ? " on" : "") + '" data-kesys="' + E(s) + '"' + (on ? ' style="background:' + KP_SYS_C[s] + ";border-color:" + KP_SYS_C[s] + '"' : "") + ">" + E(s) + "</button>";
        }).join("") + "</div></div>"
      + '<div class="fld"><label>Комментарий</label><textarea rows="2" data-ke="comment" placeholder="Что важно по этому КП: договорённости, сроки, условия">' + E(e.comment || "") + "</textarea></div>"
      + '<div class="g2f">' + inp("Сумма, ₽", "amount", "number", 'min="0"') + inp("Аванс, ₽", "adv_sum", "number", 'min="0"') + "</div>"
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 10px">' + [["0", "Без аванса"], ["0.3", "30%"], ["0.5", "50%"], ["1", "100% аванс"]].map(function (x) {
          var on = Math.round((+e.amount || 0) * +x[0]) === (+e.adv_sum || 0) && (+e.amount || 0) > 0;
          return '<button type="button" class="btn sm ' + (on ? "primary" : "ghost") + '" data-keadv="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>"
      + '<div class="note" id="keRest" style="margin:-4px 0 10px">' + keRest(e) + "</div>"
      + '<div class="g2f">' + inp("Дата обращения", "lead_date", "date") + '<div class="fld"><label>Менеджер</label><select data-ke="manager_id"><option value="0">—</option>' + mg.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +e.manager_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div></div>"
      + '<div class="g2f"><div class="fld"><label>Статус</label><select data-ke="status">' + (locked ? KP_ORDER_MANUAL.indexOf(e.status0) < 0 ? [e.status0].concat(KP_ORDER_MANUAL) : KP_ORDER_MANUAL : (KP_MANUAL.indexOf(e.status0) < 0 ? [e.status0] : []).concat(KP_MANUAL)).map(function (s) { return '<option value="' + E(s) + '"' + (s === e.status ? " selected" : "") + ">" + E(kpStatusLabel(s)) + "</option>"; }).join("") + "</select></div>"
      + inp("Дата этапа", "status_date", "date") + "</div>"
      + '<div class="note" style="margin:-4px 0 10px">' + (locked ? "По КП есть задача: этапы до «В постоплате» идут сами по задаче и оплатам из 1С. Дату этапа можно поправить" : "«В работе» создаст проектную задачу и чат (нужен заказчик); дата этапа станет датой оплаты аванса") + "</div>"
      + (e.status === "Отказ" ? '<div class="g2f">' + keSel("Причина отказа", "refuse_reason", KP_REFUSE) + keSel("Есть ли смысл вернуться", "refuse_back", KP_BACK) + "</div>" + inp("Что можно было сделать иначе", "refuse_note")
        : '<div class="g2f">' + keSel("Вероятность оплаты", "pay_prob", KP_PROB) + inp("Ожидаемая дата оплаты", "pay_expect", "date") + "</div>" + inp("Следующий контакт", "next_contact", "date"))
      + '<div class="fld"><label>Документы</label><div class="kedocs">' + kpDocs(e.k, true) + (!e.order_id && e.status0 !== "Отказ" ? '<button class="btn ghost sm" data-kpcontract="' + e.id + '">✍ Договор…</button>' : "") + "</div></div>"
      + (e.err ? '<div class="err">' + E(e.err) + "</div>" : "")
      + keSel("Вероятность продажи", "sale_prob", KP_PROB)
      + '<div class="g2f">' + keSel("Основание оплаты", "pay_basis_event", kpBasisOptions(e.status0)) + inp("Дата отсчёта", "pay_basis_date", "date") + "</div>"
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-kesave="1">Сохранить</button><button class="btn ghost" data-kectr="1" title="Изменить состав услуг и цены">Состав услуг…</button><button class="btn ghost" data-close="1">Отмена</button>'
      + (!e.order_id ? '<button class="btn ghost" data-kpdel="' + e.id + '" style="margin-left:auto;color:var(--bad)" title="Удалить КП из реестра">Удалить</button>' : "") + "</div></div></div></div>";
  }
  var KP_REFUSE = ["Дорого", "Условия оплаты", "Сроки", "Дешевле у конкурента", "Выбрали другого (не по цене)", "Отложили", "Пропал", "Пока прицениваются", "Не наш профиль", "Другое (в комментарии)"], KP_BACK = ["Да", "Нет"], KP_PROB = [["high", "высокая"], ["mid", "средняя"], ["low", "низкая"]];
  var KP_PAY_BASIS = ["Договор подписан", "Акт подписан", "Акт отправлен", "Акт подписан авто", "Счёт отправлен"];
  function kpBasisOptions(status) {
    return ["В работе", "В постоплате", "Закрыто"].includes(status) ? KP_PAY_BASIS.slice(1) : [KP_PAY_BASIS[0], KP_PAY_BASIS[4]];
  }
  var KP_SYS = ["СПС", "СОУЭ", "ВПВ", "АУП", "ОГЗ", "АО", "ИД"], KP_SYS_C = { "СПС": "#2a65a0", "СОУЭ": "#2f8f5b", "ВПВ": "#1fa0c8", "АУП": "#d99a1f", "ОГЗ": "#d9603b", "АО": "#c0568f", "ИД": "#7a5fc0" };
  function keSel(label, k, opts) {
    return '<div class="fld"><label>' + label + '</label><select data-ke="' + k + '"><option value="">—</option>' + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + E(v) + '"' + (v === S.ke[k] ? " selected" : "") + ">" + E(l) + "</option>"; }).join("") + "</select></div>";
  }
  /* привязка КП к уже существующей задаче: оплаты и стадия дальше идут из задачи и 1С */
  function keOrderSel(e) {
    var busy = {}; (S.kp || []).forEach(function (k) { if (k.order_id && k.id !== e.id) busy[k.order_id] = kpNo(k.number); });
    var os = (S.orders || []).filter(function (o) { return !busy[o.id] || o.id === +e.order_id; }).sort(function (a, b) { return (parseInt(b.number, 10) || 0) - (parseInt(a.number, 10) || 0); });
    return '<div class="fld"><label>Проектная задача</label><select data-ke="order_id"><option value="0">— не привязано к задаче —</option>'
      + os.map(function (o) { return '<option value="' + o.id + '"' + (o.id === +e.order_id ? " selected" : "") + ">№" + E(o.number) + " · " + E(o.customer || "") + " · " + E((o.object || "").slice(0, 60)) + "</option>"; }).join("") + "</select>"
      + (+e.order_id !== +e.order0 ? '<div class="note" style="margin-top:4px">' + (+e.order_id ? "Суммы, заказчик и объект взяты из задачи. Оплаты дальше отмечаются в задаче и из 1С" : "КП отвяжется от задачи и вернётся в «КП отправлено»") + "</div>" : "") + "</div>";
  }
  function keRest(e) { var adv = +e.adv_sum || 0; return adv > 0 ? "Остаток по акту: " + money(Math.max(0, (+e.amount || 0) - adv)) : "Без аванса — постоплата: вся сумма после сдачи"; }
  function kpToForm(k) {
    var pay = k.pay || "post100", m = /^adv(\d+)$/.exec(pay), std = pay === "adv50" || pay === "adv30" || pay === "adv100" || pay === "post100";
    S.kpf = { id: k.id, number: k.number, status: k.status, order_id: k.order_id, customer_id: k.customer_id || 0, customer_text: k.customer_text || "", object: k.object || "", pay: std ? pay : "custom", advpct: m ? +m[1] : 40, pay_text: k.pay_text || "", err: "",
      items: (k.services || []).map(function (s) { return { name: s.name, price: +s.price || 0, on: true, custom: true }; }) };
  }
  function keSave() {
    var e = S.ke;
    // открытый статус без даты следующего контакта — сначала окно с датой (по умолчанию +3 раб. дня); сервер без даты такой перевод не пропускает
    if (e.status !== e.status0 && ["Обращение", "КП отправлено", "Доки отправлены", "В предоплате"].indexOf(e.status) >= 0 && !e.next_contact && window.DSToday && DSToday.touch) {
      DSToday.touch({ id: e.id, number: e.number, customer: (e.k || {}).customer, amount: +e.amount || 0, status: e.status0 }, null,
        { status: e.status, save: function (nc) { e.next_contact = nc; keSave(); } });
      return;
    }
    var body = { customer_id: +e.customer_id || 0, customer_text: +e.customer_id ? "" : (e.customer_text || ""), object: e.object || "", amount: +e.amount || 0, adv_sum: +e.adv_sum || 0, comment: e.comment || "", lead_date: e.lead_date || "", status_date: e.status_date || "", manager_id: +e.manager_id || 0 };
    if (+e.order_id !== +e.order0) body.order_id = +e.order_id || 0;
    ["pay_prob", "pay_expect", "next_contact", "refuse_reason", "refuse_back", "refuse_note"].forEach(function (k) { body[k] = e[k] || ""; });
    if (Boolean(e.pay_basis_event) !== Boolean(e.pay_basis_date)) {
      e.err = "Укажите основание оплаты и дату отсчёта или очистите оба поля";
      setModal(keHtml());
      return;
    }
    body.sale_prob = e.sale_prob || "";
    if (e.pay_basis_event !== e.pay_basis_event0 || e.pay_basis_date !== e.pay_basis_date0) {
      body.pay_basis = e.pay_basis_event ? {event: e.pay_basis_event, date: e.pay_basis_date} : "";
    }
    body.systems = e.systems || [];                    // системы по КП — для пятничного созвона («шарики» в блоке «Запросы»)
    // этап, выбранный вручную, сохраняется и когда КП в этот же раз привязали к задаче (например, сразу «В постоплате»)
    api("/kp/" + e.id + "/edit", body).then(function () { return e.status !== e.status0 && (KP_ORDER_MANUAL.indexOf(e.status) >= 0 || (!+e.order_id && body.order_id == null)) ? api("/kp/" + e.id + "/status", { status: e.status, day: e.status_date || "" }) : null; })
      .then(function () {
        S.ke = null; S.orders = null; S.tasks = null;
        return Promise.all([loadKp(), load(), location.hash === "#/report" ? loadReport() : null]);
      })
      .then(function () {
        toast("КП сохранено");
        paint();
        var frame = document.querySelector("#commerce-registry-app iframe");
        if (frame && frame.contentWindow.refreshCommerceRegistry) frame.contentWindow.refreshCommerceRegistry();
      }, function (er) { e.err = String(er); setModal(keHtml()); });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-kpedit],[data-kpz],[data-kesave],[data-kectr],[data-kcopen],[data-kcsave],[data-kcclose],[data-kpcancel],[data-keadv],[data-kpstar],[data-kwp],[data-kwsave],[data-kwoff],[data-kwclose],[data-kesys],[data-knc],[data-kncd],[data-kncsave],[data-kncclose]") : null; if (!t) return;
    var d = t.dataset;
    if (d.knc != null && t.hasAttribute("data-knc")) {
      var kn = (S.kp || []).filter(function (x) { return x.id === +d.knc; })[0]; if (!kn) return;
      S.knc = { id: kn.id, date: kn.next_contact || "", err: "" }; setModal(kncHtml()); return;
    }
    if (d.kncd != null && S.knc) { S.knc.date = kncBD(+d.kncd); setModal(kncHtml()); return; }
    if (d.kncsave != null) return kncSave();
    if (d.kncclose != null) { S.knc = null; setModal(""); return; }
    if (d.kpstar) {
      var kw = (S.kp || []).filter(function (x) { return x.id === +d.kpstar; })[0]; if (!kw) return;
      S.kw = { id: kw.id, date: kw.pay_expect || "", prob: kw.pay_prob || "", note: kw.watch_note || "", err: "" }; setModal(kwHtml()); return;
    }
    if (d.kwp && S.kw) { S.kw.date = (document.getElementById("kwDate") || {}).value || ""; S.kw.note = (document.getElementById("kwNote") || {}).value || ""; S.kw.prob = S.kw.prob === d.kwp ? "" : d.kwp; setModal(kwHtml()); return; }
    if (d.kwsave != null && S.kw) return kwSave(false);
    if (d.kwoff != null && S.kw) return kwSave(true);
    if (d.kwclose != null) { S.kw = null; setModal(""); return; }
    if (d.keadv != null && S.ke) {                     // быстрый выбор аванса: без аванса, 30%, 50%, 100%
      var am = document.querySelector('[data-ke="amount"]'); if (am) S.ke.amount = +am.value || 0;
      S.ke.adv_sum = Math.round((+S.ke.amount || 0) * +d.keadv); setModal(keHtml()); return;
    }
    if (d.kesys != null && S.ke) {                     // системы по КП: переключаем и перерисовываем карточку
      var ksys = (S.ke.systems || []).slice(), kix = ksys.indexOf(d.kesys);
      if (kix < 0) ksys.push(d.kesys); else ksys.splice(kix, 1);
      S.ke.systems = ksys; setModal(keHtml()); return;
    }
    if (d.kpedit) {
      var k = (S.kp || []).find(function (x) { return x.id === +d.kpedit; });
      if (k) openKpCard(k);
      return;
    }
    if (d.kpz != null && t.hasAttribute("data-kpz")) { var z = kpFont(); z = d.kpz === "0" ? 13 : Math.max(10, Math.min(17, z + (+d.kpz))); S.kpz = z; try { localStorage.setItem("ds_kpz", String(z)); } catch (er) {} return paint(); }
    if (d.kesave) return keSave();
    if (d.kectr) { var kk = (S.kp || []).filter(function (x) { return x.id === S.ke.id; })[0]; if (kk) { kpToForm(kk); S.ke = null; setModal(""); location.hash = "#/kpc"; } return; }
    if (d.kpcancel != null && t.hasAttribute("data-kpcancel")) { S.kpf = null; location.hash = "#/kpreg/"; return; }
    if (d.kcopen != null && t.hasAttribute("data-kcopen")) { kpcInit(); S.kpf.nc = { mode: d.kcopen, name: "", fio: "", phone: "", email: "", err: "" }; return paint(); }
    if (d.kcclose != null && t.hasAttribute("data-kcclose")) { if (S.kpf) S.kpf.nc = null; return paint(); }
    if (d.kcsave != null && t.hasAttribute("data-kcsave")) return kcSave();
  });
  document.addEventListener("input", function (e) {
    var t = e.target; if (!t.dataset) return;
    if (t.dataset.ke && S.ke) { S.ke[t.dataset.ke] = t.value; if (t.dataset.ke === "amount" || t.dataset.ke === "adv_sum") { var r = document.getElementById("keRest"); if (r) r.textContent = keRest(S.ke); } }
    if (t.dataset.knc && S.kpf && S.kpf.nc) S.kpf.nc[t.dataset.knc] = t.value;
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (t.dataset && t.dataset.ke && S.ke) {
      S.ke[t.dataset.ke] = t.value;
      if (t.dataset.ke === "order_id") { var o = (S.orders || []).filter(function (x) { return x.id === +t.value; })[0]; if (o) { S.ke.amount = o.amount || 0; S.ke.adv_sum = o.adv_mode === "advance" ? o.adv_sum || 0 : 0; S.ke.object = o.object || S.ke.object; if (o.customer_id) S.ke.customer_id = o.customer_id; S.ke.adv_date = o.adv_paid ? o.adv_date : ""; S.ke.adv_date0 = S.ke.adv_date; } }
      if (t.dataset.ke === "status") { var td_ = new Date(); S.ke.status_date = t.value === S.ke.status0 ? S.ke.status_date0 : td_.getFullYear() + "-" + ("0" + (td_.getMonth() + 1)).slice(-2) + "-" + ("0" + td_.getDate()).slice(-2); }
      if (t.dataset.ke === "customer_id" || t.dataset.ke === "order_id" || t.dataset.ke === "adv_sum" || t.dataset.ke === "status") setModal(keHtml());
    }
  });
  /* контакт заказчика и новый заказчик прямо в конструкторе КП */
  function kcSave() {
    var f = S.kpf, n = f.nc; if (!n) return;
    var cs = S.customers || [], cur = cs.filter(function (c) { return c.id === f.customer_id; })[0];
    var contact = { fio: (n.fio || "").trim(), pos: "", phone: (n.phone || "").trim(), email: (n.email || "").trim() };
    if (n.mode === "contact") {
      if (!cur) { n.err = "Сначала выберите заказчика"; return paint(); }
      if (!contact.fio && !contact.phone && !contact.email) { n.err = "Заполните ФИО, телефон или e-mail"; return paint(); }
    } else if (!(n.name || "").trim()) { n.err = "Введите название заказчика"; return paint(); }
    var body = n.mode === "contact"
      ? { name: cur.name, regular: !!cur.regular, tz: cur.tz, city: cur.city || "", comment: cur.comment || "", contacts: (cur.contacts || []).concat([contact]) }
      : { name: n.name.trim(), regular: false, tz: cityZone(n.city) || "Europe/Moscow", city: (n.city || "").trim(), comment: "", contacts: (contact.fio || contact.phone || contact.email) ? [contact] : [] };
    api("/customers", body).then(function (r) { return api("/customers").then(function (c) { S.customers = c; f.customer_id = r.id; f.nc = null; paint(); toast(n.mode === "contact" ? "Контакт добавлен" : "Заказчик создан"); }); }, function (er) { n.err = String(er); paint(); });
  }
  /* ---------- корректировки: циклы работ («Сроки корректировки») ---------- */
  function rdPill(r) { return r.open ? '<span class="pill warn">в работе</span>' : r.delivered ? '<span class="pill ok">сдано</span>' : '<span class="pill muted">не начато</span>'; }
  function rdLeft(r) {
    if (!r.open || r.left == null) return "";
    return r.left < 0 ? '<span style="color:var(--bad);font-weight:700">просрочено на ' + plural(-r.left, ["рабочий день", "рабочих дня", "рабочих дней"]) + "</span>" : "осталось " + plural(r.left, ["рабочий день", "рабочих дня", "рабочих дней"]);
  }
  function roundsTab(o) {
    var rd = S.rd;
    if (!rd || rd.id !== o.id) {
      S.rd = rd = { id: o.id, data: null, err: "", edit: 0 };
      api("/orders/" + o.id + "/rounds").then(function (r) { if (S.rd && S.rd.id === o.id) { S.rd.data = r; if (S.open === o.id) paint(); } }, function (e) { if (S.rd && S.rd.id === o.id) { S.rd.err = String(e); if (S.open === o.id) paint(); } });
    }
    if (!rd.data) return rd.err ? '<div class="err">' + E(rd.err) + "</div>" : '<div class="note">Загружаю…</div>';
    var d = rd.data, people = S.people || [];
    var head = '<div class="rdsum"><div><b>' + (d.rounds[0].days_fact != null ? d.rounds[0].days_fact : "—") + '</b><small>раб. дн. основная работа</small></div><div><b>' + d.fix_count + '</b><small>корректировок</small></div><div><b>' + d.total_days + '</b><small>раб. дн. всего по факту</small></div></div>';
    var cards = d.rounds.map(function (r) {
      var facts = '<div class="rdfacts"><span>Начали: <b>' + (r.started ? dmy(r.started) : "—") + "</b></span><span>Сдали: <b>" + (r.delivered ? dmy(r.delivered) : "—") + "</b></span>" + (r.days_fact != null ? "<span>Факт: <b>" + r.days_fact + " раб. дн.</b></span>" : "") + "</div>";
      var plan = '<div class="rdplan">План: <b>' + (r.plan_start ? dmy(r.plan_start) : "—") + " — " + (r.plan_end ? dmy(r.plan_end) : "—") + "</b>" + (r.days_plan != null ? " (" + r.days_plan + " раб. дн.)" : "") + (rdLeft(r) ? " · " + rdLeft(r) : "") + "</div>";
      var who = '<div class="rdplan">Исполнитель: <b>' + E(r.executor || "не назначен") + "</b>" + (r.created_by ? ' <small style="color:var(--muted)">· открыл(а) ' + E(r.created_by) + "</small>" : "") + "</div>";
      var rem = r.kind === "fix" ? '<div class="rdrem">' + (r.remarks ? E(r.remarks) : '<i style="color:var(--muted)">Замечания не записаны</i>') + "</div>"
        + '<div class="rdplan">' + (r.category ? '<span class="pill info">' + E(r.category) + "</span> " : '<span class="pill warn">категория не указана</span> ') + (r.cause ? E(r.cause) : "") + (r.paid ? ' · <b>платная</b>' : "") + "</div>" : "";
      var ed = "";
      if (r.kind === "part") {                    // раздел-подзадача: свой исполнитель и срок; сдаёт исполнитель раздела или руководитель
        rem = "";
        var mineP = d.can_edit || (r.executor_id && r.executor_id === d.me);
        var doneBtn = mineP && r.executor_id ? (r.delivered ? '<button class="btn ghost sm" data-rddone="' + r.id + ':0">↺ Вернуть в работу</button>' : '<button class="btn primary sm" data-rddone="' + r.id + ':1">✓ Раздел сдан</button>') : "";
        ed = d.can_edit && rd.edit === r.id ? '<div class="rdform"><div class="g2f"><div class="fld"><label>Начало</label><input type="date" data-rdf="plan_start" value="' + E(r.plan_start || "") + '"></div><div class="fld"><label>Срок, рабочих дней</label><input type="number" min="1" max="120" data-rdf="workdays" placeholder="напр. 10"></div></div>'
          + '<div class="fld"><label>или срок датой</label><input type="date" data-rdf="plan_end" value="' + E(r.plan_end || "") + '"></div>'
          + '<div class="fld"><label>Исполнитель раздела ' + E(r.system || "") + '</label><select data-rdf="executor_id"><option value="0">— не менять —</option>' + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +r.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
          + '<div style="display:flex;gap:8px"><button class="btn primary sm" data-rdsave="' + r.id + '">Сохранить</button><button class="btn ghost sm" data-rdedit="0">Отмена</button></div></div>'
          : '<div style="display:flex;gap:8px;flex-wrap:wrap">' + (d.can_edit ? '<button class="btn ghost sm" data-rdedit="' + r.id + '">✎ Исполнитель и срок</button>' : "") + doneBtn + "</div>";
        return '<div class="rdcard part' + (r.open ? " open" : "") + '"><div class="rdh"><b>' + E(r.title) + "</b>" + (r.delivered ? '<span class="pill ok">сдан</span>' : r.executor_id ? rdPill(r) : '<span class="pill warn">исполнитель не назначен</span>') + "</div>" + facts + plan + who + ed + "</div>";
      }
      if (r.kind === "fix" && d.can_edit) {
        ed = rd.edit === r.id ? '<div class="rdform"><div class="fld"><label>Замечания заказчика</label><textarea rows="3" data-rdf="remarks">' + E(r.remarks || "") + "</textarea></div>"
          + '<div class="g2f"><div class="fld"><label>Категория</label><select data-rdf="category"><option value="">—</option>' + FIX_CAT.map(function (x) { return '<option' + (x === r.category ? " selected" : "") + ">" + E(x) + "</option>"; }).join("") + "</select></div>"
          + '<div class="fld"><label>Причина</label><select data-rdf="cause"><option value="">—</option>' + FIX_CAUSE.map(function (x) { return '<option' + (x === r.cause ? " selected" : "") + ">" + E(x) + "</option>"; }).join("") + "</select></div></div>"
          + '<div class="fld"><label>Платная корректировка</label><select data-rdf="paid"><option value="0">Нет</option><option value="1"' + (r.paid ? " selected" : "") + ">Да</option></select></div>"
          + '<div class="g2f"><div class="fld"><label>Начало</label><input type="date" data-rdf="plan_start" value="' + E(r.plan_start || "") + '"></div><div class="fld"><label>Срок, рабочих дней</label><input type="number" min="1" max="120" data-rdf="workdays" placeholder="напр. 3"></div></div>'
          + '<div class="fld"><label>или срок датой</label><input type="date" data-rdf="plan_end" value="' + E(r.plan_end || "") + '"></div>'
          + '<div class="fld"><label>Исполнитель (кому поставить работу)</label><select data-rdf="executor_id"><option value="0">— не менять —</option>' + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +r.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
          + '<div style="display:flex;gap:8px"><button class="btn primary sm" data-rdsave="' + r.id + '">Сохранить</button><button class="btn ghost sm" data-rdedit="0">Отмена</button></div></div>'
          : '<button class="btn ghost sm" data-rdedit="' + r.id + '">✎ Сроки и категория</button>';
      }
      return '<div class="rdcard ' + r.kind + (r.open ? " open" : "") + '"><div class="rdh"><b>' + E(r.title) + "</b>" + rdPill(r) + "</div>" + facts + plan + who + rem + ed + "</div>";
    }).join("");
    return head + (rd.msg ? '<div class="err">' + E(rd.msg) + "</div>" : "") + '<p class="sub" style="margin:8px 0">Основной срок по договору не меняется: у каждой корректировки свои сроки в рабочих днях. Даты начала и сдачи фиксируются автоматически.'
      + (d.part_count ? " Разделы (ВПВ, АУП …) — подзадачи со своим исполнителем и сроком; идут параллельно основной работе и в сумму дней не входят." : "") + "</p>" + cards;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-rdedit],[data-rdsave],[data-rddone]") : null; if (!t || !S.rd) return;
    if (t.dataset.rddone) {
      var dn = t.dataset.rddone.split(":");
      return api("/orders/" + S.rd.id + "/rounds/" + dn[0] + "/edit", { done: +dn[1] }).then(function (r) { S.rd.data = r; S.rd.msg = ""; toast(+dn[1] ? "Раздел сдан" : "Раздел снова в работе"); S.orders = null; return load(); }).then(paint, function (er) { S.rd.msg = String(er); paint(); });
    }
    if (t.dataset.rdedit != null && t.hasAttribute("data-rdedit")) { S.rd.edit = +t.dataset.rdedit; S.rd.msg = ""; return paint(); }
    if (t.dataset.rdsave) {
      var box = t.closest(".rdform"), body = {};
      box.querySelectorAll("[data-rdf]").forEach(function (el) { var k = el.dataset.rdf; if (k === "workdays") { if (el.value) body.workdays = +el.value; } else if (k === "executor_id") { if (+el.value) body.executor_id = +el.value; } else body[k] = el.value; });
      if (body.workdays) delete body.plan_end;
      api("/orders/" + S.rd.id + "/rounds/" + t.dataset.rdsave + "/edit", body).then(function (r) { S.rd.data = r; S.rd.edit = 0; S.rd.msg = ""; toast("Сохранено"); S.orders = null; return load(); }).then(paint, function (er) { S.rd.msg = String(er); paint(); });
    }
  });
  var FIX_CAT = ["Ошибка отдела", "Просьба заказчика", "Недостаток вводных", "Экспертиза", "Спорно"];
  var FIX_CAUSE = ["Ошибки в документах", "Нарушение норм", "Размещение оборудования", "Ошибка в ТЗ", "Нет оборудования у поставщика", "Другое"];
  /* ---------- «Просрочено и зависло», скрипты, карточка задачи, «Пауза» — вынесены в web/ds_risk.js (24.11); здесь — точки входа ---------- */
  function loadRisk() { return window.DSRisk.loadRisk(); }
  function riskScreen() { return window.DSRisk.riskScreen(); }
  function loadScripts() { return window.DSRisk.loadScripts(); }
  function scriptsScreen() { return window.DSRisk.scriptsScreen(); }
  function saveScripts() { return window.DSRisk.saveScripts(); }
  function scFileName(fid) { return window.DSRisk.scFileName(fid); }
  function scFileOpen(fid, inline) { return window.DSRisk.scFileOpen(fid, inline); }
  function scUpload(list) { return window.DSRisk.scUpload(list); }
  function nextStep(o) { return window.DSRisk.nextStep(o); }
  function stepper(o) { return window.DSRisk.stepper(o); }
  function pauseCan() { return window.DSRisk.pauseCan(); }
  function pauseable(o) { return window.DSRisk.pauseable(o); }
  function pauseBox(o) { return window.DSRisk.pauseBox(o); }
  function pauseRow(o) { return window.DSRisk.pauseRow(o); }
  function pzDo(p, ok) { return window.DSRisk.pzDo(p, ok); }
  function pzSave(id) { return window.DSRisk.pzSave(id); }
  function customerOf(o) { return window.DSRisk.customerOf(o); }
  function tzLine(o) { return window.DSRisk.tzLine(o); }
  function nowIn(tz) { return window.DSRisk.nowIn(tz); }
  function folderUrl(o, create) { return window.DSRisk.folderUrl(o, create); }
  function makeFolder(o) { return window.DSRisk.makeFolder(o); }
  function windowHtml(o) { return window.DSRisk.windowHtml(o); }
  function formHtml() { return window.DSRisk.formHtml(); }
  function fixFormHtml(f) { return window.DSRisk.fixFormHtml(f); }
  function paint() {
    if (!S.mount) return;
    var el = S.mount.el;
    if (S.err) { el.innerHTML = '<div class="ds dspage"><div class="err">Ошибка: ' + E(S.err) + '</div><button class="btn ghost" id="dsRetry">Повторить</button></div>'; var r = document.getElementById("dsRetry"); if (r) r.onclick = DS.reload; return; }
    if (!S.meta) return;
    var q = document.activeElement && document.activeElement.id === "dsQ";
    var k = S.mount.kind;
    var kw = k === "kp" && el.querySelector(".kpwrap"), kpPos = kw && kw.dataset.arch === String(!!S.kpArch) ? [kw.scrollTop, kw.scrollLeft, scrollY] : null;      // реестр КП перерисовывается на месте: прокрутка не сбрасывается
    if (k === "contract" && S.cmode !== "kp") {                 // рабочий генератор договоров: окно не перерисовываем, чтобы не терять введённое
      if (!el.querySelector("#cgFrame")) el.innerHTML = '<div class="ds dspage">' + genScreen() + "</div>";
      return;
    }
    el.innerHTML = k === "risk" ? '<div class="ds dspage">' + riskScreen() + "</div>" : k === "scripts" ? scriptsScreen() : k === "load" ? '<div class="ds dspage">' + (workLoad() ? DSWorkLoad.html() : loadScreen()) + "</div>"
      : k === "flow" ? '<div class="ds dspage">' + (workHow() ? DSWorkHow.html() : flowScreen()) + "</div>" : k === "tz" ? '<div class="ds dspage">' + tzScreen() + "</div>"
      : k === "stages" ? '<div class="ds dspage">' + stagesScreen() + "</div>" : k === "auto" ? '<div class="ds dspage">' + autoScreen() + "</div>" : k === "onec" ? '<div class="ds dspage">' + onecScreen() + "</div>"
      : k === "price" ? '<div class="ds dspage">' + priceScreen() + "</div>" : k === "report" ? '<div class="ds dspage">' + reportScreen() + "</div>" : k === "stats" ? '<div class="ds dspage">' + statsScreen() + "</div>"
      : k === "orders" ? '<div class="ds dspage tr-orders">' + (window.DSOrdersReg ? DSOrdersReg.html() : '<div class="note">Загружаю…</div>') + "</div>" : k === "kp" ? '<div class="ds dspage">' + kpScreen() + "</div>" : k === "kpc" ? '<div class="ds dspage">' + kpcScreen() + "</div>" : k === "contract" ? '<div class="ds dspage">' + contractScreen() + "</div>"
      : k === "cust" ? '<div class="ds dspage">' + custScreen() + "</div>" : k === "week" ? '<div class="ds dspage">' + weekScreen() + "</div>" : workConv() ? DSWorkConv.html() : screen();
    if (q) { var qe = document.getElementById("dsQ"); if (qe) { qe.focus(); qe.setSelectionRange(qe.value.length, qe.value.length); } }
    fitKpWrap();
    if (kpPos) { var nw = el.querySelector(".kpwrap"); if (nw) { nw.scrollTop = kpPos[0]; nw.scrollLeft = kpPos[1]; } if (scrollY !== kpPos[2]) scrollTo(scrollX, kpPos[2]); }
    if (k === "load") { if (workLoad()) DSWorkLoad.after(); else fitLoadScroll(); }
    if (k === "tasks" && workConv()) DSWorkConv.after();
    if (k === "flow" && workHow()) DSWorkHow.after();
    if (k === "auto" && window.DSAI) DSAI.settings(document.getElementById("dsAiSettings"));
    var cn = k === "cust" && document.getElementById("cuNotes");
    if (cn && window.MPBD && MPBD.notes) MPBD.notes(cn, +cn.getAttribute("data-cid"));
    var ca = k === "cust" && document.getElementById("cuAi");
    if (ca && window.DSAI) DSAI.customer(ca, +ca.getAttribute("data-cid"));
    var m = modalRoot();
    if (S.ke) { setModal(keHtml()); return; }
    if (S.tm) { setModal(tmWrap()); return; }
    if (S.nt) { setModal(ntHtml()); return; }
    if (S.te) { setModal(teHtml()); return; }
    if (S.form) { setModal(formHtml()); return; }
    if (S.edit) { setModal(planHtml()); return; }
    if (S.topen) {
      var tk = (S.tasks || []).filter(function (x) { return x.id === S.topen; })[0];
      olCss();
      setModal('<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center"><div class="modal oltm" style="width:min(460px,100%);height:auto;max-height:92vh;overflow:auto;border-radius:20px;padding:0">'
        + (tk ? olDrawer(tk) : '<div class="m-body"><h3>Задача не найдена</h3><p class="note">Её уже закрыли или она поставлена не вам.</p><button class="btn ghost" data-oselx="1">Закрыть</button></div>') + "</div></div>");
      return;
    }
    var o = S.open ? find(S.open) : null;
    if (S.open && !o) { setModal('<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center"><div class="modal" style="width:min(420px,100%);height:auto;border-radius:20px"><div class="m-body"><h3>Задача не найдена</h3><p class="note">Её нет или она вам недоступна.</p><button class="btn ghost" data-close="1">Закрыть</button></div></div></div>'); return; }
    setModal(o ? windowHtml(o) : "");
    var sp = m.querySelector('.stepper'), cu = m.querySelector('.stp.cur'); if (sp && cu) sp.scrollLeft = Math.max(0, cu.offsetLeft - sp.clientWidth / 2 + cu.offsetWidth / 2);
  }

  /* ---------- «Поставить задачу»: по этапу конвейера или лично сотруднику (с привязкой / без привязки) ---------- */
  var NT_STEPS = [["", "Личная задача сотруднику"], ["a1", "Обращение: операционному менеджеру"], ["a2", "Сбор вводных: продажам (срок 1 день)"], ["a3", "КП отправлено: продажам"]];
  var NT_ROLE = { a1: "операционный менеджер", a2: "отдел продаж", a3: "отдел продаж" };
  function ntHtml() {
    var n = S.nt; if (!n) return "";
    var fld = 'style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--surface);color:var(--ink);font:inherit"';
    var users = S.assignable || [], ords = (S.orders || []).filter(function (o) { return DONE_ST.indexOf(o.stage) < 0 || o.id === +n.order; });
    var POSN = { owner: "Руководитель", design: "Руководитель проектного отдела", sales: "Отдел продаж", ops: "Операционный менеджер", acc: "Бухгалтер", designer: "Проектировщик", norm: "Нормативный специалист" };
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(560px,100%);height:auto;max-height:92vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.2rem">Новая задача</h2>'
      + (n.thread ? '<div style="color:var(--muted);font-size:.86rem">Привязана к диалогу: ' + E(n.thread_title || n.thread) + "</div>" : "") + '</div><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
      + '<div class="fld"><label>Что это</label><select data-nt="step" ' + fld + ">" + NT_STEPS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === n.step ? " selected" : "") + ">" + E(s[1]) + "</option>"; }).join("") + "</select></div>"
      + '<div class="fld"><label>Кому</label><select data-nt="assignee" ' + fld + '><option value="0">' + (n.step ? "— по этапу: " + NT_ROLE[n.step] + " —" : "— мне —") + "</option>"
      + users.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +n.assignee ? " selected" : "") + ">" + E(u.name) + " — " + E(POSN[u.position] || u.position || "") + "</option>"; }).join("") + "</select></div>"
      + '<div class="fld"><label>Что нужно сделать</label><input data-nt="title" ' + fld + ' value="' + E(n.title) + '" placeholder="' + (n.step ? "Можно оставить пустым — возьмём название этапа" : "Например: позвонить заказчику и уточнить площадь") + '"></div>'
      + '<div class="g2f"><div class="fld"><label>Срок</label><input type="date" data-nt="due" ' + fld + ' value="' + E(n.due) + '"></div>'
      + '<div class="fld"><label>Привязать к проектной задаче</label><select data-nt="order" ' + fld + '><option value="0">— без привязки —</option>'
      + ords.map(function (o) { return '<option value="' + o.id + '"' + (o.id === +n.order ? " selected" : "") + ">№" + E(o.number) + " · " + E(o.customer || "") + " · " + E((o.object || "").slice(0, 40)) + "</option>"; }).join("") + "</select></div></div>"
      + '<div class="fld"><label>Комментарий</label><textarea rows="3" data-nt="note" ' + fld + ">" + E(n.note) + "</textarea></div>"
      + (n.err ? '<div class="err">' + E(n.err) + "</div>" : "")
      + '<button class="btn primary block" data-ntsave="1">Создать задачу</button></div></div></div>';
  }
  function ntField(el) { var k = el.dataset.nt; if (k && S.nt) S.nt[k] = el.value; }
  function ntOpen(opts) {
    opts = opts || {};
    var need = [];
    if (S.assignable == null) need.push(api("/users/assignable").then(function (u) { S.assignable = u; }, function () { S.assignable = []; }));
    if (S.orders == null) need.push(load().then(null, function () {}));
    return Promise.all(need).then(function () {
      S.nt = { step: opts.step || "", assignee: 0, title: opts.title || "", due: "", order: opts.order || 0, thread: opts.thread_id || "", thread_title: opts.thread_title || "", note: opts.note || "", err: "" };
      setModal(ntHtml());
    });
  }
  function ntSave() {
    var n = S.nt; if (!n) return;
    if (!n.title.trim() && !n.step) { n.err = "Опишите, что нужно сделать"; setModal(ntHtml()); return; }
    api("/tasks", { title: n.title, assignee_id: +n.assignee || 0, due: n.due, step: n.step, order_id: +n.order || 0, thread_id: n.thread, note: n.note }).then(function (r) {
      S.nt = null; setModal(""); toast("Задача поставлена: " + r.assignee); S.tasks = null;
      if (S.mount) return load().then(paint);
    }, function (e) { n.err = String(e); setModal(ntHtml()); });
  }
  DS.newTask = ntOpen;
  DS.orders = function () { return (S.orders || []).map(function (o) { return { id: o.id, label: "№" + o.number + " · " + (o.customer || "") + " · " + (o.object || ""), number: o.number, object: o.object || "", system: o.system || "" }; }); };
  DS.closeAll = function () { S.form = S.edit = S.nt = S.te = S.ke = null; S.tm = false; S.oe = null; S.open = null; S.tab = "info"; var m = document.getElementById("ds-modal"); if (m) m.innerHTML = ""; };
  DS.ensureOrders = function () { return S.orders == null && C && C.loggedIn() ? load().then(null, function () {}) : Promise.resolve(); };

  /* ---------- полный контроль руководителя, операционного менеджера и руководителя продаж: правка и удаление ---------- */
  function fullCtl() { var p = pos(); return p === "owner" || p === "ops" || p === "sales"; }
  function taskCtl() { return fullCtl() || pos() === "design"; }
  function taskAuthor(t) { return !!(t.author_id && C && C.me && t.author_id === C.me.id); }
  function taskMine(t) {                           // своя: поставлена мной, мне или моей должности
    if (taskAuthor(t)) return true;
    if (!C || !C.me) return false;
    return t.assignee_id ? t.assignee_id === C.me.id : !!(t.assignee_pos && t.assignee_pos === pos());
  }
  var OE_FIELD = 'style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);color:var(--ink);font:inherit"';
  function oeChk(label, key) { return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-oech="' + key + '"' + (S.oe[key] ? " checked" : "") + "> " + label + "</label>"; }
  function canMenu() { return taskCtl(); }
  var PRIOS = [["Высокий", "1 · Высокий", "#e5483c"], ["Повышенный", "2 · Повышенный", "#f0924d"], ["Обычный", "3 · Обычный", "#1D9E75"], ["Низкий", "4 · Низкий", "#8794ab"]];
  function tmInp(label, key, type, ro) {
    var v = S.oe[key]; if (v == null) v = "";
    return '<div class="fld"><label>' + label + '</label><input ' + (type ? 'type="' + type + '" ' : "") + 'data-oe="' + key + '" value="' + E(v) + '" ' + OE_FIELD + (ro ? " disabled" : "") + "></div>";
  }
  function tmHtml() {
    var o = S.oe; if (!o) return "";
    var p = pos(), full = fullCtl(), stages = (S.meta && S.meta.stages) || [], people = (o.nonproj && S.staff) || S.people || [], money_ = can("money") && o.amount != null && full;
    if (o.nonproj && S.staff == null && full && !S.staffReq) { S.staffReq = 1; api("/people?any=1").then(function (x) { S.staff = x; if (S.oe) tmRepaint(); }, function () { S.staffReq = 0; }); }      // не проектная работа: исполнитель — любой сотрудник
    if (+o.executor_id && !people.some(function (u) { return u.id === +o.executor_id; })) people = people.concat([{ id: +o.executor_id, name: o.executor || "…" }]);
    var srv = find(o.id) || o, pz = paused(srv);         // стадия на сервере: на паузе стадию меняет только «Вернуть»
    var banner = pz ? '<div class="tm-ban">' + E(pauseText(srv)) + " · до " + dmy(srv.pause_until) + "</div>" : o.left_days == null ? "" : (o.left_days < 0 ? '<div class="tm-ban bad">Просрочено ' + plural(o.left_days, ["день", "дня", "дней"]) + "</div>" : '<div class="tm-ban">Осталось ' + plural(o.left_days, ["день", "дня", "дней"]) + "</div>");
    var pzRow = pz ? (S.tm ? pauseBox(srv) : "") : pauseCan() && pauseable(srv) ? pauseRow(srv) : "";
    return '<div class="tm-inner">' + banner
      + '<div class="tm-btns" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><a class="btn primary" href="' + E(folderUrl(o, false)) + '">Перейти в папку на сервере</a>'
      + (S.tm ? "" : '<button class="btn ghost" data-taskchat="' + o.id + '">💬 Чат задачи</button>') + '<button class="btn ghost" data-tmcopy="1">Копировать имя</button></div>'
      + '<div class="tm-urg"><span class="ico">⚡</span><div><b>Срочная работа</b><small>Поднимается наверх списка и подсвечивается красным</small></div><button type="button" class="tm-sw ' + (o.urgent ? "on" : "") + '" data-tmurg="1" aria-label="Срочная работа"><i></i></button></div>'
      + pzRow
      + '<label class="tm-l">Стадия' + (pz ? ' <small style="font-weight:400;color:var(--muted)">· задача на паузе: сначала «Вернуть»</small>' : "") + '</label><div class="tm-chips">' + stages.filter(function (s) { return s !== PAUSE; }).map(function (s) {
        return '<button type="button" class="tmchip ' + (s === (pz ? srv.pause_from : o.stage) ? "on" : "") + '" data-tmstage="' + E(s) + '"' + (pz ? ' disabled title="Сначала «Вернуть»" style="opacity:.55;cursor:not-allowed"' : "") + '><i style="background:' + (STAGE_COLOR[s] || "#999") + '"></i>' + E(s) + "</button>"; }).join("") + "</div>"
      + (o.stage === "Корректировка" && (find(o.id) || {}).stage !== "Корректировка" ? '<div class="g2f">' + tmInp("Срок корректировки, рабочих дней", "fix_days", "number") + '<div class="fld"><label>Замечания заказчика</label><input data-oe="fix_remarks" value="' + E(o.fix_remarks || "") + '" ' + OE_FIELD + "></div></div>"
        + '<div class="fld"><label>Категория корректировки</label><select data-oe="fix_cat" ' + OE_FIELD + '><option value="">—</option>' + FIX_CAT.map(function (x) { return "<option" + (x === o.fix_cat ? " selected" : "") + ">" + E(x) + "</option>"; }).join("") + "</select></div>" : "")
      + '<div class="g2f">' + tmInp("№ задачи", "number", "", !full) + '<div class="fld"><label>Ответственный</label><select data-oe="executor_id" ' + OE_FIELD + '><option value="0">— не назначен —</option>' + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +o.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div></div>"
      + ((o.parts || []).filter(function (x) { return !x.delivered; }).length ? '<div class="g2f">' + o.parts.filter(function (x) { return !x.delivered; }).map(function (x) {
        return '<div class="fld"><label>Исполнитель раздела ' + E(x.system) + (x.executor_id ? "" : ' <b style="color:var(--bad)">· не назначен</b>') + '</label><select data-oepart="' + x.id + '" ' + OE_FIELD + '><option value="0">— не назначен —</option>'
          + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +x.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"; }).join("") + "</div>" : "")
      + (full ? oeChk("<span><b>Не проектная работа</b> — расчёт риска, категорий, план эвакуации, спецификация: ведёт операционный отдел, исполнитель — любой сотрудник</span>", "nonproj") : "")
      + '<div class="fld"><label>Заказчик</label><input data-oe="customer" list="dsCust" value="' + E(o.customer || "") + '" ' + OE_FIELD + (full ? "" : " disabled") + "></div>"
      + '<datalist id="dsCust">' + (S.customers || []).map(function (c) { return '<option value="' + E(c.name) + '">'; }).join("") + "</datalist>"
      + '<div class="fld"><label>Объект (адрес)</label><textarea rows="3" data-oe="object" ' + OE_FIELD + ">" + E(o.object || "") + "</textarea></div>"
      + sysPick(o, "oe")
      + '<label class="tm-l">Приоритет</label><div class="tm-chips">' + PRIOS.map(function (x) { return '<button type="button" class="tmchip ' + (x[0] === o.priority ? "on" : "") + '" data-tmprio="' + x[0] + '"><i style="background:' + x[2] + '"></i>' + x[1] + "</button>"; }).join("") + "</div>"
      + '<div class="g2f">' + tmInp("Дата постановки", "start_date", "date") + tmInp("Срок по договору", "due_date", "date") + "</div>"
      + '<div class="g2f">' + (fixDates(o) ? tmInp("Начало корректировки №" + o.fix_n, "fix_start", "date") + tmInp("Срок корректировки", "fix_end", "date")
        : tmInp("Начало работ (план)", "plan_start", "date") + tmInp("Срок сдачи (план)", "plan_end", "date")) + "</div>"
      + tmInp("Правок от заказчика", "edits", "number")
      + (money_ ? '<label class="tm-l">Оплата и акт</label><div class="g2f">' + tmInp("Сумма, ₽", "amount", "number") + tmInp("Аванс, ₽", "adv_sum", "number") + "</div>"
        + '<div class="g2f">' + tmInp("Дата аванса", "adv_date", "date") + tmInp("Дата постоплаты", "post_date", "date") + "</div>"
        + oeChk("Аванс оплачен", "adv_paid") + oeChk("Постоплата оплачена", "post_paid") + oeChk("Акт отправлен", "act_sent") + oeChk("Акт подписан", "act_signed") : "")
      + (S.oeErr ? '<div class="err">' + E(S.oeErr) + "</div>" : "")
      + '<div class="tm-foot"><button class="btn ghost" data-close="1">Отмена</button>' + (full ? '<button class="btn ghost" data-oedel="1" style="color:var(--bad)">Удалить</button>' : "") + '<button class="btn primary" data-oesave="1">Сохранить</button></div></div>';
  }
  /* Снимок формы «Меню задачи»: S.oe — то, что правит пользователь, S.oe0 — каким задача была на сервере, когда снимок взят.
     После любой перезагрузки задач (кнопки шага, назначение, ТЗ, оплата, разделы) форма перестраивается от свежих данных:
     несохранённая правка поля сохраняется, только если это поле на сервере за это время не менялось, иначе побеждает сервер.
     «Сохранить» отправляет только то, что пользователь изменил относительно S.oe0, — устаревшие стадия и исполнитель не уходят. */
  function oeClone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function oeSame(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function oeSnap(o) { S.oe = oeClone(o); S.oe0 = oeClone(o); S.oeErr = ""; }
  function oeRebase(fresh) {
    var cur = S.oe, b = S.oe0;
    if (!cur || !fresh || cur.id !== fresh.id || !b || b.id !== fresh.id || oeSame(b, fresh)) return;
    var nx = oeClone(fresh);
    Object.keys(cur).forEach(function (k) {
      if (k !== "parts" && !oeSame(cur[k], b[k]) && oeSame(b[k], fresh[k])) nx[k] = oeClone(cur[k]);
    });
    var bp = {}; (b.parts || []).forEach(function (x) { bp[x.id] = +x.executor_id || 0; });
    var cp = {}; (cur.parts || []).forEach(function (x) { cp[x.id] = +x.executor_id || 0; });
    (nx.parts || []).forEach(function (x) { if (x.id in cp && x.id in bp && cp[x.id] !== bp[x.id] && (+x.executor_id || 0) === bp[x.id]) x.executor_id = cp[x.id]; });
    S.oe = nx; S.oe0 = oeClone(fresh);
  }
  function tmRepaint() { if (S.tm) setModal(tmWrap()); else paint(); }
  function tmWrap() {
    if (S.oe) oeRebase(find(S.oe.id));
    var o = S.oe; if (!o) return "";
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:12px"><div class="modal tm"><div class="m-head"><div class="row"><div><h2 style="font-size:1.25rem">№' + E(o.number) + " · " + E(o.customer || "") + '</h2>' + sysChips(find(o.id) || o) + tzLine(o) + '</div><button class="x" data-close="1">✕</button></div></div><div class="m-body tm-body">' + tmHtml() + "</div></div></div>";
  }
  function fixDates(o) { return !!o.fix_n && o.stage === "Корректировка" && (find(o.id) || {}).stage === "Корректировка"; }      // на корректировке правятся её сроки, а не основной работы
  function tmOpen(id) {
    var o = find(+id); if (!o) return;
    oeSnap(o); S.tm = true;
    setModal(tmWrap());
  }
  function oePayload(o) {           // все поля формы в виде, в каком их принимает сервер
    var pl = { number: o.number, customer: o.customer, object: o.object, system: sysLabel(o), systems: o.systems || [], systems_other: o.systems_other || "", modern: o.modern ? 1 : 0, stage: o.stage, executor_id: +o.executor_id || 0, start_date: o.start_date || "", due_date: o.due_date || "",
      plan_start: o.plan_start || "", plan_end: o.plan_end || "", priority: o.priority, edits: +o.edits || 0, urgent: o.urgent ? 1 : 0 };
    if (fixDates(o)) { pl.plan_start = o.fix_start || ""; pl.plan_end = o.fix_end || ""; }
    if (fullCtl()) pl.nonproj = o.nonproj ? 1 : 0;
    if (o.stage === "Корректировка") { pl.fix_days = +o.fix_days || 0; pl.fix_remarks = o.fix_remarks || ""; pl.fix_cat = o.fix_cat || ""; }
    if (can("money") && o.amount != null) Object.assign(pl, { amount: +o.amount || 0, adv_sum: +o.adv_sum || 0, adv_date: o.adv_date || "", post_date: o.post_date || "", adv_paid: o.adv_paid ? 1 : 0, post_paid: o.post_paid ? 1 : 0, act_sent: o.act_sent ? 1 : 0, act_signed: o.act_signed ? 1 : 0 });
    if (pos() === "design") { ["number", "customer", "amount", "adv_sum"].forEach(function (k) { delete pl[k]; }); }
    return pl;
  }
  function oeSave() {
    var o = S.oe; if (!o) return;
    S.oeErr = "";
    var full = oePayload(o), b = S.oe0 && S.oe0.id === o.id ? oePayload(S.oe0) : null, pl = {};
    Object.keys(full).forEach(function (k) { if (!b || !oeSame(full[k], b[k])) pl[k] = full[k]; });      // только изменённое пользователем
    var was = {}; ((find(o.id) || {}).parts || []).forEach(function (x) { was[x.id] = +x.executor_id || 0; });
    var parts = (o.parts || []).filter(function (x) { return !x.delivered && +x.executor_id && +x.executor_id !== was[x.id]; });
    var partReq = function () {
      return parts.reduce(function (ch, x) {
        return ch.then(function () { return api("/orders/" + o.id + "/rounds/" + x.id + "/edit", { executor_id: +x.executor_id }); });
      }, Promise.resolve());
    };
    var tmWas = S.tm, nothing = !Object.keys(pl).length && !parts.length;
    (Object.keys(pl).length ? api("/orders/" + o.id + "/edit", pl) : Promise.resolve()).then(partReq).then(function () {
      S.oe = null; S.tm = false; S.orders = null; S.tasks = null; S.rd = null;
      return load().then(function () { return api("/orders/" + o.id + "/history").then(function (h) { S.history = h; }, function () {}); }).then(function () {
        var no = find(o.id), un = ((no && no.parts) || []).filter(function (x) { return !x.delivered && !x.executor_id; });
        if (un.length) { toast("Сохранено. Назначьте исполнителя раздела " + un.map(function (x) { return x.system; }).join(", ")); if (tmWas) return tmOpen(o.id); }
        else toast(nothing ? "Изменений нет" : "Правки сохранены");
        paint();
      });
    }, function (e) { S.oeErr = String(e); tmRepaint(); });
  }
  function oeDel() {
    var o = S.oe; if (!o || !confirm("Удалить задачу №" + o.number + " вместе со служебными задачами, ТЗ, историей и чатом? Это нельзя отменить.")) return;
    api("/orders/" + o.id + "/delete", {}).then(function () { S.oe = null; S.tm = false; S.open = null; S.tab = "info"; if (/^#\/task\//.test(location.hash)) history.replaceState(null, "", "#/"); toast("Задача удалена"); S.orders = null; S.tasks = null; return load().then(paint); },
      function (e) { S.oeErr = String(e); tmRepaint(); });
  }
  /* правка и удаление организационной задачи */
  function teHtml() {
    var n = S.te; if (!n) return "";
    var users = S.assignable || [];
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><h2 style="font-size:1.2rem">Правка задачи</h2><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
      + '<div class="fld"><label>Название</label><input data-te="title" value="' + E(n.title) + '" ' + OE_FIELD + "></div>"
      + '<div class="fld"><label>Исполнитель' + (n.canAssign ? "" : ' <small style="text-transform:none;font-weight:400">— сменить может руководитель или тот, кто поставил задачу</small>') + '</label><select data-te="assignee_id" ' + (n.canAssign ? "" : "disabled ") + OE_FIELD + '><option value="0">— по роли —</option>' + users.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +n.assignee_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
      + '<div class="g2f"><div class="fld"><label>Срок</label><input type="date" data-te="due" value="' + E(n.due || "") + '" ' + OE_FIELD + '></div>'
      + '<div class="fld"><label>Состояние</label><select data-te="state" ' + OE_FIELD + ">" + [["new", "Новая"], ["work", "В работе"], ["wait", "Ждёт ответа"]].map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === n.state ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div></div>"
      + '<div class="fld"><label>Комментарий</label><textarea rows="3" data-te="note" ' + OE_FIELD + ">" + E(n.note || "") + "</textarea></div>"
      + (n.err ? '<div class="err">' + E(n.err) + "</div>" : "")
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-tesave="1">Сохранить</button>' + (n.canDel ? '<button class="btn ghost" data-tdel="' + n.id + '" style="color:var(--bad)">Удалить задачу</button>' : "") + '</div></div></div></div>';
  }
  function teOpen(id) {
    var t = (S.tasks || []).filter(function (x) { return x.id === +id; })[0]; if (!t) return;
    var go = function () { S.te = { id: t.id, title: t.title, assignee_id: t.assignee_id || 0, due: t.due || "", note: t.note || "", state: t.state === "done" ? "new" : (t.state || "new"), err: "",
      canAssign: taskCtl() || taskAuthor(t), canDel: taskCtl() || taskAuthor(t) }; setModal(teHtml()); };
    if (S.assignable == null) api("/users/assignable").then(function (u) { S.assignable = u; go(); }, function () { S.assignable = []; go(); }); else go();
  }
  function teSave() {
    var n = S.te; if (!n) return;
    api("/tasks/" + n.id + "/edit", { title: n.title, assignee_id: +n.assignee_id || 0, due: n.due, note: n.note, state: n.state }).then(function () {
      S.te = null; setModal(""); toast("Задача обновлена"); S.tasks = null; return load().then(paint);
    }, function (e) { n.err = String(e); setModal(teHtml()); });
  }
  function tDel(id) {
    if (!confirm("Удалить эту задачу? Это нельзя отменить.")) return;
    api("/tasks/" + id + "/delete", {}).then(function () { S.te = null; setModal(""); toast("Задача удалена"); S.tasks = null; return load().then(paint); }, function (e) { toast(String(e)); });
  }

  /* ---------- «Обзор»: одна задача — одна строка, комментарии прямо в строке ---------- */
  function ovRow(o) {
    var cm = (S.cm || {})[o.id] || [], opened = S.cmOpen && S.cmOpen[o.id], last = cm[cm.length - 1];
    var tn = o.left_days == null || paused(o) ? "muted" : o.left_days < 0 ? "bad" : o.left_days <= 2 ? "warn" : "info";
    var head = '<div class="ovl' + (o.urgent ? " urg" : "") + '"><button class="num" data-open="' + o.id + '" title="Открыть окно задачи">№' + E(o.number) + "</button>"
      + '<span class="cu" title="' + E(o.customer || "") + '">' + E(o.customer || "—") + '</span><span class="ob" title="' + E((o.object || "") + (sysText(o) ? " · " + sysText(o) : "")) + '">' + E(o.object || "") + (sysText(o) ? " · <b>" + E(sysText(o)) + "</b>" : "") + "</span>"
      + '<span class="pill muted"><i class="dot" style="background:' + (STAGE_COLOR[o.stage] || "#999") + '"></i>' + E(o.stage) + "</span>"
      + (startPill(o, "btn primary sm") || "")
      + '<span class="ex">' + E(o.executor || "не назначен") + "</span>"
      + '<span class="pill ' + tn + '">' + E(paused(o) ? pauseText(o) : o.left_days == null ? "Без срока" : leftText(o.left_days)) + "</span>"
      + '<span class="lc" title="' + E(last ? last.user + ": " + last.text : "") + '">' + (last ? "<b>" + E(last.user) + ":</b> " + E(last.text) : "") + "</span>"
      + '<button class="cmb' + (opened ? " on" : "") + '" data-cmtoggle="' + o.id + '" title="Комментарии">💬 ' + cm.length + "</button></div>";
    if (!opened) return '<div class="ovr">' + head + "</div>";
    var items = cm.map(function (x) {
      var d = new Date(x.ts * 1000);
      return '<div class="ovc-i"><b>' + E(x.user) + '</b> <small>' + d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + "</small>"
        + (x.can_del ? ' <button type="button" class="lnk" style="color:var(--muted);font-size:.8rem" data-cmdel="' + x.id + '" title="Удалить комментарий">✕</button>' : "") + "<div>" + E(x.text) + "</div></div>";
    }).join("") || '<div class="note" style="margin:0">Комментариев пока нет</div>';
    S.cmDraft = S.cmDraft || {};
    return '<div class="ovr open">' + head + '<div class="ovc">' + items
      + '<div class="ovc-f"><textarea rows="2" data-cmd="' + o.id + '" placeholder="Написать комментарий…">' + E(S.cmDraft[o.id] || "") + '</textarea><button class="btn primary sm" data-cmsend="' + o.id + '">Отправить</button></div></div></div>';
  }

  /* ---------- «Обзор» ---------- */
  function isoDay(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function monday() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var DONE_ST = ["Сдано", "Закрыто"];
  /* ---------- «Занятость» ---------- */
  var ACTIVE_WORK = ["В проектировании", "Проверка", "Корректировка"];
  var WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  function span(o) { if (o.stage === "Корректировка" && o.fix_start) return [o.fix_start, o.fix_end || o.fix_start]; return [o.plan_start || o.start_date || "", o.plan_end || o.due_date || ""]; }
  /* «Занятость»: бегунок над шкалой и полоса прокрутки двигают одно и то же окно; подпись — видимые даты.
     Открывается на выбранной дате (60 дней прошлого левее); после перерисовки — там же, где смотрели. */
  function fitLoadScroll() {
    var gp = document.querySelector("#cal-app .gpanel"), rg = document.getElementById("ldRange"), lab = document.getElementById("ldWin");
    if (!gp || !rg) return;
    var days = [].slice.call(gp.querySelectorAll(".ghead .gday")), name = gp.querySelector(".ghead .gname");
    if (!days.length) return;
    var cw = days[1] ? days[1].getBoundingClientRect().left - days[0].getBoundingClientRect().left : days[0].offsetWidth;
    if (!(cw > 0) || !gp.clientWidth) { ldWhenShown(gp); return; }      // экран ещё скрыт (ширина 0): прокрутим, когда его покажут
    var max = Math.max(0, gp.scrollWidth - gp.clientWidth);
    gp.scrollLeft = S.ldScroll != null ? S.ldScroll : Math.min(max, Math.round(60 * cw));
    rg.max = String(max); rg.value = String(gp.scrollLeft); rg.disabled = !max;
    var label = function () {
      var vis = gp.clientWidth - (name ? name.getBoundingClientRect().width : 0);
      var a = Math.max(0, Math.round(gp.scrollLeft / cw)), b = Math.min(days.length - 1, Math.round((gp.scrollLeft + vis) / cw) - 1);
      var t = function (el) { return el.getAttribute("data-d") || ""; };
      if (lab) lab.textContent = dmy(t(days[a])).slice(0, 5) + " — " + dmy(t(days[Math.max(a, b)]));
    };
    gp.onscroll = function () { if (!gp.clientWidth) return; S.ldScroll = gp.scrollLeft; rg.value = String(gp.scrollLeft); label(); };      // скрытие экрана сбрасывает прокрутку в 0 — это не выбор пользователя
    rg.oninput = function () { gp.scrollLeft = +rg.value; };
    label();
  }
  /* «Занятость» отрисована в скрытом разделе: ждём, когда шкала получит ширину, и ставим её на выбранную дату */
  function ldWhenShown(gp) {
    if (gp._ldWait) return; gp._ldWait = 1;
    var go = function () {
      if (!gp.isConnected) { if (ro) ro.disconnect(); return true; }      // экран уже перерисован — эта шкала больше не нужна
      if (!gp.clientWidth) return false;
      if (ro) ro.disconnect(); fitLoadScroll(); return true;
    };
    var ro = window.ResizeObserver ? new ResizeObserver(function () { go(); }) : null;
    if (ro) ro.observe(gp);
    else (function poll() { if (gp.isConnected && !go()) requestAnimationFrame(poll); })();
  }
  /* разделы-подзадачи (ВПВ, АУП …) в «Занятости» — отдельные полосы у своих исполнителей; без исполнителя — серые в «Не назначено» */
  var PART_ST = ["Готов к проектированию", "В проектировании", "Проверка", "Корректировка"];
  function partItem(o, p) {
    return { id: o.id, number: o.number, object: "Раздел " + p.system + " · " + (o.object || ""), customer: o.customer, executor_id: p.executor_id, executor: p.executor,
      stage: p.executor_id && PART_ST.indexOf(o.stage) >= 0 ? "В проектировании" : o.stage, plan_start: p.plan_start, plan_end: p.plan_end, start_date: o.start_date,
      due_date: p.plan_end || o.due_date, left_days: p.left_days != null ? p.left_days : o.left_days, urgent: o.urgent, systems: [p.system], parts: [], part: p };
  }
  function loadOrders() {
    var base = pos() === "designer" ? (S.lo || []) : (S.orders || []), out = [];
    base.forEach(function (o) { out.push(o); (o.parts || []).forEach(function (p) { if (!p.delivered) out.push(partItem(o, p)); }); });
    return out;
  }
  function staffAll() {
    var by = {};
    (S.people || []).forEach(function (u) { by[u.name] = { id: u.id, name: u.name, pos: u.position }; });
    loadOrders().forEach(function (o) { if (o.executor && !by[o.executor]) by[o.executor] = { id: o.executor_id, name: o.executor }; });
    return Object.keys(by).map(function (k) { return by[k]; });
  }
  function ldSel() {
    if (S.ldSel === undefined) { try { S.ldSel = JSON.parse(localStorage.getItem("ds_ldsel") || "null"); } catch (e) { S.ldSel = null; } }
    return S.ldSel;
  }
  function staff() {
    var all = staffAll(), sel = ldSel();
    if (sel) return all.filter(function (u) { return sel.indexOf(u.name) >= 0; });
    return all.filter(function (u) { return u.pos === "designer" || u.pos === "design" || loadOrders().some(function (o) { return (o.executor_id === u.id || o.executor === u.name) && ACTIVE_WORK.indexOf(o.stage) >= 0; }); });
  }
  function loadScreen() {
    var p = pos(), people = staff(), mon = monday(), today = isoDay(new Date());
    var canEdit = p === "owner" || p === "design";
    var READY = "Готов к проектированию";
    var act_ = loadOrders().filter(function (o) { return (ACTIVE_WORK.indexOf(o.stage) >= 0 || o.stage === READY) && o.executor; });      // назначенные, но ещё не начатые — тоже у исполнителя
    var unassigned = loadOrders().filter(function (o) { return (o.stage === "Готов к проектированию" || ACTIVE_WORK.indexOf(o.stage) >= 0) && !o.executor; });      // и корректировка/проверка без исполнителя (например, «Сразу на корректировку»)
    var cards = people.map(function (u) {
      var mine = act_.filter(function (o) { return o.executor_id === u.id || o.executor === u.name; });
      var late = mine.filter(function (o) { return o.left_days != null && o.left_days < 0; }).length;
      var wait = mine.filter(function (o) { return o.stage === READY; }).length;
      return '<div class="panel person" style="display:flex;gap:12px;align-items:center;padding:13px 15px">' + ava(u.name, "lg") + "<div><b>" + E(u.name) + '</b><br><small style="color:var(--muted)">' + (mine.length - wait) + " активн." + (wait ? " · " + wait + " не начато" : "") + (late ? ' · <span style="color:var(--bad)">' + late + " просроч.</span>" : "") + "</small></div></div>";
    }).join("") + '<div class="panel person" style="display:flex;gap:12px;align-items:center;padding:13px 15px"><span class="ava lg" style="background:var(--line);color:var(--muted)">?</span><div><b>Не назначено</b><br><small style="color:var(--muted)">' + unassigned.length + " без исполнителя</small></div></div>";
    var head = '<div class="head"><div><h1>Занятость</h1><p>Кто чем занят. Серым показаны задачи без исполнителя.' + (canEdit ? " Нажмите на любую полоску: можно назначить исполнителя и сроки прямо здесь." : "") + '</p></div>'
      + '<div class="seg"><button data-ld="week" class="' + (S.ld === "week" ? "on" : "") + '">План на неделю</button><button data-ld="tl" class="' + (S.ld === "tl" ? "on" : "") + '">Месяц</button></div></div>'
      + "";
    var cardsHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">' + cards + "</div>", headBase = head;
    head += cardsHtml;
    // проектировщик открывает окно своих задач (тех, что ему доступны); задачи коллег — только для просмотра
    var openAttr = function (o) { return p !== "designer" || find(o.id) ? "data-open" : "data-ro"; };
    if (S.ld === "week") {
      var wkDays = []; for (var i = 0; i < 7; i++) wkDays.push(isoDay(addDays(mon, i)));
      var lbl = dmy(wkDays[0]).slice(0, 5) + " — " + dmy(wkDays[6]).slice(0, 5);
      return head + '<div class="wk" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">' + people.map(function (u) {
        var mine = act_.filter(function (o) { return o.executor_id === u.id || o.executor === u.name; });
        return '<div class="panel"><div style="display:flex;gap:10px;align-items:center;padding:13px 15px;background:var(--surface-2);border-bottom:1px solid var(--line)">' + ava(u.name) + '<div style="flex:1"><b>' + E(u.name) + '</b><br><small style="color:var(--muted)">' + mine.length + " в плане · " + lbl + "</small></div></div>"
          + (mine.map(function (o) {
            var sp = span(o), tn = tone(o);
            return '<button style="display:block;width:100%;text-align:left;padding:11px 15px;border-bottom:1px solid var(--line)" ' + openAttr(o) + '="' + o.id + '"><div style="display:flex;gap:10px;align-items:baseline"><span style="font-weight:800;color:var(--brand);font-size:1.15rem">№' + E(o.number) + '</span><span style="font-weight:600">' + E(o.object) + "</span></div>" + sysChips(o, true)
              + '<div style="margin-top:6px"><span class="pill ' + tn + '">' + E(leftText(o.left_days)) + "</span>" + (o.stage === READY ? ' <span class="pill">не начата</span>' : "") + '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:8px">'
              + wkDays.map(function (d) { var on = sp[0] && sp[1] && d >= sp[0] && d <= sp[1]; return '<span title="' + dmy(d).slice(0, 5) + '" style="height:9px;border-radius:3px;border:1px solid ' + (on ? (tn === "bad" ? "var(--bad)" : "var(--brand)") : "var(--line)") + ";background:" + (on ? (tn === "bad" ? "var(--bad)" : "var(--brand)") : "var(--surface-2)") + '"></span>'; }).join("") + "</div></button>";
          }).join("") || '<div class="note" style="padding:14px 15px;margin:0">Задач в плане нет</div>') + "</div>";
      }).join("") + "</div>";
    }
    /* месяц: компактная диаграмма — полосы упакованы по дорожкам, под строкой число задач в день, масштаб меняется вручную */
    // окно: 60 дней прошлого + 35 вперёд от выбранной даты (S.ldo — сдвиг от сегодня); открывается на выбранной дате, прошлое — бегунком влево
    var LD_BACK = 60, off = (S.ldo | 0) - LD_BACK, dim = LD_BACK + 35, iso = [], dow = [];
    for (var k = 0; k < dim; k++) { var dd = addDays(new Date(), off + k); iso.push(isoDay(dd)); dow.push((dd.getDay() + 6) % 7); }
    var z = S.ldz; if (!z) { try { z = +localStorage.getItem("ds_ldz") || 0; } catch (e) { z = 0; } z = z || 0.85; }
    z = Math.max(0.5, Math.min(1.6, z));
    var CW = 27, LW = 150, cols = LW + "px repeat(" + dim + "," + CW + "px)", minw = LW + dim * CW;
    var nav = '<div class="ldnav"><div class="seg"><button data-ldn="-1" title="На месяц назад">← месяц</button><button data-ldn="0"' + (S.ldo ? "" : ' class="on"') + '>Сегодня</button><button data-ldn="1" title="На месяц вперёд">месяц →</button></div>'
      + '<input type="range" class="ldrange" id="ldRange" min="0" max="1000" value="0" title="Прокрутите, чтобы посмотреть прошлые и будущие дни"><span class="ldwin" id="ldWin"></span>'
      + '<span class="grow"></span><span class="vlab">Масштаб</span><div class="seg"><button data-ldz="-1" title="Уменьшить">−</button><button data-ldz="0" title="Сбросить масштаб">' + Math.round(z * 100) + '%</button><button data-ldz="1" title="Увеличить">+</button></div></div>'
      + (p === "owner" || p === "ops" || p === "design" ? '<div class="ldwho"><button class="btn ghost sm" data-ldmenu="1">👥 Кого показывать (' + people.length + ")</button>"
        + (S.ldMenu ? '<div class="ldpop"><b>Показывать в «Занятости»</b>' + staffAll().map(function (u) { var on = people.some(function (x) { return x.name === u.name; }); return '<button type="button" class="ldchk ' + (on ? "on" : "") + '" data-ldp="' + E(u.name) + '"><i>' + (on ? "✓" : "") + "</i>" + E(u.name) + "</button>"; }).join("") + '<button class="btn ghost sm" data-ldmenu="0" style="margin-top:8px">Готово</button></div>' : "") + "</div>" : "");
    var BAR = { work: "#5aa2ee", hot: "#f0924d", late: "#e5483c", done: "#3aa876", gray: "#8794ab" };
    var PAL = ["#4f8ef0", "#e0734a", "#2fa66a", "#8b6fe0", "#d4a017", "#1fb3b3", "#d9568a", "#6f7de0", "#8c9a2a", "#b0632f", "#3c9bd1", "#c24bb0"];
    function barKind(o, un) { if (un) return o.left_days != null && o.left_days < 0 ? "late" : "gray"; if (o.stage === "Сдано" || o.stage === "Закрыто") return "done"; if (o.left_days != null && o.left_days < 0) return "late"; if (o.urgent || (o.left_days != null && o.left_days <= 2)) return "hot"; return "work"; }
    function taskColor(o) { var h = 0; String(o.number || o.id).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return PAL[(h + (+o.id || 0)) % PAL.length]; }
    function cellBg(i, row) {
      var we = dow[i] >= 5, td = iso[i] === today;
      return '<div style="grid-column:' + (i + 2) + ";grid-row:" + row + ";" + (td ? "border-left:2px solid #f0924d;background:color-mix(in srgb,#f0924d 10%,transparent);" : "border-left:1px solid var(--line);" + (we ? "background:color-mix(in srgb,var(--bad) 8%,var(--surface-2));" : "")) + '"></div>';
    }
    function range(o) {                       // индексы начала и конца полосы в окне; null — вне окна
      var sp = span(o), s0 = sp[0] || iso[0], e0 = sp[1] || s0;
      if (!sp[0] && !sp[1]) return null;
      if (!o.hist && (ACTIVE_WORK.indexOf(o.stage) >= 0 || o.stage === READY) && e0 < today) e0 = today;      // срок прошёл, а работа не сдана — занят до сегодня
      if (e0 < iso[0] || s0 > iso[dim - 1]) return null;
      var a_ = Math.max(0, iso.indexOf(s0)); if (s0 < iso[0]) a_ = 0;
      var b_ = iso.indexOf(e0); if (b_ < 0) b_ = e0 > iso[dim - 1] ? dim - 1 : 0;
      if (b_ < a_) b_ = a_;
      return [a_, b_];
    }
    function lanes(list) {                     // жадная упаковка по дорожкам
      var items = list.map(function (o) { return { o: o, r: range(o) }; }).filter(function (x) { return x.r; }).sort(function (x, y) { return x.r[0] - y.r[0]; });
      var ends = [];
      items.forEach(function (x) {
        var ln = 0; while (ln < ends.length && ends[ln] >= x.r[0]) ln++;
        ends[ln] = x.r[1]; x.lane = ln;
      });
      return { items: items, n: Math.max(1, ends.length) };
    }
    function barEl(x, un) {
      var o = x.o, kind = barKind(o, un), a_ = x.r[0], b_ = x.r[1], sp = span(o);
      if (o.hist) {                            // сделано раньше (по журналу задачи) — бледная полоса
        var HK = { work: "✓ ", fix: "↻ К" + (o.fix_n || "") + " · ", review: "👁 проверка · " }, HN = { work: "проектирование", fix: "корректировка", review: "проверка" };
        return '<div ' + openAttr(o) + '="' + o.id + '" title="' + E("№" + o.number + " · " + (o.object || "") + " · " + HN[o.hist] + " · " + dmy(o.plan_start) + " — " + dmy(o.plan_end) + " · " + o.who + " · сделано")
          + '" style="grid-column:' + (a_ + 2) + "/" + (b_ + 3) + ";grid-row:" + (x.lane + 1) + ";background:" + taskColor(o) + ';opacity:.5" class="gbar hist">'
          + HK[o.hist] + "№" + E(o.number) + " · " + E(o.object || "") + "</div>";
      }
      var wait = !un && o.stage === READY;                                  // назначена, но ещё не начата — пунктиром
      return '<div ' + openAttr(o) + '="' + o.id + '" title="' + E("№" + o.number + " · " + (o.object || "") + " · " + dmy(sp[0] || iso[0]) + " — " + dmy(sp[1] || sp[0] || iso[0]) + " · " + (o.executor || "не назначен") + " · " + o.stage + (o.left_days != null && o.left_days < 0 ? " · просрочено " + (-o.left_days) + " дн." : "")) + '" style="grid-column:' + (a_ + 2) + "/" + (b_ + 3) + ";grid-row:" + (x.lane + 1) + ";background:" + (un ? BAR.gray : kind === "done" ? BAR.done : taskColor(o)) + (un ? ";color:#fff;opacity:.85" : "") + (wait ? ";opacity:.6;outline:2px dashed rgba(255,255,255,.75);outline-offset:-3px" : "") + (kind === "late" ? ";box-shadow:inset 0 0 0 2px #e5483c,0 0 0 1px #e5483c" : kind === "hot" ? ";box-shadow:inset 4px 0 0 #f0924d" : "") + '" class="gbar' + (o.stage === "Корректировка" ? " fix" : "") + '">'
        + (o.stage === "Корректировка" ? "↻ К" + (o.fix_n || "") + " · " : wait ? "не начата · " : "") + "№" + E(o.number) + " · " + (!o.part && sysText(o) ? "<b>" + E(sysText(o)) + "</b> · " : "") + E((o.object || "").split(",")[0]) + "</div>";
    }
    var header = '<div class="ghead" style="grid-template-columns:' + cols + ';min-width:' + minw + 'px"><div class="gname">Сотрудник</div>'
      + iso.map(function (d, i) {
        var td = d === today, we = dow[i] >= 5;
        return '<div class="gday' + (td ? " today" : "") + (we ? " we" : "") + '" data-d="' + d + '"><small>' + WD[dow[i]] + "</small><b>" + (td ? "<i>" + (+d.slice(8, 10)) + "</i>" : (+d.slice(8, 10))) + "</b></div>";
      }).join("") + "</div>";
    function person(u) {
      var color = personColor(u.name);
      var mine = loadOrders().filter(function (o) { return (o.executor_id === u.id || o.executor === u.name) && (ACTIVE_WORK.indexOf(o.stage) >= 0 || o.stage === READY || o.stage === "На согласовании" || o.stage === "Сдано" || o.stage === "Закрыто"); });      // закрытые — чтобы было видно прошлое
      var past = (S.lh || []).filter(function (h) { return h.user_id === u.id || h.who === u.name; }).map(function (h) {
        return { id: h.order_id, number: h.number, object: h.object, stage: "", plan_start: h.start, plan_end: h.end, hist: h.kind, fix_n: h.fix_n, who: h.who };
      }).filter(function (h) { return !mine.some(function (o) { var sp = span(o); return o.id === h.id && sp[0] && h.plan_end >= sp[0]; }); });      // не дублируем текущий план той же задачи
      var L = lanes(mine.concat(past)), load = iso.map(function () { return 0; });
      L.items.forEach(function (x) { for (var i = x.r[0]; i <= x.r[1]; i++) load[i]++; });
      var rows = L.n + 1;
      var until = ""; mine.forEach(function (o) { if (o.stage === "Сдано") return; var e_ = span(o)[1] || span(o)[0]; if (e_ && e_ > until) until = e_; });
      var bg = "";
      for (var r = 1; r <= rows; r++) bg += iso.map(function (d, i) { return cellBg(i, r); }).join("");
      var strip = load.map(function (n, i) { return n ? '<span class="gl" style="grid-column:' + (i + 2) + ";grid-row:" + rows + ";background:" + (n >= 3 ? "#e5483c" : "#8794ab") + '" title="' + n + ' задач(и) в день"></span>' : ""; }).join("");
      var nm = '<div class="gname gp" style="grid-row:1/span ' + rows + '"><span class="ava sm" style="background:' + color + '">' + E(u.name[0]) + "</span><span class=\"gnm\"><b>" + E(u.name) + "</b>" + (until ? "<small class=\"red\">Загружен до " + dmy(until).slice(0, 5) + "</small>" : "<small>свободен</small>") + "</span></div>";
      return '<div class="grow2" style="grid-template-columns:' + cols + ";grid-template-rows:repeat(" + (rows - 1) + ',24px) 8px;min-width:' + minw + 'px">' + nm + bg + L.items.map(function (x) { return barEl(x, false); }).join("") + strip + "</div>";
    }
    var UL = lanes(unassigned);
    var unBlock = unassigned.length ? (function () {
      var rows = UL.n, bg = "";
      for (var r = 1; r <= rows; r++) bg += iso.map(function (d, i) { return cellBg(i, r); }).join("");
      return '<div class="grow2 gun" style="grid-template-columns:' + cols + ";grid-template-rows:repeat(" + rows + ',24px);min-width:' + minw + 'px"><div class="gname gp" style="grid-row:1/span ' + rows + '"><span class="ava sm" style="background:var(--line);color:var(--muted)">?</span><b style="color:var(--muted)">Не назначены</b></div>'
        + bg + UL.items.map(function (x) { return barEl(x, true); }).join("") + "</div>";
    })() : "";
    var nodates = loadOrders().filter(function (o) { return (ACTIVE_WORK.indexOf(o.stage) >= 0 || o.stage === READY) && !span(o)[0] && !span(o)[1]; });      // и неназначенные
    var legend = '<div class="glegend"><span>Цвет полосы — своя у каждой задачи</span><span><i style="background:#8794ab;opacity:.5"></i>Бледные — уже сделано: ✓ проектирование, ↻ корректировка, 👁 проверка</span><span><i style="background:' + BAR.hot + '"></i>Оранжевая кромка — горит</span><span><i style="background:' + BAR.late + '"></i>Красная рамка — просрочено</span><span><i style="background:' + BAR.done + '"></i>Сдано</span>'
      + '<span><i style="background:' + BAR.gray + '"></i>Серые — без исполнителя («Готов к проектированию», проверка, корректировка): от даты постановки до последнего дня договора</span><span><i style="background:#8794ab;opacity:.6;outline:1px dashed #fff;outline-offset:-2px"></i>Пунктир — исполнитель назначен, работа не начата</span><span>Срок прошёл, а работа не сдана — полоса тянется до сегодня</span><span class="muted">Полоска снизу — число задач в день (красная ≥ 3)</span></div>'
      + (nodates.length ? '<div class="glegend">Без дат (не на шкале): ' + nodates.map(function (o) { return '<a href="#/task/' + o.id + '">№' + E(o.number || "—") + "</a>"; }).join(" ") + "</div>" : "");
    var bodyHtml = people.map(person).join("") + unBlock;
    return headBase + nav + '<div class="panel gpanel"><div style="zoom:' + z + '">' + header + (bodyHtml || '<div class="note" style="padding:16px;margin:0">Задач в плане нет</div>') + "</div></div>" + legend;
  }
  /* «Работа → Занятость» по макету (Ч2) — web/work_load.js; при DS_WORK = false — прежний экран loadScreen() */
  function workLoad() { return !!(window.DS_WORK && window.DSWorkLoad); }
  /* «Работа → Конвейер» (Ч1) — web/work_conv.js, «Работа → Как работаем» (Ч5) — web/work_how.js; при DS_WORK = false — прежние «Задачи» и «Конвейер заказа».
     У проектировщика и бухгалтера (DS_WORK_OWN) Конвейер — только по адресу #/conv: #/ у них остаётся «Мои проекты» / «Закрытие». */
  function workConv() { return !!(window.DS_WORK && window.DSWorkConv && (!(window.DS_WORK_OWN || {})[pos()] || S.cvRoute)); }
  function workHow() { return !!(window.DS_WORK && window.DSWorkHow); }
  DS.cvCtx = function () { return { S: S, api: api, load: load, paint: paint, find: find, card: card, screen: screen, can: can, pos: pos, projPos: projPos, ava: ava, E: E, dmy: dmy, plural: plural, money: money,
    leftText: leftText, sysText: sysText, toast: toast, kpNo: kpNo, kpTone: kpTone, fullCtl: fullCtl, taskCtl: taskCtl, ic: ic, STAGE_COLOR: STAGE_COLOR }; };
  DS.ldCtx = function () { return { S: S, api: api, load: load, paint: paint, find: find, span: span, staff: staff, staffAll: staffAll, toast: toast, ava: ava, pos: pos, sysText: sysText, PAUSE: PAUSE, isoDay: isoDay }; };
  DS._ctx = { S: S, E: E, dmy: dmy, pos: pos, ava: ava, toast: toast, isoDay: isoDay, monday: monday, api: api, paint: paint, money: money, ic: ic, kpNo: kpNo, loadKp: loadKp, kpAddLine: kpAddLine, makeFolder: makeFolder , leftText: leftText, plural: plural, can: can, find: find, card: card, nowIn: nowIn, folderUrl: folderUrl, kpDone: kpDone, kpStatusLabel: kpStatusLabel, fullCtl: fullCtl, taskCtl: taskCtl, taskAuthor: taskAuthor, taskMine: taskMine, ovRow: ovRow, span: span, DONE_ST: DONE_ST, PAUSE: PAUSE, STAGE_COLOR: STAGE_COLOR, get TZ() { return window.DSCust.TZ; }, get FOLDER_ROOT() { return window.DSRisk.FOLDER_ROOT; }, ackMine: ackMine, ackWhen: ackWhen, taskCard: taskCard, kpCard: kpCard, kpTone: kpTone, taskTone: taskTone, sysText: sysText, paused: paused, pauseText: pauseText, OE_FIELD: OE_FIELD, PAUSE_FROM: PAUSE_FROM, TZ_TAB: TZ_TAB, busyNow: busyNow, callBtn: callBtn, callsPanel: callsPanel, canMenu: canMenu, closeAll: closeAll, load: load, oeRebase: oeRebase, oeSnap: oeSnap, pauseLate: pauseLate, payPill: payPill, prepaid: prepaid, projPos: projPos, roundsTab: roundsTab, sysChips: sysChips, sysPick: sysPick, taskCallHtml: taskCallHtml, tmHtml: tmHtml, tmRepaint: tmRepaint, tzLabel: tzLabel, tzTab: tzTab, cityNames: cityNames, cityZone: cityZone, callBar: callBar, get BOOT() { return BOOT; }, set BOOT(v) { BOOT = v; } };
  function planHtml() {
    var o = find(S.edit); if (!o) return "";
    var sp = span(o), today = isoDay(new Date()), fx = fixDates(o);
    var people = staff().filter(function (u) { return u.id; });
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.2rem">Назначить сроки · №' + E(o.number) + '</h2><div style="color:var(--muted);font-size:.86rem">' + E(o.object) + '</div></div><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
      + '<div class="fld"><label>Исполнитель</label><select id="pl-who"><option value="0">— не назначен —</option>' + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === o.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
      + '<div class="g2f"><div class="fld"><label>' + (fx ? "Начало корректировки №" + o.fix_n : "Начало работ") + '</label><input id="pl-s" type="date" value="' + E(fx ? o.fix_start || today : o.plan_start || (o.start_date > today ? o.start_date : today)) + '"></div>'
      + '<div class="fld"><label>' + (fx ? "Срок корректировки" : "Срок сдачи") + '</label><input id="pl-e" type="date" value="' + E(fx ? o.fix_end || "" : o.plan_end || o.due_date || "") + '"></div></div>'
      + '<div class="dbox"><small>Что произойдёт</small>' + (o.stage === "Готов к проектированию" ? "Исполнитель получит уведомление «Вам поставлена задача №" + E(o.number) + "», стадия станет «В проектировании»; срок появится в «Занятости» и в окне задачи." : "Изменятся исполнитель и сроки плана; стадия останется прежней.") + "</div>"
      + '<button class="btn primary block" data-saveplan="' + o.id + '">Сохранить</button>'
      + '<button class="btn ghost block" style="margin-top:10px" data-open="' + o.id + '">Открыть окно задачи</button></div></div></div>';
  }
  /* ---------- «Заказчики» — вынесены в web/ds_cust.js (24.11); здесь — точки входа ---------- */
  function custScreen() { return window.DSCust.custScreen(); }
  function saveCustomer() { return window.DSCust.saveCustomer(); }
  function custFilter() { return window.DSCust.custFilter(); }
  function cityNames() { return window.DSTasks.cityNames(); }
  function cityZone(s) { return window.DSTasks.cityZone(s); }
  /* ---------- «План на неделю» проектировщика ---------- */
  function loadWeek() {
    if (!S.wk) S.wk = { start: isoDay(monday()), days: [] };
    return api("/week?start=" + S.wk.start).then(function (d) { S.wk.days = d; }, function () { S.wk.days = []; });
  }
  function dayRec(day) { return (S.wk && S.wk.days || []).filter(function (x) { return x.day === day; })[0] || { day: day, worked: 0, off: 0, comment: "" }; }
  function act2(p, reloadWeek) {
    return p.then(function () { return reloadWeek ? loadWeek() : null; }).then(paint, function (e) { toast(String(e && e.message || e)); });
  }
  /* «Мои задачи» руководителя проектного отдела: корректировки по замечаниям, переданные диалоги; рядом — план недели */
  function myTasksScreen() {
    var items = (S.tasks || []).slice().sort(function (a, b) { return (a.left_days == null ? 999 : a.left_days) - (b.left_days == null ? 999 : b.left_days); });
    var head = '<div class="head"><div><h1>Мои задачи</h1><p>' + (pos() === "norm" ? "Задачи, поставленные вам (например, «Разработка пожарного риска»), и диалоги, которые вам передали." : "Личные задачи: корректировки по замечаниям заказчиков и диалоги, которые вам передали.") + ' Выполненные уходят из списка.</p></div></div>';
    if (!items.length) return head + '<div class="panel pad"><p class="sub" style="margin:0">Личных задач пока нет.</p></div>';
    return head + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">' + items.map(taskCard).join("") + "</div>";
  }
  function weekScreen() {
    if (pos() === "norm") return myTasksScreen();
    if (pos() !== "design") return weekPlan();
    var tab = S.mt || "tasks", n = (S.tasks || []).length;
    var seg = '<div class="seg" style="margin-bottom:16px"><button data-mt="tasks" class="' + (tab === "tasks" ? "on" : "") + '">Мои задачи' + (n ? " · " + n : "") + '</button><button data-mt="week" class="' + (tab === "week" ? "on" : "") + '">План на неделю</button></div>';
    return seg + (tab === "tasks" ? myTasksScreen() : weekPlan());
  }
  function weekPlan() {
    var p = pos(), me = C && C.me ? C.me.id : 0, days = (S.wk && S.wk.days) || [], today = isoDay(new Date());
    var mine = (S.orders || []).filter(function (o) { return o.executor_id === me && ACTIVE_WORK.indexOf(o.stage) >= 0; });
    var off = days.filter(function (d) { return d.off; }).length, done = days.filter(function (d) { return d.worked && !d.off; }).length, work = 7 - off;
    var lbl = days.length ? dmy(days[0].day).slice(0, 5) + " — " + dmy(days[6].day).slice(0, 5) : "";
    var head = '<div class="head"><div><h1>План на неделю</h1><p>Отмечайте отработанные дни, выходные назначаете сами. Комментарий под днём увидит руководитель в недельном отчёте.</p></div>'
      + '<div class="seg"><button data-wnav="-1">← Пред.</button><button data-wnav="0" class="on">' + lbl + '</button><button data-wnav="1">След. →</button></div></div>'
      + ""
      + '<div class="tiles" style="margin-bottom:16px"><div class="tile" style="--c:var(--ok)"><div class="n">' + done + " из " + work + '</div><div class="l">Рабочих дней отработано</div></div>'
      + '<div class="tile" style="--c:var(--accent)"><div class="n">' + off + '</div><div class="l">Отдыхал(а) на неделе, дн.</div></div>'
      + '<div class="tile" style="--c:var(--brand)"><div class="n">' + mine.length + '</div><div class="l">Проектов в работе</div></div></div>';
    var WN = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    return head + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">' + days.map(function (d, i) {
      var tasks = mine.filter(function (o) { var sp = span(o); return sp[0] && sp[1] && d.day >= sp[0] && d.day <= sp[1] && !d.off; });
      return '<div class="panel" style="padding:12px;display:flex;flex-direction:column;gap:9px;min-height:260px;' + (d.day === today ? "border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset;" : "") + (d.off ? "background:var(--surface-2);opacity:.92;" : "") + '">'
        + '<div style="display:flex;justify-content:space-between"><b>' + WN[i] + '</b><small style="color:var(--muted)">' + dmy(d.day).slice(0, 5) + "</small></div>"
        + (d.off ? '<div style="height:40px;border-radius:12px;background:var(--line);display:grid;place-items:center;font-weight:700;color:var(--muted);font-size:.86rem">Выходной</div>'
          : tasks.map(function (o) { return '<div role="button" data-open="' + o.id + '" title="Открыть задачу" style="cursor:pointer;border:1px solid var(--line);border-left:4px solid var(--brand);background:var(--surface-2);border-radius:10px;padding:7px 9px;font-size:.82rem"><b>№' + E(o.number) + "</b> " + E((o.object || "").split(",")[0]) + "</div>"; }).join("")
            + '<button data-wmark="' + d.day + '" style="height:40px;border-radius:12px;font-weight:800;font-size:.86rem;' + (d.worked ? "border:1.5px solid var(--ok);background:var(--ok-soft);color:var(--ok)" : "border:1.5px dashed var(--accent);color:#d0702f") + '">' + (d.worked ? "✓ Отработал(а)" : "Отметить отработанным") + "</button>")
        + '<textarea data-wc="' + d.day + '" placeholder="Комментарий к дню…" style="width:100%;min-height:62px;border:1px solid var(--line);border-radius:10px;padding:7px 9px;font-size:.8rem;resize:vertical;background:var(--surface);color:var(--ink)">' + E(d.comment || "") + "</textarea>"
        + '<button data-woff="' + d.day + '" style="font-size:.76rem;color:var(--muted);text-decoration:underline;text-align:center">' + (d.off ? "Снять выходной" : "Сделать выходным") + "</button></div>";
    }).join("") + "</div>";
  }
  /* ---------- реестр КП, конструктор КП, договор ---------- */
  var KP_TONE = { "Обращение": "info", "Сбор вводных": "info", "КП отправлено": "info", "Доки отправлены": "sys", "В предоплате": "warn", "В работе": "ok", "В постоплате": "warn", "Закрыто": "muted", "Отказ": "bad" };
  var KP_FUNNEL = ["КП отправлено", "Доки отправлены", "В предоплате", "В работе", "В постоплате", "Закрыто", "Отказ"];      // в реестре КП этапы «Обращение» и «Сбор вводных» не показываются
  var KP_MANUAL = ["КП отправлено", "Доки отправлены", "В предоплате", "В работе", "В постоплате", "Закрыто", "Отказ"];
  var KP_ORDER_MANUAL = ["В постоплате", "Закрыто", "Отказ"];             // КП, по которому уже есть задача: этапы идут сами по задаче и 1С, оплату отмечает бухгалтер
  function kpDone(k) { return ["В работе", "В постоплате", "Закрыто", "Отказ"].indexOf(k.status) >= 0; }      // продажа завершена: деньги пришли или отказ
  function kpStatusLabel(s) { return s === "Обращение" || s === "Сбор вводных" ? "Черновик" : s; }
  /* сколько ждём: «В предоплате» — аванс (без аванса — всю сумму), «В постоплате» — остаток; сколько получено — по отметкам оплат */
  function kpWait(k) { return k.status === "В предоплате" ? (k.has_adv ? (k.adv_paid ? 0 : k.adv_sum) : k.amount) : k.status === "В постоплате" ? (k.post_paid ? 0 : k.post_sum) : 0; }
  function kpPaid(k) { return (k.adv_paid ? k.adv_sum || 0 : 0) + (k.post_paid ? k.post_sum || 0 : 0); }
  var PAYS = [["adv50", "Аванс 50%, остаток по акту"], ["adv30", "Аванс 30%, остаток по акту"], ["adv100", "100% аванс"], ["post100", "100% по акту"], ["custom", "Свой процент аванса…"]];
  var PRICE = [];
  var CT_TYPES = ["Проектирование СПС, СОУЭ", "Проектирование АУП, ВПВ", "Проектирование (комплекс)", "Обследование объекта", "Расчёт пожарного риска, категорирование", "Разработка исполнительной документации"];
  function loadKp() {
    if (BOOT && BOOT.kp) return BOOT.kp;
    return api("/kp").then(function (k) { S.kp = k; }, function (e) { S.kp = []; S.err = String(e); });
  }
  function openKpCard(k) {
    S.kpHot = k.id;
    var basis;
    try { basis = JSON.parse(k.pay_basis || "{}"); } catch (e) { basis = {}; }
    if (basis.scope && basis.scope !== (kpBasisOptions(k.status).length === 2 ? "pre" : "post")) basis = {};
    S.ke = { id: k.id, k: k, sale_prob: k.sale_prob || "", pay_basis_event: basis.event || "", pay_basis_date: basis.date || "",
      pay_basis_event0: basis.event || "", pay_basis_date0: basis.date || "", number: k.number, customer_id: k.customer_id || 0, customer_text: k.customer_text || "", object: k.object || "", services: k.services || [], comment: k.comment || "", amount: k.amount, adv_sum: k.adv_sum, lead_date: k.lead_date || k.issued_date || "", status_date: k.status_date || "", status_date0: k.status_date || "", manager_id: k.manager_id || 0, status: k.status, status0: k.status,
      pay_prob: k.pay_prob || "", pay_expect: k.pay_expect || "", next_contact: k.next_contact || "", refuse_reason: k.refuse_reason || "", refuse_back: k.refuse_back || "", refuse_note: k.refuse_note || "", order_id: k.order_id, order0: k.order_id, adv_date: k.adv_paid ? k.adv_date : "", adv_date0: k.adv_paid ? k.adv_date : "", systems: String(k.systems || "").split("|").filter(Boolean), err: "" };
    setModal(keHtml());
    if (!S.orders) load().then(function () { if (S.ke) setModal(keHtml()); });
    if (S.assignable == null) api("/users/assignable").then(function (u) { S.assignable = u; if (S.ke) setModal(keHtml()); }, function () { S.assignable = []; });
  }
  /* окно таблицы реестра КП заканчивается у нижнего края экрана: горизонтальная полоса прокрутки всегда на виду */
  function fitKpWrap() {
    var w = document.querySelector(".kpwrap"); if (!w || innerWidth <= 760) return;
    w.style.maxHeight = Math.max(260, innerHeight - (w.getBoundingClientRect().top + scrollY) - 18) + "px";
  }
  addEventListener("resize", fitKpWrap);
  var KP_PROB_RU = { high: "высокая", mid: "средняя", low: "низкая" };
  function kpDays(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5); }
  function kpDue(k) { return k.status === "В предоплате" || k.status === "КП отправлено" || k.status === "Доки отправлены" ? (k.has_adv ? k.adv_sum || 0 : k.amount || 0) : kpWait(k) || k.amount || 0; }
  /* «⭐ Следим»: заказчик обещал оплату — к какому дню, вероятность, что обещали */
  function kwHtml() {
    var w = S.kw, k = (S.kp || []).filter(function (x) { return x.id === w.id; })[0]; if (!k) return "";
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(420px,100%);height:auto;max-height:92vh;border-radius:18px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.1rem">⭐ Следим за ' + E(kpNo(k.number)) + "</h2><div style=\"color:var(--muted);font-size:.86rem\">" + E(k.customer || "") + " · " + E(money(kpDue(k))) + '</div></div><button class="x" data-kwclose="1" aria-label="Закрыть">✕</button></div></div>'
      + '<div class="m-body" style="padding:16px 20px">'
      + '<div class="fld"><label>Обещали оплатить к</label><input type="date" id="kwDate" value="' + E(w.date) + '"></div>'
      + '<div class="fld"><label>Вероятность</label><div class="kwseg">' + [["high", "высокая"], ["mid", "средняя"], ["low", "низкая"]].map(function (x) {
          return '<button type="button" class="btn sm ' + (w.prob === x[0] ? "primary" : "ghost") + '" data-kwp="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div></div>"
      + '<div class="fld"><label>Что обещали (коротко)</label><input id="kwNote" maxlength="300" placeholder="Например: счёт у бухгалтера, оплатят до пятницы" value="' + E(w.note) + '"></div>'
      + (w.err ? '<div class="note" style="color:var(--bad)">' + E(w.err) + "</div>" : "")
      + '<div style="display:flex;gap:8px;justify-content:space-between;margin-top:6px">' + (k.watch ? '<button class="btn ghost" data-kwoff="1">Не следить</button>' : "<span></span>")
      + '<button class="btn primary" data-kwsave="1">Сохранить</button></div></div></div></div>';
  }
  function kwSave(off) {
    var w = S.kw; w.date = (document.getElementById("kwDate") || {}).value || ""; w.note = (document.getElementById("kwNote") || {}).value || "";
    var body = off ? { watch: 0 } : { watch: 1, pay_expect: w.date, pay_prob: w.prob || "", watch_note: w.note };
    api("/kp/" + w.id + "/edit", body).then(function () { S.kw = null; setModal(""); return loadKp(); })
      .then(function () { toast(off ? "Больше не следим" : "⭐ Следим: напомним в день обещанной оплаты"); paint(); }, function (e) { if (S.kw) { S.kw.err = String(e); setModal(kwHtml()); } });
  }
  /* быстрое окно «Следующий контакт» из реестра КП (✎ у колонки) */
  function kncBD(n) { var d = new Date(); d.setHours(0, 0, 0, 0); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; } return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function kncHtml() {
    var w = S.knc, k = (S.kp || []).filter(function (x) { return x.id === w.id; })[0]; if (!k) return "";
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(420px,100%);height:auto;max-height:92vh;border-radius:18px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.1rem">Следующий контакт · ' + E(kpNo(k.number)) + "</h2><div style=\"color:var(--muted);font-size:.86rem\">" + E(k.customer || "") + '</div></div><button class="x" data-kncclose="1" aria-label="Закрыть">✕</button></div></div>'
      + '<div class="m-body" style="padding:16px 20px">'
      + '<div class="fld"><label>Дата следующего контакта</label><input type="date" id="kncDate" value="' + E(w.date) + '"></div>'
      + '<div class="fld"><label>Быстро: через</label><div class="kwseg">' + [["Завтра", 1], ["3 р.д.", 3], ["5 р.д.", 5], ["2 недели", 10], ["Месяц", 21]].map(function (x) {
          return '<button type="button" class="btn sm ghost" data-kncd="' + x[1] + '">' + x[0] + "</button>"; }).join("") + "</div></div>"
      + (w.err ? '<div class="note" style="color:var(--bad)">' + E(w.err) + "</div>" : "")
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button class="btn ghost" data-kncclose="1">Отмена</button><button class="btn primary" data-kncsave="1">Сохранить</button></div></div></div></div>';
  }
  function kncSave() {
    var w = S.knc; w.date = (document.getElementById("kncDate") || {}).value || "";
    if (!w.date) { w.err = "Выберите дату"; setModal(kncHtml()); return; }
    api("/kp/" + w.id + "/edit", { next_contact: w.date }).then(function () { S.knc = null; setModal(""); return loadKp(); })
      .then(function () { toast("Следующий контакт: " + dmy(w.date)); paint(); }, function (e) { if (S.knc) { S.knc.err = String(e); setModal(kncHtml()); } });
  }
  function kpIsLate(k) { return k.last_days != null && k.last_days > 5 && !kpDone(k); }
  function kpArchived(k) { return k.status === "Закрыто" || k.status === "Отказ"; }      // закрытые и отказы — в архиве
  var KP_CSS = ".ds .kpstar{border:0;background:none;color:var(--muted);font-size:1.05rem;line-height:1;padding:0 5px 0 0;cursor:pointer;vertical-align:-1px}.ds .kpstar.on{color:#e0a800}"
    + ".ds .kpt tr.kpwatch td{background:color-mix(in srgb,#f5c542 7%,var(--surface))}.ds .kpt tr.kpwatch td:first-child{box-shadow:inset 4px 0 0 #e0a800}.ds .kpt tr.kpwatch.wlate td:first-child{box-shadow:inset 4px 0 0 var(--bad)}"
    + ".ds .kpt tr.kpsep td{background:var(--surface-2);color:var(--muted);font-size:.72rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase;text-align:left;padding:4px 10px}"
    + ".ds .kpprom{display:inline-flex;flex-direction:column;gap:1px;border-radius:9px;padding:3px 8px;font-weight:700;background:color-mix(in srgb,#f5c542 18%,transparent);color:#b88600;white-space:normal;max-width:190px}"
    + ".ds .kpprom.today{background:var(--ok-soft);color:var(--ok)}.ds .kpprom.late{background:var(--bad-soft);color:var(--bad)}.ds .kpprom small{font-weight:600;opacity:.85}.ds .kpnone{color:var(--muted)}"
    + ".ds .kpstar-chip{background:color-mix(in srgb,#f5c542 18%,transparent);color:#b88600;border-color:#e0a800!important}"
    + ".ds .kwseg{display:flex;gap:6px}.ds .kwseg button{flex:1}"
    + ".ds .kpdte{border:0;background:none;color:var(--muted);font-size:.85rem;cursor:pointer;padding:0 2px;vertical-align:-1px}.ds .kpdte:hover{color:var(--blue)}"
    + ".ds .kphead{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.ds .kphead h1{flex:none;margin:0;cursor:help}"
    + ".ds .kpfun.cmp{flex:1 1 380px;min-width:0;justify-content:center;gap:5px}.ds .kpfun.cmp .pill{min-height:0;height:auto;padding:4px 10px;flex-direction:row;font-size:.76rem;line-height:1.25}"
    + ".ds .kpbar{display:flex;align-items:center;justify-content:space-between;gap:10px 18px;flex-wrap:wrap;margin:0 0 10px}.ds .kpbar .kpflt{margin:0}"
    + ".ds .kptot.cmp{display:flex;gap:16px;flex-wrap:wrap;margin:0}.ds .kptot.cmp div{border:0;padding:0;background:none}.ds .kptot.cmp small{display:inline;margin-right:5px}.ds .kptot.cmp b{display:inline;font-size:.95rem;margin:0}"
    + ".ds .kpfun .kpst{cursor:pointer;border:1px solid transparent}.ds .kpfun .kpst.on{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-soft)}"
    + ".ds .kpflt{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:14px}.ds .kpflt label{display:inline;margin:0;font-size:.78rem;color:var(--muted);font-weight:700;text-transform:none}"
    + ".ds .kpflt input,.ds .kpflt select{width:auto!important;flex:0 0 auto;min-width:0;height:auto;border:1px solid var(--line);border-radius:9px;background-color:var(--surface);padding:6px 9px;font-size:.86rem;line-height:1.3}.ds .kpflt select{padding-right:30px}.ds .kpflt .btn{flex:0 0 auto}"
    + ".ds .kptot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.ds .kptot div{border:1px solid var(--line);border-radius:12px;padding:8px 12px;background:var(--surface-2,var(--surface))}"
    + ".ds .kptot small{display:block;color:var(--muted);font-size:.74rem}.ds .kptot b{display:block;font-size:1.05rem;margin-top:2px}"
    + ".ds .kpt td small.kpsd{font-size:.8em;margin-top:3px}.ds .kpt td small.kpw{text-align:center}.ds .kpt td small.kpcm{color:var(--warn,#b7791f)!important;white-space:normal}"
    + ".ds .kpt td.kpa,.ds .kpt td.kpv{text-align:center}.ds .kpacts{display:flex;gap:6px;justify-content:center;flex-wrap:nowrap}.ds .kpt td.nw{min-width:0!important;max-width:none!important;white-space:nowrap!important}.ds .kpt td.ell{min-width:230px!important}.ds .kpt td.lastc{white-space:normal!important;max-width:96px;line-height:1.25}"
    + ".ds .kedocs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ds .kedocs .btn{justify-content:center}.ds .kesvc{border:1px solid var(--line);border-radius:11px;padding:7px 11px;font-size:.86rem;line-height:1.6;background:var(--surface-2,var(--surface))}"
    + ".ds .kesvc div{display:flex;justify-content:space-between;gap:10px}.ds .kesvc span{color:var(--muted);white-space:nowrap}"
    + ".ds .kesys{display:flex;flex-wrap:wrap;gap:6px}.ds .kesys .kpsys{font:inherit;font-size:.82rem;font-weight:600;padding:5px 12px;border-radius:999px;border:1.5px solid #bcc5d1;background:#fff;color:#46515e;cursor:pointer;box-shadow:0 1px 2px rgba(20,30,45,.06)}.ds .kesys .kpsys:hover{border-color:#2a65a0;color:#1b3a5e}.ds .kesys .kpsys.on{color:#fff;box-shadow:0 0 0 3px rgba(42,101,160,.18),0 2px 6px rgba(20,30,45,.18)}"
    + "@media (max-width:760px){.ds .kptot{grid-template-columns:repeat(2,minmax(0,1fr))}.ds .kedocs{grid-template-columns:1fr}}";
  function kpCss() { if (!document.getElementById("ds-kp-css")) { var st = document.createElement("style"); st.id = "ds-kp-css"; st.textContent = KP_CSS; document.head.appendChild(st); } }
  /* фильтр реестра: этап (нажатие в воронке) и период по дате обращения или дате этапа */
  function kpFlt() { return S.kpF || (S.kpF = { st: "", from: "", to: "", by: "d" }); }
  function kpDocs(k, canEdit) {
    var b = '<button class="btn ghost sm" title="КП в PDF" data-doc="' + k.id + ':kp:pdf">КП PDF</button> <button class="btn ghost sm" title="КП в Word" data-doc="' + k.id + ':kp:docx">КП Word</button>';
    if (canEdit && k.contract_number) b += ' <button class="btn ghost sm" title="Договор в PDF" data-doc="' + k.id + ':contract:pdf">Договор PDF</button> <button class="btn ghost sm" title="Договор в Word" data-doc="' + k.id + ':contract:docx">Договор Word</button>';
    return b;
  }
  function kpScreen() {
    kpCss();
    var p = pos(), canEdit = p === "owner" || p === "sales" || p === "ops", all = S.kp || [], f = kpFlt();
    var onecTab = p === "owner" || p === "sales" || p === "ops" || p === "acc";      // вкладка «Оплаты 1С» — у ролей с разделом onec (макет меню РОПа, 17.11)
    var kptabs = onecTab ? '<div class="seg" title="Реестр КП и оплаты из 1С"><button data-kptab="kp" class="' + (S.kpTab !== "onec" ? "on" : "") + '">Реестр КП</button><button data-kptab="onec" class="' + (S.kpTab === "onec" ? "on" : "") + '">Оплаты 1С</button></div>' : "";
    if (S.kpTab === "onec" && onecTab)      // то же содержимое, что у раздела «Оплаты 1С»
      return '<div class="head kphead"><h1>Таблица РОП старая</h1>' + kptabs + '<span style="flex:1"></span>' + onecRunBtn(S.on) + "</div>"
        + (S.on ? "" : '<div class="note">Загрузка оплат из 1С…</div>') + onecBody();
    var dOf = function (k) { return f.by === "s" ? k.status_date || "" : k.lead_date || k.issued_date || ""; };
    var per = all.filter(function (k) { var d = dOf(k); return (!f.from || d >= f.from) && (!f.to || (d && d <= f.to)); });
    var list = per.filter(function (k) { return f.st === "watch" ? k.watch && !kpArchived(k) : f.st ? k.status === f.st : !kpArchived(k); });      // «Все» — в работе, без закрытых и отказов
    var tdy = isoDay(new Date()), wkey = function (k) { return k.watch ? "0" + (k.pay_expect || "9999") : "1"; };
    list = list.map(function (k, i) { return [k, i]; }).sort(function (a, b) { var x = wkey(a[0]), y = wkey(b[0]); return x < y ? -1 : x > y ? 1 : a[1] - b[1]; }).map(function (x) { return x[0]; });
    var watched = per.filter(function (k) { return k.watch && !kpArchived(k); });
    var wLate = watched.filter(function (k) { return k.pay_expect && k.pay_expect < tdy; }).length;
    var kpz = kpFont();
    var nAll = per.filter(function (k) { return !kpArchived(k); }).length;
    var tot = [["КП в выборке", list.length], ["Сумма КП", money(list.reduce(function (a, k) { return a + (k.amount || 0); }, 0))],
      ["Получено", money(list.reduce(function (a, k) { return a + kpPaid(k); }, 0))], ["Ждём оплату", money(list.reduce(function (a, k) { return a + kpWait(k); }, 0))]];
    if (watched.length) tot.push(["⭐ Обещали оплатить", money(watched.reduce(function (a, k) { return a + kpDue(k); }, 0))]);
    if (wLate) tot.push(['<span style="color:var(--bad)">Просрочено обещаний</span>', '<span style="color:var(--bad)">' + wLate + "</span>"]);
    var pills = '<div class="kpfun cmp">'
      + (watched.length ? '<button class="pill kpst kpstar-chip' + (f.st === "watch" ? " on" : "") + '" data-kpst="watch" title="Отмеченные ⭐: заказчик обещал оплату">⭐ Следим · ' + watched.length + " · " + E(money(watched.reduce(function (a, k) { return a + kpDue(k); }, 0))) + "</button>" : "")
      + '<button class="pill info kpst' + (!f.st ? " on" : "") + '" data-kpst="" title="КП в работе, без закрытых и отказов">Все · ' + nAll + "</button>"
      + KP_FUNNEL.map(function (s) {
        var ks = per.filter(function (k) { return k.status === s; }), sum = ks.reduce(function (a, k) { return a + (k.amount || 0); }, 0);
        return '<button class="pill ' + KP_TONE[s] + " kpst" + (f.st === s ? " on" : "") + '" data-kpst="' + E(s) + '" title="' + E(s) + ": " + ks.length + " КП на " + E(money(sum)) + '">' + E(s) + " · " + ks.length + "</button>";
      }).join("") + "</div>";
    // шапка в одну строку: заголовок · воронка · вкладка «Оплаты 1С» · шрифт и «Составить КП» — таблице остаётся больше места по высоте
    var head = '<div class="head kphead"><h1 title="Нажмите на этап — в таблице останутся только его КП. «В работе» создаёт проектную задачу и чат; дальше этапы идут сами: аванс из 1С → «В работе», проект «Сдано» → «В постоплате», оплата по акту → «Закрыто». Красным — КП без общения больше 5 дней">Таблица РОП старая</h1>' + pills + kptabs
      + '<div style="display:flex;gap:10px;align-items:center;flex:none"><div class="seg" title="Размер шрифта таблицы"><button data-kpz="-1">A−</button><button data-kpz="0">' + kpz + ' px</button><button data-kpz="1">A+</button></div>'
      + (canEdit ? '<a class="btn accent" href="#/kpc" style="text-decoration:none">' + ic("plus") + "Составить КП</a>" : "") + "</div></div>";
    var funnel = '<div class="kpbar">'
      + '<div class="kpflt"><label>Период</label><select id="kpBy"><option value="d"' + (f.by === "d" ? " selected" : "") + '>по дате обращения</option><option value="s"' + (f.by === "s" ? " selected" : "") + '>по дате этапа</option></select>'
      + '<label>с</label><input type="date" id="kpFrom" value="' + E(f.from) + '"><label>по</label><input type="date" id="kpTo" value="' + E(f.to) + '">'
      + '<button class="btn ghost sm" data-kpper="month">Этот месяц</button><button class="btn ghost sm" data-kpper="all">Весь период</button></div>'
      + '<div class="kptot cmp">' + tot.map(function (x) { return "<div><small>" + x[0] + "</small><b>" + x[1] + "</b></div>"; }).join("") + "</div></div>";
    var nW = list.filter(function (k) { return k.watch; }).length, sep = function (t) { return '<tr class="kpsep"><td colspan="11">' + t + "</td></tr>"; };
    var rows = list.map(function (k, i) {
      var late = kpIsLate(k), arch = kpArchived(k), wlate = k.watch && k.pay_expect && k.pay_expect < tdy;
      var head_ = nW && nW < list.length ? (i === 0 ? sep("⭐ Следим · " + nW + " — сначала просроченные обещания, потом ближайшие") : i === nW ? sep("Остальные · " + (list.length - nW)) : "") : "";
      var st = '<span class="pill ' + (KP_TONE[k.status] || "info") + '">' + E(kpStatusLabel(k.status)) + "</span>" + (k.status_date ? '<small class="kpsd">с ' + dmy(k.status_date).slice(0, 5) + "</small>" : "");
      var pay = k.has_adv ? "аванс " + money(k.adv_sum) + (k.adv_paid ? " ✓" : "") : "по акту";
      var prom = !k.watch ? '<span class="kpnone">—</span>' : '<span class="kpprom' + (wlate ? " late" : k.pay_expect === tdy ? " today" : "") + '"' + (k.watch_note ? ' title="' + E(k.watch_note) + '"' : "") + ">"
        + (!k.pay_expect ? "дата не указана" : k.pay_expect === tdy ? "сегодня" : (wlate ? "к " + dmy(k.pay_expect).slice(0, 5) + " · просрочено " + plural(kpDays(k.pay_expect, tdy), ["день", "дня", "дней"]) : "к " + dmy(k.pay_expect).slice(0, 5) + " · через " + plural(kpDays(tdy, k.pay_expect), ["день", "дня", "дней"])))
        + (k.pay_prob ? "<small>вероятность: " + E(KP_PROB_RU[k.pay_prob] || k.pay_prob) + "</small>" : "") + "</span>";      // комментарий к обещанию — в графе «Объект / услуги / комментарий»
      var acts = canEdit ? '<div class="kpacts">' + (arch ? "" : '<button class="btn ghost sm" data-kptouch="' + k.id + '" title="Записать касание: чем было и когда следующий контакт">Актуализировать</button>')
        + '<button class="btn primary sm" data-kpedit="' + k.id + '" title="Карточка КП: заказчик, объект, суммы, этап, документы">Править</button></div>' : kpDocs(k, false);
      var svc = k.services.map(function (s) { return s.name; }).join(", ");
      return head_ + '<tr class="' + (late ? "late" : "") + (k.watch ? " kpwatch" + (wlate ? " wlate" : "") : "") + (k.id === S.kpHot ? " hot" : "") + '" data-kprow="' + k.id + '"><td>'
        + (canEdit && !arch ? '<button class="kpstar' + (k.watch ? " on" : "") + '" data-kpstar="' + k.id + '" title="' + (k.watch ? "Следим: изменить или снять" : "Следить: заказчик обещал оплату") + '">' + (k.watch ? "★" : "☆") + "</button>" : "") + "<b>" + E(kpNo(k.number)) + "</b>" + (k.order_id && k.order_number ? '<small><button class="kplink" data-open="' + k.order_id + '" title="Открыть задачу">задача №' + E(k.order_number) + "</button></small>" : "") + '</td><td class="cu">' + E(k.customer) + '</td><td class="ell" title="' + E(k.object + " — " + svc + (k.comment ? " — " + k.comment : "") + (k.watch && k.watch_note ? " — по оплате: " + k.watch_note : "")) + '">' + E(k.object) + "<small>" + E(svc) + "</small>" + (k.comment ? '<small class="kpcm">💬 ' + E(k.comment) + "</small>" : "")
        + (k.watch && k.watch_note ? '<small class="kpcm">⭐ По оплате: ' + E(k.watch_note) + "</small>" : "") + "</td>"
        + "<td>" + (k.lead_date || k.issued_date ? dmy(k.lead_date || k.issued_date) : "—") + '</td><td class="lastc' + (k.next_contact && k.next_contact < tdy ? " late" : "") + '" title="Следующий контакт">' + (k.next_contact ? dmy(k.next_contact).slice(0, 5) : "—") + (canEdit && !arch ? ' <button class="kpdte" data-knc="' + k.id + '" title="Назначить следующий контакт">✎</button>' : "") + '</td><td><b>' + money(k.amount) + '</b><small class="kpw">' + pay + "</small></td><td>" + st + '</td><td class="kpa">' + prom + "</td>"
        + '<td class="lastc ' + (late ? "late" : "") + '">' + (k.last_days == null ? "—" : k.last_days === 0 ? "сегодня" : plural(k.last_days, ["день", "дня", "дней"]) + " назад") + (late ? " ⚠" : "") + '</td><td class="mg">' + E(k.manager) + '</td><td class="nw">' + acts + "</td></tr>";
    }).join("");
    return head + funnel + '<div class="panel kpwrap" data-arch="' + !!S.kpArch + '"><table class="tbl grid-c kpt" style="font-size:' + kpz + 'px"><thead><tr><th>№ КП</th><th>Заказчик</th><th>Объект / услуги / комментарий</th><th>Дата обращения</th><th>Следующий контакт</th><th>Сумма</th><th>Статус</th><th>Обещали оплату</th><th>Последнее общение</th><th>Менеджер</th><th>Действия</th></tr></thead><tbody>'
      + (rows || '<tr><td colspan="11">' + (f.st || f.from || f.to ? "По этому фильтру КП нет" : "КП пока нет") + "</td></tr>") + "</tbody></table></div>";
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-kpst],[data-kpper]") : null; if (!t) return;
    var f = kpFlt();
    if (t.hasAttribute("data-kpst")) { f.st = f.st === t.dataset.kpst ? "" : t.dataset.kpst; return paint(); }
    var d = new Date(), m = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2);
    if (t.dataset.kpper === "month") { f.from = m + "-01"; f.to = m + "-" + ("0" + new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).slice(-2); } else { f.from = f.to = ""; }
    paint();
  });
  document.addEventListener("change", function (e) {
    var id = e.target && e.target.id; if (id !== "kpFrom" && id !== "kpTo" && id !== "kpBy") return;
    var f = kpFlt(); f[{ kpFrom: "from", kpTo: "to", kpBy: "by" }[id]] = e.target.value; paint();
  });
  function kpTotal() { return (S.kpf ? S.kpf.items : []).reduce(function (a, i) { return a + (i.on ? (+i.price || 0) : 0); }, 0); }
  function kpcInit() {
    if (S.kpf) return;
    S.kpf = { id: 0, customer_id: 0, customer_text: "", object: "", pay: "adv50", advpct: 40, pay_text: "", err: "", items: [] };
  }
  /* строка в составе КП: добавить или обновить по названию */
  function kpAddLine(name, price) {
    kpcInit();
    var ex = S.kpf.items.filter(function (i) { return i.name === name; })[0];
    if (ex) { ex.on = true; if (price != null) ex.price = price; } else S.kpf.items.push({ name: name, price: price || 0, on: true, custom: true });
  }
  function kpcScreen() {
    var p = pos();
    if (!(p === "owner" || p === "sales" || p === "ops")) return '<div class="head"><div><h1>Конструктор КП</h1></div></div><div class="note">Раздел недоступен для вашей роли.</div>';
    kpcInit();
    var f = S.kpf, cs = S.customers || [], total = kpTotal(), pay = PAYS.filter(function (x) { return x[0] === f.pay; })[0] || PAYS[0];
    var pct = f.pay === "adv50" ? 0.5 : f.pay === "adv30" ? 0.3 : f.pay === "adv100" ? 1 : f.pay === "custom" ? Math.max(0, Math.min(100, +f.advpct || 0)) / 100 : 0, adv = Math.round(total * pct);
    var inpS = 'style="border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink)"';
    var lines = f.items.map(function (i, idx) {
      return '<div class="dsv on" style="display:grid;grid-template-columns:1fr 112px auto;gap:6px;align-items:start">'
        + '<textarea rows="2" data-kf="i.' + idx + '.name" placeholder="Наименование" ' + inpS + ">" + E(i.name) + "</textarea>"
        + '<input type="number" min="0" data-kf="i.' + idx + '.price" value="' + (+i.price || 0) + '" ' + inpS + ">"
        + '<button class="btn ghost sm" data-kdel="' + idx + '" title="Убрать из КП">✕</button></div>';
    }).join("") || '<div class="note">Выберите услуги в прайсе справа или рассчитайте стоимость в калькуляторе</div>';
    var cust = cs.filter(function (c) { return c.id === f.customer_id; })[0], nc = f.nc;
    var contacts = (cust && (cust.contacts || []).length ? '<div class="kcont">' + cust.contacts.map(function (c) { return "<div>" + E(c.fio || "—") + (c.phone ? " · " + E(c.phone) : "") + (c.email ? " · " + E(c.email) : "") + "</div>"; }).join("") + "</div>" : "")
      + (nc ? '<div class="kcadd">' + (nc.mode === "customer" ? '<div class="fld"><label>Название нового заказчика</label><input data-knc="name" value="' + E(nc.name) + '"></div><div class="fld"><label>Город <small style="color:var(--muted)">(часовой пояс подставится сам)</small></label><input data-knc="city" list="cityDl2" value="' + E(nc.city || "") + '"><datalist id="cityDl2">' + cityNames().map(function (n) { return '<option value="' + E(n) + '">'; }).join("") + "</datalist></div>" : "")
          + '<div class="fld"><label>Контактное лицо (ФИО)</label><input data-knc="fio" value="' + E(nc.fio) + '"></div><div class="g2f"><div class="fld"><label>Телефон</label><input data-knc="phone" value="' + E(nc.phone) + '" placeholder="+7 …"></div><div class="fld"><label>E-mail</label><input data-knc="email" value="' + E(nc.email) + '"></div></div>'
          + (nc.err ? '<div class="err">' + E(nc.err) + "</div>" : "") + '<div style="display:flex;gap:8px"><button class="btn primary sm" data-kcsave="1">Сохранить</button><button class="btn ghost sm" data-kcclose="1">Отмена</button></div></div>'
        : '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px">' + (cust ? '<button class="btn ghost sm" data-kcopen="contact">+ Контакт заказчика</button>' : "") + '<button class="btn ghost sm" data-kcopen="customer">+ Новый заказчик</button></div>');
    var form = '<div class="panel pad"><h3>' + (f.id ? "Правка КП " + E(kpNo(f.number)) : "Состав КП") + '</h3><p class="sub">' + (f.id ? "Меняйте услуги, цены, заказчика и условия оплаты, затем «Сохранить изменения»" : "Услуги можно править: название и цену") + "</p>"
      + '<div class="fld"><label>Заказчик (из базы заказчиков)</label><select data-kf="customer_id"><option value="0">— без привязки к заказчику —</option>' + cs.map(function (c) { return '<option value="' + c.id + '"' + (c.id === f.customer_id ? " selected" : "") + ">" + E(c.name) + "</option>"; }).join("") + "</select></div>"
      + contacts
      + (f.customer_id ? "" : '<div class="fld"><label>Для кого КП (название или имя, необязательно)</label><input data-kf="customer_text" value="' + E(f.customer_text || "") + '" placeholder="Например: ООО «Вектор»"></div>')
      + '<div class="fld"><label>Объект</label><input data-kf="object" value="' + E(f.object) + '"></div>'
      + lines
      + '<button class="btn ghost sm" data-kadd="1" style="margin:6px 0 12px">+ Своя позиция</button>'
      + '<div class="fld"><label>Оплата</label><select data-kf="pay">' + PAYS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === f.pay ? " selected" : "") + ">" + E(x[1]) + "</option>"; }).join("") + "</select></div>"
      + (f.pay === "custom" ? '<div class="fld"><label>Аванс, % (остаток по акту)</label><input type="number" min="0" max="100" step="1" data-kf="advpct" value="' + E(f.advpct) + '"></div>' : "")
      + '<div class="fld"><label>Условия оплаты текстом <small style="color:var(--muted)">(необязательно: если заполнено, попадёт в КП вместо стандартной формулировки)</small></label>'
      + '<textarea rows="2" data-kf="pay_text" placeholder="Например: 30% аванс, 40% после согласования, 30% после передачи комплекта">' + E(f.pay_text || "") + "</textarea></div>"
      + '<div class="dbox"><small>Итого</small><b id="kTotal" style="font-size:1.3rem">' + money(total) + "</b>" + (adv ? "<div>Аванс " + money(adv) + ", остаток по акту " + money(total - adv) + "</div>" : "<div>Без аванса, оплата по акту</div>") + "</div>"
      + (f.err ? '<div class="err">' + E(f.err) + "</div>" : "")
      + (f.id ? '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-ksave="draft">Сохранить изменения</button>' + (/^(Обращение|Сбор вводных)$/.test(f.status || "") ? '<button class="btn ghost" data-ksave="send">Сохранить и выставить КП</button>' : "") + '<button class="btn ghost" data-kpcancel="1">Отмена</button></div></div>'
        : '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-ksave="send">Выставить КП</button><button class="btn ghost" data-ksave="draft">Сохранить черновик</button></div></div>');
    var tab = S.kt || "price";
    var seg = '<div class="seg" style="margin-bottom:12px">' + [["price", "Услуги"], ["calc", "Калькулятор"], ["print", "Печать"]].map(function (x) {
      return '<button data-kt="' + x[0] + '" class="' + (tab === x[0] ? "on" : "") + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    var side;
    if (!S.price) side = '<div class="note">Прайс-лист недоступен.</div>';
    else if (tab === "calc") side = priceCalc(true);
    else if (tab === "print") side = pricePrint(true);
    else side = '<div class="panel pad"><h3>Прайс-лист</h3><p class="sub">Нажмите «+», чтобы добавить услугу в КП. Цену можно поправить слева</p>'
      + S.price.items.filter(function (i) { return i.active; }).map(function (i, j) {
        var inKp = f.items.some(function (x) { return x.name === i.name; });
        return '<div class="dsv ' + (inKp ? "on" : "") + '" style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center"><span>' + E(i.name) + (i.note ? '<br><small style="color:var(--muted)">' + E(i.note) + "</small>" : "") + "</span>"
          + "<b>" + money(i.price) + '</b><button class="btn ' + (inKp ? "ghost" : "primary") + ' sm" data-kpadd="' + j + '" title="Добавить в КП">' + (inKp ? "✓" : "+") + "</button></div>";
      }).join("") + "</div>";
    return '<div class="head"><div><h1>' + (f.id ? "Правка КП" : "Конструктор КП") + '</h1><p>Слева состав предложения, справа прайс, калькулятор и печать. «Выставить КП» вносит предложение в реестр с датой выставления</p></div></div>'
      + '<div class="kpc kpc-wide"><div>' + form + "</div><div>" + seg + side + "</div></div>";
  }
  function saveKp(send) {
    var f = S.kpf;
    var items = f.items.filter(function (i) { return i.on && i.name && +i.price > 0; }).map(function (i) { return { name: i.name, price: +i.price }; });
    if (!items.length) { f.err = "Отметьте хотя бы одну услугу с ценой"; return paint(); }
    var payCode = f.pay === "custom" ? ((+f.advpct || 0) <= 0 ? "post100" : "adv" + Math.min(100, Math.round(+f.advpct))) : f.pay;
    api(f.id ? "/kp/" + f.id : "/kp", { customer_id: f.customer_id || 0, customer_text: f.customer_id ? "" : (f.customer_text || ""), object: f.object, services: items, pay: payCode, pay_text: f.pay_text || "", send: !!send }).then(function () {
      var was = f.id; S.kpf = null; toast(was ? "КП изменено" : (send ? "КП выставлено и добавлено в реестр" : "Черновик сохранён в реестре")); location.hash = "#/kpreg/";
    }, function (er) { f.err = String(er); paint(); });
  }
  /* ---------- конструктор договора — вынесен в web/ds_contract.js (24.11); здесь — точки входа ---------- */
  function ctSetPath() { return window.DSContract.ctSetPath.apply(null, arguments); }
  function ctParty(cu) { return window.DSContract.ctParty(cu); }
  function loadContractDraft() { return window.DSContract.loadContractDraft(); }
  function ctRefresh() { return window.DSContract.ctRefresh(); }
  function genScreen() { return window.DSContract.genScreen(); }
  function contractScreen() { return window.DSContract.contractScreen(); }
  function makeContract() { return window.DSContract.makeContract(); }
  function newStandalone() { return window.DSContract.newStandalone(); }
  function signContract() { return window.DSContract.signContract(); }
  function downloadDoc() { return window.DSContract.downloadDoc.apply(null, arguments); }
  /* ---------- конвейер процесса ---------- */
  function loadFlow() {
    return api("/flow").then(function (r) { S.fl = r; }, function (e) { S.fl = null; S.err = String(e); });
  }
  function loadPath() {
    if (S.flTab !== "path" || !S.flOrder) return Promise.resolve();
    return api("/orders/" + S.flOrder + "/history").then(function (h) { S.flHist = h; }, function () { S.flHist = []; });
  }
  function flowScreen() {
    var r = S.fl, p = pos();
    if (!r) return '<div class="head"><div><h1>Конвейер заказа</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var head = '<div class="head"><div><h1>Конвейер заказа</h1><p>Заказ идёт слева направо и сверху вниз. Нажмите на шаг: под полосой откроется описание (что запускает, кто получает, что делает система).</p></div>'
      + '<div class="seg"><button data-fltab="map" class="' + (S.flTab === "map" ? "on" : "") + '">Схема</button><button data-fltab="path" class="' + (S.flTab === "path" ? "on" : "") + '">Путь заказа</button></div></div>'
      + "";
    if (S.flTab === "path") {
      var os = S.orders || [];
      var sel = '<div class="fld" style="max-width:520px"><label>Задача</label><select id="flOrder">' + os.map(function (o) { return '<option value="' + o.id + '"' + (o.id === S.flOrder ? " selected" : "") + ">№" + E(o.number) + " · " + E(o.customer || "") + " · " + E(o.object) + "</option>"; }).join("") + "</select></div>";
      var h = S.flHist || [];
      return head + '<div class="panel pad"><h3>Путь заказа</h3><p class="sub">От подписания договора до архива: кто и когда что сделал</p>' + sel
        + (h.length ? '<div class="trace">' + h.map(function (e) {
          var d = new Date(e.ts * 1000), c = /Стадия/.test(e.action) ? "var(--brand)" : /Оплата|Договор/.test(e.action) ? "var(--ok)" : e.user_name === "Система" || e.user_name === "Импорт" ? "var(--sys)" : "var(--accent)";
          return '<div class="ev" style="--c:' + c + '"><time>' + d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + "</time><b>" + E(e.action) + (e.detail ? ": " + E(e.detail) : "") + '</b><span class="note" style="margin:0">' + E(e.user_name) + "</span></div>";
        }).join("") + "</div>" : '<p class="note">Событий пока нет</p>') + "</div>";
    }
    var counts = r.counts || {};
    var lanes = r.lanes.map(function (l) {
      var detail = "";
      l.steps.forEach(function (s) {
        if (s.id === S.flStep) {
          detail = '<div class="sdet"><div class="sh"><div><h3>Шаг ' + s.n + ". " + E(s.title) + "</h3><small>Ответственный: <b>" + E(s.who) + "</b>" + (s.days != null ? " · срок: " + s.days + " р.д." : (s.label ? " · срок: " + E(s.label) : "")) + '</small></div><button class="x" data-flstep="' + s.id + '">✕</button></div>'
            + '<div class="sg"><div class="dbox"><small>Что запускает шаг</small>' + E(s.trig || "") + '</div><div class="dbox"><small>Кто получает и когда</small>' + E(s.recv || "") + "</div>"
            + '<div class="dbox"><small>Что видит исполнитель</small>' + E(s.sees || "") + '</div><div class="dbox sys"><small>⚙ Что система делает сама</small><ul>' + (s.sys || []).map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul></div></div>"
            + '<div class="note" style="margin:0">Далее: <b>' + E(s.next || "") + "</b></div></div>";
        }
      });
      return '<div class="lane ' + l.id + '"><div class="lane-h"><span>' + E(l.title) + "</span><small>" + E(l.sub) + "</small></div>"
        + '<div class="steps">' + l.steps.map(function (s, i) {
          var cnt = !window.DS_WORK && r.show_counts && counts[s.id] != null ? '<span class="cn">' + counts[s.id] + "</span>" : "";
          var term = s.days != null ? "срок " + s.days + " р.д." : (s.label || "");
          return '<div class="stepbox"><button class="node ' + (S.flStep === s.id ? "on" : "") + '" data-flstep="' + s.id + '"><span class="nh"><span class="no">' + s.n + "</span>" + cnt + "</span><b>" + E(s.title) + '</b><span class="ow">' + E(s.who) + "</span>"
            + (term ? '<span class="tm">' + E(term) + "</span>" : "") + "</button></div>";
        }).join("") + "</div>" + detail + "</div>";
    }).join("");
    return head + lanes;
  }

  /* ---------- технические задания ---------- */
  function loadTz() {
    return api("/tz").then(function (r) { S.tzov = r; S.err = ""; }, function (e) { S.tzov = null; S.err = String(e); });
  }
  function tzScreen() {
    var r = S.tzov, p = pos();
    if (!r) return '<div class="head"><div><h1>Технические задания</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var ok = r.filter(function (x) { return x.status === "Утверждено"; }).length, late = r.filter(function (x) { return x.late; }).length;
    var canEdit = p === "owner" || p === "ops";
    var tile = function (c, n, l) { return '<div class="tile" style="--c:' + c + '"><div class="n">' + n + '</div><div class="l">' + l + "</div></div>"; };
    return '<div class="head"><div><h1>Технические задания</h1><p>Что собрано по каждой задаче и где процесс встал. Когда все пункты закрыты, задача сама уходит руководителю проектного отдела</p></div></div>'
      + ""
      + '<div class="tiles" style="margin-bottom:16px">' + tile("var(--ok)", ok, "ТЗ утверждены") + tile("var(--brand)", r.length - ok - late, "В работе") + tile("var(--bad)", late, "Затянуты (5+ дней)") + "</div>"
      + '<div class="panel" style="overflow:auto"><table class="tbl"><tr><th>Задача</th><th>Заказчик</th><th>Стадия</th><th>Пункты ТЗ</th><th>Статус</th><th>Без движения</th><th></th></tr>'
      + (r.map(function (x) {
        return '<tr><td><b>№' + E(x.number) + "</b><br><small>" + E(x.object) + "</small></td><td>" + E(x.customer || "") + "</td><td>" + E(x.stage) + "</td>"
          + '<td><div style="display:flex;gap:10px;align-items:center"><div class="meter" style="flex:1;--c:' + (x.late ? "var(--bad)" : x.done === x.all ? "var(--ok)" : "var(--brand)") + '"><i style="width:' + (x.all ? x.done / x.all * 100 : 0) + '%"></i></div><b>' + x.done + "/" + x.all + "</b></div></td>"
          + '<td><span class="pill ' + x.tone + '">' + E(x.status) + "</span></td><td>" + (x.late ? '<span class="pill bad">' + plural(x.days, ["день", "дня", "дней"]) + "</span>" : plural(x.days, ["день", "дня", "дней"])) + "</td>"
          + '<td class="r"><button class="btn ghost sm" data-tzopen="' + x.id + '">Открыть</button> ' + (canEdit || p === "owner" ? '<button class="btn ghost sm" data-tzremind="' + x.id + '">Напомнить</button>' : "") + "</td></tr>";
      }).join("") || '<tr><td colspan="7">Задач на стадиях до проектирования нет</td></tr>') + "</table></div>";
  }
  function loadTzItem(id) {
    return api("/orders/" + id + "/tz").then(function (r) { S.tz = r; }, function (e) { S.tz = { err: String(e) }; });
  }
  function tzCall(path, body) {
    return api(path, body).then(function () { return loadTzItem(S.open); }).then(function () { S.orders = null; return load(); }).then(function () { return S.open ? api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () { S.history = []; }) : null; })
      .then(function () { if (S.mount && S.mount.kind === "tz") return loadTz(); }).then(function () {
        if (S.open && !find(S.open)) { S.open = null; S.tab = "info"; toast("Готово: задача передана дальше и теперь вам не видна"); }
        paint();
      }, function (e) { toast(String(e && e.message || e)); });
  }
  function tzTab() {
    var r = S.tz;
    if (!r) return '<div class="note">Загрузка…</div>';
    if (r.err) return '<div class="note">' + E(r.err) + "</div>";
    var s = r.summary;
    return '<div class="panel pad"><h3>Техническое задание <span class="pill ' + s.tone + '">' + E(s.status) + "</span></h3><p class=\"sub\">Закрыто пунктов: " + s.done + " из " + s.all + (s.late ? " · без движения " + plural(s.days, ["день", "дня", "дней"]) : "") + "</p>"
      + r.items.map(function (i) {
        return '<div class="chk ' + (i.done ? "ok" : "") + '">' + (r.can_edit ? '<button data-tzset="' + i.idx + ":" + (i.done ? 0 : 1) + '" title="Отметить" style="display:contents"><i>' + (i.done ? "✓" : "") + "</i></button>" : "<i>" + (i.done ? "✓" : "") + "</i>")
          + '<span style="flex:1">' + E(i.title) + "</span>" + (i.done && i.who ? '<small style="color:var(--muted)">' + E(i.who) + "</small>" : "")
          + (r.can_edit && i.custom ? ' <button class="btn ghost sm" data-tzdel="' + i.idx + '">✕</button>' : "") + "</div>";
      }).join("")
      + ""
      + (r.stage === "Сбор данных" && r.can_edit ? '<div class="note">Когда закрыты все пункты, задача сама перейдёт в «Готов к проектированию».</div>' : "") + "</div>" + tzReturnBox(r);
  }
  var TZ_RET = ["Скан вместо файла", "Нет планов", "Нет ТУ", "Противоречия", "Неполные данные", "Другое"];
  function tzReturnBox(r) {
    var p = pos(), toCust = (p === "owner" || p === "ops" || p === "sales") && r.stage === "Сбор данных", toOps = (p === "owner" || p === "design") && (r.stage === "Готов к проектированию" || r.stage === "В проектировании");
    if (!toCust && !toOps) return "";
    var target = toOps ? "ops" : "customer";
    return '<div class="panel pad" style="margin-top:12px"><h3>' + (toOps ? "Вернуть ТЗ менеджеру проектов" : "Вернуть ТЗ заказчику на доработку") + '</h3><p class="sub">' + (toOps ? "Задача вернётся на «Сбор данных», менеджеру проектов придёт задача." : "Стадия не меняется — возврат и причина попадут в пятничный созвон.") + "</p>"
      + '<div class="g2f"><div class="fld"><label>Причина</label><select id="tzRetWhy">' + TZ_RET.map(function (x) { return "<option>" + E(x) + "</option>"; }).join("") + '</select></div><div class="fld"><label>Комментарий</label><input id="tzRetNote" placeholder="что именно не так"></div></div>'
      + '<button class="btn ghost" data-tzret="' + target + '">↩ Вернуть ТЗ</button></div>';
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-tzret]") : null; if (!t || !S.open) return;
    var why = document.getElementById("tzRetWhy"), note = document.getElementById("tzRetNote"), oid = S.open;
    api("/orders/" + oid + "/tz-return", { target: t.dataset.tzret, reason: why ? why.value : "", comment: note ? note.value : "" }).then(function () {
      toast(t.dataset.tzret === "ops" ? "ТЗ возвращено менеджеру проектов" : "Возврат ТЗ заказчику записан");
      S.orders = null; S.tasks = null; return load().then(function () { return loadTzItem(oid); });
    }).then(paint, function (er) { toast(String(er)); });
  });

  /* ---------- этапы и сроки ---------- */
  var LANE_BG = { sales: "linear-gradient(135deg,#9a76c8,#7a55a8)", design: "linear-gradient(135deg,#3a86d6,#1f5c99)", close: "linear-gradient(135deg,#46c28a,#238a58)", after: "linear-gradient(135deg,#f2a65a,#d9782f)" };
  function loadStages() {
    return api("/stages").then(function (r) {
      S.stg = r; S.stgD = {};
      r.lanes.forEach(function (l) { l.steps.forEach(function (s) { S.stgD[s.id] = { title: s.title, who: s.who, days: s.days == null ? "" : s.days, label: s.label || "", auto: s.auto || "" }; }); });
    }, function (e) { S.stg = null; S.err = String(e); });
  }
  var WHO_OPTS = ["Менеджер продаж", "Операционный менеджер", "Руководитель проектного отдела", "Проектировщик", "Бухгалтер", "Бухгалтер, 1С", "Система"];
  function stagesScreen() {
    var r = S.stg, p = pos();
    if (!r) return '<div class="head"><div><h1>Этапы и сроки</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var ed = r.can_edit;
    var head = '<div class="head"><div><h1>Этапы и сроки</h1><p>Этапы конвейера, ответственные и сроки. ' + (ed ? "Можно менять название этапа, ответственного, срок в рабочих днях, подпись срока и описание: изменения видны на схеме «Конвейер», в напоминаниях и подсказках. Пустое значение возвращает стандартное." : "Правит руководитель.") + "</p></div>"
      + (ed ? '<button class="btn primary" data-stsave="1">Сохранить</button>' : "") + "</div>"
      + "";
    var inp = 'style="width:100%;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink);font:inherit"';
    var body = r.lanes.map(function (l) {
      return '<div class="panel" style="margin-bottom:16px;overflow:auto"><div style="padding:12px 18px;font-weight:800;color:#fff;background:' + LANE_BG[l.id] + '">' + E(l.title) + ' <span style="font-weight:500;opacity:.9;float:right">' + E(l.sub) + "</span></div>"
        + '<table class="tbl"><tr><th style="width:36px">№</th><th style="min-width:180px">Этап</th><th style="min-width:190px">Ответственный</th><th style="width:210px">Срок</th><th style="min-width:260px">Что делает система</th></tr>'
        + l.steps.map(function (s) {
          var d = S.stgD[s.id] || {};
          if (!ed) return "<tr><td>" + s.n + "</td><td><b>" + E(s.title) + "</b></td><td>" + E(s.who) + "</td><td>" + (s.days != null ? (s.days === 0 ? "в день" : s.days + " р.д.") : E(s.label || "—")) + "</td><td><small>" + E(s.auto) + "</small></td></tr>";
          return "<tr><td>" + s.n + '</td><td><input data-sd="' + s.id + '.title" value="' + E(d.title) + '" ' + inp + '></td>'
            + '<td><input list="whoList" data-sd="' + s.id + '.who" value="' + E(d.who) + '" ' + inp + "></td>"
            + '<td><div style="display:flex;gap:6px;align-items:center"><input type="number" min="0" max="90" data-sd="' + s.id + '.days" value="' + E(d.days) + '" placeholder="р.д." style="width:70px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink)">'
            + '<input data-sd="' + s.id + '.label" value="' + E(d.label) + '" placeholder="подпись срока" ' + inp + "></div></td>"
            + '<td><textarea data-sd="' + s.id + '.auto" rows="2" ' + inp + ">" + E(d.auto) + "</textarea></td></tr>";
        }).join("") + "</table></div>";
    }).join("");
    return head + (ed ? '<datalist id="whoList">' + WHO_OPTS.map(function (w) { return '<option value="' + E(w) + '">'; }).join("") + "</datalist>" : "") + body + (S.stgErr ? '<div class="err">' + E(S.stgErr) + "</div>" : "");
  }
  function saveStages() {
    S.stgErr = "";
    var steps = {};
    Object.keys(S.stgD).forEach(function (k) {
      var d = S.stgD[k];
      steps[k] = { title: d.title, who: d.who, days: d.days === "" ? "" : +d.days, label: d.label, auto: d.auto };
    });
    api("/stages", { steps: steps }).then(function (r) { S.stg = r; toast("Этапы и сроки сохранены"); return loadStages(); }).then(paint, function (e) { S.stgErr = String(e); paint(); });
  }

  /* ---------- автоматизация ---------- */
  function loadAuto() {
    return api("/auto").then(function (r) { S.au = r; }, function (e) { S.au = null; S.err = String(e); });
  }
  function autoScreen() {
    var r = S.au;
    if (pos() !== "owner") return '<div class="head"><div><h1>Автоматизация</h1></div></div><div class="note">Раздел виден только руководителю.</div>';
    if (!r) return '<div class="head"><div><h1>Автоматизация</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var head = '<div class="head"><div><h1>Автоматизация</h1><p>Напоминания и эскалации по срокам. Каждое событие по задаче или КП срабатывает один раз. Проверка идёт сама примерно раз в 10 минут</p></div>'
      + '<button class="btn ghost" data-aurun="1">Проверить сейчас</button></div>'
      + '<div class="rolebar" style="background:var(--warn-soft);color:var(--warn)">' + ic("lock") + "<span>Этот раздел виден только руководителю.</span></div>";
    var inp = 'style="width:80px;border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--surface);color:var(--ink)"';
    var rules = '<div class="panel" style="margin-bottom:16px"><table class="tbl"><tr><th style="width:70px">Включено</th><th>Правило</th><th style="width:170px">Порог</th><th style="width:110px">Сработало</th></tr>'
      + r.rules.map(function (x) {
        return '<tr><td><input type="checkbox" data-aur="' + x.id + '" data-aue="' + x.id + '" ' + (x.enabled ? "checked" : "") + "></td><td><b>" + E(x.title) + "</b><br><small>" + E(x.descr) + "</small></td>"
          + "<td>" + (x.unit === "—" ? '<input type="hidden" data-auv="' + x.id + '" value="' + x.value + '">—'
            : '<input type="number" min="0" max="365" data-aur="' + x.id + '" data-auv="' + x.id + '" value="' + x.value + '" ' + inp + "> " + E(x.unit)) + "</td><td>" + (x.fired || 0) + "</td></tr>";
      }).join("") + "</table></div>";
    var au = S.aud, audit = '<div class="panel pad" style="margin-bottom:16px"><h3>Задачи сотрудников</h3>'
      + '<p class="note" style="margin:4px 0 10px">Открытые задачи по сотрудникам и видам. Автозадачи ставит сама CRM; те, что висят дольше 30 дней, можно закрыть разом — задачи, поставленные сотрудниками, не трогаются.</p>'
      + (!au ? '<button class="btn ghost" data-audload="1">Показать</button>'
        : au.groups.map(function (g) {
            return '<div style="margin:0 0 10px"><b>' + E(g.who) + "</b> — открыто " + g.total + ", автозадач " + g.auto + (g.stale ? ", из них старше " + au.days + " дн.: <b>" + g.stale + "</b>" : "")
              + '<div class="note" style="margin:3px 0 0">' + g.types.map(function (t) { return E(t.type) + " — " + t.n + (t.stale ? " (старых " + t.stale + ")" : ""); }).join(" · ") + "</div></div>";
          }).join("")
          + (au.stale.length
            ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="btn primary" data-audclose="1">Закрыть автозадачи старше ' + au.days + " дн.: " + au.stale.length + '</button><button class="btn ghost" data-audlist="1">' + (S.audList ? "Скрыть список" : "Что будет закрыто") + "</button></div>"
              + (S.audList ? '<table class="tbl" style="margin-top:10px"><tr><th>Задача</th><th>Кому</th><th style="width:110px">Создана</th></tr>' + au.stale.map(function (x) {
                  return "<tr><td>" + E(x.title) + "</td><td>" + E(x.who) + "</td><td>" + new Date(x.created * 1000).toLocaleDateString("ru-RU") + "</td></tr>";
                }).join("") + "</table>" : "")
            : '<p class="note">Автозадач старше ' + au.days + " дней нет</p>"))
      + "</div>";
    var log = '<div class="panel pad"><h3>Последние срабатывания</h3>' + (r.log.length ? '<div class="trace" style="margin-top:12px">' + r.log.map(function (e) {
      var d = new Date(e.ts * 1000);
      return '<div class="ev" style="--c:var(--accent)"><time>' + d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + "</time><b>" + E(e.title) + '</b><span class="note" style="margin:0">' + E(e.rule_title) + "</span></div>";
    }).join("") + "</div>" : '<p class="note">Пока ничего не срабатывало</p>') + "</div>";
    return head + rules + audit + log + '<div id="dsAiSettings"></div>';          // «ИИ-помощник» рисует ai.js
  }

  /* ---------- оплаты из 1С (OData 1С:Fresh): что отмечено само и что разобрать вручную ---------- */
  function loadOnec() {
    return api("/1c/onec").then(function (r) { S.on = r; }, function (e) { S.on = null; S.onErr = String(e); });
  }
  function onecSub(r) {
    return "Поступления на расчётный счёт из 1С отмечаются в задачах сами, когда плательщик — заказчик из CRM (по ИНН или названию), а номер договора или сумма совпадают с задачей"
      + (r && r.configured ? " (проверка раз в " + r.minutes + " мин)" : "");
  }
  function onecRunBtn(r) { return r && r.configured ? '<button class="btn ghost" data-onrun="1">Проверить сейчас</button>' : ""; }
  function onecScreen() {
    return '<div class="head"><div><h1>Оплаты из 1С</h1><p>' + onecSub(S.on) + "</p></div>" + onecRunBtn(S.on) + "</div>" + onecBody();
  }
  /* то же содержимое — на вкладке «Оплаты 1С» реестра КП */
  function onecBody() {
    var r = S.on;
    if (!r) return '<div class="note">' + E(S.onErr || "Нет данных") + "</div>";
    if (!r.configured) return '<div class="note">Связь с 1С ещё не настроена. Бухгалтер создаёт в 1С пользователя для OData, затем адрес базы, имя и пароль этого пользователя вписываются в настройки сервера (см. 1c/ИНСТРУКЦИЯ.md).</div>';
    var when = function (ts) { if (!ts) return "ещё не было"; var d = new Date(ts * 1000); return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); };
    var stat = '<div class="panel pad" style="margin-bottom:16px">Последняя проверка: <b>' + when(r.last_run) + "</b>"
      + (r.error ? '<div class="err" style="margin-top:8px">Ошибка связи с 1С: ' + E(r.error) + "</div>" : "") + "</div>";
    var who = function (x) { return "<b>" + E(x.payer || "Плательщик не указан") + "</b>" + (x.inn ? ' <small class="sub">ИНН ' + E(x.inn) + "</small>" : ""); };
    var ST = { ok: "Отмечено", skip: "Уже было отмечено", manual: "Разобрано вручную", ignored: "Не по задаче" };
    var week = r.week, weekly = "";
    if (week) {
      var weekStatus = Object.assign({unmatched: "Не разобрано", amb: "Не разобрано", other: "Прочее поступление"}, ST);
      var rubles = function (amount) { return amount.toLocaleString("ru-RU", {maximumFractionDigits: 2}) + " ₽"; };
      weekly = '<section class="panel pad" aria-labelledby="onec-week-title" style="margin-bottom:16px">'
        + '<h3 id="onec-week-title">Оплаты за неделю</h3><p class="sub">' + dmy(week.start) + ' 12:00 — ' + dmy(week.end) + ' 12:00 МСК'
        + ' · поступлений ' + week.items.length + ' · <b>Итого ' + rubles(week.total) + '</b></p>'
        + '<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Дата</th><th>Плательщик</th><th>Сумма</th><th>Задача</th><th>Итог</th></tr></thead><tbody>'
        + (week.items.map(function (x) {
          return "<tr><td>" + dmy(x.date) + "</td><td>" + who(x) + '</td><td style="white-space:nowrap">' + rubles(x.amount)
            + "</td><td>" + (x.num ? "№" + E(x.num) : "—") + "</td><td>" + E(weekStatus[x.status] || "—") + "</td></tr>";
        }).join("") || '<tr><td colspan="5" class="note">За эту неделю поступлений пока нет</td></tr>')
        + "</tbody></table></div></section>";
    }
    var att = r.items.filter(function (x) { return x.status === "unmatched" || x.status === "amb"; });
    var fld = 'style="width:auto;max-width:100%;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink);font:inherit"';
    var form = function (x) {
        var rf = E(x.ref);
        return '<div style="border-top:1px solid var(--line);padding:12px 0">'
          + '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:space-between"><span>' + dmy(x.date) + " · " + who(x) + '</span><b style="white-space:nowrap">' + money(x.amount) + "</b></div>"
          + '<div class="sub" style="margin:4px 0">' + E(x.purpose || "—") + "</div>"
          + '<div style="color:var(--warn);margin-bottom:8px">' + E(x.note) + "</div>"
          + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><input data-onnum="' + rf + '" placeholder="№ задачи" value="' + E(x.num || "") + '" ' + fld + ' size="10">'
          + '<select data-onkind="' + rf + '" ' + fld + '><option value="">аванс или по акту — определить само</option><option value="advance">это аванс</option><option value="post">это оплата по акту</option></select>'
          + '<button class="btn primary sm" data-onassign="' + rf + '">Отнести к задаче</button>' + (x.status === "other" ? "" : '<button class="btn ghost sm" data-onignore="' + rf + '">Не по задаче</button>') + "</div></div>";
      };
    var todo = '<div class="panel pad" style="margin-bottom:16px"><h3>Не разобрано · ' + att.length + "</h3>"
      + (att.length ? att.map(form).join("") : '<p class="note" style="margin:0">Всё разобрано</p>') + "</div>";
    var oth = r.items.filter(function (x) { return x.status === "other"; });
    var other = oth.length ? '<details class="panel pad" style="margin-bottom:16px"><summary style="cursor:pointer"><b>Прочие поступления · ' + oth.length + '</b> <span class="sub">— плательщиков нет в базе заказчиков CRM (ТО, оборудование и т. п.). Если это оплата по задаче — отнесите вручную и впишите ИНН в карточку заказчика</span></summary>'
      + oth.map(form).join("") + "</details>" : "";
    var done = r.items.filter(function (x) { return ST[x.status]; });
    var list = '<div class="panel"><table class="tbl"><tr><th style="width:100px">Дата</th><th>Плательщик</th><th style="width:130px">Сумма</th><th style="width:90px">Задача</th><th style="width:160px">Итог</th></tr>'
      + (done.map(function (x) {
        return "<tr><td>" + dmy(x.date) + "</td><td>" + who(x) + '<br><small class="sub">' + E(x.purpose) + "</small></td><td>" + money(x.amount) + "</td><td>" + (x.num ? "№" + E(x.num) + kpOfOrder(x.num) : "—") + "</td><td>" + ST[x.status] + (x.status === "manual" || x.status === "ignored" ? '<br><small class="sub">' + E(x.note) + "</small>" : "") + "</td></tr>";
      }).join("") || '<tr><td colspan="5" class="note">Пока ничего не учтено</td></tr>') + "</table></div>";
    return weekly + stat + todo + other + list;
  }
  function kpOfOrder(num) {      // КП, из которого выросла задача (если реестр КП загружен)
    var k = (S.kp || []).filter(function (x) { return x.order_number && String(x.order_number) === String(num); })[0];
    return k ? '<br><small class="sub">КП ' + E(kpNo(k.number)) + "</small>" : "";
  }

  /* ---------- прайс-лист — вынесен в web/ds_price.js (24.11); здесь — точки входа ---------- */
  function loadPrice() { return window.DSPrice.loadPrice(); }
  function priceScreen() { return window.DSPrice.priceScreen(); }
  function priceCalc() { return window.DSPrice.priceCalc.apply(null, arguments); }
  function pricePrint() { return window.DSPrice.pricePrint.apply(null, arguments); }
  function pcState() { return window.DSPrice.pcState(); }
  function pcTotalHtml() { return window.DSPrice.pcTotalHtml(); }
  function pcAddToKp() { return window.DSPrice.pcAddToKp(); }
  function savePrint() { return window.DSPrice.savePrint(); }
  function calcState() { return window.DSPrice.calcState(); }
  function calcResHtml() { return window.DSPrice.calcResHtml(); }
  function calcToKp() { return window.DSPrice.calcToKp(); }
  function loadCompany() { return window.DSPrice.loadCompany(); }
  function saveCompany() { return window.DSPrice.saveCompany(); }
  function savePrice() { return window.DSPrice.savePrice(); }
  /* ---------- недельные отчёты и «Пятничный созвон» — вынесены в web/ds_friday.js (19.11); здесь — точки входа ---------- */
  function loadReport() { return window.DSFriday.loadReport(); }
  function reportScreen() { return window.DSFriday.reportScreen(); }
  function downloadText(n, t, m) { window.DSFriday.downloadText(n, t, m); }
  function rpSave(k, t) { return window.DSFriday.rpSave(k, t); }
  function rpFind(k) { return window.DSFriday.rpFind(k); }
  function rpCsv(r) { return window.DSFriday.rpCsv(r); }
  /* ---------- статистика руководителя ---------- */
  var MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  function shiftMonth(m, n) { var y = +m.slice(0, 4), mm = +m.slice(5, 7) - 1 + n; y += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; return y + "-" + ("0" + (mm + 1)).slice(-2); }
  DS.statsMonth = function () { return S.st ? S.st.month : ""; };
  function loadStats() {
    if (!S.st) S.st = { month: isoDay(new Date()).slice(0, 7), data: null };
    return api("/stats?month=" + S.st.month).then(function (d) { S.st.data = d; S.err = ""; }, function (e) { S.st.data = null; S.err = String(e); });
  }
  function statsCsv(d) {
    var l = ["Проектировщик;Проектов;На сумму;Отработано дней;Рабочих дней;Отдыхал"];
    d.designers.forEach(function (x) { l.push([x.name, x.projects, x.sum, x.worked, x.workdays, x.off].join(";")); });
    l.push(["Итого", d.totals.projects, d.totals.sum, d.totals.worked, d.totals.workdays, d.totals.off].join(";"));
    l.push(""); l.push("КП выставлено;шт;" + d.kp.issued_n + ";сумма;" + d.kp.issued_sum); l.push("КП оплачено;шт;" + d.kp.paid_n + ";сумма;" + d.kp.paid_sum + ";процент;" + d.kp.pct);
    return l.join("\n");
  }
  function statsScreen() {
    var d = S.st && S.st.data;
    if (pos() !== "owner") return '<div class="head"><div><h1>Статистика</h1></div></div><div class="note">Этот раздел виден только руководителю.</div>';
    if (!d) return '<div class="head"><div><h1>Статистика</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var y = d.month.slice(0, 4), mi = +d.month.slice(5, 7) - 1;
    var k = function (c, v, l) { return '<div class="tile" style="--c:' + c + '"><div class="n">' + v + '</div><div class="l">' + l + "</div></div>"; };
    var mx = Math.max.apply(null, d.chart.map(function (c) { return Math.max(c.issued, c.paid); }).concat([1]));
    return '<div class="head"><div><h1>Статистика</h1><p>Закрытый кабинет руководителя: суммы и оплата из 1С, дни из отметок проектировщиков</p></div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="seg"><button data-stnav="-1">←</button><button class="on">' + MONTHS[mi] + " " + y + '</button><button data-stnav="1">→</button></div><button class="btn ghost" data-stcsv="1">' + ic("down") + "В Excel (CSV)</button></div></div>"
      + '<div class="rolebar" style="background:var(--warn-soft);color:var(--warn)">' + ic("lock") + "<span>Этот раздел виден только руководителю.</span></div>"
      + (window.DSStats ? DSStats.html(d) : "")      /* «Деньги» и «Продажи» — stats.js */
      + '<div class="tiles">' + k("var(--brand)", d.totals.projects, "Проектов сдано") + k("var(--ok)", money(d.totals.sum), "Сумма сданных проектов")
      + k("var(--org)", d.kp.issued_n, "КП выставлено · " + money(d.kp.issued_sum)) + k("var(--accent)", d.kp.pct + "%", d.kp.paid_n + " оплачено · " + money(d.kp.paid_sum)) + "</div>"
      + '<div class="dsg21" style="margin-top:16px"><div class="panel"><div style="padding:18px 22px 0"><h3>Проектировщики за месяц</h3><p class="sub">Руководитель проектного отдела тоже проектирует</p></div>'
      + '<table class="tbl"><tr><th>Проектировщик</th><th class="r">Проектов</th><th class="r">На сумму</th><th>Отработано дней</th><th class="r">Отдыхал</th></tr>'
      + d.designers.map(function (x) { var w = x.workdays || 1; return '<tr><td><span class="ava-t">' + ava(x.name, "sm") + "<b>" + E(x.name) + '</b></span></td><td class="r"><b>' + x.projects + '</b></td><td class="r"><b>' + money(x.sum) + '</b></td><td><div style="display:flex;gap:10px;align-items:center"><div class="meter" style="flex:1"><i style="width:' + Math.min(100, x.worked / w * 100) + '%;--c:var(--ok)"></i></div><b>' + x.worked + " из " + x.workdays + '</b></div></td><td class="r">' + x.off + " дн.</td></tr>"; }).join("")
      + '<tr style="background:var(--surface-2)"><td><b>Итого</b></td><td class="r"><b>' + d.totals.projects + '</b></td><td class="r"><b>' + money(d.totals.sum) + "</b></td><td>" + d.totals.worked + " из " + d.totals.workdays + '</td><td class="r">' + d.totals.off + " дн.</td></tr></table></div>"
      + '<div class="panel pad"><h3>КП: выставлено и оплачено</h3><p class="sub">Тысячи ₽ · синий — выставлено, зелёный — оплачено</p><div class="chart">'
      + d.chart.map(function (c) { return '<div class="g"><div class="bars"><i style="height:' + (c.issued / mx * 100) + '%" title="' + money(c.issued) + '"></i><i class="p" style="height:' + (c.paid / mx * 100) + '%" title="' + money(c.paid) + '"></i></div><small>' + MONTHS[+c.month.slice(5, 7) - 1].slice(0, 3) + "</small></div>"; }).join("") + "</div></div></div>";
  }
  /* ---------- действия ---------- */
  function busyNow() { return S.busy && Date.now() - S.busy < 30000; }       // зависший запрос (телефон уснул) не блокирует кнопки навсегда
  function act(p) {
    if (busyNow()) return; S.busy = Date.now(); S.actErr = "";
    return p.then(function () { S.busy = false; S.orders = null; S.tasks = null; BOOT = null; return load().then(function () { return S.open ? api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () { S.history = []; }) : null; }); })
      .then(function () {
        if (S.open && !find(S.open)) {              // задача ушла на стадию, которую роль не видит — это нормальная передача дальше
          S.open = null; S.tab = "info"; if (/^#\/task\//.test(location.hash)) history.replaceState(null, "", "#/");
          toast("Готово: задача передана дальше и теперь вам не видна");
        }
        paint();
      }, function (e) {      // ошибка видна и в окне задачи; данные перечитываются — вдруг этап уже сменил кто-то другой
        S.busy = false; var msg = String(e && e.message || e);
        if (!S.open) return toast(msg);
        S.actErr = msg;
        load().then(function () {
          if (!find(S.open)) {          // этап уже сменил другой сотрудник, и задача ушла на стадию, которую роль не видит
            S.open = null; S.tab = "info"; S.actErr = ""; if (/^#\/task\//.test(location.hash)) history.replaceState(null, "", "#/");
            msg = "Этот шаг уже сделал другой сотрудник: задача передана дальше и вам больше не видна";
          }
          toast(msg); paint();
        }, function () { toast(msg); paint(); });
      });
  }
  function closeAll() {
    S.form = null; S.edit = null; S.nt = null; S.te = null; S.tm = false; S.oe = null; S.ke = null; S.actErr = ""; S.pz = null;
    setModal("");
    if (S.open) { S.open = null; S.tab = "info"; if (/^#\/task\//.test(location.hash)) history.replaceState(null, "", S.cvRoute ? "#/conv" : "#/"); }      // B3: пришли с Конвейера — на него и вернулись (#/conv)
    paint();
  }

  document.addEventListener("dragstart", function (e) {
    var c = e.target.closest && e.target.closest("[data-dragid]");
    if (c && e.dataTransfer) { e.dataTransfer.setData("text/plain", c.getAttribute("data-dragid")); e.dataTransfer.effectAllowed = "move"; }
  });
  document.addEventListener("dragover", function (e) { if (S.mount && e.target.closest && e.target.closest("[data-dropstage]")) e.preventDefault(); });
  document.addEventListener("drop", function (e) {
    var col = e.target.closest && e.target.closest("[data-dropstage]");
    if (!col || !e.dataTransfer || !taskCtl()) return;
    var id = e.dataTransfer.getData("text/plain"); if (!id) return;
    e.preventDefault();
    var dst = col.getAttribute("data-dropstage");
    api("/orders/" + id + "/stage", { stage: dst }).then(function () { if (dst === "Корректировка") toast("Корректировка открыта с типовым сроком — поменять можно во вкладке «Корректировки»"); S.orders = null; S.tasks = null; return load().then(paint); }, function (er) { toast(String(er)); });
  });
  document.addEventListener("click", function (e) {
    var inModal = !!e.target.closest("#ds-modal");
    if (!inModal && !(S.mount && S.mount.el && S.mount.el.contains(e.target))) return;
    var bg = e.target.getAttribute && e.target.getAttribute("data-bg");
    if (bg) return;                                    // щелчок мимо окна его не закрывает: набранное не теряется, закрыть — крестиком или «Отмена»
    if (e.target.closest("[data-trbox]") && !e.target.closest("[data-trsend]")) return;      // поле ответа в карточке задачи
    var t = e.target.closest("[data-ostart],[data-tack],[data-nfstart],[data-trep],[data-trsend],[data-who],[data-showclosed],[data-osel],[data-oselx],[data-oview],[data-gmore],[data-kpgo],[data-open],[data-close],[data-tab],[data-kb],[data-go],[data-urgent],[data-pay],[data-act],[data-new],[data-create],[data-tdone],[data-otype],[data-tile],[data-ostage],[data-ld],[data-edit],[data-saveplan],[data-csel],[data-cnew],[data-cadd],[data-cdel],[data-csave],[data-wmark],[data-woff],[data-wnav],[data-kpstatus],[data-kpcontract],[data-kptouch],[data-ksv],[data-ksave],[data-kcust],[data-kadd],[data-kdel],[data-ctmake],[data-ctsign],[data-ctpick],[data-rpkind],[data-rpnav],[data-rppub],[data-rpdl],[data-stnav],[data-stcsv],[data-pradd],[data-prdel],[data-prsave],[data-prreset],[data-doc],[data-compsave],[data-stsave],[data-aurun],[data-audload],[data-audlist],[data-audclose],[data-onrun],[data-onassign],[data-onignore],[data-tstate],[data-flstep],[data-fltab],[data-tzset],[data-tzadd],[data-tzdel],[data-tzremind],[data-tzopen],[data-ldn],[data-chatopen],[data-mt],[data-kpdel],[data-kt],[data-kpadd],[data-pcadd],[data-pcreset],[data-ctsvdel],[data-ctsvnew],[data-ctparty],[data-pt],[data-ppsave],[data-ppreset],[data-ccadd],[data-ccdel],[data-cckp],[data-ccreset],[data-ntopen],[data-ntsave],[data-lead],[data-cmtoggle],[data-cmsend],[data-cmdel],[data-tmopen],[data-tmstage],[data-pzopen],[data-pzx],[data-pzsave],[data-pzback],[data-tmprio],[data-tmurg],[data-tmcopy],[data-tmclose],[data-ldz],[data-ldmenu],[data-ldp],[data-tedit],[data-tdel],[data-tesave],[data-oesave],[data-oedel],[data-view],[data-scnew],[data-scsel],[data-scfpick],[data-scfopen],[data-scfdl],[data-scfdel],[data-scsave],[data-scdel],[data-sccopy],[data-kparch],[data-kptab]");
    if (!t) return;
    var d = t.dataset;
    if (d.close) return closeAll();
    if (d.ostart) {
      return api("/orders/" + d.ostart + "/start", { rid: 0 }).then(function () {
        toast("Отмечено: работа начата");
        S.orders = null;
        return load().then(paint);
      }, function (e2) { toast(String(e2)); });
    }
    if (d.tmopen) return tmOpen(d.tmopen);
    if (d.tmstage) { if (S.oe) { S.oe.stage = d.tmstage; tmRepaint(); } return; }
    if (d.pzopen) { var po = find(+d.pzopen); S.pz = { id: +d.pzopen, reason: paused(po) ? po.pause_reason || "" : "", until: "", err: "" }; return tmRepaint(); }
    if (d.pzx != null && t.hasAttribute("data-pzx")) { S.pz = null; return tmRepaint(); }
    if (d.pzsave) return pzSave(+d.pzsave);
    if (d.pzback) { var pb = find(+d.pzback); return pzDo(api("/orders/" + d.pzback + "/resume", {}), "Пауза снята: задача на шаге «" + ((pb && pb.pause_from) || "") + "»"); }
    if (d.tmprio) { if (S.oe) { S.oe.priority = d.tmprio; tmRepaint(); } return; }
    if (d.tmurg != null && t.hasAttribute("data-tmurg")) { if (S.oe) { S.oe.urgent = S.oe.urgent ? 0 : 1; tmRepaint(); } return; }
    if (d.tmcopy != null && t.hasAttribute("data-tmcopy")) { if (S.oe) { try { navigator.clipboard.writeText("№" + S.oe.number + " " + (S.oe.customer || "")); toast("Имя скопировано"); } catch (e) { toast("Не удалось скопировать"); } } return; }
    if (d.tmclose != null && t.hasAttribute("data-tmclose")) { S.tm = false; S.oe = null; S.open = null; setModal(""); return; }
    if (d.tedit) return teOpen(d.tedit);
    if (d.tdel) return tDel(d.tdel);
    if (d.tesave != null && t.hasAttribute("data-tesave")) return teSave();
    if (d.oesave != null && t.hasAttribute("data-oesave")) return oeSave();
    if (d.oedel != null && t.hasAttribute("data-oedel")) return oeDel();
    if (d.view) { S.view = d.view; try { localStorage.setItem("ds_view", d.view); } catch (e) {} return paint(); }
    if (d.oview) { S.oview = d.oview; try { localStorage.setItem("ds_oview", d.oview); } catch (e) {} return paint(); }
    if (t.hasAttribute("data-who")) { S.ov.who = d.who; S.ov.sel = ""; return paint(); }                 // «Чьи задачи» в «Организационных»
    if (d.osel) { S.ov.sel = S.ov.sel === d.osel ? "" : d.osel; return paint(); }
    if (d.oselx) { S.ov.sel = ""; if (S.topen) { S.topen = 0; if (/^#\/t\//.test(location.hash)) history.replaceState(null, "", "#/"); } return paint(); }
    if (d.kpgo) { location.hash = "#/kpreg/"; return; }
    if (d.gmore) { S.ov.more = S.ov.more || {}; S.ov.more[d.gmore] = 1; return paint(); }
    if (d.showclosed) { S.showClosed = !S.showClosed; return paint(); }
    if (d.scnew != null && t.hasAttribute("data-scnew")) { var nid = "s" + Date.now(); S.sc = (S.sc || []).concat([{ id: nid, title: "Новый скрипт", group: "", text: "" }]); S.scSel = nid; return paint(); }
    if (d.scsel) { S.scSel = d.scsel; return paint(); }
    if (d.scfpick) { var fi = document.getElementById("scFileIn"); if (fi) fi.click(); return; }
    if (d.scfopen) return scFileOpen(d.scfopen, true);
    if (d.scfdl) return scFileOpen(d.scfdl, false);
    if (d.scfdel) {
      if (!confirm("Удалить файл «" + scFileName(d.scfdel) + "» из скрипта?")) return;
      return api("/scripts/" + encodeURIComponent(S.scSel) + "/files/" + encodeURIComponent(d.scfdel) + "/delete", {}).then(function (x) { S.sc = S.sc.map(function (y) { return y.id === x.id ? x : y; }); toast("Файл удалён"); paint(); }, function (e) { toast(String(e)); });
    }
    if (d.scsave != null && t.hasAttribute("data-scsave")) return saveScripts();
    if (d.sccopy != null && t.hasAttribute("data-sccopy")) { var sx = (S.sc || []).filter(function (x) { return x.id === S.scSel; })[0]; if (sx) { try { navigator.clipboard.writeText(sx.text || ""); toast("Текст скопирован"); } catch (e) { toast("Не удалось скопировать"); } } return; }
    if (d.scdel != null && t.hasAttribute("data-scdel")) {
      if (!confirm("Удалить этот скрипт?")) return;
      S.sc = (S.sc || []).filter(function (x) { return x.id !== S.scSel; }); S.scSel = S.sc.length ? S.sc[0].id : "";
      return saveScripts();
    }
    if (d.ntopen != null && t.hasAttribute("data-ntopen")) return ntOpen({ step: "a1" });
    if (d.ntsave != null && t.hasAttribute("data-ntsave")) return ntSave();
    if (d.lead) {
      var lp = d.lead.split(":");
      return api("/tasks/" + lp[0] + "/lead", { action: lp[1] }).then(function (r) {
        toast(lp[1] === "skip" ? "Задача закрыта: не требуется" : "Передано дальше: " + r.next); S.tasks = null; return load().then(paint);
      }, function (e) { toast(String(e)); });
    }
    if (d.trep) { S.trep = S.trep === +d.trep ? 0 : +d.trep; paint(); var trf = document.querySelector('[data-trd="' + d.trep + '"]'); if (trf) trf.focus(); return; }
    if (d.trsend) {
      var trid = +d.trsend, trt = ((S.trDraft || {})[trid] || "").trim();
      if (!trt) return toast("Напишите ответ");
      return api("/tasks/" + trid + "/reply", { text: trt }).then(function () { S.trDraft[trid] = ""; S.trep = 0; toast("Ответ отправлен"); paint(); }, function (er) { toast(String(er)); });
    }
    if (d.cmtoggle) { var oi = +d.cmtoggle; S.cmOpen = S.cmOpen || {}; S.cmOpen[oi] = !S.cmOpen[oi]; return paint(); }
    if (d.cmdel) {
      if (!confirm("Удалить комментарий?")) return;
      return api("/comments/" + d.cmdel + "/delete", {}).then(function () { return api("/comments"); }).then(function (c) { S.cm = c; paint(); }, function (e) { toast(String(e)); });
    }
    if (d.cmsend) {
      var coid = +d.cmsend, txt = ((S.cmDraft || {})[coid] || "").trim();
      if (!txt) return toast("Напишите комментарий");
      return api("/orders/" + coid + "/comments", { text: txt }).then(function () { S.cmDraft[coid] = ""; return api("/comments"); }).then(function (c) { S.cm = c; S.cmOpen[coid] = true; paint(); }, function (e) { toast(String(e)); });
    }
    if (d.open) {
      S.open = +d.open; S.tab = "info"; S.edit = null; S.oe = null; S.actErr = "";
      var fresh = Date.now() - (S.loadedAt || 0) > 60000 ? load().then(null, function () {}) : Promise.resolve();      // этап в окне — с сервера, а не из давно загруженного списка
      return fresh.then(function () { return api("/orders/" + S.open + "/history"); }).then(function (h) { S.history = h; }, function () { S.history = []; }).then(paint);
    }
    if (d.csel) { var cc = (S.customers || []).filter(function (c) { return c.id === +d.csel; })[0]; if (cc) { S.cu.sel = cc.id; S.cu.draft = JSON.parse(JSON.stringify(cc)); S.cu.err = ""; } paint(); if (innerWidth < 900) { var cardEl = document.querySelector("#clients-app .dsg21 > div:last-child"); if (cardEl) cardEl.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if (d.cnew != null && t.hasAttribute("data-cnew")) { S.cu.sel = 0; S.cu.draft = { id: 0, name: "", regular: 0, tz: "Europe/Moscow", comment: "", contacts: [{ fio: "", pos: "", phone: "" }] }; S.cu.err = ""; return paint(); }
    if (d.cadd != null && t.hasAttribute("data-cadd")) { S.cu.draft.contacts.push({ fio: "", pos: "", phone: "" }); return paint(); }
    if (d.cdel != null && t.hasAttribute("data-cdel")) { S.cu.draft.contacts.splice(+d.cdel, 1); return paint(); }
    if (d.csave != null && t.hasAttribute("data-csave")) return saveCustomer();
    if (d.wmark) { var wd = dayRec(d.wmark); return act2(api("/week/day", { day: d.wmark, worked: !wd.worked }), true); }
    if (d.woff) { var wf = dayRec(d.woff); return act2(api("/week/day", { day: d.woff, off: !wf.off }), true); }
    if (d.wnav != null && t.hasAttribute("data-wnav")) { S.wk.start = isoDay(addDays(S.wk.start === "" ? monday() : new Date(S.wk.start + "T00:00:00"), d.wnav === "0" ? 0 : (+d.wnav) * 7)); if (d.wnav === "0") S.wk.start = isoDay(monday()); return loadWeek().then(paint); }
    if (d.kpcontract) { S.ct = { kid: +d.kpcontract }; S.cmode = "kp"; if (location.hash === "#/contracts") return DS.reload(); location.hash = "#/contracts"; return; }
    if (d.cmode) { S.cmode = d.cmode; if (d.cmode === "kp") { var cEl = S.mount && S.mount.el; if (cEl) cEl.innerHTML = ""; } return paint(); }
    if (d.kpstatus != null && t.hasAttribute("data-kpstatus")) return;
    if (d.kptouch) {          // «Актуализировать» (шаг 12): окно касания из today.js — тип и следующий контакт обязательны, в журнал «Касание»
      S.kpHot = +d.kptouch;
      var kt_ = (S.kp || []).filter(function (x) { return x.id === +d.kptouch; })[0] || { id: +d.kptouch };
      if (window.DSToday && DSToday.touch) DSToday.touch(kt_, function () { act2(loadKp(), false); });
      else toast("Обновите страницу: окно касания не загрузилось");
      return;
    }
    if (d.kparch != null && t.hasAttribute("data-kparch")) { S.kpArch = !S.kpArch; return paint(); }
    if (d.kptab) { S.kpTab = d.kptab; if (d.kptab === "onec" && !S.on) return loadOnec().then(function () { paint(); }, function () { paint(); }); return paint(); }
    if (d.ksv != null && t.hasAttribute("data-ksv")) { var it = S.kpf.items[+d.ksv]; it.on = !it.on; return paint(); }
    if (d.kadd != null && t.hasAttribute("data-kadd")) { S.kpf.items.push({ name: "", price: 0, on: true, custom: true }); return paint(); }
    if (d.kdel != null && t.hasAttribute("data-kdel")) { S.kpf.items.splice(+d.kdel, 1); return paint(); }
    if (d.ksave != null && t.hasAttribute("data-ksave")) return saveKp(d.ksave === "send");
    if (d.ctmake != null && t.hasAttribute("data-ctmake")) return makeContract();
    if (d.ctstandalone != null && t.hasAttribute("data-ctstandalone")) { S.cmode = "kp"; return newStandalone(); }
    if (d.ctsign != null && t.hasAttribute("data-ctsign")) return signContract();
    if (d.tack) return act2(api("/tasks/" + d.tack + "/ack", {}).then(function () { toast("Получение подтверждено"); S.tasks = null; return load(); }), false);
    if (d.tstate) { var ts = d.tstate.split(":"); return act2(api("/tasks/" + ts[0] + "/state", { state: ts[1] }).then(function () { S.tasks = null; return load(); }), false); }
    if (d.flstep) { S.flStep = S.flStep === d.flstep ? null : d.flstep; return paint(); }
    if (d.fltab) { S.flTab = d.fltab; if (d.fltab === "path" && !S.flOrder && (S.orders || []).length) S.flOrder = S.orders[0].id; return loadPath().then(paint); }
    if (d.tzset != null && t.hasAttribute("data-tzset")) { var tp = d.tzset.split(":"); return tzCall("/orders/" + S.open + "/tz", { idx: +tp[0], done: tp[1] === "1" }); }
    if (d.tzadd != null && t.hasAttribute("data-tzadd")) { var ti = document.getElementById("tzNew"); var tt = ti ? ti.value.trim() : ""; if (!tt) return toast("Введите название пункта"); return tzCall("/orders/" + S.open + "/tz/add", { title: tt }); }
    if (d.tzdel != null && t.hasAttribute("data-tzdel")) return tzCall("/orders/" + S.open + "/tz/delete", { idx: +d.tzdel });
    if (d.tzremind) return act2(api("/orders/" + d.tzremind + "/tz/remind", {}).then(function () { toast("Напоминание отправлено операционному менеджеру"); }), false);
    if (d.tzopen) { S.open = +d.tzopen; S.tab = "tz"; S.edit = null; return Promise.all([api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () { S.history = []; }), loadTzItem(S.open)]).then(paint); }
    if (d.stsave != null && t.hasAttribute("data-stsave")) return saveStages();
    if (d.onrun != null && t.hasAttribute("data-onrun")) return act2(api("/1c/onec/run", {}).then(function (r) { S.on = r; var x = r.result || {}; toast(x.new ? "Новых платежей: " + x.new + (x.attention ? ", разобрать вручную: " + x.attention : "") : "Новых платежей нет"); }), false);
    if (d.onassign) {
      var nIn = document.querySelector('[data-onnum="' + d.onassign + '"]'), kIn = document.querySelector('[data-onkind="' + d.onassign + '"]');
      var nv = nIn ? nIn.value.trim() : ""; if (!nv) return toast("Впишите номер задачи");
      return act2(api("/1c/onec/" + encodeURIComponent(d.onassign) + "/assign", { num: nv, kind: kIn ? kIn.value : "" }).then(function (r) { S.on = r; S.orders = null; toast("Оплата отнесена к задаче №" + nv); return load(); }), false);
    }
    if (d.onignore) return act2(api("/1c/onec/" + encodeURIComponent(d.onignore) + "/ignore", {}).then(function (r) { S.on = r; toast("Платёж убран из «Не разобрано»"); }), false);
    if (d.audload != null && t.hasAttribute("data-audload")) return act2(api("/tasks-audit?days=30").then(function (r) { S.aud = r; }), false);
    if (d.audlist != null && t.hasAttribute("data-audlist")) { S.audList = !S.audList; return paint(); }
    if (d.audclose != null && t.hasAttribute("data-audclose") && S.aud) {
      if (!confirm("Закрыть " + S.aud.stale.length + " автозадач старше " + S.aud.days + " дней? Задачи, поставленные сотрудниками, не трогаются.")) return;
      return act2(api("/tasks-audit/close", { ids: S.aud.stale.map(function (x) { return x.id; }), days: S.aud.days }).then(function (r) {
        toast("Закрыто задач: " + r.closed); S.tasks = null; S.audList = false; return api("/tasks-audit?days=30").then(function (a) { S.aud = a; });
      }), false);
    }
    if (d.aurun != null && t.hasAttribute("data-aurun")) return act2(api("/auto/run", {}).then(function (r) { var n = Object.keys(r.fired).reduce(function (a, k) { return a + r.fired[k]; }, 0); toast(n ? "Сработало правил: " + n : "Сейчас ничего не требует внимания"); return loadAuto(); }), false);
    if (d.doc) { var dd = d.doc.split(":"); return downloadDoc(+dd[0], dd[1], dd[2]); }
    if (d.compsave != null && t.hasAttribute("data-compsave")) return saveCompany();
    if (d.ctsvdel != null && t.hasAttribute("data-ctsvdel")) { S.ct.data.services.splice(+d.ctsvdel, 1); return paint(); }
    if (d.ctsvnew != null && t.hasAttribute("data-ctsvnew")) { S.ct.data.services.push({ name: "", unit: "услуга", qty: 1, unit_price: 0 }); return paint(); }
    if (d.ctparty != null && t.hasAttribute("data-ctparty")) { var cu0 = S.ct.data.customer; cu0.party_custom = false; cu0.party_text = ctParty(cu0); return paint(); }
    if (d.pt) { S.pt = d.pt; return paint(); }
    if (d.ppreset != null && t.hasAttribute("data-ppreset")) { S.pp = null; S.ppErr = ""; return paint(); }
    if (d.ppsave != null && t.hasAttribute("data-ppsave")) return savePrint();
    if (d.kt) { S.kt = d.kt; return paint(); }
    if (d.mt) { S.mt = d.mt; return paint(); }
    if (d.chatopen) { location.hash = "#/chat?t=" + encodeURIComponent(d.chatopen); return; }
    if (d.kpdel) { var kpr = (S.kp || []).filter(function (x) { return x.id === +d.kpdel; })[0]; if (!confirm("Удалить КП " + (kpr ? kpr.number + " · " + kpr.customer : "") + " из реестра? Это нельзя отменить.")) return; S.ke = null; setModal(""); return act2(api("/kp/" + d.kpdel + "/delete", {}).then(loadKp), false); }
    if (d.kpadd != null && t.hasAttribute("data-kpadd")) { var pit = S.price.items.filter(function (i) { return i.active; })[+d.kpadd]; if (pit) { kpAddLine(pit.name, pit.price); return paint(); } return; }
    if (d.pcadd != null && t.hasAttribute("data-pcadd")) return pcAddToKp();
    if (d.pcreset != null && t.hasAttribute("data-pcreset")) { S.pc = null; return paint(); }
    if (d.cckp != null && t.hasAttribute("data-cckp")) return calcToKp();
    if (d.ccreset != null && t.hasAttribute("data-ccreset")) { S.calc = null; return paint(); }
    if (d.pradd != null && t.hasAttribute("data-pradd")) { S.pd.push({ name: "", price: 0, note: "", active: true }); return paint(); }
    if (d.prdel != null && t.hasAttribute("data-prdel")) { S.pd.splice(+d.prdel, 1); return paint(); }
    if (d.prreset != null && t.hasAttribute("data-prreset")) { S.pd = JSON.parse(JSON.stringify(S.price.items)); S.pdErr = ""; return paint(); }
    if (d.prsave != null && t.hasAttribute("data-prsave")) return savePrice();
    if (d.rpkind) {
      if (S.rp.start === window.DSFriday.reportStart(S.rp.kind)) S.rp.start = window.DSFriday.reportStart(d.rpkind);
      S.rp.kind = d.rpkind;
      return loadReport().then(paint);
    }
    if (d.rpnav != null && t.hasAttribute("data-rpnav")) { S.rp.start = isoDay(addDays(new Date(S.rp.start + "T00:00:00"), d.rpnav === "0" ? 0 : (+d.rpnav) * 7)); if (d.rpnav === "0") S.rp.start = window.DSFriday.reportStart(S.rp.kind); return loadReport().then(paint); }
    if (d.rppub != null && t.hasAttribute("data-rppub")) return act2(api("/reports/" + S.rp.kind + "/publish?start=" + S.rp.start, {}).then(function () { toast("Отчёт отправлен руководителю"); }), false);
    if (d.rpdl != null && t.hasAttribute("data-rpdl")) return downloadText("sozvon-" + S.rp.kind + "-" + S.rp.start + ".csv", rpCsv(S.rp.data), "text/csv;charset=utf-8");
    if (d.stnav != null && t.hasAttribute("data-stnav")) { S.st.month = shiftMonth(S.st.month, +d.stnav); return loadStats().then(paint); }
    if (d.stcsv != null && t.hasAttribute("data-stcsv")) return downloadText("statistika-" + S.st.month + ".csv", statsCsv(S.st.data), "text/csv");
    if (d.otype) { S.ov.otype = d.otype; S.ov.type = d.otype; S.ov.tile = ""; return paint(); }
    if (d.tile) { S.ov.tile = S.ov.tile === d.tile ? "" : d.tile; return paint(); }
    if (d.ostage != null && t.hasAttribute("data-ostage")) { S.ov.stage = d.ostage; return paint(); }
    if (d.ld) { S.ld = d.ld; return paint(); }
    if (d.ldmenu != null && t.hasAttribute("data-ldmenu")) { S.ldMenu = d.ldmenu === "1" ? !S.ldMenu : false; return paint(); }
    if (d.ldp != null && t.hasAttribute("data-ldp")) {
      var cur_ = staff().map(function (u) { return u.name; }), ix = cur_.indexOf(d.ldp);
      if (ix >= 0) cur_.splice(ix, 1); else cur_.push(d.ldp);
      S.ldSel = cur_; try { localStorage.setItem("ds_ldsel", JSON.stringify(cur_)); } catch (e) {}
      return paint();
    }
    if (d.ldz != null && t.hasAttribute("data-ldz")) {
      var zz = S.ldz || 0; if (!zz) { try { zz = +localStorage.getItem("ds_ldz") || 0; } catch (e) { zz = 0; } zz = zz || 0.85; }
      zz = d.ldz === "0" ? 0.85 : Math.max(0.5, Math.min(1.6, Math.round((zz + (+d.ldz) * 0.1) * 100) / 100));
      S.ldz = zz; try { localStorage.setItem("ds_ldz", String(zz)); } catch (e) {}
      return paint();
    }
    if (d.ldn != null && t.hasAttribute("data-ldn")) {
      if (d.ldn === "0") { S.ldo = 0; S.ldScroll = null; return paint(); }
      S.ldo = (S.ldo | 0) + 30 * (+d.ldn); S.ldScroll = null; return paint();      // назад — без ограничения «не раньше сегодня»
    }
    if (d.edit) { if (!(pos() === "owner" || pos() === "design")) return toast("Исполнителя и сроки назначает руководитель проектного отдела"); S.edit = +d.edit; S.open = null; return paint(); }
    if (d.saveplan) {
      var w = +document.getElementById("pl-who").value, s = document.getElementById("pl-s").value, en = document.getElementById("pl-e").value;
      var id2 = S.edit; S.edit = null;
      return act(api("/orders/" + id2 + "/plan", { executor_id: w, start: s, end: en }));
    }
    if (d.tab) { S.tab = d.tab; if (d.tab === "tz") return loadTzItem(S.open).then(paint); return paint(); }
    if (d.kb) { S.kb = d.kb; return paint(); }
    if (d.nfstart && S.form) {
      S.form.work = d.nfstart === "work"; S.form.err = "";
      if (S.form.work && S.people == null) api("/people").then(function (x) { S.people = x; paint(); }, function () {});
      return paint();
    }
    if (d.new) {
      S.form = { number: "", customer: "", object: "", system: "", systems: [], systems_other: "", modern: 0, due: "", amount: "", adv: false, advSum: "", err: "", fix: d.new === "fix", work: d.new === "work", exec: 0, fixDays: "", remarks: "", planEnd: "" };
      if (S.form.work && S.customers == null) api("/customers").then(function (x) { S.customers = x; paint(); }, function () {});
      if ((S.form.fix || S.form.work) && S.people == null) api("/people").then(function (x) { S.people = x; paint(); }, function () {});
      return paint();
    }
    if (d.tdone) return act(api("/tasks/" + d.tdone + "/done", {}));
    if (d.create) return createOrder();
    var o = find(S.open); if (!o) return;
    if (d.go) {
      if (busyNow()) return toast("Подождите: предыдущее действие ещё выполняется");
      var ex = document.getElementById("dsExec"), id = ex ? +ex.value : 0;
      if (d.needexec && !id && !o.executor_id) return toast("Сначала выберите исполнителя");
      t.disabled = true; t.textContent = "Передаю…";                          // сразу видно, что нажатие принято
      if (d.needexec) {
        var chain = (id && id !== o.executor_id) ? api("/orders/" + o.id + "/assign", { executor_id: id }) : Promise.resolve();
        return act(chain.then(function () { return api("/orders/" + o.id + "/stage", { stage: d.go }); }).then(function () { toast("Готово: задача на этапе «" + d.go + "»"); }));
      }
      return act(api("/orders/" + o.id + "/stage", { stage: d.go }).then(function () { toast("Готово: задача на этапе «" + d.go + "»"); }));
    }
    if (d.urgent != null && d.urgent !== "") return act(api("/orders/" + o.id + "/urgent", { urgent: d.urgent === "1" }));
    if (d.pay) return act(api("/orders/" + o.id + "/payment", { kind: d.pay }));
    if (d.act) { var b = {}; b[d.act] = true; return act(api("/orders/" + o.id + "/act", b)); }
  });
  document.addEventListener("input", function (e) {
    if (e.target.dataset && e.target.dataset.nt && S.nt && e.target.tagName !== "SELECT") { ntField(e.target); return; }
    if (e.target.dataset && e.target.dataset.oe && S.oe && e.target.tagName !== "SELECT") { S.oe[e.target.dataset.oe] = e.target.value; return; }
    if (e.target.dataset && e.target.dataset.pz && S.pz) { S.pz[e.target.dataset.pz] = e.target.value; return; }
    if (e.target.dataset && e.target.dataset.te && S.te && e.target.tagName !== "SELECT") { S.te[e.target.dataset.te] = e.target.value; return; }
    if (e.target.dataset && e.target.dataset.scf) { var cs_ = (S.sc || []).filter(function (x) { return x.id === S.scSel; })[0]; if (cs_) cs_[e.target.dataset.scf] = e.target.value; return; }
    if (e.target.dataset && e.target.dataset.cmd != null) { (S.cmDraft = S.cmDraft || {})[e.target.dataset.cmd] = e.target.value; return; }
    if (e.target.dataset && e.target.dataset.trd != null) { (S.trDraft = S.trDraft || {})[e.target.dataset.trd] = e.target.value; return; }
    if (e.target.id === "dsQ") { S.ov.q = e.target.value; return paint(); }
    if (e.target.id === "cuQ") { S.cu.q = e.target.value; return custFilter(); }
    var sd = e.target.dataset && e.target.dataset.sd;
    if (sd && S.stgD) { var sp_ = sd.split("."); if (S.stgD[sp_[0]]) S.stgD[sp_[0]][sp_[1]] = e.target.value; return; }
    var cmp = e.target.dataset && e.target.dataset.cmp;
    if (cmp && S.comp) { S.comp[cmp] = e.target.value; return; }
    var ppf = e.target.dataset && e.target.dataset.ppf;
    if (ppf && S.pp) {
      if (ppf === "discount") S.pp.discount = +e.target.value || 0;
      else { var q1 = ppf.split("."); S.pp.tiers[+q1[1]][q1[2]] = q1[2] === "price" ? (+e.target.value || 0) : e.target.value; }
      var tt0 = document.getElementById("pcTotal"); if (tt0) tt0.innerHTML = pcTotalHtml();
      return;
    }
    var ccv = e.target.dataset && e.target.dataset.cc;
    if (ccv === "copies" && S.calc) { S.calc.copies = Math.max(1, Math.round(+e.target.value || 1)); var rs2 = document.getElementById("calcRes"); if (rs2) rs2.innerHTML = calcResHtml(); return; }
    if (ccv === "area" && S.calc) { S.calc.area = e.target.value; var rs = document.getElementById("calcRes"); if (rs) rs.innerHTML = calcResHtml(); return; }
    var pcn = e.target.dataset && e.target.dataset.pcn;
    if (pcn != null && S.price) {
      pcState().copies = Math.max(1, Math.round(+e.target.value || 1));
      var tt_ = document.getElementById("pcTotal"); if (tt_) tt_.innerHTML = pcTotalHtml();
      return;
    }
    var prf = e.target.dataset && e.target.dataset.prf;
    if (prf && S.pd) { var pp = prf.split("."); var row = S.pd[+pp[0]]; row[pp[1]] = pp[1] === "price" ? (+e.target.value || 0) : e.target.value; return; }
    var kf = e.target.dataset && e.target.dataset.kf;
    if (kf && S.kpf) {
      var kp_ = kf.split(".");
      if (kp_[0] === "i") S.kpf.items[+kp_[1]][kp_[2]] = kp_[2] === "price" ? (+e.target.value || 0) : e.target.value; else S.kpf[kp_[0]] = e.target.value;
      if (kp_[0] === "i" && kp_[2] === "price") { var tt = document.getElementById("kTotal"); if (tt) tt.textContent = money(kpTotal()); }
      return;
    }
    var ctp = e.target.dataset && e.target.dataset.ctp;
    if (ctp && S.ct && S.ct.data && e.target.type !== "checkbox" && e.target.tagName !== "SELECT") {
      var cv = e.target.value;
      if (e.target.type === "number" && cv !== "") cv = +cv;
      ctSetPath(ctp, cv);
      var cu1 = S.ct.data.customer;
      if (ctp === "customer.party_text") cu1.party_custom = true;
      else if (/^customer\.(name_full|name_short|position_gen|fio_gen|basis|ogrn)$/.test(ctp) && !cu1.party_custom) {
        cu1.party_text = ctParty(cu1);
        var ta = document.querySelector("[data-ctp=\"customer.party_text\"]"); if (ta) ta.value = cu1.party_text;
      }
      ctRefresh();
      return;
    }
    var cf = e.target.dataset && e.target.dataset.cf;
    if (cf && S.cu.draft) {
      var parts = cf.split(".");
      if (parts[0] === "c") S.cu.draft.contacts[+parts[1]][parts[2]] = e.target.value; else S.cu.draft[parts[0]] = e.target.value;
      return;
    }
    if (!S.form || !e.target.id) return;
    var f = S.form, map = { nfNum: "number", nfCust: "customer", nfObj: "object", nfSys: "system", nfDue: "due", nfSum: "amount", nfAdvSum: "advSum", nfExec: "exec", nfFixDays: "fixDays", nfRemarks: "remarks", nfPlanEnd: "planEnd" };
    if (map[e.target.id]) f[map[e.target.id]] = e.target.value;
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "dsWho") { if (!e.target.value) return; S.ov.who = e.target.value; S.ov.tile = ""; S.ov.sel = ""; return paint(); }      // «Чьи задачи» в «Организационных»
    if (e.target.id === "nfAdv" && S.form) { S.form.adv = e.target.checked; paint(); }
    if (e.target.id === "nfNp" && S.form) S.form.np = e.target.checked;
    if (e.target.dataset && e.target.dataset.scfile) { scUpload(e.target.files); e.target.value = ""; return; }
    var cdt = e.target.dataset || {};
    if (cdt.cc && S.calc && cdt.cc !== "area") { var cs_ = calcState(); cs_[cdt.cc] = cdt.cc === "stairs" ? +e.target.value : e.target.value; if (cdt.cc === "sys") cs_.pump = false; paint(); }
    if (cdt.ccb && S.calc) { S.calc[cdt.ccb] = e.target.checked; paint(); }
    if (cdt.ccs && S.calc) {
      var ss = calcState().syss || (calcState().syss = []), ix = ss.indexOf(cdt.ccs);
      if (e.target.checked && ix < 0) ss.push(cdt.ccs); else if (!e.target.checked && ix >= 0) ss.splice(ix, 1);
      paint();
    }
    if (cdt.oe && S.oe) { S.oe[cdt.oe] = e.target.value; return; }
    if (cdt.oepart && S.oe) { (S.oe.parts || []).forEach(function (x) { if (x.id === +cdt.oepart) x.executor_id = +e.target.value || 0; }); return; }
    if (cdt.oech && S.oe) {
      S.oe[cdt.oech] = e.target.checked ? 1 : 0;
      if (cdt.oech === "nonproj") tmRepaint();            // меняется список исполнителей
      return;
    }
    if (cdt.te && S.te) { S.te[cdt.te] = e.target.value; return; }
    if (cdt.nt && S.nt) { ntField(e.target); if (cdt.nt === "step") { var rr = document.getElementById("ds-modal"); if (rr) rr.innerHTML = ntHtml(); } }
    if (cdt.cmd != null && S.cmDraft) S.cmDraft[cdt.cmd] = e.target.value;
    if (cdt.ctforce != null && S.ct) { S.ct.force = e.target.checked; ctRefresh(); return; }
    if (cdt.pct != null && S.price) { pcState().tier = +cdt.pct; paint(); }
    if (e.target.dataset && (e.target.dataset.kf === "customer_id" || e.target.dataset.kf === "pay") && S.kpf) { S.kpf[e.target.dataset.kf] = e.target.dataset.kf === "pay" ? e.target.value : +e.target.value; paint(); }
    if (e.target.dataset && e.target.dataset.ctpick != null && S.ct) { S.ct = { kid: +e.target.value }; loadContractDraft().then(paint); }
    var ctsa = e.target.dataset && e.target.dataset.ctsvadd;
    if (ctsa != null && S.ct && e.target.value !== "") {
      var pr_ = (S.price && S.price.items ? S.price.items.filter(function (i) { return i.active; }) : [])[+e.target.value];
      if (pr_) { S.ct.data.services.push({ name: pr_.name, unit: "услуга", qty: 1, unit_price: pr_.price }); paint(); }
    }
    var ctq = e.target.dataset && e.target.dataset.ctp;
    if (ctq && S.ct && S.ct.data && (e.target.type === "checkbox" || e.target.tagName === "SELECT")) {
      if (ctq === "__upd") { S.ct.upd = e.target.checked; return; }
      ctSetPath(ctq, e.target.type === "checkbox" ? e.target.checked : e.target.value);
      var cu2 = S.ct.data.customer;
      if (ctq === "customer.type") { if (cu2.type === "ip") { cu2.basis = cu2.basis === "Устава" ? "листа записи из ЕГРИП" : cu2.basis; cu2.position_sign = "Индивидуальный предприниматель"; } else if (cu2.type === "org") { cu2.basis = cu2.basis === "листа записи из ЕГРИП" ? "Устава" : cu2.basis; cu2.position_sign = "Генеральный директор"; } if (!cu2.party_custom) cu2.party_text = ctParty(cu2); }
      paint();
    }
    if (e.target.dataset && e.target.dataset.kpstatus && S.kp) { var kid_ = +e.target.dataset.kpstatus; S.kpHot = kid_; var stv_ = e.target.value; act2(api("/kp/" + kid_ + "/status", { status: stv_ }).then(loadKp).then(function () { if (stv_ === "Отказ") { toast("Укажите причину отказа — она попадёт в пятничный созвон"); var kpb_ = document.querySelector('[data-kpedit="' + kid_ + '"]'); if (kpb_) kpb_.click(); } else if (!S.kpArch && stv_ === "Закрыто") toast("КП ушло в архив"); if (stv_ === "Оплачено") { S.orders = null; S.tasks = null; return load(); } }), false); }
    if (e.target.dataset && e.target.dataset.cfchk != null && S.cu.draft) { S.cu.draft.regular = e.target.checked ? 1 : 0; }
    if (e.target.dataset && e.target.dataset.cftz != null && S.cu.draft) { S.cu.draft.tz = e.target.value; paint(); }
    if (e.target.id === "flOrder") { S.flOrder = +e.target.value; loadPath().then(paint); }
    if (e.target.dataset && e.target.dataset.aur && S.au) {
      var rid = e.target.dataset.aur, box = document.querySelector('[data-auv="' + rid + '"]'), en = document.querySelector('[data-aue="' + rid + '"]');
      api("/auto", { rule: rid, enabled: en.checked, value: +box.value || 0 }).then(function (r) { S.au.rules = r.rules.map(function (x) { var o = S.au.rules.filter(function (y) { return y.id === x.id; })[0]; return Object.assign({}, x, { fired: o ? o.fired : 0 }); }); toast("Правило сохранено"); paint(); }, function (er) { toast(String(er)); });
    }
    if (e.target.dataset && e.target.dataset.prfa != null && S.pd) { S.pd[+e.target.dataset.prfa].active = e.target.checked; }
    if (e.target.dataset && e.target.dataset.rpk && S.rp) { rpSave(e.target.dataset.rpk, e.target.value); if (e.target.tagName === "SELECT") paint(); }
    if (e.target.dataset && e.target.dataset.rpkp && S.rp) {                 // вероятность, ожидаемая оплата и следующий контакт пишутся прямо в КП
      var kpf = e.target.dataset.rpkp.split("|"), kpb = {}; kpb[kpf[1]] = e.target.value;
      var kpi = rpFind("kp" + kpf[0] + ":" + kpf[1]); if (kpi) kpi.v = e.target.value;
      api("/kp/" + kpf[0] + "/edit", kpb).then(function () { toast("Сохранено в КП"); S.kp = null; }, function (er) { toast(String(er)); });
    }
    if (e.target.dataset && e.target.dataset.wc && S.wk) {
      var dr = dayRec(e.target.dataset.wc); dr.comment = e.target.value;
      api("/week/day", { day: e.target.dataset.wc, comment: e.target.value }).catch(function (er) { toast(String(er)); });
    }
  });
  function createOrder() {
    var f = S.form;
    if (!f.number.trim() || !f.customer.trim() || !f.object.trim()) { f.err = "Заполните номер, заказчика и объект"; return paint(); }
    if (f.fix) {                                                // заказчика мост находит или заводит по названию, карточку не трогает
      return api("/orders", { number: f.number.trim(), customer: f.customer.trim(), object: f.object.trim(), system: sysLabel(f), systems: f.systems || [], systems_other: (f.systems_other || "").trim(), modern: f.modern ? 1 : 0, due_date: f.due || "", stage: "Корректировка",
        executor_id: +f.exec || 0, fix_days: +f.fixDays || 0, fix_remarks: f.remarks || "" })
        .then(function (r) { makeFolder({ number: f.number.trim(), object: f.object.trim(), customer: f.customer.trim(), systems: f.systems, systems_other: (f.systems_other || "").trim() });
          S.form = null; S.customers = null; S.orders = null; toast("Задача поставлена на корректировку"); S.open = r.id; S.tab = "rounds"; S.rd = null; S.history = []; return load().then(paint); }, function (er) { f.err = String(er); paint(); });
    }
    if (f.work && !(+f.exec)) { f.err = "Выберите исполнителя — задача сразу уйдёт ему в работу"; return paint(); }
    api("/customers", { name: f.customer.trim() }).then(function (c) {
      return api("/orders", { number: f.number.trim(), customer_id: c.id, object: f.object.trim(), system: sysLabel(f), systems: f.systems || [], systems_other: (f.systems_other || "").trim(), modern: f.modern ? 1 : 0, due_date: f.due || "", amount: +f.amount || 0,
        adv_mode: f.adv ? "advance" : "none", adv_sum: f.adv ? (+f.advSum || 0) : 0, contract_date: new Date().toISOString().slice(0, 10), nonproj: f.np ? 1 : -1,
        stage: f.work ? "В проектировании" : "", executor_id: f.work ? +f.exec : 0, plan_end: f.work ? (f.planEnd || "") : "" });
    }).then(function (r) { if (f.work) toast("Задача создана и отдана в проектирование"); makeFolder({ number: f.number.trim(), object: f.object.trim(), customer: f.customer.trim(), systems: f.systems, systems_other: (f.systems_other || "").trim() });
      S.form = null; S.customers = null; S.orders = null;
      return load().then(function () {
        var no = r && find(r.id), un = ((no && no.parts) || []).filter(function (x) { return !x.executor_id; });
        if (un.length) { S.open = r.id; S.tab = "info"; S.oe = null; toast("Назначьте исполнителя раздела " + un.map(function (x) { return x.system; }).join(", ")); return paint(); }
        DS.route();
      });
    }, function (er) { f.err = String(er); paint(); });
  }
  if (C) { C.on("logout", function () { BOOT = null; S.orders = S.meta = S.customers = S.people = S.tasks = null; S.cu.q = ""; S.kp = S.cm = null; S.open = null; var m = document.getElementById("ds-modal"); if (m) m.innerHTML = ""; }); }
  bootStart();
})();
if (location.hash === '' || location.hash === '#/' || /^#\/t(ask)?\//.test(location.hash)) { setTimeout(function () { if (document.getElementById('tasks-app') && document.getElementById('tasks-app').style.display !== 'none') DS.route(); }, 0); }
(function () { var h = location.hash; var map = { '#/cal': ['load', 'cal-app'] }; if (map[h]) setTimeout(function () { DS.mount(map[h][0], document.getElementById(map[h][1])); }, 0); })();
if (window.MPBC && typeof window.globalRouter === "function") {
  ["login", "logout", "ready"].forEach(function (ev) {
    window.MPBC.on(ev, function () { if (ev === "ready") window.DS_READY = true; window.globalRouter(); });
  });
}
(function () { var h = location.hash; var map = { '#/clients': ['cust', 'clients-app'], '#/my': ['week', 'my-app'] }; if (map[h]) setTimeout(function () { var p = window.dsPosition ? dsPosition() : ''; if (h === '#/my' && p !== 'designer' && p !== 'design' && p !== 'norm') return; DS.mount(map[h][0], document.getElementById(map[h][1])); }, 0); })();
DS.ownsMy = function () { var p = pos2(); return p === 'designer' || p === 'design' || p === 'norm'; }; function pos2() { return (window.MPBC && MPBC.me && (MPBC.me.position || (MPBC.me.role === 'admin' ? 'owner' : ''))) || ''; }
(function () { var h = location.hash; var map = { '#/kpc': ['kpc', 'kpc-app'], '#/contracts': ['contract', 'contracts-app'] }; var k = map[h] || (/^#\/kpreg/.test(h) ? ['kp', 'kpreg-app'] : null); if (k) setTimeout(function () { DS.mount(k[0], document.getElementById(k[1])); }, 0); })();
(function () { var h = location.hash; var map = { '#/report': ['report', 'report-app'], '#/stats': ['stats', 'stats-app'] }; if (map[h]) setTimeout(function () { DS.mount(map[h][0], document.getElementById(map[h][1])); }, 0); })();
(function () { if (location.hash === '#/price') setTimeout(function () { DS.mount('price', document.getElementById('price-app')); }, 0); })();
