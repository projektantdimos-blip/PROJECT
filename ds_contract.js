/* Проекты DS — конструктор договора (вынесено из ds.js 24.11, экономия токенов).
   Контекст ядра — DS._ctx (ds.js подключается раньше в index.html). */
(function () {
  "use strict";
  var C = window.MPBC;
  var X = window.DS._ctx;
  var S = X.S, E = X.E, dmy = X.dmy, pos = X.pos, api = X.api, toast = X.toast, paint = X.paint, money = X.money, ic = X.ic, kpNo = X.kpNo, loadKp = X.loadKp, makeFolder = X.makeFolder;
  function execName() { return (S.comp && S.comp.name) || "ИП Шубинов Д.А."; }
  /* ---------- конструктор договора (шаблон ИП: 15 разделов + приложения) ---------- */
function ctGet(path) {
  var o = S.ct && S.ct.data, parts = path.split(".");
  for (var i = 0; i < parts.length && o != null; i++) o = o[parts[i]];
  return o == null ? "" : o;
}
function ctSetPath(path, val) {
  var o = S.ct.data, parts = path.split(".");
  for (var i = 0; i < parts.length - 1; i++) { if (o[parts[i]] == null) o[parts[i]] = {}; o = o[parts[i]]; }
  o[parts[parts.length - 1]] = val;
}
function ctParty(cu) {
  var head = String(cu.name_full || "").trim(), sh = String(cu.name_short || "").trim();
  if (sh && sh !== head) head += " (" + sh + ")";
  if (cu.type === "ip") return head + ", действующий на основании " + (cu.basis || "листа записи из ЕГРИП") + (cu.ogrn ? ", ОГРНИП № " + cu.ogrn : "");
  if (cu.type === "person") return head + ", действующий от собственного имени";
  return head + ", в лице " + (cu.position_gen || "Генерального директора") + " " + (cu.fio_gen || "____________________") + ", действующего на основании " + (cu.basis || "Устава");
}
function ctMissing(d) {
  var m = [], cu = d.customer || {}, s = function (v) { return String(v == null ? "" : v).trim(); };
  function need(ok, f, msg) { if (!ok) m.push([f, msg]); }
  var inn = s(cu.inn).replace(/\D/g, "");
  need(s(d.number), "number", "Номер договора");
  need(/^\d{4}-\d\d-\d\d$/.test(s(d.date)), "date", "Дата договора");
  need(s(d.city), "city", "Город");
  need(s(cu.name_full), "customer.name_full", "Полное наименование заказчика");
  need(s(cu.name_short), "customer.name_short", "Краткое наименование");
  need(innOk(inn), "customer.inn", "ИНН заказчика (10 или 12 цифр, контрольная сумма)");
  if ((cu.type || "org") === "org") {
    need(s(cu.position_gen), "customer.position_gen", "Должность подписанта (в родительном падеже)");
    need(s(cu.fio_gen), "customer.fio_gen", "ФИО подписанта (в родительном падеже)");
    need(s(cu.basis), "customer.basis", "Основание (Устав и т. п.)");
    need(s(cu.position_sign), "customer.position_sign", "Должность подписанта для подписи");
    if (inn.length === 10) need(s(cu.kpp).replace(/\D/g, "").length === 9, "customer.kpp", "КПП заказчика (9 цифр)");
  }
  need(s(cu.signer_fio), "customer.signer_fio", "Подписант: Фамилия И.О.");
  need(s(cu.address), "customer.address", "Юридический адрес заказчика");
  need(s(cu.rs), "customer.rs", "Расчётный счёт");
  need(s(cu.bank), "customer.bank", "Банк");
  need(s(cu.bik), "customer.bik", "БИК");
  need(s(cu.ks), "customer.ks", "Корр. счёт");
  need(s(cu.email) || s(cu.phone), "customer.phone", "Телефон или e-mail заказчика");
  need(s(cu.party_text), "customer.party_text", "Текст о заказчике");
  need(s(d.object_address), "object_address", "Адрес объекта");
  need(+d.days >= 1, "days", "Срок оказания услуг");
  need(+d.pay_days >= 1, "pay_days", "Срок оплаты");
  need(d.adv_pct !== "" && +d.adv_pct >= 0 && +d.adv_pct <= 100, "adv_pct", "Аванс, %");
  need(+d.warranty >= 1, "warranty", "Гарантия, мес.");
  need(s(d.messengers), "messengers", "Мессенджеры рабочего чата");
  if (d.tz) need(+d.tz_sheets >= 1, "tz_sheets", "Количество листов ТЗ");
  if (d.paper) need(+d.paper_copies >= 1, "paper_copies", "Количество бумажных экземпляров");
  var sv = d.services || [];
  need(sv.length > 0, "services", "Добавьте хотя бы одну услугу");
  sv.forEach(function (x, i) {
    need(s(x.name), "services." + i + ".name", "Услуга " + (i + 1) + ": наименование");
    need(+x.unit_price > 0, "services." + i + ".unit_price", "Услуга " + (i + 1) + ": цена");
    need(+x.qty > 0, "services." + i + ".qty", "Услуга " + (i + 1) + ": количество");
  });
  return m;
}
function ctTotals(d) {
  var amount = (d.services || []).reduce(function (a, x) { return a + (+x.unit_price || 0) * (+x.qty || 0); }, 0);
  var adv = Math.round(amount * (+d.adv_pct || 0) / 100);
  return { amount: amount, adv: adv, post: amount - adv };
}
function loadContractDraft() {
  var open = (S.kp || []).filter(function (k) { return !k.order_id && k.status !== "Отказ" && k.status !== "Закрыто"; });
  if (!S.ct || !S.ct.kid) { if (!open.length) { S.ct = null; return Promise.resolve(); } S.ct = { kid: open[0].id }; }
  var c = S.ct;
  if (c.data && c.loadedFor === c.kid) return Promise.resolve();
  return api("/kp/" + c.kid + "/contract/draft").then(function (r) {
    c.data = r.data; c.exec = r.executor; c.saved = r.saved; c.signed = r.signed; c.types = r.customer_types; c.loadedFor = c.kid; c.err = ""; c.upd = false;
  }, function (e) { c.data = null; c.err = String(e); c.loadedFor = c.kid; });
}
function ctField(path, label, o) {
  o = o || {};
  var bad = S.ct.miss && S.ct.miss.some(function (x) { return x[0] === path; });
  var v = ctGet(path);
  var st = bad ? ' style="border-color:var(--bad);background:var(--bad-soft)"' : "";
  return '<div class="fld"' + (o.wide ? ' style="grid-column:1/-1"' : "") + "><label>" + label + (o.req === false ? "" : ' <span style="color:var(--bad)">*</span>') + "</label>"
    + (o.area ? '<textarea data-ctp="' + path + '" rows="' + (o.rows || 3) + '"' + st + ">" + E(v) + "</textarea>"
      : '<input ' + (o.type ? 'type="' + o.type + '" ' : "") + 'data-ctp="' + path + '" value="' + E(v) + '"' + (o.ph ? ' placeholder="' + E(o.ph) + '"' : "") + st + ">") + "</div>";
}
function ctPaper(d) {
  var t = ctTotals(d), cu = d.customer || {};
  return '<h4>ДОГОВОР № ' + E(d.number || "—") + '</h4><p class="c">г. ' + E(d.city || "—") + " · " + E(d.date ? dmy(d.date) : "—") + "</p>"
    + "<p>" + E(cu.party_text || "—") + "; <b>" + E((S.ct.exec && S.ct.exec.name_short) || execName()) + "</b> (Исполнитель)</p>"
    + "<p><b>Объект:</b> " + E(d.object_address || "—") + "</p>"
    + "<table><tr><th>Услуга</th><th>Кол-во</th><th>Сумма</th></tr>" + (d.services || []).map(function (x) { return "<tr><td>" + E(x.name) + "</td><td>" + E(x.qty) + "</td><td>" + money((+x.unit_price || 0) * (+x.qty || 0)) + "</td></tr>"; }).join("") + "</table>"
    + "<p><b>Итого: " + money(t.amount) + "</b> (НДС не облагается)</p>"
    + "<p>Аванс " + (+d.adv_pct || 0) + "%: " + money(t.adv) + ", остаток " + money(t.post) + "; срок " + (+d.days || 0) + " раб. дн.; гарантия " + (+d.warranty || 0) + " мес.</p>"
    + '<p class="c">Полный текст (15 разделов, приложения 1–3) формируется в Word и PDF</p>';
}
function ctMissHtml(m) {
  return m.length ? '<div class="dbox" style="border-color:var(--bad);background:var(--bad-soft)"><small style="color:var(--bad)">Заполните, чтобы создать договор (' + m.length + ")</small>"
    + '<div style="font-size:.86rem">' + m.slice(0, 12).map(function (x) { return "• " + E(x[1]); }).join("<br>") + (m.length > 12 ? "<br>…и ещё " + (m.length - 12) : "") + "</div></div>"
    : '<div class="dbox sys"><small>Проверка</small>Все обязательные поля заполнены</div>';
}
function ctForceHtml(c) {
  if ((!c.miss || !c.miss.length) && !c.errForce) return "";
  return '<label style="display:flex;gap:8px;align-items:flex-start;margin:10px 0;padding:10px 12px;border:1px dashed var(--bad);border-radius:10px"><input type="checkbox" data-ctforce="1"' + (c.force ? " checked" : "") + ' style="margin-top:3px">'
    + "<span>Я понимаю, что не все поля заполнены, но хочу скачать договор</span></label>";
}
function ctRefresh() {
  var c = S.ct; if (!c || !c.data) return;
  c.miss = ctMissing(c.data);
  var mh = document.getElementById("ctMiss"); if (mh) mh.innerHTML = ctMissHtml(c.miss);
  var pp = document.getElementById("ctPaper"); if (pp) pp.innerHTML = ctPaper(c.data);
  var tot = document.getElementById("ctTotal"); if (tot) { var t = ctTotals(c.data); tot.textContent = money(t.amount) + " · аванс " + money(t.adv) + " · остаток " + money(t.post); }
  var fb = document.getElementById("ctForceBox"); if (fb) { if (!c.miss.length && !c.errForce) c.force = false; fb.innerHTML = ctForceHtml(c); }
  var mk = document.getElementById("ctMake"); if (mk) { var blocked = c.miss.length > 0 && !c.force; mk.disabled = blocked; mk.style.opacity = blocked ? ".5" : ""; }
  document.querySelectorAll("[data-ctp]").forEach(function (el) {
    var bad = c.miss.some(function (x) { return x[0] === el.dataset.ctp; });
    if (el.type === "checkbox") return;
    el.style.borderColor = bad ? "var(--bad)" : ""; el.style.background = bad ? "var(--bad-soft)" : "";
  });
}
function cmodeSeg() {
  return '<div class="seg" style="margin-bottom:12px"><button data-cmode="gen" class="' + (S.cmode !== "kp" ? "on" : "") + '">Генератор договоров</button><button data-cmode="kp" class="' + (S.cmode === "kp" ? "on" : "") + '">Договор по КП</button></div>';
}
function genScreen() {
  return '<div class="head"><div><h1>Конструктор договоров</h1><p>Генератор договоров ИП: Word и PDF, база клиентов и история. Данные хранятся в CRM, документы собираются в браузере.</p></div></div>' + cmodeSeg()
    + '<iframe id="cgFrame" src="contracts/index.html" title="Генератор договоров" style="width:100%;height:calc(100vh - 230px);min-height:640px;border:1px solid var(--line);border-radius:12px;background:#fff"></iframe>';
}
function innOk(s) {
  var d = s.split("").map(Number);
  function sum(w) { return w.reduce(function (a, x, i) { return a + x * d[i]; }, 0) % 11 % 10; }
  if (s.length === 10) return d[9] === sum([2, 4, 10, 3, 5, 9, 4, 6, 8]);
  if (s.length === 12) return d[10] === sum([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) && d[11] === sum([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
  return false;
}
function contractScreen() {
  var p = pos();
  if (!(p === "owner" || p === "sales" || p === "ops")) return '<div class="head"><div><h1>Конструктор договора</h1></div></div><div class="note">Раздел недоступен для вашей роли.</div>';
  var open = (S.kp || []).filter(function (x) { return !x.order_id && x.status !== "Отказ" && x.status !== "Закрыто"; });
  var head = '<div class="head"><div><h1>Конструктор договора</h1><p>Договор на услуги ИП по вашему шаблону: заполняется из КП и карточки заказчика либо вводится самостоятельно</p></div><button class="btn accent" data-ctstandalone="1">' + ic("plus") + "Договор без КП</button></div>";
  head += cmodeSeg();
  if (!S.ct || !S.ct.kid) return head + '<div class="note">Нет КП, по которым можно оформить договор. Выставьте КП в «Конструкторе КП» или создайте договор без КП.</div><button class="btn accent" data-ctstandalone="1">' + ic("plus") + "Договор без КП</button>";
  var c = S.ct, k = (S.kp || []).filter(function (x) { return x.id === c.kid; })[0];
  if (!c.data) return head + '<div class="err">' + E(c.err || "Не удалось загрузить данные договора") + "</div>";
  var d = c.data, cu = d.customer || {}, t = ctTotals(d);
  c.miss = ctMissing(d);
  var sel = 'style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--surface);color:var(--ink)"';
  var chk = function (path, label, on) { return '<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-ctp="' + path + '"' + (on ? " checked" : "") + "> " + label + "</label>"; };
  var kpPick = '<div class="fld"><label>КП</label><select data-ctpick="1">' + open.map(function (x) { return '<option value="' + x.id + '"' + (x.id === c.kid ? " selected" : "") + ">" + E(kpNo(x.number) + " · " + x.customer + " · " + money(x.amount)) + "</option>"; }).join("") + "</select></div>";
  var priceOpts = (S.price && S.price.items ? S.price.items.filter(function (i) { return i.active; }) : []);
  var f1 = '<div class="panel pad"><h3>1. Исполнитель</h3>' + kpPick
    + '<div class="g2f"><div class="fld"><label>Тип договора</label><select disabled ' + sel + "><option>Договор на услуги (проектирование)</option></select></div>"
    + '<div class="fld"><label>Исполнитель</label><input disabled value="' + E((c.exec && c.exec.name_short) || execName()) + '"></div></div>'
    + '<p class="sub" style="margin:0">Договоры оформляются только от ИП; реквизиты исполнителя берутся из «Прайс → Реквизиты компании».</p></div>';
  var f2 = '<div class="panel pad" style="margin-top:14px"><h3>2. Номер, дата, город</h3><div class="g2f">'
    + ctField("number", "Номер договора") + ctField("date", "Дата договора", { type: "date" }) + "</div>" + ctField("city", "Город") + "</div>";
  var f3 = '<div class="panel pad" style="margin-top:14px"><h3>3. Заказчик</h3>'
    + '<div class="fld"><label>Тип заказчика</label><select data-ctp="customer.type" ' + sel + ">" + [["org", "Организация (ООО, АО и др.)"], ["ip", "Индивидуальный предприниматель"], ["person", "Физическое лицо"]]
      .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (cu.type || "org") ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>"
    + '<div class="g2f">' + ctField("customer.name_full", "Полное наименование") + ctField("customer.name_short", "Краткое наименование") + "</div>"
    + ((cu.type || "org") === "org" ? '<div class="g2f">' + ctField("customer.position_gen", "В лице (должность, род. падеж)", { ph: "Генерального директора" }) + ctField("customer.fio_gen", "ФИО в род. падеже", { ph: "Иванова Ивана Ивановича" }) + "</div>"
      + '<div class="g2f">' + ctField("customer.basis", "Действует на основании", { ph: "Устава" }) + ctField("customer.kpp", "КПП") + "</div>"
      + '<div class="g2f">' + ctField("customer.position_sign", "Должность подписанта (для подписи)", { ph: "Генеральный директор" }) + ctField("customer.org_sign", "Организация в подписи", { req: false }) + "</div>"
      : '<div class="g2f">' + ctField("customer.basis", "Действует на основании", { ph: "листа записи из ЕГРИП" }) + ctField("customer.ogrn", "ОГРНИП", { req: false }) + "</div>")
    + '<div class="g2f">' + ctField("customer.signer_fio", "Подписант: Фамилия И.О.", { ph: "Иванов И.И." }) + ctField("customer.inn", "ИНН") + "</div>"
    + ctField("customer.address", "Юридический адрес", { wide: true })
    + '<div class="g2f">' + ctField("customer.rs", "Расчётный счёт") + ctField("customer.bank", "Банк") + "</div>"
    + '<div class="g2f">' + ctField("customer.bik", "БИК") + ctField("customer.ks", "Корр. счёт") + "</div>"
    + '<div class="g2f">' + ctField("customer.email", "E-mail", { req: false }) + ctField("customer.phone", "Телефон (сотовый)", { ph: "+7 …" }) + "</div>"
    + ctField("customer.party_text", "Текст о Заказчике в начале договора (собирается автоматически, можно править)", { area: true, rows: 3, wide: true })
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px"><button class="btn ghost sm" data-ctparty="1">Собрать текст заново</button></div>'
    + chk("__upd", "Обновить реквизиты в карточке заказчика при создании договора", !!c.upd) + "</div>";
  var f4 = '<div class="panel pad" style="margin-top:14px"><h3>4. Условия договора</h3>'
    + ctField("object_address", "Адрес объекта (после «на объекте, по адресу»)", { wide: true })
    + '<div class="g2f">' + ctField("days", "Срок оказания услуг, раб. дней", { type: "number" }) + ctField("pay_days", "Срок оплаты аванса и остатка, раб. дней", { type: "number" }) + "</div>"
    + '<div class="g2f">' + ctField("adv_pct", "Аванс, %", { type: "number" }) + ctField("warranty", "Гарантия, мес.", { type: "number" }) + "</div>"
    + ctField("messengers", "Мессенджеры рабочего чата", { wide: true })
    + chk("survey", "Объём услуг включает обследование объекта (п. 1.4, 4.1.7)", d.survey)
    + chk("paper", "С печатью документации (заказчику: PDF + бумажные экземпляры)", d.paper) + (d.paper ? ctField("paper_copies", "Бумажных экземпляров", { type: "number" }) : "")
    + chk("tz", "Приложение № 3 «Техническое задание»", d.tz) + (d.tz ? ctField("tz_sheets", "ТЗ — количество листов", { type: "number" }) : "") + "</div>";
  var rows = (d.services || []).map(function (x, i) {
    var inpS = 'style="border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--surface);color:var(--ink);width:100%"';
    return '<div class="dsv on" style="display:grid;grid-template-columns:1fr 70px 70px 110px 36px;gap:6px;align-items:center">'
      + '<input data-ctp="services.' + i + '.name" value="' + E(x.name) + '" placeholder="Наименование услуги" ' + inpS + ">"
      + '<input data-ctp="services.' + i + '.unit" value="' + E(x.unit) + '" placeholder="ед." ' + inpS + ">"
      + '<input type="number" min="0" step="0.01" data-ctp="services.' + i + '.qty" value="' + E(x.qty) + '" ' + inpS + ">"
      + '<input type="number" min="0" data-ctp="services.' + i + '.unit_price" value="' + E(x.unit_price) + '" ' + inpS + ">"
      + '<button class="btn ghost sm" data-ctsvdel="' + i + '">✕</button></div>';
  }).join("");
  var f5 = '<div class="panel pad" style="margin-top:14px"><h3>5. Услуги (Приложение № 1)</h3><p class="sub">Наименование · ед. · кол-во · цена за единицу</p>' + rows
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><select data-ctsvadd="1" ' + sel + ' style="flex:1;min-width:220px"><option value="">+ добавить из прайса…</option>'
    + priceOpts.map(function (i, j) { return '<option value="' + j + '">' + E(i.name) + " — " + money(i.price) + "</option>"; }).join("") + '</select>'
    + '<button class="btn ghost sm" data-ctsvnew="1">+ Своя позиция</button></div>'
    + '<div class="dbox"><small>Итого</small><b id="ctTotal" style="font-size:1.15rem">' + money(t.amount) + " · аванс " + money(t.adv) + " · остаток " + money(t.post) + "</b></div></div>";
  var acts = '<div class="panel pad" style="margin-top:14px"><div id="ctMiss">' + ctMissHtml(c.miss) + "</div>"
    + (c.err ? '<div class="err">' + E(c.err) + "</div>" : "")
    + '<div id="ctForceBox">' + ctForceHtml(c) + "</div>"
    + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" id="ctMake" data-ctmake="1"' + ((c.miss.length && !c.force) ? ' disabled style="opacity:.5"' : "") + ">" + ic("file") + (c.miss.length && c.force ? "Скачать договор (не все поля заполнены)" : c.saved ? "Сохранить договор" : "Создать договор") + "</button>"
    + (k && k.contract_number ? '<button class="btn ghost" data-doc="' + k.id + ':contract:docx">Скачать Word</button><button class="btn ghost" data-doc="' + k.id + ':contract:pdf">Скачать PDF</button><button class="btn ok" data-ctsign="1">Договор подписан</button>' : "") + "</div>"
    + (k && k.contract_number ? '<div class="autolist"><b>Договор №' + E(k.contract_number) + " сформирован.</b><ul style=\"margin-top:8px\"><li>Привязан к КП " + E(k.number) + " и заказчику «" + E(k.customer) + "»</li>"
      + "<li>После «Договор подписан» система создаст проектную задачу, папку на сервере и чат проекта</li>"
      + "<li>" + (k.has_adv ? "Есть аванс: задача ждёт оплату, бухгалтеру уйдёт «Выставить счёт на аванс»" : "Аванса нет: задача сразу уйдёт на «Сбор данных»") + "</li></ul></div>" : "") + "</div>";
  return head + '<div class="kpc"><div>' + f1 + f2 + f3 + f4 + f5 + acts + '</div><div><div class="paper" id="ctPaper" style="position:sticky;top:14px">' + ctPaper(d) + "</div></div></div>";
}
function makeContract() {
  var c = S.ct; c.err = ""; c.miss = ctMissing(c.data);
  var force = !!(c.force && (c.miss.length || c.errForce));
  if (c.miss.length && !force) { c.err = "Заполните обязательные поля или отметьте, что хотите скачать договор без них"; return paint(); }
  api("/kp/" + c.kid + "/contract", { data: c.data, save_customer: !!c.upd, force: force }).then(function () { c.saved = true; c.loadedFor = null; return loadKp(); })
    .then(function () { return loadContractDraft(); })
    .then(function () { toast("Договор сформирован" + (force ? ": скачиваю Word" : "")); paint(); if (force) return downloadDoc(c.kid, "contract", "docx"); },
      function (e) { c.err = String(e); if (/обязательные поля/i.test(c.err)) c.errForce = true; paint(); });
}
function newStandalone() {
  return api("/contracts/standalone", {}).then(function (r) { S.ct = { kid: r.id }; S.cmode = "kp"; return loadKp(); }).then(function () { return loadContractDraft(); })
    .then(function () { toast("Пустой договор создан: заполните данные"); if (location.hash !== "#/contracts") location.hash = "#/contracts"; else paint(); }, function (e) { toast(String(e)); });
}
function signContract() {
  var c = S.ct;
  var kpRow = (S.kp || []).filter(function (x) { return x.id === c.kid; })[0];
  api("/kp/" + c.kid + "/sign", {}).then(function (r) {
    S.ct = null; S.orders = null; S.tasks = null;
    makeFolder({ number: r.number, object: r.object != null ? r.object : (kpRow ? kpRow.object : ""), customer: r.customer || (kpRow ? kpRow.customer : ""), systems: r.systems, systems_other: r.systems_other, system: r.system });      // папка по шаблону через установленную кнопку (нужен VPN)
    toast("Договор подписан: создана задача №" + r.number + (r.stage === "Ожидает аванс" ? " (ждёт аванс)" : " (на «Сборе данных»)"));
    location.hash = "#/";
  }, function (e) { c.err = String(e); paint(); });
}
  /* ---------- скачивание документов КП (Word/PDF) ---------- */
function downloadDoc(kid, kind, fmt) {
  toast(fmt === "pdf" ? "Готовлю PDF… (первый раз до полминуты, повторно — сразу)" : "Готовлю Word…");
  return C.blob("/ds/kp/" + kid + "/doc?kind=" + kind + "&fmt=" + fmt).then(function (f) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(f.blob); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }, function (e) { toast(String(e)); });
}

  window.DSContract = { ctSetPath: ctSetPath, ctParty: ctParty, loadContractDraft: loadContractDraft, ctRefresh: ctRefresh, genScreen: genScreen, contractScreen: contractScreen, makeContract: makeContract, newStandalone: newStandalone, signContract: signContract, downloadDoc: downloadDoc };
})();
