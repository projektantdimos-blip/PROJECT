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
  var READY = "Готов к проектированию", ACTIVE = ["В проектировании", "Проверка", "Корректировка"];
  var PART_ST = ["Готов к проектированию", "В проектировании", "Проверка", "Корректировка"];
  var MONG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var MONN = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  var HPAL = ["#4f8ef0", "#8b6fe0", "#2fa66a", "#e0734a", "#c9a227", "#1fb3b3", "#c0568f", "#8c9a2a", "#3c9bd1"];

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
    if (!S.wl) S.wl = { off: 0, z: +lsGet("ds_wlz") || 8, pend: null, rs: null, edit: null, scroll: null, full: false };
    return S.wl;
  }
  function col(n) { var h = 0; String(n).split("").forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return HPAL[h % HPAL.length]; }

  /* ---------- модель: задачи, разделы и корректировки → элементы ленты ---------- */
  function items() {
    var x = X(), S = x.S, base = x.pos() === "designer" ? (S.lo || []) : (S.orders || []), out = [], w = st();
    base.forEach(function (o) {
      var due = o.due_date || "";
      if (o.stage === READY || ACTIVE.indexOf(o.stage) >= 0) {
        var fx = o.stage === "Корректировка" && !!o.fix_start, sp = x.span(o);
        out.push({ key: "o" + o.id, kind: fx ? "fix" : "main", oid: o.id, number: o.number, object: (o.object || "").split(",")[0], sys: x.sysText(o), stage: o.stage,
          ex: o.executor_id || 0, exName: o.executor || "", s: o.stage === READY && !o.plan_start ? "" : sp[0], e: o.stage === READY && !o.plan_end ? "" : sp[1],
          due: fx ? "" : due, cdue: due, left: o.left_days, urgent: !!o.urgent, ready: o.stage === READY, fixN: o.fix_n || 0, o: o });
      }
      if (PART_ST.indexOf(o.stage) >= 0) (o.parts || []).forEach(function (p) {
        if (p.delivered) return;
        out.push({ key: "p" + p.id, kind: "part", oid: o.id, rid: p.id, number: o.number, object: "раздел " + p.system + " · " + (o.object || "").split(",")[0], sys: p.system, stage: o.stage,
          ex: p.executor_id || 0, exName: p.executor || "", s: p.plan_start || "", e: p.plan_end || "", due: due, cdue: due, left: o.left_days, urgent: !!o.urgent, ready: false, fixN: 0, o: o, part: p });
      });
    });
    out.forEach(function (it) {                                           // ещё не сохранённое (бросок, растягивание) — поверх данных сервера
      var p = w.rs && w.rs.key === it.key ? w.rs : w.pend && w.pend.key === it.key ? w.pend : null;
      if (p) { it.ex = p.ex; it.exName = p.exName; it.s = p.s; it.e = p.e; it.pending = true; if (p.start) it.ready = false; }
    });
    return out;
  }
  function find(key) { return items().filter(function (i) { return i.key === key; })[0]; }
  function people() { return X().staff(); }
  function mine(u, list) { return list.filter(function (i) { return i.ex && (i.ex === u.id || i.exName === u.name) && i.s && i.e; }); }
  function freeFrom(u, list) { var m = ""; mine(u, list).forEach(function (i) { if (i.e > m) m = i.e; }); return m && m >= today() ? wdNext(m) : wdOn(today()); }      // в выходной — с ближайшего рабочего дня
  function label(i) { return (i.kind === "fix" ? "↻ " : "") + "№" + i.number + (i.kind === "fix" && i.fixN ? " К" + i.fixN : ""); }
  function hint(i, s, e) {                                              // «успевает к …» / «позже срока …» — по сроку договора (у корректировки срока договора нет)
    if (!i.due) return dm(s) + " – " + dm(e);
    return dm(s) + " – " + dm(e) + (e > i.due ? " · позже срока " + dm(i.due) + " на " + Math.max(1, wdBetween(addD(i.due, 1), e)) + " р.д." : " · успевает к " + dm(i.due));
  }
  /* длина при броске: прежняя длина плана в рабочих днях; плана не было — до срока договора (оценки трудоёмкости в CRM нет) */
  function placed(i, s) {
    if (i.s && i.e) return wdAdd(s, Math.max(1, wdBetween(i.s, i.e)));
    return i.due && i.due >= s ? i.due : s;
  }

  /* ---------- окно ленты: только рабочие дни, неделями ---------- */
  function win() {
    var w = st(), back = w.z === 4 ? 1 : w.z === 13 ? 6 : 3, w0 = addD(mon(today()), 7 * (w.off - back)), d = [];
    for (var k = 0; k < w.z; k++) for (var j = 0; j < 5; j++) d.push(addD(w0, k * 7 + j));
    return d;
  }
  function wkName(w) { var k = Math.round((new Date(w + "T12:00:00") - new Date(mon(today()) + "T12:00:00")) / 864e5 / 7); return k === 0 ? "эта неделя" : k === -1 ? "прошлая" : k === 1 ? "следующая" : k < 0 ? (-k) + " нед. назад" : "через " + k + " нед."; }
  function wkLbl(w) { var e = addD(w, 4); return +w.slice(8) + (w.slice(5, 7) === e.slice(5, 7) ? "" : " " + MONG[+w.slice(5, 7) - 1].slice(0, 3)) + "–" + +e.slice(8) + " " + MONG[+e.slice(5, 7) - 1].slice(0, 3); }
  function geom() { var w = st(), ph = phone(); return { nw: ph ? 96 : 190, fw: ph ? 58 : 92, cw: w.z === 13 ? 13 : w.z === 8 ? 22 : 38, rh: ph ? 40 : 44 }; }

  /* ---------- экран ---------- */
  function html() { return '<div class="wl-root">' + inner() + "</div>"; }
  function inner() {
    var x = X(), S = x.S, w = st(), p = x.pos(), mv = canMove() && !phone(), ph = phone();
    wasPhone = ph;                                                        // режим, в котором отрисовано (для перерисовки при смене ширины)
    var days = win(), N = days.length, td = today(), ti = idxOf(days, td, false), G = geom();
    var cols = G.nw + "px repeat(" + N + ",minmax(" + G.cw + "px,1fr)) " + G.fw + "px", minw = G.nw + G.fw + N * G.cw;
    function idx(d, end) { return idxOf(days, d, end); }
    var all = items(), ppl = people();
    var weeks = []; for (var k = 0; k < w.z; k++) weeks.push(days[k * 5]);
    var mh = '<div class="wl-h" style="grid-template-columns:' + cols + ";min-width:" + minw + 'px"><div class="wl-fp"><span>← что делали</span><span>план →</span></div>'
      + weeks.map(function (wk) { return '<div class="wl-w' + (wk === mon(td) ? " cur" : "") + '" style="grid-column:span 5"><b>' + wkLbl(wk) + "</b><small>" + wkName(wk) + "</small></div>"; }).join("")
      + '<div class="wl-free">Свободен с</div></div>';
    var dh = '<div class="wl-d" style="grid-template-columns:' + cols + ";min-width:" + minw + 'px"><div></div>'
      + days.map(function (d, i) { return '<div class="' + (d === td ? "td" : "") + (i === ti ? " tn" : "") + (i % 5 === 0 ? " ws" : "") + '">' + (w.z === 13 && i % 5 && d !== td ? "" : +d.slice(8)) + "</div>"; }).join("") + "<div></div></div>";
    var rows = ppl.map(function (u) {
      var my = mine(u, all), hist = (S.lh || []).filter(function (h) { return h.user_id === u.id || h.who === u.name; }).filter(function (h) {
        return !my.some(function (i) { return i.oid === h.order_id && i.kind !== "part" && h.end >= i.s; });      // не дублируем текущий план той же задачи
      }).map(function (h) { return { hist: h.kind, key: "h", oid: h.order_id, number: h.number, object: h.object || "", s: h.start, e: h.end, fixN: h.fix_n }; });
      var list = hist.concat(my).filter(function (i) { var e = effEnd(i); return e >= days[0] && i.s <= days[N - 1]; }).sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
      var ends = [], segs = "";
      list.forEach(function (i) {
        var e = effEnd(i), a = idx(i.s, false), b = idx(e, true); if (b < a) a = b = Math.max(0, b);      // целиком в выходные — на пятницу перед ними
        var l = 0; while (l < ends.length && ends[l] >= a) l++; ends[l] = b;
        var stt = i.hist ? "done" : i.kind === "fix" ? "fix" : i.ready || i.s > td ? "plan" : "work";
        var late = !i.hist && i.due && e > i.due, dI = i.due ? idx(i.due, true) : -1, me = late && dI >= a && dI < b ? dI : b;
        var pct = stt === "work" || stt === "fix" ? Math.max(0, Math.min(100, Math.round((ti - a) / (me - a + 1) * 100))) : 0;
        var lead = i.hist ? null : Math.min(i.e ? calLeft(i.e) : 99, i.left != null ? i.left : 99), hot = lead != null && lead >= 0 && lead <= 2, past = !i.hist && i.e && i.e < td;
        var tip, l2, ttl;
        if (i.hist) {
          var HN = { work: "проектирование", fix: "корректировка" + (i.fixN ? " К" + i.fixN : ""), review: "проверка" };
          ttl = (i.hist === "fix" ? "↻ " : i.hist === "review" ? "👁 " : "✓ ") + "№" + i.number;
          l2 = "сделано · " + HN[i.hist] + " · " + Math.max(1, wdBetween(i.s, i.e)) + " р.д.";
          tip = "№" + i.number + " · " + i.object + " · " + HN[i.hist] + " · " + dm(i.s) + "–" + dm(i.e) + " · сделано";
        } else {
          ttl = label(i);
          l2 = i.ready ? '<em class="wl-ready">распределено — переведите</em>' : past ? '<em class="wl-bad">план до ' + dm(i.e) + " прошёл</em>"
            : (hot ? '<em class="wl-hot">≤ 2 дн.</em> · ' : "") + E(i.kind === "part" ? "раздел " + i.sys : i.sys || i.stage) + (i.due ? " · срок " + dm(i.due) : i.kind === "fix" ? " · до " + dm(i.e) : "");
          tip = label(i) + " · " + i.object + " · " + i.stage + " · план " + dm(i.s) + "–" + dm(i.e) + (i.cdue ? ", срок договора " + dm(i.cdue) : "") + (i.ready ? " · распределено, стадия не переведена" : "") + (i.pending ? " · ещё не сохранено" : "");
        }
        var drag = mv && !i.hist ? ' draggable="true" data-wld="' + i.key + '"' : "";
        var open = i.hist ? openAttr(i.oid) : ph && canMove() ? 'data-wledit="' + i.key + '"' : openAttr(i.oid);
        segs += '<div class="wlb ' + stt + (hot ? " hot" : "") + (i.ready ? " rdy" : "") + (late && me === b ? " late" : "") + (i.pending ? " pend" : "") + (i.urgent && !i.hist ? " urg" : "") + '"' + drag + " " + open
          + ' style="grid-column:' + (a + 2) + "/" + (me + 3) + ";grid-row:" + (l + 1) + ";--c:" + col(i.number) + ";--p:" + pct + '%" title="' + E(tip) + '"><b>' + E(ttl) + " <span>" + E(i.object) + "</span></b><small>" + (i.hist ? E(l2) : l2) + "</small></div>";
        if (me < b) segs += '<div class="wlb over" style="grid-column:' + (me + 3) + "/" + (b + 3) + ";grid-row:" + (l + 1) + '" title="Работа после срока договора: ' + (b - me) + ' р.д."><b>+' + (b - me) + (b - me > 1 ? " р.д.</b><small>после срока</small>" : "</b>") + "</div>";
        if (mv && !i.hist && i.s >= td && i.s >= days[0]) segs += '<span class="wl-hd l" data-wlrs="' + i.key + ':l" style="grid-column:' + (a + 2) + ";grid-row:" + (l + 1) + '" title="Тяните — сдвинуть начало"></span>';
        if (mv && !i.hist && e >= td && e <= days[N - 1]) segs += '<span class="wl-hd r" data-wlrs="' + i.key + ':r" style="grid-column:' + (b + 2) + ";grid-row:" + (l + 1) + '" title="Тяните — сдвинуть окончание"></span>';
        if (!i.hist && i.due && dI >= 0 && dI < N && i.due >= days[0] && i.due <= days[N - 1]) segs += '<span class="wl-flag' + (late ? " bad" : "") + '" style="grid-column:' + (dI + 2) + ";grid-row:" + (l + 1) + '">⚑ ' + dm(i.due) + "</span>";
      });
      var lanes = Math.max(1, ends.length), act = mine(u, all), lt = act.filter(function (i) { return (i.due && effEnd(i) > i.due) || (i.left != null && i.left < 0 && i.kind !== "fix"); }).length, fr = freeFrom(u, all);
      var bg = days.map(function (d, i) { return '<span class="wl-c' + (d === td ? " td" : "") + (i % 5 === 0 ? " ws" : "") + (i < ti ? " pa" : "") + '" style="grid-column:' + (i + 2) + ";grid-row:1/span " + lanes + '"></span>'; }).join("");
      return '<div class="wl-r" data-wlrow="' + (u.id || "") + '" data-wlname="' + E(u.name) + '" style="grid-template-columns:' + cols + ";grid-template-rows:repeat(" + lanes + "," + G.rh + "px);min-width:" + minw + 'px">'
        + '<div class="wl-nm" style="grid-row:1/span ' + lanes + '">' + x.ava(u.name, "sm") + "<span><b>" + E(u.name) + "</b><small>" + act.length + " в работе" + (lt ? ' · <em class="wl-bad">' + lt + " не успевает</em>" : "") + "</small></span></div>"
        + bg + segs + '<div class="wl-fr" style="grid-row:1/span ' + lanes + ";grid-column:" + (N + 2) + '">' + (fr > td ? dm(fr) : "сейчас") + "</div></div>";
    }).join("");
    // «Ждут распределения»: без исполнителя (задачи на «Готов» и в работе, корректировки, разделы) и назначенные без дат
    var tray = all.filter(function (i) { return !i.ex || !i.s || !i.e; }).sort(function (a, b) { return (a.cdue || "9") < (b.cdue || "9") ? -1 : 1; });
    var best = function (i) { var b = null; ppl.forEach(function (u) { if (!u.id) return; var f = freeFrom(u, all); if (!b || f < b[1]) b = [u.name, f]; }); return b; };
    var trayHtml = '<div class="panel wl-tray"><b>Ждут распределения · ' + tray.length + "</b>" + (tray.length && mv ? '<span class="wl-trh">тяните на строку сотрудника →</span>' : "")
      + tray.map(function (i) {
        var b = best(i), sub = (i.kind === "part" ? "раздел " + i.sys + " · " : "") + (i.ex ? E(i.exName) + ", без дат" : i.cdue ? "до " + dm(i.cdue) : "без срока");
        var tip = label(i) + " · " + i.object + " · " + i.stage + (i.cdue ? " · срок договора " + dm(i.cdue) : "") + (i.ex ? " · назначено: " + i.exName + ", дат плана нет" : "") + (b ? " · раньше всех свободен: " + b[0] + " с " + dm(b[1]) : "");
        var act2 = mv ? ' draggable="true" data-wld="' + i.key + '" data-wledit="' + i.key + '"' : canMove() ? ' data-wledit="' + i.key + '"' : " " + openAttr(i.oid);
        return '<div class="wl-chip' + (i.kind === "fix" ? " fix" : i.kind === "part" ? " part" : "") + (i.urgent ? " urg" : "") + '"' + act2 + ' title="' + E(tip) + '">' + (mv ? '<span class="wl-grip">⋮⋮</span>' : "") + "<b>" + E(label(i)) + "</b><small>" + sub + "</small></div>";
      }).join("") + (tray.length ? "" : '<span class="wl-empty">всё распределено ✓</span>') + "</div>";
    var months = monthList(), curM = "";
    var top = '<div class="wl-top"><div class="seg"><button data-wlnav="-1" title="На неделю назад">←</button><button data-wlnav="0"' + (w.off ? "" : ' class="on"') + ' title="К сегодняшнему дню">Сегодня</button><button data-wlnav="1" title="На неделю вперёд">→</button></div>'
      + '<select class="wl-sel" data-wlmonth="1"><option value="">Перейти к месяцу…</option>' + months.map(function (m) { return '<option value="' + m + '"' + (m === curM ? " selected" : "") + ">" + MONN[+m.slice(5, 7) - 1] + " " + m.slice(0, 4) + "</option>"; }).join("") + "</select>"
      + '<span class="wl-vlab">Масштаб</span><div class="seg">' + [["4", "Месяц"], ["8", "2 месяца"], ["13", "Квартал"]].map(function (z) { return '<button data-wlz="' + z[0] + '"' + (String(w.z) === z[0] ? ' class="on"' : "") + ">" + z[1] + "</button>"; }).join("") + "</div>"
      + '<span class="wl-grow"></span>' + (ph ? "" : '<button class="btn ghost sm" data-wlfull="1">' + (w.full ? "⤡ Свернуть" : "⤢ Во весь экран") + "</button>")
      + (p === "owner" || p === "ops" || p === "design" ? '<span class="ldwho wl-who"><button class="btn ghost sm" data-ldmenu="1">👥 Кого показывать (' + ppl.length + ")</button>"
        + (S.ldMenu ? '<span class="ldpop"><b>Показывать в «Занятости»</b>' + x.staffAll().map(function (u) { var on = ppl.some(function (y) { return y.name === u.name; }); return '<button type="button" class="ldchk ' + (on ? "on" : "") + '" data-ldp="' + E(u.name) + '"><i>' + (on ? "✓" : "") + "</i>" + E(u.name) + "</button>"; }).join("") + '<button class="btn ghost sm" data-ldmenu="0" style="margin-top:8px">Готово</button></span>' : "") + "</span>" : "")
      + "</div>";
    var leg = '<div class="wl-leg"><span><i class="wl-dot" style="background:#c3cad6"></i>сделано (по истории задачи)</span><span><i class="wl-dot" style="background:#3b7ddd"></i>в работе (тёмная часть — уже прошло)</span><span><i class="wl-dot" style="background:#9dbff1"></i>в плане</span><span><i class="wl-dot" style="background:#e0873a"></i>корректировка</span><span><i class="wl-dot ov"></i>после срока договора</span><span><b class="wl-flag sm">⚑</b> срок по договору</span><span><i class="wl-dot hot"></i>≤ 2 дн. до срока</span>'
      + (mv ? "<span>⋮⋮ перетащить задачу на сотрудника · ⟷ тяните за край полосы — меняются даты · в прошлое нельзя</span>" : canMove() ? "<span>нажмите на задачу — «Назначить сроки»</span>" : "<span>только просмотр: исполнителя и сроки назначают руководитель и руководитель проектного отдела</span>") + "</div>";
    var nodata = !ppl.length ? '<div class="note" style="padding:16px;margin:0">Сотрудников с задачами в работе нет</div>' : "";
    return '<div class="head"><div><h1>Занятость</h1></div></div>' + top + trayHtml
      + '<div class="panel wl-ll" id="wlLL">' + mh + dh + rows + nodata + "</div>" + leg + editHtml();
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
  function monthList() {
    var td = today(), a = addD(td, -180), out = [];
    (X().S.lh || []).forEach(function (h) { if (h.start && h.start < a) a = h.start; });
    var y = +a.slice(0, 4), m = +a.slice(5, 7), y2 = +td.slice(0, 4), m2 = +td.slice(5, 7) + 3;
    while (y < y2 || (y === y2 && m <= m2)) { out.push(y + "-" + ("0" + m).slice(-2)); m++; if (m > 12) { m = 1; y++; } }
    return out;
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
  function hookScroll() { var ll = document.getElementById("wlLL"); if (ll) ll.onscroll = function () { if (ll.clientWidth) st().scroll = ll.scrollLeft; }; }
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
      var tdc = ll.querySelector(".wl-d .tn"), G = geom();      // сегодня или ближайший рабочий день (в выходной)
      if (tdc) ll.scrollLeft = Math.max(0, tdc.offsetLeft - G.nw - Math.min(5 * tdc.offsetWidth, ll.clientWidth / 3));
      return true;
    };
    replay();
    if (go()) return;
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { if (go()) ro.disconnect(); }); ro.observe(ll); }
  }
  function resetView() { st().scroll = null; }

  /* ---------- перетаскивание (ПК) ---------- */
  var DRG = null;
  function rowAt(t) { var r = t && t.closest ? t.closest("#cal-app [data-wlrow]") : null; return r; }
  function colAt(row, x) {
    var r = row.getBoundingClientRect(), G = geom(), n = win().length, w = (r.width - G.nw - G.fw) / n;
    return Math.max(0, Math.min(n - 1, Math.floor((x - r.left - G.nw) / w)));
  }
  function ghostOff() { var g = document.getElementById("wlGhost"); if (g) g.remove(); var o = document.querySelector(".wl-r.hov"); if (o) o.classList.remove("hov"); }
  function dropPlan(row, x) {
    var i = find(DRG); if (!i) return null;
    var days = win(), c = colAt(row, x), s = days[c], e = placed(i, s), G = geom();
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
    var p = h.getAttribute("data-wlrs").split(":"), i = find(p[0]); if (!i) return;
    var w = st(); if (w.pend && !w.pend.sent && w.pend.key !== i.key) commit();
    RSZ = { key: i.key, side: p[1], s0: i.s, e0: i.e, item: i };
    w.rs = { key: i.key, ex: i.ex, exName: i.exName, s: i.s, e: i.e };
    document.body.classList.add("wl-rsz"); tip(e.clientX, e.clientY, i, i.s, i.e);
  });
  document.addEventListener("pointermove", function (e) {
    if (!RSZ) return;
    var w = st(), row = document.querySelector('#cal-app .wl-r [data-wlrs^="' + RSZ.key + ':"]'); row = row && row.closest(".wl-r"); if (!row) return;
    var d = win()[colAt(row, e.clientX)], td = today(), r = w.rs, ch = false;
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
    var t = e.target.closest && e.target.closest("[data-wlnav],[data-wlz],[data-wlfull],[data-wledit],[data-wlx],[data-wlsave],[data-wlopen],[data-wlundo]");
    if (!t) return;
    if (!t.hasAttribute("data-wlundo") && !t.closest("#cal-app")) return;
    var d = t.dataset, w = st();
    if (d.wlundo) return undo();
    if (d.wlnav != null) { w.off = d.wlnav === "0" ? 0 : w.off + (+d.wlnav); resetView(); return rerender(), after(); }
    if (d.wlz) { w.z = +d.wlz; lsSet("ds_wlz", d.wlz); resetView(); return rerender(), after(); }
    if (d.wlfull) { w.full = !w.full; return rerender(), after(); }
    if (d.wlx) { w.edit = null; w.editErr = ""; w.editDraft = null; return rerender(); }
    if (d.wlopen) { w.edit = null; w.editErr = ""; rerender(); var a = document.createElement("button"); a.setAttribute("data-open", d.wlopen); a.style.display = "none"; document.getElementById("cal-app").appendChild(a); a.click(); a.remove(); return; }
    if (d.wledit) { if (!canMove()) return; e.stopPropagation(); w.edit = d.wledit; w.editErr = ""; w.editDraft = null; return rerender(); }
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
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t || !t.matches || !t.matches("#cal-app [data-wlmonth]") || !t.value) return;
    var w = st(), back = w.z === 4 ? 1 : w.z === 13 ? 6 : 3, m0 = mon(t.value + "-01");
    w.off = Math.round((new Date(m0 + "T12:00:00") - new Date(mon(today()) + "T12:00:00")) / 864e5 / 7) + back;
    w.scroll = 0; rerender(); var ll = document.getElementById("wlLL"); if (ll) ll.scrollLeft = 0;
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && st && window.DS && DS.ldCtx && X().S.wl && X().S.wl.full) { X().S.wl.full = false; rerender(); after(); } });
  // не потерять отложенное: уход с экрана, скрытие вкладки, закрытие страницы — сохраняем сразу
  window.addEventListener("hashchange", function () { if (window.DS && DS.ldCtx && X().S.wl && X().S.wl.pend && location.hash.indexOf("#/cal") !== 0) commit(); });
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
