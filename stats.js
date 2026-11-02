/* Проекты DS — «Статистика», блоки «Деньги» и «Продажи» (мост: /api/ds/stats → money, sales; план — /api/ds/stats/plan).
   ds.js вызывает DSStats.html(d) в начале раздела; ниже остаются «Проектировщики за месяц» и график КП. */
(function () {
  "use strict";
  var ST = window.DSStats = {};
  function C() { return window.MPBC; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function rub(n) { return Math.round(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function dm(iso) { return iso && iso.length >= 10 ? iso.slice(8, 10) + "." + iso.slice(5, 7) : "—"; }
  function plural(n, f) { var a = n % 10, b = n % 100; return n + " " + (a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2]); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  var MON_IN = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
  var PROB = { high: ["высокая", "ok"], mid: ["средняя", "warn"], low: ["низкая", "bad"], "": ["не указана", "mute"] };
  var SRC_COL = { call_out: "#2f6fbd", call_in: "#5a8fd0", tg: "#2aabee", max: "#7a4fb5", site: "#e07a3f", mail: "#1f9d63", none: "#9aa6ba" };
  var FUN_COL = ["#2f6fbd", "#7a4fb5", "#c98412", "#1f9d63"];

  var css = document.createElement("style");
  css.textContent = ""
    + ".dst-h{display:flex;align-items:baseline;gap:4px 10px;flex-wrap:wrap;margin:22px 0 12px}.dst-h h2{margin:0;font-size:1.1rem}.dst-h small{color:var(--muted)}"
    + ".dst-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.dst-2{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;margin-top:14px}"
    + ".dst-t{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--c);border-radius:16px;padding:14px 16px;min-width:0}"
    + ".dst-t .dst-v{font-size:1.45rem;font-weight:800;line-height:1.15}.dst-t .dst-l{color:var(--muted);font-size:.8rem;margin-top:3px}.dst-t .dst-x{margin-top:9px;font-size:.8rem;line-height:1.45;display:block;float:none;width:auto;height:auto;text-align:left}"
    + ".dst-bar{height:8px;background:var(--surface-2);border-radius:99px;overflow:hidden;margin-top:9px}.dst-bar b{display:block;height:100%;border-radius:99px;background:var(--ok)}"
    + ".dst-plan{display:inline-flex;gap:6px;align-items:center}.dst-plan input{width:110px;border:1px solid var(--line);border-radius:8px;padding:3px 7px;background:var(--surface);color:var(--ink);font:inherit;font-size:.8rem}"
    + ".dst-link{color:var(--brand);font-weight:700;cursor:pointer;background:none;border:0;padding:0;font:inherit;font-size:.8rem}"
    + ".dst-ok{color:var(--ok)}.dst-bad{color:var(--bad)}.dst-mute{color:var(--muted)}"
    + ".dst-tbl{width:100%;border-collapse:collapse;font-size:.84rem}.dst-tbl th{text-align:left;font-size:.72rem;color:var(--muted);font-weight:600;padding:7px 6px;border-bottom:1px solid var(--line)}"
    + ".dst-tbl td{padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:middle}.dst-tbl tr:last-child td{border-bottom:0}.dst-tbl .r{text-align:right;white-space:nowrap}"
    + ".dst-tbl tr[data-sto],.dst-tbl tr[data-stk]{cursor:pointer}.dst-tbl tr[data-sto]:hover td,.dst-tbl tr[data-stk]:hover td{background:var(--surface-2)}"
    + ".dst-tbl .tot td{font-weight:800;background:var(--surface-2)}.dst-tbl .subr td{color:var(--muted);font-size:.8rem}.dst-tbl .subr td:first-child{padding-left:24px}"
    + ".dst-pill{display:inline-block;font-size:.72rem;font-weight:700;border-radius:7px;padding:2px 8px;white-space:nowrap}"
    + ".dst-pill.ok{background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok)}.dst-pill.warn{background:color-mix(in srgb,var(--warn) 16%,transparent);color:var(--warn)}"
    + ".dst-pill.bad{background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad)}.dst-pill.mute{background:var(--surface-2);color:var(--muted)}"
    + ".dst-fun{display:flex;flex-direction:column;gap:10px}.dst-fs{display:grid;grid-template-columns:130px 1fr 96px;gap:10px;align-items:center}"
    + ".dst-fs .t{font-weight:700;font-size:.86rem}.dst-fs .t small{display:block;color:var(--muted);font-weight:500;font-size:.72rem}"
    + ".dst-fs .bb{height:28px;background:var(--surface-2);border-radius:9px;overflow:hidden}.dst-fs .bb b{display:flex;align-items:center;height:100%;padding-left:10px;color:#fff;font-weight:800;font-size:.84rem;border-radius:9px;min-width:30px}"
    + ".dst-fs .c{text-align:right;font-weight:700;font-size:.8rem}.dst-sp{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}"
    + ".dst-sp div{background:var(--surface-2);border-radius:12px;padding:10px 12px}.dst-sp b{display:block;font-size:1.2rem}.dst-sp span{color:var(--muted);font-size:.76rem}"
    + ".dst-rs{display:grid;grid-template-columns:140px 1fr 34px;gap:10px;align-items:center;margin-bottom:9px;font-size:.84rem}"
    + ".dst-rs .bb{height:10px;background:var(--surface-2);border-radius:9px;overflow:hidden}.dst-rs .bb b{display:block;height:100%;background:var(--bad);opacity:.75;border-radius:9px}.dst-rs .n{text-align:right;font-weight:700}"
    + ".dst-mini{display:inline-block;width:80px;height:7px;background:var(--surface-2);border-radius:9px;vertical-align:middle;overflow:hidden;margin-right:6px}.dst-mini b{display:block;height:100%;background:var(--ok)}"
    + ".dst-dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;vertical-align:middle}"
    + ".dst-empty{color:var(--muted);font-size:.84rem;padding:8px 0}.dst-scroll{overflow-x:auto}"
    + "@media (max-width:1100px){.dst-4{grid-template-columns:repeat(2,minmax(0,1fr))}.dst-2{grid-template-columns:1fr}}"
    + "@media (max-width:600px){.dst-4{grid-template-columns:1fr}.dst-fs{grid-template-columns:92px 1fr 70px}.dst-rs{grid-template-columns:110px 1fr 30px}}";
  document.head.appendChild(css);

  var debtAll = false, fcAll = false, planEdit = false;

  function tile(c, v, l, x) { return '<div class="dst-t" style="--c:' + c + '"><div class="dst-v">' + v + '</div><div class="dst-l">' + l + '</div><div class="dst-x">' + (x || "") + "</div></div>"; }

  function moneyHtml(d) {
    var m = d.money, r = m.received, mi = +d.month.slice(5, 7) - 1;
    var plan = planEdit
      ? '<span class="dst-plan"><input id="dstPlan" type="number" min="0" step="10000" value="' + (m.plan || "") + '" placeholder="план, ₽"><button class="dst-link" data-stplan="save">Сохранить</button></span>'
      : m.plan ? "<b>" + m.plan_pct + "%</b> от плана " + rub(m.plan) + ' · <button class="dst-link" data-stplan="edit">изменить</button>'
      : '<button class="dst-link" data-stplan="edit">Задать план на месяц</button>';
    var t1 = tile("var(--ok)", rub(r.total), "Поступило в " + MON_IN[mi] + " · оплаты задач (1С, бухгалтер)",
      (m.plan ? '<div class="dst-bar"><b style="width:' + Math.min(100, m.plan_pct || 0) + '%"></b></div>' : "") + plan
      + '<div class="dst-mute">аванс ' + rub(r.advance) + " · постоплата " + rub(r.post) + "</div>");
    var t2 = tile("var(--bad)", '<span class="' + (m.debt.total ? "dst-bad" : "") + '">' + rub(m.debt.total) + "</span>", "Дебиторка — сдано, не оплачено",
      plural(m.debt.n, ["задача", "задачи", "задач"]) + (m.debt.long ? ' · <b class="dst-bad">' + rub(m.debt.long) + "</b> ждём больше " + m.debt.long_days + " дней" : ""));
    var by = m.forecast.by;
    var t3 = tile("var(--accent,#7a4fb5)", rub(m.forecast.total), "Прогноз по открытым КП (с учётом вероятности)",
      "из " + m.forecast.n + " КП на " + rub(m.forecast.sum) + '<div class="dst-mute">высокая ' + rub(by.high) + " · средняя " + rub(by.mid) + " · низкая " + rub(by.low) + (by[""] ? " · не указана " + rub(by[""]) : "") + "</div>");
    var ch = m.check;
    var t4 = tile("var(--brand)", ch.n ? rub(ch.avg) : "—", "Средний чек договора · " + ch.n + " за месяц",
      (ch.delta != null ? '<span class="' + (ch.delta >= 0 ? "dst-ok" : "dst-bad") + '">' + (ch.delta >= 0 ? "▲ " : "▼ ") + Math.abs(ch.delta) + "%</span> к прошлому месяцу · " : "")
      + '<span class="dst-mute">поступлений на проектировщика ' + rub(ch.per_designer) + "</span>");
    var debt = m.debt.items, dl = debtAll ? debt : debt.slice(0, 8);
    var debtT = debt.length ? '<div class="dst-scroll"><table class="dst-tbl"><tr><th>Задача</th><th>Заказчик</th><th class="r">Сумма</th><th class="r">Сдано</th><th class="r">Ждём</th></tr>'
      + dl.map(function (x) { var t = x.days == null ? "mute" : x.days > 30 ? "bad" : x.days > 14 ? "warn" : "ok"; return '<tr data-sto="' + x.id + '"><td>№' + E(x.number) + " · " + E(x.object) + "</td><td>" + E(x.customer) + '</td><td class="r">' + rub(x.sum) + '</td><td class="r">' + dm(x.since) + '</td><td class="r"><span class="dst-pill ' + t + '">' + (x.days == null ? "—" : x.days + " дн.") + "</span></td></tr>"; }).join("")
      + '<tr class="tot"><td colspan="2">Всего · ' + debt.length + '</td><td class="r">' + rub(m.debt.total) + "</td><td></td><td></td></tr></table></div>"
      + (debt.length > dl.length ? '<button class="dst-link" data-stall="debt" style="margin-top:8px">Показать все ' + debt.length + "</button>" : "")
      : '<div class="dst-empty">Долгов нет — все сданные проекты оплачены</div>';
    var fc = m.forecast.items, fl = fcAll ? fc : fc.slice(0, 8);
    var fcT = fc.length ? '<div class="dst-scroll"><table class="dst-tbl"><tr><th>КП</th><th>Этап</th><th class="r">Сумма</th><th class="r">Ждём</th><th class="r">Вероятность</th></tr>'
      + fl.map(function (x) { var p = PROB[x.prob] || PROB[""]; return '<tr data-stk="' + x.id + '"><td>№' + E(x.number) + " · " + E(x.customer) + '</td><td class="dst-mute" style="white-space:nowrap;font-size:.76rem">' + E(x.status) + '</td><td class="r">' + rub(x.sum) + '</td><td class="r">' + (x.expect ? "до " + dm(x.expect) : "—") + '</td><td class="r"><span class="dst-pill ' + p[1] + '">' + p[0] + "</span></td></tr>"; }).join("")
      + '<tr class="tot"><td colspan="2">' + fc.length + ' КП</td><td class="r">' + rub(m.forecast.sum) + '</td><td></td><td class="r">≈ ' + rub(m.forecast.total) + "</td></tr></table></div>"
      + (fc.length > fl.length ? '<button class="dst-link" data-stall="fc" style="margin-top:8px">Показать все ' + fc.length + "</button>" : "")
      : '<div class="dst-empty">Открытых КП нет</div>';
    var w = m.forecast.weights || {};
    return '<div class="dst-h"><h2>Деньги</h2><small>поступления, дебиторка, прогноз</small></div><div class="dst-4">' + t1 + t2 + t3 + t4 + "</div>"
      + '<div class="dst-2"><div class="panel pad"><h3>Дебиторка: кому напомнить об оплате</h3><p class="sub">Задачи на «Сдано» без постоплаты, сначала самые давние. Клик — открыть задачу</p>' + debtT + "</div>"
      + '<div class="panel pad"><h3>Прогноз: какие КП должны оплатить</h3><p class="sub">Вероятность и ожидаемая дата — из «Пятничного созвона». Прогноз = сумма × вероятность (' + Math.round((w.high || 0) * 100) + " / " + Math.round((w.mid || 0) * 100) + " / " + Math.round((w.low || 0) * 100) + "%)</p>" + fcT + "</div></div>";
  }

  function salesHtml(d) {
    var s = d.sales, f = s.funnel, n0 = f[0].n || 1;
    var fun = f[0].n ? '<div class="dst-fun">' + f.map(function (x, i) {
      return '<div class="dst-fs"><div class="t">' + E(x.label) + (x.hint ? "<small>" + E(x.hint) + "</small>" : "") + '</div><div class="bb"><b style="width:' + Math.max(4, x.n / n0 * 100) + "%;background:" + FUN_COL[i] + '">' + x.n + '</b></div><div class="c">' + (i ? (x.step_pct == null ? "—" : x.step_pct + '% <span class="dst-mute">шага</span>') : "100%") + "</div></div>";
    }).join("") + "</div>" : '<div class="dst-empty">В этом месяце обращений в реестре КП нет</div>';
    var sp = s.speed;
    fun += '<div class="dst-sp"><div><b>' + (sp.lead_kp == null ? "—" : String(sp.lead_kp).replace(".", ",") + " дн.") + "</b><span>от обращения до КП" + (sp.lead_kp_n ? " · по " + sp.lead_kp_n + " КП" : "") + "</span></div>"
      + "<div><b>" + (sp.kp_pay == null ? "—" : String(sp.kp_pay).replace(".", ",") + " дн.") + "</b><span>от КП до оплаты" + (sp.kp_pay_n ? " · по " + sp.kp_pay_n + " КП" : "") + "</span></div></div>";
    var rf = s.refused, mx = Math.max.apply(null, rf.reasons.map(function (x) { return x[1]; }).concat([1]));
    var rs = rf.n ? rf.reasons.map(function (x) { return '<div class="dst-rs"><span>' + E(x[0]) + '</span><div class="bb"><b style="width:' + (x[1] / mx * 100) + '%"></b></div><span class="n">' + x[1] + "</span></div>"; }).join("")
      + (rf.back ? '<p class="sub" style="margin:10px 0 0">Есть смысл вернуться позже — ' + rf.back + "</p>" : "") : '<div class="dst-empty">Отказов в этом месяце нет</div>';
    var row = function (x, sub) {
      return "<tr" + (sub ? ' class="subr"' : "") + "><td>" + (sub ? "↳ " : '<span class="dst-dot" style="background:' + (SRC_COL[x.key] || "#9aa6ba") + '"></span>') + E(x.label) + '</td><td class="r">' + x.leads + '</td><td class="r">' + x.sent + '</td><td class="r">' + x.won + "</td>"
        + "<td>" + (sub ? x.conv + "%" : '<span class="dst-mini"><b style="width:' + x.conv + '%"></b></span>' + x.conv + "%") + '</td><td class="r">' + (sub ? rub(x.paid_sum) : "<b>" + rub(x.paid_sum) + "</b>") + '</td><td class="r">' + (x.won ? rub(x.avg) : "—") + "</td></tr>";
    };
    var tot = s.sources.reduce(function (a, x) { a.leads += x.leads; a.sent += x.sent; a.won += x.won; a.paid_sum += x.paid_sum; a.won_sum += x.won_sum; return a; }, { leads: 0, sent: 0, won: 0, paid_sum: 0, won_sum: 0 });
    var src = s.sources.length ? '<div class="dst-scroll"><table class="dst-tbl"><tr><th>Источник</th><th class="r">Обращений</th><th class="r">КП</th><th class="r">Договоров</th><th>Конверсия в договор</th><th class="r">Оплачено</th><th class="r">Средний чек</th></tr>'
      + s.sources.map(function (x) { return row(x) + x.sub.map(function (y) { return row(y, true); }).join(""); }).join("")
      + '<tr class="tot"><td>Итого</td><td class="r">' + tot.leads + '</td><td class="r">' + tot.sent + '</td><td class="r">' + tot.won + "</td><td>" + pct(tot.won, tot.leads) + '%</td><td class="r">' + rub(tot.paid_sum) + '</td><td class="r">' + (tot.won ? rub(tot.won_sum / tot.won) : "—") + "</td></tr></table></div>"
      : '<div class="dst-empty">Нет обращений за месяц</div>';
    return '<div class="dst-h"><h2>Продажи</h2><small>воронка за месяц и откуда приходят деньги</small></div>'
      + '<div class="dst-2"><div class="panel pad"><h3>Воронка: обращение → КП → договор → оплата</h3><p class="sub">КП с датой обращения в этом месяце и что с ними стало</p>' + fun + "</div>"
      + '<div class="panel pad"><h3>Причины отказов</h3><p class="sub">КП, ушедшие в «Отказ» за месяц · ' + rf.n + " шт.</p>" + rs + "</div></div>"
      + '<div class="panel pad" style="margin-top:14px"><h3>Источники: откуда приходят договоры и оплаты</h3><p class="sub">Источник — первый контакт заказчика: диалог (Telegram, MAX, почта, сайт с рекламой UTM) или звонок. «Оплачено» — сколько уже пришло по этим КП</p>' + src + "</div>";
  }

  ST.html = function (d) {
    if (!d || !d.money || !d.sales) return "";
    return moneyHtml(d) + salesHtml(d) + '<div class="dst-h"><h2>Проекты и проектировщики</h2><small>сдано за месяц, загрузка, КП по месяцам</small></div>';
  };

  function reload() { var el = document.getElementById("stats-app"); if (window.DS && el) DS.mount("stats", el); }
  document.addEventListener("click", function (e) {
    var el = document.getElementById("stats-app");
    if (!el || !el.contains(e.target)) return;
    var b = e.target.closest("[data-stplan],[data-stall],[data-sto],[data-stk]");
    if (!b) return;
    if (b.hasAttribute("data-sto")) { location.hash = "#/task/" + b.getAttribute("data-sto"); return; }
    if (b.hasAttribute("data-stk")) { location.hash = "#/kpreg/"; return; }
    if (b.hasAttribute("data-stall")) { if (b.getAttribute("data-stall") === "debt") debtAll = true; else fcAll = true; reload(); return; }
    var a = b.getAttribute("data-stplan");
    if (a === "edit") { planEdit = true; reload(); setTimeout(function () { var i = document.getElementById("dstPlan"); if (i) i.focus(); }, 300); return; }
    if (a === "save") {
      var i = document.getElementById("dstPlan"), month = (window.DS && DS.statsMonth && DS.statsMonth()) || "";
      C().call("/../ds/stats/plan", { body: { month: month, plan: +(i && i.value) || 0 } }).then(function () { planEdit = false; reload(); }, function (er) { if (window.toast) window.toast(String(er)); });
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "dstPlan") { var s = document.querySelector('[data-stplan="save"]'); if (s) s.click(); } });
})();
