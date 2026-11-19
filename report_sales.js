/* Пятничный созвон РОПа: 9 блоков 1 в 1 по утверждённому макету. Данные и сохранение — API ds_reports (мост). */
(function () {
  var R = null, RO = true, WEEK = "";
  var FILTER4 = null, MVO = false, CD = [];
  var AV = {}, KV = {};                                  // AV — ответы (ds_call_notes), KV — поля КП ("id|field")
  var SYSTEMS = ["СПС", "СОУЭ", "ВПВ", "АУП", "ОГЗ", "АО", "ИД"];
  var KC = { "СПС": "#2a65a0", "СОУЭ": "#2f8f5b", "ВПВ": "#1fa0c8", "АУП": "#d99a1f", "ОГЗ": "#d9603b", "АО": "#c0568f", "ИД": "#7a5fc0" };
  var TEMP_T = { h: "Горячий: запросил КП или назвал срок/бюджет, контакт в последние 3 р.д.", m: "Тёплый: отвечает, объект есть, срок и бюджет не названы", l: "Холодный: нет ответа 5+ р.д. или просто узнаёт цену" };
  var TEMP_L = { h: "горячий", m: "тёплый", l: "холодный" };
  var TEMP_C = { h: "h", m: "m2", l: "l" };
  var WHY4 = ["Ждёт согласования", "Нет бюджета", "Ждёт деньги от своего заказчика", "Ждёт акт", "Не отвечает", "Оспаривает", "Свой вариант"];
  var RC4 = { "Ждёт согласования": "c1", "Нет бюджета": "c2", "Ждёт акт": "c3", "Не отвечает": "c4", "Оспаривает": "c5", "Ждёт деньги от своего заказчика": "c6", "Свой вариант": "c7" };
  var LBL11 = { "Процесс": "в процессе", "ТЗ": "с ТЗ", "Сипуни": "в Сипуни", "CRM": "в CRM", "Взаимодействие с отделами": "во взаимодействии с отделами", "Жду оплату, сложно дожимать": "с дожимом оплаты", "Жду ответа от проектного отдела": "с ожиданием ответа проектного отдела", "Что делать, если клиент просит скидку": "с ответом на просьбу о скидке", "Как передать срочную задачу в проектный отдел": "с передачей срочной задачи в проектный отдел", "Много задач сразу, теряются приоритеты": "с приоритетами при большом числе задач", "Срочное перебивает плановое": "со срочными задачами, которые перебивают плановые", "Забываю, что обещал клиенту": "с обещаниями клиентам", "Не успеваю ответить всем в день обращения": "с ответами в день обращения", "Теряются сообщения в мессенджерах": "с сообщениями в мессенджерах", "Нет времени на дожим оплат": "с дожимом оплат", "Задачи копятся к концу недели": "с накоплением задач к концу недели", "Работаю допоздна, чтобы всё успеть": "с рабочим временем и переработками" };
  var WV13 = { "Личный Telegram": ["Переписывался в личном Telegram", "переписки"], "Личный MAX": ["Переписывался в личном MAX", "переписки"], "Личный телефон": ["Поговорил по личному телефону", "разговора"], "Личная почта": ["Переписывался по личной почте", "переписки"] };
  var NONE11 = "Ничего не мешало", OWN11 = "Свой вариант", ONLY13 = "Только рабочие каналы";
  var CHEV = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="#1d2733" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var LOCK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a2d82" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Закрытый блок" style="vertical-align:-4px;margin-left:6px"><rect x="5" y="10.5" width="14" height="10.5" rx="2.6"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.6" r="1.1" fill="#4a2d82" stroke="none"/></svg>';
  var SVGCAL = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5 2v3M11 2v3" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>';
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

  // --------------------------------------------------------------- helpers
  function E(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function item(id) { return (R.items || []).filter(function (x) { return x.id === id; })[0] || { inputs: [], rows: [], kv: [] }; }
  function list(v) { if (Array.isArray(v)) return v; if (!v) return []; try { var x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch (e) { return []; } }
  function num(v) { return parseInt(String(v == null ? "" : v).replace(/[^\d-]/g, ""), 10) || 0; }
  function fmt(n) { return (n || 0).toLocaleString("ru-RU"); }
  function kvs(it, k) { var x = (it.kv || []).filter(function (v) { return v[0] === k; })[0]; return x ? x[1] : "—"; }
  function dis() { return RO ? " disabled" : ""; }
  function plu(n, f1, f2, f5) { var a = Math.abs(n) % 10, b = Math.abs(n) % 100; return a === 1 && b !== 11 ? f1 : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f2 : f5; }
  function plr(n) { return plu(n, "запрос", "запроса", "запросов"); }
  function plp(n) { return plu(n, "оплата", "оплаты", "оплат"); }
  function plc(n) { return plu(n, "клиент", "клиента", "клиентов"); }
  function pld(n) { return n === 1 ? "долг" : n >= 2 && n <= 4 ? "долга" : "долгов"; }
  function plpr(n) { return plu(n, "предоплата", "предоплаты", "предоплат"); }
  function plnw(n) { return plu(n, "новый должник", "новых должника", "новых должников"); }
  function sgn(v) { return v >= 0 ? "▲ +" + fmt(v) : "▼ −" + fmt(-v); }
  function p2(n) { return n < 10 ? "0" + n : "" + n; }
  function todayD() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function isoToD(s) { return s && s.length >= 10 ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null; }
  function dmIso(s) { return s && s.length >= 10 ? s.slice(8, 10) + "." + s.slice(5, 7) : ""; }
  function dmyIso(s) { return s && s.length >= 10 ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(2, 4) : ""; }
  function pdDmy(s) { var m = /^(\d\d)\.(\d\d)\.(\d\d)$/.exec(s || ""); return m ? new Date(2000 + (+m[3]), +m[2] - 1, +m[1]) : null; }
  function fdt(d) { return p2(d.getDate()) + "." + p2(d.getMonth() + 1); }
  function isoOf(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dmyToIso(s) { var d = pdDmy(s); return d ? isoOf(d) : ""; }
  function addBD(d, n) { var x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n--; } return x; }
  function bdN(a, b) { var x = new Date(a), n = 0; while (x < b) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n++; } return n; }
  function status(t) { var st = document.getElementById("srStatus"); if (st) st.textContent = t; }

  function saveNote(key, value) {
    AV[key] = value;
    status("Сохраняем…");
    return MPBC.call("/../ds/reports/sales/answer", { body: { start: WEEK, key: key, text: value } }).then(function () { status("Сохранено"); }, function (e) { status("Не сохранено: " + e); });
  }
  function saveKp(kpId, field, value) {
    KV[kpId + "|" + field] = value;
    status("Сохраняем…");
    var b = {}; b[field] = value;
    return MPBC.call("/../ds/kp/" + kpId + "/edit", { body: b }).then(function () { status("Сохранено"); }, function (e) { status("Не сохранено: " + e); });
  }
  function saveKey(key, value) {                             // универсально: "kp:12|field" / "ak:key" / "cu:N|field"
    if (key.indexOf("kp:") === 0) { var p = key.slice(3).split("|"); return saveKp(p[0], p[1], value); }
    if (key.indexOf("cu:") === 0) {
      var q = key.slice(3).split("|"), n = +q[0];
      if (!CD[n]) return Promise.resolve();
      CD[n][q[1]] = value;
      return saveNote("s7:custom", JSON.stringify(CD));
    }
    return saveNote(key.indexOf("ak:") === 0 ? key.slice(3) : key, value);
  }

  function chipsRow(key, opts, multi) {
    var sel = multi ? list(AV[key]) : [String(AV[key] || "")];
    return '<div class="' + (multi ? "mcs" : "sg") + ' rq" data-' + (multi ? "akm" : "aks") + '="' + E(key) + '">' + opts.map(function (o) {
      return '<button type="button" class="' + (multi ? "mc" : "") + (sel.indexOf(String(o)) >= 0 ? " on" : "") + '" data-val="' + E(o) + '"' + dis() + '>' + E(o) + "</button>";
    }).join("") + "</div>";
  }
  function probSeg(key, val) {
    var PM = [["low", "l", "низкая"], ["mid", "m", "средняя"], ["high", "h", "высокая"]];
    return '<div class="sg s" data-aks="' + E(key) + '">' + PM.map(function (o) {
      return '<button type="button" data-p="' + o[1] + '" data-val="' + o[0] + '"' + (o[0] === val ? ' class="on"' : "") + dis() + '>' + o[2] + "</button>";
    }).join("") + "</div>";
  }
  function dateField(dmy, attrs) {
    return '<span class="dtw"><input class="in rq dtx" type="text" inputmode="numeric" maxlength="8" placeholder="дд.мм.гг" autocomplete="off" value="' + E(dmy || "") + '" ' + (attrs || "") + dis() + '>'
      + '<button type="button" class="dtb" aria-label="Выбрать дату в календаре"' + dis() + '>' + SVGCAL + '</button><input type="date" class="dth" tabindex="-1" aria-hidden="true"></span>';
  }
  function selOpts(cur, options) {                           // select со значением из списка + legacy-значение, если его нет в списке
    var opts = options.slice();
    if (cur && opts.indexOf(cur) < 0) opts.unshift(cur);
    return '<option value="">выбрать</option>' + opts.map(function (o) { return '<option' + (o === cur ? " selected" : "") + '>' + E(o) + "</option>"; }).join("");
  }
  function qa(n, bid, title, chipsHtml, bodyHtml, opt) {
    opt = opt || {};
    return '<div class="qa" data-q="' + n + '"><button class="qb" type="button"><span class="no">' + n + '</span><span class="t"><b>' + E(title) + (opt.lock ? " " + LOCK : "") + '</b>' + (opt.titleSmall ? "<small>" + E(opt.titleSmall) + "</small>" : "")
      + (chipsHtml || opt.plId ? '<span class="pl"' + (opt.plId ? ' id="' + opt.plId + '"' : "") + '>' + (chipsHtml || "") + "</span>" : "")
      + (opt.sub || "") + '</span><span class="ch">' + CHEV + '</span></button><div class="bx" id="' + bid + '">' + bodyHtml + "</div></div>";
  }
  function zone(vars, title, inner) {
    return '<div class="zn" style="' + vars + '"><div class="zh"><div><b class="big">' + E(title) + '</b></div></div><div class="zi">' + inner + "</div></div>";
  }
  function ac3(cls, t, cnt, right, body, open) {
    return '<div class="ac3 ' + cls + (open ? " open" : "") + '"><button class="acb" type="button" data-ac="1"><span>' + E(t) + " · " + cnt + "</span><span>" + (right || "") + " ▾</span></button>" + '<div class="bdy">' + body + "</div></div>";
  }
  function emptyNote() { return '<div class="sr-empty">Нет данных за выбранную неделю</div>'; }
  function sysDots(active, clickableKey) {
    return '<span class="cl' + (clickableKey ? " rq" : "") + '">' + SYSTEMS.map(function (k) {
      var on = active.indexOf(k) >= 0;
      return '<span class="m' + (clickableKey && on ? " on" : "") + '"' + (clickableKey ? ' data-sys="' + E(clickableKey) + "|" + E(k) + '" title="' + E(k) + '"' : "") + '><i class="' + (on ? "" : "o") + '"' + (on ? ' style="background:' + KC[k] + '"' : "") + "></i></span>";
    }).join("") + "</span>";
  }
  function cmpSpan(cmp, cur, pl) {                           // сравнение с прошлой неделей: ▲/▼ по количеству и сумме
    if (!cmp) return "";
    var prev = cur - cmp.ds, dp = prev > 0 ? Math.round(cmp.ds / prev * 100) : 0;
    return '<span class="cmpt' + (cmp.ds < 0 ? " dn" : "") + '">' + sgn(cmp.dn) + " " + pl(cmp.dn) + " · " + sgn(cmp.ds) + " ₽ (" + (cmp.ds >= 0 ? "+" : "−") + Math.abs(dp) + "%) к прошлой неделе</span>";
  }

  // --------------------------------------------------------------- блок 1: Запросы
  function ncell(kpId) {
    var d = dmIso(KV[kpId + "|next_contact"]);
    var h = '<input type="hidden" class="rq" value="' + E(d) + '"' + dis() + ">"
      + (d ? '<span class="nv">' + E(d) + '</span>' + (RO ? "" : '<button type="button" class="ned" data-nopen="' + kpId + '" aria-label="Изменить дату">✎</button>')
           : (RO ? '<span class="nv">—</span>' : '<button type="button" class="nbtn" data-nopen="' + kpId + '">Выбрать дату</button>'));
    return '<span class="nq" data-nk="' + kpId + '">' + h + "</span>";
  }
  function nin(kpId, open) {
    var d = dmIso(KV[kpId + "|next_contact"]);
    var h = '<input type="hidden" class="rq" value="' + E(d) + '"' + dis() + ">"
      + (d ? '<span class="nv">' + E(d) + '</span><button type="button" class="ned" data-nopen="' + kpId + '" aria-label="Изменить дату">✎</button>'
           : '<button type="button" class="nbtn" data-nopen="' + kpId + '">Выбрать дату</button>');
    if (open) h += '<div class="npop">' + [["Завтра", "b1"], ["3 р.д.", "b3"], ["5 р.д.", "b5"], ["2 недели", "w2"], ["Месяц", "m1"]].map(function (o) {
      return '<button type="button" data-nopt="' + o[1] + '" data-nk="' + kpId + '">' + o[0] + "</button>";
    }).join("") + '<label class="ncal">Своя дата <input type="date" class="ndt" data-nk="' + kpId + '"></label></div>';
    return h;
  }
  function renderN(kpId, open) {
    var el = document.querySelector('.sr .nq[data-nk="' + kpId + '"]');
    if (el) el.innerHTML = nin(kpId, open);
  }
  function rowQ(r) {
    var kpId = r.kp;
    var sv = (r.sv || "").split(/[;,]/).map(function (x) { return x.trim(); }).filter(function (x) { return SYSTEMS.indexOf(x) >= 0; });
    var lc = r.last_bd == null ? 99 : r.last_bd;
    var lq = lc >= 99 ? '<span class="lq r">—</span>' : '<span class="lq' + (lc >= 3 ? " r" : "") + '">' + (lc === 0 ? "сегодня" : lc + " р.д.") + "</span>";
    return '<div class="i r6"><span>' + E(r.cells[1]) + "</span>" + sysDots(sv, "")
      + '<div class="rt"><span class="pq ' + TEMP_C[r.temp || "m"] + '" title="' + E(TEMP_T[r.temp || "m"]) + '">' + TEMP_L[r.temp || "m"] + "</span>" + lq + ncell(kpId) + "<b>" + fmt(num(r.amt)) + "</b></div>"
      + '<input class="cmq" data-ak="s1:kp' + kpId + ':note" type="text" placeholder="Комментарий" aria-label="Комментарий к запросу" value="' + E(AV["s1:kp" + kpId + ":note"]) + '"' + dis() + "></div>";
  }
  function laneRows(items, body, total) {
    return items.length ? body + '<div class="i tt r6"><span>Итого</span><span></span><div class="rt"><span></span><span></span><span></span><b>' + fmt(total) + "</b></div><span></span></div>" : '<div class="sr-empty">Нет запросов в решении</div>';
  }
  function block1() {
    var s1 = item("s1"), refs = item("s9").rows || [];
    var rows = s1.rows.filter(function (r) { return !r.__skip; }), TORD = { h: 0, m: 1, l: 2 };
    rows.sort(function (a, b) {
      var t = (TORD[a.temp] == null ? 1 : TORD[a.temp]) - (TORD[b.temp] == null ? 1 : TORD[b.temp]);
      if (t) return t;
      var da = KV[a.kp + "|next_contact"] || "9999", db = KV[b.kp + "|next_contact"] || "9999";
      if (da !== db) return da < db ? -1 : 1;
      return num(b.amt) - num(a.amt);
    });
    var openSum = rows.reduce(function (s, r) { return s + num(r.amt); }, 0);
    var sold = s1.sold || [], soldSum = sold.reduce(function (s, r) { return s + num(r.amt); }, 0);
    var refSum = refs.reduce(function (s, r) { return s + num(r.amt != null ? r.amt : r.cells[2]); }, 0);
    var totalN = rows.length + sold.length + refs.length, totalS = openSum + soldSum + refSum;

    var cap = '<div class="i cap r6"><span>Заказчик</span><span class="cl">' + SYSTEMS.map(function (k) { return '<span class="m">' + k + "</span>"; }).join("") + '</span><div class="rt"><span>Вероятность</span><span>Посл. контакт</span><span>След. контакт</span><b>Сумма</b></div><span>Комментарий</span></div>';
    var lane = '<div class="lane wide" style="border:0;border-radius:0;background:transparent">' + cap + rows.map(rowQ).join("") + (rows.length ? '<div class="i tt r6"><span>Итого</span><span></span><div class="rt"><span></span><span></span><span></span><b>' + fmt(openSum) + "</b></div><span></span></div>" : '<div class="sr-empty">Нет запросов в решении</div>') + "</div>";

    function r1(list2) {
      return '<div class="r1 cap1"><span>Заказчик</span><span></span><b>Сумма</b></div>' + list2.map(function (r) {
        return '<div class="r1"><span>' + E(r.customer || r.cells[1]) + '</span><span class="vt">' + E((r.sv || "").split(";").join(", ")) + "</span><b>" + fmt(num(r.amt != null ? r.amt : r.cells[2])) + "</b></div>";
      }).join("") + '<div class="tt1"><span>Итого</span><span>' + fmt(list2.reduce(function (s, r) { return s + num(r.amt != null ? r.amt : r.cells[2]); }, 0)) + "</span></div>";
    }
    var dicts = R.dicts || {};
    var REFUSE = dicts.refuse && dicts.refuse.length ? dicts.refuse : ["Дорого", "Условия оплаты", "Сроки", "Дешевле у конкурента", "Выбрали другого (не по цене)", "Отложили", "Пропал", "Пока прицениваются", "Не наш профиль", "Другое (в комментарии)"];
    var BACK = dicts.refuse_back && dicts.refuse_back.length ? dicts.refuse_back : ["Да", "Нет"];
    var backShort = BACK.length === 2 && BACK[0] === "Да";      // новый справочник моста; старый — «Да, через месяц/позже»
    var ask5 = refs.map(function (r, i) {
      var kpId = r.kp, reason = KV[kpId + "|refuse_reason"] || "", back = KV[kpId + "|refuse_back"] || "";
      if (backShort) back = back === "Нет" ? "Нет" : back ? "Да" : "";
      var off = back === "Нет";
      return '<div class="ar5' + (i ? "" : " f") + '" data-row="1"><div class="an4"><b>' + E(r.cells[1]) + "</b>" + fmt(num(r.cells[2])) + " ₽</div>"
        + '<select class="in rq" data-akp="' + kpId + '|refuse_reason"' + dis() + ">" + selOpts(reason, REFUSE) + "</select>"
        + '<select class="in rq bk" data-akp="' + kpId + '|refuse_back"' + dis() + ">" + selOpts(back, BACK) + "</select>"
        + '<input class="in rq" data-after="1" data-ak="s1:rf:kp' + kpId + ':do" type="text" placeholder="Что делаю" value="' + E(AV["s1:rf:kp" + kpId + ":do"]) + '"' + (off || RO ? " disabled" : "") + ">"
        + '<span class="dtw"><input class="in rq dtx" data-after="1" data-akp="' + kpId + '|next_contact" type="text" inputmode="numeric" maxlength="8" placeholder="дд.мм.гг" autocomplete="off" value="' + E(dmyIso(KV[kpId + "|next_contact"])) + '"' + (off || RO ? " disabled" : "") + '><button type="button" class="dtb" aria-label="Выбрать дату в календаре"' + (off || RO ? " disabled" : "") + ">" + SVGCAL + '</button><input type="date" class="dth" tabindex="-1" aria-hidden="true"></span></div>';
    }).join("");
    var fin = refs.length ? '<div class="fin"><span class="lab">Ответ по отказам · ' + refs.length + '</span><div class="ar5 hd5"><span>Заказчик</span><span>Причина отказа</span><span>Смысл вернуться</span><span>Что делаю</span><span>Когда вернусь</span></div>' + ask5
      + '<div class="cmt"><input class="in" id="srRefC" data-ak="s1:refnote" type="text" placeholder="Комментарий (необязательно)" value="' + E(AV["s1:refnote"]) + '"' + dis() + "></div></div>" : "";

    var body = ac3("", "Запросы", rows.length, cmpSpan(s1.cmp, totalS, plr), lane, true)
      + '<div class="pair">' + ac3("ok", "Продано", sold.length, fmt(soldSum) + " ₽", sold.length ? r1(sold) : '<div class="sr-empty">Нет продаж</div>', false)
      + ac3("red", "Отказ", refs.length, fmt(refSum) + " ₽", refs.length ? r1(refs.map(function (r) { return { customer: r.cells[1], sv: r.cells[3], amt: r.cells[2] }; })) : '<div class="sr-empty">Нет отказов</div>', false) + "</div>" + fin;
    var chips = '<span><strong>' + totalN + "</strong> " + plr(totalN) + "</span><span><strong>" + fmt(totalS) + "</strong></span>"
      + (sold.length ? '<span class="g">продано <strong>' + sold.length + " · " + fmt(soldSum) + "</strong></span>" : "")
      + (refs.length ? '<span class="r">отказ <strong>' + refs.length + "</strong></span>" : "");
    return qa(1, "srb1", "Запросы", chips, body);
  }

  // --------------------------------------------------------------- блок 2: Оплаты
  function block2() {
    var s2 = item("s2"), rows = s2.rows || [];
    var PTC = { "Предоплата": "pre", "Доплата": "add", "Постоплата": "post" };
    var paySum = rows.reduce(function (s, r) { return s + num(r.cells[0]); }, 0);
    function rowP(r, n) {
      var sysI = (r.inputs || [])[0] || {}, kindI = (r.inputs || [])[1] || {}, noteI = (r.inputs || [])[2] || {};
      var sv = list(AV[sysI.key] !== undefined ? AV[sysI.key] : sysI.v);
      var kind = AV[kindI.key] !== undefined ? AV[kindI.key] : (kindI.v || "");
      return '<div class="i r6"><span>' + E(r.cells[1]) + "</span>" + sysDots(sv, sysI.key)
        + '<span class="tc"><select class="tsel rq ' + (PTC[kind] || "") + '" data-ak="' + E(kindI.key) + '" aria-label="Тип оплаты"' + dis() + '><option value="">Выбрать тип</option>'
        + ["Предоплата", "Доплата", "Постоплата"].map(function (t) { return "<option" + (t === kind ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></span>"
        + "<b>" + E(r.cells[0]) + '</b><input class="cmq" data-ak="' + E(noteI.key) + '" type="text" placeholder="Комментарий" aria-label="Комментарий к оплате" value="' + E(AV[noteI.key]) + '"' + dis() + "></div>";
    }
    var cap = '<div class="i cap r6"><span>Заказчик</span><span class="cl">' + SYSTEMS.map(function (k) { return '<span class="m">' + k + "</span>"; }).join("") + "</span><span>Тип оплаты</span><b>Сумма</b><span>Комментарий</span></div>";
    var lane = '<div class="payw"><div class="lane wide pay"><h4><span>Оплаты · ' + rows.length + "</span>" + cmpSpan(s2.cmp, paySum, plp) + "</h4>" + cap
      + rows.map(rowP).join("")
      + (rows.length ? '<div class="i tt r6"><span>Итого</span><span></span><span></span><b>' + fmt(paySum) + "</b><span></span></div>" : '<div class="sr-empty">Оплат за неделю нет</div>') + "</div></div>"
      + (s2.note ? '<p class="rl5">' + E(s2.note) + "</p>" : "");
    var chips = '<span><strong>' + rows.length + "</strong> " + plp(rows.length) + "</span><span><strong>" + fmt(paySum) + "</strong></span>"
      + (s2.new_req ? "<span>по новым запросам <strong>" + s2.new_req + "</strong></span>" : "");
    return qa(2, "srb2", "Оплаты", chips, lane);
  }

  // --------------------------------------------------------------- блок 3: План прошлой недели
  function block3() {
    var s3 = item("s3");
    var plan = num(kvs(s3, "План")), fact = num(kvs(s3, "Факт")), pct = num(kvs(s3, "Выполнение"));
    var thr = s3.threshold || 300000;
    var mon = isoToD(WEEK), fri = mon ? addBD(mon, 4) : null;
    var wlabel = mon ? "План на неделю " + mon.getDate() + "–" + fri.getDate() + " " + MONTHS[fri.getMonth()] : "План на неделю";
    var bar = '<div class="ptr"><div class="pfl" style="width:' + Math.min(100, pct) + '%"></div>'
      + (plan ? '<div class="pmk" style="left:' + Math.min(100, Math.round(thr / plan * 1000) / 10) + '%;background:#c0392b"></div><div class="pmt" style="left:' + Math.min(100, Math.round(thr / plan * 1000) / 10) + '%;color:#a5281b">Порог ' + fmt(thr) + '</div>' : "")
      + '<div class="pmk" style="left:100%;background:#2a65a0"></div><div class="pmt rr" style="left:100%;color:#1b4a7e">План ' + fmt(plan) + "</div></div>";
    var body = '<div class="plw"><div class="lane wide pl3"><h4><span>Выполнение плана прошлой недели</span><span class="cmpt' + (pct < 100 ? " dn" : "") + '">' + (plan ? pct + "% плана" : "план не задан") + "</span></h4>"
      + '<div class="pbd"><div class="pbig"><div><span>' + E(wlabel) + "</span><b>" + fmt(plan) + '</b></div><div><span>Факт</span><b class="g">' + fmt(fact) + '</b></div><div><span>Не хватило до плана</span><b class="r">' + fmt(Math.max(0, plan - fact)) + "</b></div></div>" + bar + '<div class="pun"><span>0</span></div></div></div></div>'
      + '<div class="fin"><div><textarea class="ta rq" data-ak="s3:why" placeholder="Почему так? Одной-двумя фразами" aria-label="Почему так"' + dis() + ">" + E(AV["s3:why"]) + '</textarea></div>'
      + '<div><div class="g3" style="margin-top:0"><input class="in rq" data-ak="s3:action" type="text" placeholder="Что делаю?" aria-label="Что делаю" value="' + E(AV["s3:action"]) + '"' + dis() + '><input class="in rq" data-ak="s3:date" type="date" aria-label="К какой дате" title="К какой дате" value="' + E(AV["s3:date"]) + '"' + dis() + "></div></div></div>";
    var chips = "<span>план <strong>" + fmt(plan) + "</strong></span><span>факт <strong>" + fmt(fact) + "</strong></span><span><strong>" + (plan ? pct + "%" : "—") + "</strong></span>";
    return qa(3, "srb3", "Выполнение плана прошлой недели", chips, body);
  }

  // --------------------------------------------------------------- блок 4: Деньги, которые не пришли
  function debtRow(r, i, pre) {
    var pref = pre ? "s4:" : "s6:";
    var whyKey = pref + r.key + ":why", wtKey = pref + r.key + ":whytext", doKey = pref + r.key;
    var why = AV[whyKey] || "", wt = AV[wtKey] || "";
    var lc = pre ? (r.last_bd == null || r.last_bd < 0 ? 99 : r.last_bd) : -1;
    var lq = !pre ? '<span class="lq">—</span>' : lc >= 99 ? '<span class="lq r">—</span>' : '<span class="lq' + (lc >= 3 ? " r" : "") + '">' + (lc === 0 ? "сегодня" : lc + " р.д.") + "</span>";
    var dt = pre
      ? '<input class="cmq rq" type="date" data-akp="' + r.kp + '|next_contact" aria-label="Дата следующего шага" value="' + E(KV[r.kp + "|next_contact"]) + '"' + dis() + ">"
      : '<input class="cmq rq" type="date" data-ak="' + E(doKey + ":date") + '" aria-label="Дата следующего шага" value="' + E(AV[doKey + ":date"]) + '"' + dis() + ">";
    return '<div class="i r6 drow" data-rsn="' + E(why) + '" data-sum="' + num(r.amt) + '">'
      + '<span class="dnm"><i class="n4">' + (i + 1) + '</i><b>' + E(r.cells[pre ? 2 : 1]) + '</b><small>' + E(r.sub || "") + '</small></span>'
      + '<span><span class="dpill ' + (pre ? "pre" : "debt") + '">' + (pre ? "Предоплата" : "Долг") + "</span></span>"
      + '<b class="sm">' + fmt(num(r.amt)) + '</b><span class="dd">' + (r.bd || 0) + ' р.д.</span><span>' + lq + "</span>"
      + '<span><span class="rsn ' + (RC4[why] || "c0") + '"><i class="rd"></i><select class="rsel rq" data-ak="' + E(whyKey) + '" aria-label="Почему не платят"' + dis() + ">" + selOpts(why, WHY4) + "</select>"
      + '<input class="cmq rq rown" data-ak="' + E(wtKey) + '" type="text" placeholder="Напишите свою причину" aria-label="Своя причина" value="' + E(wt) + '"' + (why === "Свой вариант" ? "" : " hidden") + dis() + "></span></span>"
      + '<span><input class="cmq rq" data-ak="' + E(doKey) + '" type="text" placeholder="Следующий шаг" aria-label="Следующий шаг" value="' + E(AV[doKey]) + '"' + dis() + "></span>"
      + "<span>" + dt + "</span></div>";
  }
  function block4() {
    var s4 = item("s4"), s6 = item("s6");
    var rows = s4.rows.filter(function (r) { return r.late; }).map(function (r) { r.__pre = true; return r; })
      .concat(s6.rows.map(function (r) { r.__pre = false; return r; }));
    rows.sort(function (a, b) { var ta = a.__pre ? 0 : 1, tb = b.__pre ? 0 : 1; return ta - tb || (a.bd || 0) - (b.bd || 0); });
    var tot = rows.reduce(function (s, r) { return s + num(r.amt); }, 0);
    var np = rows.filter(function (r) { return r.__pre; }).length, nd = rows.length - np;
    var cmp = "";
    if (s4.cmp4) {
      var nw = s4.cmp4["new"] || [], paid = s4.cmp4.paid || [];
      var nS = nw.reduce(function (s, x) { return s + num(x[1]); }, 0), pS = paid.reduce(function (s, x) { return s + num(x[1]); }, 0), dl = nS - pS;
      cmp = '<span class="sub" id="srcmp4"><span class="lbl">с прошлой недели</span>'
        + (nw.length ? '<span class="cr r">+' + nw.length + " " + plnw(nw.length) + " · " + fmt(nS) + " ₽</span>" : "")
        + (paid.length ? '<span class="cr g">−' + paid.length + " оплатили · " + fmt(pS) + " ₽</span>" : "")
        + (dl > 0 ? '<span class="cr r">итого долг вырос ▲ +' + fmt(dl) + " ₽</span>" : dl < 0 ? '<span class="cr g">итого долг уменьшился ▼ −' + fmt(-dl) + " ₽</span>" : '<span class="cr n">итого долг не изменился</span>')
        + "</span>";
    }
    var body = '<div class="rsum" id="srrsum4"></div>'
      + '<div class="payw"><div class="lane wide dbt"><h4><span>Деньги, которые не пришли · ' + rows.length + '</span><span class="cmpt dn">' + nd + " " + pld(nd) + " + " + np + " " + plpr(np) + " · " + fmt(tot) + " ₽</span></h4>"
      + '<div class="i cap r6"><span>Заказчик</span><span>Тип</span><span>Сумма</span><span>Без оплаты</span><span>Посл. контакт</span><span>Почему не платят</span><span>Следующий шаг</span><span>Дата след. контакта</span></div>'
      + (rows.length ? rows.map(function (r, i) { return debtRow(r, i, r.__pre); }).join("") : '<div class="sr-empty">Долгов нет</div>')
      + '<div class="i tt r6"><span>Итого</span><span></span><b>' + fmt(tot) + '</b><span></span><span></span><span></span><span></span><span></span></div></div></div>'
      + '<input class="dcm" data-ak="s4:note" type="text" placeholder="Комментарий (необязательно)" aria-label="Комментарий к вопросу 4" value="' + E(s4.comment || "") + '"' + dis() + ">";
    var chips = '<span class="r"><strong>' + rows.length + '</strong> строк</span><span class="r"><strong>' + fmt(tot) + '</strong></span><span class="r">самый долгий <strong>' + (s4.longest || 0) + "</strong> раб. дней</span>";
    return qa(4, "srb4", "Деньги, которые не пришли", chips, body, { sub: cmp });
  }
  function sum4() {
    var el = document.getElementById("srrsum4"); if (!el) return;
    var rows = document.querySelectorAll(".sr #srb4 .drow"), t = {};
    rows.forEach(function (r) { var k = r.dataset.rsn || ""; t[k] = t[k] || [0, 0]; t[k][0] += +r.dataset.sum; t[k][1]++; });
    var h = '<span class="rl">Застряло по причинам:</span>';
    Object.keys(RC4).concat([""]).forEach(function (k) {
      if (!t[k]) return;
      h += '<button type="button" class="rch ' + (RC4[k] || "c0") + (FILTER4 === null || FILTER4 === k ? "" : " off") + '" data-k="' + E(k) + '">' + E(k || "без причины") + " · " + fmt(t[k][0]) + " ₽ · " + t[k][1] + "</button>";
    });
    Object.keys(t).forEach(function (k) {                       // legacy-причины вне нового списка
      if (RC4[k] || k === "") return;
      h += '<button type="button" class="rch c0' + (FILTER4 === null || FILTER4 === k ? "" : " off") + '" data-k="' + E(k) + '">' + E(k) + " · " + fmt(t[k][0]) + " ₽ · " + t[k][1] + "</button>";
    });
    if (FILTER4 !== null) h += '<button type="button" class="rch rrs" data-k="__all">сбросить</button>';
    el.innerHTML = h;
    rows.forEach(function (r) { r.style.display = FILTER4 === null || (r.dataset.rsn || "") === FILTER4 ? "" : "none"; });
  }

  // --------------------------------------------------------------- блок 5: План по оплатам
  var THR5 = 300000;
  var CP1 = '<div class="gr cap cols1"><span>Заказчик</span><span>Сумма</span><span>Тип</span><span data-tip="Берётся из CRM автоматически: дата подписания договора или акта, а если акт отправлен и ещё не подписан, то дата отправки акта. Вручную не меняется.">Дата отсчёта <i class="inf">ⓘ</i></span><span data-tip="Срок оплаты по договору, в рабочих днях.">Срок оплаты <i class="inf">ⓘ</i></span><span>Вероятность</span><span>След. контакт</span></div>';
  var CP2 = '<div class="gr cap cols2"><span>Заказчик</span><span>Сумма</span><span data-tip="Правило: после отправки КП менеджер перезванивает клиенту через 3 р.д. Срок звонка считается автоматически.">КП отправлено <i class="inf">ⓘ</i></span><span>Выставлю счёт</span><span>Что делаю, чтобы оплатили</span><span>Вероятность</span><span>След. контакт</span></div>';
  function seg5cell(r) {
    var pre = r.type === "pre";
    var cls = pre ? "d" : r.ev === "Акт подписан" ? "s" : "o";
    var txt = pre ? "Счёт<br>выставлен" : r.ev === "Акт подписан" ? "Акт<br>подписан" : "Акт<br>отправлен";
    return '<span class="bs"><span class="seg5" title="Из CRM, вручную не меняется"><span class="sa ev-' + cls + '">' + txt + '</span><span class="sb">' + E(dmyIso(r.base)) + "</span></span></span>";
  }
  function g1Row(r) {
    var pre = r.type === "pre", kpId = r.kp || 0;
    var probKey = kpId ? "kp:" + kpId + "|pay_prob" : "s7:o" + r.oid + ":prob";
    var probVal = kpId ? KV[kpId + "|pay_prob"] || "" : AV[probKey] || "";
    var dt = kpId
      ? dateField(dmyIso(KV[kpId + "|next_contact"]), 'data-akp="' + kpId + '|next_contact"')
      : dateField(dmyIso(AV["s7:o" + r.oid + ":next"]), 'data-ak="s7:o' + r.oid + ':next"');
    return '<div class="gr cols1" data-t="' + E(r.type) + '" data-sum="' + num(r.amt) + '" data-nm="' + E(r.cells[2]) + '" data-d="' + E(dmyIso(r.base)) + '" data-s="' + (pre || r.ev === "Акт подписан" ? "s" : "o") + '" data-lim="' + (r.lim || "") + '">'
      + "<b>" + E(r.cells[2]) + '</b><b class="amt">' + fmt(num(r.amt)) + '</b><span class="tp ' + E(r.type) + '">' + (pre ? "предоплата" : "постоплата") + "</span>"
      + seg5cell(r) + '<span class="due"></span>' + probSeg(probKey, probVal) + dt + "</div>";
  }
  function kp5cell(kpId, dmy) { return '<span class="kpd"' + (kpId ? ' data-kp="' + kpId + '"' : "") + ' data-v="' + E(dmy || "") + '"></span>'; }
  function g2Row(r) {
    var kpId = r.kp;
    return '<div class="gr cols2" data-fix="1" data-sum="' + num(r.amt) + '"><b>' + E(r.cells[2]) + '</b><b class="amt">' + fmt(num(r.amt)) + "</b>"
      + kp5cell(kpId, dmyIso(r.issued))
      + dateField(dmyIso(KV[kpId + "|pay_expect"]), 'data-akp="' + kpId + '|pay_expect"')
      + '<input type="text" data-ak="s7:kp' + kpId + ':do" placeholder="Что делаю, чтобы оплатили" value="' + E(AV["s7:kp" + kpId + ":do"]) + '"' + dis() + ">"
      + probSeg("kp:" + kpId + "|pay_prob", KV[kpId + "|pay_prob"] || "")
      + dateField(dmyIso(KV[kpId + "|next_contact"]), 'data-akp="' + kpId + '|next_contact"') + "</div>";
  }
  function cuRow(i) {
    var x = CD[i] || {};
    return '<div class="gr cols2" data-cur="' + i + '">'
      + '<input type="text" class="nm5" data-cu="' + i + '|name" placeholder="Заказчик" value="' + E(x.name) + '"' + dis() + ">"
      + '<input type="text" class="sum5" data-cu="' + i + '|sum" inputmode="numeric" placeholder="Сумма" value="' + E(x.sum) + '"' + dis() + ">"
      + '<span class="kpd" data-cukp="' + i + '" data-v="' + E(dmyIso(x.issued)) + '"></span>'
      + dateField(dmyIso(x.expect), 'data-cu="' + i + '|expect"')
      + '<input type="text" data-cu="' + i + '|action" placeholder="Что делаю, чтобы оплатили" value="' + E(x.action) + '"' + dis() + ">"
      + probSeg("cu:" + i + "|prob", x.prob || "")
      + dateField(dmyIso(x.next), 'data-cu="' + i + '|next"') + "</div>";
  }
  function cuSet(attr, value) {
    var p = attr.split("|"), n = +p[0];
    if (!CD[n]) return;
    CD[n][p[1]] = value;
    saveNote("s7:custom", JSON.stringify(CD));
  }
  function grp5(k, t, cap, rows, add) {
    return '<div class="grp ' + k + '" id="srgp' + k.slice(1) + '"><h5><span>' + t + ' <small>· <span class="cn5">0</span></small><span class="kpc"></span></span><span class="sm5">0 ₽</span></h5>' + cap + rows
      + (add && !RO ? '<div class="gr" style="border-top:1px solid rgba(0,0,0,.07)"><button class="add" type="button" data-add="' + add + '">+ Добавить клиента</button></div>' : "") + "</div>";
  }
  function block5() {
    var s7 = item("s7");
    THR5 = item("s3").threshold || 300000;
    var lateKeys = {};
    item("s4").rows.forEach(function (r) { if (r.late) lateKeys[r.key] = 1; });
    var g1 = [], g2 = [];
    (s7.rows || []).forEach(function (r) {
      if (r.g === "k1" && !r.late && !lateKeys[r.key]) g1.push(r);
      else if (r.g === "k2") g2.push(r);
    });
    var body = '<div class="tot5"><div class="a">Высокая вероятность<b id="srt51">0</b><i class="mini">оценка менеджера «высокая»</i><i class="thr" id="srt5h"></i></div><div class="b">Возможно<b id="srt5v">0</b><i>«средняя» и «низкая»</i></div><div class="d">Максимум, если оплатят все<b id="srt54">0</b><i>все счета в плане, без КП</i></div><div class="c">Надеюсь<b id="srt52">0</b><i>КП без счёта, в прогноз не входит</i></div></div>'
      + '<div class="mv5" id="srmv5" hidden></div><div class="p5w">'
      + grp5("k1", "Счёт отправлен", CP1, g1.map(g1Row).join(""), 0)
      + grp5("k2", "С выставленным КП", CP2, g2.map(g2Row).join("") + CD.map(function (x, i) { return cuRow(i); }).join(""), 2)
      + "</div>"
      + '<p class="rl5">Срок оплаты считается автоматически в рабочих днях. <b>Предоплата:</b> 5 дней с выставления счёта. <b>Постоплата:</b> 5 дней с подписания акта, а если акт отправлен и ждёт подписи, то 10 дней с отправки. Дата и статус счёта или акта подтягиваются из CRM автоматически. Просрочил срок: строка уходит в «Деньги, которые не пришли». Строки идут по срочности: сверху тот, у кого срок оплаты ближе, а при одинаковом сроке выше высокая вероятность. Для КП: перезвонить клиенту нужно через 3 р.д. после отправки, дальше статус «звонок просрочен», и такие КП идут первыми.</p>'
      + '<div class="fin"><div class="real"><div><span class="lb2">Реалистично ожидаю</span><input class="in" id="srreal5" data-ak="s7:real" type="text" inputmode="numeric" placeholder="сумма" value="' + E(AV["s7:real"]) + '"' + dis() + '></div><div><span class="lb2">Комментарий</span><input class="in" data-ak="s7:note" type="text" placeholder="Необязательно" value="' + E(s7.comment || "") + '"' + dis() + "></div></div></div>";
    return qa(5, "srb5", "План по оплатам на следующую неделю", "", body, { plId: "srchips5" });
  }
  function kpSt(d) {
    var due = addBD(d, 3), t0 = todayD().getTime(), dt = due.getTime();
    if (t0 < dt) return { c: "o", a: "до", b: fdt(due) };
    if (t0 === dt) return { c: "w", a: "сегодня", b: fdt(todayD()) };
    return { c: "r", a: "просрочен", b: bdN(due, todayD()) + " р.д." };
  }
  function renderKp(el) {
    var v = el.dataset.v || "", d = pdDmy(v);
    if (d) {
      var st = kpSt(d);
      el.innerHTML = '<b class="dt5" tabindex="0" title="Нажмите, чтобы изменить дату · с отправки прошло ' + bdN(d, todayD()) + ' р.д.">' + E(v) + '</b><span class="kpg kpg-' + st.c + '"><span class="ka">Звонок<br>' + st.a + '</span><span class="kb">' + st.b + "</span></span>";
    } else el.innerHTML = '<b class="dt5 ph" tabindex="0">дд.мм.гг</b>';
  }
  function editKp(el) {
    if (RO) return;
    el.innerHTML = dateField("", "");
    var i = el.querySelector(".dtx");
    i.value = el.dataset.v || "";
    i.focus();
  }
  function commitKp(el) {
    var inp = el.querySelector(".dtx");
    if (!inp) return;
    var iso = dmyToIso(inp.value);
    el.dataset.v = iso ? dmyIso(iso) : el.dataset.v || "";
    if (el.dataset.kp) saveKp(el.dataset.kp, "issued_date", iso);
    else if (el.dataset.cukp != null) { var n = +el.dataset.cukp; if (CD[n]) { CD[n].issued = iso; saveNote("s7:custom", JSON.stringify(CD)); } }
    renderKp(el);
    recalc5();
    sortG2(false);
  }
  function recalc5() {
    var TODAY = todayD(), mv = [], ms = 0, s1 = 0, c1 = 0, pt = 0, pv = 0;
    document.querySelectorAll(".sr #srgp1 .gr[data-t]").forEach(function (r) {
      var sum = +r.dataset.sum, pre = r.dataset.t === "pre", base = pdDmy(r.dataset.d), signed = pre || r.dataset.s === "s", lim = +r.dataset.lim || (signed ? 5 : 10), due = r.querySelector(".due"), st = "", h = "";
      if (!base) h = '<small class="stc n">укажите дату</small>';
      else {
        var n = bdN(base, TODAY), dd = addBD(base, lim);
        if (n > lim) { st = "m"; mv.push({ nm: r.dataset.nm, sum: sum, late: n - lim }); ms += sum; }
        else if (signed && n >= 4) { st = "w"; h = "<b>до " + fdt(dd) + '</b><span class="stc w' + (n === lim ? " last" : "") + '">' + (n === lim ? "последний день" : "срок истекает") + "</span>"; }
        else if (!signed) { st = "u"; h = "<b>до " + fdt(dd) + '</b><span class="stc u">ждём подписи · ' + n + " из " + lim + " дн.</span>"; }
        else h = "<b>до " + fdt(dd) + '</b><span class="stc ok">осталось ' + (lim - n) + " р.д.</span>";
      }
      due.dataset.tip = pre ? "Предоплата: 5 р.д. с выставления счёта. Дальше — в «Деньги, которые не пришли»." : signed ? "Постоплата: 5 р.д. с подписания акта. Дальше — в «Деньги, которые не пришли»." : "Акт отправлен, ждём подписи: 5 р.д. на приёмку и 5 на оплату, всего до 10 р.д. с отправки.";
      due.innerHTML = h;
      r.style.display = st === "m" ? "none" : "";
      if (st !== "m") { s1 += sum; c1++; var pbh = r.querySelector(".sg.s button.on"); if (pbh && pbh.textContent.trim() === "высокая") pt += sum; else pv += sum; }
    });
    var g1el = document.getElementById("srgp1");
    if (g1el) { g1el.querySelector(".cn5").textContent = c1 + " " + plc(c1); g1el.querySelector(".sm5").textContent = fmt(s1) + " ₽"; }
    var t51 = document.getElementById("srt51"); if (t51) t51.textContent = fmt(pt);
    var th = document.getElementById("srt5h");
    if (th) { th.textContent = "Порог безубыточности " + fmt(THR5); th.className = "thr " + (pt >= THR5 ? "ok" : "no"); }
    var t5v = document.getElementById("srt5v"); if (t5v) t5v.textContent = fmt(pv);
    var g = document.getElementById("srgp2"), sum2 = 0, c2 = 0;
    if (g) {
      g.querySelectorAll(".gr[data-fix]").forEach(function (r) { sum2 += +r.dataset.sum; c2++; });
      g.querySelectorAll(".gr:not([data-fix]):not(.cap)").forEach(function (r) {
        var nm = r.querySelector(".nm5"), sm5 = r.querySelector(".sum5");
        if (!nm) return;
        var v = num(sm5.value);
        r.dataset.sum = v;
        sum2 += v;
        if (nm.value.trim() || v) c2++;
      });
      g.querySelector(".cn5").textContent = c2 + " " + plc(c2);
      g.querySelector(".sm5").textContent = fmt(sum2) + " ₽";
    }
    var t52 = document.getElementById("srt52"); if (t52) t52.textContent = fmt(sum2);
    var t54 = document.getElementById("srt54"); if (t54) t54.textContent = fmt(s1);
    var mb = document.getElementById("srmv5");
    if (mb) {
      mb.hidden = !mv.length;
      if (mv.length) {
        var mn = mv.map(function (x) { return x.nm; }).join(", ");
        mb.innerHTML = '<button type="button" class="mvt" aria-expanded="' + (MVO ? "true" : "false") + '" title="Перешли в «Деньги, которые не пришли»"><span class="mvg">' + mv.length + " " + (mv.length === 1 ? "перешёл" : "перешли") + ' в долги</span><span class="mvs">' + E(mn) + " · <b>" + fmt(ms) + " ₽</b> · в план не входят</span><span class=\"mva\">" + (MVO ? "скрыть ▴" : "показать ▾") + '</span></button><div class="mvb"' + (MVO ? "" : " hidden") + '><div class="mvh">Перешли в «Деньги, которые не пришли»</div><div class="mvr mvc"><span>Заказчик</span><span>Сумма</span><span>Просрочка</span></div>' + mv.map(function (x) { return '<div class="mvr"><span>' + E(x.nm) + "</span><b>" + fmt(x.sum) + " ₽</b><span>" + x.late + " р.д.</span></div>"; }).join("") + "</div>";
      } else mb.innerHTML = "";
    }
    var re5 = document.getElementById("srreal5"), re = re5 ? num(re5.value) : 0, od = 0;
    document.querySelectorAll(".sr #srgp2 .kpd").forEach(function (el) { var dd = pdDmy(el.dataset.v || ""); if (dd && TODAY.getTime() > addBD(dd, 3).getTime()) od++; });
    var kc = document.querySelector(".sr #srgp2 .kpc");
    if (kc) kc.innerHTML = od ? '<span class="kps r" style="margin-left:10px">звонок просрочен: ' + od + "</span>" : "";
    var ch = document.getElementById("srchips5");
    if (ch) ch.innerHTML = "<span><strong>" + (c1 + c2) + "</strong> " + plc(c1 + c2) + "</span><span>ждём <strong>" + fmt(s1) + "</strong></span>" + (od ? '<span class="r">КП без звонка <strong>' + od + "</strong></span>" : "") + (re ? "<span>реалистично <strong>" + fmt(re) + "</strong></span>" : "");
  }
  var PRK5 = { "высокая": 0, "средняя": 1, "низкая": 2 };
  function sortG1(force) {
    var g = document.getElementById("srgp1");
    if (!g) return;
    var ae = document.activeElement;
    if (!force && ae && ae.closest && ae.closest("#srgp1") && /^(INPUT|SELECT)$/.test(ae.tagName)) return;
    var rows = Array.prototype.slice.call(g.querySelectorAll(".gr[data-t]"));
    function key(r) {
      var base = pdDmy(r.dataset.d), pre = r.dataset.t === "pre", signed = pre || r.dataset.s === "s", lim = +r.dataset.lim || (signed ? 5 : 10), d = base ? addBD(base, lim).getTime() : 9e15, pb = r.querySelector(".sg.s button.on"), t = pb ? pb.textContent.trim() : "";
      return [d, PRK5[t] !== undefined ? PRK5[t] : 3];
    }
    var ks = rows.map(function (r, i) { return { r: r, i: i, k: key(r) }; });
    ks.sort(function (a, b) { return a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i; });
    if (ks.every(function (x, i) { return x.r === rows[i]; })) return;
    ks.forEach(function (x) { g.appendChild(x.r); });
  }
  function sortG2(force) {
    var g = document.getElementById("srgp2");
    if (!g) return;
    var ae = document.activeElement;
    if (!force && ae && ae.closest && ae.closest("#srgp2") && /^(INPUT|SELECT)$/.test(ae.tagName)) return;
    var rows = Array.prototype.slice.call(g.querySelectorAll(".gr[data-fix]"));
    var ks = rows.map(function (r, i) { var el = r.querySelector(".kpd"), d = el ? pdDmy(el.dataset.v || "") : null; return { r: r, i: i, k: d ? addBD(d, 3).getTime() : 9e15 }; });
    ks.sort(function (a, b) { return a.k - b.k || a.i - b.i; });
    if (ks.every(function (x, i) { return x.r === rows[i]; })) return;
    var ref = g.querySelector(".gr:not(.cap):not([data-fix])");
    ks.forEach(function (x) { g.insertBefore(x.r, ref); });
  }
  function wrapC() {
    document.querySelectorAll(".sr .p5w .gr").forEach(function (r) {
      if (r.dataset.w || r.querySelector(".add")) return;
      r.dataset.w = 1;
      Array.prototype.slice.call(r.children).forEach(function (c) { var w = document.createElement("div"); w.className = "c"; r.insertBefore(w, c); w.appendChild(c); });
    });
  }
  function tipInit(root) {
    if (document.getElementById("srtip5")) return;
    var t = document.createElement("div");
    t.id = "srtip5";
    root.appendChild(t);
    document.addEventListener("mouseover", function (e) {
      var el = e.target.closest && e.target.closest(".sr [data-tip]");
      if (!el) { t.style.display = "none"; return; }
      t.textContent = el.dataset.tip;
      t.style.display = "block";
      var r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, l = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)), tp = r.bottom + 6;
      if (tp + h > window.innerHeight - 8) tp = Math.max(8, r.top - h - 6);
      t.style.left = l + "px";
      t.style.top = tp + "px";
    });
    document.addEventListener("mouseleave", function () { t.style.display = "none"; });
  }

  // --------------------------------------------------------------- Мнение: предложения (loop5)
  var PL = [];                                                 // предложения прошлых недель [{week,text,status}]
  function it5html(x) {
    return '<div class="it5"' + (RO ? "" : ' data-sgst="' + E(x.week) + '" title="Нажмите — перенести в «Сделано»/«В работе»"') + ">" + E(x.text) + "</div>";
  }
  function st5Inner() {
    var done = PL.filter(function (x) { return x.status === "done"; }), work = PL.filter(function (x) { return x.status !== "done"; });
    return '<p class="ct5 hd5"><span>Ваши предложения с прошлой недели</span></p>'
      + '<div class="sub5 ok5"><p class="ct5"><span>Сделано</span></p>' + (done.map(it5html).join("") || '<div class="it5">—</div>') + "</div>"
      + '<div class="sub5 wk5"><p class="ct5"><span>В работе</span></p>' + (work.map(it5html).join("") || '<div class="it5">—</div>') + "</div>";
  }
  function loopBlock() {
    var right = PL.length ? '<div class="col5 st5b" id="srst5">' + st5Inner() + "</div>" : "";
    return '<div class="loop5"><div class="k5"><div class="col5 nw5"><textarea class="ta" data-ak="s12:idea" data-opt="1" rows="4" aria-label="Что предлагаете изменить?" placeholder="Что бы Вы изменили в работе, процессах или общении с заказчиками?"' + dis() + ">" + E(AV["s12:idea"]) + "</textarea></div>" + right + "</div></div>";
  }

  // --------------------------------------------------------------- блок 6 (s10): общение с заказчиками
  function opts(key) {
    var found = null;
    (R.items || []).forEach(function (it) { (it.inputs || []).forEach(function (i) { if (i.key === key) found = i; }); });
    return found && found.options && found.options.length ? found.options : [];
  }
  function sc10() {
    var v = String(AV["s10:score"] || ""), b = "";
    for (var i = 1; i <= 10; i++) b += '<button type="button" data-val="' + i + '"' + (String(i) === v ? ' class="on"' : "") + dis() + ">" + i + "</button>";
    return '<div class="sg rq sc10" data-aks="s10:score"><span class="se">совсем нет</span>' + b + '<span class="se">очень</span></div>';
  }
  function q10Inner() {
    var issues = opts("s10:issues"), sel = list(AV["s10:issues"]), multi = sel.length > 1;
    var fidx = sel.length ? issues.indexOf(sel[0]) + 1 : 0;
    var single = fidx
      ? '<input class="in" id="srs10" data-ak="s10:ex:' + fidx + '" type="text" placeholder="Коротко" value="' + E(AV["s10:ex:" + fidx]) + '"' + dis() + (multi ? " hidden" : "") + ">"
      : '<input class="in" id="srs10" type="text" placeholder="Сначала выберите, что давалось тяжелее" disabled>';
    var m = sel.map(function (k) {
      var idx = issues.indexOf(k) + 1;
      if (!idx) return "";
      return '<div class="ex10" data-k="' + E(k) + '"' + (multi ? "" : " hidden") + '><span class="chn">' + E(k) + '</span><input class="in" data-ak="s10:ex:' + idx + '" type="text" placeholder="Коротко" value="' + E(AV["s10:ex:" + idx]) + '"' + dis() + "></div>";
    }).join("");
    return '<span class="lb2">Один пример <small>заказчик и что произошло</small></span>' + single + '<div id="srm10">' + m + "</div>";
  }
  function block6() {
    var body = '<div class="fin"><div><span class="lb2">Насколько легко было общаться с заказчиками на этой неделе?</span>' + sc10() + "</div>"
      + '<div><span class="lb2">Что давалось тяжелее всего <small>(можно несколько)</small></span>' + chipsRow("s10:issues", opts("s10:issues"), true) + "</div>"
      + '<div id="srq10c">' + q10Inner() + "</div></div>";
    return qa(6, "srb10", "Что в общении с заказчиками можно улучшить?", "", body);
  }
  function sync10() { var el = document.getElementById("srq10c"); if (el) el.innerHTML = q10Inner(); later(); }

  // --------------------------------------------------------------- блок 7 (s11): что отнимало время
  function p11Inner() {
    var issues = opts("s11:issues"), sel = list(AV["s11:issues"]);
    return sel.filter(function (k) { return k !== NONE11; }).map(function (k) {
      if (k === OWN11) return '<div class="pr11" data-k="' + E(k) + '"><span class="lb2">Свой вариант</span><input class="in rq" data-ak="s11:detail:16" type="text" placeholder="Напишите, что ещё отнимало время и силы" aria-label="Свой вариант" value="' + E(AV["s11:detail:16"]) + '"' + dis() + "></div>";
      var idx = issues.indexOf(k) + 1;
      if (!idx) return "";
      var kv = AV["s11:kind:" + idx] || "";
      return '<div class="pr11" data-k="' + E(k) + '"><span class="lb2">Что именно не так ' + E(LBL11[k] || k) + '? <small>(один случай)</small></span><div class="r11">'
        + '<input class="in rq" data-ak="s11:detail:' + idx + '" type="text" placeholder="Например: искал историю звонков клиента, потратил 20 минут" aria-label="Что не так: ' + E(k) + '" value="' + E(AV["s11:detail:" + idx]) + '"' + dis() + ">"
        + '<div class="sg rq t11" data-aks="s11:kind:' + idx + '">' + ["Ошибка", "Хочу функцию"].map(function (o) { return '<button type="button" data-val="' + o + '"' + (kv === o ? ' class="on"' : "") + dis() + ">" + o + "</button>"; }).join("") + "</div></div></div>";
    }).join("");
  }
  function block7() {
    var none = list(AV["s11:issues"]).indexOf(NONE11) >= 0;
    var body = '<div class="fin"><div><span class="lb2"><small>(можно несколько)</small></span>' + chipsRow("s11:issues", opts("s11:issues"), true) + "</div>"
      + '<div id="srp11">' + p11Inner() + "</div>"
      + '<div id="srn11"' + (none ? "" : " hidden") + '><span class="lb2">Что одно можно сделать удобнее?</span><input class="in" data-ak="s11:idea" type="text" placeholder="Необязательно: одна идея, что улучшить" value="' + E(AV["s11:idea"]) + '"' + dis() + "></div></div>";
    return qa(7, "srb11", "Что отнимало больше всего времени на этой неделе?", "", body, { titleSmall: "то, что можно было сделать быстрее" });
  }
  function sync11() {
    var p = document.getElementById("srp11"); if (p) p.innerHTML = p11Inner();
    var n = document.getElementById("srn11"); if (n) n.hidden = list(AV["s11:issues"]).indexOf(NONE11) < 0;
    later();
  }

  // --------------------------------------------------------------- блок 8 (s13): другие каналы
  function w13Inner() {
    var chs = opts("s13:channels");
    return list(AV["s13:channels"]).filter(function (t) { return WV13[t]; }).map(function (ch) {
      var idx = chs.indexOf(ch) + 1, v = WV13[ch];
      var acts = [v[0] + ", после " + v[1] + " зафиксировал в CRM", "Перевёл в CRM", "Пока продолжаю там", "Не успел перевести в CRM"];
      var cur = list(AV["s13:action:" + idx]).map(function (x) { return x === "Зафиксировал в CRM" ? acts[0] : x; });
      return '<div class="wch" data-ch="' + E(ch) + '"><span class="lb3">' + E(ch) + '</span><div class="mcs" data-akm="s13:action:' + idx + '">'
        + acts.map(function (o) { return '<button type="button" class="mc' + (cur.indexOf(o) >= 0 ? " on" : "") + '" data-val="' + E(o) + '"' + dis() + ">" + E(o) + "</button>"; }).join("") + "</div></div>";
    }).join("");
  }
  function block8() {
    var other = list(AV["s13:channels"]).some(function (x) { return x && x !== ONLY13; });
    var body = '<div class="fin"><div><span class="lb2">Куда ещё писали и звонили заказчики <small>(можно несколько)</small></span>' + chipsRow("s13:channels", opts("s13:channels"), true) + "</div>"
      + '<div class="x13"' + (other ? "" : " hidden") + '><span class="lb2">Что с этим сделал <small>(по каждому каналу, можно несколько)</small></span><div id="srw13g">' + w13Inner() + "</div></div>"
      + '<div class="x13"' + (other ? "" : " hidden") + '><span class="lb2">С кем из заказчиков</span><input class="in rq" data-ak="s13:who" type="text" placeholder="Заказчик и что обсуждали" value="' + E(AV["s13:who"]) + '"' + dis() + "></div></div>";
    return qa(8, "srb13", "Где ещё общались с заказчиками?", "", body);
  }
  function syncW() {
    var g = document.getElementById("srw13g"); if (g) g.innerHTML = w13Inner();
    var other = list(AV["s13:channels"]).some(function (x) { return x && x !== ONLY13; });
    document.querySelectorAll(".sr #srb13 .x13").forEach(function (d) { d.hidden = !other; });
    later();
  }

  // --------------------------------------------------------------- блок 9 (s12): нагрузка и самочувствие
  function block9() {
    var s12 = item("s12");
    if (!(s12.inputs || []).length) return "";
    var body = '<div class="fin"><div class="priv stk"><div class="prow"><span class="pl2">' + LOCK + '</span><div><b>Закрытый блок.</b> Попробуйте ответить максимально честно, мы не осудим.</div></div><div class="vwho"><div class="vy"><b>Видят:</b> РОП и руководители</div><div class="vn"><b>Не видят:</b> коллеги, на общем экране не показывается. На общем созвоне мы не будем это обсуждать</div></div></div>'
      + '<div class="g2"><div class="col"><div><span class="lb2">Нагрузка <small>(нам важно знать, чтобы вовремя помочь)</small></span>' + chipsRow("s12:load", opts("s12:load"), false) + "</div>"
      + '<div class="grow"><span class="lb2">Окно, чтобы просто выговориться 😉</span><textarea class="ta" data-opt="1" data-ak="s12:vent" placeholder="Можно с юмором и эмоциями. Здесь можно всё, кроме оскорблений людей"' + dis() + ">" + E(AV["s12:vent"]) + "</textarea></div></div>"
      + "<div><span class=\"lb2\">Самочувствие <small>(можно несколько)</small></span>" + chipsRow("s12:wellbeing", opts("s12:wellbeing"), true) + "</div></div></div>";
    return qa(9, "srb12", "Нагрузка и самочувствие", "", body, { lock: true });
  }

  // --------------------------------------------------------------- подсветка незаполненного
  var OPTRE = /Необязательно|Комментар/i, pend = false;
  function isReq(el) {
    if (el.type === "hidden" || el.disabled) return false;
    if (el.matches(".dth,.ndt")) return false;
    if (el.closest(".rsn,.stw")) return false;
    var ph = el.getAttribute("placeholder") || "";
    if (el.hasAttribute("data-opt")) return false;
    if (OPTRE.test(ph)) return false;
    if (el.classList.contains("cmq") && !el.classList.contains("rq")) return false;
    if (el.classList.contains("dcm")) return false;
    return true;
  }
  function mark() {
    pend = false;
    document.querySelectorAll(".sr input,.sr textarea,.sr select").forEach(function (el) {
      el.classList.toggle("miss", isReq(el) && String(el.value).trim() === "");
    });
    document.querySelectorAll(".sr .sg.rq,.sr .mcs.rq").forEach(function (g) {
      g.classList.toggle("miss", !g.querySelector(".on"));
    });
  }
  function later() { if (pend) return; pend = true; setTimeout(mark, 0); }

  function refCState() {
    var c = document.getElementById("srRefC");
    if (!c) return;
    var any = false;
    document.querySelectorAll(".sr #srb1 .ar5 select[data-akp$='|refuse_reason']").forEach(function (x) { if (x.value.indexOf("Другое") === 0) any = true; });
    c.classList.toggle("rq", any);
    c.placeholder = any ? "Опишите причину отказа" : "Комментарий (необязательно)";
  }

  // --------------------------------------------------------------- события (один раз, скоуп .sr)
  var EV = false;
  function bindEvents() {
    if (EV) return;
    EV = true;
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t.closest) return;
      if (!t.closest(".npop") && !t.closest("[data-nopen]"))
        document.querySelectorAll(".sr .npop").forEach(function (p) { var nq = p.parentNode; if (nq && nq.dataset.nk) renderN(nq.dataset.nk, false); });
      var sr = t.closest(".sr");
      if (!sr) return;
      later();
      var qb = t.closest(".qb"); if (qb) { qb.parentNode.classList.toggle("open"); return; }
      var ac = t.closest("[data-ac]"); if (ac) { ac.parentNode.classList.toggle("open"); return; }
      var nopen = t.closest("[data-nopen]");
      if (nopen && !RO) {
        var id = nopen.dataset.nopen, op = !!document.querySelector('.sr .nq[data-nk="' + id + '"] .npop');
        document.querySelectorAll(".sr .npop").forEach(function (p) { var nq = p.parentNode; if (nq && nq.dataset.nk) renderN(nq.dataset.nk, false); });
        if (!op) renderN(id, true);
        return;
      }
      var nopt = t.closest("[data-nopt]");
      if (nopt && !RO) {
        var kpId = nopt.dataset.nk, c = nopt.dataset.nopt, d = todayD(), n = +c.slice(1);
        if (c[0] === "b") d = addBD(d, n); else if (c[0] === "w") d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n);
        saveKp(kpId, "next_contact", isoOf(d)).then(function () { renderN(kpId, false); });
        return;
      }
      var rch = t.closest(".rch");
      if (rch) { FILTER4 = rch.dataset.k === "__all" || FILTER4 === rch.dataset.k ? null : rch.dataset.k; sum4(); return; }
      var mvt = t.closest(".mvt"); if (mvt) { MVO = !MVO; recalc5(); return; }
      var add = t.closest("[data-add]");
      if (add && !RO) {
        CD.push({ name: "", sum: "", issued: "", expect: "", action: "", prob: "", next: "" });
        add.parentNode.insertAdjacentHTML("beforebegin", cuRow(CD.length - 1));
        wrapC();
        saveNote("s7:custom", JSON.stringify(CD)).then(recalc5);
        return;
      }
      var dt5 = t.closest(".kpd .dt5"); if (dt5) { editKp(dt5.parentNode); return; }
      var sgst = t.closest(".it5[data-sgst]");
      if (sgst && !RO) {
        var wk = sgst.dataset.sgst, xs = PL.filter(function (x) { return x.week === wk; });
        if (!xs.length) return;
        xs[0].status = xs[0].status === "done" ? "work" : "done";
        saveNote("s14:st:" + wk, xs[0].status);
        var box = document.getElementById("srst5");
        if (box) box.innerHTML = st5Inner();
        return;
      }
      var sys = t.closest("[data-sys]");
      if (sys && !RO) {
        var pr = sys.dataset.sys.split("|"), key0 = pr[0], val0 = pr[1];
        var vals0 = list(AV[key0]), at0 = vals0.indexOf(val0), on = at0 < 0;
        if (on) vals0.push(val0); else vals0.splice(at0, 1);
        AV[key0] = vals0;
        var ii = sys.querySelector("i");
        sys.classList.toggle("on", on);
        iiClass(ii, on, val0);
        saveNote(key0, JSON.stringify(vals0));
        return;
      }
      var sgb = t.closest("[data-aks] button");
      if (sgb && !RO) {
        var g = sgb.closest("[data-aks]"), key = g.dataset.aks;
        g.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        sgb.classList.add("on");
        saveKey(key, sgb.dataset.val);
        recalc5();
        sortG1(true);
        return;
      }
      var mcb = t.closest("[data-akm] button");
      if (mcb && !RO) {
        var g2 = mcb.closest("[data-akm]"), key2 = g2.dataset.akm, val2 = mcb.dataset.val;
        var vals2 = list(AV[key2]), at2 = vals2.indexOf(val2);
        if (at2 >= 0) vals2.splice(at2, 1); else vals2.push(val2);
        if (key2 === "s11:issues") { if (val2 === NONE11 && at2 < 0) vals2 = [NONE11]; else vals2 = vals2.filter(function (x) { return x !== NONE11; }); }
        if (key2 === "s13:channels") { if (val2 === ONLY13 && at2 < 0) vals2 = [ONLY13]; else vals2 = vals2.filter(function (x) { return x !== ONLY13; }); }
        AV[key2] = vals2;
        g2.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", vals2.indexOf(x.dataset.val) >= 0); });
        saveNote(key2, JSON.stringify(vals2));
        if (key2 === "s10:issues") sync10();
        if (key2 === "s11:issues") sync11();
        if (key2 === "s13:channels") syncW();
        return;
      }
      var dtb = t.closest(".dtb");
      if (dtb) {
        var h = dtb.parentNode.querySelector(".dth");
        if (h) { try { h.showPicker(); } catch (err) { try { h.focus(); h.click(); } catch (e2) {} } }
        return;
      }
    });
    function iiClass(ii, on, val0) { if (!ii) return; ii.className = on ? "" : "o"; ii.style.background = on ? KC[val0] : ""; }
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (!t.closest || !t.closest(".sr")) return;
      later();
      if (t.classList.contains("dth")) {
        if (!t.value) return;
        var tx = t.parentNode.querySelector(".dtx");
        if (tx) {
          tx.value = t.value.slice(8, 10) + "." + t.value.slice(5, 7) + "." + t.value.slice(2, 4);
          tx.dispatchEvent(new Event("input", { bubbles: true }));
          tx.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return;
      }
      if (t.classList.contains("ndt")) {
        if (!t.value || RO) return;
        saveKp(t.dataset.nk, "next_contact", t.value).then(function () { renderN(t.dataset.nk, false); });
        return;
      }
      if (RO) return;
      if (t.classList.contains("dtx")) {
        if (t.closest(".kpd")) return;                          // дата отправки КП сохраняется на focusout (commitKp)
        var iso = dmyToIso(t.value);
        if (t.dataset.akp) { var p0 = t.dataset.akp.split("|"); saveKp(p0[0], p0[1], iso); }
        else if (t.dataset.cu) { cuSet(t.dataset.cu, iso); recalc5(); }
        else if (t.dataset.ak) saveNote(t.dataset.ak, iso);
        return;
      }
      if (t.dataset.akp != null) {
        var p = t.dataset.akp.split("|");
        saveKp(p[0], p[1], t.value);
        if (t.classList.contains("bk")) {
          var row = t.closest("[data-row]"), off = t.value === "Нет";
          if (row) row.querySelectorAll("[data-after]").forEach(function (x) { x.disabled = off; });
        }
        if (t.closest(".ar5")) refCState();
        return;
      }
      if (t.dataset.cu) { cuSet(t.dataset.cu, t.value); recalc5(); return; }
      if (t.dataset.ak) {
        saveNote(t.dataset.ak, t.value);
        if (t.classList.contains("tsel")) t.className = "tsel rq " + ({ "Предоплата": "pre", "Доплата": "add", "Постоплата": "post" }[t.value] || "");
        if (t.classList.contains("rsel")) {
          t.parentNode.className = "rsn " + (RC4[t.value] || "c0");
          var rown = t.parentNode.querySelector(".rown"), cellEl = t.parentNode.parentNode;
          if (rown) {
            rown.hidden = t.value !== "Свой вариант";
            cellEl.style.flexDirection = rown.hidden ? "" : "column";
            cellEl.style.gap = rown.hidden ? "" : "4px";
            if (!rown.hidden) rown.focus();
          }
          var drow = t.closest(".drow");
          if (drow) drow.dataset.rsn = t.value;
          sum4();
        }
        return;
      }
    });
    document.addEventListener("input", function (e) {
      var t = e.target;
      if (!t.closest || !t.closest(".sr")) return;
      later();
      if (t.classList && t.classList.contains("dtx")) {
        var d = t.value.replace(/\D/g, "").slice(0, 6), o = d.slice(0, 2);
        if (d.length > 2) o += "." + d.slice(2, 4);
        if (d.length > 4) o += "." + d.slice(4, 6);
        t.value = o;
      }
      if (t.closest("#srb5")) recalc5();
    });
    document.addEventListener("focusout", function (e) {
      var t = e.target;
      if (!t.closest || !t.closest(".sr")) return;
      later();
      var kpd = t.closest(".kpd");
      if (kpd && kpd.querySelector(".dtx")) {
        if (e.relatedTarget && kpd.contains(e.relatedTarget)) return;
        commitKp(kpd);
        return;
      }
      if (t.closest("#srgp1")) setTimeout(function () { sortG1(false); }, 0);
      if (t.closest("#srgp2")) setTimeout(function () { sortG2(false); }, 0);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var t = e.target;
      if (!t.closest || !t.closest(".sr")) return;
      var dt5 = t.closest(".kpd .dt5");
      if (dt5) { editKp(dt5.parentNode); return; }
      if (t.classList && t.classList.contains("dtx") && t.closest(".kpd")) t.blur();
    });
  }

  // --------------------------------------------------------------- совместимость со старым мостом
  function compat() {
    var pillT = function (v) { return v && typeof v === "object" ? v.t : String(v == null ? "" : v); };
    var s1q = item("s1");
    s1q.rows.forEach(function (r) {
      if (r.amt == null) r.amt = num(r.cells[2]);
      if (r.sv == null) r.sv = typeof r.cells[3] === "string" ? r.cells[3] : "";
      if (r.last_bd == null) r.last_bd = 99;
    });
    if (s1q.sold == null) {                                    // старый мост: продажи/отказы лежат в общем списке
      s1q.sold = [];
      s1q.rows.forEach(function (r) {
        var st = pillT(r.cells[4]);
        if (st === "Отказ" || st === "В работе" || st === "В постоплате" || st === "Закрыто") {
          r.__skip = true;
          if (st !== "Отказ") s1q.sold.push({ customer: r.cells[1], sv: typeof r.cells[3] === "string" ? r.cells[3] : "", amt: r.amt });
        }
      });
    }
    var s4 = item("s4");
    s4.rows.forEach(function (r) {
      if (r.bd == null) r.bd = num(pillT(r.cells[4]));
      if (r.amt == null) r.amt = num(r.cells[3]);
      if (!r.sub) r.sub = "КП " + pillT(r.cells[1]);
      if (!r.type) r.type = "pre";
      if (r.last_bd == null) r.last_bd = 99;
    });
    item("s6").rows.forEach(function (r) {
      if (r.bd == null) r.bd = num(pillT(r.cells[3]));
      if (r.amt == null) r.amt = num(r.cells[2]);
      if (!r.sub) r.sub = "задача " + pillT(r.cells[0]);
      if (!r.type) r.type = "debt";
    });
    if (s4.longest == null) s4.longest = s4.rows.concat(item("s6").rows).reduce(function (m, r) { return Math.max(m, r.bd || 0); }, 0);
    item("s7").rows.forEach(function (r) {
      var g0 = pillT(r.cells[0]);
      if (!r.g) r.g = g0 === "В предоплате" || g0 === "Счёт отправлен" ? "k1" : g0 === "Доки отправлены" || g0 === "С КП" ? "k2" : "skip";
      if (!r.type) r.type = g0 === "Счёт отправлен" ? "post" : "pre";
      if (r.amt == null) r.amt = num(r.cells[3]);
      if (r.g === "k1" && !r.ev) r.ev = r.type === "pre" ? "Счёт выставлен" : "Акт отправлен";
    });
  }

  // --------------------------------------------------------------- точка входа
  window.DSSalesReport = {
    html: function (report, ro, viewer, tabs) {
      R = report; RO = !!ro; WEEK = report.week_start; FILTER4 = null; MVO = false;
      AV = {}; KV = {};
      function collect(i) {
        if (!i || !i.key) return;
        if (i.kind === "kp" || i.kind === "kpdate" || i.kind === "kptext") KV[i.kp + "|" + i.field] = i.v || "";
        else AV[i.key] = i.v == null ? "" : i.v;
      }
      (R.items || []).forEach(function (it) {
        (it.inputs || []).forEach(collect);
        (it.rows || []).forEach(function (r) { (r.inputs || []).forEach(collect); });
      });
      CD = list(AV["s7:custom"]);
      compat();
      PL = item("s14").prev_list || [];
      var body = zone("--zb:#a8cdb4;--zbg:#eef7f0;--zh:#cfe6d4;--zt:#1d4d2f;--zc:#3b8a5a", "Запросы, оплаты", block1() + block2() + block3())
        + zone("--zb:#e3b4b4;--zbg:#fcf0f0;--zh:#f4d3d3;--zt:#6a1f1f;--zc:#c0504d", "Должники и риски", block4())
        + zone("--zb:#a9c3de;--zbg:#eef4fa;--zh:#d3e2f2;--zt:#1b3a5e;--zc:#2a65a0", "План на следующую неделю", block5())
        + zone("--zb:#d3c3e6;--zbg:#f6f1fa;--zh:#e5d9f2;--zt:#43297a;--zc:#7a4fc0", "Мнение", loopBlock() + block6() + block7() + block8() + block9());
      var head = '<div class="sr-head"><div><h1>' + E(report.person || report.title) + " <span>менеджер отдела продаж</span></h1><p>Неделя " + E(report.week_start) + " — " + E(report.week_end) + " · " + (RO ? "просмотр" : "ваши ответы сохраняются автоматически") + '</p></div><div class="sr-actions"><div class="seg"><button data-rpnav="-1">← Пред.</button><button data-rpnav="0" class="on">Эта</button><button data-rpnav="1">След. →</button></div><button class="btn ghost" data-rpref="1">⟳ Обновить</button></div></div>'
        + (tabs ? '<div class="sr-tabs">' + tabs + "</div>" : "")
        + '<span class="sr-save-status" id="srStatus">' + (RO ? "Только чтение" : "Изменения сохраняются автоматически") + "</span>";
      bindEvents();
      setTimeout(function () {
        var root = document.querySelector(".sr");
        if (!root) return;
        tipInit(root);
        document.querySelectorAll(".sr .kpd").forEach(renderKp);
        wrapC();
        recalc5();
        sum4();
        refCState();
        sortG1(true);
        sortG2(true);
        later();
      }, 0);
      return '<div class="sr">' + head + body + "</div>";
    }
  };
  bindEvents();
})();
