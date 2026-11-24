/* Проекты DS — экран «Задачи»: канбан/список, организационные, ящик задачи, города и часовые пояса (вынесено из ds.js 24.11, экономия токенов).
   Контекст ядра — DS._ctx (ds.js подключается раньше в index.html). */
(function () {
  "use strict";
  var C = window.MPBC;
  var X = window.DS._ctx;
  var S = X.S, E = X.E, dmy = X.dmy, leftText = X.leftText, plural = X.plural, money = X.money, pos = X.pos, ava = X.ava, ic = X.ic, can = X.can, find = X.find, card = X.card, api = X.api, toast = X.toast, paint = X.paint, nowIn = X.nowIn, folderUrl = X.folderUrl, kpNo = X.kpNo, kpDone = X.kpDone, kpStatusLabel = X.kpStatusLabel, fullCtl = X.fullCtl, taskCtl = X.taskCtl, taskAuthor = X.taskAuthor, taskMine = X.taskMine, ovRow = X.ovRow, span = X.span, DONE_ST = X.DONE_ST, PAUSE = X.PAUSE, STAGE_COLOR = X.STAGE_COLOR, TZ = X.TZ, FOLDER_ROOT = X.FOLDER_ROOT, ackMine = X.ackMine, ackWhen = X.ackWhen, taskCard = X.taskCard, kpCard = X.kpCard, kpTone = X.kpTone, taskTone = X.taskTone, sysText = X.sysText, paused = X.paused, pauseText = X.pauseText;
/* ---------- «Задачи»: проектные и организационные, канбан или список ---------- */
var ORG_COLS = [["a1", "Обращение", "#378ADD"], ["a2", "Сбор вводных", "#534AB7"], ["a3", "КП и договор", "#BA7517"], ["p0", "Старт проекта", "#0F6E56"],
  ["p1", "Сдача проекта", "#993C1D"], ["c1", "Акт и оплата", "#1D9E75"], ["s1", "Постпродажа", "#5F5E5A"], ["np", "Не проектные работы", "#7A4FB5"], ["x", "Прочее", "#888780"]];
function orgCol(it) {
  if (it.o) return "np";
  if (it.kp) return it.kp.status === "В предоплате" ? "p0" : "a3";
  var s = it.t.step, ti = it.t.title || "";
  if (s === "a1" || s === "a2" || s === "a3") return s;
  if (/^Направить договор/.test(ti)) return "a3";
  if (/^(Собрать исходные|Выставить счёт на аванс)/.test(ti)) return "p0";
  if (/^(Отправить проект|Корректировка)/.test(ti)) return "p1";
  if (/^Направить акт/.test(ti)) return "c1";
  if (/^Постпродажное/.test(ti)) return "s1";
  return "x";
}
function orgItems() {
  var items = (S.tasks || []).filter(function (t) { return !(t.kind === "design" && /^(Проверить проект|Корректировка|Доработка)/.test(t.title || "")); })
    .map(function (t) { return { t: t, left: t.left_days, wait: t.state === "wait", text: (t.title || "") + " " + (t.assignee || "") + " " + (t.object || "") + " " + (t.note || "") }; });
  (S.orders || []).filter(function (o) { return o.nonproj && DONE_ST.indexOf(o.stage) < 0; }).forEach(function (o) { items.push(npItem(o)); });      // риски, планы эвакуации … ведёт операционный отдел
  (S.kp || []).filter(function (k) { return !kpDone(k) && !k.order_id; }).forEach(function (k) {
    items.push({ kp: k, left: k.last_days != null && k.last_days > 5 ? -1 : (k.last_days != null && k.last_days >= 3 ? 1 : 9), wait: k.status === "КП отправлено", text: k.number + " " + k.customer + " " + (k.object || "") });
  });
  return items;
}
function npItem(o) {
  var done = DONE_ST.indexOf(o.stage) >= 0;
  return { o: o, done: done, left: done || paused(o) ? null : o.left_days, wait: o.stage === "На согласовании", text: o.number + " " + (o.customer || "") + " " + (o.object || "") + " " + (o.system || "") + " " + sysText(o) + " " + (o.executor || "") };
}
function orgDone() {      // сданные и закрытые непроектные работы: иначе их не видно нигде
  return (S.orders || []).filter(function (o) { return o.nonproj && DONE_ST.indexOf(o.stage) >= 0; }).map(npItem)
    .sort(function (a, b) { return (Number(b.o.number) || 0) - (Number(a.o.number) || 0); });
}
function orgRow(it) {
  var u = it.t, tn;
  if (it.o) {
    var o = it.o;
    tn = paused(o) ? "muted" : o.left_days != null && o.left_days < 0 ? "bad" : o.left_days != null && o.left_days <= 2 ? "warn" : "ok";
    return '<div class="ovr"><div class="ovl"><span class="num">№' + E(o.number) + '</span><span class="cu" title="' + E(sysText(o) || o.object) + '">' + E(sysText(o) || "Не проектная работа") + '</span><span class="ob">' + E((o.customer ? o.customer + " · " : "") + (o.object || "")) + "</span>"
      + '<span class="pill info">' + E(o.stage) + '</span><span class="ex">' + E(o.executor || "не назначен") + '</span><span class="pill ' + tn + '">' + (paused(o) ? E(pauseText(o)) : (o.due_date ? "до " + dmy(o.due_date).slice(0, 5) + " · " : "") + E(leftText(o.left_days))) + '</span><span class="lc"></span><button class="cmb" data-open="' + o.id + '">Открыть</button></div></div>';
  }
  if (it.kp) {
    var k = it.kp;
    tn = kpTone(k);
    return '<div class="ovr"><div class="ovl"><span class="num">' + E(kpNo(k.number)) + '</span><span class="cu" title="' + E(k.customer) + '">' + E(k.customer) + '</span><span class="ob">' + E(k.object || "") + "</span>"
      + '<span class="pill info">' + E(kpStatusLabel(k.status)) + '</span><span class="ex">' + E(k.manager || "") + '</span><span class="pill ' + tn + '">'
      + (k.last_days == null ? "нет общения" : k.last_days === 0 ? "общались сегодня" : "без общения " + plural(k.last_days, ["день", "дня", "дней"])) + '</span><span class="lc"></span><a class="cmb" href="#/kpreg/">Открыть</a></div></div>';
  }
  tn = taskTone(u);
  var acts = "";
  if (u.step === "a1" || u.step === "a2") acts += '<button class="cmb" data-lead="' + u.id + ':skip" title="Задача не требуется">Не требуется</button><button class="cmb on" data-lead="' + u.id + ':next">Дальше →</button>';
  if (ackMine(u)) acts += '<button class="cmb on" data-tack="' + u.id + '" title="Подтвердить получение задачи">Получено</button>';
  acts += '<button class="cmb" data-tstate="' + u.id + ':done" title="Выполнено">✓</button>';
  if (taskCtl() || taskMine(u)) acts += '<button class="cmb" data-tedit="' + u.id + '" title="Править">✎</button>';
  if (taskCtl() || taskAuthor(u)) acts += '<button class="cmb" data-tdel="' + u.id + '" title="Удалить" style="color:var(--bad)">🗑</button>';
  return '<div class="ovr"><div class="ovl"><span class="num">' + (u.order_number ? "№" + E(u.order_number) : "—") + '</span><span class="cu" title="' + E(u.title) + '">' + E((u.title || "").replace(/:\s*№.*$/, "")) + '</span><span class="ob">' + E(u.object || u.note || "") + "</span>"
    + '<span class="ex">' + E(u.assignee || "") + '</span><span class="pill ' + tn + '">' + (u.due ? "до " + dmy(u.due).slice(0, 5) + " · " : "") + E(leftText(u.left_days)) + '</span><span class="lc">' + (u.author ? "от " + E(u.author) : "") + "</span>" + acts + "</div></div>";
}
/* ---------- «Организационные» списком: группы по сроку, строка на задачу, карточка справа ---------- */
var OL_CSS = ".ds .olbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 0}"
  + ".ds .olchip{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 12px 4px 4px;display:inline-flex;align-items:center;gap:7px;color:var(--ink);font:inherit;font-size:.88rem;cursor:pointer}"
  + ".ds .olchip.pl{padding-left:12px}.ds .olchip small{color:var(--muted);font-weight:500}.ds .olchip.on{border-color:var(--brand);background:var(--brand-soft);color:var(--brand);font-weight:600}.ds .olchip.on small{color:var(--brand)}"
  + ".ds .olchip .ava.sm{width:22px;height:22px;font-size:.62rem}.ds .olmore{width:auto;flex:none;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:5px 10px;color:var(--ink);font:inherit;font-size:.88rem;min-height:0;height:auto}"
  + ".ds .olq{margin-left:auto;display:flex;align-items:center;flex:0 1 280px;min-width:200px;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:0 12px}.ds .olq input{border:0;background:transparent;outline:0;box-shadow:none;width:100%;color:var(--ink);font:inherit;padding:7px 0;margin:0;height:auto;min-height:0}"
  + ".ds .oltabs{display:flex;gap:20px;border-bottom:1px solid var(--line);margin:12px 0 14px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.ds .oltabs button{border:0;background:none;padding:9px 0;color:var(--muted);font:inherit;font-weight:500;border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;white-space:nowrap}"
  + ".ds .oltabs button.on{color:var(--ink);border-color:var(--ink);font-weight:600}.ds .oltabs i{font-style:normal;margin-left:5px;font-size:.8rem;color:var(--muted)}.ds .oltabs i.bad{color:var(--bad);font-weight:700}"
  + ".ds .olwrap{display:flex;gap:20px;align-items:flex-start}.ds .ollist{flex:1;min-width:0}.ds .olg{margin-bottom:18px}"
  + ".ds .olgh{font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:2px 4px 8px}.ds .olgh.bad{color:var(--bad)}.ds .olgh span{letter-spacing:0;margin-left:6px}"
  + ".ds .olrows{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}"
  + ".ds .olr{display:grid;grid-template-columns:24px minmax(0,1fr) 150px 160px 96px;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid var(--line);cursor:pointer;position:relative;color:inherit;text-decoration:none}"
  + ".ds .olr:first-child{border-top:0}.ds .olr:hover{background:var(--surface-2)}.ds .olr.sel{background:var(--brand-soft)}.ds .olr.sel::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--brand)}"
  + ".ds .olck{width:18px;height:18px;border:1.6px solid var(--grid);border-radius:50%;background:var(--surface);padding:0;cursor:pointer}.ds .olck:hover{border-color:var(--ok);background:var(--ok-soft)}"
  + ".ds .olt{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ds .ols{color:var(--muted);font-size:.8rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
  + ".ds .oltag{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);white-space:nowrap;overflow:hidden}.ds .oltag b{width:8px;height:8px;border-radius:50%;flex:none}"
  + ".ds .olwho{display:flex;align-items:center;gap:8px;font-size:.84rem;white-space:nowrap;overflow:hidden;min-width:0}.ds .olwho .ava.sm{width:22px;height:22px;font-size:.62rem}"
  + ".ds .oldue{text-align:right;font-size:.84rem;font-weight:600;white-space:nowrap}.ds .oldue.bad{color:var(--bad)}.ds .oldue.warn{color:var(--warn)}.ds .oldue.muted,.ds .oldue.info{color:var(--muted);font-weight:500}"
  + ".ds .olst{font-size:.68rem;font-weight:600;border-radius:6px;padding:1px 6px;margin-left:6px;vertical-align:1px}.ds .olst.wait{color:var(--warn);background:var(--warn-soft)}.ds .olst.work{color:var(--brand);background:var(--brand-soft)}"
  + ".ds .olshow{display:block;width:100%;border:0;border-top:1px solid var(--line);background:var(--surface-2);color:var(--brand);padding:9px;font:inherit;font-weight:600;font-size:.84rem;cursor:pointer}"
  + ".ds .oldr{width:380px;flex:none;background:var(--surface);border:1px solid var(--line);border-radius:16px;position:sticky;top:16px;box-shadow:var(--shadow-m);max-height:calc(100vh - 32px);overflow:auto}"
  + ".ds .oldh{padding:16px 18px 12px;border-bottom:1px solid var(--line)}.ds .oldh .x{float:right;border:0;background:none;color:var(--muted);font-size:1.1rem;cursor:pointer}.ds .oldh .k{font-size:.78rem;color:var(--muted);display:flex;gap:8px;align-items:center;flex-wrap:wrap}"
  + ".ds .oldh h2{font-size:1.1rem;margin:6px 0 0;line-height:1.3}.ds .oldb{padding:14px 18px 18px}.ds .olkv{display:grid;grid-template-columns:104px minmax(0,1fr);gap:9px 10px;font-size:.88rem;margin:0}.ds .olkv dt{color:var(--muted)}.ds .olkv dd{margin:0;min-width:0;overflow-wrap:anywhere}"
  + ".ds .olkv .lnk{border:0;background:none;padding:0;color:var(--brand);font:inherit;font-weight:600;cursor:pointer}.ds .olmemo{background:var(--surface-2);border-radius:10px;padding:10px 12px;font-size:.86rem;margin:14px 0 0;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}.ds .olfold{display:flex;gap:10px;margin:0 0 14px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.ds .olfold>span{font-size:1.2rem}.ds .olfold b{display:block;font-size:.8rem;overflow-wrap:anywhere}.ds .olfold small{display:block;color:var(--muted);font-size:.74rem;margin:3px 0 8px}.ds .oltm .oldr{width:100%;position:static;border:0;box-shadow:none;max-height:none}"
  + ".ds .olacts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.ds .olacts .btn{white-space:nowrap}.ds .olacts .grow1{flex:1}"
  + "@media (max-width:1100px){.ds .oldr{position:fixed;right:0;top:0;bottom:0;width:min(420px,100%);max-height:none;border-radius:0;z-index:60}.ds .olr{grid-template-columns:24px minmax(0,1fr) 92px}.ds .olr .oltag,.ds .olr .olwho{display:none}.ds .olq{min-width:0;flex:1 1 100%}}";
function olCss() { if (!document.getElementById("ds-olist-css")) { var st = document.createElement("style"); st.id = "ds-olist-css"; st.textContent = OL_CSS; document.head.appendChild(st); } }
function olKey(x) { return x.t ? "t" + x.t.id : x.o ? "o" + x.o.id : "k" + x.kp.id; }
function olColOf(x) { var c = orgCol(x); return ORG_COLS.filter(function (z) { return z[0] === c; })[0] || ORG_COLS[ORG_COLS.length - 1]; }
function olDue(x) {                                    // [текст, тон] срока строки
  if (x.kp) { var k = x.kp; return [k.last_days == null ? "нет общения" : k.last_days === 0 ? "сегодня" : "−" + k.last_days + " дн. без связи", kpTone(k)]; }
  if (x.done) return [x.o.stage === "Закрыто" ? "закрыто" : "сдано", "ok"];
  var l = x.left, due = x.t ? x.t.due : x.o.due_date;
  if (l == null) return [due ? dmy(due).slice(0, 5) : "без срока", "muted"];
  if (l < 0) return ["−" + Math.abs(l) + " дн.", "bad"];
  if (l === 0) return ["сегодня", "warn"];
  if (l === 1) return ["завтра", "warn"];
  return [due ? dmy(due).slice(0, 5) : "через " + l + " дн.", "info"];
}
function olRow(x, sel) {
  var col = olColOf(x), du = olDue(x), title, sub, who, attr, ck = "<span></span>";
  if (x.t) {
    var t = x.t;
    title = E((t.title || "").replace(/:\s*№.*$/, "")) + (t.ack_wait ? '<span class="olst wait">не подтверждена</span>' : t.state === "wait" ? '<span class="olst wait">ждём ответа</span>' : t.state === "work" ? '<span class="olst work">в работе</span>' : "");
    sub = [t.order_number ? "№" + t.order_number : "", t.object || t.note || ""].filter(Boolean).join(" · ");
    who = t.assignee || "";
    attr = 'data-osel="' + olKey(x) + '"';
    ck = '<button type="button" class="olck" data-tstate="' + t.id + ':done" title="Выполнено"></button>';
  } else if (x.o) {
    var o = x.o;
    title = E(sysText(o) || "Не проектная работа");
    sub = ["№" + o.number, o.customer || "", o.object || ""].filter(Boolean).join(" · ");
    who = o.executor || "";
    attr = 'data-open="' + o.id + '" title="Открыть задачу №' + E(o.number) + '"';
  } else {
    var k = x.kp;
    title = E(kpNo(k.number)) + " · " + E(kpStatusLabel(k.status));
    sub = [k.customer || "", k.object || "", k.amount ? money(k.amount) : ""].filter(Boolean).join(" · ");
    who = k.manager || "";
    attr = 'data-kpgo="1" title="Открыть реестр КП"';
  }
  return '<div class="olr' + (sel ? " sel" : "") + '" ' + attr + ">" + ck + '<div style="min-width:0"><div class="olt">' + title + '</div><div class="ols">' + E(sub || "—") + "</div></div>"
    + '<span class="oltag"><b style="background:' + col[2] + '"></b>' + E(col[0] === "np" ? "Не проектная" : col[1]) + "</span>"
    + '<span class="olwho">' + (who ? ava(who, "sm") + E(who) : '<span style="color:var(--muted)">не назначен</span>') + "</span>"
    + '<span class="oldue ' + du[1] + '">' + E(du[0]) + "</span></div>";
}
function olGroups(shown, f) {
  var G = [["over", "Просрочено", function (x) { return !x.done && x.left != null && x.left < 0; }], ["today", "Сегодня", function (x) { return !x.done && x.left === 0; }],
    ["week", "Ближайшие дни", function (x) { return !x.done && x.left != null && x.left > 0 && x.left <= 7; }], ["later", "Позже и без срока", function (x) { return !x.done; }]];
  var left = shown.filter(function (x) { return !x.done; }), dn = shown.filter(function (x) { return x.done; }), more = f.more || {}, out = "";
  if (dn.length) G.push(["done", "Сданные и закрытые", function (x) { return x.done; }]);
  left = left.concat(dn);
  G.forEach(function (g) {
    var arr = left.filter(g[2]); left = left.filter(function (x) { return arr.indexOf(x) < 0; });
    if (!arr.length) return;
    var lim = more[g[0]] ? arr.length : 8;
    out += '<div class="olg"><div class="olgh' + (g[0] === "over" ? " bad" : "") + '">' + g[1] + "<span>" + arr.length + '</span></div><div class="olrows">'
      + arr.slice(0, lim).map(function (x) { return olRow(x, f.sel === olKey(x)); }).join("")
      + (arr.length > lim ? '<button type="button" class="olshow" data-gmore="' + g[0] + '">Показать ещё ' + (arr.length - lim) + "</button>" : "") + "</div></div>";
  });
  return out || '<div class="note">Ничего не найдено</div>';
}
function replyBox(t) {
  if (S.trep !== t.id) return "";
  return '<span class="ovc-f" data-trbox="1" style="display:flex;gap:8px;margin-top:8px"><textarea rows="2" style="flex:1;min-width:0" data-trd="' + t.id + '" placeholder="' + (t.src_room ? "Ответ в чат" : "Ответ для: " + E(t.author || "")) + '…">' + E((S.trDraft || {})[t.id] || "") + '</textarea><button class="btn primary sm" data-trsend="' + t.id + '">Отправить</button></span>';
}
function taskFolder(t) {
  if (!t.order_id || !t.order_number) return "";
  return '<div class="olfold"><span>📂</span><div><b>' + E(FOLDER_ROOT + "\\" + t.order_number + ". " + (t.object || "")) + "</b><small>Папка задачи на сервере — материалы и то, что нужно сделать</small>"
    + '<a class="btn primary sm" style="text-decoration:none" href="' + folderUrl({ number: t.order_number, object: t.object }, false) + '">Перейти в папку на сервере</a></div></div>';
}
function olDrawer(t) {
  var x = { t: t, left: t.left_days }, col = olColOf(x), du = olDue(x), tn = taskTone(t);
  var proj = t.order_id && !!find(t.order_id);
  var acts = ackMine(t) ? '<div class="olacts"><button class="btn primary sm grow1" data-tack="' + t.id + '">✓ Подтвердить получение</button></div>' : "";
  if (t.visit_id) acts += '<div class="olacts"><a class="btn primary sm grow1" style="text-decoration:none;justify-content:center" href="#/visits?v=' + t.visit_id + '">📍 Открыть выезд: адрес, материалы, расходы</a></div>';
  if (t.step === "a1" || t.step === "a2") acts += '<div class="olacts"><button class="btn ghost sm" data-lead="' + t.id + ':skip">Задача не требуется</button><button class="btn primary sm grow1" data-lead="' + t.id + ':next">Передать дальше → ' + (t.step === "a1" ? "Сбор вводных" : "КП") + "</button></div>";
  if (t.can_reply) acts += '<div class="olacts"><button class="btn ghost sm grow1" data-trep="' + t.id + '">💬 Написать ответ' + (t.src_room ? " в чат" : t.author ? ": " + E(t.author) : "") + "</button></div>" + replyBox(t);
  acts += '<div class="olacts"><button class="btn ok sm grow1" data-tstate="' + t.id + ':done">✓ Выполнено</button>'
    + '<button class="btn ' + (t.state === "work" ? "primary" : "ghost") + ' sm" data-tstate="' + t.id + ':work">В работу</button>'
    + '<button class="btn ' + (t.state === "wait" ? "primary" : "ghost") + ' sm" data-tstate="' + t.id + ':wait">Ждём ответа</button></div>';
  var ed = taskCtl() || taskMine(t), dl = taskCtl() || taskAuthor(t);
  if (ed || dl) acts += '<div class="olacts">' + (ed ? '<button class="btn ghost sm grow1" data-tedit="' + t.id + '">✎ Изменить или перенести срок</button>' : "") + (dl ? '<button class="btn ghost sm" data-tdel="' + t.id + '" style="color:var(--bad)" title="Удалить задачу">🗑</button>' : "") + "</div>";
  return '<aside class="oldr"><div class="oldh"><button class="x" data-oselx="1" title="Закрыть">✕</button><div class="k"><span class="oltag"><b style="background:' + col[2] + '"></b>' + E(col[1]) + "</span>" + (t.author ? "<span>· от " + E(t.author) + "</span>" : "") + "</div>"
    + "<h2>" + E((t.title || "").replace(/:\s*№.*$/, "")) + '</h2></div><div class="oldb">' + taskFolder(t) + '<dl class="olkv">'
    + '<dt>Срок</dt><dd style="font-weight:600;color:' + (tn === "bad" ? "var(--bad)" : tn === "warn" ? "var(--warn)" : "inherit") + '">' + (t.due ? dmy(t.due) + " · " : "") + E(leftText(t.left_days)) + "</dd>"
    + "<dt>Исполнитель</dt><dd>" + (t.assignee ? '<span class="olwho">' + ava(t.assignee, "sm") + E(t.assignee) + "</span>" : "—") + "</dd>"
    + (t.need_ack ? '<dt>Получение</dt><dd style="color:' + (t.ack_wait ? "var(--warn)" : "inherit") + '">' + (t.ack_wait ? "Не подтверждено" : "Подтверждено " + E(ackWhen(t))) + "</dd>" : "")
    + (t.order_id ? "<dt>Задача в CRM</dt><dd>" + (proj ? '<button class="lnk" data-open="' + t.order_id + '">№' + E(t.order_number) + " →</button>" : "№" + E(t.order_number) + ' <span style="color:var(--muted)">· карточка вам не видна, всё нужное — в папке</span>') + "</dd>" : "")
    + (t.object ? "<dt>Объект</dt><dd>" + E(t.object) + "</dd>" : "")
    + (proj ? '<dt>Чат задачи</dt><dd><button class="lnk" data-taskchat="' + t.order_id + '">Перейти в чат →</button></dd>' : "")
    + (t.thread_id ? '<dt>Переписка</dt><dd><button class="lnk" data-chatopen="' + E(t.thread_id) + '">Открыть диалог →</button></dd>' : "")
    + "</dl>" + (t.note ? '<div class="olmemo">' + E(t.note) + "</div>" : "") + acts + "</div></aside>";
}
/* emb — экран встроен в «Работа → Конвейер» (work_conv.js, вид «Список» или «Организационные»): без своей шапки и поля поиска (они в шапке Конвейера) */
function screen(emb) {
  var p = pos(), canAll = p === "owner" || p === "sales" || p === "ops", isAcc = p === "acc", orgOk = canAll || isAcc;
  var type = emb ? (emb.type === "o" && orgOk ? "o" : "p") : orgOk && (S.kb === "o" || S.kb === "a" || S.kb === "s" || (isAcc && !S.kb)) ? "o" : "p";
  var view = S.view; if (!view) { try { view = localStorage.getItem("ds_view") || "k"; } catch (e) { view = "k"; } }
  if (emb && type === "p") view = "l";
  if (type === "o") { view = S.oview; if (!view) { try { view = localStorage.getItem("ds_oview") || "l"; } catch (e) { view = "l"; } } }      // «Организационные»: по умолчанию список
  var f = S.ov, q = (f.q || "").toLowerCase();
  var tabs = orgOk ? '<div class="seg">' + [["p", "Проектные"], ["o", "Организационные"]].map(function (x) { return '<button data-kb="' + x[0] + '" class="' + (type === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>" : "";
  var views = '<div class="seg">' + (type === "o" ? [["l", "Список"], ["k", "Канбан"]] : [["k", "Канбан"], ["l", "Список"]]).map(function (x) { return '<button data-' + (type === "o" ? "oview" : "view") + '="' + x[0] + '" class="' + (view === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>";
  var btns = '<div style="display:flex;gap:10px;flex-wrap:wrap">' + (type === "p" && fullCtl() ? '<button class="btn ghost" data-new="work" title="Исходные уже есть: задача минует аванс и сбор данных и сразу уходит исполнителю «В проектирование»">' + ic("plus") + "Сразу в проектирование</button>" : "")
    + (type === "p" && taskCtl() ? '<button class="btn ghost" data-new="fix" title="Замечания по уже сделанному проекту: задача сразу встаёт на «Корректировку» со сроком">' + ic("plus") + "Сразу на корректировку</button>" : "")
    + '<button class="btn accent" data-ntopen="1">' + ic("plus") + "Новая задача</button></div>";
  var head = '<div class="head"><div><h1>Задачи</h1><p>' + (type === "p" ? "Проекты по стадиям: нажмите на номер, чтобы открыть окно задачи" : "Продажи, операционный менеджер и бухгалтерия — одной цепочкой от обращения до закрытия") + "</p></div>" + btns + "</div>"
    + '<div class="tb">' + tabs + '<span class="grow"></span><span class="vlab">Вид</span>' + views + "</div>";
  var search = '<div class="tools"><label class="search" style="flex:1;display:flex;gap:10px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:13px;padding:10px 14px"><input id="dsQ" style="border:0;background:transparent;outline:0;width:100%" placeholder="' + (type === "p" ? "Номер, заказчик, объект, исполнитель…" : "Название, заказчик, исполнитель…") + '" value="' + E(f.q) + '"></label></div>';
  function tiles(arr) { return '<div class="tiles">' + arr.map(function (x) { return '<button class="tile ' + (f.tile === x[0] ? "on" : "") + '" data-tile="' + x[0] + '" style="--c:' + x[2] + '"><div class="n">' + x[3] + '</div><div class="l">' + x[1] + "</div></button>"; }).join("") + "</div>"; }
  var body;
  if (type === "o") {
    // «Чьи задачи»: при входе — только свои (руководителю — все), можно выбрать «Все» или сотрудника
    var me = C && C.me, meName = me ? me.name : "";
    if (f.who == null) f.who = p === "owner" ? "" : "me";
    var whoOf = function (x) { return x.kp ? (x.kp.manager || "") : x.o ? (x.o.executor || "") : (x.t.assignee || ""); };
    var mineIt = function (x) {
      if (x.kp) return !!meName && x.kp.manager === meName;
      if (x.o) return !!me && x.o.executor_id === me.id;
      return x.t.assignee_id ? !!me && x.t.assignee_id === me.id : !!x.t.assignee_pos && x.t.assignee_pos === p;
    };
    var allRows = orgItems(), nMine = allRows.filter(mineIt).length;
    var names = {}; allRows.forEach(function (x) { var w = whoOf(x); if (w && w !== meName) names[w] = (names[w] || 0) + 1; });
    var byWho = function (x) { return !f.who ? true : f.who === "me" ? mineIt(x) : whoOf(x) === f.who; };
    var rows = allRows.filter(byWho), doneRows = orgDone().filter(byWho);
    olCss();
    var top = Object.keys(names).sort(function (a, b) { return names[b] - names[a] || a.localeCompare(b, "ru"); }), extra = top.slice(5);
    top = top.slice(0, 5); if (f.who && f.who !== "me" && top.indexOf(f.who) < 0 && names[f.who]) top.push(f.who);
    var chip = function (v, label, n, av) { return '<button type="button" class="olchip' + (av ? "" : " pl") + (f.who === v ? " on" : "") + '" data-who="' + E(v) + '">' + (av ? ava(av, "sm") : "") + E(label) + " <small>" + n + "</small></button>"; };
    search = '<div class="olbar">' + chip("me", "Мои", nMine, meName) + chip("", "Все", allRows.length)
      + top.map(function (n) { return chip(n, n, names[n], n); }).join("")
      + (extra.length ? '<select id="dsWho" class="olmore" title="Другие сотрудники"><option value="">Ещё ' + extra.length + "…</option>" + extra.map(function (n) { return '<option value="' + E(n) + '">' + E(n) + " · " + names[n] + "</option>"; }).join("") + "</select>" : "")
      + (emb ? "" : '<label class="olq"><input id="dsQ" placeholder="Поиск: задача, №, заказчик…" value="' + E(f.q) + '"></label>') + "</div>";
    var isOver = function (x) { return x.left != null && x.left < 0; }, cnt = { all: rows.length, over: rows.filter(isOver).length, today: rows.filter(function (x) { return x.left === 0; }).length, wait: rows.filter(function (x) { return x.wait; }).length, np: rows.filter(function (x) { return !!x.o; }).length };
    var tl = [["all", "Все", cnt.all], ["over", "Просрочено", cnt.over], ["today", "Сегодня", cnt.today], ["wait", "Ждут ответа", cnt.wait]];
    if (cnt.np) tl.push(["np", "Не проектные", cnt.np]);
    if (doneRows.length) tl.push(["done", "Сданные", doneRows.length]);
    var cur = f.tile && tl.some(function (z) { return z[0] === f.tile; }) ? f.tile : "all";
    var tabsO = '<div class="oltabs">' + tl.map(function (z) { return '<button type="button" class="' + (cur === z[0] ? "on" : "") + '" data-tile="' + z[0] + '">' + z[1] + '<i class="' + (z[0] === "over" && z[2] ? "bad" : "") + '">' + z[2] + "</i></button>"; }).join("") + "</div>";
    var shown = (cur === "done" ? doneRows : cur === "all" && q ? rows.concat(doneRows) : rows).filter(function (x) {
      if (cur === "over" && !isOver(x)) return false;
      if (cur === "today" && x.left !== 0) return false;
      if (cur === "wait" && !x.wait) return false;
      if (cur === "np" && !x.o) return false;
      return !q || x.text.toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return (a.left == null ? 999 : a.left) - (b.left == null ? 999 : b.left); });
    if (view === "l") {
      var selT = f.sel && f.sel.charAt(0) === "t" ? (S.tasks || []).filter(function (t) { return "t" + t.id === f.sel; })[0] : null;
      body = '<div class="olwrap"><div class="ollist">' + olGroups(shown, f) + "</div>" + (selT ? olDrawer(selT) : "") + "</div>";
    } else {
      var used = ORG_COLS.filter(function (c) { return shown.some(function (x) { return orgCol(x) === c[0]; }); });
      body = used.length ? '<div class="board">' + used.map(function (c) {
        var arr = shown.filter(function (x) { return orgCol(x) === c[0]; });
        return '<div class="col"><div class="col-h cl" style="--c:' + c[2] + '"><b>' + c[1] + '</b><span class="n">' + arr.length + "</span></div>" + arr.map(function (x) { return x.kp ? kpCard(x.kp) : x.o ? card(x.o, true) : taskCard(x.t); }).join("") + "</div>";
      }).join("") + "</div>" : '<div class="note">Ничего не найдено</div>';
    }
    if (emb) return '<div class="tb" style="margin:0 0 6px"><span class="grow"></span><span class="vlab">Вид</span>' + views + "</div>" + search + tabsO + body;
    return '<div class="ds dspage">' + head + search + tabsO + body + "</div>";
  }
  var all = (S.orders || []).filter(function (o) { return !o.nonproj; }), act_ = all.filter(function (o) { return DONE_ST.indexOf(o.stage) < 0 && !paused(o); });      // пауза — не «в работе» и не горит
  var hasMoney = can("money");
  var cn = {
    active: act_.length,
    over: act_.filter(function (o) { return o.left_days != null && o.left_days < 0; }).length,
    hot: act_.filter(function (o) { return o.left_days != null && o.left_days >= 0 && o.left_days <= 2; }).length,
    review: all.filter(function (o) { return o.stage === "На согласовании"; }).length,
    edits: all.filter(function (o) { return o.edits > 0; }).length,
    unpaid: hasMoney ? all.filter(function (o) { return !o.post_paid && !o.adv_paid && o.stage !== "Закрыто"; }).length : 0
  };
  var visStages = S.meta.stages || [];
  var T = [["active", "В работе", "var(--brand)"], ["over", "Просрочено", "var(--bad)"], ["hot", "Горят (≤ 2 дн.)", "var(--accent)"]];
  if (visStages.indexOf("На согласовании") >= 0) T.push(["review", "На согласовании", "#e0a21c"]);
  T.push(["edits", "Правок от заказчиков", "#8b6fe0"]);
  if (hasMoney) T.push(["unpaid", "Не оплачено", "var(--ok)"]);
  var list = all.filter(function (o) {
    var isAct = DONE_ST.indexOf(o.stage) < 0 && !paused(o), l = o.left_days;
    if (f.tile === "active" && !isAct) return false;
    if (f.tile === "over" && !(isAct && l != null && l < 0)) return false;
    if (f.tile === "hot" && !(isAct && l != null && l >= 0 && l <= 2)) return false;
    if (f.tile === "review" && o.stage !== "На согласовании") return false;
    if (f.tile === "edits" && !(o.edits > 0)) return false;
    if (f.tile === "unpaid" && (o.post_paid || o.adv_paid || o.stage === "Закрыто")) return false;
    if (f.stage && o.stage !== f.stage) return false;
    if (q && (o.number + " " + (o.customer || "") + " " + o.object + " " + (o.system || "") + " " + sysText(o) + " " + (o.executor || "")).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }).sort(function (a, b) { return (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0) || (a.left_days == null ? 9999 : a.left_days) - (b.left_days == null ? 9999 : b.left_days); });
  // поиск находит и не проектные работы (риски, категории …): они ведутся в «Организационных», здесь — ссылкой
  var npHits = q ? (S.orders || []).filter(function (o) { return o.nonproj && (o.number + " " + (o.customer || "") + " " + o.object + " " + (o.system || "") + " " + sysText(o) + " " + (o.executor || "")).toLowerCase().indexOf(q) >= 0; }) : [];
  var npNote = npHits.length ? '<div class="note" style="margin:0 0 12px">Не проектные работы — во вкладке «Организационные»: ' + npHits.slice(0, 8).map(function (o) {
    return '<button type="button" class="chip" data-open="' + o.id + '" style="margin:2px 4px">№' + E(o.number) + " · " + E(o.stage) + "</button>"; }).join("") + (npHits.length > 8 ? " и ещё " + (npHits.length - 8) : "") + "</div>" : "";
  var WAITK = "В проектировании · не начато", colOf = function (o) { return o.stage === "Готов к проектированию" && o.executor_id ? WAITK : o.stage; };      // исполнитель назначен, а в работу ещё не взяли
  var chips = '<div class="chips"><button class="chip ' + (!f.stage ? "on" : "") + '" data-ostage="">Все стадии</button>'
    + visStages.map(function (s) { return '<button class="chip ' + (f.stage === s ? "on" : "") + '" data-ostage="' + E(s) + '"><i class="dot" style="background:' + (STAGE_COLOR[s] || "#999") + '"></i>' + E(s) + "</button>"; }).join("") + "</div>";
  if (view === "l") body = '<div class="ovlist">' + (list.map(ovRow).join("") || '<div class="note">Ничего не найдено</div>') + "</div>";
  else {
    var st = [];
    visStages.forEach(function (s) { if (s !== "Закрыто") st.push(s); if (s === "Готов к проектированию") st.push(WAITK); });
    var filled = st.filter(function (s) { return list.some(function (o) { return colOf(o) === s; }); });
    var empty = st.filter(function (s) { return filled.indexOf(s) < 0 && s !== WAITK && s !== PAUSE; });
    var closed = visStages.indexOf("Закрыто") >= 0 ? list.filter(function (o) { return o.stage === "Закрыто"; }) : [];
    var clOpen = S.showClosed || !!q || f.stage === "Закрыто";
    var clCol = closed.length ? '<div class="col' + (clOpen ? "" : " col-shut") + '" data-dropstage="Закрыто"><div class="col-h cl" style="--c:' + STAGE_COLOR["Закрыто"] + '"><b>Закрыто</b><span class="n">' + closed.length + "</span>"
      + (q || f.stage === "Закрыто" ? "" : '<button type="button" data-showclosed="1" style="border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;border-radius:8px;padding:2px 9px;font:inherit;font-size:.76rem;cursor:pointer">' + (clOpen ? "Скрыть" : "Показать") + "</button>") + "</div>"
      + (clOpen ? closed.map(function (o) { return card(o); }).join("") : '<div class="note" style="font-size:.8rem">Закрытые задачи свёрнуты</div>') + "</div>" : "";
    body = '<div class="board">' + filled.map(function (s) {
      var items = list.filter(function (o) { return colOf(o) === s; }), wk = s === WAITK;
      return '<div class="col"' + (s === PAUSE ? "" : ' data-dropstage="' + E(wk ? "Готов к проектированию" : s) + '"') + '><div class="col-h cl" style="--c:' + (wk ? "#6f9fd8" : STAGE_COLOR[s] || "#888") + '"' + (wk ? ' title="Исполнитель назначен, работу ещё не начали: кнопка «В проектирование» в окне задачи"' : "") + "><b>" + E(s) + '</b><span class="n">' + items.length + "</span></div>" + items.map(function (o) { return card(o); }).join("") + "</div>";
    }).join("") + clCol + "</div>" + (!filled.length && !closed.length ? '<div class="note">Ничего не найдено</div>' : "")
      + (empty.length ? '<div class="empty-stages"><span>Пустые этапы:</span>' + empty.map(function (s) { return '<span class="pill muted" data-dropstage="' + E(s) + '"><i class="dot" style="background:' + (STAGE_COLOR[s] || "#999") + '"></i>' + E(s) + "</span>"; }).join("") + "</div>" : "");
  }
  if (emb) return tiles(T.map(function (x) { return [x[0], x[1], x[2], cn[x[0]]]; })) + chips + npNote + body;
  return '<div class="ds dspage">' + head + tiles(T.map(function (x) { return [x[0], x[1], x[2], cn[x[0]]]; })) + search + chips + npNote + body + "</div>";
}

/* ---------- «Скрипты»: тексты для переписки, заводятся и правятся самостоятельно ---------- */
/* ---------- города → часовой пояс заказчика ---------- */
var CITY_ZONES = {
  "Europe/Kaliningrad": "Калининград,Черняховск,Советск,Балтийск,Светлогорск,Гусев,Зеленоградск,Светлый",
  "Europe/Moscow": "Москва,Санкт-Петербург,Питер,СПб,Нижний Новгород,Казань,Воронеж,Ростов-на-Дону,Краснодар,Сочи,Ярославль,Тверь,Тула,Рязань,Владимир,Иваново,Кострома,Калуга,Смоленск,Брянск,Орёл,Курск,Белгород,Липецк,Тамбов,Пенза,Саранск,Чебоксары,Йошкар-Ола,Киров,Архангельск,Мурманск,Петрозаводск,Вологда,Псков,Великий Новгород,Сыктывкар,Волгоград,Севастополь,Симферополь,Ставрополь,Махачкала,Грозный,Владикавказ,Нальчик,Майкоп,Элиста,Череповец,Подольск,Химки,Мытищи,Балашиха,Королёв,Люберцы,Одинцово,Домодедово,Видное,Дмитров,Сергиев Посад,Коломна,Новороссийск,Минск,Донецк,Луганск,Мариуполь,Ухта,Воркута,Северодвинск,Нижнекамск,Набережные Челны,Альметьевск,Пятигорск,Кисловодск",
  "Europe/Samara": "Самара,Тольятти,Ижевск,Ульяновск,Саратов,Астрахань,Сызрань,Балаково,Энгельс,Новокуйбышевск,Баку,Ереван,Тбилиси",
  "Asia/Yekaterinburg": "Екатеринбург,Челябинск,Уфа,Пермь,Оренбург,Тюмень,Курган,Магнитогорск,Сургут,Нижневартовск,Ханты-Мансийск,Нижний Тагил,Салехард,Стерлитамак,Златоуст,Миасс,Орск,Новый Уренгой,Ноябрьск,Каменск-Уральский,Березники,Соликамск,Астана,Ташкент,Нур-Султан",
  "Asia/Omsk": "Омск,Алматы",
  "Asia/Krasnoyarsk": "Красноярск,Новосибирск,Томск,Кемерово,Новокузнецк,Барнаул,Бийск,Абакан,Горно-Алтайск,Кызыл,Норильск,Прокопьевск,Рубцовск,Ачинск,Железногорск,Бердск",
  "Asia/Irkutsk": "Иркутск,Улан-Удэ,Братск,Ангарск,Усть-Илимск,Улан-Батор",
  "Asia/Yakutsk": "Якутск,Чита,Благовещенск,Нерюнгри,Мирный,Свободный",
  "Asia/Vladivostok": "Владивосток,Хабаровск,Уссурийск,Находка,Комсомольск-на-Амуре,Артём,Биробиджан",
  "Asia/Magadan": "Магадан,Южно-Сахалинск,Сахалин,Холмск",
  "Asia/Kamchatka": "Петропавловск-Камчатский,Анадырь,Елизово"
};
var CITY_MAP = null, CITY_LIST = null;
function cityKey(s) { return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/^(г\.?|город)\s+/, "").replace(/\s+/g, " ").trim(); }
function cityInit() {
  if (CITY_MAP) return; CITY_MAP = {}; CITY_LIST = [];
  Object.keys(CITY_ZONES).forEach(function (z) { CITY_ZONES[z].split(",").forEach(function (n) { CITY_MAP[cityKey(n)] = z; CITY_LIST.push(n); }); });
  CITY_LIST.sort(function (a, b) { return a.localeCompare(b, "ru"); });
}
function tzLabel(z) { return (TZ.filter(function (x) { return x[0] === z; })[0] || [z, z || "Москва (МСК)"])[1]; }
function cityNames() { cityInit(); return CITY_LIST; }
function cityZone(s) {
  cityInit(); var k = cityKey(s); if (!k) return "";
  if (CITY_MAP[k]) return CITY_MAP[k];
  if (k.length < 4) return "";
  var zones = {}, n = 0; Object.keys(CITY_MAP).forEach(function (c) { if (c.indexOf(k) === 0) { zones[CITY_MAP[c]] = 1; n++; } });
  var zs = Object.keys(zones); return n && zs.length === 1 ? zs[0] : "";
}
document.addEventListener("input", function (e) {
  var t = e.target; if (!t.dataset || t.dataset.cfcity == null || !S.cu || !S.cu.draft) return;
  var d = S.cu.draft; d.city = t.value;
  var z = cityZone(t.value), note = document.getElementById("cuCityNote");
  if (z) { d.tz = z; var sel = document.getElementById("cuTz"); if (sel) sel.value = z; var tr = document.getElementById("cuTzRes"); if (tr) tr.innerHTML = "🕒 " + E(tzLabel(z)) + " · сейчас у заказчика <b>" + nowIn(z) + "</b>"; if (note) note.textContent = "✓ Часовой пояс подставлен по городу"; }
  else if (note) note.textContent = t.value.trim().length >= 3 ? "Города нет в списке — выберите часовой пояс вручную ниже" : "";
});

  window.DSTasks = { screen: screen, olCss: olCss, olDrawer: olDrawer, replyBox: replyBox, cityNames: cityNames, cityZone: cityZone, tzLabel: tzLabel };
})();
