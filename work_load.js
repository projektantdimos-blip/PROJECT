/* «Работа → Занятость» по макету «Мини-CRM» (Ч2): одна лента по сотрудникам — слева что делали, справа план.
   Сверху «Ждут распределения»: перетаскивание чипа на строку сотрудника = назначение, перетаскивание полосы = другой исполнитель
   или другие даты, края полосы тянутся = даты плана. После броска — «Отменить» (изменение уходит на сервер через 15 с).
   На телефоне перетаскивания нет: нажатие на чип или полосу открывает «Назначить сроки».
   Маршруты прежние: /orders/{id}/plan (задача и корректировка), /orders/{id}/rounds/{rid}/edit (раздел-подзадача).
   Данные и права режет сервер. Включается при DS_WORK (index.html); при DS_WORK = false — прежний экран loadScreen() из ds.js. */
(function () {
  "use strict";
  var MOVERS = { owner: 1, design: 1 };          // кто двигает: руководитель и руководитель проектного отдела (ROLES.notes макета); опер. менеджер — уточнить у владельца
  var UNDO_MS = 15000;     // сколько ждать «Отменить» перед отправкой на сервер — одна константа (решение владельца 15.11: 15 с)
  var READY = "Готов к проектированию", ACTIVE = ["В проектировании", "Проверка", "Корректировка"], PAUSE_ST = "Пауза";
  var PART_ST = ["Готов к проектированию", "В проектировании", "Проверка", "Корректировка"];
  var MONG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var MONN = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

  function X() { return DS.ldCtx(); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function today() { return iso(new Date()); }
  function addD(s, k) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + k); return iso(d); }
  function isWd(s) { var w = new Date(s + "T12:00:00").getDay(); return w !== 0 && w !== 6; }
  function wdOn(s) { var x = s; while (!isWd(x)) x = addD(x, 1); return x; }                       // ближайший рабочий день (сам день, если рабочий)
  function wdAdd(s, n) { var x = wdOn(s), c = 1; while (c < n) { x = addD(x, 1); if (isWd(x)) c++; } return x; }      // n-й рабочий день, считая s
  function wdNext(s) { var x = addD(s, 1); while (!isWd(x)) x = addD(x, 1); return x; }
  function wdBetween(a, b) { var c = 0, x = a; while (x <= b) { if (isWd(x)) c++; x = addD(x, 1); } return c; }
  function mon(s) { return addD(s, -((new Date(s + "T12:00:00").getDay() + 6) % 7)); }
  function dm(s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—"; }
  function calLeft(s) { return Math.round((new Date(s + "T12:00:00") - new Date(today() + "T12:00:00")) / 864e5); }
  function phone() { return innerWidth < 760 || !!(window.matchMedia && matchMedia("(hover: none) and (pointer: coarse)").matches); }
  function canMove() { return !!MOVERS[X().pos()]; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function st() {
    var S = X().S;
    if (!S.wl) S.wl = { pend: null, rs: null, edit: null, scroll: null, full: false, offv: null, days: null, daysKey: "", daysLoading: "" };
    return S.wl;
  }

  /* ---------- модель: задачи, разделы и корректировки → элементы ленты ---------- */
  function items() {
    var x = X(), S = x.S, base = x.pos() === "designer" ? (S.lo || []) : (S.orders || []), out = [], w = st();
    base.forEach(function (o) {
      var due = o.due_date || "";
      var paused = o.stage === PAUSE_ST;
      if (o.stage === READY || ACTIVE.indexOf(o.stage) >= 0 || paused) {
        var fx = !paused && o.stage === "Корректировка" && !!o.fix_start, sp = x.span(o);
        out.push({ key: "o" + o.id, kind: fx ? "fix" : "main", oid: o.id, number: o.number, object: (o.object || "").split(",")[0], sys: x.sysText(o), stage: o.stage,
          ex: o.executor_id || 0, exName: o.executor || "", s: o.stage === READY && !o.plan_start ? "" : sp[0], e: o.stage === READY && !o.plan_end ? "" : sp[1],
          due: fx ? "" : due, cdue: due, left: o.left_days, urgent: !!o.urgent, ready: !paused && o.stage === READY, fixN: o.fix_n || 0, o: o,
          paused: paused, pauseDay: paused && o.pause_at ? Math.max(1, Math.round((Date.now() - o.pause_at * 1000) / 864e5)) : 0,
          shifted: fx ? !!o.fix_shifted : !!o.plan_shifted, move: fx ? o.fix_move : o.plan_move, startedMan: o.started_man || "" });
      }
      if (!paused && PART_ST.indexOf(o.stage) >= 0) (o.parts || []).forEach(function (p) {
        if (p.delivered) return;
        out.push({ key: "p" + p.id, kind: "part", oid: o.id, rid: p.id, number: o.number, object: "раздел " + p.system + " · " + (o.object || "").split(",")[0], sys: p.system, stage: o.stage,
          ex: p.executor_id || 0, exName: p.executor || "", s: p.plan_start || "", e: p.plan_end || "", due: due, cdue: due, left: o.left_days, urgent: !!o.urgent, ready: false, fixN: 0, o: o, part: p,
          paused: false, pauseDay: 0, shifted: !!p.plan_shifted, move: p.plan_move, startedMan: p.started_man || "" });
      });
    });
    out.forEach(function (it) {                                           // ещё не сохранённое (бросок, растягивание) — поверх данных сервера
      var p = w.rs && w.rs.key === it.key ? w.rs : w.pend && w.pend.key === it.key ? w.pend : null;
      if (p) { it.ex = p.ex; it.exName = p.exName; it.s = p.s; it.e = p.e; it.pending = true; if (p.start) it.ready = false; }
    });
    return out;
  }
  function find(key) { return items().filter(function (i) { return i.key === key; })[0]; }
  function realStaff(u) {
    var name = u.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("ru");
    return name !== "тест р. про. от" && name !== "тест проектировщик";
  }
  function people() { return X().staff().filter(realStaff); }
  function mine(u, list) { return list.filter(function (i) { return i.ex && (i.ex === u.id || i.exName === u.name) && i.s && i.e; }); }
  function freeFrom(u, list) { var m = ""; mine(u, list).forEach(function (i) { if (i.e > m) m = i.e; }); return m && m >= today() ? wdNext(m) : wdOn(today()); }      // в выходной — с ближайшего рабочего дня
  function label(i) { return (i.kind === "fix" ? "↻ " : "") + "№" + i.number + (i.kind === "fix" && i.fixN ? " К" + i.fixN : ""); }
  function dow(s) { return ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(s + "T12:00:00").getDay()]; }
  function daysInfo() { var d = st().days; return d && d.off ? d : { off: {}, vac: [] }; }
  function offKind(u, d) {                                          // выходной (ds_week) или отпуск (ds_vacations) сотрудника в день
    var di = daysInfo();
    if (u.id && (di.off[u.id] || {})[d]) return "off";
    for (var i = 0; i < di.vac.length; i++) { var v = di.vac[i]; if (v.user_id === u.id && v.start <= d && d <= v.end) return "vac"; }
    return "";
  }
  function ensureDays(days) {                                       // выходные/отпуска за окно ленты — один запрос на окно
    var w = st(), key = days[0] + "_" + days[days.length - 1];
    if ((w.daysKey === key && w.days) || w.daysLoading === key) return;
    w.daysLoading = key;
    X().api("/load/days?from=" + days[0] + "&to=" + days[days.length - 1]).then(function (r) {
      if (st().daysLoading === key) { st().days = r; st().daysKey = key; st().daysLoading = ""; rerender(); }
    }, function () { if (st().daysLoading === key) st().daysLoading = ""; });
  }
  function notStarted(i, u) {                                       // «не взято в работу в день старта»: план начался, а «Начато» не нажато
    if (i.hist || i.paused || i.ready || !i.s || i.s > today() || i.startedMan) return false;
    if ((!i.ex || i.ex !== u.id) && (!i.exName || i.exName !== u.name)) return false;
    if (!isWd(i.s) || offKind(u, i.s)) return false;                              // выходной/отпуск в день старта — не нарушение
    return true;
  }
  function offRanges(u, days) {                                     // «Выходной 27.11», «Выходные 28.11–29.11», «Отпуск …» для строки сотрудника
    var marks = {};
    days.forEach(function (d) { var k = offKind(u, d); if (k) marks[d] = k; });
    var out = [], cur = null;
    days.forEach(function (d) {
      var k = marks[d];
      if (k && cur && cur.kind === k && addD(cur.to, 1) === d) { cur.to = d; return; }
      if (cur) out.push(cur);
      cur = k ? { kind: k, from: d, to: d } : null;
    });
    if (cur) out.push(cur);
    return out.map(function (r) {
      var one = r.from === r.to, nm = r.kind === "vac" ? "Отпуск" : (one ? "Выходной" : "Выходные");
      return nm + " " + dm(r.from) + (one ? "" : "–" + dm(r.to));
    });
  }
  function hint(i, s, e) {                                              // «успевает к …» / «позже срока …» — по сроку договора (у корректировки срока договора нет)
    if (!i.due) return dm(s) + " – " + dm(e);
    return dm(s) + " – " + dm(e) + (e > i.due ? " · позже срока " + dm(i.due) + " на " + Math.max(1, wdBetween(addD(i.due, 1), e)) + " р.д." : " · успевает к " + dm(i.due));
  }
  /* длина при броске: прежняя длина плана в рабочих днях; плана не было — до срока договора (оценки трудоёмкости в CRM нет) */
  function placed(i, s) {
    if (i.s && i.e) return wdAdd(s, Math.max(1, wdBetween(i.s, i.e)));
    return i.due && i.due >= s ? i.due : s;
  }

  /* ---------- календарная сетка: выходные видны, планирование идёт по рабочим дням ---------- */
  function win() {
    var td = today(), month = st().month || td.slice(0, 7);
    var first = addD(mon(td), -14), chosen = mon(month + "-01");
    var last = iso(new Date(+td.slice(0, 4), +td.slice(5, 7) + 2, 0, 12));
    // За пределами основной ленты открываем выбранный месяц, не загружая все месяцы истории сразу.
    if (month < first.slice(0, 7) || month > last.slice(0, 7)) {
      first = chosen;
      last = iso(new Date(+month.slice(0, 4), +month.slice(5, 7), 0, 12));
    }
    var days = [];
    for (var d = first; d <= last; d = addD(d, 1)) days.push(d);
    return days;
  }
  function wkName(w) { var k = Math.round((new Date(w + "T12:00:00") - new Date(mon(today()) + "T12:00:00")) / 864e5 / 7); return k === 0 ? "эта неделя" : k === -1 ? "прошлая" : k === 1 ? "следующая" : k < 0 ? (-k) + " нед. назад" : "через " + k + " нед."; }
  function wkLbl(w, e) { return +w.slice(8) + " " + MONG[+w.slice(5, 7) - 1] + " – " + +e.slice(8) + " " + MONG[+e.slice(5, 7) - 1]; }
  function geom() { return { nw: phone() ? 130 : 230, cw: 34, rh: 50 }; }

  function miniCalendar(month, td) {
    var first = month + "-01", start = mon(first);
    var next = new Date(first + "T12:00:00"), prev = new Date(next);
    prev.setMonth(prev.getMonth() - 1); next.setMonth(next.getMonth() + 1);
    var last = addD(iso(next), -1), end = addD(mon(last), 6), cells = [];
    var week = mon(td), sunday = addD(week, 6);
    for (var d = start; d <= end; d = addD(d, 1)) {
      var cls = (d.slice(0, 7) !== month ? " other" : "") + (d >= week && d <= sunday ? " shown" : "") + (d === td ? " today" : "");
      cells.push('<button type="button" data-wlday="' + d + '" class="wl-miniday' + cls + '" aria-label="' + dm(d) + '"' + (d === td ? ' aria-current="date"' : "") + ">" + Number(d.slice(8)) + "</button>");
    }
    return '<div class="wl-mini-wrap"><div class="wl-mini"><div class="wl-mini-nav">'
      + '<button type="button" data-wlmonthpick="' + iso(prev).slice(0, 7) + '" aria-label="Предыдущий месяц">‹</button>'
      + '<b>' + MONN[+month.slice(5, 7) - 1] + " " + month.slice(0, 4) + '</b>'
      + '<button type="button" data-wlmonthpick="' + iso(next).slice(0, 7) + '" aria-label="Следующий месяц">›</button></div>'
      + '<div class="wl-mini-days">' + ["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(function (label) { return "<span>" + label + "</span>"; }).join("")
      + cells.join("") + "</div></div></div>";
  }

  /* ---------- экран ---------- */
  var cardDetails = [];
  function cardInfo(i, state, employee, latest) {
    var historical = { work: "проектирование", fix: "корректировка" + (i.fixN ? " К" + i.fixN : ""), review: "проверка" };
    var statuses = { work: i.stage, plan: "Запланировано", fix: "Корректировка", ps: "Пауза · ждём заказчика", done: "Сделано · " + historical[i.hist] };
    var rows = [["Исполнитель", employee || "Не назначен"], ["Даты работы", i.s || i.e ? dm(i.s) + " — " + dm(i.e) : "Не назначены"]];
    if (i.cdue) rows.push(["Срок договора", dm(i.cdue)]);
    rows.push(["Статус", (i.pending ? "Ожидает сохранения · " : "") + (latest || statuses[state] || i.stage)]);
    if (i.shifted) {
      var move = i.move || {}, from = move.before || move.baseline;
      rows.push(["Перенос плана", [move.at && dm(move.at), move.by].filter(Boolean).join(" · ") || "Сдвинут после утверждения"]);
      if (from) rows.push([move.before ? "Было" : "Утверждённый план", dm(from[0]) + " — " + dm(from[1])]);
      if (move.after) rows.push([move.before ? "Стало" : "Текущий план", dm(move.after[0]) + " — " + dm(move.after[1])]);
    }
    var badges = "";
    if (i.shifted) {
      var mv = i.move || {}, from = mv.before || mv.baseline, f0 = from && from[0] ? dm(from[0]) : "—", a0 = mv.after && mv.after[0] ? dm(mv.after[0]) : "—";
      badges += '<div class="wl-popbd shf"><b>Сдвинут' + (mv.at ? " " + dm(mv.at) + " (" + ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(mv.at + "T12:00:00").getDay()] + ")" : "") + (mv.by ? ", " + E(mv.by) : "") + '</b>'
        + (from || mv.after ? '<small>старт был ' + f0 + ', стал ' + a0 + "</small>" : "") + "</div>";
    }
    var lateN = !i.hist && i.due && i.e && i.e > i.due ? wdBetween(addD(i.due, 1), i.e) : 0;
    if (lateN > 0) badges += '<div class="wl-popbd late"><b>Опоздание: ' + lateN + " " + (lateN % 10 === 1 && lateN % 100 !== 11 ? "день" : lateN % 10 >= 2 && lateN % 10 <= 4 && (lateN % 100 < 10 || lateN % 100 >= 20) ? "дня" : "дней") + " после срока</b></div>";
    var markup = '<header><b>' + E(label(i)) + '</b>' + (i.urgent ? '<span>Срочно</span>' : "") + '</header>'
      + (i.object ? '<div class="wl-card-object">' + E(i.object) + '</div>' : "")
      + '<dl>' + rows.map(function (r) { return "<dt>" + E(r[0]) + "</dt><dd>" + E(r[1]) + "</dd>"; }).join("") + "</dl>" + badges;
    return cardDetails.push({ state: state, markup: markup }) - 1;
  }
  function infoButton() {
    return '<button type="button" class="wl-info" data-wlinfo aria-label="Подробности задачи" aria-expanded="false">ⓘ</button>';
  }
  function html() { return '<div class="wl-root">' + inner() + "</div>"; }
  function inner() {
    closeCard();
    cardDetails = [];
    var x = X(), S = x.S, w = st(), p = x.pos(), ph = phone(), mv = canMove() && !ph;
    wasPhone = ph;                                                        // режим, в котором отрисовано (для перерисовки при смене ширины)
    var days = win(), N = days.length, td = today(), G = geom();
    var cols = G.nw + "px repeat(" + N + ",minmax(" + G.cw + "px,1fr))", minw = G.nw + N * G.cw;
    function idx(d, end) { return idxOf(days, d, end); }
    var all = items(), ppl = people();
    ensureDays(days);
    var td0 = td, wk0 = mon(td), wk1 = addD(wk0, 6), month = w.month || td.slice(0, 7);
    var tray = all.filter(function (i) { return !i.ex || !i.s || !i.e; }).sort(function (a, b) { return (a.cdue || "9") < (b.cdue || "9") ? -1 : 1; });
    var uOID = {};
    var cntProj = all.filter(function (i) { return i.kind === "main" && !i.ready && !i.paused && i.s && !uOID[i.oid] && (uOID[i.oid] = 1); }).length;
    var cntFix = all.filter(function (i) { return i.kind === "fix" && !uOID["f" + i.oid] && (uOID["f" + i.oid] = 1); }).length;
    var cntPlan = all.filter(function (i) { return !i.paused && (i.ready || (i.s && i.s > td0)); }).length;
    var cntPause = all.filter(function (i) { return i.paused && !uOID["p" + i.oid] && (uOID["p" + i.oid] = 1); }).length;
    var cntNs = all.filter(function (i) { return ppl.some(function (u) { return notStarted(i, u); }); }).length;
    var cntItems = [["Проекты в работе", cntProj, "work"], ["Корректировки в работе", cntFix, "fix"], ["Запланировано", cntPlan, "plan"],
      ["На паузе (ждём заказчика)", cntPause, "pause"], ["Не взяты в работу в день старта", cntNs, "late"]];
    var cntHtml = '<div class="wl-cnt">' + cntItems.map(function (x) {
      return '<div class="wl-ci"><span class="wl-cin ' + x[2] + '">' + x[1] + '</span><span class="wl-cit">' + x[0] + "</span></div>";
    }).join("") + "</div>";
    var weeks = days.filter(function (_, i) { return i % 7 === 0; });
    var mh = '<div class="wl-h" style="grid-template-columns:' + cols + ";min-width:" + minw + 'px">'
      + miniCalendar(month, td)
      + weeks.map(function (wk, i) {
        var at = i * 7, span = Math.min(7, N - at);
        return '<div class="wl-w' + (wk === wk0 ? " cur" : "") + '" style="grid-column:' + (at + 2) + '/span ' + span + '"><b>' + wkLbl(wk, days[at + span - 1]) + "</b><small>" + wkName(wk) + "</small></div>";
      }).join("")
      + days.map(function (d, i) {
        return '<div class="wl-day' + (d === td ? " td" : "") + (d === (w.focus || td) ? " tn" : "") + (i % 7 === 0 ? " ws" : "") + (!isWd(d) ? " weekend" : "")
          + '" style="grid-column:' + (i + 2) + '"><b>' + Number(d.slice(8)) + "</b><small>" + dow(d) + "</small></div>";
      }).join("") + "</div>";
    var rows = ppl.map(function (u) {
      var my = mine(u, all), hist = (S.lh || []).filter(function (h) { return h.user_id === u.id || h.who === u.name; }).filter(function (h) {
        return !my.some(function (i) { return i.oid === h.order_id && i.kind !== "part" && h.end >= i.s; });      // не дублируем текущий план той же задачи
      }).map(function (h) { return { hist: h.kind, key: "h", oid: h.order_id, number: h.number, object: h.object || "", s: h.start, e: h.end, fixN: h.fix_n }; });
      var list = hist.concat(my).filter(function (i) { var e = effEnd(i); return e >= days[0] && i.s <= days[N - 1]; }).sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
      var ends = [], segs = "";
      var absences = days.map(function (d) { return offKind(u, d); });
      list.forEach(function (i) {
        var e = effEnd(i), a = idx(i.s, false), b = idx(e, true); if (b < a) a = b = Math.max(0, b);      // целиком в выходные — на пятницу перед ними
        var l = 0; while (l < ends.length && ends[l] >= a) l++; ends[l] = b;
        var stt = i.paused ? "ps" : i.hist ? "done" : i.kind === "fix" ? "fix" : i.ready || i.s > td ? "plan" : "work";
        var ns = notStarted(i, u);
        var late = !i.hist && !i.paused && i.due && e > i.due && wdBetween(addD(i.due, 1), e) > 0, dI = i.due ? idx(i.due, true) : -1, me = late && dI >= a && dI < b ? dI : b;
        var lead = i.hist ? null : Math.min(i.e ? calLeft(i.e) : 99, i.left != null ? i.left : 99), hot = lead != null && lead >= 0 && lead <= 2, past = !i.hist && i.e && i.e < td;
        var l2, ttl = "№" + i.number;
        if (!i.hist) {
          l2 = i.paused ? '<em class="wl-pause">⏸ ждём заказчика' + (i.pauseDay ? " · " + i.pauseDay + "-й день" : "") + "</em>"
            : ns ? '<em class="wl-ns">не взято в работу</em>'
            : stt === "plan" ? '<em class="wl-ready">Запланировано</em>' : past ? '<em class="wl-bad">план до ' + dm(i.e) + " прошёл</em>"
            : (i.shifted ? "Сдвинут · " : "") + (hot ? '<em class="wl-hot">≤ 2 дн.</em> · ' : "") + E(i.kind === "part" ? "раздел " + i.sys : i.sys || i.stage) + (i.due ? " · срок " + dm(i.due) : i.kind === "fix" ? " · до " + dm(i.e) : "");
        }
        var card = cardInfo(i, stt, u.name, ns ? "Не взято в работу в день старта" : "");
        var DOWS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
        var mv = i.move || {}, mfrom = mv.before || mv.baseline;
        var shfTip = i.shifted ? "Сдвинут" + (mv.at ? " " + dm(mv.at) + " (" + DOWS[new Date(mv.at + "T12:00:00").getDay()] + ")" : "") + (mv.by ? ", " + mv.by : "")
          + (mfrom || mv.after ? " — старт был " + (mfrom && mfrom[0] ? dm(mfrom[0]) : "—") + ", стал " + (mv.after && mv.after[0] ? dm(mv.after[0]) : "—") : "") : "";
        var planOver = !i.hist && !i.paused && i.e && i.e < td;                 // красная плашка — только нарушение срока по плану
        var nsTip = planOver ? "Нарушение срока по плану: план до " + dm(i.e) + " прошёл, работа не сдана" : "";
        var drag = mv && !i.hist && !i.paused ? ' draggable="true" data-wld="' + i.key + '"' : "";
        var open = i.hist ? openAttr(i.oid) : ph && canMove() ? 'data-wledit="' + i.key + '"' : openAttr(i.oid);
        var startBtn = ns ? '<button type="button" class="wl-start" data-wlstart="' + i.oid + ":" + (i.rid || 0) + '" title="Взять в работу — снять красную метку">✓ Начато</button>' : "";
        segs += '<div class="wlb ' + stt + (hot ? " hot" : "") + (late && me === b ? " late" : "") + (i.pending ? " pend" : "") + (i.urgent && !i.hist ? " urg" : "") + (i.shifted ? " shf" : "") + (planOver ? " ns" : "") + '"' + drag + " " + open
          + ' style="grid-column:' + (a + 2) + "/" + (me + 3) + ";grid-row:" + (l + 1) + '" data-wlcard="' + card + '"><b><span class="wlb-num">' + E(ttl) + '</span>' + (i.hist ? "" : '<span class="wlb-object">' + E(i.object) + '</span>') + "</b>" + (i.hist ? "" : "<small>" + l2 + "</small>")
          + (i.shifted ? '<span class="wl-bd shf" data-wlinfo="1" data-wltip="' + E(shfTip) + '"></span>' : "")
          + (planOver ? '<span class="wl-bd ns" data-wlinfo="1" data-wltip="' + E(nsTip) + '"></span>' : "")
          + infoButton() + startBtn + "</div>";
        var lateDays = me < b ? wdBetween(addD(i.due, 1), e) : 0;
        if (me < b) segs += '<div class="wlb over" style="grid-column:' + (me + 3) + "/" + (b + 3) + ";grid-row:" + (l + 1) + '" title="Работа после срока договора: ' + lateDays + ' р.д."><b>+' + lateDays + (lateDays > 1 ? " р.д.</b><small>после срока</small>" : "</b>") + "</div>";
        if (mv && !i.hist && i.s >= td && i.s >= days[0]) segs += '<span class="wl-hd l" data-wlrs="' + i.key + ':l" style="grid-column:' + (a + 2) + ";grid-row:" + (l + 1) + '" title="Тяните — сдвинуть начало"></span>';
        if (mv && !i.hist && e >= td && e <= days[N - 1]) segs += '<span class="wl-hd r" data-wlrs="' + i.key + ':r" style="grid-column:' + (b + 2) + ";grid-row:" + (l + 1) + '" title="Тяните — сдвинуть окончание"></span>';
        if (!i.hist) {
          for (var col = a; col <= b; col++) {
            if (absences[col]) segs += '<span class="wl-overlap ' + absences[col] + '" aria-hidden="true" style="grid-column:' + (col + 2) + ";grid-row:" + (l + 1) + '"></span>';
          }
        }
      });
      var lanes = Math.max(1, ends.length), act = mine(u, all), lt = act.filter(function (i) { return (i.due && effEnd(i) > i.due) || (i.left != null && i.left < 0 && i.kind !== "fix"); }).length, fr = freeFrom(u, all);
      var bg = days.map(function (d, i) {
        var offk = absences[i];
        return '<span class="wl-c' + (d === td ? " td" : "") + (i % 7 === 0 ? " ws" : "") + (!isWd(d) ? " weekend" : "") + (offk ? " " + offk : "")
          + '" style="grid-column:' + (i + 2) + ";grid-row:1/span " + lanes + '">' + (offk ? '<small>' + (offk === "vac" ? "отпуск" : "выходной") + '</small>' : "") + '</span>';
      }).join("");
      var role = {design: "Руководитель отдела", designer: "Проектировщик", ops: "Операционный менеджер", owner: "Руководитель", norm: "Нормоконтроль"}[u.pos] || "";
      var weekly = act.filter(function (i) { return i.s <= wk1 && effEnd(i) >= wk0; }).length;
      var absence = offRanges(u, days);
      return '<div class="wl-r" data-wlrow="' + (u.id || "") + '" data-wlname="' + E(u.name) + '" style="grid-template-columns:' + cols + ";grid-template-rows:repeat(" + lanes + ",minmax(" + G.rh + "px,auto));min-width:" + minw + 'px">'
        + '<div class="wl-nm" style="grid-row:1/span ' + lanes + '"><div class="wl-person">' + x.ava(u.name, "sm") + "<div><b>" + E(u.name) + "</b>"
        + (role ? "<small>" + role + "</small>" : "") + '</div></div><div class="wl-person-status"><span class="wl-status free">'
        + (fr > td ? "Свободен с <b>" + dm(fr) + "</b> (" + dow(fr) + ")" : "Свободен сейчас") + '</span><span class="wl-status week">В работе на этой неделе <b>' + weekly + "</b></span>"
        + (lt ? '<span class="wl-status overdue">' + lt + ' не успевает</span>' : "")
        + absence.map(function (text) { return '<span class="wl-status absence">' + E(text) + "</span>"; }).join("")
        + "</div></div>" + bg + segs + "</div>"
        + (function () {
          var seen = {}, load = days.map(function (d, col) {
            if (!isWd(d) || absences[col]) return 0;
            var n = 0;
            list.forEach(function (i) {
              if (i.hist) return;
              var k = i.kind === "fix" ? "f" + i.oid : "m" + i.oid;             // разделы вместе с проектом — одна единица; корректировка отдельно
              if (!seen[d + k] && i.s <= d && effEnd(i) >= d) { seen[d + k] = 1; n++; }
            });
            return n;
          });
          return '<div class="wl-ld" style="grid-template-columns:' + cols + ";min-width:" + minw + 'px"><div class="wl-ld-l" title="Нагрузка по дням: сколько задач в плане на день">нагрузка</div>' + load.map(function (n) { return '<span class="wl-ld-c l' + Math.min(3, n) + '" title="' + n + '"></span>'; }).join("") + "</div>";
        })();
    }).join("");
    // «Ждут распределения» — tray посчитан выше (для счётчиков)
    var best = function (i) { var b = null; ppl.forEach(function (u) { if (!u.id) return; var f = freeFrom(u, all); if (!b || f < b[1]) b = [u.name, f]; }); return b; };
    var trayHtml = '<div class="panel wl-tray' + (tray.length ? " waiting" : " clear") + '"><b>Ждут распределения · ' + tray.length + "</b>" + (tray.length && mv ? '<span class="wl-trh">тяните на строку сотрудника →</span>' : "")
      + tray.map(function (i) {
        var b = best(i), sub = (i.kind === "part" ? "раздел " + i.sys + " · " : "") + (i.ex ? E(i.exName) + ", без дат" : i.cdue ? "до " + dm(i.cdue) : "без срока");
        var card = cardInfo(i, i.kind === "fix" ? "fix" : "plan", i.exName, "Ждёт распределения" + (b ? " · " + b[0] + " свободен с " + dm(b[1]) : ""));
        var act2 = mv ? ' draggable="true" data-wld="' + i.key + '" data-wledit="' + i.key + '"' : canMove() ? ' data-wledit="' + i.key + '"' : " " + openAttr(i.oid);
        return '<div class="wl-chip' + (i.kind === "fix" ? " fix" : i.kind === "part" ? " part" : "") + (i.urgent ? " urg" : "") + '"' + act2 + ' data-wlcard="' + card + '">' + (mv ? '<span class="wl-grip">⋮⋮</span>' : "") + "<b>" + E(label(i)) + "</b><small>" + sub + "</small>" + infoButton() + "</div>";
      }).join("") + (tray.length ? "" : '<span class="wl-empty">всё распределено ✓</span>') + "</div>";
    var opts = !ph || p === "owner" || p === "ops" || p === "design" ? '<details class="wl-options"' + (w.options ? " open" : "") + '><summary>Настройки</summary><div>'
      + (p === "owner" || p === "design" ? '<button class="btn ghost sm" data-wloffv="1">' + (w.offv && w.offv.open ? "Скрыть выходные" : "Выходные по неделям") + "</button>" : "")
      + (ph ? "" : '<button class="btn ghost sm" data-wlfull="1">' + (w.full ? "⤡ Свернуть" : "⤢ Во весь экран") + "</button>")
      + (p === "owner" || p === "ops" || p === "design" ? '<span class="ldwho wl-who"><button class="btn ghost sm" data-ldmenu="1">👥 Кого показывать (' + ppl.length + ")</button>"
        + (S.ldMenu ? '<span class="ldpop"><b>Показывать в «Занятости»</b>' + x.staffAll().filter(realStaff).map(function (u) { var on = ppl.some(function (y) { return y.name === u.name; }); return '<button type="button" class="ldchk ' + (on ? "on" : "") + '" data-ldp="' + E(u.name) + '"><i>' + (on ? "✓" : "") + "</i>" + E(u.name) + "</button>"; }).join("") + '<button class="btn ghost sm" data-ldmenu="0" style="margin-top:8px">Готово</button></span>' : "") + "</span>" : "")
      + "</div></details>" : "";
    var leg = '<div class="wl-leg"><span><i class="wl-dot" style="background:#c3cad6"></i>сделано (по истории задачи)</span><span><i class="wl-dot" style="background:#3b7ddd"></i>в работе</span><span><i class="wl-dot wl-plan-dot"></i>запланировано</span><span><i class="wl-dot" style="background:#e0873a"></i>корректировка</span><span><i class="wl-dot ov"></i>после срока договора</span><span><i class="wl-dot hot"></i>≤ 2 дн. до срока</span><span><i class="wl-dot ps"></i>пауза (ждём заказчика)</span><span><i class="wl-corner shf"></i>сдвинут после утверждения плана</span><span><i class="wl-corner ns"></i>не взято в работу в день старта</span><span class="wl-ld-leg"><i class="wl-ld-c l1"></i><i class="wl-ld-c l2"></i><i class="wl-ld-c l3"></i>нагрузка: 1 / 2 / 3+</span>'
      + '<span><i class="wl-dot urg"></i>срочная задача</span><span><i class="wl-overlap-key"></i>работа в отпуск или выходной сотрудника</span>'
      + (mv ? "<span>⋮⋮ перетащить задачу на сотрудника · ⟷ тяните за край полосы — меняются даты · в прошлое нельзя</span>" : canMove() ? "<span>нажмите на задачу — «Назначить сроки»</span>" : "<span>только просмотр: исполнителя и сроки назначают руководитель и руководитель проектного отдела</span>") + "</div>";
    var nodata = !ppl.length ? '<div class="note" style="padding:16px;margin:0">Сотрудников с задачами в работе нет</div>' : "";
    return '<div class="head"><div><h1>Занятость</h1></div></div>' + offHtml() + cntHtml + trayHtml
      + '<div class="panel wl-ll" id="wlLL">' + mh + rows + nodata + "</div>" + leg + opts + editHtml();
  }
  function idxOf(days, d, end) {
    var N = days.length, i = days.indexOf(d); if (i >= 0) return i;
    if (d < days[0]) return end ? -1 : 0;
    if (d > days[N - 1]) return end ? N - 1 : N;
    var x = d; while (days.indexOf(x) < 0) x = addD(x, end ? -1 : 1);
    return days.indexOf(x);
  }
  function effEnd(i) { if (i.hist) return i.e; var td = today(); return i.e && i.e < td && !i.ready ? td : i.e; }      // срок плана прошёл, а работа не сдана — занят до сегодня
  function openAttr(oid) { var x = X(); return x.pos() !== "designer" || x.find(oid) ? 'data-open="' + oid + '"' : ""; }
  /* ---------- «Выходные по неделям» (заявка п.10): свод по проектировщикам для руководителя и руководителя проектного отдела.
     Данные — готовый /week/summary (owner/design): отработано, выходные, комментарии; «не отмечался» — ни одной записи за неделю. ---------- */
  function offLoad() {
    var w = st(), o = w.offv; if (!o) return;
    o.loading = true;
    X().api("/week/summary?start=" + o.start).then(function (r) {
      o.loading = false;
      if (w.offv === o) { o.rows = r || []; rerender(); }
    }, function (e) {
      o.loading = false;
      if (w.offv === o) { o.rows = []; X().toast("Выходные: " + String(e && e.message || e)); rerender(); }
    });
  }
  function offHtml() {
    var w = st(), o = w.offv;
    if (!o || !o.open) return "";
    var head = '<div class="wl-offv-h"><div class="seg"><button data-wloffnav="-1" title="Предыдущая неделя">←</button><button data-wloffnav="0"' + (o.start === mon(today()) ? ' class="on"' : "") + '>Текущая</button><button data-wloffnav="1" title="Следующая неделя">→</button></div>'
      + "<b>Выходные по неделям · " + dm(o.start) + " – " + dm(addD(o.start, 6)) + '</b><span class="wl-grow"></span>'
      + '<span style="color:var(--muted);font-size:.78rem">отметки «отработал / выходной» из личного плана недели проектировщиков</span></div>';
    if (!o.rows) return '<div class="panel wl-offv">' + head + '<div class="note">Загрузка…</div></div>';
    if (!o.rows.length) return '<div class="panel wl-offv">' + head + '<div class="note">Сотрудников нет</div></div>';
    var rows = o.rows.map(function (r) {
      var empty = !r.worked && !r.off && !r.comments.length;
      var cm = (r.comments || []).map(function (c) { return '<span class="wl-offv-c">' + dm(c.day) + " — " + E(c.text) + "</span>"; }).join("");
      return '<div class="wl-offv-r' + (empty ? " bad" : "") + '"><span class="wl-offv-n">' + E(r.name) + "</span>"
        + "<span>" + r.worked + '</span><span>' + r.off + '</span><span>' + r.workdays + '</span>'
        + '<span class="wl-offv-m">' + (empty ? '<em class="wl-bad">не отмечался</em>' : cm || "—") + "</span></div>";
    }).join("");
    return '<div class="panel wl-offv">' + head
      + '<div class="wl-offv-r hd"><span class="wl-offv-n">Сотрудник</span><span>Отработано</span><span>Выходных</span><span>Рабочих</span><span class="wl-offv-m">Комментарии</span></div>'
      + rows + "</div>";
  }

  /* ---------- «Назначить сроки» (телефон; на ПК — по нажатию на чип) ---------- */
  function editHtml() {
    var w = st(); if (!w.edit) return "";
    var i = find(w.edit); if (!i) return "";
    var td = today(), dr = w.editDraft || {}, s0 = dr.s != null ? dr.s : i.s || wdOn(td), e0 = dr.e != null ? dr.e : i.e || (i.cdue && i.cdue >= td ? i.cdue : ""), ex0 = dr.ex != null ? dr.ex : i.ex;
    var ppl = people().filter(function (u) { return u.id; });
    if (i.ex && !ppl.some(function (u) { return u.id === i.ex; })) ppl.push({ id: i.ex, name: i.exName });
    var what = i.kind === "part" ? "Исполнитель раздела получит уведомление; стадия задачи не меняется."
      : i.ready ? "Исполнитель получит уведомление «Вам поставлена задача №" + E(i.number) + "», стадия станет «В проектировании»."
      : i.kind === "fix" ? "Даты — сроки корректировки К" + (i.fixN || "") + "; стадия останется прежней." : "Изменятся исполнитель и сроки плана; стадия останется прежней.";
    return '<div class="ds"><div class="modal-bg" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
      + '<div class="m-head"><div class="row"><div><h2 style="font-size:1.2rem">Назначить сроки · ' + E(label(i)) + '</h2><div style="color:var(--muted);font-size:.86rem">' + E(i.object) + (i.cdue ? " · срок договора " + dm(i.cdue) : "") + '</div></div><button class="x" data-wlx="1">✕</button></div></div><div class="m-body">'
      + '<div class="fld"><label>Исполнитель' + (i.kind === "part" ? " раздела" : "") + '</label><select id="wl-who"><option value="0">— не назначен —</option>' + ppl.map(function (u) { return '<option value="' + u.id + '"' + (u.id === ex0 ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
      + '<div class="g2f"><div class="fld"><label>' + (i.kind === "fix" ? "Начало корректировки" : "Начало работ") + '</label><input id="wl-s" type="date" value="' + E(s0) + '"' + (s0 >= td ? ' min="' + td + '"' : "") + "></div>"
      + '<div class="fld"><label>' + (i.kind === "fix" ? "Срок корректировки" : "Срок сдачи") + '</label><input id="wl-e" type="date" value="' + E(e0) + '" min="' + td + '"></div></div>'
      + '<div class="dbox"><small>Что произойдёт</small>' + what + " В прошлое ставить нельзя.</div>"
      + (w.editErr ? '<div class="err">' + E(w.editErr) + "</div>" : "")
      + '<button class="btn primary block" data-wlsave="1">Сохранить</button>'
      + '<button class="btn ghost block" style="margin-top:10px" data-wlopen="' + i.oid + '">Открыть окно задачи</button></div></div></div></div>';
  }

  /* ---------- сохранение с «Отменить» ---------- */
  /* keep — страницу закрывают или перезагружают: запрос с keepalive, браузер доведёт его и после выгрузки страницы */
  function send(pd, keep) {
    var x = X(), i = pd.item, path, body;
    if (i.kind === "part") {
      path = "/orders/" + i.oid + "/rounds/" + i.rid + "/edit"; body = { plan_start: pd.s, plan_end: pd.e }; if (pd.ex !== pd.ex0) body.executor_id = pd.ex;
    } else {
      path = "/orders/" + i.oid + "/plan"; body = { executor_id: pd.start || pd.ex !== pd.ex0 ? pd.ex : 0, start: pd.s, end: pd.e };
    }
    return keep && window.MPBC ? MPBC.call("/../ds" + path, { body: body, keepalive: true }) : x.api(path, body);
  }
  function reload() {
    var x = X(), S = x.S, jobs = [];
    S.orders = null; S.tasks = null;
    S.wl.days = null; S.wl.daysKey = "";                     // выходные/отпуска могли отметить — перечитаем окно
    jobs.push(x.load());
    if (x.pos() === "designer") jobs.push(x.api("/load").then(function (r) { S.lo = r; }, function () { }));
    jobs.push(x.api("/load/history").then(function (r) { S.lh = r; }, function () { }));
    return Promise.all(jobs).then(x.paint, function (e) { x.toast(String(e)); x.paint(); });
  }
  function commit(keep) {
    var w = st(), pd = w.pend; if (!pd || pd.sent) return Promise.resolve();
    pd.sent = true; clearTimeout(pd.timer); snack(null);
    return send(pd, keep === true).then(function () { jClear(); if (w.pend === pd) w.pend = null; return reload(); }, function (e) {
      jClear(); if (w.pend === pd) w.pend = null; X().toast("Не сохранено: " + String(e && e.message || e)); return reload();
    });
  }
  function propose(pd) {                    // pd: item, ex, exName, s, e, start (назначение = старт проектирования)
    var w = st();
    var go = function () {
      pd.key = pd.item.key; pd.ex0 = pd.item.ex; w.pend = pd; jSave(pd);
      pd.timer = setTimeout(commit, UNDO_MS);
      var who = pd.ex !== pd.ex0 ? " → " + pd.exName : "";
      snack(label(pd.item) + who + ": " + hint(pd.item, pd.s, pd.e) + (pd.start && pd.item.ready ? " · станет «В проектировании»" : ""), pd.item.due && pd.e > pd.item.due);
      rerender();
    };
    if (w.pend && !w.pend.sent) commit().then(go); else go();
  }
  function undo() { var w = st(), pd = w.pend; if (!pd || pd.sent) return; clearTimeout(pd.timer); w.pend = null; jClear(); snack(null); rerender(); X().toast("Отменено"); }
  /* Запасной путь: страницу убили без событий выгрузки (телефон выгрузил вкладку, сбой браузера) — отложенное записано в localStorage.
     При следующем открытии «Занятости»: на сервере уже так — забываем; задача не менялась с броска — досылаем; её успели изменить — не трогаем, сообщаем. */
  var JK = "ds_wl_pend";
  function me() { return (window.MPBC && MPBC.me && MPBC.me.id) || 0; }
  function jSave(pd) {
    var i = pd.item;
    lsSet(JK, JSON.stringify({ key: pd.key, ex: pd.ex, exName: pd.exName, ex0: pd.ex0, s: pd.s, e: pd.e, s0: i.s, e0: i.e, start: !!pd.start, label: label(i), uid: me(), ts: Date.now() }));
  }
  function jClear() { try { localStorage.removeItem(JK); } catch (e) { } }
  var replaying = false;
  function replay() {
    var j = null; try { j = JSON.parse(lsGet(JK) || "null"); } catch (e) { }
    if (!j || replaying || (st().pend && !st().pend.sent)) return;
    if (j.uid !== me() || Date.now() - j.ts > 864e5) return jClear();
    if (Date.now() - j.ts < 4000) { replaying = true; setTimeout(function () { replaying = false; reload(); }, 3000); return; }      // запрос при выгрузке мог ещё идти — сверим по свежим данным
    var it = find(j.key);
    jClear();
    if (!it || (it.ex === j.ex && it.s === j.s && it.e === j.e)) return;                       // уже на сервере (или задача ушла дальше)
    if (it.ex !== j.ex0 || it.s !== j.s0 || it.e !== j.e0) return X().toast("Не сохранено при закрытии страницы: " + j.label + " — задачу уже изменили");
    send({ item: it, ex: j.ex, ex0: j.ex0, s: j.s, e: j.e, start: j.start }).then(function () { X().toast("Сохранено изменение, не отправленное при закрытии страницы: " + j.label + (j.ex !== j.ex0 ? " → " + j.exName : "") + ", " + dm(j.s) + " – " + dm(j.e)); return reload(); },
      function (e) { X().toast("Не сохранено: " + String(e && e.message || e)); });
  }
  function snack(text, bad) {
    var el = document.getElementById("wlSnack");
    if (!text) { if (el) el.className = "wl-snack"; return; }
    if (!el) { el = document.createElement("div"); el.id = "wlSnack"; document.body.appendChild(el); }
    el.innerHTML = '<span class="wl-snt' + (bad ? " bad" : "") + '">' + E(text) + '</span><button type="button" data-wlundo="1">Отменить</button><i style="animation-duration:' + UNDO_MS + 'ms"></i>';
    el.className = "wl-snack"; void el.offsetWidth; el.className = "wl-snack on";
  }

  /* ---------- перерисовка на месте (прокрутка ленты не сбрасывается) ---------- */
  function rerender() {
    var root = document.querySelector("#cal-app .wl-root"); if (!root) return;
    var ll = root.querySelector(".wl-ll"), sl = ll ? ll.scrollLeft : null;
    root.innerHTML = inner();
    var n = root.querySelector(".wl-ll"); if (n && sl != null) n.scrollLeft = sl;
    hookScroll();
  }
  function hookScroll() { var ll = document.getElementById("wlLL"); if (ll) ll.onscroll = function () { closeCard(); if (ll.clientWidth) st().scroll = ll.scrollLeft; }; }
  /* после отрисовки: лента открывается на сегодняшнем дне (экран может быть ещё скрыт — тогда ждём ширину) */
  function after() {
    var ll = document.getElementById("wlLL"); if (!ll) return;
    var cal = document.getElementById("cal-app"); if (cal) cal.classList.toggle("wl-full", !!st().full);
    hookScroll();
    var go = function () {
      if (!ll.isConnected) return true;
      if (!ll.clientWidth) return false;
      var w = st();
      if (w.scroll != null) { ll.scrollLeft = w.scroll; return true; }
      var tdc = ll.querySelector(".wl-day.tn"), G = geom();      // сегодня или ближайший рабочий день (в выходной)
      if (tdc) ll.scrollLeft = Math.max(0, tdc.offsetLeft - G.nw - (w.focus ? 0 : Math.min(5 * tdc.offsetWidth, ll.clientWidth / 3)));
      return true;
    };
    replay();
    if (go()) return;
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (go()) ro.disconnect(); }); ro.observe(ll); }
  }

  var activeCard = null;
  function closeCard() {
    if (!activeCard) return false;
    activeCard.button.setAttribute("aria-expanded", "false");
    activeCard.button.removeAttribute("aria-controls");
    activeCard.panel.remove();
    activeCard = null;
    return true;
  }
  function showCard(anchor, pinned) {
    if (activeCard && activeCard.anchor === anchor && activeCard.pinned === pinned) return;
    closeCard();
    var detail = cardDetails[anchor.dataset.wlcard], button = anchor.querySelector("[data-wlinfo]");
    if (!detail || !button) return;
    var panel = document.createElement("div");
    panel.className = "wl-card-pop " + detail.state;
    panel.id = "wlCardInfo";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Подробности задачи");
    panel.innerHTML = detail.markup;
    document.body.appendChild(panel);
    var rect = button.getBoundingClientRect(), margin = 8;
    var left = Math.min(Math.max(margin, rect.left), innerWidth - panel.offsetWidth - margin);
    var top = rect.bottom + margin;
    if (top + panel.offsetHeight > innerHeight - margin) top = Math.max(margin, rect.top - panel.offsetHeight - margin);
    panel.style.left = left + "px";
    panel.style.top = top + "px";
    button.setAttribute("aria-controls", panel.id);
    button.setAttribute("aria-expanded", "true");
    activeCard = { anchor: anchor, button: button, panel: panel, pinned: pinned };
  }
  /* мини-подсказка при наведении на шильдик (красный/чёрный уголок) — конкретный текст, как в макете */
  var bdTipEl = null;
  function bdTip(show, el, x, y) {
    if (!show) { if (bdTipEl) { bdTipEl.remove(); bdTipEl = null; } return; }
    if (!bdTipEl) { bdTipEl = document.createElement("div"); bdTipEl.id = "wlBdTip"; document.body.appendChild(bdTipEl); }
    bdTipEl.className = "wl-bdtip " + (el.className.indexOf("ns") >= 0 ? "ns" : "shf");
    bdTipEl.textContent = el.getAttribute("data-wltip") || "";
    var r = el.getBoundingClientRect();
    bdTipEl.style.left = Math.min(x + 12, innerWidth - bdTipEl.offsetWidth - 8) + "px";
    bdTipEl.style.top = Math.max(8, r.top - bdTipEl.offsetHeight - 8) + "px";
  }
  document.addEventListener("pointerover", function (e) {
    var b = e.target.closest && e.target.closest("#cal-app .wl-bd[data-wltip]");
    if (b) bdTip(true, b, e.clientX, e.clientY);
  });
  document.addEventListener("pointerout", function (e) {
    var b = e.target.closest && e.target.closest("#cal-app .wl-bd[data-wltip]");
    if (b && !(e.relatedTarget && b.contains(e.relatedTarget))) bdTip(false);
  });
  function cardAt(target) {
    return target && target.closest ? target.closest("#cal-app [data-wlcard]") : null;
  }
  document.addEventListener("pointerover", function (e) {
    var anchor = cardAt(e.target);
    if (e.pointerType === "mouse" && !DRG && !RSZ && anchor && !anchor.contains(e.relatedTarget) && !(activeCard && activeCard.pinned)) showCard(anchor, false);
  });
  document.addEventListener("pointerout", function (e) {
    if (activeCard && !activeCard.pinned && cardAt(e.target) === activeCard.anchor && !activeCard.anchor.contains(e.relatedTarget)) closeCard();
  });
  document.addEventListener("click", function (e) {
    var button = e.target.closest && e.target.closest("#cal-app [data-wlinfo]");
    if (button) {
      e.stopPropagation();
      var anchor = cardAt(button);
      if (activeCard && activeCard.anchor === anchor && activeCard.pinned) closeCard();
      else showCard(anchor, true);
    } else if (activeCard && !activeCard.panel.contains(e.target)) {
      closeCard();
    }
  }, true);
  window.addEventListener("scroll", closeCard, true);
  window.addEventListener("resize", closeCard);

  /* ---------- перетаскивание (ПК) ---------- */
  var DRG = null;
  function rowAt(t) { var r = t && t.closest ? t.closest("#cal-app [data-wlrow]") : null; return r; }
  function colAt(row, x) {
    var r = row.getBoundingClientRect(), G = geom(), n = win().length, w = (r.width - G.nw) / n;
    return Math.max(0, Math.min(n - 1, Math.floor((x - r.left - G.nw) / w)));
  }
  function ghostOff() { var g = document.getElementById("wlGhost"); if (g) g.remove(); var o = document.querySelector(".wl-r.hov"); if (o) o.classList.remove("hov"); }
  function dropPlan(row, x) {
    var i = find(DRG); if (!i) return null;
    var days = win(), s = wdOn(days[colAt(row, x)]), c = days.indexOf(s);
    if (c < 0) return null;
    var e = placed(i, s), G = geom();
    return { i: i, c: c, s: s, e: e, end: Math.min(days.length - 1, idxOf(days, e, true)), uid: +row.getAttribute("data-wlrow") || 0, name: row.getAttribute("data-wlname") || "", G: G };
  }
  function ghost(row, x) {
    var d = dropPlan(row, x); if (!d) return;
    var past = d.s < today(), late = d.i.due && d.e > d.i.due;
    var g = document.getElementById("wlGhost"); if (!g) { g = document.createElement("div"); g.id = "wlGhost"; }
    if (g.parentNode !== row) { ghostOff(); row.appendChild(g); row.classList.add("hov"); }
    g.className = "wl-ghost" + (past || late || !d.uid ? " bad" : ""); g.style.gridColumn = (d.c + 2) + "/" + (Math.max(d.c, d.end) + 3); g.style.gridRow = "1/-1";
    g.innerHTML = '<span class="wl-gl"><b>' + E(label(d.i)) + " → " + E(d.name) + "</b><small>" + (!d.uid ? "этому сотруднику назначить нельзя" : past ? "в прошлое ставить нельзя" : E(hint(d.i, d.s, d.e))) + "</small></span>";
  }
  document.addEventListener("dragstart", function (e) {
    var t = e.target.closest && e.target.closest("#cal-app [data-wld]"); if (!t || !canMove()) return;
    closeCard();
    DRG = t.getAttribute("data-wld");
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "wl:" + DRG); } catch (x) { }
    t.classList.add("dragging"); setTimeout(function () { document.body.classList.add("wl-drg"); }, 0);
  });
  document.addEventListener("dragend", function () { if (!DRG) return; document.body.classList.remove("wl-drg"); DRG = null; ghostOff(); var d = document.querySelector("#cal-app .dragging"); if (d) d.classList.remove("dragging"); });
  document.addEventListener("dragover", function (e) { if (!DRG) return; var row = rowAt(e.target); if (!row) { ghostOff(); return; } e.preventDefault(); ghost(row, e.clientX); });
  document.addEventListener("drop", function (e) {
    if (!DRG) return; var row = rowAt(e.target); if (!row) return;
    e.preventDefault(); var d = dropPlan(row, e.clientX); ghostOff(); DRG = null; document.body.classList.remove("wl-drg");
    if (!d) return;
    if (!d.uid) return X().toast("Этому сотруднику назначить нельзя");
    if (d.s < today()) return X().toast("В прошлое ставить нельзя — выберите день от сегодня");
    if (d.uid === d.i.ex && d.s === d.i.s && d.e === d.i.e) return;
    propose({ item: d.i, ex: d.uid, exName: d.name, s: d.s, e: d.e, start: d.i.ready || (!d.i.ex && d.i.kind !== "part") });
  });

  /* ---------- растягивание за край ---------- */
  var RSZ = null, NOCLICK = false;
  function tip(x, y, i, s, e) {
    var g = document.getElementById("wlTip"); if (!g) { g = document.createElement("div"); g.id = "wlTip"; document.body.appendChild(g); }
    g.className = "wl-tip" + (i.due && e > i.due ? " bad" : ""); g.style.left = Math.min(x + 16, innerWidth - 260) + "px"; g.style.top = (y - 56) + "px";
    g.innerHTML = "<b>" + E(label(i)) + " · " + dm(s) + " – " + dm(e) + "</b><small>" + wdBetween(s, e) + " р.д." + (i.due ? " · " + (e > i.due ? "позже срока " + dm(i.due) : "успевает к " + dm(i.due)) : "") + "</small>";
  }
  document.addEventListener("pointerdown", function (e) {
    var h = e.target.closest && e.target.closest("#cal-app [data-wlrs]"); if (!h || !canMove()) return;
    e.preventDefault();
    closeCard();
    var p = h.getAttribute("data-wlrs").split(":"), i = find(p[0]); if (!i) return;
    var w = st(); if (w.pend && !w.pend.sent && w.pend.key !== i.key) commit();
    RSZ = { key: i.key, side: p[1], s0: i.s, e0: i.e, item: i };
    w.rs = { key: i.key, ex: i.ex, exName: i.exName, s: i.s, e: i.e };
    document.body.classList.add("wl-rsz"); tip(e.clientX, e.clientY, i, i.s, i.e);
  });
  document.addEventListener("pointermove", function (e) {
    if (!RSZ) return;
    var w = st(), row = document.querySelector('#cal-app .wl-r [data-wlrs^="' + RSZ.key + ':"]'); row = row && row.closest(".wl-r"); if (!row) return;
    var d = win()[colAt(row, e.clientX)], td = wdOn(today()), r = w.rs, ch = false;
    while (!isWd(d)) d = addD(d, RSZ.side === "r" ? -1 : 1);
    if (RSZ.side === "r") { var ne = d < r.s ? r.s : d; if (ne < td) ne = td; if (ne !== r.e) { r.e = ne; ch = true; } }
    else { var ns = d > r.e ? r.e : d; if (ns < td) ns = td; if (ns !== r.s) { r.s = ns; ch = true; } }
    if (ch) { rerender(); var hh = document.querySelector('#cal-app [data-wlrs="' + RSZ.key + ":" + RSZ.side + '"]'); if (hh) hh.classList.add("act"); }
    tip(e.clientX, e.clientY, RSZ.item, r.s, r.e);
  });
  document.addEventListener("pointerup", function () {
    if (!RSZ) return;
    var w = st(), r = w.rs, i = RSZ.item, moved = r && (r.s !== RSZ.s0 || r.e !== RSZ.e0);
    RSZ = null; w.rs = null; document.body.classList.remove("wl-rsz"); var g = document.getElementById("wlTip"); if (g) g.remove();
    NOCLICK = true; setTimeout(function () { NOCLICK = false; }, 300);
    if (moved) propose({ item: i, ex: i.ex, exName: i.exName, s: r.s, e: r.e, start: false }); else rerender();
  });
  document.addEventListener("click", function (e) { if (NOCLICK && e.target.closest && e.target.closest("#cal-app")) { NOCLICK = false; e.stopPropagation(); e.preventDefault(); } }, true);

  /* ---------- кнопки экрана ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-wlfull],[data-wloffv],[data-wloffnav],[data-wledit],[data-wlx],[data-wlsave],[data-wlopen],[data-wlstart],[data-wlundo],[data-wlmonthpick],[data-wlday]");
    if (!t) return;
    if (!t.hasAttribute("data-wlundo") && !t.closest("#cal-app")) return;
    var d = t.dataset, w = st();
    if (d.wlundo) return undo();
    if (d.wlmonthpick) return gotoCalendar(d.wlmonthpick + "-01");
    if (d.wlday) return gotoCalendar(d.wlday);
    if (d.wlfull) { w.full = !w.full; return rerender(), after(); }
    if (d.wloffv) {
      if (!w.offv) w.offv = { open: false, start: mon(today()), rows: null, loading: false };
      w.offv.open = !w.offv.open;
      if (w.offv.open && !w.offv.rows && !w.offv.loading) offLoad();
      return rerender();
    }
    if (d.wloffnav != null) {
      var o = w.offv; if (!o) return;
      o.start = d.wloffnav === "0" ? mon(today()) : addD(o.start, 7 * (+d.wloffnav));
      o.rows = null; offLoad(); return rerender();
    }
    if (d.wlx) { w.edit = null; w.editErr = ""; w.editDraft = null; return rerender(); }
    if (d.wlopen) { w.edit = null; w.editErr = ""; rerender(); var a = document.createElement("button"); a.setAttribute("data-open", d.wlopen); a.style.display = "none"; document.getElementById("cal-app").appendChild(a); a.click(); a.remove(); return; }
    if (d.wledit) { if (!canMove()) return; e.stopPropagation(); w.edit = d.wledit; w.editErr = ""; w.editDraft = null; return rerender(); }
    if (d.wlstart) {
      e.stopPropagation();
      var prm = String(d.wlstart).split(":"), oid = +prm[0] || 0, rid = +prm[1] || 0;
      return X().api("/orders/" + oid + "/start", { rid: rid }).then(function () { X().toast("Отмечено «Начато»"); return reload(); },
        function (er) { X().toast(String(er && er.message || er)); });
    }
    if (d.wlsave) {
      var i = find(w.edit); if (!i) { w.edit = null; return rerender(); }
      var ex = +document.getElementById("wl-who").value || 0, s = document.getElementById("wl-s").value, en = document.getElementById("wl-e").value, td = today();
      var err = !s || !en ? "Укажите начало и срок" : (s < td && s !== i.s) || (en < td && en !== i.e) ? "В прошлое ставить нельзя — выберите день от сегодня" : en < s ? "Срок раньше начала" : !ex && i.ready ? "Выберите исполнителя" : "";
      if (err) { w.editErr = err; w.editDraft = { ex: ex, s: s, e: en }; return rerender(); }
      var u = people().filter(function (x) { return x.id === ex; })[0];
      w.edit = null; w.editErr = ""; w.editDraft = null;
      return propose({ item: i, ex: ex, exName: u ? u.name : i.exName, s: s, e: en, start: !!ex && (i.ready || (!i.ex && i.kind !== "part")) });
    }
  });
  function gotoCalendar(day) {
    var w = st();
    w.month = day.slice(0, 7);
    var days = win();
    w.focus = day < days[0] ? days[0] : day;
    w.scroll = null;
    rerender();
    after();
  }
  document.addEventListener("toggle", function (e) {
    var t = e.target;
    if (t.matches && t.matches("#cal-app .wl-options")) st().options = t.open;
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (closeCard()) return;
    if (window.DS && DS.ldCtx && X().S.wl && X().S.wl.full) { X().S.wl.full = false; rerender(); after(); }
  });
  // не потерять отложенное: уход с экрана, скрытие вкладки, закрытие страницы — сохраняем сразу
  window.addEventListener("hashchange", function () { closeCard(); if (window.DS && DS.ldCtx && X().S.wl && X().S.wl.pend && location.hash.indexOf("#/cal") !== 0) commit(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && window.DS && DS.ldCtx && X().S.wl && X().S.wl.pend) commit(true); });
  window.addEventListener("pagehide", function () { if (window.DS && DS.ldCtx && X().S.wl && X().S.wl.pend) commit(true); });
  window.addEventListener("beforeunload", function () { if (window.DS && DS.ldCtx && X().S.wl && X().S.wl.pend) commit(true); });
  // ширина окна перешла границу «телефон / ПК» — перерисовать (перетаскивание и ручки только на ПК)
  var wasPhone = null;
  function onWidth() { var ph = phone(); if (wasPhone !== null && ph !== wasPhone && document.querySelector("#cal-app .wl-root")) { rerender(); after(); } }
  window.addEventListener("resize", onWidth);
  try { matchMedia("(max-width: 759px)").addEventListener("change", onWidth); } catch (e) { }

  window.DSWorkLoad = { html: html, after: after };
})();
