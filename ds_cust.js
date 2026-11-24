/* Проекты DS — «Заказчики»: база заказчиков, поиск, карточка, реквизиты и часовой пояс (вынесено из ds.js 24.11, экономия токенов).
   Контекст ядра — DS._ctx (ds.js подключается раньше в index.html). */
(function () {
  "use strict";
  var X = window.DS._ctx;
  var S = X.S, E = X.E, api = X.api, toast = X.toast, paint = X.paint, dmy = X.dmy, pos = X.pos, ava = X.ava, ic = X.ic, can = X.can, find = X.find, card = X.card, screen = X.screen, tzLabel = X.tzLabel, nowIn = X.nowIn, cityNames = X.cityNames, cityZone = X.cityZone, load = X.load, callBar = X.callBar, callBtn = X.callBtn, callsPanel = X.callsPanel;
/* ---------- «Заказчики» ---------- */
var TZ = [["Europe/Kaliningrad", "Калининград (−1 к МСК)"], ["Europe/Moscow", "Москва (МСК)"], ["Europe/Samara", "Самара (+1 к МСК)"], ["Asia/Yekaterinburg", "Екатеринбург (+2 к МСК)"],
  ["Asia/Omsk", "Омск (+3 к МСК)"], ["Asia/Krasnoyarsk", "Красноярск (+4 к МСК)"], ["Asia/Irkutsk", "Иркутск (+5 к МСК)"], ["Asia/Yakutsk", "Якутск (+6 к МСК)"],
  ["Asia/Vladivostok", "Владивосток (+7 к МСК)"], ["Asia/Magadan", "Магадан (+8 к МСК)"], ["Asia/Kamchatka", "Камчатка (+9 к МСК)"]];
function custScreen() {
  var p = pos(), canEdit = p === "owner" || p === "sales" || p === "ops", list = S.customers || [], d = S.cu.draft;
  if (!can("customers")) return '<div class="head"><div><h1>База заказчиков</h1></div></div><div class="note">Раздел недоступен для вашей роли.</div>';
  var title = p === "design" ? "Кому звонить" : "База заказчиков";
  var head = '<div class="head"><div><h1>' + title + "</h1><p>" + (p === "design" ? "Заказчики ваших проектов: контакты, часовой пояс и комментарий менеджера. Звонки делаете вы." : "Компании, контактные лица, часовой пояс и комментарии менеджера") + "</p></div>"
    + (canEdit ? '<button class="btn accent" data-cnew="1">' + ic("plus") + "Новый заказчик</button>" : "") + "</div>"
    + "";
  var q = S.cu.q || "", shown = 0;
  var rows = list.map(function (c) {
    var m = (c.contacts && c.contacts[0]) || null, hit = custHit(c, q);
    if (hit) shown++;
    return '<button style="display:' + (hit ? "flex" : "none") + ';gap:14px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line);width:100%;text-align:left;' + (S.cu.sel === c.id ? "background:var(--brand-soft);box-shadow:inset 3px 0 0 var(--brand)" : "") + '" data-csel="' + c.id + '">'
      + ava(c.name, "lg") + '<div style="min-width:0"><b>' + E(c.name) + "</b> " + (c.regular ? '<span class="pill ok">постоянный</span>' : "") + '<div style="color:var(--muted);font-size:.86rem">' + (m && m.fio ? E(m.fio) + (m.pos ? " · " + E(m.pos) : "") : "контакт не указан") + "</div></div>"
      + '<div style="margin-left:auto;text-align:right"><b style="font-size:1.25rem;display:block">' + (c.works || 0) + '</b><small style="color:var(--muted)">работ за всё время</small>'
      + (c.fill != null ? '<div class="fillbar" title="Заполненность карточки: ' + c.fill + '%"><i style="width:' + c.fill + '%;background:' + (c.fill < 40 ? "var(--bad,#d33)" : c.fill < 75 ? "var(--warn,#e8a317)" : "var(--ok,#2a9d5c)") + '"></i></div><small style="color:var(--muted)">карточка ' + c.fill + "%</small>" : "")
      + "</div></button>";
  }).join("") || '<div class="note" style="padding:16px;margin:0">Заказчиков пока нет</div>';
  var det;
  if (!d) det = '<div class="panel pad"><p class="sub" style="margin:0">Выберите заказчика слева</p></div>';
  else {
    var ro = canEdit ? "" : " disabled";
    var tzOpts = TZ.map(function (z) { return '<option value="' + z[0] + '"' + (d.tz === z[0] ? " selected" : "") + ">" + E(z[1]) + "</option>"; }).join("");
    if (!TZ.some(function (z) { return z[0] === d.tz; }) && d.tz) tzOpts += '<option value="' + E(d.tz) + '" selected>' + E(d.tz) + "</option>";
    var jobs = (S.orders || []).filter(function (o) { return o.customer_id === d.id; });
    det = '<div class="panel pad"><h3>' + (d.id ? "Карточка заказчика" : "Новый заказчик") + "</h3>" + (d.id ? callBar(d.contacts, 0, d.id) : "")
      + (d.id && ["owner", "sales", "ops"].indexOf(pos()) >= 0 ? '<button class="btn ghost sm" style="margin-top:10px" data-botc="' + d.id + '" data-botn="' + E(d.name) + '" title="Личная ссылка и QR на MAX-бота: заказчик переходит — диалог сам привязывается к нему">Ссылка на MAX-бота</button>' : "")
      + '<div class="fld" style="margin-top:12px"><label>Наименование компании</label><input data-cf="name" value="' + E(d.name) + '"' + ro + "></div>"
      + '<div class="fld"><label><input type="checkbox" data-cfchk="1" ' + (d.regular ? "checked" : "") + ro + "> Постоянный заказчик</label></div>"
      + "<h3 style=\"margin-top:14px\">Контактные лица</h3>"
      + (d.contacts || []).map(function (c, i) {
        return '<div class="ctt" style="margin-top:10px"><div class="fld" style="margin-bottom:8px"><label>ФИО</label><input data-cf="c.' + i + '.fio" value="' + E(c.fio) + '"' + ro + "></div>"
          + '<div><div class="fld" style="margin-bottom:8px"><label>Должность</label><input data-cf="c.' + i + '.pos" value="' + E(c.pos) + '"' + ro + "></div>"
          + '<div class="fld" style="margin-bottom:0"><label>Сотовый телефон <span style="color:var(--bad)">*</span>' + (d.id ? callBtn(c.phone, 0, d.id) : "") + '</label><input data-cf="c.' + i + '.phone" value="' + E(c.phone) + '" placeholder="+7 …"' + (c.phone ? "" : ' style="border-color:var(--bad);background:var(--bad-soft)"') + ro + "></div></div>"
          + '<div class="fld" style="margin:8px 0 0"><label>E-mail (по нему диалоги привязываются к заказчику)</label><input data-cf="c.' + i + '.email" value="' + E(c.email || "") + '"' + ro + "></div>"
          + (canEdit && d.contacts.length > 1 ? '<button class="btn ghost sm" style="margin-top:8px" data-cdel="' + i + '">Убрать</button>' : "") + "</div>";
      }).join("")
      + (canEdit ? '<button class="btn ghost sm" style="margin:6px 0 12px" data-cadd="1">+ Контактное лицо</button>' : "")
      + reqBlock(d, ro)
      + '<div class="fld"><label>Город <small style="color:var(--muted)">(введите любой — часовой пояс подставится сам)</small></label><input data-cfcity="1" list="cityDl" value="' + E(d.city || "") + '" placeholder="Например: Красноярск"' + ro + '><datalist id="cityDl">' + cityNames().map(function (n) { return '<option value="' + E(n) + '">'; }).join("") + '</datalist><div class="note" id="cuCityNote" style="margin-top:4px"></div></div>'
      + '<div class="tzres" id="cuTzRes">🕒 ' + E(tzLabel(d.tz)) + ' · сейчас у заказчика <b id="cuNow">' + nowIn(d.tz) + "</b></div>"
      + '<details class="tzman"' + (d.city && !cityZone(d.city) ? " open" : "") + "><summary>Выбрать часовой пояс вручную</summary><select data-cftz=\"1\" id=\"cuTz\"" + ro + ">" + tzOpts + "</select></details>"
      + (d.id ? '<div id="cuAi" data-cid="' + d.id + '"></div><div id="cuNotes" data-cid="' + d.id + '"></div>'          // «Что с заказчиком?» (ai.js) и «Комментарии»: лента с автором и временем (chatpanel.js → MPBD.notes)
        : '<div class="fld"><label>Комментарий</label><textarea data-cf="comment" placeholder="Появится в «Комментариях» с вашим именем"' + ro + ">" + E(d.comment || "") + "</textarea></div>")
      + (S.cu.err ? '<div class="err">' + E(S.cu.err) + "</div>" : "")
      + (canEdit ? '<button class="btn primary block" data-csave="1">Сохранить</button>' : "")
      + (d.id && (p === "owner" || p === "ops") ? '<button class="btn ghost block" data-cdelcust="1" style="margin-top:8px;color:var(--bad)">Удалить заказчика</button>' : "")
      + (jobs.length ? '<h3 style="margin-top:16px">Задачи</h3>' + jobs.map(function (o) { return '<button class="doc" style="width:100%;text-align:left" data-open="' + o.id + '"><span>📁</span><div><b>№' + E(o.number) + " · " + E(o.object) + "</b><small>" + E(o.stage) + "</small></div></button>"; }).join("") : "")
      + "</div>" + (d.id ? callsPanel("customer", d.id) : "");
  }
  var search = list.length ? '<div style="padding:10px 12px;border-bottom:1px solid var(--line)"><input type="search" id="cuQ" value="' + E(q) + '" placeholder="Поиск: название, ИНН, контакт, телефон, почта" autocomplete="off" style="width:100%;border:1px solid var(--line);border-radius:11px;padding:9px 12px;background:var(--surface)"></div>'
    + '<div class="note" id="cuNone" style="padding:16px;margin:0;display:' + (shown ? "none" : "block") + '">Ничего не найдено</div>' : "";
  return head + '<div class="dsg21" style="align-items:start"><div class="panel">' + search + rows + "</div><div>" + det + "</div></div>";
}
/* быстрый поиск по базе заказчиков: все слова запроса должны найтись (без учёта регистра и «ё»); телефон и ИНН — по цифрам, «8 900…» = «+7 900…» */
function custNorm(s) { return String(s || "").toLowerCase().replace(/ё/g, "е"); }
function custHit(c, q) {
  q = custNorm(q).trim();
  if (!q) return true;
  var cs = c.contacts || [], digits = [c.inn].concat(cs.map(function (x) { return x.phone; })).map(function (x) { return String(x || "").replace(/\D/g, ""); });
  var text = custNorm([c.name, c.inn, c.city].concat(cs.map(function (x) { return [x.fio, x.pos, x.phone, x.email].join(" "); })).join(" ") + " " + digits.join(" "));
  if (/^[\d\s()+\-.]+$/.test(q)) {                          // похоже на телефон или ИНН — ищем цифры подряд в каждом номере
    var qd = q.replace(/\D/g, ""), alt = qd.length > 1 && qd[0] === "8" ? "7" + qd.slice(1) : "";
    if (qd && digits.some(function (d) { return d.indexOf(qd) >= 0 || (alt && d.indexOf(alt) === 0); })) return true;
  }
  return q.split(/\s+/).every(function (w) { return text.indexOf(w) >= 0; });
}
function custFilter() {
  var q = S.cu.q || "", by = {}, shown = 0;
  (S.customers || []).forEach(function (c) { by[c.id] = c; });
  document.querySelectorAll("[data-csel]").forEach(function (b) { var c = by[+b.dataset.csel], hit = !!c && custHit(c, q); b.style.display = hit ? "flex" : "none"; if (hit) shown++; });
  var none = document.getElementById("cuNone"); if (none) none.style.display = shown ? "none" : "block";
}
function reqBlock(d, ro) {
  if (d.inn === undefined && !pos().match(/^(owner|sales|ops)$/)) return "";          // роли без доступа к реквизитам блок не видят
  var f = function (k, label, ph) { return '<div class="fld" style="margin-bottom:8px"><label>' + label + '</label><input data-cf="' + k + '" value="' + E(d[k] || "") + '" placeholder="' + (ph || "") + '"' + ro + "></div>"; };
  return '<h3 style="margin-top:14px">Реквизиты</h3><p class="note" style="margin-top:2px">Попадают в договор. ИНН проверяется по контрольной сумме.</p>'
    + '<div class="g2f">' + f("inn", "ИНН", "10 или 12 цифр") + f("kpp", "КПП", "9 цифр") + "</div>"
    + f("address", "Юридический адрес", "") + f("bank_name", "Банк", "")
    + '<div class="g2f">' + f("bik", "БИК", "9 цифр") + f("signer_pos", "Должность подписанта", "в лице … (род. п.)") + "</div>"
    + f("rs", "Расчётный счёт", "20 цифр") + f("ks", "Корр. счёт", "20 цифр") + f("signer_fio", "ФИО подписанта", "Иванов Иван Иванович");
}
function saveCustomer() {
  var d = S.cu.draft; if (!d) return;
  if (!(d.name || "").trim()) { S.cu.err = "Укажите наименование компании"; return paint(); }
  var body = { name: d.name.trim(), regular: !!d.regular, tz: d.tz, city: d.city || "", contacts: (d.contacts || []).filter(function (c) { return c.fio || c.pos || c.phone || c.email; }) };
  var first = d.id ? "" : (d.comment || "").trim();          // комментарий нового заказчика — первой записью в «Комментарии», с автором
  if (!d.id) body.comment = "";
  ["inn", "kpp", "address", "bank_name", "bik", "rs", "ks", "signer_fio", "signer_pos"].forEach(function (k) { if (d[k] !== undefined) body[k] = d[k]; });
  var p = d.id ? api("/customers/" + d.id, body) : api("/customers", body);
  p.then(function (r) {
    S.customers = null; S.orders = null;
    var keep = d.id || (r && r.id) || null;
    return (first && keep ? api("/customers/" + keep + "/notes", { text: first }).then(null, function (er) { toast(String(er)); }) : Promise.resolve()).then(load).then(function () { S.cu.sel = keep; var c = (S.customers || []).filter(function (x) { return x.id === keep; })[0]; S.cu.draft = c ? JSON.parse(JSON.stringify(c)) : null; S.cu.err = ""; paint(); toast("Сохранено"); });
  }, function (er) { S.cu.err = String(er); paint(); });
}

  window.DSCust = { TZ: TZ, custScreen: custScreen, custNorm: custNorm, custHit: custHit, custFilter: custFilter, reqBlock: reqBlock, saveCustomer: saveCustomer };
})();
