/* Проекты DS — «Сегодня» руководителя продаж по макету 24.11 (#/today). Структура и стили 1-в-1 по макету «Сегодня — Саша».
   Данные: /api/ds/today/rop; действия: POST /today/rop/act; итоги дня в 17:00 сами уходят в пятничный созвон. */
(function () {
  "use strict";
  var C = window.MPBC;
  var T = window.DSTodayRop = {};
  var S = { d: null, el: null, loading: false, at: 0, uid: null, dlg: null, refuse: null, err: "" };

  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return Number(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function api(p, b) { return C.call("/../ds" + p, b ? { body: b } : {}); }
  function toast(m) { if (window.toast) return window.toast(m); }
  var WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  function headDate() { var d = new Date(); return WD[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }

  function load() {
    S.loading = true;
    var uid = C.me && C.me.id;
    return api("/today/rop").then(function (d) { if (C.me && C.me.id === uid) { S.d = d; S.err = ""; S.at = Date.now(); } },
      function (e) { S.err = String(e && e.message || e); }).then(function () { S.loading = false; });
  }
  function reload() { return load().then(function () { if (visible()) paint(); }); }
  function visible() { return S.el && document.body.contains(S.el); }

  function dlgHtml() {
    if (!S.dlg) return "";
    var v = S.dlg.value || new Date().toISOString().slice(0, 10);
    return '<div class="tr-dlg"><label>' + E(S.dlg.title) + '</label><input type="date" id="trDlgDate" value="' + v + '"' + (S.dlg.min ? ' min="' + S.dlg.min + '"' : "") + '>'
      + '<button class="btn primary sm" data-trdlgok="1">Сохранить</button><button class="btn ghost sm" data-trdlgx="1">Отмена</button></div>';
  }
  function act(kind, ref, extra) {
    var body = Object.assign({ kind: kind, ref: ref }, extra || {});
    return api("/today/rop/act", body).then(function () { S.dlg = null; S.refuse = null; toast("Записано"); return reload(); },
      function (e) { toast(String(e && e.message || e)); });
  }

  function secHead(color, dark, badgeCls, title, count, sub) {
    return '<div class="tr-sec-h' + (dark ? " tr-h-dark" : "") + '" style="background:' + color + '"><h2>' + title + (count !== "" ? '<span class="tr-badge ' + (badgeCls || "") + '">' + count + "</span>" : "") + "</h2>" + (sub ? '<span class="tr-h-sub" style="color:' + (dark ? "#3d2a00" : "#fff") + '">' + sub + "</span>" : "") + "</div>";
  }

  /* ---------- плитки сводки: 4 цельных цветных блока ---------- */
  function tiles(d) {
    var b = d.calls.breakdown || { missed: 0, money: 0, kp: 0 };
    var callPct = Math.min(100, Math.round(d.calls.done / Math.max(1, d.calls.goal) * 100));
    var weekPct = Math.min(100, Math.round(d.week.got / Math.max(1, d.week.goal) * 100));
    return '<div class="tr-tiles">'
      + '<div class="tr-tile" style="background:#5b84c4"><span class="tr-t-lab">Звонки сегодня</span><div class="tr-t-num">' + d.calls.done + "<i>из " + d.calls.goal + '</i></div><div class="tr-t-bar"><i style="width:' + callPct + '%"></i></div><div class="tr-t-foot"><em>пропущенные ' + b.missed + " · деньги " + b.money + " · КП " + b.kp + '</em><strong>осталось ' + d.calls.left + "</strong></div></div>"
      + '<div class="tr-tile" style="background:#c0675f"><span class="tr-t-lab">Оплаты ' + d.week.from + "–" + d.week.to + '</span><div class="tr-t-num">' + money(d.week.got) + '</div><div class="tr-t-bar"><i style="width:' + weekPct + '%"></i></div><div class="tr-t-foot"><em>до порога ' + money(d.week.goal) + "</em><strong>" + (d.week.missing ? "не хватает " + money(d.week.missing) : "порог закрыт") + "</strong></div></div>"
      + '<div class="tr-tile" style="background:#a97d2e"><span class="tr-t-lab">Клиенты должны оплатить</span><div class="tr-t-num">' + money(d.due.sum) + '</div><div class="tr-t-foot"><em>список «Деньги сегодня»</em><strong>' + d.due.count + "</strong></div></div>"
      + '<div class="tr-tile" style="background:#7a66b0"><span class="tr-t-lab">КП без даты звонка</span><div class="tr-t-num">' + d.kp_nodate + "<i>КП</i></div><div class=\"tr-t-foot\"><em>к пятнице " + d.friday + '</em><strong>цель 0</strong></div></div></div>';
  }

  /* ---------- секции: рамка + цветная шапка + строки ---------- */
  function missedSec(d) {
    if (!d.missed.length) return "";
    return '<div class="tr-sec" style="border-color:#c0675f">' + secHead("#c0675f", false, "", "Пропущенные входящие", d.missed.length, "перезвонить в течение 30 минут")
      + d.missed.map(function (m) {
        return '<div class="tr-row"><div class="tr-row-l"><span class="tr-name">' + E(m.who) + (m.kp ? " · " + E(m.kp) : "") + '</span><span class="tr-status">звонил ' + E(m.when) + " · " + E(m.phone) + '</span></div><div class="tr-row-r"><div class="tr-btns">'
          + '<button class="btn ok sm" data-trmiss="' + m.call_id + ':done">Перезвонил</button><button class="btn ghost sm" data-trmiss="' + m.call_id + ':fail">Не дозвонился</button></div></div></div>';
      }).join("") + "</div>";
  }

  function moneySec(d) {
    var legend = '<span class="tr-legend"><b class="l1">1</b>напоминание</span> · <span class="tr-legend"><b class="l2">2</b>фиксируем дату письменно</span> · <span class="tr-legend"><b class="l3">3</b>претензия от тебя по шаблону</span>';
    return '<div class="tr-sec" style="border-color:#d9bc72">' + secHead("#ecd08f", true, "b-dark", "Деньги сегодня", d.money.length, "обещали оплату, ждём аванс, просрочка по договору · сверху больше денег и дольше ждём")
      + d.money.map(function (m) {
        var isDlg = S.dlg && S.dlg.kind === "promise" && S.dlg.ref === m.ref;
        return '<div class="tr-row"><div class="tr-row-l"><span><span class="tr-step s' + m.step + '">шаг ' + m.step + '</span> <span class="tr-name">№' + E(m.number) + " · " + E(m.customer) + '</span></span>'
          + '<span class="tr-status">' + E(m.status) + '</span>'
          + '<div class="tr-say"><b>Что сказать:</b> «' + E(m.script) + '»' + (isDlg ? dlgHtml() : "") + "</div></div>"
          + '<div class="tr-row-r"><span class="tr-amt2">' + money(m.amount) + '</span><div class="tr-btns">'
          + '<button class="btn primary sm" data-trpromise="' + m.ref + '" data-amount="' + Math.round(m.amount) + '">Оплатит: дата</button>'
          + (m.step >= 3 ? '<button class="btn ghost sm" data-tract="claim|' + m.ref + '">Отправил претензию</button>' : '<button class="btn ghost sm" data-tract="fix|' + m.ref + '">Зафиксировал письмом</button>')
          + '<button class="btn ghost sm" data-tract="money_noanswer|' + m.ref + '">Не дозвонился</button></div></div></div>';
      }).join("")
      + (d.money.length ? '<div class="tr-sec-f"><span>' + legend + '</span><button class="btn ghost sm" data-trhelp="1"' + (d.help.used >= d.help.limit ? " disabled" : "") + '>Нужна помощь Дмитрия · в этом месяце: ' + d.help.used + " из " + d.help.limit + "</button></div>" : "")
      + "</div>";
  }

  function kpSec(d) {
    return '<div class="tr-sec" style="border-color:#5b84c4">' + secHead("#5b84c4", false, "b-blue", "Звонки по КП", d.kp.length, "подобраны на сегодня: сумма × давность контакта · норма 10–15 в день")
      + d.kp.slice(0, d.calls.goal).map(function (k) {
        var isDlg = S.dlg && S.dlg.ref === k.ref;
        return '<div class="tr-row"><div class="tr-row-l"><span class="tr-name">КП №' + E(k.number) + " · " + E(k.customer) + '</span>'
          + '<span class="tr-status">' + E(k.status) + (k.ctx ? " · " + E(k.ctx) : "") + '</span>'
          + '<div class="tr-say"><b>Цель звонка:</b> ' + E(k.goal) + (isDlg ? dlgHtml() : "") + "</div></div>"
          + '<div class="tr-row-r"><span class="tr-amt2">' + money(k.amount) + '</span><div class="tr-btns">'
          + '<button class="btn primary sm" data-trkp="agree|' + k.ref + '">Договорились: дата</button>'
          + '<button class="btn ghost sm" data-trkp="recall|' + k.ref + '">Перезвонить: дата</button>'
          + '<button class="btn ghost sm" data-trkp="noanswer|' + k.ref + '">Не дозвонился</button>'
          + '<button class="btn danger sm" data-trrefuse="' + k.ref + '">Отказ</button></div></div></div>';
      }).join("")
      + '<div class="tr-sec-f"><span>Ещё ' + Math.max(0, d.kp.length - d.calls.goal) + ' звонков добавятся из очереди «без даты» (' + d.kp_nodate + ' КП), когда закроешь эти. Цель — «без даты» = 0 к пятнице.</span></div></div>';
  }

  function tasksSec(d) {
    var list = d.tasks || [];
    return '<div class="tr-sec" style="border-color:#8a99ae">' + secHead("#8a99ae", false, "", "Мои задачи на сегодня", list.length, "")
      + (list.length ? list.map(function (t) {
        return '<div class="tr-row"><div class="tr-row-l"><span class="tr-name">' + E(t.title) + '</span>' + (t.due ? '<span class="tr-status">к ' + E(t.due) + "</span>" : "") + '</div><div class="tr-row-r"><button class="btn ghost sm" data-trtdone="' + t.id + '">Готово</button></div></div>';
      }).join("") : '<div class="tr-hint">На сегодня ничего. Добавь задачу кнопкой «+ Задача» сверху.</div>') + "</div>";
  }

  function summarySec(d) {
    var s = d.summary;
    return '<div class="tr-sec" style="border-color:#4e9a6f">' + secHead("#4e9a6f", false, "", "Итог дня", "", "в 17:00 уходит в пятничный отчёт сам")
      + '<div class="tr-sumrow">'
      + '<div class="tr-sumit"><span>Звонков сделано</span><b>' + s.calls_done + " из " + d.calls.goal + "</b></div>"
      + '<div class="tr-sumit"><span>Обещаний оплаты получено</span><b>' + s.promises_n + " · " + money(s.promises_sum) + "</b></div>"
      + '<div class="tr-sumit"><span>Договорились по КП</span><b>' + s.kp_agreed + "</b></div>"
      + '<div class="tr-sumit"><span>Отказов</span><b>' + s.kp_refused + "</b></div>"
      + '<div class="tr-sumit"><span>Не дозвонился</span><b>' + s.no_answer + '</b></div></div></div>';
  }

  function refuseHtml(d) {
    if (!S.refuse) return "";
    return '<div class="tr-sec" style="border-color:#c0392b"><div class="tr-dlg" style="margin:12px 18px"><label>Причина отказа</label><select id="trRefuseReason">' + d.refuse_reasons.map(function (r) { return "<option>" + E(r) + "</option>"; }).join("")
      + '</select><button class="btn primary sm" data-trrefuseok="' + S.refuse + '">Записать отказ</button><button class="btn ghost sm" data-trrefusex="1">Отмена</button></div></div>';
  }

  function cfgHtml(d) {
    if (!d.is_owner) return "";
    var c = d.cfg;
    return '<details class="tr-cfg"><summary>⚙ Настройки экрана (руководитель)</summary><div class="tr-dlg">'
      + '<label>Цель звонков в день</label><input type="number" id="trCfgCalls" value="' + c.call_goal + '">'
      + '<label>План оплат недели, ₽ (порог в созвоне)</label><input type="number" id="trCfgWeek" value="' + c.week_goal + '">'
      + '<label>«Нужна помощь» в месяц, раз</label><input type="number" id="trCfgHelp" value="' + c.help_limit + '">'
      + '<button class="btn primary sm" data-trcfg="1">Сохранить</button></div></details>';
  }

  function paint() {
    var d = S.d;
    if (!d) { S.el.innerHTML = '<div class="ds dspage tr"><div class="err">' + E(S.err || "Нет данных") + ' <button class="btn ghost sm" data-trreload="1">Обновить</button></div></div>'; return; }
    S.el.innerHTML = '<div class="ds dspage tr">'
      + '<div class="tr-head"><div><h1 class="tr-h1">Сегодня, ' + headDate() + '</h1><div class="tr-sub">' + E(d.greet) + '</div></div>'
      + '<div class="tr-headbtns"><button class="btn ghost sm" data-trtasks="1">Мои задачи · ' + (d.tasks || []).length + '</button><button class="btn primary sm" data-trnewtask="1">+ Задача</button></div></div>'
      + tiles(d) + missedSec(d) + moneySec(d) + '<div class="tr-duo">' + tasksSec(d) + summarySec(d) + "</div>" + kpSec(d) + refuseHtml(d) + cfgHtml(d)
      + "</div>";
  }

  /* ---------- действия ---------- */
  document.addEventListener("click", function (e) {
    if (!S.el || !S.el.contains(e.target)) return;
    var t = e.target.closest("button"); if (!t || t.disabled) return;
    var d = t.dataset;
    if (d.trreload) { reload(); return; }
    if (d.trnewtask) { if (window.DS && DS.newTask) DS.newTask({}); return; }
    if (d.trtasks) { var secs = S.el.querySelectorAll(".tr-sec"), ts = secs[2]; if (ts) ts.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (d.trmiss) { var p = d.trmiss.split(":"); act(p[1] === "done" ? "missed_done" : "missed_fail", p[0]); return; }
    if (d.trpromise) { S.dlg = { kind: "promise", ref: d.trpromise, title: "Оплатит (дата)", amount: +d.amount || 0 }; paint(); return; }
    if (d.trkp) { var q = d.trkp.split("|"); S.dlg = { kind: q[0], ref: q[1], title: q[0] === "agree" ? "Договорились — следующий шаг (дата)" : "Перезвонить (дата)", min: new Date().toISOString().slice(0, 10) }; paint(); return; }
    if (d.tract) { var a = d.tract.split("|"); act(a[0], a[1]); return; }
    if (d.trrefuse) { S.refuse = d.trrefuse; paint(); return; }
    if (d.trrefuseok) { var rs = document.getElementById("trRefuseReason"); act("kp_refuse", d.trrefuseok, { reason: rs ? rs.value : "" }); return; }
    if (d.trrefusex) { S.refuse = null; paint(); return; }
    if (d.trhelp) { act("help", (S.d.money[0] || {}).ref || "", { note: "помощь по оплате" }); return; }
    if (d.trtdone) { api("/tasks/" + d.trtdone + "/done", {}).then(function () { toast("Готово"); reload(); }, function (er) { toast(String(er)); }); return; }
    if (d.trcfg) {
      api("/today/rop/cfg", { call_goal: +document.getElementById("trCfgCalls").value || 16, week_goal: +document.getElementById("trCfgWeek").value || 300000, help_limit: +document.getElementById("trCfgHelp").value || 2 })
        .then(function () { toast("Настройки сохранены"); reload(); }, function (er) { toast(String(er && er.message || er)); });
      return;
    }
    if (d.trdlgok) {
      var inp = document.getElementById("trDlgDate");
      if (!inp || !inp.value) return toast("Выберите дату");
      if (S.dlg.kind === "promise") act("promise", S.dlg.ref, { date: inp.value, amount: S.dlg.amount, note: "обещал " + inp.value });
      else if (S.dlg.kind === "agree") act("kp_agree", S.dlg.ref, { date: inp.value });
      else if (S.dlg.kind === "recall") act("kp_recall", S.dlg.ref, { date: inp.value });
      return;
    }
    if (d.trdlgx) { S.dlg = null; paint(); return; }
  });

  T.mount = function (el) {
    if (!el) return;
    S.el = el;
    if (!C || !C.loggedIn()) {
      el.innerHTML = '<div class="ds dspage tr"><div class="head"><div><h1>Сегодня</h1><p>Войдите, чтобы увидеть свой день</p></div><button class="btn primary" data-trlogin="1">Войти по PIN</button></div></div>';
      return;
    }
    if (S.uid !== C.me.id) { S.d = null; S.uid = C.me.id; S.dlg = null; S.refuse = null; }
    if (!S.d) el.innerHTML = '<div class="ds dspage tr"><div class="loading">Загружаю…</div></div>';
    else paint();
    if (S.loading) return;
    if (S.d && Date.now() - S.at < 15000) return;
    load().then(function () { if (visible()) paint(); });
  };
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-trlogin]");
    if (t && S.el && S.el.contains(t)) C.requireLogin().then(function () { T.mount(S.el); });
  });
  setInterval(function () { if (visible() && !document.hidden && C && C.loggedIn() && !S.loading && !(document.activeElement && S.el.contains(document.activeElement))) reload(); }, 120000);
})();
