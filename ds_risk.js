/* Проекты DS — «Просрочено и зависло», «Скрипты», карточка задачи (окно/папка/чат/бот), «Пауза» (вынесено из ds.js 24.11, экономия токенов).
   paint() и монтирование остаются в ds.js. Контекст ядра — DS._ctx (ds.js подключается раньше в index.html). */
(function () {
  "use strict";
  var C = window.MPBC, DS = window.DS, DSV = window.DSV, MPBT = window.MPBT;
  var X = window.DS._ctx;
  var S = X.S, E = X.E, dmy = X.dmy, pos = X.pos, ava = X.ava, toast = X.toast, isoDay = X.isoDay, monday = X.monday, api = X.api, paint = X.paint, money = X.money, ic = X.ic, kpNo = X.kpNo, loadKp = X.loadKp, kpAddLine = X.kpAddLine, leftText = X.leftText, plural = X.plural, can = X.can, find = X.find, card = X.card, screen = X.screen, kpDone = X.kpDone, kpStatusLabel = X.kpStatusLabel, fullCtl = X.fullCtl, taskCtl = X.taskCtl, taskAuthor = X.taskAuthor, taskMine = X.taskMine, ovRow = X.ovRow, span = X.span, DONE_ST = X.DONE_ST, PAUSE = X.PAUSE, STAGE_COLOR = X.STAGE_COLOR, TZ = X.TZ, ackMine = X.ackMine, ackWhen = X.ackWhen, taskCard = X.taskCard, kpCard = X.kpCard, kpTone = X.kpTone, taskTone = X.taskTone, sysText = X.sysText, paused = X.paused, pauseText = X.pauseText, OE_FIELD = X.OE_FIELD, PAUSE_FROM = X.PAUSE_FROM, TZ_TAB = X.TZ_TAB, busyNow = X.busyNow, callBtn = X.callBtn, callsPanel = X.callsPanel, canMenu = X.canMenu, closeAll = X.closeAll, load = X.load, oeRebase = X.oeRebase, oeSnap = X.oeSnap, pauseLate = X.pauseLate, payPill = X.payPill, prepaid = X.prepaid, projPos = X.projPos, roundsTab = X.roundsTab, sysChips = X.sysChips, sysPick = X.sysPick, taskCallHtml = X.taskCallHtml, tmHtml = X.tmHtml, tmRepaint = X.tmRepaint, tzLabel = X.tzLabel, tzTab = X.tzTab;
/* ---------- «Просрочено и зависло» ---------- */
function loadRisk() { return api("/attention?days=" + (S.rkDays || 3)).then(function (r) { S.rk = r; S.rkErr = ""; }, function (e) { S.rk = { items: [], tasks: [], outbox: [] }; S.rkErr = String(e); }); }
var RK_KIND = { overdue: ["Просрочен срок по договору", "bad"], unassigned: ["Нет исполнителя", "warn"], stale: ["Без движения", "muted"] };
function riskScreen() {
  var r = S.rk || { items: [], tasks: [], outbox: [] }, people = S.people || [];
  var head = '<div class="head"><div><h1>Просрочено и зависло</h1><p>Всё, что требует внимания: срок прошёл, нет исполнителя или задача давно не двигалась. Напомнить или назначить можно прямо в строке.</p></div>'
    + '<div class="seg"><button data-rkreload="1">⟳ Обновить</button></div></div>';
  var days = '<div class="rkbar"><span>Считать «без движения» от</span><select data-rkdays="1">' + [1, 2, 3, 5, 7, 14].map(function (d) { return '<option value="' + d + '"' + (d === (r.stale_days || 3) ? " selected" : "") + ">" + d + " дн.</option>"; }).join("") + "</select></div>";
  var ob = (r.outbox && r.outbox.length) ? '<div class="panel pad rkbox"><h3>Сообщения заказчикам ждут подтверждения</h3><p class="sub">Отправляются только после вашего «Отправить». Текст можно поправить.</p>'
    + r.outbox.map(function (n) { return '<div class="rkob"><div><b>№' + E(n.number) + " · " + E(n.customer || "") + '</b><small>' + E(n.stage) + '</small></div><textarea rows="3" data-rkobt="' + n.id + '">' + E(n.text) + '</textarea><div class="rkact"><button class="btn primary sm" data-rkobsend="' + n.id + '" data-tid="' + E(n.thread_id) + '">Отправить заказчику</button><button class="btn ghost sm" data-rkobno="' + n.id + '">Не отправлять</button></div></div>'; }).join("") + "</div>" : "";
  function group(kind) {
    var list = r.items.filter(function (i) { return i.kind === kind; });
    if (!list.length) return "";
    return '<div class="panel rkgrp"><div class="rkh"><span class="pill ' + RK_KIND[kind][1] + '">' + RK_KIND[kind][0] + "</span><b>" + list.length + "</b></div>" + list.map(function (i) {
      var assign = kind === "unassigned" ? '<select data-rkas="' + i.id + '"><option value="">Назначить…</option>' + people.map(function (u) { return '<option value="' + u.id + '">' + E(u.name) + "</option>"; }).join("") + "</select>" : "";
      return '<div class="rkrow"><button class="rkmain" data-open="' + i.id + '"><b>№' + E(i.number) + "</b> " + E(i.customer || "") + "<small>" + E(i.object || "") + " · " + E(i.stage) + (i.executor ? " · " + E(i.executor) : "") + '</small></button>'
        + '<span class="rkwhy">' + E(i.reason) + '</span><div class="rkact">' + assign + '<button class="btn ghost sm" data-rkrem="' + i.id + '" data-kind="' + kind + '">🔔 Напомнить</button></div></div>';
    }).join("") + "</div>";
  }
  var tasks = r.tasks.length ? '<div class="panel rkgrp"><div class="rkh"><span class="pill bad">Просроченные задачи</span><b>' + r.tasks.length + "</b></div>"
    + r.tasks.map(function (t) { return '<div class="rkrow"><span class="rkmain"><b>' + E(t.title) + '</b><small>срок ' + dmy(t.due) + '</small></span><span class="rkwhy">просрочено на ' + t.days + " дн.</span></div>"; }).join("") + "</div>" : "";
  var body = ob + group("overdue") + group("unassigned") + group("stale") + tasks;
  return head + (S.rkErr ? '<div class="err">' + E(S.rkErr) + "</div>" : "") + days + (body || '<div class="note">Всё в порядке: просроченных и зависших задач нет.</div>');
}
document.addEventListener("click", function (e) {
  var dc = e.target.closest ? e.target.closest("[data-cdelcust]") : null;
  if (dc && S.cu && S.cu.draft && S.cu.draft.id) {
    var cd = S.cu.draft;
    if (!confirm("Удалить заказчика «" + cd.name + "»? Контакты будут стёрты, КП останутся в реестре. Это нельзя отменить.")) return;
    api("/customers/" + cd.id + "/delete", {}).then(function () { S.customers = null; S.cu.sel = null; S.cu.draft = null; S.cu.err = ""; return load(); }).then(function () { paint(); toast("Заказчик удалён"); }, function (er) { S.cu.err = String(er); paint(); });
    return;
  }
  var t = e.target.closest ? e.target.closest("[data-rkrem],[data-rkreload],[data-rkobsend],[data-rkobno]") : null; if (!t) return;
  var d = t.dataset;
  if (d.rkreload) { loadRisk().then(paint); return; }
  if (d.rkrem) { t.disabled = true; api("/orders/" + d.rkrem + "/remind", { kind: d.kind }).then(function (x) { toast("Напомнили: " + (x.to || []).join(", ")); t.textContent = "✓ Напомнили"; }, function (er) { t.disabled = false; toast(String(er)); }); return; }
  if (d.rkobno) { api("/outbox/" + d.rkobno, { action: "dismissed" }).then(function () { return loadRisk(); }).then(paint, function (er) { toast(String(er)); }); return; }
  if (d.rkobsend) {
    var ta = document.querySelector('[data-rkobt="' + d.rkobsend + '"]'), txt = ta ? ta.value.trim() : "";
    if (!txt) return toast("Текст пустой");
    t.disabled = true;
    C.call("/../threads/" + encodeURIComponent(d.tid) + "/send", { body: { text: txt } }).then(function () { return api("/outbox/" + d.rkobsend, { action: "sent" }); }).then(function () { toast("Отправлено заказчику"); return loadRisk(); }).then(paint, function (er) { t.disabled = false; toast("Не отправилось: " + String(er)); });
  }
});
document.addEventListener("change", function (e) {
  var t = e.target; if (!t.dataset) return;
  if (t.dataset.rkdays) { S.rkDays = +t.value; loadRisk().then(paint); }
  if (t.dataset.rkas && t.value) { api("/orders/" + t.dataset.rkas + "/assign", { executor_id: +t.value }).then(function () { toast("Исполнитель назначен"); S.orders = null; return load(); }).then(function () { return loadRisk(); }).then(paint, function (er) { toast(String(er)); }); }
});
function loadScripts() { return api("/scripts").then(function (r) { S.sc = r; if (!S.scSel && r.length) S.scSel = r[0].id; }, function (e) { S.sc = []; S.scErr = String(e); }); }
function scriptsScreen() {
  var items = S.sc || [], sel = items.filter(function (x) { return x.id === S.scSel; })[0];
  var fld = 'style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--surface);color:var(--ink);font:inherit"';
  var groups = {}, order = [];
  items.forEach(function (x) { var g = x.group || "Без группы"; if (!groups[g]) { groups[g] = []; order.push(g); } groups[g].push(x); });
  var left = order.map(function (g) {
    return '<div class="sc-g">' + E(g) + "</div>" + groups[g].map(function (x) {
      return '<button class="sc-i ' + (x.id === S.scSel ? "on" : "") + '" data-scsel="' + E(x.id) + '"><b>' + E(x.title) + "</b><small>" + E((x.text || "").slice(0, 70)) + "</small></button>";
    }).join("");
  }).join("") || '<div class="note" style="margin:0">Скриптов пока нет. Нажмите «+ Новый скрипт».</div>';
  var right = sel ? '<div class="panel pad"><div class="fld"><label>Название</label><input data-scf="title" value="' + E(sel.title) + '" ' + fld + "></div>"
    + '<div class="fld"><label>Группа (необязательно)</label><input data-scf="group" value="' + E(sel.group || "") + '" placeholder="Например: Продажи, Оплата, Данные" ' + fld + "></div>"
    + '<div class="fld"><label>Текст</label><textarea rows="9" data-scf="text" ' + fld + ">" + E(sel.text || "") + "</textarea></div>"
    + scFilesHtml(sel)
    + '<p class="sub">Подстановки: <code>{менеджер}</code> — ваше имя, <code>{заказчик}</code> — имя диалога. В переписке кнопка «Скрипты» вставляет текст в окно ответа, отправляете вы сами.</p>'
    + (S.scErr ? '<div class="err">' + E(S.scErr) + "</div>" : "")
    + '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn primary" data-scsave="1">Сохранить</button><button class="btn ghost" data-sccopy="1">Копировать текст</button><button class="btn ghost" data-scdel="1" style="color:var(--bad)">Удалить</button></div></div>'
    : '<div class="panel pad"><p class="sub" style="margin:0">Выберите скрипт слева или создайте новый</p></div>';
  return '<div class="ds dspage"><div class="head"><div><h1>Скрипты</h1><p>Готовые тексты для переписки с заказчиками</p></div><button class="btn accent" data-scnew="1">' + ic("plus") + "Новый скрипт</button></div>"
    + '<div class="sc-wrap"><div class="panel pad sc-list">' + left + "</div><div>" + right + "</div></div></div>";
}
/* PDF-листы скрипта: открыть, скачать, удалить, приложить (до 50 МБ каждый) */
function scFilesHtml(sel) {
  var files = sel.files || [];
  return '<div class="fld"><label>PDF-листы</label>' + files.map(function (f) {
    return '<div class="sc-file"><span class="nm">📄 ' + E(f.name) + ' <small>' + (f.size >= 1048576 ? (f.size / 1048576).toFixed(1) + " МБ" : Math.max(1, Math.round(f.size / 1024)) + " КБ") + "</small></span>"
      + '<button class="btn ghost" data-scfopen="' + E(f.id) + '">Открыть</button><button class="btn ghost" data-scfdl="' + E(f.id) + '">Скачать</button>'
      + '<button class="btn ghost" data-scfdel="' + E(f.id) + '" style="color:var(--bad)" title="Удалить файл">✕</button></div>';
  }).join("")
    + (S.scUp ? '<div class="sub" id="scUpMsg" style="margin:6px 0">Загружаю ' + E(S.scUp) + "</div>" : '<button class="btn ghost" style="margin-top:6px" data-scfpick="1">' + ic("plus") + 'Приложить PDF</button><input type="file" id="scFileIn" accept="application/pdf,.pdf" multiple data-scfile="1" style="display:none">')
    + "</div>";
}
function scFileName(fid) { var n = ""; (S.sc || []).forEach(function (x) { (x.files || []).forEach(function (f) { if (f.id === fid) n = f.name; }); }); return n; }
function scFileOpen(fid, inline) {
  var w = inline ? window.open("", "_blank") : null;                  // окно сразу, иначе браузер его заблокирует
  C.blob("/ds/scripts/files/" + encodeURIComponent(fid) + (inline ? "?inline=1" : "")).then(function (f) {
    var url = URL.createObjectURL(new Blob([f.blob], { type: "application/pdf" }));
    if (w) { w.location.href = url; return; }
    var a = document.createElement("a"); a.href = url; a.download = f.name || scFileName(fid); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }, function (e) { if (w) w.close(); toast(String(e)); });
}
function scUpload(list) {
  var files = Array.prototype.slice.call(list || []), sid = S.scSel;
  var bad = files.filter(function (f) { return !/\.pdf$/i.test(f.name) && f.type !== "application/pdf"; });
  if (bad.length) return toast("Можно приложить только PDF: " + bad.map(function (f) { return f.name; }).join(", "));
  if (!files.length || !sid) return;
  // скрипт сначала сохраняется: файлы привязываются к нему на сервере
  var chain = api("/scripts", { items: S.sc }).then(function (r) { S.sc = r; });
  files.forEach(function (f) {
    chain = chain.then(function () {
      S.scUp = f.name; paint();
      return C.upload(f, f.name, function (pc) { S.scUp = f.name + " — " + pc + "%"; var el = document.getElementById("scUpMsg"); if (el) el.textContent = "Загружаю " + S.scUp; })
        .then(function (tok) { return api("/scripts/" + encodeURIComponent(sid) + "/files", { upload: tok }); })
        .then(function (x) { S.sc = S.sc.map(function (y) { return y.id === x.id ? x : y; }); });
    });
  });
  chain.then(function () { S.scUp = ""; toast(files.length > 1 ? "Файлы приложены" : "Файл приложен"); paint(); }, function (e) { S.scUp = ""; toast(String(e)); paint(); });
}
function saveScripts() {
  S.scErr = "";
  return api("/scripts", { items: S.sc }).then(function (r) { S.sc = r; toast("Скрипты сохранены"); paint(); }, function (e) { S.scErr = String(e); paint(); });
}

/* ---------- окно задачи ---------- */
function nextStep(o) {
  var p = projPos(), st = o.stage, ownerOk = p === "owner";
  var map = {
    "Ожидает аванс": { roles: ["acc"], text: "Ждём аванс. Оплата из 1С переведёт задачу на «Сбор данных»", btn: "Аванс получен", pay: "advance" },
    "Сбор данных": { roles: ["ops"], text: "Все данные собраны: передать на проектирование", btn: "Передать «Готов к проектированию»", to: "Готов к проектированию" },
    "Готов к проектированию": { roles: ["design"], text: "Назначить проектировщика и начать проектирование", btn: "В проектирование", to: "В проектировании", needExec: true },
    "В проектировании": { roles: ["designer", "design"], text: "Проект готов: передать на проверку", btn: "Передать на проверку", to: "Проверка" },
    "Проверка": { roles: ["design"], text: "Проверка пройдена: отправить заказчику", btn: "На согласование", to: "На согласовании", back: { btn: "Вернуть на доработку", to: "В проектировании" } },
    "На согласовании": { roles: ["sales"], text: "Ждём ответа заказчика", btn: "Заказчик принял: «Сдано»", to: "Сдано", back: { btn: "Есть замечания", to: "Корректировка" } },
    "Корректировка": { roles: ["designer", "design"], text: "Правки внесены: вернуть на согласование", btn: "Вернуть на согласование", to: "На согласовании" },
    "Сдано": { roles: ["acc"], text: "Акт подписан, оплата получена: закрыть задачу", btn: "Закрыто", to: "Закрыто" }
  };
  var n = map[st];
  // руководитель, продажи и опер. менеджер двигают задачу на любом этапе (FULL_CONTROL на мосту) — кнопка следующего шага есть и у них; оплату отмечает бухгалтер
  if (!n || !(ownerOk || n.roles.indexOf(p) >= 0 || (fullCtl() && !n.pay))) return null;
  return n;
}
function stepper(o) {
  var st = (S.meta.stages || []).filter(function (s) { return s !== PAUSE; }), pz = paused(o);      // на паузе текущий шаг — тот, с которого ушли, с меткой ⏸
  var cur = st.indexOf(pz ? o.pause_from : o.stage);
  return '<div class="stepper">' + st.map(function (s, i) { return '<div class="stp ' + (i < cur ? "done" : i === cur ? "cur" : "") + '"' + (pz && i === cur ? ' title="На паузе"' : "") + ">" + (pz && i === cur ? "⏸ " : "") + E(s).replace(/^([А-ЯЁ]) /, "$1&nbsp;") + "</div>"; }).join("") + "</div>";      // «В проектировании» не рвётся после «В»
}
/* ---------- «Пауза»: блок в окне задачи и строка в «Меню задачи» ---------- */
function pauseCan() { var p = pos(); return p === "owner" || p === "ops" || p === "design"; }
function pauseable(o) { return PAUSE_FROM.indexOf(o.stage) >= 0 && !(o.stage === "Сдано" && o.act_sent); }      // «Сдано» с отправленным актом — уже шаг 9
function pzDay(n) { var d = new Date(); d.setDate(d.getDate() + n); return isoDay(d); }      // дата через n дней (ГГГГ-ММ-ДД)
function pzForm(z, btn) {
  return '<div style="flex-basis:100%;width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:10px">'
    + '<div class="fld" style="margin:0"><label>Причина</label><input data-pz="reason" maxlength="300" placeholder="например: заказчик заморозил работы" value="' + E(z.reason) + '" ' + OE_FIELD + "></div>"
    + '<div class="fld" style="margin:0"><label>Дата возврата</label><input type="date" data-pz="until" min="' + pzDay(1) + '" max="' + pzDay(365) + '" value="' + E(z.until) + '" ' + OE_FIELD + "></div></div>"
    + (z.err ? '<div class="err" style="flex-basis:100%;width:100%;margin:6px 0 0">' + E(z.err) + "</div>" : "")
    + '<div style="flex-basis:100%;width:100%;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn ghost sm" data-pzx="1">Отмена</button><button type="button" class="btn primary sm" data-pzsave="' + z.id + '">' + E(btn) + "</button></div>";
}
function pauseBox(o) {
  var z = S.pz && S.pz.id === o.id ? S.pz : null, can = pauseCan();
  return '<div class="next" style="background:var(--surface-2);border-color:var(--line)"><div style="flex:1;min-width:200px"><small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:.7rem">⏸ На паузе по заказчику · ' + (o.pause_days || 0) + " р.д.</small><br><b>до " + dmy(o.pause_until) + " · " + E(o.pause_reason || "") + "</b>"
    + '<div style="font-size:.84rem;color:var(--muted)">Ушла с шага «' + E(o.pause_from || "") + "». Сроки и напоминания не идут, срок договора не меняется, заказчику ничего не уходит</div></div>"
    + (can && !z ? '<button type="button" class="btn primary" data-pzback="' + o.id + '">Вернуть «' + E(o.pause_from || "") + '»</button><button type="button" class="btn ghost" data-pzopen="' + o.id + '">Продлить</button>' : "")
    + (z ? pzForm(z, "Продлить паузу") : "") + "</div>";
}
function pauseRow(o) {             // «Меню задачи»: поставить на паузу (как в макете — строка рядом со «Срочной работой»)
  var z = S.pz && S.pz.id === o.id ? S.pz : null;
  return '<div class="tm-urg" style="flex-wrap:wrap"><span class="ico">⏸</span><div><b>Пауза по заказчику</b><small>Причина и дата возврата — сроки не идут, задача не просрочена</small></div>'
    + (z ? pzForm(z, "Поставить на паузу") : '<button type="button" class="btn ghost sm" data-pzopen="' + o.id + '">Поставить</button>') + "</div>";
}
function pzDo(p, ok) {
  if (busyNow()) return toast("Подождите: предыдущее действие ещё выполняется");
  S.busy = Date.now();
  return p.then(function () {
    S.busy = false; S.pz = null; S.actErr = ""; S.orders = null; S.tasks = null; X.BOOT = null; toast(ok);
    return load().then(function () { return S.open ? api("/orders/" + S.open + "/history").then(function (h) { S.history = h; }, function () {}) : null; });
  }).then(function () { tmRepaint(); }, function (e) {
    S.busy = false; var msg = String(e && e.message || e);
    if (S.pz) S.pz.err = msg; else toast(msg);
    tmRepaint();
  });
}
function pzSave(id) {
  var z = S.pz; if (!z || z.id !== id) return;
  z.reason = String(z.reason || "").trim();
  if (!z.reason) { z.err = "Укажите причину паузы"; return tmRepaint(); }
  if (!z.until) { z.err = "Укажите дату возврата"; return tmRepaint(); }
  var was = paused(find(id));
  pzDo(api("/orders/" + id + "/pause", { reason: z.reason, until: z.until }), (was ? "Пауза продлена до " : "Задача на паузе до ") + dmy(z.until));
}
function customerOf(o) {
  return (S.customers || []).filter(function (c) { return c.id === o.customer_id; })[0];
}
function docRow(done, title, sub) { return '<div class="doc ' + (done ? "done" : "wait") + '"><span>' + (done ? "✅" : "⏳") + "</span><div><b>" + E(title) + "</b><small>" + E(sub) + "</small></div></div>"; }
function infoTab(o) {
  var p = projPos(), cu = customerOf(o), designerView = p === "designer";
  var dl = '<div class="dl ' + (pauseLate(o) ? "bad" : "") + '"><div><small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:.68rem">Дедлайн</small><br><b>' + dmy(o.due_date) + "</b></div><b style=\"font-size:.95rem\">" + E(paused(o) ? pauseText(o) : leftText(o.left_days)) + "</b></div>";
  var work = '<div class="panel pad"><h3>Работа</h3>' + dl + '<div class="kv">' + (sysText(o) ? "<span>Системы</span><span><b>" + E(sysText(o)) + "</b>"
    + (o.parts || []).map(function (p) { return '<br><small>Раздел ' + E(p.system) + ": " + E(p.delivered ? "сдан " + dmy(p.delivered) : (p.executor || "исполнитель не назначен") + (p.plan_end ? ", срок " + dmy(p.plan_end) : "")) + "</small>"; }).join("") + "</span>" : "") + '<span>Исполнитель</span><span><b>' + E(o.executor || "не назначен") + "</b></span><span>Стадия</span><span>" + E(o.stage) + "</span>"
    + (o.contract_date ? "<span>Договор от</span><span>" + dmy(o.contract_date) + "</span>" : "") + "<span>Приоритет</span><span>" + E(o.priority) + "</span>"
    + (designerView ? "" : "<span>Правок</span><span>" + (o.edits || 0) + "</span>") + "</div></div>";
  var cust = "";
  if (o.customer && !designerView) {
    var phoneOf = cu && cu.contacts ? (cu.contacts.filter(function (x) { return x.phone && String(x.phone).trim(); })[0] || {}) : {};
    var phoneB = phoneOf.phone
      ? '<div class="phoneb"><small>Сотовый телефон заказчика</small><b>' + E(phoneOf.phone) + (phoneOf.fio ? " · " + E(phoneOf.fio) : "") + "</b>" + callBtn(phoneOf.phone, o.id, o.customer_id) + "</div>"
      : '<div class="phoneb bad"><b>⚠ Не указан сотовый телефон заказчика</b><small>Менеджер: заполните контактное лицо и номер в карточке заказчика — без него руководителю проектного отдела нельзя позвонить.</small><a class="btn primary sm" href="#/clients" style="text-decoration:none">Заполнить в карточке</a></div>';
    cust = '<div class="panel pad"><h3>Заказчик</h3>' + phoneB + '<div class="kv" style="margin-top:10px"><span>Компания</span><span><b>' + E(o.customer) + "</b>" + (cu && cu.regular ? ' <span class="pill ok">постоянный</span>' : "") + "</span></div>"
      + (cu && cu.contacts ? cu.contacts.map(function (x) { return '<div class="ctt" style="margin-top:10px"><b>' + E(x.fio) + "</b><small>" + E(x.pos || "должность не указана") + "</small><div>" + E(x.phone || "—") + callBtn(x.phone, o.id, o.customer_id) + "</div></div>"; }).join("") : "")
      + (cu && cu.tz ? '<div class="kv"><span>Часовой пояс</span><span>' + E(tzLabel(cu.tz)) + " · сейчас <b>" + nowIn(cu.tz) + "</b></span></div>" : "")
      + (cu && cu.comment ? '<div class="note">📝 Комментарий менеджера: ' + E(cu.comment) + "</div>" : "") + "</div>";
  }
  var mon = "";
  if (can("money") && o.amount != null) {
    var adv = o.adv_mode === "advance";
    mon = '<div class="panel pad"><h3>Деньги и документы <span class="pill sys">из 1С</span></h3><div style="margin-top:10px">'
      + docRow(true, "Договор №" + o.number + " · " + money(o.amount), "подписан" + (o.contract_date ? " " + dmy(o.contract_date) : ""))
      + docRow(!adv || o.adv_paid, "Аванс" + (adv ? " " + money(o.adv_sum) : ""), !adv ? "не предусмотрен" : o.adv_paid ? "оплачен " + dmy(o.adv_date) : "ждём оплату")
      + docRow(!!o.act_signed, "Акт", o.act_signed ? "подписан" : o.act_sent ? "отправлен, ждём подпись" : "будет после сдачи")
      + docRow(!!o.post_paid || prepaid(o), "Постоплата", o.post_paid ? "получена " + dmy(o.post_date) : prepaid(o) ? "не нужна: 100% аванс" : "ожидается") + "</div>"
      + accButtons(o) + "</div>";
  }
  var canCreate = p === "owner" || p === "sales" || p === "ops";
  var fol = '<div class="panel pad"><h3>Папка и чат</h3><div class="doc" style="margin-top:10px"><span>📂</span><div style="flex:1"><b>' + E(FOLDER_ROOT) + "\\" + E(o.number) + ". " + E(folderName(o)) + "</b><small>Откроется в проводнике (нужен VPN и установленная кнопка)</small></div></div>"
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px"><a class="btn ghost sm" style="text-decoration:none" href="' + folderUrl(o, false) + '">Перейти в папку на сервере</a>'
    + (canCreate ? '<a class="btn ghost sm" style="text-decoration:none" href="' + folderUrl(o, true) + '">Создать папку</a>' : "") + "</div>"
    + '<div class="doc"><span>💬</span><div style="flex:1"><b>Чат проекта</b><small>Обсуждение задачи №' + E(o.number) + '</small></div><button class="btn ghost sm" data-taskchat="' + o.id + '">Перейти в чат</button></div></div>';
  return '<div class="grid g2">' + work + cust + mon + fol + (designerView ? "" : callsPanel("order", o.id)) + (designerView || !window.DSV ? "" : DSV.panel(o)) + "</div>";
}
/* папку открывает server-link/open-folder.ps1 на компьютере сотрудника (свой протокол dsfolder://, не путается с кнопкой МПБ) */
var FOLDER_ROOT = "\\\\176.197.21.187\\ServAmani\\Проектная компания\\Задачи";
/* имя папки «№. Объект, системы - Заказчик» (номер добавляет программа); начинается с объекта — по нему же ищется папка, если номеров несколько */
function folderName(o) {
  var sys = (o.systems && o.systems.length) ? o.systems.join(".") + (o.systems_other ? " " + o.systems_other : "") : (o.system && o.system.length <= 40 ? o.system : "");
  return [String(o.object || "").replace(/\s+/g, " ").trim(), sys].filter(Boolean).join(", ") + (o.customer ? " - " + o.customer : "");
}
function folderUrl(o, create) {
  return "dsfolder://open?num=" + encodeURIComponent(o.number) + "&name=" + encodeURIComponent(folderName(o)) + (create ? "&create=1" : "");
}
/* папка по шаблону (server-link/open-folder.ps1: разделы и паспорт задачи) — сразу при создании задачи; нужен VPN и установленная кнопка */
function makeFolder(o) {
  try { var a = document.createElement("a"); a.href = folderUrl(o, true); document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
}
DS.folderUrl = folderUrl; DS.FOLDER_ROOT = FOLDER_ROOT;      // папка задачи на сервере — и в карточке выезда (visits.js)
function accButtons(o) {
  var p = pos();
  if (p !== "acc" && p !== "owner") return "";
  var b = [];
  if (o.stage === "Сдано") {
    if (!o.act_sent) b.push('<button class="btn ghost sm" data-act="sent">Акт отправлен</button>');
    if (!o.act_signed) b.push('<button class="btn ghost sm" data-act="signed">Акт подписан</button>');
    if (!o.post_paid && !prepaid(o)) b.push('<button class="btn ghost sm" data-pay="post">Оплата получена</button>');
  }
  return b.length ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' + b.join("") + "</div>" : "";
}
/* часовой пояс заказчика в шапке задачи: когда ему удобно звонить */
function tzLine(o) { var cu = customerOf(o); return cu && cu.tz ? '<div class="tzline">🕒 ' + E(tzLabel(cu.tz)) + " · сейчас у заказчика <b>" + nowIn(cu.tz) + "</b></div>" : ""; }
function nowIn(tz) { try { return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: tz }); } catch (e) { return "—"; } }
function logTab() {
  var h = S.history || [];
  if (!h.length) return '<div class="note">Событий пока нет</div>';
  return '<div class="trace">' + h.slice().reverse().map(function (e) {
    var d = new Date(e.ts * 1000);
    return '<div class="ev" style="--c:var(--brand)"><time>' + d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) + "</time><b>" + E(e.action) + (e.detail ? ": " + E(e.detail) : "") + '</b><span class="note" style="margin:0">' + E(e.user_name) + "</span></div>";
  }).join("") + "</div>";
}
/* «Чат с заказчиком»: диалоги «Переписки», привязанные к заказчику задачи (подгружаются при открытии окна) */
var CH_NAME = { tg: "Telegram", max: "MAX", maxbot: "MAX", mail: "почта", site: "сайт" };
function custChatHtml(o) {
  var p = pos();
  if (["owner", "sales", "ops"].indexOf(p) < 0 || !o.customer_id) return "";       // проектному отделу кнопка не нужна
  if (!S.cth || S.cth.oid !== o.id) {
    S.cth = { oid: o.id, list: null };
    var done = function (l) { if (S.cth && S.cth.oid === o.id) { S.cth.list = l; if (S.open === o.id) paint(); } };
    api("/orders/" + o.id + "/threads").then(done, function () { done([]); });
  }
  var l = S.cth.list;
  if (!l) return "";
  var add = '<button class="btn ghost sm" data-cthpick="' + o.id + '" title="Найти диалог Telegram, MAX или почты и привязать к заказчику задачи">＋ Привязать диалог</button>'
    + '<button class="btn ghost sm" data-boto="' + o.id + '" data-botn="' + E(o.number || "") + '" title="Личная ссылка и QR на MAX-бота: заказчик переходит — диалог сам привязывается к задаче">Ссылка на MAX-бота</button>';
  if (!l.length) return '<div class="cchat"><span>Диалог с заказчиком не найден ни по привязке, ни по контактам</span>' + add + "</div>";
  return '<div class="cchat">' + l.slice(0, 3).map(function (t) {      // how — диалог найден по контактам заказчика, а не по привязке
    return '<span class="cth"><a class="btn primary sm" href="#/chat?t=' + encodeURIComponent(t.id) + '" title="' + E(t.title + (t.how ? " — найден " + t.how + ", не привязан" : " — привязан к заказчику")) + '">💬 Чат с заказчиком · ' + E(CH_NAME[t.channel] || t.channel) + "</a>"
      + (t.how ? '<button class="btn ghost sm" data-cthbind="' + E(t.id) + '" title="Найден ' + E(t.how) + ': закрепить диалог за заказчиком задачи">📌 Привязать</button>'
        : '<button class="cthx" data-cthunlink="' + E(t.id) + '" title="Отвязать диалог «' + E(t.title) + '» от заказчика">✕</button>') + "</span>";
  }).join("") + (l.length > 3 ? '<span>ещё ' + (l.length - 3) + "</span>" : "") + add + "</div>";
}
/* Привязка диалога из окна задачи: поиск по имени, телефону, почте; подсказки — по контактам заказчика; один клик — привязать */
function cthReload(oid) { S.cth = null; if (S.open === oid) paint(); if (window.__chatTasksRefresh) window.__chatTasksRefresh(); }
function cthBind(oid, tid, label) {
  return api("/orders/" + oid + "/threads", { thread_id: tid }).then(function (r) { toast("Диалог «" + label + "» привязан к заказчику «" + (r.customer || "") + "»"); cthReload(oid); }, function (e) { toast(String(e)); });
}
function cthPicker(oid) {
  var o = find(oid) || {}, host = document.createElement("div"), bg = document.createElement("div"), seq = 0, timer = 0, rows = [];
  host.className = "ds"; host.appendChild(bg);                  // стили окон — внутри .ds
  bg.className = "modal-bg"; bg.style.cssText = "align-items:center;justify-content:center;padding:16px;z-index:420";
  bg.innerHTML = '<div class="modal" style="width:min(520px,100%);height:auto;max-height:86vh;border-radius:20px"><div class="m-head"><div class="row"><h2 style="font-size:1.15rem">Привязать диалог к задаче №' + E(o.number || "") + "</h2>"
    + '<button class="x" data-cthclose="1">✕</button></div><div style="color:var(--muted);margin-top:2px">Диалог закрепится за заказчиком «' + E(o.customer || "") + '» и будет открываться кнопкой «Чат с заказчиком»</div></div>'
    + '<div class="m-body"><input id="cthQ" type="search" autocomplete="off" placeholder="Имя, телефон или почта собеседника" style="width:100%;padding:10px 12px;border:1px solid var(--brand-2);border-radius:11px;background:var(--surface);color:var(--ink);font:inherit;margin-bottom:10px">'
    + '<div id="cthRes"><div class="note">Загрузка…</div></div></div></div>';
  document.body.appendChild(host);
  var q = bg.querySelector("#cthQ"), res = bg.querySelector("#cthRes");
  var close = function () { host.remove(); document.removeEventListener("keydown", esc, true); };
  var esc = function (e) { if (e.key === "Escape") { e.stopPropagation(); close(); } };
  document.addEventListener("keydown", esc, true);
  bg.onclick = function (e) {
    if (e.target === bg || e.target.closest("[data-cthclose]")) return close();
    var b = e.target.closest("[data-cthrow]");
    if (b) { var t = rows[+b.getAttribute("data-cthrow")]; close(); cthBind(oid, t.id, t.title); }
  };
  function run() {
    var my = ++seq;
    api("/orders/" + oid + "/thread-search?q=" + encodeURIComponent(q.value.trim())).then(function (l) {
      if (my !== seq) return;
      rows = l || [];
      res.innerHTML = rows.map(function (t, i) {
        return '<button type="button" data-cthrow="' + i + '" style="display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:10px 12px;margin-bottom:8px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);cursor:pointer;font:inherit">'
          + '<span style="flex:1;min-width:0"><b>' + E(t.title) + '</b> <small style="color:var(--muted)">· ' + E(CH_NAME[t.channel] || t.channel) + (t.peer && t.peer !== t.title ? " · " + E(t.peer) : "") + "</small>"
          + '<small style="display:block;color:' + (t.why ? "var(--ok)" : "var(--muted)") + '">' + (t.why ? E(t.why) : "") + (t.linked ? (t.why ? " · " : "") + "сейчас привязан к «" + E(t.linked) + "» — перепривяжется" : t.why ? "" : "не привязан") + "</small></span>"
          + '<b style="color:var(--blue);font-size:.84rem;white-space:nowrap">Привязать</b></button>';
      }).join("") || '<div class="note">' + (q.value.trim() ? "Ничего не найдено" : "Подходящих диалогов не нашлось — введите имя, телефон или почту") + "</div>";
    }, function (e) { res.innerHTML = '<div class="err">' + E(e) + "</div>"; });
  }
  q.oninput = function () { clearTimeout(timer); timer = setTimeout(run, 250); };
  q.onkeydown = function (e) { if (e.key === "Enter" && rows[0]) { e.preventDefault(); close(); cthBind(oid, rows[0].id, rows[0].title); } };
  run(); q.focus();
}
/* «Ссылка на MAX-бота»: личная ссылка https://max.ru/<бот>?start=<код> для заказчика или задачи (копируется сразу) и QR для КП и писем.
   Заказчик открывает ссылку → бот получает код → диалог сам привязывается к заказчику. Писать первым бот не может — только отвечать. */
