/* Проекты DS — прайс-лист: услуги, печать, калькулятор, реквизиты компании (вынесено из ds.js 24.11, экономия токенов).
   Контекст ядра — DS._ctx (ds.js подключается раньше в index.html). */
(function () {
  "use strict";
  var X = window.DS._ctx;
  var S = X.S, E = X.E, pos = X.pos, api = X.api, toast = X.toast, paint = X.paint, money = X.money, kpAddLine = X.kpAddLine;
function loadPrice() {
  return api("/price").then(function (p) { S.price = p; if (!S.pd) S.pd = JSON.parse(JSON.stringify(p.items)); }, function (e) { S.price = null; S.err = String(e); });
}
function priceServices() {
  var p = pos(), pr = S.price;
  if (!pr) return '<div class="head"><div><h1>Прайс</h1></div></div><div class="note">' + (S.err ? E(S.err) : "Прайс-лист недоступен для вашей роли.") + "</div>";
  var edit = pr.can_edit, rows = edit ? S.pd : pr.items;
  var head = '<div class="head"><div><h1>Прайс-лист</h1><p>Услуги и цены для конструктора КП. ' + (edit ? "Изменения применяются к новым КП; выставленные КП не меняются." : "Правит руководитель или руководитель отдела продаж.") + "</p></div>"
    + (edit ? '<div style="display:flex;gap:10px"><button class="btn ghost" data-prreset="1">Отменить правки</button><button class="btn primary" data-prsave="1">Сохранить</button></div>' : "") + "</div>"
    + "";
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
/* вкладки прайса: Услуги · Калькулятор · Печать */
function f2(n) { return Number(n || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function priceScreen() {
  var pr = S.price;
  if (!pr) return priceServices();
  var tab = S.pt || "services";
  var seg = '<div class="seg" style="margin-bottom:16px">' + [["services", "Услуги"], ["calc", "Калькулятор"], ["print", "Печать"]].map(function (x) {
    return '<button data-pt="' + x[0] + '" class="' + (tab === x[0] ? "on" : "") + '">' + x[1] + "</button>";
  }).join("") + "</div>";
  return seg + (tab === "calc" ? priceCalc(false) : tab === "print" ? pricePrint(false) : priceServices());
}
/* ---- «Печать»: 4 варианта по площади объекта; цена за 1 экземпляр, следующий экземпляр дешевле; доставка входит */
function ppInit() {
  if (!S.pp && S.price && S.price.print) S.pp = JSON.parse(JSON.stringify(S.price.print));
  return S.pp;
}
function pcState() {
  if (!S.pc) S.pc = { tier: -1, copies: 1 };
  return S.pc;
}
function printCost(tier, copies) {
  var pp = (S.pp || (S.price && S.price.print)), t = pp && pp.tiers[tier];
  if (!t) return 0;
  var n = Math.max(1, Math.round(+copies || 1)), p = +t.price || 0;
  return Math.round((p + (n - 1) * p * (1 - (+pp.discount || 0) / 100)) * 100) / 100;
}
function printLine(tier, copies) {
  var t = S.price.print.tiers[tier], n = Math.max(1, Math.round(+copies || 1));
  return { name: t.name + (n > 1 ? ", " + n + " экз." : ", 1 экз."), price: printCost(tier, n) };
}
function pcTotalHtml() {
  var pc = pcState(), pp = S.pp || S.price.print;
  if (pc.tier < 0) return '<div class="dbox"><small>Печать документации</small>Выберите вариант по площади объекта</div>';
  var n = Math.max(1, Math.round(+pc.copies || 1)), p = +pp.tiers[pc.tier].price || 0, nxt = Math.round(p * (1 - (+pp.discount || 0) / 100) * 100) / 100;
  return '<div class="dbox"><small>Печать документации, ' + n + " экз.</small><b style=\"font-size:1.2rem\">" + f2(printCost(pc.tier, n)) + " ₽</b>"
    + "<div>1-й экземпляр: " + f2(p) + " ₽" + (n > 1 ? " · каждый следующий: " + f2(nxt) + " ₽ (−" + (+pp.discount || 0) + "%)" : "") + "</div><div>Доставка входит в стоимость</div></div>";
}
function pricePrint(forKp) {
  var pr = S.price, pp = ppInit(), edit = pr.can_edit && !forKp, pc = pcState();
  if (!pp) return '<div class="note">Прайс на печать недоступен.</div>';
  var inp = 'style="width:100%;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink)"';
  var head = forKp ? "" : '<div class="head"><div><h1>Печать документации</h1><p>Цена за 1 экземпляр комплекта по площади объекта, доставка входит. Каждый следующий экземпляр дешевле на ' + (+pp.discount || 0) + "%.</p></div>"
    + (edit ? '<div style="display:flex;gap:10px"><button class="btn ghost" data-ppreset="1">Отменить правки</button><button class="btn primary" data-ppsave="1">Сохранить цены</button></div>' : "") + "</div>";
  var rows = pp.tiers.map(function (r, i) {
    return '<label class="dsv ' + (pc.tier === i ? "on" : "") + '" style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;cursor:pointer;margin-bottom:8px">'
      + '<input type="radio" name="pctier" data-pct="' + i + '"' + (pc.tier === i ? " checked" : "") + ">"
      + (edit ? '<input data-ppf="t.' + i + '.name" value="' + E(r.name) + '" ' + inp + ">" : "<span><b>" + E(r.name) + "</b></span>")
      + (edit ? '<span style="display:flex;gap:6px;align-items:center"><input type="number" min="0" data-ppf="t.' + i + '.price" value="' + (+r.price || 0) + '" style="width:110px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink)"> ₽</span>'
        : '<span><b>' + money(r.price) + "</b></span>") + "</label>";
  }).join("");
  var ctl = edit ? '<div class="fld" style="max-width:300px"><label>Скидка на 2-й и последующие экземпляры, %</label><input type="number" min="0" max="100" data-ppf="discount" value="' + (+pp.discount || 0) + '"></div>' : "";
  var bottom = '<div class="panel pad" style="margin-top:12px"><div class="fld" style="max-width:260px"><label>Количество экземпляров</label><input type="number" min="1" step="1" data-pcn="1" value="' + (+pc.copies || 1) + '"></div>'
    + '<div id="pcTotal">' + pcTotalHtml() + "</div>"
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">' + (forKp ? '<button class="btn primary" data-pcadd="1">Добавить в КП</button>' : '<button class="btn primary" data-pcadd="1">Создать КП с печатью</button>')
    + '<button class="btn ghost" data-pcreset="1">Сбросить</button></div></div>';
  return head + '<div class="panel pad">' + rows + ctl + "</div>" + bottom + (S.ppErr ? '<div class="err">' + E(S.ppErr) + "</div>" : "");
}
function pcAddToKp() {
  var pc = pcState();
  if (pc.tier < 0) return toast("Выберите вариант печати по площади объекта");
  var l = printLine(pc.tier, pc.copies);
  kpAddLine(l.name, l.price);
  if (S.mount && S.mount.kind === "kpc") { toast("Строка добавлена в КП"); return paint(); }
  location.hash = "#/kpc";
}
function savePrint() {
  S.ppErr = "";
  var pp = S.pp;
  api("/price/print", { discount: +pp.discount || 0, tiers: pp.tiers.map(function (r) { return { name: r.name, price: +r.price || 0 }; }) }).then(function (r) {
    S.price = Object.assign({}, S.price, { print: r }); S.pp = null; toast("Прайс на печать сохранён"); paint();
  }, function (e) { S.ppErr = String(e); paint(); });
}
/* ---- «Калькулятор»: проектирование по площади + обследование + печать (из вкладки «Печать») + доставка; без смет и экспертизы */
function calcState() {
  if (!S.calc) S.calc = { syss: [], area: "", survey: false, city: true, pump: false, stairs: -1, print: false, copies: 1 };
  return S.calc;
}
function tierIdx(sys, area) {
  var idx = 0;
  for (var i = 0; i < sys.from.length; i++) if (area >= sys.from[i]) idx = i;
  return idx;
}
function tierLabel(sys, i) {
  var f = sys.from, n = f[i + 1];
  if (n == null) return "более " + (f[i] - 1).toLocaleString("ru-RU") + " м²";
  return (i === 0 ? "до " + (n - 1).toLocaleString("ru-RU") : "от " + f[i].toLocaleString("ru-RU") + " до " + (n - 1).toLocaleString("ru-RU")) + " м²";
}
function calcLines() {
  var pr = S.price, cf = pr.calc, pp = pr.print, c = calcState(), lines = [], ask = false;
  var selSys = cf.systems.filter(function (s) { return (c.syss || []).indexOf(s.id) >= 0; }), area = +c.area || 0;
  if (area > 0) selSys.forEach(function (sys) {           // каждая система — отдельной строкой
    var i = tierIdx(sys, area), v = sys.price[i];
    if (v == null) ask = true;
    lines.push({ name: sys.name + " (" + tierLabel(sys, i) + ")", price: v });
  });
  if (c.survey) {
    lines.push({ name: "Обследование объекта", price: area > 3000 ? cf.survey.over3000 : cf.survey.to3000 });
    if (!c.city) lines.push({ name: "Выезд на обследование вне города", price: cf.survey.out_of_city });
  }
  if (selSys.some(function (s) { return s.pump; }) && c.pump) lines.push({ name: "Проектирование насосной станции пожаротушения", price: cf.pump });
  if (c.stairs >= 0 && cf.stairs[c.stairs]) { var st = cf.stairs[c.stairs]; if (st[1] == null) ask = true; lines.push({ name: st[0], price: st[1] }); }
  if (c.print && area > 0) {
    var ti = 0; while (ti < pp.tiers.length - 1 && pp.tiers[ti].up_to != null && area > pp.tiers[ti].up_to) ti++;
    lines.push(printLine(ti, c.copies || 1));
  }
  return { lines: lines, ask: ask, total: lines.reduce(function (a, l) { return a + (l.price == null ? 0 : l.price); }, 0) };
}
function calcResHtml() {
  var r = calcLines();
  if (!r.lines.length) return '<div class="note">Выберите систему и укажите площадь</div>';
  return "<table class=\"tbl\">" + r.lines.map(function (l) { return "<tr><td>" + E(l.name) + '</td><td class="r"><b>' + (l.price == null ? "по запросу" : f2(l.price) + " ₽") + "</b></td></tr>"; }).join("")
    + '<tr><td><b>Итого</b></td><td class="r"><b style="font-size:1.15rem">' + f2(r.total) + " ₽</b></td></tr></table>"
    + (r.ask ? '<div class="note">Часть позиций «по запросу»: стоимость согласуется индивидуально, в итог они не входят.</div>' : "");
}
function priceCalc(compact) {
  var pr = S.price, cf = pr.calc, pp = pr.print, c = calcState();
  var anyPump = cf.systems.some(function (s) { return (c.syss || []).indexOf(s.id) >= 0 && s.pump; });
  var sel = 'style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--surface);color:var(--ink)"';
  var chk = function (k, label, on) { return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-ccb="' + k + '"' + (on ? " checked" : "") + "> " + label + "</label>"; };
  var form = '<div class="panel pad"><h3>Расчёт стоимости</h3><p class="sub">' + E(cf.note) + "</p>"
    + '<div class="fld"><label>Системы (отметьте нужные: каждая — отдельной строкой в КП)</label>'
    + cf.systems.map(function (s) { return '<label style="display:flex;gap:8px;align-items:flex-start;margin:6px 0"><input type="checkbox" data-ccs="' + s.id + '"' + ((c.syss || []).indexOf(s.id) >= 0 ? " checked" : "") + ' style="margin-top:3px"> <span>' + E(s.name) + "</span></label>"; }).join("") + "</div>"
    + '<div class="fld"><label>Площадь объекта, м²</label><input type="number" min="0" data-cc="area" value="' + E(c.area) + '" placeholder="например 2500"></div>'
    + chk("survey", "Требуется обследование", c.survey) + (c.survey ? chk("city", "Объект в городе (иначе +" + money(cf.survey.out_of_city) + " за выезд)", c.city) : "")
    + (anyPump ? chk("pump", "Насосная станция (+" + money(cf.pump) + ")", c.pump) : "")
    + '<div class="fld"><label>Проектирование пожарных лестниц</label><select data-cc="stairs" ' + sel + '><option value="-1">— не требуется —</option>'
    + cf.stairs.map(function (s, i) { return '<option value="' + i + '"' + (i === c.stairs ? " selected" : "") + ">" + E(s[0]) + " — " + (s[1] == null ? "индивидуально" : money(s[1])) + "</option>"; }).join("") + "</select></div>"
    + chk("print", "Печать документации (вариант по площади, доставка входит)", c.print)
    + (c.print ? '<div class="fld"><label>Экземпляров (2-й и далее −' + (+pp.discount || 0) + "%)</label><input type=\"number\" min=\"1\" step=\"1\" data-cc=\"copies\" value=\"" + (c.copies || 1) + "\"></div>" : "")
    + "</div>";
  var res = '<div class="panel pad" style="margin-top:12px"><h3>Итого</h3><div id="calcRes">' + calcResHtml() + "</div>"
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn primary" data-cckp="1">' + (compact ? "Добавить в КП" : "Создать КП из расчёта") + '</button><button class="btn ghost" data-ccreset="1">Сбросить</button></div></div>';
  if (compact) return form + res;
  return '<div class="head"><div><h1>Калькулятор стоимости</h1><p>Проектирование по площади, обследование, печать, сборка и доставка. Сметы и экспертиза не входят</p></div></div><div class="kpc"><div>' + form + "</div><div>" + res.replace("margin-top:12px", "") + "</div></div>";
}
function calcToKp() {
  var r = calcLines(), items = r.lines.filter(function (l) { return l.price == null || l.price > 0; });
  if (!items.length) return toast("Сначала выполните расчёт");
  items.forEach(function (l) { kpAddLine(l.name, l.price == null ? 0 : l.price); });          // «по запросу» — строка с нулевой ценой: цену вносят в КП
  if (S.mount && S.mount.kind === "kpc") { toast("Строки добавлены в КП"); return paint(); }
  location.hash = "#/kpc";
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
    + f("name", "Исполнитель (ИП)", "ИП Шубинов Д.А.") + f("city", "Город договора", "Санкт-Петербург") + f("position", "Должность подписанта", "Индивидуальный предприниматель") + f("director", "Подпись (инициалы, фамилия)", "Д.А. Шубинов")
    + f("phone", "Телефон", "+7 …") + f("email", "E-mail", "info@…") + f("site", "Сайт", "https://…") + f("valid_days", "Срок действия КП, календарных дней", "10") + f("work_days", "Срок работ по КП и договору, рабочих дней", "30") + "</div>"
    + '<h4 style="margin:14px 0 6px">Реквизиты ИП для договора</h4><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 14px">'
    + f("full_name", "ФИО полностью", "Шубинов Дмитрий Андреевич") + f("ogrnip", "ОГРНИП") + f("inn", "ИНН") + f("tax", "Налогообложение (АУСН или УСН)", "АУСН")
    + f("rs", "Расчётный счёт") + f("bank", "Банк", "АО «ТБанк»") + f("bik", "БИК") + f("ks", "Корр. счёт") + f("messenger_phone", "Telegram / MAX (телефон)", "+7 …") + "</div>"
    + f("address", "Юридический адрес", "650002, Кемеровская область – Кузбасс, г. Кемерово, …")
    + (S.compErr ? '<div class="err">' + E(S.compErr) + "</div>" : "")
    + (c.can_edit ? '<button class="btn primary" data-compsave="1">Сохранить реквизиты</button>' : "") + "</div>";
}
function saveCompany() {
  S.compErr = "";
  api("/settings/company", S.comp).then(function (c) { S.comp = Object.assign({}, c, { can_edit: true }); toast("Реквизиты сохранены"); paint(); }, function (e) { S.compErr = String(e); paint(); });
}
function savePrice() {
  S.pdErr = "";
  api("/price", { items: S.pd.map(function (r) { return { name: r.name, price: +r.price || 0, note: r.note || "", active: !!r.active }; }) }).then(function (r) {
    S.price = Object.assign({}, S.price, { items: r.items, can_edit: true }); S.pd = JSON.parse(JSON.stringify(r.items)); S.kpf = null; toast("Прайс-лист сохранён"); paint();
  }, function (e) { S.pdErr = String(e); paint(); });
}

  window.DSPrice = { loadPrice: loadPrice, priceScreen: priceScreen, priceCalc: priceCalc, pricePrint: pricePrint, pcState: pcState, pcTotalHtml: pcTotalHtml, pcAddToKp: pcAddToKp, savePrint: savePrint, calcState: calcState, calcResHtml: calcResHtml, calcToKp: calcToKp, loadCompany: loadCompany, saveCompany: saveCompany, savePrice: savePrice };
})();
