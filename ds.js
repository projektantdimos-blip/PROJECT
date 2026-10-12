/* Проекты DS — экран «Задачи» и окно задачи. Данные — только с моста (/api/ds), уже отфильтрованные по роли:
   скрытые стадии сюда не приходят, поэтому интерфейс их не «прячет», а просто не получает. */
(function () {
  "use strict";
  var C = window.MPBC;
  var DS = window.DS = {};
  var S = { orders: null, meta: null, kb: "p", open: null, tab: "info", err: "", customers: null, people: null, history: null, tasks: null, form: null, busy: false, mount: null, ov: { type: "p", tile: "", stage: "", q: "" }, ld: "week", edit: null, cu: { sel: null, draft: null, err: "" }, wk: null, kp: null, kpf: null, ct: null, rp: null, st: null, price: null, pd: null, pdErr: "", comp: null, compErr: "", stg: null, stgD: null, stgErr: "", au: null, fl: null, flStep: null, flTab: "map", flOrder: 0, flHist: null, tzov: null, tz: null, tzNew: "" };

  var STAGE_COLOR = { "Ожидает аванс": "#b0883a", "Сбор данных": "#8794ab", "Готов к проектированию": "#2b8a9a", "В проектировании": "#3a86d6", "Проверка": "#8b6fe0", "На согласовании": "#e0a21c", "Корректировка": "#d9782f", "Сдано": "#1f9d63", "Закрыто": "#6a768c" };
  var STAGE_ORDER = ["Ожидает аванс", "Сбор данных", "Готов к проектированию", "В проектировании", "Проверка", "На согласовании", "Корректировка", "Сдано", "Закрыто"];
  var ROLE_NAME = { owner: "Руководитель", design: "Руководитель проектного отдела", sales: "Руководитель отдела продаж", ops: "Операционный менеджер", acc: "Бухгалтер", designer: "Проектировщик" };
  var ROLE_NOTE = {
    owner: "Вы видите всё, включая закрытый кабинет «Статистика».",
    design: "Вы видите проекты на стадиях «Готов к проектированию», «В проектировании», «Проверка» и «Корректировка». Звонки заказчикам делаете вы.",
    sales: "Проектные, операционные и продажи, заказчики, договоры, реестр КП и переписка.",
    ops: "Проектные, операционные и продажи, заказчики, договоры, реестр КП и переписка.",
    acc: "Закрытие проектов: акт, счёт, оплата и галочка «Закрыто».",
    designer: "Только ваши проекты. Договорных сумм, контактов заказчиков и чужих проектов здесь нет."
  };
  var COL = { Ольга: "linear-gradient(135deg,#f5ab86,#e07a46)", Кристина: "linear-gradient(135deg,#bd96ee,#8a5fd0)", Иван: "linear-gradient(135deg,#46c28a,#238a58)", Мария: "linear-gradient(135deg,#5aa2ee,#2f6fbd)", Пётр: "linear-gradient(135deg,#4fc3c3,#1f9a9a)", Елена: "linear-gradient(135deg,#e58bb0,#c2527f)" };

  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plural(n, f) { n = Math.abs(n); var a = n % 10, b = n % 100; return n + " " + (a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]); }
  function leftText(l) { if (l == null) return "Без срока"; if (l < 0) return "Просрочено " + plural(l, ["день", "дня", "дней"]); if (l === 0) return "Срок сегодня"; return "Осталось " + plural(l, ["день", "дня", "дней"]); }
  function tone(o) { var l = o.left_days; return l == null ? "muted" : l < 0 ? "bad" : l <= 3 ? "warn" : "info"; }
  function dmy(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ""); return m ? m[3] + "." + m[2] + "." + m[1] : "—"; }
  function money(n) { return Number(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function ava(n, c) { n = n || "?"; return '<span class="ava ' + (c || "") + '" style="background:' + (COL[n] || "linear-gradient(135deg,#9aa6bd,#6f7d97)") + '">' + E(n[0]) + "</span>"; }
  function pos() { return (C && C.me && (C.me.position || (C.me.role === "admin" ? "owner" : ""))) || ""; }
  function api(path, body) { return C.call("/../ds" + path, body ? { body: body } : {}); }
  function toast(m) { if (window.toast) window.toast(m); else alert(m); }
  function can(k) { return S.meta && S.meta.can && S.meta.can[k]; }
  function find(id) { return (S.orders || []).filter(function (o) { return o.id === id; })[0]; }
  var ICON = { plus: '<path d="M12 5v14M5 12h14"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>' };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24">' + (ICON[n] || "") + "</svg>"; }

  /* ---------- загрузка ---------- */
  function load() {
    S.err = "";
    return Promise.all([api("/meta"), api("/orders"), api("/tasks")]).then(function (r) {
      S.meta = r[0]; S.orders = r[1]; S.tasks = r[2];
      var p = r[0].position;
      var extra = [];
      if (r[0].can.customers && S.customers == null) extra.push(api("/customers").then(function (c) { S.customers = c; }, function () { S.customers = []; }));
      if ((p === "owner" || p === "design") && S.people == null) extra.push(api("/people").then(function (x) { S.people = x; }, function () { S.people = []; }));
      return Promise.all(extra);
    });
  }
  function root() { return document.getElementById("tasks-app"); }
  function modalRoot() {
    var m = document.getElementById("ds-modal");
    if (!m) { m = document.createElement("div"); m.id = "ds-modal"; m.className = "ds"; document.body.appendChild(m); }
    return m;
  }

  var TITLES = { tasks: "Задачи", ov: "Обзор", load: "Занятость", cust: "Заказчики", week: "План на неделю", kp: "Реестр КП", kpc: "Конструктор КП", contract: "Конструктор договора", report: "Недельный отчёт", stats: "Статистика", price: "Прайс", stages: "Этапы и сроки", auto: "Автоматизация", flow: "Конвейер заказа", tz: "Технические задания" };
  function mount(kind, el) {
    if (!el) return;
    S.mount = { kind: kind, el: el };
    var m = /^#\/task\/(\d+)/.exec(location.hash);
    if (m) S.open = +m[1];
    if (!C || !C.loggedIn()) {
      el.innerHTML = '<div class="ds dspage"><div class="head"><div><h1>' + TITLES[kind] + '</h1><p>Войдите, чтобы увидеть данные вашей роли</p></div><button class="btn primary" id="dsLogin">Войти по PIN</button></div></div>';
      var b = document.getElementById("dsLogin"); if (b) b.onclick = function () { C.requireLogin().then(function () { mount(kind, el); }); };
      modalRoot().innerHTML = "";
      return;
    }
    if (S.orders == null) { el.innerHTML = '<div class="ds dspage"><div class="loading">Загружаю…</div></div>'; }
    var need = S.orders == null ? load() : Promise.resolve();
    if ((kind === "tasks" || kind === "ov") && /^(owner|sales|ops)$/.test(pos())) need = need.then(loadKp);
    if (kind === "week") need = need.then(loadWeek);
    if (kind === "kp" || kind === "kpc" || kind === "contract") need = need.then(loadKp);
    if (kind === "price" || kind === "kpc") need = need.then(loadPrice);
    if (kind === "price") need = need.then(loadCompany);
    if (kind === "stages") need = need.then(loadStages);
    if (kind === "flow") need = need.then(loadFlow);
    if (kind === "tz") need = need.then(loadTz);
    if (kind === "auto") need = need.then(loadAuto);
    if (kind === "report") need = need.then(loadReport);
    if (kind === "stats") need = need.then(loadStats);
    need.then(function () { return S.open ? api("/orders/" + S.open + "/history").then(function (h2) { S.history = h2; }, function () { S.history = []; }) : null; })
      .then(paint, function (e) { S.err = String(e); paint(); });
  }
  DS.route = function () { mount("tasks", root()); };
  DS.mount = mount;
  DS.reload = function () { S.orders = null; S.history = null; if (S.mount) mount(S.mount.kind, S.mount.el); };
  /* ---------- экран «Задачи» ---------- */
  function card(o, withStage) {
    var stage = o.stage, money_ = can("money") && o.amount != null;
    return '<button class="task ' + (o.urgent ? "urgent" : "") + '" data-open="' + o.id + '"><span class="stripe" style="--c:' + (o.urgent || (o.left_days != null && o.left_days < 0) ? "var(--bad)" : (STAGE_COLOR[stage] || "var(--brand)")) + '"></span><span class="body">'
      + '<span class="r1"><span class="num">№' + E(o.number) + "</span><span>" + E(o.customer || "") + '</span><span class="fl">' + (o.urgent ? '<span class="pill urg">⚡ Срочно</span>' : "") + "</span></span>"
      + '<span class="ttl" style="display:block">' + E(o.object) + "</span>"
      + '<span class="con ' + (o.left_days != null && o.left_days < 0 ? "bad" : "") + '" style="display:block">Договор до ' + dmy(o.due_date) + "</span>"
      + '<span class="meta">' + (o.executor ? ava(o.executor, "sm") + '<span style="font-size:.84rem;margin-right:auto">' + E(o.executor) + "</span>" : '<span class="pill muted" style="margin-right:auto">не назначен</span>')
      + (withStage ? '<span class="pill muted"><i class="dot" style="background:' + (STAGE_COLOR[stage] || "#999") + '"></i>' + E(stage) + "</span>" : "")
      + (money_ ? (o.post_paid ? '<span class="pill ok">₽ Оплачено</span>' : '<span class="pill warn">₽ Не оплачено</span>') : "")
      + '<span class="pill ' + tone(o) + '">' + E(leftText(o.left_days)) + "</span></span></span></button>";
  }
  /* ---------- операционные задачи и продажи: сроки, ответственные, состояния ---------- */
  function taskTone(t) { return t.left_days == null ? "muted" : t.left_days < 0 ? "bad" : t.left_days <= 2 ? "warn" : "info"; }
  function taskCard(t) {
    var tn = taskTone(t), kindName = t.kind === "acc" ? "Бухгалтерия" : t.kind === "ops" ? "Операционная" : "Продажи";
    var btns = [];
    if (t.state !== "work") btns.push('<button class="btn ghost sm" data-tstate="' + t.id + ':work">В работу</button>');
    if (t.state !== "wait") btns.push('<button class="btn ghost sm" data-tstate="' + t.id + ':wait">Ждём ответа</button>');
    btns.push('<button class="btn ok sm" data-tstate="' + t.id + ':done">Выполнено</button>');
    return '<div class="task"><span class="stripe" style="--c:' + (tn === "bad" ? "var(--bad)" : tn === "warn" ? "var(--accent)" : "var(--org)") + '"></span><span class="body">'
      + '<span class="r1">' + (t.order_id ? '<button class="num" style="color:var(--org);font-size:1.1rem" data-open="' + t.order_id + '">№' + E(t.order_number) + "</button>" : '<span class="num" style="color:var(--org);font-size:1.1rem">' + E(kindName) + "</span>")
      + "<span>" + E(t.assignee || "") + "</span></span>"
      + '<span class="ttl" style="display:block">' + E(t.title.replace(/:\s*№.*$/, "")) + "</span>"
      + (t.object ? '<span class="con" style="display:block">' + E(t.object) + "</span>" : "")
      + '<span class="meta" style="margin-bottom:8px"><span class="pill ' + tn + '">' + (t.due ? "до " + dmy(t.due).slice(0, 5) + " · " : "") + E(leftText(t.left_days)) + "</span></span>"
      + '<span class="meta" style="gap:6px">' + btns.join("") + "</span></span></div>";
  }
  function opsBoard(items, emptyText) {
    if (!items.length) return '<div class="panel pad"><p class="sub" style="margin:0">' + emptyText + "</p></div>";
    var cols = [["new", "Новые"], ["work", "В работе"], ["wait", "Ждёт ответа заказчика"]];
    return '<div class="board">' + cols.map(function (c) {
      var arr = items.filter(function (x) { return (x.state || "new") === c[0]; }).sort(function (a, b) { return (a.left_days == null ? 999 : a.left_days) - (b.left_days == null ? 999 : b.left_days); });
      return '<div class="col"><div class="col-h"><b>' + c[1] + '</b><span class="n">' + arr.length + "</span></div>" + arr.map(taskCard).join("") + "</div>";
    }).join("") + "</div>";
  }
  var KP_COLS = [["Новое обращение", "Обращение"], ["КП отправлено", "КП отправлено"], ["Переговоры", "Переговоры"], ["Согласование условий", "Согласование условий"], ["Договор подписан", "Договор подписан · ждём оплату"]];
  function kpTone(k) { return k.last_days == null ? "muted" : k.last_days > 5 ? "bad" : k.last_days >= 3 ? "warn" : "info"; }
  function kpCard(k) {
    var tn = kpTone(k);
    return '<a class="task" href="#/kpreg/" style="text-decoration:none;color:inherit"><span class="stripe" style="--c:' + (tn === "bad" ? "var(--bad)" : "var(--org)") + '"></span><span class="body">'
      + '<span class="r1"><span class="num" style="color:var(--org);font-size:1.1rem">' + E(k.number) + "</span><span>" + E(k.customer) + '</span><span class="fl"><b>' + money(k.amount) + "</b></span></span>"
      + '<span class="ttl" style="display:block">' + E(k.object || "—") + "</span>"
      + '<span class="meta"><span class="pill ' + tn + '">' + (k.last_days == null ? "нет общения" : k.last_days === 0 ? "общались сегодня" : "без общения " + plural(k.last_days, ["день", "дня", "дней"])) + "</span>"
      + (k.issued_date ? '<span class="pill muted">выставлено ' + dmy(k.issued_date).slice(0, 5) + "</span>" : "") + (k.manager ? '<span class="pill muted">' + E(k.manager) + "</span>" : "") + "</span></span></a>";
  }
  function salesBoard() {
    var kps = (S.kp || []).filter(function (k) { return k.status !== "Оплачено" && k.status !== "Отказ"; });
    var tasks = (S.tasks || []).filter(function (x) { return x.kind === "sales"; });
    var cols = KP_COLS.map(function (c) {
      var arr = kps.filter(function (k) { return k.status === c[0]; });
      return '<div class="col"><div class="col-h"><b>' + c[1] + '</b><span class="n">' + arr.length + "</span></div>" + arr.map(kpCard).join("") + "</div>";
    }).join("");
    var tcol = '<div class="col"><div class="col-h"><b>Задачи продаж</b><span class="n">' + tasks.length + "</span></div>" + tasks.map(taskCard).join("") + "</div>";
    return '<div class="board">' + cols + tcol + "</div>";
  }
  function screen() {
    var p = pos(), canAll = p === "owner" || p === "sales" || p === "ops", kb = canAll ? S.kb : "p";
    var seg = canAll ? '<div class="bar" style="margin-bottom:16px"><div class="seg">' + [["p", "Проектные"], ["o", "Операционные"], ["s", "Продажи"]].map(function (x) { return '<button data-kb="' + x[0] + '" class="' + (kb === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div></div>" : "";
    var body;
    if (kb === "p") {
      var stages = (S.meta.stages || []).filter(function (s) { return s !== "Закрыто"; });
      body = '<div class="board">' + stages.map(function (st) {
        var items = S.orders.filter(function (o) { return o.stage === st; });
        return '<div class="col"><div class="col-h"><i class="dot" style="background:' + (STAGE_COLOR[st] || "#999") + '"></i><b>' + E(st) + '</b><span class="n">' + items.length + "</span></div>" + items.map(card).join("") + "</div>";
      }).join("") + "</div>";
    } else {
      body = kb === "s" ? salesBoard() : opsBoard((S.tasks || []).filter(function (x) { return x.kind === "ops" || x.kind === "acc"; }), "Операционных задач нет.");
    }
    var newBtn = (p === "owner" || p === "sales" || p === "ops") ? '<button class="btn accent" data-new="1">' + ic("plus") + "Новая задача</button>" : "";
    return '<div class="ds dspage"><div class="head"><div><h1>Задачи</h1><p>' + (kb === "p" ? "Проекты по стадиям; нажмите на карточку, чтобы открыть окно задачи" : kb === "o" ? "Операционные: сбор данных, отправка проектов, постпродажа" : "Продажи: от обращения до аванса") + "</p></div>" + newBtn + "</div>"
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>" + seg + body + "</div>";
  }

  /* ---------- окно задачи ---------- */
  function nextStep(o) {
    var p = pos(), st = o.stage, ownerOk = p === "owner";
    var map = {
      "Ожидает аванс": { roles: ["acc"], text: "Ждём аванс. Оплата из 1С переведёт задачу на «Сбор данных»", btn: "Аванс получен", pay: "advance" },
      "Сбор данных": { roles: ["ops"], text: "Все данные собраны: передать на проектирование", btn: "Передать «Готов к проектированию»", to: "Готов к проектированию" },
      "Готов к проектированию": { roles: ["design"], text: "Назначить проектировщика и начать проектирование", btn: "В проектирование", to: "В проектировании", needExec: true },
      "В проектировании": { roles: ["designer", "design"], text: "Проект готов: передать на проверку", btn: "Передать на проверку", to: "Проверка" },
      "Проверка": { roles: ["design"], text: "Проверка пройдена: отправить заказчику", btn: "На согласование", to: "На согласовании", back: { btn: "Вернуть на доработку", to: "В проектировании" } },
      "На согласовании": { roles: ["sales"], text: "Ждём ответа заказчика", btn: "Заказчик принял: «Сдано»", to: "Сдано", back: { btn: "Есть замечания", to: "Корректировка" } },
      "Корректировка": { roles: ["designer", "design"], text: "Правки внесены: вернуть на согласование", btn: "Вернуть на согласование", to: "На согласовании" },
      "Сдано": { roles: ["acc"], text: "Акт подписан, оплата получена: закрыть задачу", btn: "Закрыто", to: "Закрыто" }
    };
    var n = map[st];
    if (!n || !(ownerOk || n.roles.indexOf(p) >= 0)) return null;
    return n;
  }
  function stepper(o) {
    var st = (S.meta.stages || []);
    var cur = st.indexOf(o.stage);
    return '<div class="stepper">' + st.map(function (s, i) { return '<div class="stp ' + (i < cur ? "done" : i === cur ? "cur" : "") + '">' + E(s) + "</div>"; }).join("") + "</div>";
  }
  function customerOf(o) {
    return (S.customers || []).filter(function (c) { return c.id === o.customer_id; })[0];
  }
  function docRow(done, title, sub) { return '<div class="doc ' + (done ? "done" : "wait") + '"><span>' + (done ? "✅" : "⏳") + "</span><div><b>" + E(title) + "</b><small>" + E(sub) + "</small></div></div>"; }
  function infoTab(o) {
    var p = pos(), cu = customerOf(o), designerView = p === "designer";
    var dl = '<div class="dl ' + (o.left_days != null && o.left_days < 0 ? "bad" : "") + '"><div><small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:.68rem">Дедлайн</small><br><b>' + dmy(o.due_date) + "</b></div><b style=\"font-size:.95rem\">" + E(leftText(o.left_days)) + "</b></div>";
    var work = '<div class="panel pad"><h3>Работа</h3>' + dl + '<div class="kv"><span>Исполнитель</span><span><b>' + E(o.executor || "не назначен") + "</b></span><span>Стадия</span><span>" + E(o.stage) + "</span>"
      + (o.contract_date ? "<span>Договор от</span><span>" + dmy(o.contract_date) + "</span>" : "") + "<span>Приоритет</span><span>" + E(o.priority) + "</span>"
      + (designerView ? "" : "<span>Правок</span><span>" + (o.edits || 0) + "</span>") + "</div></div>";
    var cust = "";
    if (o.customer && !designerView) {
      cust = '<div class="panel pad"><h3>Заказчик</h3><div class="kv" style="margin-top:10px"><span>Компания</span><span><b>' + E(o.customer) + "</b>" + (cu && cu.regular ? ' <span class="pill ok">постоянный</span>' : "") + "</span></div>"
        + (cu && cu.contacts ? cu.contacts.map(function (x) { return '<div class="ctt" style="margin-top:10px"><b>' + E(x.fio) + "</b><small>" + E(x.pos || "должность не указана") + "</small><div>" + E(x.phone || "—") + "</div></div>"; }).join("") : "")
        + (cu && cu.tz ? '<div class="kv"><span>Часовой пояс</span><span>' + E(cu.tz) + " · сейчас <b>" + nowIn(cu.tz) + "</b></span></div>" : "")
        + (cu && cu.comment ? '<div class="note">📝 Комментарий менеджера: ' + E(cu.comment) + "</div>" : "") + "</div>";
    }
    var mon = "";
    if (can("money") && o.amount != null) {
      var adv = o.adv_mode === "advance";
      mon = '<div class="panel pad"><h3>Деньги и документы <span class="pill sys">из 1С</span></h3><div style="margin-top:10px">'
        + docRow(true, "Договор №" + o.number + " · " + money(o.amount), "подписан" + (o.contract_date ? " " + dmy(o.contract_date) : ""))
        + docRow(!adv || o.adv_paid, "Аванс" + (adv ? " " + money(o.adv_sum) : ""), !adv ? "не предусмотрен" : o.adv_paid ? "оплачен " + dmy(o.adv_date) : "ждём оплату")
        + docRow(!!o.act_signed, "Акт", o.act_signed ? "подписан" : o.act_sent ? "отправлен, ждём подпись" : "будет после сдачи")
        + docRow(!!o.post_paid, "Постоплата", o.post_paid ? "получена " + dmy(o.post_date) : "ожидается") + "</div>"
        + accButtons(o) + "</div>";
    }
    var canCreate = p === "owner" || p === "sales" || p === "ops";
    var fol = '<div class="panel pad"><h3>Папка и чат</h3><div class="doc" style="margin-top:10px"><span>📂</span><div style="flex:1"><b>\\\\176.197.21.187\\ServAmani\\' + E(o.number) + ". " + E(o.object) + "</b><small>Откроется в проводнике (нужен VPN и установленная кнопка)</small></div></div>"
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px"><a class="btn ghost sm" style="text-decoration:none" href="' + folderUrl(o, false) + '">Перейти в папку на сервере</a>'
      + (canCreate ? '<a class="btn ghost sm" style="text-decoration:none" href="' + folderUrl(o, true) + '">Создать папку</a>' : "") + "</div>"
      + '<div class="doc"><span>💬</span><div style="flex:1"><b>Чат проекта</b><small>Обсуждение задачи №' + E(o.number) + '</small></div><a class="btn ghost sm" style="text-decoration:none" href="#/team?room=t' + o.id + '">Открыть</a></div></div>';
    return '<div class="grid g2">' + work + cust + mon + fol + "</div>";
  }
  function folderUrl(o, create) {
    return "mpb://open?num=" + encodeURIComponent(o.number) + "&name=" + encodeURIComponent(o.object || "") + (create ? "&create=1" : "");
  }
  function accButtons(o) {
    var p = pos();
    if (p !== "acc" && p !== "owner") return "";
    var b = [];
    if (o.stage === "Сдано") {
      if (!o.act_sent) b.push('<button class="btn ghost sm" data-act="sent">Акт отправлен</button>');
      if (!o.act_signed) b.push('<button class="btn ghost sm" data-act="signed">Акт подписан</button>');
      if (!o.post_paid) b.push('<button class="btn ghost sm" data-pay="post">Оплата получена</button>');
    }
    return b.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' + b.join("") + "</div>" : "";
  }
  function nowIn(tz) { try { return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz }); } catch (e) { return "—"; } }
  function logTab() {
    var h = S.history || [];
    if (!h.length) return '<div class="note">Событий пока нет</div>';
    return '<div class="trace">' + h.slice().reverse().map(function (e) {
      var d = new Date(e.ts * 1000);
      return '<div class="ev" style="--c:var(--brand)"><time>' + d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + "</time><b>" + E(e.action) + (e.detail ? ": " + E(e.detail) : "") + '</b><span class="note" style="margin:0">' + E(e.user_name) + "</span></div>";
    }).join("") + "</div>";
  }
  function windowHtml(o) {
    var p = pos(), n = nextStep(o), showUrgent = o.stage === "Готов к проектированию" && (p === "owner" || p === "design" || p === "ops" || p === "sales");
    var nx = "";
    if (n) {
      var sel = "";
      if (n.needExec && S.people) {
        sel = '<select id="dsExec" style="padding:9px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface)"><option value="">— исполнитель —</option>'
          + S.people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === o.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select>";
      }
      nx = '<div class="next"><div style="flex:1;min-width:200px"><small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:.7rem">Следующий шаг</small><br><b>' + E(n.text) + "</b>"
        + '<div style="font-size:.84rem;color:var(--muted)">Система сама оповестит следующего исполнителя</div></div>' + sel
        + (n.pay ? '<button class="btn primary" data-pay="' + n.pay + '">' + E(n.btn) + "</button>"
          : '<button class="btn primary" data-go="' + E(n.to) + '"' + (n.needExec ? ' data-needexec="1"' : "") + ">" + E(n.btn) + "</button>")
        + (n.back ? '<button class="btn ghost" data-go="' + E(n.back.to) + '">' + E(n.back.btn) + "</button>" : "")
        + (showUrgent ? '<button class="btn ghost" data-urgent="' + (o.urgent ? 0 : 1) + '">⚡ ' + (o.urgent ? "Снять срочность" : "Срочная") + "</button>" : "") + "</div>";
    } else if (showUrgent) {
      nx = '<div class="next"><div style="flex:1"><b>Срочность</b></div><button class="btn ghost" data-urgent="' + (o.urgent ? 0 : 1) + '">⚡ ' + (o.urgent ? "Снять срочность" : "Срочная") + "</button></div>";
    }
    var tabs = [["info", "Информация"]];
    if (["owner", "ops", "sales", "design"].indexOf(p) >= 0) tabs.push(["tz", "Тех. задание"]);
    tabs.push(["log", "История"]);
    var body = S.tab === "log" ? logTab() : S.tab === "tz" ? tzTab() : infoTab(o);
    var money_ = can("money") && o.amount != null;
    return '<div class="modal-bg" data-bg="1"><div class="modal"><div class="m-head"><div class="row"><h2>№' + E(o.number) + (o.customer ? " · " + E(o.customer) : "") + "</h2>"
      + (o.urgent ? '<span class="pill urg">⚡ Срочно</span>' : "") + (money_ ? (o.post_paid ? '<span class="pill ok">₽ Оплачено</span>' : '<span class="pill warn">₽ Не оплачено</span>') : "")
      + '<button class="x" data-close="1">✕</button></div><div style="color:var(--muted);margin-top:2px">' + E(o.object) + "</div>" + stepper(o) + "</div>"
      + '<div class="m-body">' + nx + '<div class="tabs">' + tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("") + "</div>" + body + "</div></div></div>";
  }
  function formHtml() {
    var f = S.form;
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><h2 style="font-size:1.2rem">Новая задача из договора</h2><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
      + '<div class="fld"><label>Номер договора</label><input id="nfNum" value="' + E(f.number) + '"></div>'
      + '<div class="fld"><label>Заказчик (компания)</label><input id="nfCust" value="' + E(f.customer) + '" list="dsCust"></div><datalist id="dsCust">' + (S.customers || []).map(function (c) { return '<option value="' + E(c.name) + '">'; }).join("") + "</datalist>"
      + '<div class="fld"><label>Объект</label><input id="nfObj" value="' + E(f.object) + '"></div>'
      + '<div class="g2f"><div class="fld"><label>Срок по договору</label><input id="nfDue" type="date" value="' + E(f.due) + '"></div><div class="fld"><label>Сумма, ₽</label><input id="nfSum" type="number" min="0" value="' + E(f.amount) + '"></div></div>'
      + '<div class="fld"><label><input type="checkbox" id="nfAdv" ' + (f.adv ? "checked" : "") + '> Предусмотрен аванс</label></div>'
      + '<div class="fld" ' + (f.adv ? "" : 'style="display:none"') + ' id="nfAdvBox"><label>Сумма аванса, ₽</label><input id="nfAdvSum" type="number" min="0" value="' + E(f.advSum) + '"></div>'
      + '<div class="dbox"><small>Что произойдёт</small>' + (f.adv ? "Задача встанет на паузу «Ожидает аванс», бухгалтеру уйдёт «Выставить счёт на аванс»." : "Задача сразу попадёт на «Сбор данных» к операционному менеджеру.") + "</div>"
      + '<div class="err" id="nfErr">' + E(f.err || "") + '</div><button class="btn primary block" data-create="1">Создать задачу</button></div></div></div>';
  }
  function paint() {
    if (!S.mount) return;
    var el = S.mount.el;
    if (S.err) { el.innerHTML = '<div class="ds dspage"><div class="err">Ошибка: ' + E(S.err) + '</div><button class="btn ghost" id="dsRetry">Повторить</button></div>'; var r = document.getElementById("dsRetry"); if (r) r.onclick = DS.reload; return; }
    if (!S.meta) return;
    var q = document.activeElement && document.activeElement.id === "dsQ";
    var k = S.mount.kind;
    el.innerHTML = k === "ov" ? '<div class="ds dspage">' + overview() + "</div>" : k === "load" ? '<div class="ds dspage">' + loadScreen() + "</div>"
      : k === "flow" ? '<div class="ds dspage">' + flowScreen() + "</div>" : k === "tz" ? '<div class="ds dspage">' + tzScreen() + "</div>"
      : k === "stages" ? '<div class="ds dspage">' + stagesScreen() + "</div>" : k === "auto" ? '<div class="ds dspage">' + autoScreen() + "</div>"
      : k === "price" ? '<div class="ds dspage">' + priceScreen() + "</div>" : k === "report" ? '<div class="ds dspage">' + reportScreen() + "</div>" : k === "stats" ? '<div class="ds dspage">' + statsScreen() + "</div>"
      : k === "kp" ? '<div class="ds dspage">' + kpScreen() + "</div>" : k === "kpc" ? '<div class="ds dspage">' + kpcScreen() + "</div>" : k === "contract" ? '<div class="ds dspage">' + contractScreen() + "</div>"
      : k === "cust" ? '<div class="ds dspage">' + custScreen() + "</div>" : k === "week" ? '<div class="ds dspage">' + weekScreen() + "</div>" : screen();
    if (q) { var qe = document.getElementById("dsQ"); if (qe) { qe.focus(); qe.setSelectionRange(qe.value.length, qe.value.length); } }
    var m = modalRoot();
    if (S.form) { m.innerHTML = formHtml(); return; }
    if (S.edit) { m.innerHTML = planHtml(); return; }
    var o = S.open ? find(S.open) : null;
    if (S.open && !o) { m.innerHTML = '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center"><div class="modal" style="width:min(420px,100%);height:auto;border-radius:20px"><div class="m-body"><h3>Задача не найдена</h3><p class="note">Её нет или она вам недоступна.</p><button class="btn ghost" data-close="1">Закрыть</button></div></div></div>'; return; }
    m.innerHTML = o ? windowHtml(o) : "";
    var sp = m.querySelector('.stepper'), cu = m.querySelector('.stp.cur'); if (sp && cu) sp.scrollLeft = Math.max(0, cu.offsetLeft - sp.clientWidth / 2 + cu.offsetWidth / 2);
  }

  /* ---------- «Обзор» ---------- */
  function isoDay(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function monday() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  var DONE_ST = ["Сдано", "Закрыто"];
  function overview() {
    var p = pos(), canAll = p === "owner" || p === "sales" || p === "ops", f = S.ov, type = canAll ? f.type : "p";
    var seg = canAll ? '<div class="bar" style="margin:0 0 16px"><div class="seg">' + [["p", "Проектные"], ["o", "Операционные"], ["s", "Продажи"]].map(function (x) { return '<button data-otype="' + x[0] + '" class="' + (type === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div></div>" : "";
    var newBtn = (p === "owner" || p === "sales" || p === "ops") ? '<button class="btn accent" data-new="1">' + ic("plus") + "Новая задача</button>" : "";
    var head = '<div class="head"><div><h1>Обзор</h1><p>Нажмите на показатель, чтобы увидеть именно эти задачи</p></div>' + newBtn + "</div>"
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>" + seg;
    var search = '<div class="tools"><label class="search" style="flex:1;display:flex;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:10px 14px"><input id="dsQ" style="border:0;background:transparent;outline:0;width:100%" placeholder="Номер, заказчик, объект, исполнитель…" value="' + E(f.q) + '"></label></div>';
    var q = (f.q || "").toLowerCase();
    function tiles(arr) { return '<div class="tiles">' + arr.map(function (x) { return '<button class="tile ' + (f.tile === x[0] ? "on" : "") + '" data-tile="' + x[0] + '" style="--c:' + x[2] + '"><div class="n">' + x[3] + '</div><div class="l">' + x[1] + "</div></button>"; }).join("") + "</div>"; }
    if (type === "o" || type === "s") {
      var tk = (S.tasks || []).filter(function (x) { return type === "o" ? (x.kind === "ops" || x.kind === "acc") : x.kind === "sales"; });
      var kp_ = type === "s" ? (S.kp || []).filter(function (k) { return k.status !== "Оплачено" && k.status !== "Отказ"; }) : [];
      var rows = tk.map(function (x) { return { kind: "t", left: x.left_days, wait: x.state === "wait", text: (x.title + " " + (x.assignee || "") + " " + (x.object || "")), html: taskCard(x) }; })
        .concat(kp_.map(function (k) { return { kind: "k", left: k.last_days != null && k.last_days > 5 ? -1 : (k.last_days != null && k.last_days >= 3 ? 1 : 9), wait: k.status === "КП отправлено", text: (k.number + " " + k.customer + " " + k.object), html: kpCard(k) }; }));
      var cnt = { all: rows.length, over: rows.filter(function (x) { return x.left != null && x.left < 0; }).length, hot: rows.filter(function (x) { return x.left != null && x.left >= 0 && x.left <= 2; }).length, wait: rows.filter(function (x) { return x.wait; }).length };
      var tl = [["all", "В работе", "var(--org)", cnt.all], ["over", type === "s" ? "КП без общения 5+ дн. / просрочено" : "Просрочено", "var(--bad)", cnt.over], ["hot", "Горят (≤ 2 дн.)", "var(--accent)", cnt.hot], ["wait", type === "o" ? "Ждут ответа заказчика" : "КП ждут ответа", "var(--warn)", cnt.wait]];
      var shown = rows.filter(function (x) {
        if (f.tile === "over" && !(x.left != null && x.left < 0)) return false;
        if (f.tile === "hot" && !(x.left != null && x.left >= 0 && x.left <= 2)) return false;
        if (f.tile === "wait" && !x.wait) return false;
        return !q || x.text.toLowerCase().indexOf(q) >= 0;
      }).sort(function (a, b) { return (a.left == null ? 999 : a.left) - (b.left == null ? 999 : b.left); });
      return head + tiles(tl) + search + '<div class="list">' + (shown.map(function (x) { return x.html; }).join("") || '<div class="note">Ничего не найдено</div>') + "</div>";
    }
    var all = S.orders || [], act_ = all.filter(function (o) { return DONE_ST.indexOf(o.stage) < 0; });
    var hasMoney = can("money");
    var cnt = {
      active: act_.length,
      over: act_.filter(function (o) { return o.left_days != null && o.left_days < 0; }).length,
      hot: act_.filter(function (o) { return o.left_days != null && o.left_days >= 0 && o.left_days <= 2; }).length,
      review: all.filter(function (o) { return o.stage === "На согласовании"; }).length,
      edits: all.filter(function (o) { return o.edits > 0; }).length,
      unpaid: hasMoney ? all.filter(function (o) { return !o.post_paid && o.stage !== "Закрыто"; }).length : 0
    };
    var visStages = S.meta.stages || [];
    var T = [["active", "В работе", "var(--brand)"], ["over", "Просрочено", "var(--bad)"], ["hot", "Горят (≤ 2 дн.)", "var(--accent)"]];
    if (visStages.indexOf("На согласовании") >= 0) T.push(["review", "На согласовании", "#e0a21c"]);
    T.push(["edits", "Правок от заказчиков", "#8b6fe0"]);
    if (hasMoney) T.push(["unpaid", "Не оплачено", "var(--ok)"]);
    var list = all.filter(function (o) {
      var isAct = DONE_ST.indexOf(o.stage) < 0, l = o.left_days;
      if (f.tile === "active" && !isAct) return false;
      if (f.tile === "over" && !(isAct && l != null && l < 0)) return false;
      if (f.tile === "hot" && !(isAct && l != null && l >= 0 && l <= 2)) return false;
      if (f.tile === "review" && o.stage !== "На согласовании") return false;
      if (f.tile === "edits" && !(o.edits > 0)) return false;
      if (f.tile === "unpaid" && (o.post_paid || o.stage === "Закрыто")) return false;
      if (f.stage && o.stage !== f.stage) return false;
      if (q && (o.number + " " + (o.customer || "") + " " + o.object + " " + (o.executor || "")).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (a.left_days == null ? 9999 : a.left_days) - (b.left_days == null ? 9999 : b.left_days); });
    var chips = '<div class="chips"><button class="chip ' + (!f.stage ? "on" : "") + '" data-ostage="">Все стадии</button>'
      + visStages.map(function (s) { return '<button class="chip ' + (f.stage === s ? "on" : "") + '" data-ostage="' + E(s) + '"><i class="dot" style="background:' + (STAGE_COLOR[s] || "#999") + '"></i>' + E(s) + "</button>"; }).join("") + "</div>";
    return head + tiles(T.map(function (x) { return [x[0], x[1], x[2], cnt[x[0]]]; })) + search + chips
      + '<div class="list">' + (list.map(function (o) { return card(o, true); }).join("") || '<div class="note">Ничего не найдено</div>') + "</div>";
  }

  /* ---------- «Занятость» ---------- */
  var ACTIVE_WORK = ["В проектировании", "Проверка", "Корректировка"];
  var WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  function span(o) { return [o.plan_start || o.start_date || "", o.plan_end || o.due_date || ""]; }
  function staff() {
    var by = {};
    (S.people || []).forEach(function (u) { by[u.name] = { id: u.id, name: u.name }; });
    (S.orders || []).forEach(function (o) { if (o.executor && !by[o.executor]) by[o.executor] = { id: o.executor_id, name: o.executor }; });
    return Object.keys(by).map(function (k) { return by[k]; });
  }
  function loadScreen() {
    var p = pos(), people = staff(), mon = monday(), today = isoDay(new Date());
    var canEdit = p === "owner" || p === "design";
    var act_ = (S.orders || []).filter(function (o) { return ACTIVE_WORK.indexOf(o.stage) >= 0 && o.executor; });
    var unassigned = (S.orders || []).filter(function (o) { return o.stage === "Готов к проектированию" && !o.executor; });
    var cards = people.map(function (u) {
      var mine = act_.filter(function (o) { return o.executor_id === u.id || o.executor === u.name; });
      var late = mine.filter(function (o) { return o.left_days != null && o.left_days < 0; }).length;
      return '<div class="panel person" style="display:flex;gap:12px;align-items:center;padding:13px 15px">' + ava(u.name, "lg") + "<div><b>" + E(u.name) + '</b><br><small style="color:var(--muted)">' + mine.length + " активн." + (late ? ' · <span style="color:var(--bad)">' + late + " просроч.</span>" : "") + "</small></div></div>";
    }).join("") + '<div class="panel person" style="display:flex;gap:12px;align-items:center;padding:13px 15px"><span class="ava lg" style="background:var(--line);color:var(--muted)">?</span><div><b>Не назначено</b><br><small style="color:var(--muted)">' + unassigned.length + " готовы к проектированию</small></div></div>";
    var head = '<div class="head"><div><h1>Занятость</h1><p>Кто чем занят. Серым показаны задачи без исполнителя, готовые к проектированию.' + (canEdit ? " Нажмите на любую полоску: можно назначить исполнителя и сроки прямо здесь." : "") + '</p></div>'
      + '<div class="seg"><button data-ld="week" class="' + (S.ld === "week" ? "on" : "") + '">План на неделю</button><button data-ld="tl" class="' + (S.ld === "tl" ? "on" : "") + '">Шкала сроков</button></div></div>'
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>"
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">' + cards + "</div>";
    var open = canEdit ? "data-edit" : "data-open";
    if (S.ld === "week") {
      var wkDays = []; for (var i = 0; i < 7; i++) wkDays.push(isoDay(addDays(mon, i)));
      var lbl = dmy(wkDays[0]).slice(0, 5) + " — " + dmy(wkDays[6]).slice(0, 5);
      return head + '<div class="wk" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">' + people.map(function (u) {
        var mine = act_.filter(function (o) { return o.executor_id === u.id || o.executor === u.name; });
        return '<div class="panel"><div style="display:flex;gap:10px;align-items:center;padding:13px 15px;background:var(--surface-2);border-bottom:1px solid var(--line)">' + ava(u.name) + '<div style="flex:1"><b>' + E(u.name) + '</b><br><small style="color:var(--muted)">' + mine.length + " в плане · " + lbl + "</small></div></div>"
          + (mine.map(function (o) {
            var sp = span(o), tn = tone(o);
            return '<button style="display:block;width:100%;text-align:left;padding:11px 15px;border-bottom:1px solid var(--line)" ' + open + '="' + o.id + '"><div style="display:flex;gap:10px;align-items:baseline"><span style="font-weight:800;color:var(--brand);font-size:1.15rem">№' + E(o.number) + '</span><span style="font-weight:600">' + E(o.object) + "</span></div>"
              + '<div style="margin-top:6px"><span class="pill ' + tn + '">' + E(leftText(o.left_days)) + '</span></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-top:8px">'
              + wkDays.map(function (d) { var on = sp[0] && sp[1] && d >= sp[0] && d <= sp[1]; return '<span title="' + dmy(d).slice(0, 5) + '" style="height:9px;border-radius:3px;border:1px solid ' + (on ? (tn === "bad" ? "var(--bad)" : "var(--brand)") : "var(--line)") + ";background:" + (on ? (tn === "bad" ? "var(--bad)" : "var(--brand)") : "var(--surface-2)") + '"></span>'; }).join("") + "</div></button>";
          }).join("") || '<div class="note" style="padding:14px 15px;margin:0">Задач в плане нет</div>') + "</div>";
      }).join("") + "</div>";
    }
    var days = []; for (var k = 0; k < 14; k++) days.push(addDays(mon, k));
    var iso = days.map(isoDay);
    function bar(o, un) {
      var sp = span(o), a = sp[0] ? iso.indexOf(sp[0]) : 0, b = sp[1] ? iso.indexOf(sp[1]) : 13;
      if (sp[0] && a < 0) a = sp[0] < iso[0] ? 0 : 13;
      if (sp[1] && b < 0) b = sp[1] < iso[0] ? 0 : 13;
      if (b < a) b = a;
      var bg = un ? "" : "background:" + (o.left_days != null && o.left_days < 0 ? "var(--bad)" : (STAGE_COLOR[o.stage] || "var(--brand)")) + ";";
      return '<div class="bar' + (un ? " un" : "") + '" ' + open + '="' + o.id + '" title="' + (canEdit ? "Нажмите, чтобы изменить исполнителя и сроки" : "Открыть задачу") + '" style="grid-column:' + (a + 2) + "/" + (b + 3) + ";grid-row:1;height:28px;margin:5px 2px;border-radius:8px;" + bg + 'color:' + (un ? "var(--ink)" : "#fff") + ';font-size:.76rem;font-weight:700;padding:0 9px;display:flex;align-items:center;white-space:nowrap;overflow:hidden;cursor:pointer;' + (un ? "border:1px dashed var(--muted);background:color-mix(in srgb,var(--muted) 40%,transparent);" : "") + '">№' + E(o.number) + " · " + E(un ? "назначить" : (o.object || "").split(",")[0]) + "</div>";
    }
    var row = function (name, content, topLine) { return '<div style="display:grid;grid-template-columns:150px repeat(14,minmax(40px,1fr));border-bottom:1px solid var(--line);min-width:880px;' + (topLine ? "border-top:2px solid var(--line);" : "") + '"><div style="padding:8px 4px 8px 12px;font-weight:700;display:flex;gap:8px;align-items:center;' + (name ? "" : "color:var(--muted)") + '">' + name + "</div>" + content + "</div>"; };
    var header = '<div style="display:grid;grid-template-columns:150px repeat(14,minmax(40px,1fr));background:var(--surface-2);color:var(--muted);min-width:880px;border-bottom:1px solid var(--line)"><div style="padding:8px 12px">Сотрудник</div>'
      + days.map(function (d, i) { return '<div style="padding:8px 4px;text-align:center;font-size:.78rem;border-left:1px solid var(--line);' + (isoDay(d) === today ? "color:var(--accent);font-weight:800" : "") + '">' + WD[i % 7] + "<br><b>" + ("0" + d.getDate()).slice(-2) + "</b></div>"; }).join("") + "</div>";
    var body = people.map(function (u) {
      var mine = act_.filter(function (o) { return o.executor_id === u.id || o.executor === u.name; });
      return mine.map(function (o, li) { return row(li === 0 ? ava(u.name, "sm") + E(u.name) : "", bar(o, false)); }).join("");
    }).join("")
      + unassigned.map(function (o, i) { return row(i === 0 ? "Не назначены" : "", bar(o, true), i === 0); }).join("");
    return head + '<div class="panel" style="overflow:auto">' + header + (body || '<div class="note" style="padding:16px;margin:0">Задач в плане нет</div>') + "</div>"
      + '<div class="note">Серые полоски: от даты постановки до последнего дня договора.' + (canEdit ? " Нажатие открывает окно: исполнитель, начало и срок." : "") + "</div>";
  }
  function planHtml() {
    var o = find(S.edit); if (!o) return "";
    var sp = span(o), today = isoDay(new Date());
    var people = staff().filter(function (u) { return u.id; });
    return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.2rem">Назначить сроки · №' + E(o.number) + '</h2><div style="color:var(--muted);font-size:.86rem">' + E(o.object) + '</div></div><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
      + '<div class="fld"><label>Исполнитель</label><select id="pl-who"><option value="0">— не назначен —</option>' + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === o.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
      + '<div class="g2f"><div class="fld"><label>Начало работ</label><input id="pl-s" type="date" value="' + E(o.plan_start || (o.start_date > today ? o.start_date : today)) + '"></div>'
      + '<div class="fld"><label>Срок сдачи</label><input id="pl-e" type="date" value="' + E(o.plan_end || o.due_date || "") + '"></div></div>'
      + '<div class="dbox"><small>Что произойдёт</small>' + (o.stage === "Готов к проектированию" ? "Исполнитель получит уведомление «Вам поставлена задача №" + E(o.number) + "», стадия станет «В проектировании»; срок появится в «Занятости» и в окне задачи." : "Изменятся исполнитель и сроки плана; стадия останется прежней.") + "</div>"
      + '<button class="btn primary block" data-saveplan="' + o.id + '">Сохранить</button>'
      + '<button class="btn ghost block" style="margin-top:10px" data-open="' + o.id + '">Открыть окно задачи</button></div></div></div>';
  }
  /* ---------- «Заказчики» ---------- */
  var TZ = [["Europe/Kaliningrad", "Калининград (−1 к МСК)"], ["Europe/Moscow", "Москва (МСК)"], ["Europe/Samara", "Самара (+1 к МСК)"], ["Asia/Yekaterinburg", "Екатеринбург (+2 к МСК)"],
    ["Asia/Omsk", "Омск (+3 к МСК)"], ["Asia/Krasnoyarsk", "Красноярск (+4 к МСК)"], ["Asia/Irkutsk", "Иркутск (+5 к МСК)"], ["Asia/Yakutsk", "Якутск (+6 к МСК)"],
    ["Asia/Vladivostok", "Владивосток (+7 к МСК)"], ["Asia/Magadan", "Магадан (+8 к МСК)"], ["Asia/Kamchatka", "Камчатка (+9 к МСК)"]];
  function custScreen() {
    var p = pos(), canEdit = p === "owner" || p === "sales" || p === "ops", list = S.customers || [], d = S.cu.draft;
    if (!can("customers")) return '<div class="head"><div><h1>Заказчики</h1></div></div><div class="note">Раздел недоступен для вашей роли.</div>';
    var title = p === "design" ? "Кому звонить" : "Заказчики";
    var head = '<div class="head"><div><h1>' + title + "</h1><p>" + (p === "design" ? "Заказчики ваших проектов: контакты, часовой пояс и комментарий менеджера. Звонки делаете вы." : "Компании, контактные лица, часовой пояс и комментарии менеджера") + "</p></div>"
      + (canEdit ? '<button class="btn accent" data-cnew="1">' + ic("plus") + "Новый заказчик</button>" : "") + "</div>"
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>";
    var rows = list.map(function (c) {
      var m = (c.contacts && c.contacts[0]) || null;
      return '<button style="display:flex;gap:14px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);width:100%;text-align:left;' + (S.cu.sel === c.id ? "background:var(--brand-soft);box-shadow:inset 3px 0 0 var(--brand)" : "") + '" data-csel="' + c.id + '">'
        + ava(c.name, "lg") + '<div style="min-width:0"><b>' + E(c.name) + "</b> " + (c.regular ? '<span class="pill ok">постоянный</span>' : "") + '<div style="color:var(--muted);font-size:.86rem">' + (m && m.fio ? E(m.fio) + (m.pos ? " · " + E(m.pos) : "") : "контакт не указан") + "</div></div>"
        + '<div style="margin-left:auto;text-align:right"><b style="font-size:1.25rem;display:block">' + (c.works || 0) + '</b><small style="color:var(--muted)">работ за всё время</small></div></button>';
    }).join("") || '<div class="note" style="padding:16px;margin:0">Заказчиков пока нет</div>';
    var det;
    if (!d) det = '<div class="panel pad"><p class="sub" style="margin:0">Выберите заказчика слева</p></div>';
    else {
      var ro = canEdit ? "" : " disabled";
      var tzOpts = TZ.map(function (z) { return '<option value="' + z[0] + '"' + (d.tz === z[0] ? " selected" : "") + ">" + E(z[1]) + "</option>"; }).join("");
      if (!TZ.some(function (z) { return z[0] === d.tz; }) && d.tz) tzOpts += '<option value="' + E(d.tz) + '" selected>' + E(d.tz) + "</option>";
      var jobs = (S.orders || []).filter(function (o) { return o.customer_id === d.id; });
      det = '<div class="panel pad"><h3>' + (d.id ? "Карточка заказчика" : "Новый заказчик") + "</h3>"
        + '<div class="fld" style="margin-top:12px"><label>Наименование компании</label><input data-cf="name" value="' + E(d.name) + '"' + ro + "></div>"
        + '<div class="fld"><label><input type="checkbox" data-cfchk="1" ' + (d.regular ? "checked" : "") + ro + "> Постоянный заказчик</label></div>"
        + "<h3 style=\"margin-top:14px\">Контактные лица</h3>"
        + (d.contacts || []).map(function (c, i) {
          return '<div class="ctt" style="margin-top:10px"><div class="fld" style="margin-bottom:8px"><label>ФИО</label><input data-cf="c.' + i + '.fio" value="' + E(c.fio) + '"' + ro + "></div>"
            + '<div><div class="fld" style="margin-bottom:8px"><label>Должность</label><input data-cf="c.' + i + '.pos" value="' + E(c.pos) + '"' + ro + "></div>"
            + '<div class="fld" style="margin-bottom:0"><label>Телефон</label><input data-cf="c.' + i + '.phone" value="' + E(c.phone) + '"' + ro + "></div></div>"
            + '<div class="fld" style="margin:8px 0 0"><label>E-mail (по нему диалоги привязываются к заказчику)</label><input data-cf="c.' + i + '.email" value="' + E(c.email || "") + '"' + ro + "></div>"
            + (canEdit && d.contacts.length > 1 ? '<button class="btn ghost sm" style="margin-top:8px" data-cdel="' + i + '">Убрать</button>' : "") + "</div>";
        }).join("")
        + (canEdit ? '<button class="btn ghost sm" style="margin:6px 0 12px" data-cadd="1">+ Контактное лицо</button>' : "")
        + reqBlock(d, ro)
        + '<div class="fld"><label>Часовой пояс</label><select data-cftz="1"' + ro + ">" + tzOpts + '</select><div class="note" style="margin-top:6px">Сейчас у заказчика: <b>' + nowIn(d.tz) + "</b></div></div>"
        + '<div class="fld"><label>Комментарий менеджера</label><textarea data-cf="comment"' + ro + ">" + E(d.comment || "") + "</textarea></div>"
        + (S.cu.err ? '<div class="err">' + E(S.cu.err) + "</div>" : "")
        + (canEdit ? '<button class="btn primary block" data-csave="1">Сохранить</button>' : "")
        + (jobs.length ? '<h3 style="margin-top:16px">Задачи</h3>' + jobs.map(function (o) { return '<button class="doc" style="width:100%;text-align:left" data-open="' + o.id + '"><span>📁</span><div><b>№' + E(o.number) + " · " + E(o.object) + "</b><small>" + E(o.stage) + "</small></div></button>"; }).join("") : "")
        + "</div>";
    }
    return head + '<div class="dsg21" style="align-items:start"><div class="panel">' + rows + "</div><div>" + det + "</div></div>";
  }
  function reqBlock(d, ro) {
    if (d.inn === undefined && !pos().match(/^(owner|sales|ops)$/)) return "";          // роли без доступа к реквизитам блок не видят
    var f = function (k, label, ph) { return '<div class="fld" style="margin-bottom:8px"><label>' + label + '</label><input data-cf="' + k + '" value="' + E(d[k] || "") + '" placeholder="' + (ph || "") + '"' + ro + "></div>"; };
    return '<h3 style="margin-top:14px">Реквизиты</h3><p class="note" style="margin-top:2px">Попадают в договор. ИНН проверяется по контрольной сумме.</p>'
      + '<div class="g2f">' + f("inn", "ИНН", "10 или 12 цифр") + f("kpp", "КПП", "9 цифр") + "</div>"
      + f("address", "Юридический адрес", "") + f("bank_name", "Банк", "")
      + '<div class="g2f">' + f("bik", "БИК", "9 цифр") + f("signer_pos", "Должность подписанта", "в лице … (род. п.)") + "</div>"
      + f("rs", "Расчётный счёт", "20 цифр") + f("ks", "Корр. счёт", "20 цифр") + f("signer_fio", "ФИО подписанта", "Иванов Иван Иванович");
  }
  function saveCustomer() {
    var d = S.cu.draft; if (!d) return;
    if (!(d.name || "").trim()) { S.cu.err = "Укажите наименование компании"; return paint(); }
    var body = { name: d.name.trim(), regular: !!d.regular, tz: d.tz, comment: d.comment || "", contacts: (d.contacts || []).filter(function (c) { return c.fio || c.pos || c.phone || c.email; }) };
    ["inn", "kpp", "address", "bank_name", "bik", "rs", "ks", "signer_fio", "signer_pos"].forEach(function (k) { if (d[k] !== undefined) body[k] = d[k]; });
    var p = d.id ? api("/customers/" + d.id, body) : api("/customers", body);
    p.then(function (r) {
      S.customers = null; S.orders = null;
      var keep = d.id || (r && r.id) || null;
      return load().then(function () { S.cu.sel = keep; var c = (S.customers || []).filter(function (x) { return x.id === keep; })[0]; S.cu.draft = c ? JSON.parse(JSON.stringify(c)) : null; S.cu.err = ""; paint(); toast("Сохранено"); });
    }, function (er) { S.cu.err = String(er); paint(); });
  }

  /* ---------- «План на неделю» проектировщика ---------- */
  function loadWeek() {
    if (!S.wk) S.wk = { start: isoDay(monday()), days: [] };
    return api("/week?start=" + S.wk.start).then(function (d) { S.wk.days = d; }, function () { S.wk.days = []; });
  }
  function dayRec(day) { return (S.wk && S.wk.days || []).filter(function (x) { return x.day === day; })[0] || { day: day, worked: 0, off: 0, comment: "" }; }
  function act2(p, reloadWeek) {
    return p.then(function () { return reloadWeek ? loadWeek() : null; }).then(paint, function (e) { toast(String(e && e.message || e)); });
  }
  function weekScreen() {
    var p = pos(), me = C && C.me ? C.me.id : 0, days = (S.wk && S.wk.days) || [], today = isoDay(new Date());
    var mine = (S.orders || []).filter(function (o) { return o.executor_id === me && ACTIVE_WORK.indexOf(o.stage) >= 0; });
    var off = days.filter(function (d) { return d.off; }).length, done = days.filter(function (d) { return d.worked && !d.off; }).length, work = 7 - off;
    var lbl = days.length ? dmy(days[0].day).slice(0, 5) + " — " + dmy(days[6].day).slice(0, 5) : "";
    var head = '<div class="head"><div><h1>План на неделю</h1><p>Отмечайте отработанные дни, выходные назначаете сами. Комментарий под днём увидит руководитель в недельном отчёте.</p></div>'
      + '<div class="seg"><button data-wnav="-1">← Пред.</button><button data-wnav="0" class="on">' + lbl + '</button><button data-wnav="1">След. →</button></div></div>'
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>"
      + '<div class="tiles" style="margin-bottom:16px"><div class="tile" style="--c:var(--ok)"><div class="n">' + done + " из " + work + '</div><div class="l">Рабочих дней отработано</div></div>'
      + '<div class="tile" style="--c:var(--accent)"><div class="n">' + off + '</div><div class="l">Отдыхал(а) на неделе, дн.</div></div>'
      + '<div class="tile" style="--c:var(--brand)"><div class="n">' + mine.length + '</div><div class="l">Проектов в работе</div></div></div>';
    var WN = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    return head + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">' + days.map(function (d, i) {
      var tasks = mine.filter(function (o) { var sp = span(o); return sp[0] && sp[1] && d.day >= sp[0] && d.day <= sp[1] && !d.off; });
      return '<div class="panel" style="padding:12px;display:flex;flex-direction:column;gap:9px;min-height:260px;' + (d.day === today ? "border-color:var(--accent);box-shadow:0 0 0 2px var(--accent) inset;" : "") + (d.off ? "background:var(--surface-2);opacity:.92;" : "") + '">'
        + '<div style="display:flex;justify-content:space-between"><b>' + WN[i] + '</b><small style="color:var(--muted)">' + dmy(d.day).slice(0, 5) + "</small></div>"
        + (d.off ? '<div style="height:40px;border-radius:12px;background:var(--line);display:grid;place-items:center;font-weight:700;color:var(--muted);font-size:.86rem">Выходной</div>'
          : tasks.map(function (o) { return '<div style="border:1px solid var(--line);border-left:4px solid var(--brand);background:var(--surface-2);border-radius:10px;padding:7px 9px;font-size:.82rem"><b>№' + E(o.number) + "</b> " + E((o.object || "").split(",")[0]) + "</div>"; }).join("")
            + '<button data-wmark="' + d.day + '" style="height:40px;border-radius:12px;font-weight:800;font-size:.86rem;' + (d.worked ? "border:1.5px solid var(--ok);background:var(--ok-soft);color:var(--ok)" : "border:1.5px dashed var(--accent);color:#d0702f") + '">' + (d.worked ? "✓ Отработал(а)" : "Отметить отработанным") + "</button>")
        + '<textarea data-wc="' + d.day + '" placeholder="Комментарий к дню…" style="width:100%;min-height:62px;border:1px solid var(--line);border-radius:10px;padding:7px 9px;font-size:.8rem;resize:vertical;background:var(--surface);color:var(--ink)">' + E(d.comment || "") + "</textarea>"
        + '<button data-woff="' + d.day + '" style="font-size:.76rem;color:var(--muted);text-decoration:underline;text-align:center">' + (d.off ? "Снять выходной" : "Сделать выходным") + "</button></div>";
    }).join("") + "</div>";
  }
  /* ---------- реестр КП, конструктор КП, договор ---------- */
  var KP_TONE = { "Новое обращение": "info", "КП отправлено": "info", "Переговоры": "warn", "Согласование условий": "org", "Договор подписан": "ok", "Оплачено": "paid", "Отказ": "bad" };
  var KP_FUNNEL = ["Новое обращение", "КП отправлено", "Переговоры", "Согласование условий", "Договор подписан", "Оплачено"];
  var KP_MANUAL = ["Новое обращение", "КП отправлено", "Переговоры", "Согласование условий", "Отказ"];
  var PAYS = [["adv50", "Аванс 50%, остаток по акту"], ["adv30", "Аванс 30%, остаток по акту"], ["post100", "100% по акту"]];
  var PRICE = [["Обследование объекта", 40000], ["Проект СПС (адресная)", 180000], ["Проект СОУЭ 3 типа", 150000], ["Проект АУП", 170000], ["Проект ВПВ", 120000], ["Расчёт категорий помещений", 30000], ["Согласование с экспертизой", 60000]];
  var CT_TYPES = ["Проектирование СПС, СОУЭ", "Проектирование АУП, ВПВ", "Проектирование (комплекс)", "Разработка исполнительной документации"];
  function loadKp() { return api("/kp").then(function (k) { S.kp = k; }, function (e) { S.kp = []; S.err = String(e); }); }
  function kpIsLate(k) { return k.last_days != null && k.last_days > 5 && k.status !== "Оплачено" && k.status !== "Отказ"; }
  function kpScreen() {
    var p = pos(), canEdit = p === "owner" || p === "sales" || p === "ops", list = S.kp || [];
    var head = '<div class="head"><div><h1>Реестр КП</h1><p>Выставленные стоимости: аванс и постоплата отдельно. Красным выделены КП, по которым нет общения более 5 дней</p></div>'
      + (canEdit ? '<div style="display:flex;gap:10px"><a class="btn accent" href="#/kpc" style="text-decoration:none">' + ic("plus") + "Составить КП</a></div>" : "") + "</div>"
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>";
    var funnel = '<div class="panel pad" style="margin-bottom:16px"><h3>Воронка</h3><p class="sub">Статус «Оплачено» ставится автоматически, когда вся оплата (аванс и постоплата) пришла из 1С</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
      + KP_FUNNEL.map(function (s, i) { var n = list.filter(function (k) { return k.status === s; }).length; return '<span class="pill ' + KP_TONE[s] + '" style="height:30px;padding:0 14px">' + E(s) + " · " + n + "</span>" + (i < KP_FUNNEL.length - 1 ? '<span style="color:var(--muted)">→</span>' : ""); }).join("") + "</div></div>";
    function advTxt(k) { if (!k.has_adv) return k.order_id ? "без аванса" : "—"; return money(k.adv_sum) + " · " + (k.adv_paid ? "оплачен " + dmy(k.adv_date).slice(0, 5) : (k.order_id ? "ждём" : "план")); }
    function postTxt(k) { if (!k.order_id && !k.post_sum) return "—"; return money(k.post_sum) + " · " + (k.post_paid ? "оплачена " + dmy(k.post_date).slice(0, 5) : (k.order_id ? "ждём" : "план")); }
    var rows = list.map(function (k) {
      var late = kpIsLate(k);
      var st = canEdit && !k.order_id ? '<select data-kpstatus="' + k.id + '" style="min-width:150px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);padding:5px 8px">' + KP_MANUAL.map(function (s) { return "<option" + (s === k.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" : '<span class="pill ' + (KP_TONE[k.status] || "info") + '">' + E(k.status) + "</span>";
      var acts = canEdit && !k.order_id && k.status !== "Отказ" ? '<button class="btn ghost sm" data-kpcontract="' + k.id + '">Договор</button> ' : "";
      if (canEdit && !k.order_id) acts += '<button class="btn ghost sm" data-kptouch="' + k.id + '">Был контакт</button> ';
      acts += docButtons(k);
      return '<tr class="' + (late ? "late" : "") + '"><td><b>' + E(k.number) + "</b></td><td>" + E(k.customer) + "</td><td>" + E(k.object) + "<br><small>" + E(k.services.map(function (s) { return s.name; }).join(", ")) + "</small></td>"
        + "<td>" + (k.issued_date ? dmy(k.issued_date) : "—") + "</td><td><b>" + money(k.amount) + "</b></td><td>" + st + "</td><td>" + advTxt(k) + "</td><td>" + postTxt(k) + "</td>"
        + '<td class="lastc ' + (late ? "late" : "") + '">' + (k.last_days == null ? "—" : k.last_days === 0 ? "сегодня" : plural(k.last_days, ["день", "дня", "дней"]) + " назад") + (late ? " ⚠" : "") + "</td><td>" + E(k.manager) + "</td>" + "<td>" + acts + "</td></tr>";
    }).join("");
    function docButtons(k) {
      var b = '<span style="display:inline-flex;gap:4px;margin-top:4px"><button class="btn ghost sm" title="КП в PDF" data-doc="' + k.id + ':kp:pdf">КП PDF</button><button class="btn ghost sm" title="КП в Word" data-doc="' + k.id + ':kp:docx">КП Word</button></span>';
      if (canEdit && k.contract_number) b += '<br><span style="display:inline-flex;gap:4px;margin-top:4px"><button class="btn ghost sm" title="Договор в PDF" data-doc="' + k.id + ':contract:pdf">Договор PDF</button><button class="btn ghost sm" title="Договор в Word" data-doc="' + k.id + ':contract:docx">Договор Word</button></span>';
      return b;
    }
    return head + funnel + '<div class="panel" style="overflow:auto"><table class="tbl grid-c"><tr><th>№ КП</th><th>Заказчик</th><th>Объект / услуги</th><th>Дата выставления КП</th><th>Сумма</th><th>Статус</th><th>Аванс</th><th>Постоплата</th><th>Последнее общение</th><th>Менеджер</th><th>Документы</th></tr>'
      + (rows || '<tr><td colspan="11">КП пока нет</td></tr>') + "</table></div>";
  }
  function kpTotal() { return (S.kpf ? S.kpf.items : []).reduce(function (a, i) { return a + (i.on ? (+i.price || 0) : 0); }, 0); }
  function kpcInit() {
    if (S.kpf) return;
    var src = S.price && S.price.items ? S.price.items.filter(function (i) { return i.active; }).map(function (i) { return [i.name, i.price]; }) : PRICE;
    S.kpf = { id: 0, customer_id: 0, object: "", pay: "adv50", err: "", items: src.map(function (x) { return { name: x[0], price: x[1], on: false }; }) };
  }
  function kpcScreen() {
    var p = pos();
    if (!(p === "owner" || p === "sales" || p === "ops")) return '<div class="head"><div><h1>Конструктор КП</h1></div></div><div class="note">Раздел недоступен для вашей роли.</div>';
    kpcInit();
    var f = S.kpf, cs = S.customers || [], total = kpTotal(), pay = PAYS.filter(function (x) { return x[0] === f.pay; })[0] || PAYS[0];
    var pct = f.pay === "adv50" ? 0.5 : f.pay === "adv30" ? 0.3 : 0, adv = Math.round(total * pct);
    var cust = cs.filter(function (c) { return c.id === f.customer_id; })[0];
    var on = f.items.filter(function (i) { return i.on && i.name; });
    var form = '<div class="panel pad"><h3>Состав КП</h3><p class="sub">Отметьте услуги и при необходимости поправьте цену</p>'
      + '<div class="fld"><label>Заказчик (из базы заказчиков)</label><select data-kf="customer_id"><option value="0">— выберите —</option>' + cs.map(function (c) { return '<option value="' + c.id + '"' + (c.id === f.customer_id ? " selected" : "") + ">" + E(c.name) + "</option>"; }).join("") + "</select></div>"
      + '<div class="fld"><label>Объект</label><input data-kf="object" value="' + E(f.object) + '"></div>'
      + f.items.map(function (i, idx) {
        return '<div class="dsv ' + (i.on ? "on" : "") + '"><input type="checkbox" data-ksv="' + idx + '" ' + (i.on ? "checked" : "")+ ">"
          + (i.custom ? '<input data-kf="i.' + idx + '.name" value="' + E(i.name) + '" placeholder="Название услуги" style="flex:1;border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--surface)">' : '<span style="flex:1">' + E(i.name) + "</span>")
          + '<input type="number" min="0" data-kf="i.' + idx + '.price" value="' + (+i.price || 0) + '" style="width:110px;border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--surface)">'
          + (i.custom ? '<button class="btn ghost sm" data-kdel="' + idx + '">✕</button>' : "") + "</div>";
      }).join("")
      + '<button class="btn ghost sm" data-kadd="1" style="margin-bottom:12px">+ Своя позиция</button>'
      + '<div class="fld"><label>Оплата</label><select data-kf="pay">' + PAYS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === f.pay ? " selected" : "") + ">" + E(x[1]) + "</option>"; }).join("") + "</select></div>"
      + '<div class="dbox"><small>Итого</small><b id="kTotal" style="font-size:1.3rem">' + money(total) + "</b>" + (adv ? "<div>Аванс " + money(adv) + ", остаток по акту " + money(total - adv) + "</div>" : "<div>Без аванса, оплата по акту</div>") + "</div>"
      + (f.err ? '<div class="err">' + E(f.err) + "</div>" : "")
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-ksave="send">Выставить КП</button><button class="btn ghost" data-ksave="draft">Сохранить черновик</button></div></div>';
    var paper = '<div class="paper"><h4>КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ</h4><p class="c">ООО «Проекты ДС» · ' + new Date().toLocaleDateString("ru-RU") + "</p>"
      + "<p><b>Заказчик:</b> " + E(cust ? cust.name : "—") + "</p><p><b>Объект:</b> " + E(f.object || "—") + "</p>"
      + "<table><tr><th>Услуга</th><th>Стоимость</th></tr>" + (on.map(function (i) { return "<tr><td>" + E(i.name) + "</td><td>" + money(+i.price || 0) + "</td></tr>"; }).join("") || '<tr><td colspan="2">Услуги не выбраны</td></tr>') + "</table>"
      + "<p><b>Итого: " + money(total) + "</b> (НДС не облагается)</p><p><b>Оплата:</b> " + E(pay[1]) + ".</p></div>";
    return '<div class="head"><div><h1>Конструктор КП</h1><p>Услуги из прайса, цена, схема оплаты. «Выставить КП» вносит предложение в реестр с датой выставления</p></div></div><div class="kpc">' + form + "<div>" + paper + "</div></div>";
  }
  function saveKp(send) {
    var f = S.kpf;
    if (!f.customer_id) { f.err = "Выберите заказчика"; return paint(); }
    var items = f.items.filter(function (i) { return i.on && i.name && +i.price > 0; }).map(function (i) { return { name: i.name, price: +i.price }; });
    if (!items.length) { f.err = "Отметьте хотя бы одну услугу с ценой"; return paint(); }
    api("/kp", { customer_id: f.customer_id, object: f.object, services: items, pay: f.pay, send: !!send }).then(function () {
      S.kpf = null; toast(send ? "КП выставлено и добавлено в реестр" : "Черновик сохранён в реестре"); location.hash = "#/kpreg/";
    }, function (er) { f.err = String(er); paint(); });
  }
  function contractScreen() {
    var p = pos();
    if (!(p === "owner" || p === "sales" || p === "ops")) return '<div class="head"><div><h1>Конструктор договора</h1></div></div><div class="note">Раздел недоступен для вашей роли.</div>';
    var open = (S.kp || []).filter(function (k) { return !k.order_id && k.status !== "Отказ"; });
    if (!S.ct) S.ct = { kid: open[0] ? open[0].id : 0, type: CT_TYPES[0], days: 30, made: false };
    var c = S.ct, k = (S.kp || []).filter(function (x) { return x.id === c.kid; })[0];
    if (!k) return '<div class="head"><div><h1>Конструктор договора</h1><p>Из КП в договор одной кнопкой. После подписания задача, папка и чат проекта появляются сами</p></div></div><div class="note">Нет КП, по которым можно оформить договор. Сначала выставьте КП в «Конструкторе КП».</div>';
    var due = new Date(); due.setDate(due.getDate() + (+c.days || 0));
    var numShown = k.contract_number || "—/" + String(new Date().getFullYear()).slice(2);
    var adv = k.has_adv;
    var paper = '<h4>ДОГОВОР № ' + E(numShown) + '</h4><p class="c">на выполнение проектных работ<br>г. Санкт-Петербург · ' + new Date().toLocaleDateString("ru-RU") + "</p>"
      + "<p><b>ООО «Проекты ДС»</b> (Исполнитель) и <b>" + E(k.customer) + "</b> (Заказчик) заключили настоящий договор:</p>"
      + "<p><b>1. Предмет.</b> Исполнитель разрабатывает проектную документацию (" + E(c.type) + ") по объекту: «" + E(k.object) + "».</p>"
      + "<p><b>2. Стоимость.</b> " + Number(k.amount).toLocaleString("ru-RU") + " руб.</p><p><b>3. Срок.</b> " + (+c.days || 0) + " календарных дней, до " + due.toLocaleDateString("ru-RU") + ".</p>"
      + "<p><b>4. Оплата.</b> " + E(k.pay_label) + ".</p><p class=\"c\">Реквизиты сторон подставляются из карточки заказчика</p>";
    var form = '<div class="panel pad"><h3>Данные договора</h3><p class="sub">Заказчик и условия подтянуты из КП</p>'
      + '<div class="fld"><label>КП</label><select data-ctpick="1">' + open.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.kid ? " selected" : "") + ">" + E(x.number + " · " + x.customer + " · " + money(x.amount)) + "</option>"; }).join("") + "</select></div>"
      + '<div class="fld"><label>Тип договора</label><select data-ctf="type">' + CT_TYPES.map(function (o) { return "<option" + (o === c.type ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select></div>"
      + '<div class="g2f"><div class="fld"><label>Стоимость, ₽</label><input value="' + Number(k.amount).toLocaleString("ru-RU") + '" disabled></div><div class="fld"><label>Срок, дней</label><input type="number" min="1" data-ctf="days" value="' + (+c.days || 0) + '"></div></div>'
      + '<div class="fld"><label>Оплата</label><input value="' + E(k.pay_label) + '" disabled></div>'
      + '<div class="dbox"><small>Что дальше</small>' + (adv ? "Предусмотрен аванс: после подписания задача создастся, но на «Сбор данных» уйдёт только после аванса. Бухгалтер получит «Выставить счёт на аванс»." : "Аванса нет: после подписания задача сразу уйдёт на «Сбор данных».") + "</div>"
      + (S.ct.err ? '<div class="err">' + E(S.ct.err) + "</div>" : "")
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-ctmake="1">' + ic("file") + "Создать договор</button>"
      + (k.contract_number ? '<button class="btn ok" data-ctsign="1">Договор подписан</button><button class="btn ghost" data-doc="' + k.id + ':contract:pdf">Скачать PDF</button><button class="btn ghost" data-doc="' + k.id + ':contract:docx">Скачать Word</button>' : "") + "</div>"
      + (c.made || k.contract_number ? '<div class="autolist"><b>Договор №' + E(k.contract_number || numShown) + ' сформирован.</b><ul style="margin-top:8px"><li>Привязан к КП ' + E(k.number) + " и заказчику «" + E(k.customer) + "»</li>"
        + "<li>После «Договор подписан» система сама создаст проектную задачу, папку на сервере и чат проекта</li>"
        + "<li>" + (adv ? "Поставит паузу «Ждём аванс», бухгалтеру уйдёт задача на счёт" : "Переведёт на «Сбор данных»: операционный менеджер получит задачу") + "</li>"
        + "<li>Срок, аванс и постоплата попадут в задачу и в реестр КП</li></ul></div>" : "") + "</div>";
    return '<div class="head"><div><h1>Конструктор договора</h1><p>Из КП в договор одной кнопкой. После подписания задача, папка и чат проекта появляются сами</p></div></div><div class="kpc">' + form + '<div><div class="paper">' + paper + "</div></div></div>";
  }
  function makeContract() {
    var c = S.ct; c.err = "";
    api("/kp/" + c.kid + "/contract", { type: c.type, days: +c.days || 0 }).then(function () { c.made = true; return loadKp(); }).then(paint, function (e) { c.err = String(e); paint(); });
  }
  function signContract() {
    var c = S.ct;
    var kpRow = (S.kp || []).filter(function (x) { return x.id === c.kid; })[0];
    api("/kp/" + c.kid + "/sign", {}).then(function (r) {
      S.ct = null; S.orders = null; S.tasks = null;
      try {                                                   // создаём папку на сервере через установленную кнопку (нужен VPN)
        var a = document.createElement("a");
        a.href = folderUrl({ number: r.number, object: kpRow ? kpRow.object : "" }, true);
        document.body.appendChild(a); a.click(); a.remove();
      } catch (e) {}
      toast("Договор подписан: создана задача №" + r.number + (r.stage === "Ожидает аванс" ? " (ждёт аванс)" : " (на «Сборе данных»)"));
      location.hash = "#/";
    }, function (e) { c.err = String(e); paint(); });
  }
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
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>";
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
          detail = '<div class="sdet"><div class="sh"><div><h3>Шаг ' + s.n + ". " + E(s.title) + "</h3><small>Ответственный: <b>" + E(s.who) + "</b>" + (s.days != null ? " · срок: " + s.days + " дн." : (s.label ? " · срок: " + E(s.label) : "")) + '</small></div><button class="x" data-flstep="' + s.id + '">✕</button></div>'
            + '<div class="sg"><div class="dbox"><small>Что запускает шаг</small>' + E(s.trig || "") + '</div><div class="dbox"><small>Кто получает и когда</small>' + E(s.recv || "") + "</div>"
            + '<div class="dbox"><small>Что видит исполнитель</small>' + E(s.sees || "") + '</div><div class="dbox sys"><small>⚙ Что система делает сама</small><ul>' + (s.sys || []).map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul></div></div>"
            + '<div class="note" style="margin:0">Далее: <b>' + E(s.next || "") + "</b></div></div>";
        }
      });
      return '<div class="lane ' + l.id + '"><div class="lane-h"><span>' + E(l.title) + "</span><small>" + E(l.sub) + "</small></div>"
        + '<div class="steps">' + l.steps.map(function (s, i) {
          var cnt = r.show_counts && counts[s.id] != null ? '<span class="cn">' + counts[s.id] + "</span>" : "";
          return '<div class="stepbox"><button class="node ' + (S.flStep === s.id ? "on" : "") + '" data-flstep="' + s.id + '"><span class="no">' + s.n + "</span>" + cnt + "<b>" + E(s.title) + '</b><span class="ow">' + E(s.who) + "</span></button>" + (i < l.steps.length - 1 ? '<span class="arrow">→</span>' : "") + "</div>";
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
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>"
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
      + (r.can_edit ? '<div style="display:flex;gap:8px;margin-top:12px"><input id="tzNew" placeholder="Свой пункт ТЗ…" style="flex:1;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);color:var(--ink)"><button class="btn ghost" data-tzadd="1">Добавить</button></div>' : "")
      + (r.stage === "Сбор данных" && r.can_edit ? '<div class="note">Когда закрыты все пункты, задача сама перейдёт в «Готов к проектированию».</div>' : "") + "</div>";
  }

  /* ---------- этапы и сроки ---------- */
  var LANE_BG = { sales: "linear-gradient(135deg,#9a76c8,#7a55a8)", design: "linear-gradient(135deg,#3a86d6,#1f5c99)", close: "linear-gradient(135deg,#46c28a,#238a58)", after: "linear-gradient(135deg,#f2a65a,#d9782f)" };
  function loadStages() {
    return api("/stages").then(function (r) {
      S.stg = r; S.stgD = {};
      r.lanes.forEach(function (l) { l.steps.forEach(function (s) { if (s.editable) S.stgD[s.id] = s.days; }); });
    }, function (e) { S.stg = null; S.err = String(e); });
  }
  function stagesScreen() {
    var r = S.stg, p = pos();
    if (!r) return '<div class="head"><div><h1>Этапы и сроки</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var head = '<div class="head"><div><h1>Этапы и сроки</h1><p>Этапы конвейера, ответственные и сроки по умолчанию. ' + (r.can_edit ? "Сроки можно менять: они используются в напоминаниях «Стадия затянулась» и в подсказках." : "Сроки правит руководитель.") + "</p></div>"
      + (r.can_edit ? '<button class="btn primary" data-stsave="1">Сохранить сроки</button>' : "") + "</div>"
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>";
    var body = r.lanes.map(function (l) {
      return '<div class="panel" style="margin-bottom:16px"><div style="padding:12px 18px;font-weight:800;color:#fff;background:' + LANE_BG[l.id] + '">' + E(l.title) + ' <span style="font-weight:500;opacity:.9;float:right">' + E(l.sub) + "</span></div>"
        + '<table class="tbl"><tr><th style="width:40px">№</th><th>Этап</th><th>Ответственный</th><th style="width:150px">Срок</th><th>Что делает система</th></tr>'
        + l.steps.map(function (s) {
          var term = s.editable
            ? (r.can_edit ? '<input type="number" min="0" max="90" data-sd="' + s.id + '" value="' + (S.stgD[s.id] != null ? S.stgD[s.id] : s.days) + '" style="width:70px;border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--surface);color:var(--ink)"> дн.' : (s.days === 0 ? "в день" : s.days + " дн."))
            : E(s.label || "—");
          return "<tr><td>" + s.n + "</td><td><b>" + E(s.title) + "</b></td><td>" + E(s.who) + "</td><td>" + term + "</td><td><small>" + E(s.auto) + "</small></td></tr>";
        }).join("") + "</table></div>";
    }).join("");
    return head + body + (S.stgErr ? '<div class="err">' + E(S.stgErr) + "</div>" : "");
  }
  function saveStages() {
    S.stgErr = "";
    var days = {}; Object.keys(S.stgD).forEach(function (k) { days[k] = +S.stgD[k] || 0; });
    api("/stages", { days: days }).then(function (r) { S.stg = r; toast("Сроки сохранены"); paint(); }, function (e) { S.stgErr = String(e); paint(); });
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
          + '<td><input type="number" min="0" max="365" data-aur="' + x.id + '" data-auv="' + x.id + '" value="' + x.value + '" ' + inp + "> " + E(x.unit) + "</td><td>" + (x.fired || 0) + "</td></tr>";
      }).join("") + "</table></div>";
    var log = '<div class="panel pad"><h3>Последние срабатывания</h3>' + (r.log.length ? '<div class="trace" style="margin-top:12px">' + r.log.map(function (e) {
      var d = new Date(e.ts * 1000);
      return '<div class="ev" style="--c:var(--accent)"><time>' + d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + "</time><b>" + E(e.title) + '</b><span class="note" style="margin:0">' + E(e.rule_title) + "</span></div>";
    }).join("") + "</div>" : '<p class="note">Пока ничего не срабатывало</p>') + "</div>";
    return head + rules + log;
  }

  /* ---------- прайс-лист ---------- */
  function loadPrice() {
    return api("/price").then(function (p) { S.price = p; if (!S.pd) S.pd = JSON.parse(JSON.stringify(p.items)); }, function (e) { S.price = null; S.err = String(e); });
  }
  function priceScreen() {
    var p = pos(), pr = S.price;
    if (!pr) return '<div class="head"><div><h1>Прайс</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Прайс-лист недоступен для вашей роли.") + "</div>";
    var edit = pr.can_edit, rows = edit ? S.pd : pr.items;
    var head = '<div class="head"><div><h1>Прайс-лист</h1><p>Услуги и цены для конструктора КП. ' + (edit ? "Изменения применяются к новым КП; выставленные КП не меняются." : "Правит руководитель или руководитель отдела продаж.") + "</p></div>"
      + (edit ? '<div style="display:flex;gap:10px"><button class="btn ghost" data-prreset="1">Отменить правки</button><button class="btn primary" data-prsave="1">Сохранить</button></div>' : "") + "</div>"
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>";
    var inp = 'style="width:100%;border:1px solid var(--line);border-radius:8px;padding:7px 9px;background:var(--surface);color:var(--ink)"';
    var body = rows.map(function (r, i) {
      return edit ? "<tr><td><input data-prf=\"" + i + ".name\" value=\"" + E(r.name) + "\" " + inp + "></td><td><input type=\"number\" min=\"0\" data-prf=\"" + i + ".price\" value=\"" + (+r.price || 0) + "\" " + inp + " ></td>"
        + "<td><input data-prf=\"" + i + ".note\" value=\"" + E(r.note || "") + "\" " + inp + "></td><td><input type=\"checkbox\" data-prfa=\"" + i + "\" " + (r.active ? "checked" : "") + "></td>"
        + "<td><button class=\"btn ghost sm\" data-prdel=\"" + i + "\">✕</button></td></tr>"
        : "<tr" + (r.active ? "" : ' style="opacity:.5"') + "><td>" + E(r.name) + '</td><td class="r"><b>' + money(r.price) + "</b></td><td>" + E(r.note || "") + "</td><td>" + (r.active ? "в продаже" : "снято") + "</td></tr>";
    }).join("");
    return head + '<div class="panel" style="overflow:auto"><table class="tbl"><tr><th>Услуга</th><th style="width:170px">' + (edit ? "Цена, ₽" : "Цена") + '</th><th>Примечание</th><th style="width:90px">В продаже</th>' + (edit ? '<th style="width:50px"></th>' : "") + "</tr>"
      + (body || '<tr><td colspan="5">Пусто</td></tr>') + "</table></div>"
      + (edit ? '<button class="btn ghost" style="margin-top:12px" data-pradd="1">+ Позиция</button>' + (S.pdErr ? '<div class="err">' + E(S.pdErr) + "</div>" : "") : "") + companyBlock();
  }
  function loadCompany() {
    return api("/settings/company").then(function (c) { S.comp = c; }, function () { S.comp = null; });
  }
  function companyBlock() {
    var c = S.comp; if (!c) return "";
    var ro = c.can_edit ? "" : " disabled";
    var f = function (k, label, ph) { return '<div class="fld"><label>' + label + '</label><input data-cmp="' + k + '" value="' + E(c[k] == null ? "" : c[k]) + '" placeholder="' + (ph || "") + '"' + ro + "></div>"; };
    return '<div class="panel pad" style="margin-top:16px"><h3>Реквизиты компании</h3><p class="sub">Подставляются в КП, договоры и подпись писем. ' + (c.can_edit ? "" : "Правит руководитель.") + "</p>"
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 14px">'
      + f("name", "Наименование", "ООО «…»") + f("city", "Город договора", "Санкт-Петербург") + f("position", "Должность подписанта", "Генеральный директор") + f("director", "ФИО подписанта", "Иванов И.И.")
      + f("phone", "Телефон", "+7 …") + f("email", "E-mail", "info@…") + f("site", "Сайт", "https://…") + f("valid_days", "Срок действия КП, дней", "30") + "</div>"
      + '<div class="fld"><label>Реквизиты (ИНН, КПП, банк, р/с)</label><textarea data-cmp="requisites" ' + ro + ">" + E(c.requisites || "") + "</textarea></div>"
      + (S.compErr ? '<div class="err">' + E(S.compErr) + "</div>" : "")
      + (c.can_edit ? '<button class="btn primary" data-compsave="1">Сохранить реквизиты</button>' : "") + "</div>";
  }
  function saveCompany() {
    S.compErr = "";
    api("/settings/company", S.comp).then(function (c) { S.comp = Object.assign({}, c, { can_edit: true }); toast("Реквизиты сохранены"); paint(); }, function (e) { S.compErr = String(e); paint(); });
  }
  function downloadDoc(kid, kind, fmt) {
    return C.blob("/ds/kp/" + kid + "/doc?kind=" + kind + "&fmt=" + fmt).then(function (f) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(f.blob); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, function (e) { toast(String(e)); });
  }
  function savePrice() {
    S.pdErr = "";
    api("/price", { items: S.pd.map(function (r) { return { name: r.name, price: +r.price || 0, note: r.note || "", active: !!r.active }; }) }).then(function (r) {
      S.price = { items: r.items, can_edit: true }; S.pd = JSON.parse(JSON.stringify(r.items)); S.kpf = null; toast("Прайс-лист сохранён"); paint();
    }, function (e) { S.pdErr = String(e); paint(); });
  }

  /* ---------- недельные отчёты ---------- */
  function downloadText(name, text, mime) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: (mime || "text/plain") + ";charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function reportKind() { var p = pos(); return p === "ops" ? "ops" : p === "sales" ? "sales" : (p === "owner" ? (S.rp && S.rp.kind) || "design" : "design"); }
  function loadReport() {
    if (!S.rp) S.rp = { kind: reportKind(), start: isoDay(monday()), data: null };
    if (pos() !== "owner") S.rp.kind = reportKind();
    return api("/reports/" + S.rp.kind + "?start=" + S.rp.start).then(function (d) { S.rp.data = d; S.err = ""; }, function (e) { S.rp.data = null; S.err = String(e); });
  }
  function fmtVal(v) { return typeof v === "number" && v > 9999 ? money(v) : String(v); }
  function reportText(r) {
    var l = ["Недельный отчёт: " + r.title + " · " + dmy(r.week_start) + " — " + dmy(r.week_end)];
    r.tiles.forEach(function (x) { l.push("• " + x[2] + ": " + x[1]); });
    r.rows.forEach(function (x) { l.push("• " + x[0] + ": " + fmtVal(x[1])); });
    r.people.forEach(function (x) { l.push("• " + x.name + ": отработано " + x.worked + " из " + x.workdays + ", в работе " + x.in_work + ", просрочено " + x.overdue); });
    r.notes.forEach(function (n) { l.push("• " + n); });
    r.questions.forEach(function (q) { if (q.a) l.push("— " + q.q + " " + q.a); });
    return l.join("\n");
  }
  function reportScreen() {
    var p = pos(), r = S.rp && S.rp.data;
    if (!r) return '<div class="head"><div><h1>Недельный отчёт</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    var tabs = p === "owner" ? '<div class="tabs">' + [["design", "Проектный отдел"], ["ops", "Операционный менеджер"], ["sales", "Отдел продаж"]].map(function (x) { return '<button data-rpkind="' + x[0] + '" class="' + (S.rp.kind === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>" : "";
    var tone = { ok: "var(--ok)", bad: "var(--bad)", brand: "var(--brand)", warn: "var(--warn)" };
    var head = '<div class="head"><div><h1>Недельный отчёт · ' + E(r.title) + "</h1><p>Формируется каждую пятницу в 17:00 и уходит в закрытый канал «Руководители». Неделя " + dmy(r.week_start).slice(0, 5) + " — " + dmy(r.week_end).slice(0, 5) + "</p></div>"
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="seg"><button data-rpnav="-1">← Пред.</button><button data-rpnav="0" class="on">Эта</button><button data-rpnav="1">След. →</button></div>'
      + '<button class="btn ghost" data-rpdl="1">Скачать</button><button class="btn primary" data-rppub="1">Отправить в канал руководителей</button></div></div>'
      + '<div class="rolebar">' + ic("lock") + "<span>" + E(ROLE_NAME[p] || "") + ". " + E(ROLE_NOTE[p] || "") + "</span></div>" + tabs;
    var tiles = '<div class="tiles" style="margin-bottom:16px">' + r.tiles.map(function (x) { return '<div class="tile" style="--c:' + (tone[x[0]] || "var(--brand)") + '"><div class="n">' + E(x[1]) + '</div><div class="l">' + E(x[2]) + "</div></div>"; }).join("") + "</div>";
    var rows = r.rows.length ? '<div class="panel pad"><h3>Статистика недели</h3><div class="kv" style="margin-top:10px">' + r.rows.map(function (x) { return "<span>" + E(x[0]) + "</span><span><b>" + E(fmtVal(x[1])) + "</b></span>"; }).join("") + "</div>"
      + r.notes.map(function (n) { return '<div class="note">' + E(n) + "</div>"; }).join("") + "</div>" : "";
    var people = r.people.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:16px">' + r.people.map(function (x) {
      return '<div class="panel pad"><div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">' + ava(x.name, "lg") + "<div><b>" + E(x.name) + '</b><br><small style="color:var(--muted)">в работе ' + x.in_work + " · просрочено " + x.overdue + "</small></div></div>"
        + '<div class="kv"><span>Отработано</span><span><b>' + x.worked + " из " + x.workdays + "</b> дней</span><span>Отдыхал</span><span>" + x.off + " дн.</span></div>"
        + '<div class="note" style="margin-top:12px">Комментарии по дням:</div>'
        + (x.comments.map(function (c) { return '<div class="ctt"><small>' + dmy(c.day).slice(0, 5) + "</small><div>" + E(c.text) + "</div></div>"; }).join("") || '<div class="note">Комментариев нет</div>') + "</div>";
    }).join("") + "</div>" : "";
    var qs = '<div class="panel pad rq"><h3>Вопросы недели</h3><p class="sub">Ответы попадают в отчёт и в канал «Руководители»</p>' + r.questions.map(function (q) { return '<div class="fld"><label>' + E(q.q) + '</label><textarea data-rq="' + q.id + '" placeholder="Ваш ответ…">' + E(q.a) + "</textarea></div>"; }).join("") + "</div>";
    return head + tiles + people + (rows ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px">' + rows + qs + "</div>" : qs);
  }

  /* ---------- статистика руководителя ---------- */
  var MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  function shiftMonth(m, n) { var y = +m.slice(0, 4), mm = +m.slice(5, 7) - 1 + n; y += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12; return y + "-" + ("0" + (mm + 1)).slice(-2); }
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
  function act(p) {
    if (S.busy) return; S.busy = true;
    return p.then(function () { S.busy = false; S.orders = null; S.tasks = null; return load().then(function () { return S.open ? api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () { S.history = []; }) : null; }); })
      .then(function () {
        if (S.open && !find(S.open)) {              // задача ушла на стадию, которую роль не видит — это нормальная передача дальше
          S.open = null; S.tab = "info"; if (/^#\/task\//.test(location.hash)) history.replaceState(null, "", "#/");
          toast("Готово: задача передана дальше и теперь вам не видна");
        }
        paint();
      }, function (e) { S.busy = false; toast(String(e && e.message || e)); });
  }
  function closeAll() {
    S.form = null; S.edit = null;
    if (S.open) { S.open = null; S.tab = "info"; if (/^#\/task\//.test(location.hash)) history.replaceState(null, "", "#/"); }
    paint();
  }

  document.addEventListener("click", function (e) {
    var inModal = !!e.target.closest("#ds-modal");
    if (!inModal && !(S.mount && S.mount.el && S.mount.el.contains(e.target))) return;
    var bg = e.target.getAttribute && e.target.getAttribute("data-bg");
    if (bg) { closeAll(); return; }
    var t = e.target.closest("[data-open],[data-close],[data-tab],[data-kb],[data-go],[data-urgent],[data-pay],[data-act],[data-new],[data-create],[data-tdone],[data-otype],[data-tile],[data-ostage],[data-ld],[data-edit],[data-saveplan],[data-csel],[data-cnew],[data-cadd],[data-cdel],[data-csave],[data-wmark],[data-woff],[data-wnav],[data-kpstatus],[data-kpcontract],[data-kptouch],[data-ksv],[data-ksave],[data-kcust],[data-kadd],[data-kdel],[data-ctmake],[data-ctsign],[data-ctpick],[data-rpkind],[data-rpnav],[data-rppub],[data-rpdl],[data-stnav],[data-stcsv],[data-pradd],[data-prdel],[data-prsave],[data-prreset],[data-doc],[data-compsave],[data-stsave],[data-aurun],[data-tstate],[data-flstep],[data-fltab],[data-tzset],[data-tzadd],[data-tzdel],[data-tzremind],[data-tzopen]");
    if (!t) return;
    var d = t.dataset;
    if (d.close) return closeAll();
    if (d.open) {
      S.open = +d.open; S.tab = "info"; S.edit = null;
      return api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () { S.history = []; }).then(paint);
    }
    if (d.csel) { var cc = (S.customers || []).filter(function (c) { return c.id === +d.csel; })[0]; if (cc) { S.cu.sel = cc.id; S.cu.draft = JSON.parse(JSON.stringify(cc)); S.cu.err = ""; } paint(); if (innerWidth < 900) { var cardEl = document.querySelector("#clients-app .dsg21 > div:last-child"); if (cardEl) cardEl.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
    if (d.cnew != null && t.hasAttribute("data-cnew")) { S.cu.sel = 0; S.cu.draft = { id: 0, name: "", regular: 0, tz: "Europe/Moscow", comment: "", contacts: [{ fio: "", pos: "", phone: "" }] }; S.cu.err = ""; return paint(); }
    if (d.cadd != null && t.hasAttribute("data-cadd")) { S.cu.draft.contacts.push({ fio: "", pos: "", phone: "" }); return paint(); }
    if (d.cdel != null && t.hasAttribute("data-cdel")) { S.cu.draft.contacts.splice(+d.cdel, 1); return paint(); }
    if (d.csave != null && t.hasAttribute("data-csave")) return saveCustomer();
    if (d.wmark) { var wd = dayRec(d.wmark); return act2(api("/week/day", { day: d.wmark, worked: !wd.worked }), true); }
    if (d.woff) { var wf = dayRec(d.woff); return act2(api("/week/day", { day: d.woff, off: !wf.off }), true); }
    if (d.wnav != null && t.hasAttribute("data-wnav")) { S.wk.start = isoDay(addDays(S.wk.start === "" ? monday() : new Date(S.wk.start + "T00:00:00"), d.wnav === "0" ? 0 : (+d.wnav) * 7)); if (d.wnav === "0") S.wk.start = isoDay(monday()); return loadWeek().then(paint); }
    if (d.kpcontract) { S.ct = { kid: +d.kpcontract, type: "Проектирование СПС, СОУЭ", days: 30, made: false }; location.hash = "#/contracts"; return; }
    if (d.kpstatus != null && t.hasAttribute("data-kpstatus")) return;
    if (d.kptouch) return act2(api("/kp/" + d.kptouch + "/touch", {}).then(loadKp), false);
    if (d.ksv != null && t.hasAttribute("data-ksv")) { var it = S.kpf.items[+d.ksv]; it.on = !it.on; return paint(); }
    if (d.kadd != null && t.hasAttribute("data-kadd")) { S.kpf.items.push({ name: "", price: 0, on: true, custom: true }); return paint(); }
    if (d.kdel != null && t.hasAttribute("data-kdel")) { S.kpf.items.splice(+d.kdel, 1); return paint(); }
    if (d.ksave != null && t.hasAttribute("data-ksave")) return saveKp(d.ksave === "send");
    if (d.ctmake != null && t.hasAttribute("data-ctmake")) return makeContract();
    if (d.ctsign != null && t.hasAttribute("data-ctsign")) return signContract();
    if (d.tstate) { var ts = d.tstate.split(":"); return act2(api("/tasks/" + ts[0] + "/state", { state: ts[1] }).then(function () { S.tasks = null; return load(); }), false); }
    if (d.flstep) { S.flStep = S.flStep === d.flstep ? null : d.flstep; return paint(); }
    if (d.fltab) { S.flTab = d.fltab; if (d.fltab === "path" && !S.flOrder && (S.orders || []).length) S.flOrder = S.orders[0].id; return loadPath().then(paint); }
    if (d.tzset != null && t.hasAttribute("data-tzset")) { var tp = d.tzset.split(":"); return tzCall("/orders/" + S.open + "/tz", { idx: +tp[0], done: tp[1] === "1" }); }
    if (d.tzadd != null && t.hasAttribute("data-tzadd")) { var ti = document.getElementById("tzNew"); var tt = ti ? ti.value.trim() : ""; if (!tt) return toast("Введите название пункта"); return tzCall("/orders/" + S.open + "/tz/add", { title: tt }); }
    if (d.tzdel != null && t.hasAttribute("data-tzdel")) return tzCall("/orders/" + S.open + "/tz/delete", { idx: +d.tzdel });
    if (d.tzremind) return act2(api("/orders/" + d.tzremind + "/tz/remind", {}).then(function () { toast("Напоминание отправлено операционному менеджеру"); }), false);
    if (d.tzopen) { S.open = +d.tzopen; S.tab = "tz"; S.edit = null; return Promise.all([api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () { S.history = []; }), loadTzItem(S.open)]).then(paint); }
    if (d.stsave != null && t.hasAttribute("data-stsave")) return saveStages();
    if (d.aurun != null && t.hasAttribute("data-aurun")) return act2(api("/auto/run", {}).then(function (r) { var n = Object.keys(r.fired).reduce(function (a, k) { return a + r.fired[k]; }, 0); toast(n ? "Сработало правил: " + n : "Сейчас ничего не требует внимания"); return loadAuto(); }), false);
    if (d.doc) { var dd = d.doc.split(":"); return downloadDoc(+dd[0], dd[1], dd[2]); }
    if (d.compsave != null && t.hasAttribute("data-compsave")) return saveCompany();
    if (d.pradd != null && t.hasAttribute("data-pradd")) { S.pd.push({ name: "", price: 0, note: "", active: true }); return paint(); }
    if (d.prdel != null && t.hasAttribute("data-prdel")) { S.pd.splice(+d.prdel, 1); return paint(); }
    if (d.prreset != null && t.hasAttribute("data-prreset")) { S.pd = JSON.parse(JSON.stringify(S.price.items)); S.pdErr = ""; return paint(); }
    if (d.prsave != null && t.hasAttribute("data-prsave")) return savePrice();
    if (d.rpkind) { S.rp.kind = d.rpkind; return loadReport().then(paint); }
    if (d.rpnav != null && t.hasAttribute("data-rpnav")) { S.rp.start = isoDay(addDays(new Date(S.rp.start + "T00:00:00"), d.rpnav === "0" ? 0 : (+d.rpnav) * 7)); if (d.rpnav === "0") S.rp.start = isoDay(monday()); return loadReport().then(paint); }
    if (d.rppub != null && t.hasAttribute("data-rppub")) return act2(api("/reports/" + S.rp.kind + "/publish?start=" + S.rp.start, {}).then(function () { toast("Отчёт отправлен в канал «Руководители»"); }), false);
    if (d.rpdl != null && t.hasAttribute("data-rpdl")) return downloadText("otchet-" + S.rp.kind + "-" + S.rp.start + ".txt", reportText(S.rp.data));
    if (d.stnav != null && t.hasAttribute("data-stnav")) { S.st.month = shiftMonth(S.st.month, +d.stnav); return loadStats().then(paint); }
    if (d.stcsv != null && t.hasAttribute("data-stcsv")) return downloadText("statistika-" + S.st.month + ".csv", statsCsv(S.st.data), "text/csv");
    if (d.otype) { S.ov.otype = d.otype; S.ov.type = d.otype; S.ov.tile = ""; return paint(); }
    if (d.tile) { S.ov.tile = S.ov.tile === d.tile ? "" : d.tile; return paint(); }
    if (d.ostage != null && t.hasAttribute("data-ostage")) { S.ov.stage = d.ostage; return paint(); }
    if (d.ld) { S.ld = d.ld; return paint(); }
    if (d.edit) { if (!(pos() === "owner" || pos() === "design")) return toast("Исполнителя и сроки назначает руководитель проектного отдела"); S.edit = +d.edit; S.open = null; return paint(); }
    if (d.saveplan) {
      var w = +document.getElementById("pl-who").value, s = document.getElementById("pl-s").value, en = document.getElementById("pl-e").value;
      var id2 = S.edit; S.edit = null;
      return act(api("/orders/" + id2 + "/plan", { executor_id: w, start: s, end: en }));
    }
    if (d.tab) { S.tab = d.tab; if (d.tab === "tz") return loadTzItem(S.open).then(paint); return paint(); }
    if (d.kb) { S.kb = d.kb; return paint(); }
    if (d.new) { S.form = { number: "", customer: "", object: "", due: "", amount: "", adv: false, advSum: "", err: "" }; return paint(); }
    if (d.tdone) return act(api("/tasks/" + d.tdone + "/done", {}));
    if (d.create) return createOrder();
    var o = find(S.open); if (!o) return;
    if (d.go) {
      if (d.needexec) {
        var ex = document.getElementById("dsExec"), id = ex ? +ex.value : 0;
        if (!id && !o.executor_id) return toast("Сначала выберите исполнителя");
        var chain = (id && id !== o.executor_id) ? api("/orders/" + o.id + "/assign", { executor_id: id }) : Promise.resolve();
        return act(chain.then(function () { return api("/orders/" + o.id + "/stage", { stage: d.go }); }));
      }
      return act(api("/orders/" + o.id + "/stage", { stage: d.go }));
    }
    if (d.urgent != null && d.urgent !== "") return act(api("/orders/" + o.id + "/urgent", { urgent: d.urgent === "1" }));
    if (d.pay) return act(api("/orders/" + o.id + "/payment", { kind: d.pay }));
    if (d.act) { var b = {}; b[d.act] = true; return act(api("/orders/" + o.id + "/act", b)); }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "dsQ") { S.ov.q = e.target.value; return paint(); }
    var sd = e.target.dataset && e.target.dataset.sd;
    if (sd && S.stgD) { S.stgD[sd] = e.target.value; return; }
    var cmp = e.target.dataset && e.target.dataset.cmp;
    if (cmp && S.comp) { S.comp[cmp] = e.target.value; return; }
    var prf = e.target.dataset && e.target.dataset.prf;
    if (prf && S.pd) { var pp = prf.split("."); var row = S.pd[+pp[0]]; row[pp[1]] = pp[1] === "price" ? (+e.target.value || 0) : e.target.value; return; }
    var kf = e.target.dataset && e.target.dataset.kf;
    if (e.target.dataset && e.target.dataset.rq != null && S.rp) { S.rp.data.questions[+e.target.dataset.rq].a = e.target.value; return; }
    if (kf && S.kpf) {
      var kp_ = kf.split(".");
      if (kp_[0] === "i") S.kpf.items[+kp_[1]][kp_[2]] = kp_[2] === "price" ? (+e.target.value || 0) : e.target.value; else S.kpf[kp_[0]] = e.target.value;
      if (kp_[0] === "i" && kp_[2] === "price") { var tt = document.getElementById("kTotal"); if (tt) tt.textContent = money(kpTotal()); }
      return;
    }
    var ctf = e.target.dataset && e.target.dataset.ctf;
    if (ctf && S.ct) { S.ct[ctf] = e.target.value; S.ct.made = false; return; }
    var cf = e.target.dataset && e.target.dataset.cf;
    if (cf && S.cu.draft) {
      var parts = cf.split(".");
      if (parts[0] === "c") S.cu.draft.contacts[+parts[1]][parts[2]] = e.target.value; else S.cu.draft[parts[0]] = e.target.value;
      return;
    }
    if (!S.form || !e.target.id) return;
    var f = S.form, map = { nfNum: "number", nfCust: "customer", nfObj: "object", nfDue: "due", nfSum: "amount", nfAdvSum: "advSum" };
    if (map[e.target.id]) f[map[e.target.id]] = e.target.value;
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "nfAdv" && S.form) { S.form.adv = e.target.checked; paint(); }
    if (e.target.dataset && (e.target.dataset.kf === "customer_id" || e.target.dataset.kf === "pay") && S.kpf) { S.kpf[e.target.dataset.kf] = e.target.dataset.kf === "pay" ? e.target.value : +e.target.value; paint(); }
    if (e.target.dataset && e.target.dataset.ctpick != null && S.ct) { S.ct = { kid: +e.target.value, type: S.ct.type, days: S.ct.days, made: false }; paint(); }
    if (e.target.dataset && e.target.dataset.kpstatus && S.kp) { var kid_ = +e.target.dataset.kpstatus; act2(api("/kp/" + kid_ + "/status", { status: e.target.value }).then(loadKp), false); }
    if (e.target.dataset && e.target.dataset.cfchk != null && S.cu.draft) { S.cu.draft.regular = e.target.checked ? 1 : 0; }
    if (e.target.dataset && e.target.dataset.cftz != null && S.cu.draft) { S.cu.draft.tz = e.target.value; paint(); }
    if (e.target.id === "flOrder") { S.flOrder = +e.target.value; loadPath().then(paint); }
    if (e.target.dataset && e.target.dataset.aur && S.au) {
      var rid = e.target.dataset.aur, box = document.querySelector('[data-auv="' + rid + '"]'), en = document.querySelector('[data-aue="' + rid + '"]');
      api("/auto", { rule: rid, enabled: en.checked, value: +box.value || 0 }).then(function (r) { S.au.rules = r.rules.map(function (x) { var o = S.au.rules.filter(function (y) { return y.id === x.id; })[0]; return Object.assign({}, x, { fired: o ? o.fired : 0 }); }); toast("Правило сохранено"); paint(); }, function (er) { toast(String(er)); });
    }
    if (e.target.dataset && e.target.dataset.prfa != null && S.pd) { S.pd[+e.target.dataset.prfa].active = e.target.checked; }
    if (e.target.dataset && e.target.dataset.rq != null && S.rp) {
      api("/reports/" + S.rp.kind + "/answer", { start: S.rp.start, qid: +e.target.dataset.rq, text: e.target.value }).catch(function (er) { toast(String(er)); });
    }
    if (e.target.dataset && e.target.dataset.wc && S.wk) {
      var dr = dayRec(e.target.dataset.wc); dr.comment = e.target.value;
      api("/week/day", { day: e.target.dataset.wc, comment: e.target.value }).catch(function (er) { toast(String(er)); });
    }
  });
  function createOrder() {
    var f = S.form;
    if (!f.number.trim() || !f.customer.trim() || !f.object.trim()) { f.err = "Заполните номер, заказчика и объект"; return paint(); }
    api("/customers", { name: f.customer.trim() }).then(function (c) {
      return api("/orders", { number: f.number.trim(), customer_id: c.id, object: f.object.trim(), due_date: f.due || "", amount: +f.amount || 0,
        adv_mode: f.adv ? "advance" : "none", adv_sum: f.adv ? (+f.advSum || 0) : 0, contract_date: new Date().toISOString().slice(0, 10) });
    }).then(function () { S.form = null; S.customers = null; S.orders = null; DS.route(); }, function (er) { f.err = String(er); paint(); });
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && (S.open || S.form) && document.getElementById("ds-modal")) closeAll(); });
  if (C) { C.on("logout", function () { S.orders = S.meta = S.customers = S.people = S.tasks = null; S.open = null; var m = document.getElementById("ds-modal"); if (m) m.innerHTML = ""; }); }
})();
if (location.hash === '' || location.hash === '#/' || /^#\/task\//.test(location.hash)) { setTimeout(function () { if (document.getElementById('tasks-app') && document.getElementById('tasks-app').style.display !== 'none') DS.route(); }, 0); }
(function () { var h = location.hash; var map = { '#/dash': ['ov', 'dash-app'], '#/cal': ['load', 'cal-app'] }; if (map[h]) setTimeout(function () { DS.mount(map[h][0], document.getElementById(map[h][1])); }, 0); })();
if (window.MPBC && typeof window.globalRouter === "function") {
  ["login", "logout", "ready"].forEach(function (ev) {
    window.MPBC.on(ev, function () { if (ev === "ready") window.DS_READY = true; window.globalRouter(); });
  });
}
(function () { var h = location.hash; var map = { '#/clients': ['cust', 'clients-app'], '#/my': ['week', 'my-app'] }; if (map[h]) setTimeout(function () { var p = window.dsPosition ? dsPosition() : ''; if (h === '#/my' && p !== 'designer' && p !== 'design') return; DS.mount(map[h][0], document.getElementById(map[h][1])); }, 0); })();
DS.ownsMy = function () { var p = pos2(); return p === 'designer' || p === 'design'; }; function pos2() { return (window.MPBC && MPBC.me && (MPBC.me.position || (MPBC.me.role === 'admin' ? 'owner' : ''))) || ''; }
(function () { var h = location.hash; var map = { '#/kpc': ['kpc', 'kpc-app'], '#/contracts': ['contract', 'contracts-app'] }; var k = map[h] || (/^#\/kpreg/.test(h) ? ['kp', 'kpreg-app'] : null); if (k) setTimeout(function () { DS.mount(k[0], document.getElementById(k[1])); }, 0); })();
(function () { var h = location.hash; var map = { '#/report': ['report', 'report-app'], '#/stats': ['stats', 'stats-app'] }; if (map[h]) setTimeout(function () { DS.mount(map[h][0], document.getElementById(map[h][1])); }, 0); })();
(function () { if (location.hash === '#/price') setTimeout(function () { DS.mount('price', document.getElementById('price-app')); }, 0); })();