function botCopy(text, ok, quiet) {
  var fail = function () { if (!quiet) prompt("Скопируйте ссылку:", text); };
  try { if (navigator.clipboard) return navigator.clipboard.writeText(text).then(function () { toast(ok || "Ссылка скопирована"); }, fail); } catch (e) {}
  fail();
}
function botPng(svg, name) {          // QR в PNG (для Word и писем SVG подходит не везде)
  var img = new Image(), size = 600;
  img.onload = function () {
    var cv = document.createElement("canvas"); cv.width = cv.height = size;
    var x = cv.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0, size, size);
    var a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = name + ".png"; document.body.appendChild(a); a.click(); a.remove();
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function botQrHtml(r, file) {
  return '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div style="width:168px;height:168px;flex:none;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff">' + r.svg + "</div>"
    + '<div style="flex:1;min-width:200px"><input readonly value="' + E(r.url) + '" onclick="this.select()" style="width:100%;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;margin-bottom:10px">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary sm" data-botcopy="1">Копировать ссылку</button><button class="btn ghost sm" data-botpng="' + E(file) + '">Скачать QR (PNG)</button><button class="btn ghost sm" data-botsvg="' + E(file) + '">QR (SVG)</button></div></div></div>';
}
function botWire(root, r) {
  root.addEventListener("click", function (e) {
    if (e.target.closest("[data-botcopy]")) botCopy(r.url);
    var p = e.target.closest("[data-botpng]"); if (p) botPng(r.svg, p.getAttribute("data-botpng"));
    var s = e.target.closest("[data-botsvg]");
    if (s) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r.svg], { type: "image/svg+xml" })); a.download = s.getAttribute("data-botsvg") + ".svg"; document.body.appendChild(a); a.click(); a.remove(); }
  });
}
function botLinkModal(body, title) {
  api("/maxbot/link", body).then(function (r) {
    botCopy(r.url, "Ссылка на MAX-бота скопирована", true);      // после запроса браузер может не дать скопировать — тогда кнопкой
    var host = document.createElement("div"), bg = document.createElement("div");
    host.className = "ds"; host.appendChild(bg);
    bg.className = "modal-bg"; bg.style.cssText = "align-items:center;justify-content:center;padding:16px;z-index:420";
    var used = r.used ? "Уже подключались: " + r.used + " раз" + (r.last_name ? ", последний — " + E(r.last_name) : "") + (r.last_used ? ", " + new Date(r.last_used * 1000).toLocaleDateString("ru-RU") : "") : "По этой ссылке ещё никто не подключался";
    bg.innerHTML = '<div class="modal" style="width:min(560px,100%);height:auto;max-height:90vh;border-radius:20px"><div class="m-head"><div class="row"><h2 style="font-size:1.15rem">Ссылка на MAX-бота · ' + E(title) + "</h2>"
      + '<button class="x" data-botclose="1">✕</button></div><div style="color:var(--muted);margin-top:2px">Отправьте ссылку заказчику или вставьте QR в КП и письмо: когда он откроет ссылку и нажмёт «Начать», диалог сам привяжется к заказчику' + (body.order_id ? " и задаче" : "") + ".</div></div>"
      + '<div class="m-body">' + botQrHtml(r, "MAX-бот " + r.code) + '<div class="note" style="margin-top:12px">' + used + ". Бот только отвечает: первым написать заказчику он не может, рассылки и уведомления о статусах через него запрещены правилами MAX.</div></div></div>";
    document.body.appendChild(host);
    var close = function () { host.remove(); document.removeEventListener("keydown", esc, true); };
    var esc = function (e) { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", esc, true);
    bg.addEventListener("click", function (e) { if (e.target === bg || e.target.closest("[data-botclose]")) close(); });
    botWire(bg, r);
  }, function (e) { toast(String(e)); });
}
/* Личный кабинет → «MAX-бот» (руководитель): общая ссылка и QR для подписи письма и сайта, текст приветствия */
DS.botSettings = function (el) {
  el.innerHTML = '<div class="ds"><div class="panel pad">Загрузка…</div></div>';
  api("/maxbot").then(function (r) {
    el.innerHTML = '<div class="ds"><div class="panel pad"><h3>Общая ссылка на MAX-бота</h3><p class="sub">Для подписи письма, сайта и визиток. Кто перейдёт по ней, попадёт в «Заказчиков» без привязки — для конкретного заказчика берите личную ссылку в его карточке или в окне задачи.</p>'
      + (r.url ? botQrHtml(r, "MAX-бот Проекты DS") : '<div class="err">MAX-бот не подключён на сервере или ещё не запустился</div>') + "</div>"
      + '<div class="panel pad" style="margin-top:16px"><h3>Приветствие бота</h3><p class="sub">Бот отправляет его один раз — когда заказчик нажал «Начать» или впервые написал. Это ответ на действие заказчика; рассылки и уведомления о статусах через бота запрещены правилами MAX.</p>'
      + '<textarea id="botGreet" rows="3" maxlength="1000" style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--ink);font:inherit"' + (r.can_edit ? "" : " disabled") + ">" + E(r.greeting) + "</textarea>"
      + (r.can_edit ? '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn primary sm" id="botGreetSave">Сохранить</button><button class="btn ghost sm" id="botGreetReset">Вернуть стандартный текст</button></div>' : '<p class="sub">Меняет руководитель.</p>') + "</div></div>";
    if (r.url) botWire(el.firstChild, r);
    var save = function (text) { api("/maxbot/greeting", { text: text }).then(function (x) { el.querySelector("#botGreet").value = x.greeting; toast("Приветствие сохранено"); }, function (e) { toast(String(e)); }); };
    if (r.can_edit) {
      el.querySelector("#botGreetSave").onclick = function () { save(el.querySelector("#botGreet").value); };
      el.querySelector("#botGreetReset").onclick = function () { save(""); };
    }
  }, function (e) { el.innerHTML = '<div class="ds"><div class="panel pad"><div class="err">' + E(e) + "</div></div></div>"; });
};
/* «Перейти в чат» из задачи: чат задачи открывается, а если его ещё нет — создаётся (team.js) */
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-taskchat]");
  if (!b || !window.MPBT || !MPBT.openTaskRoom) return;
  e.preventDefault(); e.stopPropagation();
  var id = +b.getAttribute("data-taskchat"), o = find(id);
  closeAll();
  MPBT.openTaskRoom(id, o ? "№" + o.number + " · " + String(o.object || "").slice(0, 60) : "Задача №" + id);
}, true);
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-botc],[data-boto]");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  if (b.hasAttribute("data-boto")) return botLinkModal({ order_id: +b.getAttribute("data-boto") }, "задача №" + b.getAttribute("data-botn"));
  botLinkModal({ customer_id: +b.getAttribute("data-botc") }, b.getAttribute("data-botn") || "заказчик");
}, true);
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-cthpick],[data-cthbind],[data-cthunlink]");
  if (!b || !S.open) return;
  e.preventDefault(); e.stopPropagation();
  var oid = S.open, t = (S.cth && S.cth.list || []).filter(function (x) { return x.id === (b.getAttribute("data-cthbind") || b.getAttribute("data-cthunlink")); })[0];
  if (b.hasAttribute("data-cthpick")) return cthPicker(+b.getAttribute("data-cthpick"));
  if (b.hasAttribute("data-cthbind")) return cthBind(oid, t.id, t.title);
  if (!confirm("Отвязать диалог «" + (t ? t.title : "") + "» от заказчика? Переписка не удаляется, привязать можно снова.")) return;
  api("/threads/" + encodeURIComponent(b.getAttribute("data-cthunlink")) + "/link", { customer_id: 0 }).then(function () { toast("Диалог отвязан"); cthReload(oid); }, function (er) { toast(String(er)); });
}, true);
function windowHtml(o) {
  var p = pos(), n = nextStep(o), showUrgent = o.stage === "Готов к проектированию" && (p === "owner" || p === "design" || p === "ops" || p === "sales");
  var nx = "";
  if (paused(o)) nx = pauseBox(o);
  else if (n) {
    var sel = "";
    if (n.needExec && S.people) {
      sel = '<select id="dsExec" style="padding:9px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface)"><option value="">— исполнитель —</option>'
        + S.people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === o.executor_id ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select>";
    }
    nx = '<div class="next"><div style="flex:1;min-width:200px"><small style="color:var(--muted);font-weight:700;text-transform:uppercase;font-size:.7rem">Следующий шаг</small><br><b>' + E(n.text) + "</b>"
      + '<div style="font-size:.84rem;color:var(--muted)">Система сама оповестит следующего исполнителя</div></div>' + sel
      + (n.pay ? '<button class="btn primary" data-pay="' + n.pay + '">' + E(n.btn) + "</button>"
        : '<button class="btn primary" data-go="' + E(n.to) + '"' + (n.needExec ? ' data-needexec="1"' : "") + ">" + E(n.btn) + "</button>")
      + (n.back ? '<button class="btn ghost" data-go="' + E(n.back.to) + '">' + E(n.back.btn) + "</button>" : "")
      + (showUrgent ? '<button class="btn ghost" data-urgent="' + (o.urgent ? 0 : 1) + '">⚡ ' + (o.urgent ? "Снять срочность" : "Срочная") + "</button>" : "")
      + (S.actErr ? '<div class="err" style="flex-basis:100%;margin:0">Не выполнено: ' + E(S.actErr) + "</div>" : "") + "</div>";
  } else if (showUrgent) {
    nx = '<div class="next"><div style="flex:1"><b>Срочность</b></div><button class="btn ghost" data-urgent="' + (o.urgent ? 0 : 1) + '">⚡ ' + (o.urgent ? "Снять срочность" : "Срочная") + "</button></div>";
  }
  var menuOn = canMenu(), tabs = menuOn ? [["info", "Меню задачи"], ["inf2", "Информация"]] : [["info", "Информация"]];
  if (TZ_TAB && ["owner", "ops", "sales", "design"].indexOf(p) >= 0) tabs.push(["tz", "Тех. задание"]);
  if (!TZ_TAB && S.tab === "tz") S.tab = "info";            // вкладка спрятана: на неё не попасть и по старым кнопкам «Открыть» из списка ТЗ
  tabs.push(["rounds", ((o.parts || []).length ? "Разделы и корректировки" : "Корректировки") + (o.fix_total || (o.parts || []).length ? " (" + ((o.fix_total || 0) + (o.parts || []).length) + ")" : "")]);
  tabs.push(["log", "История"]);
  if (menuOn && S.tab === "info") { if (!S.oe || S.oe.id !== o.id) oeSnap(o); else oeRebase(o); }
  var body = S.tab === "log" ? logTab() : S.tab === "tz" ? tzTab() : S.tab === "rounds" ? roundsTab(o) : (menuOn && S.tab === "info") ? tmHtml() : infoTab(o);
  var money_ = can("money") && o.amount != null;
  return '<div class="modal-bg" data-bg="1"><div class="modal"><div class="m-head"><div class="row"><h2>№' + E(o.number) + (o.customer ? " · " + E(o.customer) : "") + "</h2>"
    + (o.urgent ? '<span class="pill urg">⚡ Срочно</span>' : "") + (money_ ? payPill(o) : "")
    + '<button class="x" data-close="1">✕</button></div>' + sysChips(o) + '<div style="color:var(--muted);margin-top:6px">' + E(o.object) + "</div>" + tzLine(o) + taskCallHtml(o) + custChatHtml(o) + stepper(o) + "</div>"
    + '<div class="m-body">' + nx + '<div class="tabs">' + tabs.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? "on" : "") + '">' + t[1] + "</button>"; }).join("") + "</div>" + body + "</div></div></div>";
}
function formHtml() {
  var f = S.form;
  if (f.fix) return fixFormHtml(f);
  return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
    + '<div class="m-head"><div class="row"><h2 style="font-size:1.2rem">Новая проектная задача</h2><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
    + '<div class="fld"><label>Номер задачи</label><input id="nfNum" value="' + E(f.number) + '" placeholder="например 432"></div>'
    + '<div class="fld"><label>Заказчик (компания)</label><input id="nfCust" value="' + E(f.customer) + '" list="dsCust"></div><datalist id="dsCust">' + (S.customers || []).map(function (c) { return '<option value="' + E(c.name) + '">'; }).join("") + "</datalist>"
    + '<div class="fld"><label>Объект</label><input id="nfObj" value="' + E(f.object) + '"></div>'
    + sysPick(f, "form")
    + '<div class="g2f"><div class="fld"><label>Срок по договору</label><input id="nfDue" type="date" value="' + E(f.due) + '"></div><div class="fld"><label>Сумма, ₽</label><input id="nfSum" type="number" min="0" value="' + E(f.amount) + '"></div></div>'
    + '<div class="fld"><label>Куда поставить</label><div class="seg" style="display:flex">' + [["flow", "По конвейеру"], ["work", "Сразу в проектирование"]].map(function (x) {
      return '<button type="button" data-nfstart="' + x[0] + '" class="' + ((f.work ? "work" : "flow") === x[0] ? "on" : "") + '" style="flex:1">' + x[1] + "</button>"; }).join("") + "</div></div>"
    + (f.work ? '<div class="g2f"><div class="fld"><label>Исполнитель</label><select id="nfExec"><option value="0">— выберите —</option>' + (S.people || []).map(function (u) { return '<option value="' + u.id + '"' + (u.id === +f.exec ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
      + '<div class="fld"><label>Сдать исполнителю до</label><input id="nfPlanEnd" type="date" value="' + E(f.planEnd || "") + '" title="Пусто — срок по договору"></div></div>' : "")
    + '<div class="fld"><label><input type="checkbox" id="nfAdv" ' + (f.adv ? "checked" : "") + '> Предусмотрен аванс</label></div>'
    + '<div class="fld"><label title="Без галочки — определится по названию работы (риск, категории, план эвакуации, спецификация)"><input type="checkbox" id="nfNp" ' + (f.np ? "checked" : "") + '> Не проектная работа — в операционный отдел, не в проектный</label></div>'
    + '<div class="fld" ' + (f.adv ? "" : 'style="display:none"') + ' id="nfAdvBox"><label>Сумма аванса, ₽</label><input id="nfAdvSum" type="number" min="0" value="' + E(f.advSum) + '"></div>'
    + '<div class="dbox"><small>Что произойдёт</small>' + (f.work ? "Задача минует аванс и сбор данных и сразу встанет «В проектирование» к исполнителю, ему и руководителю проектного отдела придёт уведомление; план — с сегодня до срока сдачи (пусто — до срока по договору)." + (f.adv ? " Бухгалтеру параллельно уйдёт «Выставить счёт на аванс»." : "")
      : f.adv ? "Задача встанет на паузу «Ожидает аванс», бухгалтеру уйдёт «Выставить счёт на аванс»." : "Задача сразу попадёт на «Сбор данных» к операционному менеджеру.") + "</div>"
    + '<div class="err" id="nfErr">' + E(f.err || "") + '</div><button class="btn primary block" data-create="1">' + (f.work ? "Создать и отдать в проектирование" : "Создать задачу") + "</button></div></div></div>";
}
/* задача сразу на «Корректировке»: замечания по уже сделанному проекту */
function fixFormHtml(f) {
  var people = S.people || [];
  return '<div class="modal-bg" data-bg="1" style="align-items:center;justify-content:center;padding:16px"><div class="modal" style="width:min(520px,100%);height:auto;max-height:92vh;border-radius:20px">'
    + '<div class="m-head"><div class="row"><h2 style="font-size:1.2rem">Задача сразу на корректировку</h2><button class="x" data-close="1">✕</button></div></div><div class="m-body">'
    + '<div class="g2f"><div class="fld"><label>Номер задачи</label><input id="nfNum" value="' + E(f.number) + '" placeholder="например 432"></div>'
    + '<div class="fld"><label>Заказчик (компания)</label><input id="nfCust" value="' + E(f.customer) + '" list="dsCust"></div></div><datalist id="dsCust">' + (S.customers || []).map(function (c) { return '<option value="' + E(c.name) + '">'; }).join("") + "</datalist>"
    + '<div class="fld"><label>Объект</label><input id="nfObj" value="' + E(f.object) + '"></div>'
    + sysPick(f, "form")
    + '<div class="fld"><label>Исполнитель</label><select id="nfExec"><option value="0">— не назначен —</option>' + people.map(function (u) { return '<option value="' + u.id + '"' + (u.id === +f.exec ? " selected" : "") + ">" + E(u.name) + "</option>"; }).join("") + "</select></div>"
    + '<div class="g2f"><div class="fld"><label>Срок корректировки, рабочих дней</label><input id="nfFixDays" type="number" min="1" max="120" value="' + E(f.fixDays) + '" placeholder="типовой срок этапа"></div>'
    + '<div class="fld"><label>Срок по договору</label><input id="nfDue" type="date" value="' + E(f.due) + '"></div></div>'
    + '<div class="fld"><label>Замечания заказчика</label><textarea id="nfRemarks" rows="3">' + E(f.remarks || "") + "</textarea></div>"
    + '<div class="dbox"><small>Что произойдёт</small>Задача встанет на «Корректировку» минуя конвейер: откроется корректировка №1 со сроком от сегодня, исполнитель и руководитель проектного отдела получат уведомление.</div>'
    + '<div class="err" id="nfErr">' + E(f.err || "") + '</div><button class="btn primary block" data-create="1">Поставить на корректировку</button></div></div></div>';
}

  window.DSRisk = { loadRisk: loadRisk, riskScreen: riskScreen, loadScripts: loadScripts, scriptsScreen: scriptsScreen, saveScripts: saveScripts, scFileName: scFileName, scFileOpen: scFileOpen, scUpload: scUpload, nextStep: nextStep, stepper: stepper, pauseCan: pauseCan, pauseable: pauseable, pzDay: pzDay, pzForm: pzForm, pauseBox: pauseBox, pauseRow: pauseRow, pzDo: pzDo, pzSave: pzSave, customerOf: customerOf, docRow: docRow, infoTab: infoTab, accButtons: accButtons, tzLine: tzLine, nowIn: nowIn, logTab: logTab, custChatHtml: custChatHtml, cthReload: cthReload, cthBind: cthBind, cthPicker: cthPicker, botCopy: botCopy, botPng: botPng, botQrHtml: botQrHtml, botWire: botWire, botLinkModal: botLinkModal, windowHtml: windowHtml, formHtml: formHtml, fixFormHtml: fixFormHtml, FOLDER_ROOT: FOLDER_ROOT, folderName: folderName, folderUrl: folderUrl, makeFolder: makeFolder };
})();
