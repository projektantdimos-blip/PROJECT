/* Пятничный созвон РОПа: 9 блоков по утверждённому макету, данные и сохранение — существующий API ds_reports. */
(function () {
  var R = null, RO = true, WEEK = "", FILTER = "";
  function E(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function item(id) { return (R.items || []).filter(function (x) { return x.id === id; })[0] || { inputs: [], rows: [], kv: [] }; }
  function input(key) {
    var found = null;
    (R.items || []).forEach(function (it) {
      (it.inputs || []).forEach(function (i) { if (i.key === key) found = i; });
      (it.rows || []).forEach(function (r) { (r.inputs || []).forEach(function (i) { if (i.key === key) found = i; }); });
    });
    return found;
  }
  function list(v) {
    if (Array.isArray(v)) return v;
    if (!v) return [];
    try { var x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch (e) { return []; }
  }
  function num(v) { return parseInt(String(v == null ? "" : v).replace(/[^\d-]/g, ""), 10) || 0; }
  function money(v) { return num(v).toLocaleString("ru-RU") + " ₽"; }
  function cell(v) { return v && typeof v === "object" ? '<span class="sr-pill ' + E(v.tone || "info") + '">' + E(v.t) + "</span>" : E(v == null ? "" : v); }
  function kv(it, key) { var x = (it.kv || []).filter(function (v) { return v[0] === key; })[0]; return x ? x[1] : "—"; }
  function dis() { return RO ? " disabled" : ""; }
  function label(text, body, extra) { return '<div class="sr-field" ' + (extra || "") + '><label>' + E(text || "") + '</label>' + body + "</div>"; }
  function chips(i, multi) {
    var selected = multi ? list(i.v) : [String(i.v || "")];
    return '<div class="sr-chips" data-chips="' + E(i.key) + '">' + (i.options || []).map(function (o, n) {
      var on = selected.indexOf(String(o)) >= 0;
      return '<button type="button" class="' + (on ? "on" : "") + '" data-' + (multi ? "srm" : "src") + '="' + E(i.key) + '" data-val="' + E(o) + '" data-n="' + n + '"' + dis() + '>' + E(o) + "</button>";
    }).join("") + "</div>";
  }
  function control(i) {
    if (!i) return "";
    if (i.kind === "multi" || i.kind === "chips" || i.kind === "scale") return chips(i, i.kind === "multi");
    if (i.kind === "kp") return '<select data-srkp="' + i.kp + "|" + E(i.field) + "|" + E(i.key) + '"' + dis() + '>' + (i.options || []).map(function (o) { return '<option value="' + E(o[0]) + '"' + (o[0] === (i.v || "") ? " selected" : "") + '>' + E(o[1]) + "</option>"; }).join("") + "</select>";
    if (i.kind === "kpdate") return '<input type="date" data-srkp="' + i.kp + "|" + E(i.field) + "|" + E(i.key) + '" value="' + E(i.v || "") + '"' + dis() + '>';
    if (i.kind === "prob") return '<select data-srk="' + E(i.key) + '"' + dis() + '>' + [["", "—"], ["high", "высокая"], ["mid", "средняя"], ["low", "низкая"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (i.v || "") ? " selected" : "") + '>' + o[1] + "</option>"; }).join("") + "</select>";
    if (i.kind === "select") return '<select data-srk="' + E(i.key) + '"' + dis() + '>' + (i.options || []).map(function (o) { return '<option value="' + E(o) + '"' + (o === i.v ? " selected" : "") + '>' + E(o || "— выбрать —") + "</option>"; }).join("") + "</select>";
    if (i.kind === "area") return '<textarea data-srk="' + E(i.key) + '" placeholder="' + E(i.ph || "") + '"' + dis() + '>' + E(i.v || "") + "</textarea>";
    if (i.kind === "json") return "";
    return '<input type="' + (i.kind === "date" ? "date" : i.kind === "num" ? "text" : "text") + '"' + (i.kind === "num" ? ' inputmode="numeric"' : "") + ' data-srk="' + E(i.key) + '" value="' + E(i.v || "") + '" placeholder="' + E(i.ph || "") + '"' + dis() + '>';
  }
  function field(key, text, extra) { return label(text, control(input(key)), extra); }
  function rowInput(r, kind, n) { var a = (r.inputs || []).filter(function (i) { return i.kind === kind; }); return a[n || 0]; }
  function table(headers, rows, cls) {
    if (!rows.length) return '<div class="sr-empty">Нет данных за выбранную неделю</div>';
    return '<div class="sr-tw"><table class="sr-table ' + (cls || "") + '"><thead><tr>' + headers.map(function (h) { return "<th>" + E(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
  }
  function question(n, title, body, chipsHtml, privateBlock) {
    return '<section class="sr-q" data-q="' + n + '"><button type="button" class="sr-qh" data-sracc="' + n + '"><span class="sr-no">' + n + '</span><span class="sr-qt"><b>' + E(title)
      + (privateBlock ? ' <span class="sr-lock" title="Только руководители">▣</span>' : "") + '</b><span class="sr-summary">' + (chipsHtml || "")
      + '</span></span><span class="sr-chev">⌄</span></button><div class="sr-qb" id="sr-b' + n + '">' + body + '</div></section>';
  }
  function group(title, cls, body) { return '<section class="sr-zone ' + cls + '"><h2>' + E(title) + '</h2><div class="sr-zi">' + body + "</div></section>"; }
  function statusNote(text) { return '<span class="sr-save-status" id="srStatus">' + E(text || "Изменения сохраняются автоматически") + "</span>"; }

  function requestsBlock() {
    var it = item("s1"), rows = it.rows.map(function (r) {
      return "<tr><td>" + cell(r.cells[0]) + "</td><td><b>" + cell(r.cells[1]) + "</b></td><td class=\"sr-num\">" + cell(r.cells[2]) + "</td><td>" + cell(r.cells[3]) + "</td><td>" + cell(r.cells[4]) + "</td><td>" + control(r.inputs[0]) + "</td><td>" + cell(r.cells[6]) + "</td><td>" + control(r.inputs[1]) + "</td><td>" + control(r.inputs[2]) + "</td></tr>";
    });
    var refused = item("s9"), rr = refused.rows.map(function (r) {
      return "<tr><td>" + cell(r.cells[0]) + "</td><td><b>" + cell(r.cells[1]) + "</b></td><td class=\"sr-num\">" + cell(r.cells[2]) + "</td><td>" + control(r.inputs[0]) + "</td><td>" + control(r.inputs[1]) + "</td><td>" + control(r.inputs[2]) + "</td><td>" + control(r.inputs[3]) + "</td></tr>";
    });
    return table(["№ КП", "Заказчик", "Сумма", "Виды работ", "Статус", "Вероятность", "Посл. контакт", "След. контакт", "Комментарий"], rows, "sr-requests")
      + (rr.length ? '<h3 class="sr-subtitle sr-red-text">Отказы — причина и возврат</h3>' + table(["№ КП", "Заказчик", "Сумма", "Причина", "Вернуться?", "Когда", "Комментарий"], rr) : "");
  }
  function paymentsBlock() {
    var it = item("s2"), rows = it.rows.map(function (r) {
      return "<tr><td><b>" + cell(r.cells[1]) + "</b><small>" + cell(r.cells[2]) + "</small></td><td>" + control(r.inputs[0]) + "</td><td>" + control(r.inputs[1]) + "</td><td class=\"sr-num\">" + cell(r.cells[0]) + "</td><td>" + control(r.inputs[2]) + "</td></tr>";
    });
    return table(["Заказчик", "Виды работ", "Тип оплаты", "Сумма", "Комментарий"], rows) + (it.note ? '<p class="sr-note">' + E(it.note) + "</p>" : "");
  }
  function planFactBlock() {
    var it = item("s3"), pct = num(kv(it, "Выполнение")), plan = num(kv(it, "План")), fact = num(kv(it, "Факт"));
    return '<div class="sr-kpis"><div><span>План</span><b>' + E(kv(it, "План")) + '</b></div><div class="sr-green"><span>Факт</span><b>' + E(kv(it, "Факт")) + '</b></div><div class="sr-red"><span>Осталось</span><b>' + money(Math.max(0, plan - fact)) + '</b></div></div>'
      + '<div class="sr-progress"><i style="width:' + Math.min(100, pct) + '%"></i><span>' + E(kv(it, "Выполнение")) + '</span></div>'
      + '<div class="sr-grid2">' + field("s3:why", "Почему так?") + '<div>' + field("s3:action", "Что делаю?") + field("s3:date", "К какой дате") + "</div></div>";
  }
  function debtRows(it, prepay) {
    return it.rows.filter(function (r) { return !prepay || r.late; }).map(function (r) {
      var why = r.inputs[0] || {}, c = r.cells;
      return '<tr data-debtrow="1" data-why="' + E(why.v || "") + '"><td><b>' + cell(c[prepay ? 2 : 1]) + '</b><small>' + cell(c[prepay ? 1 : 0]) + "</small></td>"
        + '<td><span class="sr-pill ' + (prepay && c[0] && c[0].tone === "bad" ? "bad" : "warn") + '">' + (prepay ? "Предоплата" : "Долг") + "</span></td>"
        + '<td class="sr-num">' + cell(c[prepay ? 3 : 2]) + "</td><td>" + cell(c[prepay ? 4 : 3]) + "</td><td>" + (prepay ? cell(c[5]) : "—") + "</td>"
        + "<td>" + control(r.inputs[0]) + "</td><td>" + control(r.inputs[1]) + "</td><td>" + control(r.inputs[2]) + "</td></tr>";
    });
  }
  function debtBlock() {
    var pre = item("s4"), post = item("s6"), reasons = ["Ждёт согласования", "Нет бюджета", "Ждёт деньги от своего заказчика", "Ждёт акт", "Не отвечает", "Оспаривает", "Свой вариант"];
    var heads = ["Заказчик", "Тип", "Сумма", "Без оплаты", "Посл. контакт", "Почему не платят", "Следующий шаг", "Дата"];
    return '<div class="sr-filters"><span>Фильтр по причине:</span>' + reasons.map(function (x) { return '<button type="button" data-srfilter="' + E(x) + '">' + E(x) + "</button>"; }).join("") + '<button type="button" data-srfilter="">Все</button></div>'
      + '<h3 class="sr-subtitle">Предоплата по счетам</h3>' + table(heads, debtRows(pre, true), "sr-debt")
      + '<h3 class="sr-subtitle">Долги по выполненным работам</h3>' + table(heads, debtRows(post, false), "sr-debt")
      + '<div class="sr-comment">' + field("s5", "Оплата ещё не просрочена, но есть тревожные сигналы") + "</div>";
  }
  function customData() { return list((input("s7:custom") || {}).v); }
  function customRow(x, n) {
    return '<tr class="sr-planrow" data-custom="' + n + '" data-sum="' + num(x.sum) + '" data-prob="' + E(x.prob) + '"><td><input data-srcu="' + n + '|name" value="' + E(x.name) + '" placeholder="Заказчик"' + dis() + '></td>'
      + '<td><input data-srcu="' + n + '|sum" value="' + E(x.sum) + '" inputmode="numeric" placeholder="Сумма"' + dis() + '></td>'
      + '<td><input type="date" data-srcu="' + n + '|issued" value="' + E(x.issued) + '"' + dis() + '></td>'
      + '<td><input type="date" data-srcu="' + n + '|expect" value="' + E(x.expect) + '"' + dis() + '></td>'
      + '<td><input data-srcu="' + n + '|action" value="' + E(x.action) + '" placeholder="Что делаю"' + dis() + '></td>'
      + '<td><select data-srcu="' + n + '|prob"' + dis() + '>' + [["", "—"], ["high", "высокая"], ["mid", "средняя"], ["low", "низкая"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === x.prob ? " selected" : "") + '>' + o[1] + "</option>"; }).join("") + '</select></td>'
      + '<td><input type="date" data-srcu="' + n + '|next" value="' + E(x.next) + '"' + dis() + '></td></tr>';
  }
  function planBlock() {
    var it = item("s7"), groups = {}, lateKeys = {};
    item("s4").rows.forEach(function (r) { if (r.late) lateKeys[r.key] = 1; });
    it.rows.filter(function (r) { return !lateKeys[r.key]; }).forEach(function (r) { var g = r.cells[0] && r.cells[0].t ? r.cells[0].t : "Счета"; (groups[g] = groups[g] || []).push(r); });
    var body = '<div class="sr-plan-total" id="srPlanSummary"></div><div class="sr-plan-groups">';
    Object.keys(groups).forEach(function (g) {
      var rows = groups[g].map(function (r) {
        return '<tr class="sr-planrow" data-sum="' + num(r.cells[3]) + '" data-prob="' + E(r.inputs[0].v || "") + '"><td><b>' + cell(r.cells[2]) + "</b><small>КП " + cell(r.cells[1]) + '</small>' + (r.due ? '<small>срок оплаты ' + E(r.due) + '</small>' : "") + '</td><td class="sr-num">' + cell(r.cells[3]) + "</td><td>" + control(r.inputs[0]) + "</td><td>" + control(r.inputs[1]) + "</td><td>" + control(r.inputs[2]) + "</td></tr>";
      });
      body += '<h3 class="sr-subtitle">' + E(g) + '</h3>' + table(["Заказчик", "Сумма", "Вероятность", "Ожидаемая оплата", "След. контакт"], rows);
    });
    body += '<h3 class="sr-subtitle">Дополнительные клиенты</h3><div id="srCustom">' + table(["Заказчик", "Сумма", "КП отправлено", "Выставлю счёт", "Что делаю", "Вероятность", "След. контакт"], customData().map(customRow)) + '</div>'
      + (RO ? "" : '<button type="button" class="sr-add" data-sradd="1">＋ Добавить клиента</button>') + "</div>";
    var late = item("s8");
    if (late.rows.length) body += '<h3 class="sr-subtitle sr-red-text">КП без ответа более 3 рабочих дней</h3>' + table(["№ КП", "Заказчик", "Сумма", "Отправлено", "Без связи", "Следующий шаг"], late.rows.map(function (r) { return "<tr><td>" + cell(r.cells[0]) + "</td><td><b>" + cell(r.cells[1]) + "</b></td><td>" + cell(r.cells[2]) + "</td><td>" + cell(r.cells[3]) + "</td><td>" + cell(r.cells[4]) + "</td><td>" + control(r.inputs[0]) + "</td></tr>"; }));
    body += '<div class="sr-grid2 sr-comment">' + field("s7:real", "Реалистично ожидаю, ₽") + field(it.comment_key || "s7:note", "Комментарий") + "</div>";
    return body;
  }
  function communicationBlock() {
    var it = item("s10"), body = field("s10:score", "Насколько легко было общаться с заказчиками?") + field("s10:issues", "Что давалось тяжелее всего (можно несколько)");
    (it.inputs || []).forEach(function (i) {
      var m = /^s10:ex:(\d+)$/.exec(i.key); if (m) body += label(i.label + " — заказчик и что произошло", control(i), ' data-srdyn="s10:issues" data-n="' + (num(m[1]) - 1) + '"');
    });
    return body;
  }
  function timeBlock() {
    var it = item("s11"), body = field("s11:issues", "Что отнимало больше всего времени? (можно несколько)");
    (it.inputs || []).forEach(function (i) {
      var m = /^s11:detail:(\d+)$/.exec(i.key); if (!m) return;
      var kind = input("s11:kind:" + m[1]);
      body += '<div class="sr-detail" data-srdyn="s11:issues" data-n="' + (num(m[1]) - 1) + '">' + label(i.label + " — один случай", control(i)) + label("Это", control(kind)) + "</div>";
    });
    return body + field("s11:idea", "Что одно можно сделать удобнее?");
  }
  function channelsBlock() {
    var it = item("s13"), body = field("s13:channels", "Куда ещё писали и звонили заказчики?");
    (it.inputs || []).forEach(function (i) { var m = /^s13:action:(\d+)$/.exec(i.key); if (m) body += label(i.label + " — что сделал", control(i), ' data-srdyn="s13:channels" data-n="' + (num(m[1]) - 1) + '"'); });
    return body + field("s13:who", "С кем из заказчиков и что обсуждали", 'data-srother="1"');
  }
  function privateBlock() {
    return '<div class="sr-private"><b>Закрытый блок</b><span>Видят РОП и руководители. На общем экране созвона не показывается.</span></div>'
      + '<div class="sr-grid2">' + field("s12:best", "Что получилось лучше всего") + field("s12:worst", "Что получилось хуже всего") + "</div>"
      + field("s12:load", "Нагрузка") + field("s12:wellbeing", "Самочувствие (можно несколько)") + field("s12:vent", "Окно, чтобы просто выговориться");
  }
  function opinion() {
    var it = item("s14");
    if (!it.inputs.length) return "";
    return '<div class="sr-opinion"><div>' + field("s12:idea", "Что предлагаете изменить в работе, процессах или общении?") + "</div>"
      + (it.prev_idea ? '<div class="sr-previous"><b>Предложение с прошлой недели</b><span>' + E(it.prev_idea) + "</span></div>" : "") + "</div>";
  }
  function refreshDynamic() {
    document.querySelectorAll("[data-srdyn]").forEach(function (el) {
      var i = input(el.dataset.srdyn), selected = list(i && i.v), show = selected.indexOf((i.options || [])[+el.dataset.n]) >= 0;
      el.hidden = !show;
    });
    document.querySelectorAll("[data-srother]").forEach(function (el) { var ch = list((input("s13:channels") || {}).v); el.hidden = !ch.some(function (x) { return x !== "Только рабочие каналы"; }); });
  }
  function recalcPlan() {
    var total = 0, high = 0, count = 0;
    document.querySelectorAll(".sr-planrow").forEach(function (r) { var n = num(r.dataset.sum); total += n; count++; if (r.dataset.prob === "high") high += n; });
    var realistic = num((input("s7:real") || {}).v), el = document.getElementById("srPlanSummary");
    if (el) el.innerHTML = '<div><span>Клиентов</span><b>' + count + '</b></div><div class="sr-green"><span>Высокая вероятность</span><b>' + money(high) + '</b></div><div><span>Максимум</span><b>' + money(total) + '</b></div><div class="sr-blue"><span>Реалистично</span><b>' + (realistic ? money(realistic) : "—") + "</b></div>";
  }
  function saveNote(key, value) {
    var i = input(key); if (i) i.v = value;
    var st = document.getElementById("srStatus"); if (st) st.textContent = "Сохраняем…";
    return MPBC.call("/../ds/reports/sales/answer", { body: { start: WEEK, key: key, text: value } }).then(function () { if (st) st.textContent = "Сохранено"; }, function (e) { if (st) st.textContent = "Не сохранено: " + e; });
  }
  function saveCustom(data) { return saveNote("s7:custom", JSON.stringify(data)).then(recalcPlan); }
  function applyFilter() { document.querySelectorAll("[data-debtrow]").forEach(function (r) { r.hidden = !!FILTER && r.dataset.why !== FILTER; }); }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-sracc],[data-src],[data-srm],[data-srfilter],[data-sradd]") : null; if (!t) return;
    if (t.dataset.sracc) { t.closest(".sr-q").classList.toggle("open"); return; }
    if (t.dataset.srfilter != null) { FILTER = t.dataset.srfilter; document.querySelectorAll("[data-srfilter]").forEach(function (b) { b.classList.toggle("on", b === t); }); applyFilter(); return; }
    if (t.dataset.sradd) {
      var d = customData(); d.push({ name: "", sum: "", issued: "", expect: "", action: "", prob: "", next: "" });
      saveCustom(d).then(function () { document.getElementById("srCustom").innerHTML = table(["Заказчик", "Сумма", "КП отправлено", "Выставлю счёт", "Что делаю", "Вероятность", "След. контакт"], d.map(customRow)); recalcPlan(); }); return;
    }
    var key = t.dataset.src || t.dataset.srm; if (!key || RO) return;
    var i = input(key); if (!i) return;
    if (t.dataset.src) { i.v = i.v === t.dataset.val ? "" : t.dataset.val; }
    else {
      var vals = list(i.v), val = t.dataset.val, at = vals.indexOf(val); if (at >= 0) vals.splice(at, 1); else vals.push(val);
      if ((key === "s11:issues" && val === "Ничего не мешало") || (key === "s13:channels" && val === "Только рабочие каналы")) vals = at >= 0 ? [] : [val];
      else if (key === "s11:issues") vals = vals.filter(function (x) { return x !== "Ничего не мешало"; });
      else if (key === "s13:channels") vals = vals.filter(function (x) { return x !== "Только рабочие каналы"; });
      i.v = vals;
    }
    var group = t.closest("[data-chips]"); if (group) Array.prototype.forEach.call(group.querySelectorAll("button"), function (b) { b.classList.toggle("on", Array.isArray(i.v) ? i.v.indexOf(b.dataset.val) >= 0 : i.v === b.dataset.val); });
    saveNote(key, Array.isArray(i.v) ? JSON.stringify(i.v) : i.v).then(refreshDynamic); refreshDynamic();
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.srk) {
      var key = t.dataset.srk; saveNote(key, t.value);
      var row = t.closest("[data-debtrow]"); if (row) { row.dataset.why = t.value; applyFilter(); }
      if (key === "s7:real") recalcPlan();
      var planRow = t.closest(".sr-planrow"); if (planRow && /:prob$/.test(key)) { planRow.dataset.prob = t.value; recalcPlan(); }
    } else if (t.dataset && t.dataset.srkp) {
      var p = t.dataset.srkp.split("|"), i = input(p[2]); if (i) i.v = t.value;
      MPBC.call("/../ds/kp/" + p[0] + "/edit", { body: (function () { var b = {}; b[p[1]] = t.value; return b; })() });
      var pr = t.closest(".sr-planrow"); if (pr && p[1] === "pay_prob") { pr.dataset.prob = t.value; recalcPlan(); }
    } else if (t.dataset && t.dataset.srcu) {
      var parts = t.dataset.srcu.split("|"), d = customData(), n = +parts[0]; if (!d[n]) return; d[n][parts[1]] = t.value;
      var cr = t.closest(".sr-planrow"); if (parts[1] === "sum") cr.dataset.sum = num(t.value); if (parts[1] === "prob") cr.dataset.prob = t.value; saveCustom(d);
    }
  });

  window.DSSalesReport = {
    html: function (report, ro, viewer, tabs) {
      R = report; RO = ro; WEEK = report.week_start; FILTER = "";
      var s1 = item("s1"), s2 = item("s2"), s3 = item("s3"), s4 = item("s4"), s6 = item("s6"), s12 = item("s12");
      var q1 = s1.rows.length + " запросов · " + money(s1.rows.reduce(function (s, r) { return s + num(r.cells[2]); }, 0));
      var q2 = s2.rows.length + " оплат · " + money(s2.rows.reduce(function (s, r) { return s + num(r.cells[0]); }, 0));
      var q3 = "план " + kv(s3, "План") + " · факт " + kv(s3, "Факт") + " · " + kv(s3, "Выполнение");
      var latePre = s4.rows.filter(function (r) { return r.late; }), q4n = latePre.length + s6.rows.length, q4s = latePre.reduce(function (s, r) { return s + num(r.cells[3]); }, 0) + s6.rows.reduce(function (s, r) { return s + num(r.cells[2]); }, 0);
      var body = group("Запросы, оплаты", "sr-z-green", question(1, "Запросы", requestsBlock(), q1) + question(2, "Оплаты", paymentsBlock(), q2) + question(3, "Выполнение плана прошлой недели", planFactBlock(), q3))
        + group("Должники и риски", "sr-z-red", question(4, "Деньги, которые не пришли", debtBlock(), q4n + " строк · " + money(q4s)))
        + group("План на следующую неделю", "sr-z-blue", question(5, "План по оплатам на следующую неделю", planBlock(), '<span id="srPlanShort">расчёт по данным CRM</span>'))
        + group("Мнение", "sr-z-purple", opinion() + question(6, "Что в общении с заказчиками можно улучшить?", communicationBlock(), "") + question(7, "Что отнимало больше всего времени на этой неделе?", timeBlock(), "") + question(8, "Где ещё общались с заказчиками?", channelsBlock(), "") + (s12.inputs.length ? question(9, "Нагрузка и самочувствие", privateBlock(), "", true) : ""));
      var head = '<div class="sr-head"><div><h1>' + E(report.person || report.title) + ' <span>менеджер отдела продаж</span></h1><p>Неделя ' + E(report.week_start) + " — " + E(report.week_end) + " · " + (RO ? "просмотр" : "ваши ответы сохраняются автоматически") + '</p></div><div class="sr-actions"><div class="seg"><button data-rpnav="-1">← Пред.</button><button data-rpnav="0" class="on">Эта</button><button data-rpnav="1">След. →</button></div><button class="btn ghost" data-rpref="1">⟳ Обновить</button></div></div>'
        + (tabs ? '<div class="sr-tabs">' + tabs + "</div>" : "") + statusNote(RO ? "Только чтение" : "");
      setTimeout(function () { refreshDynamic(); recalcPlan(); }, 0);
      return '<div class="sr">' + head + body + "</div>";
    }
  };
})();
