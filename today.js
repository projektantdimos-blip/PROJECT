/* Проекты DS — главный экран «Сегодня» (#/today). Один запрос /api/ds/today: что горит, что ждёт подтверждения,
   мои задачи и личные напоминания, блоки роли (обращения, сбор данных, КП без ответа, ждём оплату, без исполнителя,
   проверка, корректировки, загрузка проектировщиков). Действия — существующими запросами CRM, данные уже отфильтрованы по роли.
   Атрибуты кнопок — с префиксом data-td, чтобы их не перехватывал общий обработчик ds.js (data-open и т. п.). */
(function () {
  "use strict";
  var C = window.MPBC;
  var T = window.DSToday = {};
  var S = { d: null, err: "", el: null, loading: false, opts: false, q: { due: "today", date: "", tm: "", rep: "", who: 0 }, edit: {}, open: {}, more: {}, at: 0 };
  var LIMIT = 6;                                  // столько строк в блоке, остальное — по «Ещё N»
  var WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var REPS = [["", "нет"], ["day", "каждый день"], ["week", "каждую неделю"], ["month", "каждый месяц"]];

  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plural(n, f) { n = Math.abs(n); var a = n % 10, b = n % 100; return n + " " + (a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]); }
  function dn(n) { return plural(n, ["день", "дня", "дней"]); }
  function pd(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function today0() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addD(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function left(isoD) { var d = pd(isoD); return d ? Math.round((d - today0()) / 864e5) : null; }
  function dm(isoD) { var d = pd(isoD); return d ? ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) : ""; }
  function dayLabel(isoD) { var l = left(isoD), d = pd(isoD); if (l === 0) return "сегодня"; if (l === 1) return "завтра"; return d ? WD[d.getDay()] + " " + dm(isoD) : ""; }
  function money(n) { return Number(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function api(path, body) { return C.call("/../ds" + path, body ? { body: body } : {}); }
  function toast(m) {
    if (window.toast) return window.toast(m);
    var t = document.getElementById("xToast"); if (!t) { t = document.createElement("div"); t.id = "xToast"; t.className = "x-toast"; document.body.appendChild(t); }
    t.innerHTML = "<span>" + E(m) + "</span>"; t.className = "x-toast on"; clearTimeout(toast.h); toast.h = setTimeout(function () { t.className = "x-toast"; }, 3500);
  }
  function me() { return (C && C.me) || {}; }
  function first(n) { return String(n || "").split(" ")[0]; }

  /* ---------- загрузка ---------- */
  function load() {
    S.loading = true;
    var uid = C.me && C.me.id;
    return api("/today").then(function (d) { if (C.me && C.me.id === uid) { S.d = d; S.err = ""; S.at = Date.now(); } }, function (e) { S.err = String(e); }).then(function () { S.loading = false; });
  }
  T.mount = function (el) {
    if (!el) return;
    S.el = el;
    if (!C || !C.loggedIn()) {
      el.innerHTML = '<div class="ds dspage td"><div class="head"><div><h1>Сегодня</h1><p>Войдите, чтобы увидеть свои задачи</p></div><button class="btn primary" data-tdlogin="1">Войти по PIN</button></div></div>';
      return;
    }
    if (S.uid !== C.me.id) { S.d = null; S.edit = {}; S.more = {}; S.at = 0; S.uid = C.me.id; }      // сменился сотрудник — чужие данные не показываем
    if (!S.d) el.innerHTML = '<div class="ds dspage td"><div class="loading">Загружаю…</div></div>';
    else paint();
    if (S.loading) return;
    if (S.d && Date.now() - S.at < 15000) return;          // только что загружали: перерисовка без нового запроса
    load().then(paint);
  };
  function visible() { return S.el && S.el.style.display !== "none" && document.body.contains(S.el); }
  function reload() { return load().then(function () { if (visible()) paint(); }); }

  /* ---------- разбор быстрой строки: «позвонить Спектр завтра 10:00 @Полина» ---------- */
  var WDN = { "пн": 1, "вт": 2, "ср": 3, "чт": 4, "пт": 5, "сб": 6, "вс": 0 };
  function parse(text) {
    var d = S.d || {}, q = S.q, out = { title: text, due: null, tm: "", who: 0 };
    var t = " " + text + " ";
    var m = /\s(\d{1,2})[:.](\d{2})(?=\s)/.exec(t);
    if (m && +m[1] < 24 && +m[2] < 60) { out.tm = ("0" + m[1]).slice(-2) + ":" + m[2]; t = t.replace(m[0], " "); }
    if (/\sпослезавтра(?=\s)/i.test(t)) { out.due = iso(addD(today0(), 2)); t = t.replace(/\sпослезавтра(?=\s)/i, " "); }
    else if (/\sзавтра(?=\s)/i.test(t)) { out.due = iso(addD(today0(), 1)); t = t.replace(/\sзавтра(?=\s)/i, " "); }
    else if (/\sсегодня(?=\s)/i.test(t)) { out.due = iso(today0()); t = t.replace(/\sсегодня(?=\s)/i, " "); }
    else {
      var w = /\s(?:в\s|во\s)?(пн|вт|ср|чт|пт|сб|вс)(?=\s)/i.exec(t);
      if (w) { var k = WDN[w[1].toLowerCase()], n = (k - today0().getDay() + 7) % 7 || 7; out.due = iso(addD(today0(), n)); t = t.replace(w[0], " "); }
    }
    var a = /\s@([A-Za-zА-Яа-яЁё]+)/.exec(t);
    if (a) {
      var nm = a[1].toLowerCase(), u = (d.assignable || []).filter(function (x) { return x.name.toLowerCase().indexOf(nm) === 0 || first(x.name).toLowerCase() === nm; })[0];
      if (u) { out.who = u.id; t = t.replace(a[0], " "); }
    }
    out.title = t.replace(/\s+/g, " ").trim();
    if (!out.due) out.due = q.due === "date" ? q.date : q.due === "tomorrow" ? iso(addD(today0(), 1)) : iso(today0());
    if (!out.tm) out.tm = q.tm;
    if (!out.who) out.who = q.who;
    if (out.who === me().id) out.who = 0;
    return out;
  }
  function previewText(p) {
    var who = p.who ? ((S.d.assignable || []).filter(function (x) { return x.id === p.who; })[0] || {}).name : "";
    var rep = !p.who && S.q.rep ? ", " + (REPS.filter(function (r) { return r[0] === S.q.rep; })[0] || ["", ""])[1] : "";
    return (who ? "Задача: " + who : "Мне (напоминание)") + " · " + dayLabel(p.due) + (p.tm ? " " + p.tm : "") + rep;
  }
  function fireTs(isoD, tm) {
    var d = pd(isoD) || today0(), now = Date.now();
    if (tm) { var h = tm.split(":"); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), +h[0], +h[1]).getTime(); }
    var t9 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0).getTime();
    if (t9 > now) return t9;
    var t18 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0).getTime();
    return t18 > now ? t18 : now + 30 * 60000;          // «сегодня без времени» вечером: напомнить через полчаса
  }
  function add() {
    var inp = S.el.querySelector("[data-tdinput]"), text = inp ? inp.value.trim() : "";
    if (!text) { if (inp) inp.focus(); return; }
    var p = parse(text);
    if (!p.title) return toast("Опишите, что нужно сделать");
    var job = p.who
      ? api("/tasks", { title: p.title + (p.tm ? " (" + p.tm + ")" : ""), assignee_id: p.who, due: p.due })      // у задач нет времени — оставляем его в названии                                 // другому — организационная задача
      : C.call("/reminders", { body: { title: p.title, d: p.due, tm: p.tm, before: 0, fire_ts: fireTs(p.due, p.tm) / 1000, rep: S.q.rep, task_row: 0, task_label: "", link: "" } });      // себе — напоминание (с повтором)
    job.then(function () {
      toast(p.who ? "Задача поставлена" : "Добавлено");
      S.q = { due: "today", date: "", tm: "", rep: "", who: 0 }; S.opts = false;
      if (inp) inp.value = "";
      return reload();
    }, function (e) { toast(String(e)); });
  }

  /* ---------- куски разметки ---------- */
  function btn(label, attrs, cls) { return '<button class="btn sm ' + (cls || "ghost") + '" ' + attrs + ">" + label + "</button>"; }
  function row(lead, title, sub, right, acts, cls) {
    return '<div class="td-it ' + (cls || "") + '">' + lead + '<div class="td-g"><div class="td-t">' + title + '</div>' + (sub ? '<div class="td-s">' + sub + "</div>" : "") + "</div>"
      + (right ? '<div class="td-r">' + right + "</div>" : "") + (acts ? '<div class="td-a">' + acts + "</div>" : "") + "</div>";
  }
  function cap(id, rows) {
    if (S.more[id] || rows.length <= LIMIT + 1) return rows.join("");
    return rows.slice(0, LIMIT).join("") + '<button class="td-more" data-tdmore="' + id + '">Ещё ' + (rows.length - LIMIT) + " ▾</button>";
  }
  function dot(c) { return '<span class="td-dot ' + c + '"></span>'; }
  function tag(t, c) { return '<span class="td-tag ' + (c || "") + '">' + E(t) + "</span>"; }
  function panel(id, title, n, body, cls, foot) {
    var shut = S.open[id] === false || (S.open[id] == null && /^(week|later|nodate)$/.test(id));
    return '<section class="panel td-p ' + (cls || "") + (shut ? " shut" : "") + '"><button class="td-ph" data-tdfold="' + id + '"><h3>' + title + "</h3>"
      + (n !== "" && n != null ? '<span class="td-n">' + n + "</span>" : "") + '<span class="td-chev">▾</span></button><div class="td-pb">' + body + (foot ? '<div class="td-foot">' + foot + "</div>" : "") + "</div></section>";
  }
  function openBtn(t) {
    if (t.order_id) return btn("Открыть", 'data-tdorder="' + t.order_id + '"');
    if (t.thread_id) return btn("Диалог", 'data-tdchat="' + E(t.thread_id) + '"');
    return "";
  }
  function ackBtn(t) { return t.ack_wait && t.assignee_id === me().id ? btn("✓ Подтвердить получение", 'data-tdack="' + t.id + '"', "primary") : ""; }
  function orderSub(o) {
    return [o.customer, o.object, o.stage, o.executor].filter(Boolean).map(E).join(" · ");
  }

  /* что горит */
  function hotRows(d) {
    var pos = d.pos, rows = [];
    d.hot.forEach(function (h) {
      if (h.type === "task") {
        rows.push(row(dot("bad"), E(h.title) + (h.author ? "" : tag("авто", "auto")), "срок был " + E(dm(h.due)) + (h.order_number ? " · №" + E(h.order_number) + " " + E(h.object || "") : "") + (h.note ? " · " + E(h.note) : ""),
          '<b class="bad">' + E(h.reason) + "</b>", ackBtn(h) + btn("✓ Готово", 'data-tddone="' + h.id + '"', "ok") + openBtn(h)));
        return;
      }
      var acts = btn("Открыть", 'data-tdorder="' + h.id + '"');
      if (pos === "owner" || pos === "ops" || pos === "design") acts = btn("🔔 Напомнить", 'data-tdremind="' + h.id + '" data-kind="' + h.kind + '"') + acts;
      if ((h.kinds || [h.kind]).indexOf("unassigned") >= 0 && (d.executors || []).length) acts = assignSel(h.id, d) + acts;
      rows.push(row(dot(h.kind === "overdue" ? "bad" : "warn"), "№" + E(h.number) + " · " + E(h.reason) + (h.urgent ? tag("срочно", "bad") : ""), orderSub(h), "", acts));
    });
    reminders(d).filter(function (r) { return r._l != null && r._l < 0; }).forEach(function (r) {
      rows.push(row(dot("bad"), E(r.title) + tag("моё", "me"), "срок был " + E(dm(r.d)) + (r.tm ? " " + E(r.tm) : ""), '<b class="bad">Просрочено на ' + dn(-r._l) + "</b>", btn("✓ Готово", 'data-tdrem="' + r.id + '"', "ok")));
    });
    return rows;
  }
  function assignSel(oid, d) {
    return '<select class="td-sel" data-tdassign="' + oid + '"><option value="">Назначить…</option>' + (d.executors || []).map(function (u) {
      return '<option value="' + u.id + '">' + E(u.name) + (u.n ? " · " + u.n + " в работе" : " · свободен") + "</option>";
    }).join("") + "</select>";
  }

  /* ждёт подтверждения / решения */
  function confirmPanel(d) {
    if (d.outbox && d.outbox.length) {
      var body = d.outbox.map(function (n) {
        var ed = S.edit[n.id];
        return '<div class="td-ob">' + row(dot("org"), "№" + E(n.number) + " " + E(n.customer || "") + tag(n.stage, "me"), '<span class="td-prev">' + E(n.text) + "</span>", "",
          btn("Отправить", 'data-tdsend="' + n.id + '" data-tid="' + E(n.thread_id) + '"', "primary") + btn("✎", 'data-tdedit="' + n.id + '" title="Изменить текст"') + btn("✕", 'data-tdnosend="' + n.id + '" title="Не отправлять"'))
          + (ed ? '<div class="td-edit"><textarea rows="3" data-tdtext="' + n.id + '">' + E(n.text) + "</textarea></div>" : "") + "</div>";
      }).join("");
      return panel("conf", "Сообщения заказчикам ждут подтверждения", d.outbox.length, body, "td-conf", "Уходят заказчику только после «Отправить». Текст можно поправить по ✎.");
    }
    if (d.review && d.review.length) {
      return panel("conf", "Ждут вашей проверки", d.review.length, d.review.map(function (o) {
        return row(dot("org"), "№" + E(o.number) + " · " + E(o.object), [o.executor, "на проверке " + dn(o.days)].filter(Boolean).map(E).join(" · "), "",
          btn("Принять → На согласование", 'data-tdstage="' + o.id + '" data-to="На согласовании"', "primary") + btn("Вернуть", 'data-tdstage="' + o.id + '" data-to="В проектировании"') + btn("Открыть", 'data-tdorder="' + o.id + '"'));
      }).join(""), "td-conf");
    }
    var sl = (d.blocks || {}).sales_leads;
    if (sl && sl.length) {
      return panel("conf", "Передали вам из обращений", sl.length, sl.map(function (t) {
        var a2 = t.step === "a2";
        return row(dot("org"), E(t.title), [t.note, t.author ? "от " + first(t.author) : "", t.due ? "срок " + dm(t.due) : ""].filter(Boolean).map(E).join(" · "), "",
          (a2 ? btn("КП отправлено →", 'data-tdlead="' + t.id + '" data-act="next"', "primary") + btn("Не требуется", 'data-tdlead="' + t.id + '" data-act="skip"')
              : btn("✓ Закрыть", 'data-tdlead="' + t.id + '" data-act="skip"', "ok")) + (t.thread_id ? btn("Диалог", 'data-tdchat="' + E(t.thread_id) + '"') : ""));
      }).join(""), "td-conf");
    }
    return "";
  }

  /* поставил другому, а получение ещё не подтвердили */
  function sentPanel(d) {
    var s = d.sent || [];
    if (!s.length) return "";
    return panel("sent", "Не подтвердили получение", s.length, cap("sent", s.map(function (t) {
      var ago = Math.round((Date.now() / 1000 - t.created) / 3600);
      return row(dot(ago >= 24 ? "bad" : "warn"), E(String(t.title).replace(/:\s*№.*$/, "")), E(t.assignee) + " · поставлена " + (ago < 1 ? "только что" : ago < 24 ? ago + " ч назад" : dn(Math.round(ago / 24)) + " назад"), "", t.order_id ? btn("Открыть", 'data-tdorder="' + t.order_id + '"') : "");
    })));
  }

  /* мои задачи + напоминания по срокам */
  function reminders(d) { return (d.reminders || []).map(function (r) { r._l = left(r.d); return r; }); }
  function allMine(d) {
    var a = d.tasks.map(function (t) { return { k: "task", id: t.id, title: t.title, due: t.due, l: t.left_days, x: t }; });
    reminders(d).forEach(function (r) { if (r._l == null || r._l >= 0) a.push({ k: "rem", id: r.id, title: r.title, due: r.d, tm: r.tm, rep: r.rep, l: r._l, link: r.link, x: r }); });
    a.sort(function (p, q) { return ((p.due || "9999") + (p.tm || "")).localeCompare((q.due || "9999") + (q.tm || "")); });
    return a;
  }
  function mineRow(m) {
    var x = m.x, sub = [], tags = "";
    if (m.k === "task") {
      if (x.order_number) sub.push("№" + x.order_number + (x.object ? " " + x.object : ""));
      if (x.note) sub.push(x.note);
      if (x.author && x.author !== me().name) sub.push("от " + first(x.author));
      tags = x.author ? "" : tag("авто", "auto");
    } else {
      tags = tag("моё", "me") + (m.rep ? tag("повтор · " + (REPS.filter(function (r) { return r[0] === m.rep; })[0] || ["", ""])[1], "rep") : "");
    }
    var when = (m.l != null && m.l > 0 ? dayLabel(m.due) : "") + (m.tm ? (m.l > 0 ? " " : "") + m.tm : "");
    var ck = m.k === "task" ? 'data-tddone="' + m.id + '"' : 'data-tdrem="' + m.id + '"';
    var acts = (m.k === "task" ? ackBtn(x) + openBtn(x) : (m.link ? btn("Открыть", 'data-tdhash="' + E(m.link) + '"') : "") + btn("⏰", 'data-tdsnooze="' + m.id + '" title="Отложить на час"'));
    return '<div class="td-it td-mine"><button class="td-ck" ' + ck + ' title="Готово">✓</button><div class="td-g"><div class="td-t">' + E(m.title) + tags + "</div>"
      + (sub.length ? '<div class="td-s">' + sub.map(E).join(" · ") + "</div>" : "") + "</div>" + (when ? '<div class="td-r">' + E(when) + "</div>" : "") + (acts ? '<div class="td-a">' + acts + "</div>" : "") + "</div>";
  }
  function minePanels(d) {
    var all = allMine(d), td = [], wk = [], lt = [], nd = [];
    all.forEach(function (m) { if (m.l == null) nd.push(m); else if (m.l <= 0) td.push(m); else if (m.l <= 7) wk.push(m); else lt.push(m); });
    var empty = '<div class="td-empty">На сегодня ничего — добавьте задачу строкой выше</div>';
    var h = panel("today", "Мои задачи на сегодня", td.length, td.length ? td.map(mineRow).join("") : empty);
    if (wk.length) {
      var days = {}, order = [];
      wk.forEach(function (m) { if (!days[m.due]) { days[m.due] = []; order.push(m.due); } days[m.due].push(m); });
      h += panel("week", "На неделе", wk.length, order.map(function (k) { return '<div class="td-day">' + E(dayLabel(k)) + "</div>" + days[k].map(mineRow).join(""); }).join(""));
    }
    if (lt.length) h += panel("later", "Позже", lt.length, lt.map(mineRow).join(""));
    if (nd.length) h += panel("nodate", "Без срока", nd.length, nd.map(mineRow).join(""));
    return { html: h, today: td.length, week: wk.length };
  }

  /* блоки роли */
  function roleBlocks(d) {
    var b = d.blocks || {}, h = "";
    if (b.leads && b.leads.length) h += panel("leads", "Новые обращения", b.leads.length, cap("leads", b.leads.map(function (t) {
      var ago = t.created ? Math.round((Date.now() / 1000 - t.created) / 3600) : null;
      return row(dot("info"), E(String(t.title).replace(/^Обращение:\s*/, "")), [t.note, ago == null ? "" : ago < 1 ? "только что" : ago < 24 ? ago + " ч назад" : dn(Math.round(ago / 24)) + " назад"].filter(Boolean).map(E).join(" · "), "",
        btn("В продажи →", 'data-tdlead="' + t.id + '" data-act="next"', "primary") + btn("Не требуется", 'data-tdlead="' + t.id + '" data-act="skip"') + (t.thread_id ? btn("Диалог", 'data-tdchat="' + E(t.thread_id) + '"') : ""));
    })));
    if (b.collect && b.collect.length) h += panel("collect", "Сбор данных", b.collect.length, cap("collect", b.collect.map(function (o) {
      var over = o.sla != null && o.days > o.sla;
      return row(dot(over ? "bad" : "ok"), "№" + E(o.number) + " · " + E(o.customer || ""), E(o.object || ""), "<b" + (over ? ' class="bad"' : "") + ">" + dn(o.days) + "</b>" + (o.sla != null ? "срок этапа " + o.sla : ""), btn("Открыть", 'data-tdorder="' + o.id + '"'));
    })));
    if (b.kp_promise && b.kp_promise.length) {                // ⭐ «Следим» в реестре КП: заказчик обещал оплату
      var td = b.today_iso || "", psum = 0;
      h += panel("kp_promise", "⭐ Обещали оплату", b.kp_promise.length, cap("kp_promise", b.kp_promise.map(function (k) {
        var s = k.adv_sum || k.amount || 0, late = k.pay_expect && k.pay_expect < td, now = k.pay_expect === td; psum += s;
        return row(dot(late ? "bad" : now ? "ok" : "warn"), E(k.number) + " · " + E(k.customer || ""), [k.watch_note ? "💬 " + k.watch_note : "", k.object, k.manager].filter(Boolean).map(E).join(" · "),
          "<b" + (late ? ' class="bad"' : "") + ">" + (!k.pay_expect ? "без даты" : now ? "сегодня" : (late ? "просрочено, " : "к ") + E(dm(k.pay_expect))) + "</b>" + money(s),
          btn("Был контакт", 'data-tdtouch="' + k.id + '"') + btn("Реестр", 'data-tdhash="#/kpreg/"'));
      })), "", "Обещали на сумму " + money(psum));
    }
    if (b.kp_silent && b.kp_silent.length) {
      var sum = b.kp_silent.reduce(function (a, k) { return a + (k.amount || 0); }, 0);
      h += panel("kp_silent", "КП без ответа", b.kp_silent.length, cap("kp_silent", b.kp_silent.map(function (k) {
        return row(dot(k.last_days >= 2 * b.kp_silent_days ? "bad" : "warn"), E(k.number) + " · " + E(k.customer || ""), [k.object, k.status, k.manager].filter(Boolean).map(E).join(" · "),
          "<b>" + money(k.amount) + "</b>" + dn(k.last_days) + " без ответа", btn("Был контакт", 'data-tdtouch="' + k.id + '"') + btn("Реестр", 'data-tdhash="#/kpreg/"'));
      })), "", "Без ответа дольше " + dn(b.kp_silent_days) + " (порог правила «КП без ответа») · на сумму " + money(sum));
    }
    if (b.wait_pay && b.wait_pay.length) {
      var tot = 0;
      var rows = cap("wait_pay", b.wait_pay.map(function (x) {
        if (x.type === "kp") {
          var s = x.adv_sum || x.amount || 0; tot += s;
          return row(dot("warn"), E(x.number) + " · " + E(x.customer || ""), [x.status, x.object].filter(Boolean).map(E).join(" · "), "<b>" + money(s) + "</b>" + (x.adv_sum ? "аванс" : "сумма"), btn("Реестр", 'data-tdhash="#/kpreg/"'));
        }
        var a = x.adv_sum || 0; tot += a;
        return row(dot(x.days >= 5 ? "bad" : "warn"), "№" + E(x.number) + " · " + E(x.customer || ""), "Ожидает аванс " + dn(x.days) + (x.object ? " · " + E(x.object) : ""), a ? "<b>" + money(a) + "</b>аванс" : "", btn("Открыть", 'data-tdorder="' + x.id + '"'));
      }));
      h += panel("wait_pay", "Ждём оплату", b.wait_pay.length, rows, "", "Ждём денег: " + money(tot));
    }
    if (b.ready && b.ready.length) h += panel("ready", "Готово к проектированию", b.ready.length, cap("ready", b.ready.map(function (o) {
      return row(dot(o.executor_id ? "ok" : "warn"), "№" + E(o.number) + " · " + E(o.object || "") + (o.urgent ? tag("срочно", "bad") : ""),
        (o.executor ? E(o.executor) : "без исполнителя") + (o.due_date ? " · срок " + E(dm(o.due_date)) : ""), "", (o.executor_id ? "" : assignSel(o.id, d)) + btn("Открыть", 'data-tdorder="' + o.id + '"'));
    })));
    if (b.fix && b.fix.length) h += panel("fix", "Корректировки", b.fix.length, b.fix.map(function (o) {
      return row(dot("info"), "№" + E(o.number) + " · " + E(o.object || ""), [o.executor, o.due_date ? "срок " + dm(o.due_date) : ""].filter(Boolean).map(E).join(" · "), "<b>" + dn(o.days) + "</b>на стадии", btn("Открыть", 'data-tdorder="' + o.id + '"'));
    }).join(""));
    if (b.load && b.load.length) h += panel("load", "Загрузка проектировщиков", "", b.load.map(function (p) {
      var segs = p.items.map(function (x) {
        var c = x.left_days != null && x.left_days < 0 ? "bad" : x.stage === "Проверка" ? "org" : x.stage === "Готов к проектированию" ? "ok" : "info";
        return '<i class="' + c + '" title="№' + E(x.number) + " · " + E(x.stage) + '"></i>';
      }).join("");
      var info = p.items.length ? plural(p.items.length, ["проект", "проекта", "проектов"]) + (p.overdue ? ' · <b class="bad">просрочено ' + p.overdue + "</b>" : "") + (p.busy_till && left(p.busy_till) >= 0 ? " · занят до " + E(dm(p.busy_till)) : "") : "свободен";
      return '<div class="td-load"><div class="td-lh"><b>' + E(p.name) + '</b><span>' + info + '</span></div><div class="td-bar">' + (segs || '<i class="none"></i>') + "</div>"
        + (p.items.length ? '<div class="td-s">' + p.items.map(function (x) { return '<button class="td-lk" data-tdorder="' + x.id + '">№' + E(x.number) + "</button> " + E(x.stage === "Проверка" ? "на проверке" : x.stage === "Корректировка" ? "корректировка" : x.due_date ? "до " + dm(x.due_date) : x.stage); }).join(" · ") + "</div>" : "") + "</div>";
    }).join(""), "", '<span class="td-dot bad"></span> просрочено <span class="td-dot info"></span> в работе <span class="td-dot org"></span> на проверке <span class="td-dot ok"></span> готово к проектированию');
    return h;
  }

  function quickHtml(d) {
    var q = S.q, who = d.assignable || [];
    var chips = function (key, list) { return list.map(function (x) { return '<button class="td-chip' + (String(q[key]) === String(x[0]) ? " on" : "") + '" data-tdq="' + key + '" data-v="' + E(x[0]) + '">' + E(x[1]) + "</button>"; }).join(""); };
    var opts = '<div class="td-opts"><label>Срок</label><div class="td-chips">' + chips("due", [["today", "сегодня"], ["tomorrow", "завтра"]])
      + '<input type="date" data-tdqdate="1" value="' + E(q.date) + '"' + (q.due === "date" ? ' class="on"' : "") + '></div>'
      + '<label>Время</label><div class="td-chips"><input type="time" data-tdqtm="1" value="' + E(q.tm) + '"><span class="td-hint">по умолчанию — 9:00</span></div>'
      + (who.length ? '<label>Кому</label><div class="td-chips"><select data-tdqwho="1"><option value="0">Мне (напоминание)</option>' + who.filter(function (u) { return u.id !== me().id; }).map(function (u) { return '<option value="' + u.id + '"' + (+q.who === u.id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>" : "")
      + (+q.who ? "" : '<label>Повтор</label><div class="td-chips">' + chips("rep", REPS) + "</div>")
      + (window.DS && DS.newTask && who.length ? '<label></label><div><button class="td-link" data-tdfull="1">Полная форма задачи: проект, диалог, описание…</button></div>' : "")
      + "</div>";
    return '<div class="td-quick"><input data-tdinput="1" placeholder="Что нужно сделать? Например: «позвонить Спектру завтра 10:00' + (who.length ? " @Полина" : "") + '»" autocomplete="off">'
      + '<button class="td-gear' + (S.opts ? " on" : "") + '" data-tdopts="1" title="Срок, время, повтор, кому">⚙</button><button class="btn accent" data-tdadd="1">+ Добавить</button></div>'
      + '<div class="td-pv" data-tdpv="1"></div>' + (S.opts ? opts : "");
  }

  function paint() {
    if (!S.el) return;
    var d = S.d;
    if (!d) { S.el.innerHTML = '<div class="ds dspage td">' + (S.err ? '<div class="err">' + E(S.err) + '</div><button class="btn ghost" data-tdreload="1">Повторить</button>' : '<div class="loading">Загружаю…</div>') + "</div>"; return; }
    var inp = S.el.querySelector("[data-tdinput]"), keep = inp ? [inp.value, document.activeElement === inp] : null;
    var t0 = today0(), hot = hotRows(d), mine = minePanels(d), conf = confirmPanel(d), roles = roleBlocks(d);
    var nConf = (d.outbox || []).length || (d.review || []).length || ((d.blocks || {}).sales_leads || []).length;
    var kpi = function (n, label, cls, go) { return '<button class="td-kpi ' + (n ? cls : "") + '" data-tdgo="' + go + '"><b>' + n + "</b><span>" + label + "</span></button>"; };
    var html = '<div class="ds dspage td"><div class="head"><div><h1>Сегодня, ' + WD[t0.getDay()] + " " + t0.getDate() + " " + MON[t0.getMonth()] + "</h1><p>" + E(first(d.name)) + ", сначала то, что горит, потом подтверждения и задачи на сегодня.</p></div>"
      + '<div class="seg"><button data-tdreload="1">⟳ Обновить</button></div></div>'
      + (S.err ? '<div class="err">' + E(S.err) + "</div>" : "")
      + '<div class="td-kpis">' + kpi(hot.length, "горит", "bad", "hot") + kpi(nConf, d.outbox && d.outbox.length ? "ждут подтверждения" : "ждут вас", "org", "conf") + kpi(mine.today, "на сегодня", "", "today") + kpi(mine.week, "на неделе", "", "week") + "</div>"
      + quickHtml(d)
      + '<div class="td-cols' + (roles ? "" : " one") + '"><div>'
      + panel("hot", "🔥 Горит", hot.length, hot.length ? cap("hot", hot) : '<div class="td-empty">Ничего не горит 👍</div>', "td-hot")
      + conf + sentPanel(d) + mine.html + "</div>" + (roles ? "<div>" + roles + "</div>" : "") + "</div></div>";
    S.el.innerHTML = html;
    if (keep) { var ni = S.el.querySelector("[data-tdinput]"); if (ni) { ni.value = keep[0]; if (keep[1]) ni.focus(); preview(); } }
  }
  function preview() {
    var inp = S.el && S.el.querySelector("[data-tdinput]"), pv = S.el && S.el.querySelector("[data-tdpv]");
    if (!inp || !pv) return;
    var v = inp.value.trim();
    pv.textContent = v ? "→ " + previewText(parse(v)) : "";
  }

  /* ---------- действия ---------- */
  function busy(b, p) { if (b) b.disabled = true; return p.then(reload, function (e) { if (b) b.disabled = false; toast(String(e)); }); }
  document.addEventListener("click", function (e) {
    if (!S.el || !S.el.contains(e.target)) return;
    var t = e.target.closest("button"); if (!t) return;
    var d = t.dataset;
    if (d.tdlogin) { C.requireLogin().then(function () { T.mount(S.el); }); return; }
    if (d.tdreload) { reload(); return; }
    if (d.tdmore) { S.more[d.tdmore] = true; paint(); return; }
    if (d.tdfold) { var p = t.closest(".td-p"), sh = !p.classList.contains("shut"); p.classList.toggle("shut", sh); S.open[d.tdfold] = !sh; return; }
    if (d.tdgo) { var id = d.tdgo; S.open[id] = true; paint(); var el = S.el.querySelector('[data-tdfold="' + id + '"]'); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (d.tdopts) { S.opts = !S.opts; paint(); return; }
    if (d.tdadd) { add(); return; }
    if (d.tdq) { S.q[d.tdq] = d.v; if (d.tdq === "due") S.q.date = ""; paint(); return; }
    if (d.tdfull) { var v = (S.el.querySelector("[data-tdinput]") || {}).value || ""; DS.newTask({ title: v }); return; }
    if (d.tdorder) { location.hash = "#/task/" + d.tdorder; return; }
    if (d.tdchat) { location.hash = "#/chat?t=" + encodeURIComponent(d.tdchat); return; }
    if (d.tdhash) { location.hash = d.tdhash; return; }
    if (d.tdack) { busy(t, api("/tasks/" + d.tdack + "/ack", {}).then(function () { toast("Получение подтверждено"); })); return; }
    if (d.tddone) { busy(t, api("/tasks/" + d.tddone + "/done", {}).then(function () { toast("Готово"); })); return; }
    if (d.tdrem) { busy(t, C.call("/reminders/" + d.tdrem + "/done", { body: { done: true } }).then(function () { toast("Готово"); })); return; }
    if (d.tdsnooze) { busy(t, C.call("/reminders/" + d.tdsnooze + "/snooze", { body: { minutes: 60 } }).then(function () { toast("Напомню через час"); })); return; }
    if (d.tdremind) { t.disabled = true; api("/orders/" + d.tdremind + "/remind", { kind: d.kind }).then(function (x) { toast("Напомнили: " + (x.to || []).join(", ")); t.textContent = "✓ Напомнили"; }, function (er) { t.disabled = false; toast(String(er)); }); return; }
    if (d.tdlead) { busy(t, api("/tasks/" + d.tdlead + "/lead", { action: d.act }).then(function (r) { toast(d.act === "next" ? "Передано: " + (r.next || "дальше") : "Закрыто"); })); return; }
    if (d.tdstage) { busy(t, api("/orders/" + d.tdstage + "/stage", { stage: d.to }).then(function () { toast("Переведено: " + d.to); })); return; }
    if (d.tdtouch) { busy(t, api("/kp/" + d.tdtouch + "/touch", {}).then(function () { toast("Отметили контакт сегодня"); })); return; }
    if (d.tdedit) { S.edit[d.tdedit] = !S.edit[d.tdedit]; paint(); return; }
    if (d.tdnosend) { busy(t, api("/outbox/" + d.tdnosend, { action: "dismissed" }).then(function () { toast("Не отправляем"); })); return; }
    if (d.tdsend) {
      var n = (S.d.outbox || []).filter(function (x) { return String(x.id) === d.tdsend; })[0] || {};
      var ta = S.el.querySelector('[data-tdtext="' + d.tdsend + '"]'), txt = (ta ? ta.value : n.text || "").trim();
      if (!txt) return toast("Текст пустой");
      busy(t, C.call("/../threads/" + encodeURIComponent(d.tid) + "/send", { body: { text: txt } }).then(function () { return api("/outbox/" + d.tdsend, { action: "sent" }); })
        .then(function () { delete S.edit[d.tdsend]; toast("Отправлено заказчику"); }));
    }
  });
  document.addEventListener("change", function (e) {
    if (!S.el || !S.el.contains(e.target)) return;
    var t = e.target, d = t.dataset || {};
    if (d.tdassign && t.value) { t.disabled = true; api("/orders/" + d.tdassign + "/assign", { executor_id: +t.value }).then(function () { toast("Исполнитель назначен"); return reload(); }, function (er) { t.disabled = false; toast(String(er)); }); }
    if (d.tdqdate) { S.q.date = t.value; S.q.due = t.value ? "date" : "today"; paint(); }
    if (d.tdqtm) { S.q.tm = t.value; preview(); }
    if (d.tdqwho) { S.q.who = +t.value; if (S.q.who) S.q.rep = ""; paint(); }
  });
  document.addEventListener("input", function (e) { if (S.el && e.target.dataset && e.target.dataset.tdinput) preview(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && S.el && e.target.dataset && e.target.dataset.tdinput) { e.preventDefault(); add(); } });

  /* обновлять раз в две минуты, пока экран открыт и вкладка видна; после выхода — забыть данные */
  setInterval(function () { if (visible() && !document.hidden && C && C.loggedIn() && !S.loading && !(document.activeElement && S.el.contains(document.activeElement))) reload(); }, 120000);
  if (C && C.on) C.on("logout", function () { S.d = null; S.edit = {}; S.at = 0; S.uid = null; });
  /* вход (/me) мог завершиться, пока грузились скрипты, — тогда ds.js не услышал «login»/«ready»: меню и экран — заново */
  if (C && C.me && !window.DS_READY && typeof window.globalRouter === "function") { window.DS_READY = true; window.globalRouter(); }
  else if (typeof window.sectionForHash === "function" && window.sectionForHash(location.hash) === "today") T.mount(document.getElementById("today-app"));
})();
