/* Проекты DS — «Сегодня» руководителя продаж по макету 24.11 (#/today).
   Данные: /api/ds/today/rop (деньги, звонки по КП, пропущенные, итоги, должники, задачи).
   Действия — POST /today/rop/act; факты дня в 17:00 сами уходят в пятничный созвон. */
(function () {
  "use strict";
  var C = window.MPBC;
  var T = window.DSTodayRop = {};
  var S = { d: null, el: null, loading: false, at: 0, uid: null, dlg: null, err: "" };

  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return Number(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function api(p, b) { return C.call("/../ds" + p, b ? { body: b } : {}); }
  function toast(m) { if (window.toast) return window.toast(m); }
  var WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  function load() {
    S.loading = true;
    var uid = C.me && C.me.id;
    return api("/today/rop").then(function (d) { if (C.me && C.me.id === uid) { S.d = d; S.err = ""; S.at = Date.now(); } },
      function (e) { S.err = String(e && e.message || e); }).then(function () { S.loading = false; });
  }
  function reload() { return load().then(function () { if (visible()) paint(); }); }
  function visible() { return S.el && document.body.contains(S.el); }

  function headDate() { var d = new Date(); return WD[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()]; }

  /* ---------- диалог даты внутри карточки: S.dlg = {kind, ref, title, amount?} ---------- */
  function dlgHtml() {
    if (!S.dlg) return "";
    var v = S.dlg.value || new Date().toISOString().slice(0, 10);
    return '<div class="tr-dlg"><label>' + E(S.dlg.title) + '</label><input type="date" id="trDlgDate" value="' + v + '"' + (S.dlg.min ? ' min="' + S.dlg.min + '"' : "") + '>'
      + '<button class="btn primary sm" data-trdlgok="1">Сохранить</button><button class="btn ghost sm" data-trdlgx="1">Отмена</button></div>';
  }
  function act(kind, ref, extra) {
    var body = Object.assign({ kind: kind, ref: ref }, extra || {});
    return api("/today/rop/act", body).then(function () { S.dlg = null; toast("Записано"); return reload(); },
      function (e) { toast(String(e && e.message || e)); });
  }

  function tiles(d) {
    var callsLeft = d.calls.left;
    return '<div class="tr-tiles">'
      + '<div class="tr-tile"><div class="tr-tnum">' + d.calls.done + " из " + d.calls.goal + '</div><div class="tr-tlab">Звонки сегодня</div><div class="tr-tsub">Осталось позвонить: ' + callsLeft + '</div></div>'
      + '<div class="tr-tile"><div class="tr-tnum">' + money(d.week.got) + '</div><div class="tr-tlab">Оплаты ' + d.week.from + "–" + d.week.to + '</div><div class="tr-tsub">Не хватает до порога ' + money(d.week.goal) + ': ' + money(d.week.missing) + "</div></div>"
      + '<div class="tr-tile' + (d.due.count ? " hot" : "") + '"><div class="tr-tnum">' + money(d.due.sum) + '</div><div class="tr-tlab">Клиенты должны оплатить</div><div class="tr-tsub">в списке «Деньги сегодня»: ' + d.due.count + "</div></div>"
      + '<div class="tr-tile' + (d.kp_nodate ? " hot" : "") + '"><div class="tr-tnum">' + d.kp_nodate + '</div><div class="tr-tlab">КП без даты звонка</div><div class="tr-tsub">цель к пятнице ' + d.friday + ' — 0</div></div>'
      + '<div class="tr-tile' + (d.missed.length ? " hot" : "") + '"><div class="tr-tnum">' + d.missed.length + '</div><div class="tr-tlab">Пропущенные входящие</div><div class="tr-tsub">перезвонить в течение 30 минут</div></div></div>';
  }

  function missedHtml(d) {
    if (!d.missed.length) return "";
    return '<div class="panel tr-missed"><b>Пропущенные · перезвонить в первую очередь</b>' + d.missed.map(function (m) {
      return '<div class="tr-mrow"><div><b>' + E(m.who) + "</b>" + (m.kp ? " · " + E(m.kp) : "") + '<small>звонил ' + E(m.when) + " · " + E(m.phone) + '</small></div><div class="tr-mbtns">'
        + '<button class="btn ok sm" data-trmiss="' + m.call_id + ':done">Перезвонил</button><button class="btn ghost sm" data-trmiss="' + m.call_id + ':fail">Не дозвонился</button></div></div>';
    }).join("") + "</div>";
  }

  function moneyCard(m, d) {
    var isDlg = S.dlg && S.dlg.kind === "promise" && S.dlg.ref === m.ref;
    var btns = '<button class="btn primary sm" data-trpromise="' + m.ref + '" data-amount="' + Math.round(m.amount) + '">Оплатит: дата</button>'
      + (m.step >= 3 ? '<button class="btn ghost sm" data-tract="claim|' + m.ref + '">Отправил претензию</button>'
        : '<button class="btn ghost sm" data-tract="fix|' + m.ref + '">Зафиксировал письмом</button>')
      + '<button class="btn ghost sm" data-tract="money_noanswer|' + m.ref + '">Не дозвонился</button>';
    return '<div class="tr-card tr-money"><div class="tr-mh"><span class="tr-step s' + m.step + '">шаг ' + m.step + '</span><b>№' + E(m.number) + " · " + E(m.customer) + '</b><span class="tr-amt">' + money(m.amount) + "</span></div>"
      + '<div class="tr-mstat">' + E(m.status) + '</div>'
      + '<div class="tr-script">Что сказать: «' + E(m.script) + '»</div>'
      + '<div class="tr-mbtns">' + btns + (isDlg ? dlgHtml() : "") + "</div></div>";
  }

  function kpCard(k) {
    var isDlg = S.dlg && S.dlg.ref === k.ref;
    return '<div class="tr-card tr-kp"><div class="tr-mh"><b>КП №' + E(k.number) + " · " + E(k.customer) + '</b><span class="tr-amt">' + money(k.amount) + "</span></div>"
      + '<div class="tr-mstat">' + E(k.status) + (k.ctx ? " · " + E(k.ctx) : "") + '</div>'
      + '<div class="tr-script">Цель звонка: ' + E(k.goal) + '</div>'
      + '<div class="tr-mbtns"><button class="btn primary sm" data-trkp="agree|' + k.ref + '">Договорились: дата</button>'
      + '<button class="btn ghost sm" data-trkp="recall|' + k.ref + '">Перезвонить: дата</button>'
      + '<button class="btn ghost sm" data-trkp="noanswer|' + k.ref + '">Не дозвонился</button>'
      + '<button class="btn danger sm" data-trrefuse="' + k.ref + '">Отказ</button>' + (isDlg ? dlgHtml() : "") + "</div></div>";
  }

  function debtorsHtml(d) {
    var list = d.debtors || [];
    if (!list.length) return "";
    return '<div class="panel tr-debtors"><b>💰 Должники · ' + list.length + '</b> <small style="color:var(--muted)">договор подписан, срок оплаты прошёл — как раньше</small>'
      + list.map(function (x) {
        return '<div class="tr-mrow"><div><b>' + E(x.customer) + "</b> · " + E(x.contract_number || ("КП №" + x.number)) + '<small>' + E(x.object || "") + " · просрочка " + x.over_wd + ' р.д.</small></div><div class="tr-amt">' + money(x.debt) + "</div></div>";
      }).join("") + "</div>";
  }

  function refuseHtml(d) {
    if (!S.refuse) return "";
    return '<div class="tr-dlg"><label>Причина отказа</label><select id="trRefuseReason">' + d.refuse_reasons.map(function (r) { return "<option>" + E(r) + "</option>"; }).join("")
      + '</select><button class="btn primary sm" data-trrefuseok="' + S.refuse + '">Записать отказ</button><button class="btn ghost sm" data-trrefusex="1">Отмена</button></div>';
  }

  function tasksHtml(d) {
    var list = d.tasks || [];
    return '<div class="panel tr-tasks"><b>Мои задачи на сегодня · ' + list.length + '</b>'
      + (list.length ? list.map(function (t) {
        return '<div class="tr-mrow"><div>' + E(t.title) + (t.due ? '<small>к ' + E(t.due) + "</small>" : "") + '</div><button class="btn ghost sm" data-trtdone="' + t.id + '">Готово</button></div>';
      }).join("") : '<div class="note">На сегодня ничего. Добавь задачу кнопкой «+ Задача» сверху.</div>') + "</div>";
  }

  function summaryHtml(d) {
    var s = d.summary;
    return '<div class="panel tr-sum"><b>Итог дня</b><small class="tr-hint">в 17:00 уходит в пятничный отчёт сам — по фактам CRM и твоим отметкам</small><div class="tr-tiles sm">'
      + '<div class="tr-tile"><div class="tr-tnum">' + s.calls_done + " из " + d.calls.goal + '</div><div class="tr-tlab">Звонков сделано</div></div>'
      + '<div class="tr-tile"><div class="tr-tnum">' + s.promises_n + " · " + money(s.promises_sum) + '</div><div class="tr-tlab">Обещаний оплаты получено</div></div>'
      + '<div class="tr-tile"><div class="tr-tnum">' + s.kp_agreed + '</div><div class="tr-tlab">Договорились по КП</div></div>'
      + '<div class="tr-tile"><div class="tr-tnum">' + s.kp_refused + '</div><div class="tr-tlab">Отказов</div></div>'
      + '<div class="tr-tile"><div class="tr-tnum">' + s.no_answer + '</div><div class="tr-tlab">Не дозвонился</div></div></div></div>';
  }

  function cfgHtml(d) {
    if (!d.is_owner) return "";
    var c = d.cfg;
    return '<details class="tr-cfg"><summary>⚙ Настройки экрана (руководитель)</summary><div class="tr-dlg">'
      + '<label>Цель звонков в день</label><input type="number" id="trCfgCalls" value="' + c.call_goal + '">'
      + '<label>План оплат недели, ₽ (одновременно порог в созвоне)</label><input type="number" id="trCfgWeek" value="' + c.week_goal + '">'
      + '<label>«Нужна помощь» в месяц, раз</label><input type="number" id="trCfgHelp" value="' + c.help_limit + '">'
      + '<button class="btn primary sm" data-trcfg="1">Сохранить</button></div></details>';
  }

  function paint() {
    var d = S.d;
    if (!d) { S.el.innerHTML = '<div class="ds dspage tr"><div class="err">' + E(S.err || "Нет данных") + ' <button class="btn ghost sm" data-trreload="1">Обновить</button></div></div>'; return; }
    S.el.innerHTML = '<div class="ds dspage tr">'
      + '<div class="head"><div><h1>Сегодня, ' + headDate() + '</h1><p>' + E(d.greet) + '</p></div><div style="display:flex;gap:8px;align-items:center">'
      + '<span class="pill info">Мои задачи · ' + (d.tasks || []).length + '</span><button class="btn primary sm" data-trnewtask="1">+ Задача</button></div></div>'
      + tiles(d) + missedHtml(d)
      + '<div class="tr-sec"><h2>Деньги сегодня · ' + d.money.length + '</h2><small>Обещали оплату, ждём аванс, просрочка по договору · сверху то, где больше денег и дольше ждём · '
      + '<b>1</b> напоминание · <b>2</b> фиксируем дату письменно · <b>3</b> претензия от тебя по шаблону</small></div>'
      + '<div class="tr-cards">' + d.money.map(function (m) { return moneyCard(m, d); }).join("") + (d.money.length ? "" : '<div class="note">Всё оплачено — денег в работе нет 🎉</div>') + '</div>'
      + (d.money.length ? '<div class="tr-mbtns" style="margin:0 0 14px"><button class="btn ghost sm" data-trhelp="1"' + (d.help.used >= d.help.limit ? " disabled" : "") + '>Нужна помощь Дмитрия · в этом месяце: ' + d.help.used + " из " + d.help.limit + "</button></div>" : "")
      + '<div class="tr-sec"><h2>Звонки по КП · ' + d.kp.length + '</h2><small>Подобраны на сегодня: сумма × давность контакта · норма 10–15 в день</small></div>'
      + '<div class="tr-cards">' + d.kp.slice(0, d.calls.goal).map(kpCard).join("") + "</div>"
      + (d.kp.length > d.calls.goal ? '<div class="note">Ещё ' + (d.kp.length - d.calls.goal) + ' звонков в очереди — появятся, когда закроешь эти. Цель — «без даты» = 0 к пятнице.</div>' : "")
      + refuseHtml(d)
      + tasksHtml(d)
      + '<div class="tr-gap"></div>'
      + summaryHtml(d)
      + '<div class="tr-gap"></div>'
      + debtorsHtml(d)
      + cfgHtml(d)
      + "</div>";
  }

  /* ---------- действия ---------- */
  document.addEventListener("click", function (e) {
    if (!S.el || !S.el.contains(e.target)) return;
    var t = e.target.closest("button"); if (!t || t.disabled) return;
    var d = t.dataset;
    if (d.trreload) { reload(); return; }
    if (d.trnewtask) { if (window.DS && DS.newTask) DS.newTask({}); return; }
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
    if (S.uid !== C.me.id) { S.d = null; S.uid = C.me.id; S.dlg = null; }
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
