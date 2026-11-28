/* Пятничный созвон РОПа: 9 блоков по утверждённому макету. Данные и сохранение — API ds_reports (мост). */
(function () {
  var R = null, RO = true, WEEK = "";
  var FILTER4 = null, MVO = false, CD = [];
  var BASIS_EVENTS = ["Договор подписан", "Акт подписан", "Акт отправлен", "Акт подписан авто", "Счёт отправлен"];
  var DEBT_RESULTS = {
    "Звонок": ["Дозвонился", "Не взял трубку", "Не звонил"],
    "Письмо": ["Отправлено", "Не отправлено"],
    "Претензия": ["Отправлена", "Не отправлена"],
    "Стоп работ": ["Работы и выдача документов остановлены", "Работы не остановлены"]
  };
  var DEBT_BASES = ["Договор подписан", "Акт подписан", "Акт подписан авто", "Счёт отправлен"];
  var CLAIM_STATUS = ["Отправлена", "Не отправлена"];
  var AV = {}, KV = {};                                  // AV — ответы (ds_call_notes), KV — поля КП ("id|field")
  var TEMP_T = { h: "Горячий: запросил КП или назвал срок/бюджет, контакт в последние 3 р.д.", m: "Тёплый: отвечает, объект есть, срок и бюджет не названы", l: "Холодный: нет ответа 5+ р.д. или просто узнаёт цену" };
  var TEMP_L = { h: "горячий", m: "тёплый", l: "холодный" };
  var TEMP_C = { h: "h", m: "m2", l: "l" };
  var WHY4 = ["Ждёт согласования", "Нет бюджета", "Ждёт деньги от своего заказчика", "Ждёт от нас (документы, правки)", "Не отвечает", "Свой вариант"];
  var RC4 = { "Ждёт согласования": "c1", "Нет бюджета": "c2", "Ждёт акт": "c3", "Не отвечает": "c4", "Оспаривает": "c5", "Ждёт от нас (документы, правки)": "c6", "Ждёт деньги от своего заказчика": "c6", "Свой вариант": "c7" };
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
  function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    var text = String(v == null ? "" : v);
    var amount = text.replace(/[\s\u20BD]/g, "");
    if (/^-?\d+[.,]\d{1,2}$/.test(amount)) return Number(amount.replace(",", "."));
    return parseInt(text.replace(/[^\d-]/g, ""), 10) || 0;
  }
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
  function todayD() { var d = R && R.cutoff ? isoToD(R.as_of) || new Date() : new Date(); d.setHours(0, 0, 0, 0); return d; }
  function isoToD(s) { return s && s.length >= 10 ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null; }
  function dmIso(s) { return s && s.length >= 10 ? s.slice(8, 10) + "." + s.slice(5, 7) : ""; }
  function dmyIso(s) { return s && s.length >= 10 ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(2, 4) : ""; }
  function pdDmy(s) {
    var m = /^(\d\d)\.(\d\d)\.(\d\d)$/.exec(s || "");
    if (!m) return null;
    var year = 2000 + +m[3], month = +m[2] - 1, day = +m[1];
    var date = new Date(year, month, day);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
  }
  function fdt(d) { return p2(d.getDate()) + "." + p2(d.getMonth() + 1); }
  function isoOf(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dmyToIso(s) { var d = pdDmy(s); return d ? isoOf(d) : ""; }
  function addBD(d, n) { var x = new Date(d); while (n > 0) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n--; } return x; }
  function bdN(a, b) { var x = new Date(a), n = 0; while (x < b) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0 && x.getDay() !== 6) n++; } return n; }
  function status(t) { var st = document.getElementById("srStatus"); if (st) st.textContent = t; }


  var drafts = { writes: {}, edits: {} }, draftOwner = "", writeQueues = {};
  function currentDraftOwner() {
    var uid = window.MPBC && MPBC.me && MPBC.me.id;
    return uid ? "ds-sales-report-drafts-v1:" + uid : "";
  }
  function openDrafts() {
    var owner = currentDraftOwner();
    if (owner === draftOwner) return;
    draftOwner = owner;
    drafts = { writes: {}, edits: {} };
    if (!owner) return;
    try {
      var saved = JSON.parse(localStorage.getItem(owner) || "null");
      if (saved && saved.writes && saved.edits) {
        drafts = saved;
        Object.keys(drafts.writes).forEach(function (key) { drafts.writes[key].error = true; });
      }
    } catch (_) {}
  }
  function storeDrafts() {
    if (!draftOwner) return;
    try { localStorage.setItem(draftOwner, JSON.stringify(drafts)); } catch (_) {}
  }
  function noteId(key) { return "note|" + WEEK + "|" + key; }
  function entryFor(t) {
    var kpd = t.classList.contains("dtx") && t.closest(".kpd");
    if (kpd) return kpd.dataset.kp ? "kp|" + kpd.dataset.kp + "|issued_date" : noteId("s7:custom");
    if (t.dataset.akp) return "kp|" + t.dataset.akp;
    if (t.dataset.ak) return noteId(t.dataset.ak);
    if (t.dataset.cu) return noteId("s7:custom");
    if (t.dataset.md) return noteId(t.closest("[data-manual]").dataset.manual);
    var group = t.dataset.aks || t.dataset.akm;
    if (group) return group.indexOf("kp:") === 0 ? "kp|" + group.slice(3)
      : noteId(group.indexOf("cu:") === 0 ? "s7:custom" : group);
    return "";
  }
  function editId(t) {
    var id = entryFor(t);
    if (t.dataset.md) id += "|" + t.dataset.md;
    if (t.dataset.cu) id += "|" + t.dataset.cu;
    var kpd = t.classList.contains("dtx") && t.closest(".kpd[data-cukp]");
    if (kpd) id += "|" + kpd.dataset.cukp + "|issued";
    return id;
  }
  function rememberEdit(t, error) {
    var key = editId(t);
    if (!key) return;
    drafts.edits[key] = { value: t.value, error: error || "" };
    storeDrafts();
  }
  function forgetEdit(t) {
    var key = editId(t);
    if (key && drafts.edits[key]) {
      delete drafts.edits[key];
      storeDrafts();
    }
  }
  function restoreEdits(root) {
    root.querySelectorAll(".kpd").forEach(function (el) {
      var key = el.dataset.kp ? "kp|" + el.dataset.kp + "|issued_date"
        : noteId("s7:custom") + "|" + el.dataset.cukp + "|issued";
      if (drafts.edits[key] && !el.querySelector(".dtx")) editKp(el, false);
    });
    root.querySelectorAll("input,textarea,select").forEach(function (t) {
      var draft = drafts.edits[editId(t)], pending = drafts.writes[entryFor(t)];
      if (t.disabled) return;
      if (draft) t.value = draft.value;
      else if (pending && t.dataset.ak) t.value = t.classList.contains("dtx") ? dmyIso(pending.value) : pending.value;
    });
  }
  function applyWrites() {
    Object.keys(drafts.writes).forEach(function (id) {
      var parts = id.split("|"), entry = drafts.writes[id];
      if (parts[0] === "kp") KV[parts[1] + "|" + parts[2]] = entry.value;
      else if (parts[1] === WEEK) AV[parts[2]] = entry.value;
    });
  }
  function reportDrafts() {
    var root = document.querySelector(".sr");
    if (!root || RO) return;
    var selector = "[data-ak],[data-akp],[data-aks],[data-akm],[data-cu],[data-md],.kpd .dtx,.kpd .dt5";
    var fields = Object.create(null), seen = Object.create(null), hasEdits = false;
    root.querySelectorAll(selector).forEach(function (t) {
      var key = editId(t), ref = entryFor(t);
      if (t.classList.contains("dt5") && t.closest(".kpd[data-kp]")) ref = "kp|" + t.closest(".kpd").dataset.kp + "|issued_date";
      if (t.disabled) return;
      var edit = drafts.edits[key], write = drafts.writes[ref];
      if (edit) hasEdits = true;
      var issue = edit && edit.error ? { key: key, text: edit.error, invalid: true }
        : write && write.error && (!write.field || write.field === key) ? { key: ref, text: "Не сохранено. Повторите попытку.", retry: true } : null;
      t.toggleAttribute("data-sr-invalid", Boolean(issue));
      if (issue && issue.invalid) t.setAttribute("aria-invalid", "true");
      else if (t.hasAttribute("aria-invalid")) t.removeAttribute("aria-invalid");
      if (issue && !seen[issue.key]) {
        var row = t.closest("[data-sr-row]");
        if (row && row.classList.contains("sr-row-open") === false && t.closest(".sr-row-extra")) {
          row.classList.add("sr-row-open");
          var toggle = row.querySelector("[data-sr-detail]");
          toggle.setAttribute("aria-expanded", "true");
          toggle.textContent = "Свернуть детали";
        }
        seen[issue.key] = true;
        fields[issue.key] = { target: t, issue: issue };
      }
    });
    var previous = new Map();
    root.querySelectorAll(".sr-field-error").forEach(function (e) { previous.set(e.dataset.srIssue, e); });
    Object.keys(fields).forEach(function (key) {
      var x = fields[key], issue = x.issue, el = previous.get(key);
      if (el && el.isConnected && el.textContent.indexOf(issue.text) === 0) {
        previous.delete(key);
        return;
      }
      if (el) el.remove();
      el = document.createElement("span");
      el.className = "sr-field-error";
      el.dataset.srIssue = key;
      el.append(issue.text);
      if (issue.retry) {
        var button = document.createElement("button");
        button.type = "button";
        button.dataset.srRetry = key;
        button.textContent = "Повторить";
        el.append(button);
      }
      var cell = x.target.closest(".drow > *, .gr > *");
      if (cell === x.target && cell.matches("input,textarea,select")) {
        var wrapper = document.createElement("span");
        wrapper.className = Array.from(cell.classList).filter(function (name) { return name.indexOf("sr-row-") === 0; }).join(" ");
        wrapper.dataset.srLabel = cell.dataset.srLabel || "";
        Array.from(wrapper.classList).forEach(function (name) { cell.classList.remove(name); });
        cell.replaceWith(wrapper);
        wrapper.append(cell);
        cell = wrapper;
      }
      if (cell && !cell.matches("input, textarea, select")) cell.append(el);
      else if (x.target.closest(".dtw,.kpd,.sg,.mcs")) x.target.closest(".dtw,.kpd,.sg,.mcs").after(el);
      else x.target.after(el);
      previous.delete(key);
    });
    previous.forEach(function (el) { el.remove(); });
    var current = Object.keys(drafts.writes).filter(function (key) {
      return key.indexOf("note|" + WEEK + "|") === 0 || key.indexOf("kp|") === 0;
    });
    var active = current.some(function (key) { return writeQueues[draftOwner + ":" + key]; });
    var failed = current.filter(function (key) { return drafts.writes[key].error; });
    var retry = document.getElementById("srRetryAll");
    if (retry) {
      retry.hidden = !failed.length && !hasEdits;
      retry.textContent = failed.length ? "Повторить сохранение" : "Сохранить черновики";
    }
    if (failed.length) status("Есть несохранённые изменения");
    else if (active) status("Сохраняем…");
    else if (current.length || hasEdits) status("Есть черновики");
    else status("Изменения сохраняются автоматически");
  }
  function queueWrite(id, url, body, value, field) {
    var bucket = drafts, owner = draftOwner, queueKey = owner + ":" + id;
    var previous = bucket.writes[id];
    var entry = { url: url, body: body, value: value, error: false, field: field || (previous && previous.field) || "" };
    bucket.writes[id] = entry;
    storeDrafts();
    var op = Promise.resolve(writeQueues[queueKey]).then(function () {
      if (bucket.writes[id] !== entry || owner !== draftOwner || owner !== currentDraftOwner()) return false;
      return Promise.resolve(MPBC.call(url, { body: body })).then(function () {
        if (bucket.writes[id] === entry) delete bucket.writes[id];
        return true;
      });
    }).catch(function () {
      if (bucket.writes[id] === entry) entry.error = true;
      return false;
    }).then(function (ok) {
      if (writeQueues[queueKey] === op) delete writeQueues[queueKey];
      if (owner === draftOwner) {
        storeDrafts();
        reportDrafts();
        if (ok && !Object.keys(drafts.writes).length && (id.indexOf("note|" + WEEK + "|") === 0 || id.indexOf("kp|") === 0)) status("Сохранено");
      }
      return ok;
    });
    writeQueues[queueKey] = op;
    reportDrafts();
    return op;
  }
  function retryWrite(id) {
    var d = drafts.writes[id];
    if (d && d.error) queueWrite(id, d.url, d.body, d.value);
  }
  function commitDraftEdits(root) {
    var edits = new Set(), refs = new Set();
    root.querySelectorAll("input,textarea").forEach(function (input) {
      var id = editId(input);
      if (!drafts.edits[id] || edits.has(id) || input.disabled) return;
      edits.add(id);
      refs.add(entryFor(input));
      var kp = input.classList.contains("dtx") && input.closest(".kpd");
      if (kp) commitKp(kp);
      else input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return refs;
  }
  function saveNote(key, value, source) {
    AV[key] = value;
    return queueWrite(noteId(key), "/../ds/reports/sales/answer", { start: WEEK, key: key, text: value }, value, source ? editId(source) : "");
  }
  function saveKp(kpId, field, value) {
    var key = kpId + "|" + field, body = {};
    KV[key] = value;
    body[field] = value;
    return queueWrite("kp|" + key, "/../ds/kp/" + kpId + "/edit", body, value);
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
    return '<div class="sg s rq" data-aks="' + E(key) + '">' + PM.map(function (o) {
      return '<button type="button" data-p="' + o[1] + '" data-val="' + o[0] + '"' + (o[0] === val ? ' class="on"' : "") + dis() + '>' + o[2] + "</button>";
    }).join("") + "</div>";
  }
  function dateField(dmy, attrs) {
    return '<span class="dtw"><input class="in rq dtx" type="text" inputmode="numeric" maxlength="8" placeholder="дд.мм.гг" autocomplete="off"' + ((attrs || "").indexOf("aria-label=") < 0 ? ' aria-label="Дата"' : "") + ' value="' + E(dmy || "") + '" ' + (attrs || "") + dis() + '>'
      + '<button type="button" class="dtb" aria-label="Выбрать дату в календаре"' + dis() + '>' + SVGCAL + '</button><input type="date" class="dth" tabindex="-1" aria-hidden="true"></span>';
  }
  function selOpts(cur, options, placeholder) {                           // select со значением из списка + legacy-значение, если его нет в списке
    var opts = options.slice();
    if (cur && opts.indexOf(cur) < 0) opts.unshift(cur);
    return '<option value="">' + (placeholder || "—") + '</option>' + opts.map(function (o) { return '<option' + (o === cur ? " selected" : "") + '>' + E(o) + "</option>"; }).join("");
  }
  function qa(n, bid, title, chipsHtml, bodyHtml, opt) {
    opt = opt || {};
    var expanded = !opt.lock;
    return '<div class="qa' + (expanded ? " open" : "") + '" data-q="' + n + '"><button class="qb" type="button" aria-expanded="' + expanded + '" aria-controls="' + bid + '"><span class="no">' + n + '</span><span class="t"><b>' + E(title) + (opt.lock ? " " + LOCK : "") + '</b>' + (opt.titleSmall ? "<small>" + E(opt.titleSmall) + "</small>" : "")
      + (chipsHtml || opt.plId ? '<span class="pl"' + (opt.plId ? ' id="' + opt.plId + '"' : "") + '>' + (chipsHtml || "") + "</span>" : "")
      + (opt.sub || "") + '</span><span class="ch">' + CHEV + '</span></button><div class="bx" id="' + bid + '">' + bodyHtml + "</div></div>";
  }
  function zone(vars, title, inner) {
    return '<div class="zn" style="' + vars + '"><div class="zh"><div><b class="big">' + E(title) + '</b></div></div><div class="zi">' + inner + "</div></div>";
  }
  function ac3(cls, t, cnt, right, body, open) {
    return '<div class="ac3 ' + cls + (open ? " open" : "") + '"><button class="acb" type="button" data-ac="1" aria-expanded="' + Boolean(open) + '"><span>' + E(t) + " · " + cnt + "</span><span>" + (right || "") + " ▾</span></button>" + '<div class="bdy">' + body + "</div></div>";
  }
  function emptyNote() { return '<div class="sr-empty">Нет данных за выбранную неделю</div>'; }
  function workCell(codes, cls) {
    var compact = Array.isArray(codes) ? codes.join(".") : "";
    return '<span class="' + (cls || "vw") + '">' + E(compact || "—") + "</span>";
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
  function ptxtQ(kpId, registryProb) {
    var value = KV[kpId + "|sale_prob"] || "";
    var labels = {high: "Высокая", mid: "Средняя", low: "Низкая"};
    var fallback = labels[registryProb] || "Выбрать";
    return '<span class="sr-prob-field" data-tone="' + E(value || registryProb) + '"><span aria-hidden="true">' + E(labels[value] || fallback) + '</span><select class="sr-sale-prob" data-fallback="' + E(registryProb || "") + '" data-akp="' + kpId + '|sale_prob" data-tone="' + E(value) + '" aria-label="Вероятность продажи" title="' + E(labels[value] || "Укажите вероятность продажи") + '"' + dis()
      + '><option value="">'+ E(fallback) +'</option>' + Object.keys(labels).map(function (key) {
        return '<option value="' + key + '"' + (key === value ? " selected" : "") + '>' + labels[key] + "</option>";
      }).join("") + "</select></span>";
  }
  function rowQ(r) {
    var kpId = r.kp;
    var lc = r.last_bd == null ? 99 : r.last_bd;
    var lq = lc >= 99 ? '<span class="lq r">—</span>' : '<span class="lq' + (lc >= 3 ? " r" : "") + '">' + (lc === 0 ? "сегодня" : lc + " р.д.") + "</span>";
    var customer = E(r.cells[1]);
    return '<div class="i r6"><span class="nm1">' + (RO ? customer : '<button type="button" class="sr-kp-link" data-sr-card="' + kpId + '">' + customer + '<small>Изменить</small></button>') + '</span>' + workCell(r.systems)
      + '<div class="rt">' + ptxtQ(kpId, r.registry_prob) + lq + ncell(kpId) + "<b>" + fmt(num(r.amt)) + "</b></div>"
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
    var totalN = s1.created_count == null ? rows.length : s1.created_count, totalS = s1.created_sum == null ? openSum : s1.created_sum;

    var cap = '<div class="i cap r6"><span>Заказчик</span><span class="vw">Вид работ</span><div class="rt"><span>Вероятность</span><span>Посл. контакт</span><span>След. контакт</span><b>Сумма</b></div><span>Комментарий</span></div>';
    var lane = '<div class="lane wide" style="border:0;border-radius:0;background:transparent">' + cap + rows.map(rowQ).join("") + (rows.length ? '<div class="i tt r6"><span>Итого</span><span></span><div class="rt"><span></span><span></span><span></span><b>' + fmt(openSum) + "</b></div><span></span></div>" : '<div class="sr-empty">Нет запросов в решении</div>') + "</div>";

    function r1(list2) {
      return '<div class="r1 cap1"><span>Заказчик</span><span>Вид работ</span><b>Сумма</b></div>' + list2.map(function (r) {
        return '<div class="r1"><span>' + (!RO && r.kp ? '<button type="button" class="sr-kp-link" data-sr-card="'+r.kp+'">'+E(r.customer || r.cells[1])+'<small>Изменить КП</small></button>' : E(r.customer || r.cells[1])) + "</span>" + workCell(r.systems, "vt") + "<b>" + fmt(num(r.amt != null ? r.amt : r.cells[2])) + "</b></div>";
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
      + ac3("red", "Отказ", refs.length, fmt(refSum) + " ₽", refs.length ? r1(refs.map(function (r) { return { kp: r.kp, customer: r.cells[1], sv: r.cells[3], systems: r.systems, amt: r.cells[2] }; })) : '<div class="sr-empty">Нет отказов</div>', false) + "</div>" + fin;
    var chips = '<span><strong>' + totalN + "</strong> " + plr(totalN) + "</span><span><strong>" + fmt(totalS) + "</strong></span>"
      + (sold.length ? '<span class="g">продано <strong>' + sold.length + " · " + fmt(soldSum) + "</strong></span>" : "")
      + (refs.length ? '<span class="r">отказ <strong>' + refs.length + "</strong></span>" : "");
    return qa(1, "srb1", "КП", chips, body);
  }

  // --------------------------------------------------------------- блок 2: Оплаты
  function block2() {
    var s2 = item("s2"), rows = s2.rows || [];
    var PTC = { "Предоплата": "pre", "Доплата": "add", "Постоплата": "post" };
    var paySum = rows.reduce(function (s, r) { return s + num(r.amount == null ? r.cells[0] : r.amount); }, 0);
    function rowP(r, n) {
      var inputs = r.inputs || [];
      var kindI = inputs.find(function (i) { return /:kind$/.test(i.key); }) || {};
      var noteI = inputs.find(function (i) { return /:note$/.test(i.key); }) || {};
      var kind = AV[kindI.key] !== undefined ? AV[kindI.key] : (kindI.v || "");
      return '<div class="i r6"><span>' + (!RO && r.kp ? '<button class="sr-kp-link" type="button" data-sr-card="'+r.kp+'">'+E(r.cells[1])+'<small>Изменить КП</small></button>' : E(r.cells[1]) + (!r.kp && !RO ? "<small>Без привязки к КП</small>" : "")) + (r.payment_date ? '<small style="display:block">' +
        E(dmIso(r.payment_date)) + (r.after_close ? " · Получен после закрытия" : "") + "</small>" : "") + "</span>" + workCell(r.systems)
        + '<span class="tc"><select class="tsel rq ' + (PTC[kind] || "") + '" data-ak="' + E(kindI.key) + '" aria-label="Тип оплаты"' + dis() + '><option value="">Выбрать тип</option>'
        + ["Предоплата", "Доплата", "Постоплата"].map(function (t) { return "<option" + (t === kind ? " selected" : "") + ">" + t + "</option>"; }).join("") + "</select></span>"
        + "<b>" + (r.amount == null ? E(r.cells[0]) : fmt(r.amount)) + '</b><input class="cmq" data-ak="' + E(noteI.key) + '" type="text" placeholder="Комментарий" aria-label="Комментарий к оплате" value="' + E(AV[noteI.key]) + '"' + dis() + "></div>";
    }
    var cap = '<div class="i cap r6"><span>Заказчик</span><span class="vw">Вид работ</span><span>Тип оплаты</span><b>Сумма</b><span>Комментарий</span></div>';
    var legacy = s2.legacy_payments || [];
    var lane = '<div class="payw"><div class="lane wide pay"><h4><span>Оплаты · ' + rows.length + "</span>" + cmpSpan(s2.cmp, paySum, plp) + "</h4>" + cap
      + rows.map(rowP).join("")
      + (rows.length ? '<div class="i tt r6"><span>Итого</span><span></span><span></span><b>' + fmt(paySum) + "</b><span></span></div>" : '<div class="sr-empty">Оплат за неделю нет</div>') + "</div></div>"
      + (s2.note ? '<p class="rl5">' + E(s2.note) + "</p>" : "")
      + (legacy.length ? '<details class="rl5"><summary>Ранее сохранённые отметки оплат по номерам старых строк</summary><ul>'
        + legacy.map(function (row) { return "<li>Строка " + row.n + " · " + E([row.kind, row.note].filter(Boolean).join(" · ")) + "</li>"; }).join("")
        + "</ul></details>" : "");
    var chips = '<span><strong>' + rows.length + "</strong> " + plp(rows.length) + "</span><span><strong>" + fmt(paySum) + "</strong></span>"
      + "<span>по новым КП <strong>" + (s2.new_req || 0) + "</strong></span>";
    return qa(2, "srb2", "Оплаты", chips, lane);
  }

  // --------------------------------------------------------------- блок 3: План прошлой недели
  function weeklyPayments(plan, threshold, fact, pct, period, mpb) {
    var state = fact < threshold ? "r" : plan && fact < plan ? "y" : "g";
    var labels = {r: "ниже порога", y: "порог пройден", g: "план выполнен"};
    var scale = Math.max(plan * 1.12, threshold * 1.12, fact * 1.04, 1);
    var planPct = plan ? pct + "%" : "—";
    function width(value) { return (Math.max(0, value) / scale * 100).toFixed(1) + "%"; }
    function label(name, value, color) {
      return '<div class="v3n"><i style="background:' + color + '"></i>' + name + '<b>' + fmt(value) + '</b></div>';
    }
    function bar(value, label, style) {
      return '<i class="v3in" style="width:' + width(value) + ';' + style + '">' + label + '</i>';
    }
    function delta(goal) {
      var d = fact - goal;
      return '<div class="v3s ' + (d >= 0 ? 'v3ok">Дошли<small>+' : 'v3no">Не дошли<small>−')
        + fmt(Math.abs(d)) + '</small></div>';
    }
    function marker(value, kind, name) {
      return '<span class="v3k ' + kind + '" style="left:' + width(value) + '"></span>'
        + '<span class="v3l ' + kind + '" style="left:' + width(value) + '">' + name + '</span>';
    }
    var markers = plan === threshold ? marker(plan, "p", "план и порог")
      : marker(threshold, "t", "порог безубыточности") + (plan ? marker(plan, "p", "план") : "");
    return '<div class="v3c st-' + state + '"><div class="v3h"><span>Оплаты за неделю ' + E(period)
      + '</span><small>' + (mpb ? "CRM + МПБ вручную" : "из реестра оплат") + '</small></div>'
      + '<div class="v3body"><div class="v3big"><div class="v3pc">' + (plan ? pct + '<small>%</small>' : "—")
      + '</div><div class="v3lb">плана</div><div class="v3tg">' + (plan ? labels[state] : "План не задан") + '</div></div><div class="v3rows">'
      + '<div class="v3r">' + label("План", plan, "#3b7dd8") + '<div class="v3t">' + bar(plan, fmt(plan), "background:#a9c8f0;color:#1f5bb0") + '</div>' + delta(plan) + '</div>'
      + '<div class="v3r">' + label("Порог безубыточности", threshold, "#e8892c") + '<div class="v3t">'
      + bar(threshold, plan ? Math.round(threshold / plan * 100) + "% плана" : fmt(threshold), "background:#f6c48f;color:#8a4a0c") + '</div>' + delta(threshold) + '</div>'
      + '<div class="v3r v3f">' + label("Факт", fact, "#4f6478") + '<div class="v3t">'
      + (plan && fact <= plan ? '<span class="v3z" style="left:' + width(plan) + '"><em>сверх плана</em></span>' : '')
      + bar(fact, planPct, "background:#4f6478;color:#fff") + markers + '</div>'
      + '<div class="v3s v3fc">' + planPct + ' плана<small>' + Math.round(fact / threshold * 100)
      + '% порога</small></div></div></div></div></div>';
  }
  function block3() {
    var s3 = item("s3");
    var plan = Math.max(0, num(kvs(s3, "План"))), registry = s3.registry_fact == null ? num(kvs(s3, "Факт")) : s3.registry_fact;
    var mpb = num(AV["s3:mpb"]), fact = registry + mpb, pct = plan ? Math.round(fact * 100 / plan) : 0;
    var threshold = Math.max(0, num(s3.threshold)) || 300000;
    var mon = isoToD(WEEK), fri = isoToD(R.week_end) || (mon ? addBD(mon, 4) : null);
    var period = mon ? mon.getDate() + (mon.getMonth() === fri.getMonth() ? "" : " " + MONTHS[mon.getMonth()])
      + "–" + fri.getDate() + " " + MONTHS[fri.getMonth()] : "";
    var body = '<div id="sr-weekly-chart" data-plan="' + plan + '" data-threshold="' + threshold + '" data-registry="' + registry + '" data-period="' + E(period) + '">'
      + weeklyPayments(plan, threshold, fact, pct, period, mpb) + '</div>'
      + '<form class="sr-mpb"><div><b>Факт за неделю</b><small id="sr-mpb-source">Реестр оплат: ' + fmt(registry) + ' ₽ · МПБ вручную: ' + fmt(mpb) + ' ₽</small></div>'
      + '<label>МПБ, ₽ <input name="mpb" type="number" min="0" max="99999999" step="1" value="' + E(AV["s3:mpb"]) + '" placeholder="0"' + dis() + '></label>'
      + (RO ? "" : '<button type="submit" class="sr-mock-btn">Учесть в плане</button>') + '</form>'
      + '<div class="fin"><div><textarea class="ta rq" data-ak="s3:why" placeholder="Почему так? Одной-двумя фразами" aria-label="Почему так"' + dis() + ">" + E(AV["s3:why"]) + '</textarea></div>'
      + '<div><div class="g3" style="margin-top:0"><input class="in rq" data-ak="s3:action" type="text" placeholder="Что делаю?" aria-label="Что делаю" value="' + E(AV["s3:action"]) + '"' + dis() + '><input class="in rq" data-ak="s3:date" type="date" aria-label="К какой дате" title="К какой дате" value="' + E(AV["s3:date"]) + '"' + dis() + "></div></div></div>";
    var chips = '<span>план <strong>' + fmt(plan) + '</strong></span><span>факт <strong id="sr-weekly-fact">' + fmt(fact)
      + '</strong></span><span><strong id="sr-weekly-percent">' + (plan ? pct + "%" : "—") + '</strong></span>';
    return qa(3, "srb3", R.cutoff ? "Выполнение плана" : "Выполнение плана прошлой недели", chips, body);
  }

  // --------------------------------------------------------------- блок 4: Просроченные оплаты
  function debtInput(attr, label, value, type, required) {
    return '<input class="cmq' + (required ? " rq" : "") + '" ' + attr + ' type="' + type + '" aria-label="' + E(label) + '" value="' + E(value)
      + '"' + (type === "text" ? ' maxlength="180" placeholder="' + E(label) + '"' : "") + dis() + ">";
  }
  var DEBT_TONES = {
    "Дозвонился": "ok", "Отправлено": "ok", "Отправлена": "ok", "Работы и выдача документов остановлены": "ok",
    "Не взял трубку": "wait",
    "Не звонил": "late", "Не отправлено": "late", "Не отправлена": "late", "Работы не остановлены": "late",
    "Звонок": "info", "Письмо": "ok", "Претензия": "wait", "Стоп работ": "late"
  };
  function debtSelect(attr, label, value, options, colored) {
    var tone = colored ? (DEBT_TONES[value] || "") : "";
    return '<span class="rsn sr-debt-select ' + (value ? "" : "c0") + '"><i class="rd"></i><select class="cmq rq" ' + attr
      + ' data-debt-tone="' + tone + '" aria-label="' + E(label) + '"' + dis() + ">"
      + selOpts(value, options, "выбрать") + "</select></span>";
  }
  function debtActions(pre) {
    return Object.keys(DEBT_RESULTS).filter(function (step) { return !pre || step !== "Претензия"; });
  }
  function debtPast(attr, get, pre, prevStep) {
    var past = get("past");
    if (past === undefined) past = prevStep;
    if (!debtActions(pre).includes(past)) return '<span class="pw4"><i>новый долг</i></span>';
    var options = DEBT_RESULTS[past], result = options.includes(get("result")) ? get("result") : "";
    var colors = {ok: "g", wait: "o", late: "r"};
    return '<span class="ps4 ' + (colors[DEBT_TONES[result]] ? "c-" + colors[DEBT_TONES[result]] : "emp")
      + '"><span class="psl">' + E(past) + '</span><span class="pss"><select class="psel" ' + attr("result")
      + ' aria-label="Итог прошлого шага"' + dis() + '>' + selOpts(result, options, "итог?") + "</select></span></span>";
  }
  function debtTail(attr, get, type, expected, nextDate, prevStep, legacy) {
    var pre = type === "pre", why = get("why") || "";
    var actions = debtActions(pre);
    return '<span class="debt-fields"><span class="rsn ' + (RC4[why] || "c0") + '"><i class="rd"></i><select class="rsel cmq rq" '
      + attr("why") + ' aria-label="Почему не платят" title="' + E(why || "Почему не платят") + '"' + dis() + ">" + selOpts(why, WHY4, "выбрать") + "</select></span>"
      + '<span class="debt-other"' + (why === "Свой вариант" ? "" : " hidden") + ">"
      + debtInput(attr("whytext"), "Своя причина", get("whytext"), "text", true) + "</span></span>"
      + '<span class="debt-fields">' + expected + "</span>"
      + '<span class="debt-fields" data-past4>' + debtPast(attr, get, pre, prevStep) + "</span>"
      + "<span>" + (type === "debt" ? debtSelect(attr("claim"), "Претензия", CLAIM_STATUS.includes(get("claim")) ? get("claim") : "", CLAIM_STATUS, true) : "—") + "</span>"
      + '<span class="debt-fields">' + debtSelect(attr("step"), "Следующий шаг", actions.includes(get("step")) ? get("step") : "", actions, true)
      + (legacy ? "<small>Ранее: " + E(legacy) + "</small>" : "") + "</span>"
      + "<span>" + nextDate + "</span>";
  }
  var BASIS_TONES = {"Договор подписан": "dg", "Акт подписан": "ac", "Акт подписан авто": "au", "Акт отправлен": "au", "Счёт отправлен": "sc"};
  function debtPill(label, value, kind, tip) {
    return '<span class="sg4 ' + kind + '" title="' + E(tip) + '"><span class="sa4">' + E(label)
      + '</span><span class="sb4">' + E(value) + "</span></span>";
  }
  function paymentEvent(event, base) {
    if (!base) return "—";
    return '<span class="sg4 payment-basis" title="Дата, с которой считается срок оплаты"><span class="sa4 ' + (BASIS_TONES[event] || "") + '">'
      + E(event || "Дата отсчёта") + '</span><time class="sb4" datetime="' + E(base) + '">' + E(dmyIso(base)) + "</time></span>";
  }
  function overdueBadge(days, limit, assumed) {
    if (!Number.isFinite(limit) || limit < 0) return "";
    var overdue = days - limit;
    var tip = (assumed ? "Типовой срок: " : "Срок оплаты: ") + limit + " р.д.";
    return overdue > 0 ? debtPill("Просрочено на", overdue + " р.д.", "lt4", tip)
      : '<small class="payment-in-term" title="' + E(tip) + '">' + (overdue === 0 ? "Последний день срока" : "В сроке · " + (-overdue) + " р.д.") + "</small>";
  }
  function debtTiming(event, base, days, limit) {
    return base ? '<span class="bo4">' + paymentEvent(event, base) + overdueBadge(days, limit) + "</span>" : "—";
  }
  function debtContact(days, expected, attr) {
    var age = !Number.isFinite(days) || days < 0 ? "—" : days === 0 ? "сегодня" : days + " р.д.";
    var tone = !expected ? "emp" : expected < isoOf(todayD()) ? "bad" : "ok";
    return '<span class="lc4">' + debtPill("Контакт", age, "ct4" + (days >= 3 ? " old" : ""), "Сколько рабочих дней назад был последний контакт с клиентом")
      + '<button class="prm sg4 pm4 ' + tone + '" data-sr-promise type="button" title="До какой даты клиент обещал оплатить"' + dis() + '>'
      + '<span class="sa4">Обещал оплатить</span><span class="sb4">' + (expected ? E(dmIso(expected)) : "дата?") + '</span></button>'
      + '<input class="dnat prd" type="date" tabindex="-1" aria-label="Клиент обещал оплатить до" ' + attr + ' value="' + E(expected) + '"' + dis() + '></span>';
  }
  function debtRow(r, i, pre) {
    var key = (pre ? "s4:" : "s6:") + r.key;
    var attr = function (field) { return 'data-ak="' + E(key + ":" + field) + '"'; };
    var get = function (field) { return AV[key + ":" + field]; };
    var kp = r.expect_kp || (pre ? r.kp : 0);
    var dt = pre && r.kp
      ? dateField(dmyIso(KV[r.kp + "|next_contact"]), 'aria-label="Дата следующего контакта" data-akp="' + r.kp + '|next_contact"')
      : dateField(dmyIso(get("date")), 'aria-label="Дата следующего контакта" ' + attr("date"));
    var expected = kp ? KV[kp + "|pay_expect"] : get("expect");
    var expectedAttr = kp ? 'data-akp="' + kp + '|pay_expect"' : attr("expect");
    var contact = isoToD(r.contact);
    var lastDays = contact ? bdN(contact, todayD()) : pre ? r.last_bd : undefined;
    return '<div class="i r6 drow" data-rsn="' + E(get("why")) + '" data-type="' + (pre ? "pre" : "debt") + '" data-days="' + Math.max(0, (r.bd || 0) - (r.lim || 0)) + '" data-sum="' + num(r.amt) + '">'
      + '<span class="dnm"><i class="n4">' + (i + 1) + '</i><b>' + E(r.cells[pre ? 2 : 1]) + '</b><small>' + E(r.sub || "") + '</small></span>'
      + '<span><span class="dpill ' + (pre ? "pre" : "debt") + '">' + (pre ? "Просрочена предоплата" : "Долг") + "</span></span>"
      + '<b class="sm">' + fmt(num(r.amt)) + '</b><span class="dd debt-fields">' + debtTiming(r.ev, r.base, r.bd || 0, r.lim) + "</span>"
      + debtTail(attr, get, pre ? "pre" : "debt", debtContact(lastDays, expected, expectedAttr), dt, r.prev_step, AV[key]) + "</div>";
  }
  function manualDebtRow(key, row) {
    var attr = function (field) { return 'data-md="' + field + '"'; };
    var get = function (field) { return row[field]; };
    var base = isoToD(row.base), days = base ? bdN(base, todayD()) : 0;
    var event = row.event || "";
    var limit = event === "Акт подписан авто" ? 10 : event ? 5 : undefined;
    var typeOptions = '<option value="">выбрать</option><option value="pre"' + (row.type === "pre" ? " selected" : "") + '>Предоплата</option>'
      + '<option value="debt"' + (row.type === "debt" ? " selected" : "") + ">Долг</option>";
    return '<div class="i r6 drow" data-manual="' + E(key) + '" data-rsn="' + E(row.why) + '" data-type="' + E(row.type)
      + '" data-days="' + Math.max(0, days - (limit || 0)) + '" data-sum="' + Math.max(0, num(row.sum)) + '">'
      + '<span class="dnm debt-fields"><i class="n4"></i>' + debtInput(attr("name"), "Заказчик", row.name, "text")
      + debtInput(attr("ref"), "№ счёта или акта", row.ref, "text")
      + (RO ? "" : '<button type="button" class="add" data-del4>Убрать строку</button>') + "</span>"
      + '<span><select class="cmq rq" data-md="type" aria-label="Тип"' + dis() + ">" + typeOptions + "</select></span>"
      + '<span><input class="cmq" data-md="sum" type="number" min="0" max="99999999999" step="1" aria-label="Сумма" value="' + E(row.sum) + '"' + dis() + "></span>"
      + '<span class="debt-fields">' + debtSelect(attr("event"), "От чего считаем", event, DEBT_BASES)
      + debtInput(attr("base"), "Дата отсчёта", row.base, "date") + (base ? overdueBadge(days, limit, true) : "") + "</span>"
      + debtTail(attr, get, row.type, debtContact(isoToD(row.contact) ? bdN(isoToD(row.contact), todayD()) : -1, row.expect, attr("expect"))
        + debtInput(attr("contact"), "Последний контакт", row.contact, "date"),
        debtInput(attr("date"), "Дата следующего контакта", row.date, "date", true)) + "</div>";
  }
  function manualDebt(key) {
    try { return JSON.parse(AV[key]) || {}; } catch (e) { return {}; }
  }
  function block4() {
    var s4 = item("s4"), s6 = item("s6");
    var rows = s4.rows.filter(function (r) { return r.late; }).map(function (r) { r.__pre = true; return r; })
      .concat(s6.rows.map(function (r) { r.__pre = false; return r; }));
    rows.sort(function (a, b) { var ta = a.__pre ? 0 : 1, tb = b.__pre ? 0 : 1; return ta - tb || (a.bd || 0) - (b.bd || 0); });
    var manual = Object.keys(AV).filter(function (k) { return /^s4:m[a-z0-9]+$/.test(k) && AV[k]; });
    var tot = rows.reduce(function (s, r) { return s + num(r.amt); }, 0);
    var longest = rows.reduce(function (max, r) { return Math.max(max, (r.bd || 0) - (r.lim || 0)); }, 0);
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
    var promises = s4.promises || {};
    var done = promises.fulfilled || {count: 0, sum: 0}, missed = promises.missed || {count: 0, sum: 0}, waiting = promises.waiting || {count: 0};
    var body = '<div class="lane wide dbt sr-debt-frame"><h4><span id="srDebtHeading">Просроченные оплаты</span><span class="cmpt dn" id="srdebtSummary"></span></h4>'
      + '<div class="prw"><span class="prt">Выполненные обещания этой недели<small>клиент назвал дату и оплатил в срок</small></span><b>'
      + done.count + ' из ' + (done.count + missed.count) + '</b><span class="prs">' + fmt(done.sum) + ' ₽ из ' + fmt(done.sum + missed.sum)
       + ' ₽</span>' + (waiting.count ? '<span>ещё ждём: ' + waiting.count + '</span>' : '')
      + (missed.count && promises.late_promises ? '<span class="prf">Не выполнили: ' + promises.late_promises.map(function (r) { return E(r[0]) + " (" + E(r[1]) + ")"; }).join(", ") + '</span>' : '') + '</div>'
      + '<div class="lg4"><div><span class="sa4 dg">Договор подписан</span><p><b>Предоплата.</b> Оплата в течение 5 р.д. с подписания договора.</p></div>'
      + '<div><span class="sa4 ac">Акт подписан</span><p><b>Постоплата.</b> Оплата в течение 5 р.д. с подписания акта.</p></div>'
      + '<div><span class="sa4 au">Акт подписан авто</span><p><b>Акт не подписали 5 р.д.</b> Считается подписанным, дальше срок оплаты по договору.</p></div>'
      + '<div><span class="sa4 sc">Счёт отправлен</span><p><b>Доплата без акта.</b> Срок оплаты с отправки счёта.</p></div></div>'
      + '<div class="sr-table-window" tabindex="0" role="region" aria-label="Долги, таблица"><div class="sr-debt-grid">'
      + '<div class="i cap r6"><span>Заказчик</span><span>Тип</span><span>Сумма</span><span class="debt-heading">Без оплаты<small>срок по договору</small></span><span>Почему не платят</span><span class="debt-heading">Посл. контакт<small>обещал оплатить</small></span><span class="debt-heading">Прошлый шаг<small>и его итог</small></span><span>Претензия</span><span>Следующий шаг</span><span>Дата след. контакта</span></div>'
      + '<div id="srdebtRows">' + rows.map(function (r, i) { return debtRow(r, i, r.__pre); }).join("")
      + manual.map(function (key) { return manualDebtRow(key, manualDebt(key)); }).join("") + "</div>"
      + '<div id="srdebtEmpty" class="sr-empty"' + (rows.length || manual.length ? " hidden" : "") + ">Долгов нет</div>"
      + (RO || !s4.manual_debts ? "" : '<div class="debt-add"><button class="add" type="button" data-add4>+ Добавить долг</button></div>')
      + '<div class="i tt r6"><span>Итого</span><span></span><b id="srdebtTotal">' + fmt(tot) + '</b><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div></div></div>'
      + '<div class="rsum" id="srrsum4"></div><input class="dcm" data-ak="s4:note" type="text" placeholder="Комментарий (необязательно)" aria-label="Комментарий к вопросу 4" value="' + E(s4.comment || "") + '"' + dis() + ">";
    var chips = '<span class="r"><strong id="srdebtCount">' + rows.length + '</strong> строк</span><span class="r"><strong id="srdebtSum">' + fmt(tot) + '</strong></span><span class="r">самый долгий <strong id="srdebtDays">' + longest + "</strong> раб. дней</span>";
    return qa(4, "srb4", "Просроченные оплаты", chips, body, { sub: cmp });
  }
  function sum4() {
    var heading = document.getElementById("srDebtHeading");
    if (heading) heading.textContent = "Просроченные оплаты · " + document.querySelectorAll("#srdebtRows .drow").length;
    var el = document.getElementById("srrsum4"); if (!el) return;
    var rows = document.querySelectorAll(".sr #srb4 .drow"), t = Object.create(null);
    var sum = 0, longest = 0, pre = 0, debt = 0;
    rows.forEach(function (r, i) {
      var k = r.dataset.rsn || "", amount = +r.dataset.sum || 0;
      t[k] = t[k] || [0, 0];
      t[k][0] += amount;
      t[k][1]++;
      sum += amount;
      longest = Math.max(longest, +r.dataset.days || 0);
      if (r.dataset.type === "pre") pre++;
      if (r.dataset.type === "debt") debt++;
      r.querySelector(".n4").textContent = i + 1;
    });
    document.getElementById("srdebtEmpty").hidden = rows.length > 0;
    document.getElementById("srdebtCount").textContent = rows.length;
    document.getElementById("srdebtTotal").textContent = fmt(sum);
    document.getElementById("srdebtSum").textContent = fmt(sum);
    document.getElementById("srdebtDays").textContent = longest;
    document.getElementById("srdebtSummary").textContent = debt + " " + pld(debt) + " + " + pre + " " + plpr(pre) + " · " + fmt(sum) + " ₽";
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
  var CP1 = '<div class="gr cap cols1"><span>Заказчик</span><span>Сумма</span><span>Тип</span><span data-tip="Берётся из CRM автоматически: дата подписания договора или акта, а если акт отправлен и ещё не подписан, то дата отправки акта. Основание и дату можно уточнить в отчёте или карточке КП.">Дата отсчёта <i class="inf">ⓘ</i></span><span data-tip="Срок оплаты по договору, в рабочих днях.">Срок оплаты <i class="inf">ⓘ</i></span><span data-tip="Назвал дату: клиент подтвердил оплату на следующей неделе. Срок по договору: наступает на следующей неделе.">Основание <i class="inf">ⓘ</i></span><span>След. контакт</span></div>';
  var CP2 = '<div class="gr cap cols2"><span>Заказчик</span><span>Сумма</span><span data-tip="Правило: после отправки КП менеджер перезванивает клиенту через 3 р.д. Срок звонка считается автоматически.">КП отправлено <i class="inf">ⓘ</i></span><span>Выставлю счёт</span><span>Что делаю, чтобы оплатили</span><span>Вероятность</span><span>След. контакт</span></div>';
  function readBasis(raw) {
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }
  function basisCell(r) {
    var kp = r.kp || 0, basis = readBasis(KV[kp + "|pay_basis"]), edit = "";
    if (kp && !RO) edit = '<div class="sr-basis-actions"><button class="sr-mock-btn" type="button" data-sr-basis="' + kp
      + '">Изменить</button><button class="sr-mock-btn" type="button" data-sr-card="' + kp + '">Карточка КП</button></div>';
    return '<span class="bs">' + paymentEvent(basis.event || r.ev, basis.date || r.base)
      + (r.base ? '<span class="sr-basis-read">' + (basis.date ? "Уточнено вручную" : "Из карточки КП") + '</span>' : "") + edit + '</span>';
  }
  function g1Row(r) {
    var pre = r.type === "pre", kp = r.kp || 0;
    var dt = kp ? dateField(dmyIso(KV[kp + "|next_contact"]), 'data-akp="' + kp + '|next_contact"')
      : dateField(dmyIso(AV["s7:o" + r.oid + ":next"]), 'data-ak="s7:o' + r.oid + ':next"');
    var expect = kp ? KV[kp + "|pay_expect"] : AV["s7:o" + r.oid + ":expect"], basis = readBasis(KV[kp + "|pay_basis"]);
    var base = basis.date || r.base, event = basis.event || r.ev;
    return '<div class="gr cols1" data-t="' + E(r.type) + '" data-sum="' + num(r.amt) + '" data-nm="' + E(r.cells[2])
      + '" data-d="' + E(dmyIso(base)) + '" data-s="' + (event === "Акт отправлен" ? "o" : "s") + '" data-lim="' + (r.lim || "") + '" data-expect="' + E(expect) + '">'
      + "<b>" + E(r.cells[2]) + '</b><b class="amt">' + fmt(num(r.amt)) + '</b><span class="tp ' + E(r.type) + '">' + (pre ? "предоплата" : "постоплата") + "</span>"
      + basisCell(r) + '<span class="due"></span><span class="fc5"></span>' + dt + "</div>";
  }
  function openKpEditor(button, card) {
    var report = R;
    var id = +(card ? button.dataset.srCard : button.dataset.srBasis);
    var request = card ? window.DS.reportKp(id) : Promise.resolve(null);
    request.then(function (data) {
      if (report !== R || !button.isConnected) return;
      var kp = data && data.kp;
      var row = (item("s7").rows || []).find(function (r) { return r.kp === id && r.g === "k1"; });
      showKpEditor(button, id, kp, data && data.systems, row);
    }).catch(function (error) { status(error.message || "Не удалось открыть КП"); });
  }
  function showKpEditor(button, id, kp, systems, row) {
    var savedBasis = readBasis(kp ? kp.pay_basis : KV[id + "|pay_basis"]);
    var scope = row ? row.type : kp && ["В работе", "В постоплате", "Закрыто"].includes(kp.status) ? "post" : "pre";
    if (savedBasis.scope && savedBasis.scope !== scope) savedBasis = {};
    var events = scope === "pre" ? [BASIS_EVENTS[0], BASIS_EVENTS[4]] : BASIS_EVENTS.slice(1);
    var current = {event: savedBasis.event || (row && row.ev), date: savedBasis.date || (row && row.base)};
    var customer = kp ? kp.customer : row && row.cells[2];
    var codeList = String(kp && kp.systems || "").split("|").filter(Boolean);
    systems = Array.from(new Set((systems || []).concat(codeList)));
    var sale = kp ? (KV[id + "|sale_prob"] === undefined ? kp.sale_prob || "" : KV[id + "|sale_prob"]) : "";
    var canBasis = !kp || Boolean(row || savedBasis.date);
    var dialog = document.createElement("dialog");
    dialog.className = "sr-basis-dialog";
    dialog.innerHTML = '<form><header><h2>' + (kp ? "Карточка КП" : "Основание оплаты") + '</h2><p>' + E(customer)
      + '</p></header><div class="sr-basis-body">'
      + (kp ? '<label>Заказчик<input name="customer" required maxlength="500" value="'+E(kp.customer || "")+'"></label>'
        + '<label>Сумма КП, ₽<input type="number" name="amount" min="0" step="0.01" required value="'+E(String(kp.amount))+'"></label>'
        + '<label>Аванс по КП, ₽<input type="number" name="advance" min="0" step="0.01" required value="'+E(String(kp.adv_sum))+'"></label>'
        + '<label>Вероятность продажи<select name="prob">' + [["", "Выбрать"], ["low", "Низкая"], ["mid", "Средняя"], ["high", "Высокая"]].map(function (v) {
        return '<option value="' + v[0] + '"' + (v[0] === sale ? " selected" : "") + '>' + v[1] + '</option>';
      }).join("") + '</select></label><fieldset><legend>Вид работ</legend>' + systems.map(function (code) {
        return '<label><input type="checkbox" name="systems" value="' + E(code) + '"' + (codeList.includes(code) ? " checked" : "") + '>' + E(code) + '</label>';
      }).join("") + '</fieldset>' : "")
      + (canBasis ? '<label>Дата отсчёта<select name="event" required>' + selOpts(current.event, events, "Выбрать")
        + '</select></label><label>Дата события<input type="date" name="date" required value="' + E(current.date) + '"></label>' : "")
      + '<span role="alert"></span></div><footer><button type="button" class="sr-mock-btn" data-cancel>Отмена</button>'
      + (!kp && savedBasis.date ? '<button type="button" class="sr-mock-btn" data-reset>Из CRM</button>' : '')
      + '<button type="submit" class="sr-mock-btn">Сохранить</button></footer></form>';
    var form = dialog.querySelector("form");
    function persist(body) {
      if (RO || (R.cutoff && Date.now() >= R.cutoff * 1000)) {
        dialog.querySelector("[role=alert]").textContent = "Неделя закрыта. Обновите отчёт.";
        return;
      }
      var buttons = dialog.querySelectorAll("button");
      buttons.forEach(function (b) { b.disabled = true; });
      var saving = kp ? (async function () {
        if (Object.prototype.hasOwnProperty.call(body, "customer_text")) {
          var customers = await MPBC.call("/../ds/customers");
          var matches = customers.filter(function (c) { return c.name === body.customer_text; });
          if (matches.length > 1) throw new Error("Найдено несколько заказчиков с таким именем.");
          body.customer_id = matches.length ? matches[0].id : 0;
        }
        await MPBC.call("/../ds/kp/" + id + "/edit", {body:body});
        return true;
      })().catch(function () { return false; })
        : saveKp(id, "pay_basis", body.pay_basis);
      saving.then(function (saved) {
        if (!saved) {
          dialog.querySelector("[role=alert]").textContent = "Сохранение не подтверждено. Повторите попытку.";
          buttons.forEach(function (b) { b.disabled = false; });
          return;
        }
        dialog.close();
        var reportRoot = button.closest("#report-app") || button.closest(".sr");
        var refresh = (reportRoot && reportRoot.querySelector("[data-rpref]")) || document.querySelector("[data-rpref]");
        if (refresh) refresh.click();
      });
    }
    form.onsubmit = function (e) {
      e.preventDefault();
      var values = new FormData(form), body = {};
      if (kp) {
        var customerName = values.get("customer").trim();
        var amount = Number(values.get("amount")), advance = Number(values.get("advance"));
        if (!customerName || advance > amount) {
          dialog.querySelector("[role=alert]").textContent = "Укажите заказчика и аванс в пределах суммы КП.";
          return;
        }
        if (customerName !== (kp.customer || "")) { body.customer_text = customerName; body.customer_id = 0; }
        if (amount !== Number(kp.amount)) body.amount = amount;
        if (advance !== Number(kp.adv_sum)) body.adv_sum = advance;
        if (values.get("prob") !== sale) body.sale_prob = values.get("prob");
        var selected = values.getAll("systems");
        if (selected.length !== codeList.length || selected.some(code => !codeList.includes(code))) body.systems = selected;
      }
      if (canBasis && (!kp || values.get("event") !== current.event || values.get("date") !== current.date)) {
        body.pay_basis = JSON.stringify({event: values.get("event"), date: values.get("date")});
      }
      persist(body);
    };
    dialog.querySelector("[data-cancel]").onclick = function () { dialog.close(); };
    var reset = dialog.querySelector("[data-reset]");
    if (reset) reset.onclick = function () { persist({pay_basis: ""}); };
    dialog.addEventListener("close", function () { dialog.remove(); button.focus(); });
    button.closest(".sr").appendChild(dialog);
    dialog.showModal();
  }
  function kp5cell(kpId, dmy) { return '<span class="kpd"' + (kpId ? ' data-kp="' + kpId + '"' : "") + ' data-v="' + E(dmy || "") + '"></span>'; }
  function g2Row(r) {
    var kpId = r.kp;
    return '<div class="gr cols2" data-fix="1" data-sum="' + num(r.amt) + '"><b>' + E(r.cells[2]) + '</b><b class="amt">' + fmt(num(r.amt)) + "</b>"
      + kp5cell(kpId, dmyIso(drafts.writes["kp|" + kpId + "|issued_date"] && !RO ? KV[kpId + "|issued_date"] : r.issued))
      + dateField(dmyIso(KV[kpId + "|invoice_planned_on"]), 'data-akp="' + kpId + '|invoice_planned_on"')
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
    return '<div class="grp ' + k + '" id="srgp' + k.slice(1) + '"><h5><span>' + t + ' <small>· <span class="cn5">0</span></small><span class="kpc"></span></span><span class="sm5">0 ₽</span></h5><div class="sr-table-window" tabindex="0" role="region" aria-label="' + E(t) + '"><div class="sr-plan-grid">' + cap + rows
      + (add && !RO ? '<div class="gr" style="border-top:1px solid rgba(0,0,0,.07)"><button class="add" type="button" data-add="' + add + '">+ Добавить клиента</button></div>' : "") + "</div></div></div>";
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
    var body = '<div class="tot5"><div class="a">Клиент назвал дату<b id="srt51">0</b><i class="mini">счета с датой оплаты от клиента на следующей неделе</i><i class="thr" id="srt5h"></i></div><div class="b">Возможно<b id="srt5v">0</b><i>наступает срок по договору или даты нет</i></div><div class="d">Максимум, если оплатят все<b id="srt54">0</b><i>все счета в плане, без КП</i></div><div class="c">Надеюсь<b id="srt52">0</b><i>КП без счёта, в прогноз не входит</i></div></div>'
      + '<div class="mv5" id="srmv5" hidden></div><div class="p5w">'
      + grp5("k1", "Счёт отправлен", CP1, g1.map(g1Row).join(""), 0)
      + grp5("k2", "С выставленным КП", CP2, g2.map(g2Row).join("") + CD.map(function (x, i) { return cuRow(i); }).join(""), 2)
      + "</div>"
      + '<p class="rl5">Срок оплаты считается автоматически в рабочих днях. <b>Предоплата:</b> с даты подписания договора. <b>Постоплата:</b> с даты подписания акта. Если акт ждёт подписи, срок оплаты отсчитывается после 5 р.д. с его отправки. CRM берёт срок оплаты из договора, по умолчанию 5 р.д. Для старых записей без даты подписания CRM использует доступную дату по КП. Просрочил срок: строка уходит в «Просроченные оплаты». Строки идут по срочности: сверху тот, у кого срок оплаты ближе, а при одинаковом сроке выше высокая вероятность. Для КП: перезвонить клиенту нужно через 3 р.д. после отправки, дальше статус «звонок просрочен», и такие КП идут первыми.</p>'
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
  function editKp(el, focus) {
    if (RO) return;
    el.innerHTML = dateField("", 'aria-label="Дата отправки КП"');
    var i = el.querySelector(".dtx"), draft = drafts.edits[editId(i)];
    i.value = draft ? draft.value : el.dataset.v || "";
    if (focus !== false) i.focus();
  }
  function validTextDate(input) {
    var iso = dmyToIso(input.value);
    if (!iso) {
      rememberEdit(input, "Укажите существующую дату в формате дд.мм.гг.");
      reportDrafts();
      return "";
    }
    forgetEdit(input);
    return iso;
  }
  function commitKp(el) {
    var inp = el.querySelector(".dtx");
    if (!inp) return;
    if (inp.value === (el.dataset.v || "")) { forgetEdit(inp); renderKp(el); reportDrafts(); return; }
    var iso = validTextDate(inp);
    if (!iso) return;
    el.dataset.v = dmyIso(iso);
    if (el.dataset.kp) saveKp(el.dataset.kp, "issued_date", iso);
    else if (el.dataset.cukp != null) cuSet(el.dataset.cukp + "|issued", iso);
    renderKp(el);
    reportDrafts();
    recalc5();
    sortG2(false);
  }
  function recalc5() {
    var TODAY = isoToD(R.as_of) || todayD(), start = isoToD(WEEK);
    var nextMonday = start ? addBD(start, 6) : null;
    var nextStart = isoToD(R.week_end);
    var from = R.cutoff && nextStart ? isoOf(nextStart) : nextMonday ? isoOf(nextMonday) : "";
    if (R.cutoff && nextStart) nextStart.setDate(nextStart.getDate() + 6);
    var to = R.cutoff && nextStart ? isoOf(nextStart) : nextMonday ? isoOf(addBD(nextMonday, 4)) : "";
    var mv = (item("s7").moved || []).slice(), ms = mv.reduce(function (total, r) { return total + r.sum; }, 0);
    var s1 = 0, c1 = 0, pt = 0, pv = 0;
    document.querySelectorAll(".sr #srgp1 .gr[data-t]").forEach(function (r) {
      var sum = +r.dataset.sum, pre = r.dataset.t === "pre", base = pdDmy(r.dataset.d), signed = pre || r.dataset.s === "s", lim = +r.dataset.lim || (signed ? 5 : 10), due = r.querySelector(".due"), st = "", h = "";
      if (!base) h = '<small class="stc n">укажите дату</small>';
      else {
        var n = bdN(base, TODAY), dd = addBD(base, lim);
        if (n > lim) { st = "m"; mv.push({ nm: r.dataset.nm, sum: sum, late: n - lim }); ms += sum; }
        else if (signed && n >= lim - 1) { st = "w"; h = "<b>до " + fdt(dd) + '</b><span class="stc w' + (n === lim ? " last" : "") + '">' + (n === lim ? "последний день" : "срок истекает") + "</span>"; }
        else if (!signed) { st = "u"; h = "<b>до " + fdt(dd) + '</b><span class="stc u">ждём подписи · ' + n + " из " + lim + " дн.</span>"; }
        else h = "<b>до " + fdt(dd) + '</b><span class="stc ok">осталось ' + (lim - n) + " р.д.</span>";
      }
      due.dataset.tip = pre ? "Предоплата: " + lim + " р.д. от даты отсчёта." : signed ? "Постоплата: " + lim + " р.д. с подписания акта." : "Акт отправлен: 5 р.д. на подпись и " + (lim - 5) + " р.д. на оплату.";
      due.innerHTML = h;
      r.style.display = st === "m" ? "none" : "";
      if (st !== "m") {
        s1 += sum; c1++;
        var expected = r.dataset.expect, dueIso = base ? isoOf(addBD(base, lim)) : "";
        var confirmed = expected && from <= expected && expected <= to;
        var contract = dueIso && from <= dueIso && dueIso <= to;
        var possible = !expected || contract;
        var forecast = r.querySelector(".fc5");
        forecast.className = "fc5 " + (confirmed ? "g" : contract ? "y" : "n");
        forecast.textContent = confirmed ? "Клиент назвал дату " + dmIso(expected)
          : contract ? "Срок по договору " + dmIso(dueIso) : "Даты на неделю нет";
        forecast.dataset.tip = expected ? "Дата со слов клиента из карточки КП" : "Клиент не назвал дату оплаты";
        if (confirmed) pt += sum;
        else if (possible) pv += sum;
      }
    });
    var g1el = document.getElementById("srgp1");
    if (g1el) { g1el.querySelector(".cn5").textContent = c1 + " " + plc(c1); g1el.querySelector(".sm5").textContent = fmt(s1) + " ₽"; }
    var t51 = document.getElementById("srt51"); if (t51) t51.textContent = fmt(pt);
    var th = document.getElementById("srt5h");
    if (th) { th.textContent = "Порог безубыточности " + fmt(THR5); th.className = "thr " + (pt >= THR5 ? "ok" : "below"); }
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
        mb.innerHTML = '<button type="button" class="mvt" aria-expanded="' + (MVO ? "true" : "false") + '" title="Перешли в «Просроченные оплаты»"><span class="mvg">' + mv.length + " " + (mv.length === 1 ? "перешёл" : "перешли") + ' в долги</span><span class="mvs">' + E(mn) + " · <b>" + fmt(ms) + " ₽</b> · в план не входят</span><span class=\"mva\">" + (MVO ? "скрыть ▴" : "показать ▾") + '</span></button><div class="mvb"' + (MVO ? "" : " hidden") + '><div class="mvh">Перешли в «Просроченные оплаты»</div><div class="mvr mvc"><span>Заказчик</span><span>Сумма</span><span>Просрочка</span></div>' + mv.map(function (x) { return '<div class="mvr"><span>' + E(x.nm) + "</span><b>" + fmt(x.sum) + " ₽</b><span>" + x.late + " р.д.</span></div>"; }).join("") + "</div>";
      } else mb.innerHTML = "";
    }
    var re5 = document.getElementById("srreal5"), re = re5 ? num(re5.value) : 0, od = 0;
    document.querySelectorAll(".sr #srgp2 .kpd").forEach(function (el) { var dd = pdDmy(el.dataset.v || ""); if (dd && TODAY.getTime() > addBD(dd, 3).getTime()) od++; });
    var kc = document.querySelector(".sr #srgp2 .kpc");
    if (kc) kc.innerHTML = od ? '<span class="kps r" style="margin-left:10px">звонок просрочен: ' + od + "</span>" : "";
    var ch = document.getElementById("srchips5");
    if (ch) ch.innerHTML = "<span><strong>" + (c1 + c2) + "</strong> " + plc(c1 + c2) + "</span><span>ждём <strong>" + fmt(s1) + "</strong></span>" + (od ? '<span class="r">КП без звонка <strong>' + od + "</strong></span>" : "") + (re ? "<span>реалистично <strong>" + fmt(re) + "</strong></span>" : "");
  }
  function sortG1(force) {
    var g = document.querySelector("#srgp1 .sr-plan-grid");
    if (!g) return;
    var ae = document.activeElement;
    if (!force && ae && ae.closest && ae.closest("#srgp1") && /^(INPUT|SELECT)$/.test(ae.tagName)) return;
    var rows = Array.prototype.slice.call(g.querySelectorAll(".gr[data-t]"));
    function key(r) {
      var base = pdDmy(r.dataset.d), pre = r.dataset.t === "pre", signed = pre || r.dataset.s === "s", lim = +r.dataset.lim || (signed ? 5 : 10), d = base ? addBD(base, lim).getTime() : 9e15;
      return [d, r.dataset.expect || "9999"];
    }
    var ks = rows.map(function (r, i) { return { r: r, i: i, k: key(r) }; });
    ks.sort(function (a, b) { return a.k[0] - b.k[0] || a.k[1].localeCompare(b.k[1]) || a.i - b.i; });
    if (ks.every(function (x, i) { return x.r === rows[i]; })) return;
    ks.forEach(function (x) { g.appendChild(x.r); });
  }
  function sortG2(force) {
    var g = document.querySelector("#srgp2 .sr-plan-grid");
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

  function sectionNav(privateBlock) {
    var names = ["Запросы", "Оплаты", "План прошлой недели", "Долги", "План оплат", "Оценка недели", "Что мешало", "Каналы связи", "Самочувствие"];
    if (!privateBlock) names.pop();
    return '<nav class="sr-jumps" aria-label="Разделы отчёта">' + names.map(function (label, i) {
      return '<button type="button" data-sr-jump="' + (i + 1) + '"><b>' + (i + 1) + "</b> " + E(label) + "</button>";
    }).join("") + "</nav>";
  }
  var debtLabels = ["Заказчик", "Тип", "Сумма, ₽", "Срок оплаты", "Почему не платят", "Контакт и обещание",
    "Прошлый шаг и итог", "Претензия", "Следующий шаг", "Дата следующего контакта"];
  var planLabels = ["Заказчик", "Сумма, ₽", "Тип", "Дата отсчёта", "Срок оплаты", "Вероятность", "Следующий контакт"];
  var quoteLabels = ["Заказчик", "Сумма, ₽", "Дата КП и срок звонка", "Выставлю счёт", "Что делаю", "Вероятность", "Следующий контакт"];
  function prepareRows(root) {
    if (!root) return;
    root.querySelectorAll("#srdebtRows .drow, .sr-plan-grid .gr:is(.cols1,.cols2):not(.cap)").forEach(function (row) {
      if (row.hasAttribute("data-sr-row")) return;
      row.setAttribute("data-sr-row", "");
      var isDebt = row.classList.contains("drow"), isPlan = row.classList.contains("cols1");
      var labels = isDebt ? debtLabels : isPlan ? planLabels : quoteLabels;
      var summary = [0, isDebt ? 2 : 1, isDebt ? 3 : isPlan ? 4 : 2];
      Array.from(row.children).forEach(function (cell, index) {
        var primary = summary.indexOf(index);
        cell.dataset.srLabel = labels[index] || "";
        if (primary < 0) cell.classList.add("sr-row-extra");
        else cell.classList.add("sr-row-primary", ["sr-row-customer", "sr-row-amount", "sr-row-due"][primary]);
      });
      var open = row.classList.contains("sr-row-open");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sr-row-toggle";
      button.setAttribute("data-sr-detail", "");
      button.setAttribute("aria-expanded", String(open));
      button.textContent = open ? "Свернуть детали" : "Показать детали";
      row.append(button);
    });
  }


  var TIPS = {"КП": "Новые КП за неделю, сколько продано и сколько отказов. В «Продано» КП считается один раз по первому поступлению предоплаты. Данные из реестра КП.", "Оплаты": "Все деньги, которые пришли за неделю, и сравнение с прошлой неделей. Данные из реестра оплат.", "Выполнение плана прошлой недели": "Сколько денег планировали получить на прошлой неделе и сколько пришло. Порог безубыточности 300 000 ₽ — ниже него компания работает в минус.", "Просроченные оплаты": "Долги: срок оплаты по договору прошёл, а денег нет. И просроченные предоплаты: договор подписан, денег нет. Данные из реестра оплат и реестра КП.", "План по оплатам на следующую неделю": "Какие деньги ждём на следующей неделе и насколько уверены. Выставленные счета — из реестра оплат, ожидаемые предоплаты — из реестра КП.", "Что в общении с заказчиками можно улучшить?": "Мнение Александра: что мешает в работе с клиентами и что поменять.", "Что отнимало больше всего времени на этой неделе?": "Задачи, которые можно делать быстрее или передать другому.", "Где ещё общались с заказчиками?": "Каналы вне CRM: мессенджеры, личная почта, встречи. Чтобы договорённости не терялись.", "Нагрузка и самочувствие": "Как прошла неделя по силам. Помогает вовремя заметить перегруз.", "КП, оплаты": "Что произошло за неделю: новые КП, продажи, отказы, поступления денег.", "Должники и риски": "Деньги, которые должны были прийти и не пришли.", "План на следующую неделю": "Какие деньги ждём и насколько уверены.", "Мнение": "Вопросы к Александру: что улучшить, что мешает, как самочувствие.", "Без оплаты": "Сколько рабочих дней прошло с даты договора, акта или счёта. На оплату даётся 5 р.д., всё сверху — просрочка.", "Вид работ": "Что делаем для заказчика: СПС, СОУЭ, АУП и т. д.", "Дата след. контакта": "Когда связаться с клиентом снова.", "Посл. контакт": "Когда последний раз говорили с клиентом. Ниже — до какой даты клиент обещал оплатить.", "Почему не платят": "Причина со слов клиента: ждёт согласования, нет денег и т. д.", "Претензия": "Отправлена ли претензия по шаблону и что с ней.", "Прошлый шаг": "Что сделали на прошлой неделе и чем закончилось. Зелёный — сделано, оранжевый — ждём клиента, красный — не сделали мы.", "Следующий шаг": "Что сделаем по этому долгу дальше.", "Тип": "Долг — остаток по договору не оплачен. Просрочена предоплата — договор подписан, а предоплаты нет.", "Тип оплаты": "Предоплата — первый платёж. Доплата — по счёту без акта. Постоплата — остаток после подписания акта.", "Причина отказа": "Причина из общего списка — тот же список, что в реестре КП.", "Смысл вернуться": "Стоит ли через время предложить снова.", "Что делаю": "Конкретное действие, если возвращаемся к клиенту.", "Когда вернусь": "Дата следующей попытки.", "Ваши предложения с прошлой недели": "Что Александр предлагал на прошлом созвоне и что с этим сейчас: сделано или в работе.", "Клиент назвал дату": "Счета, по которым клиент сам назвал дату оплаты на следующей неделе. Эти деньги закладываем в план.", "Возможно": "Счета, у которых на следующей неделе наступает срок по договору, или даты нет совсем. Могут прийти, но в план не закладываем.", "Максимум, если оплатят все": "Сумма всех выставленных счетов. Больше этого на неделе прийти не может.", "Надеюсь": "КП без выставленного счёта. Это надежда, а не план — в прогноз не входит.", "Ответ по отказам": "По каждому отказу: причина, стоит ли вернуться и когда."};
  function tipInit(root) {
    root.querySelectorAll(".qb .t>b,.cap span,.cap>b,.hd5>span,.tot5>div,.zh b,.lab,.lane h4>span:first-child").forEach(function (el) {
      var key = (el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.textContent : el.textContent).trim().replace(/\s*·\s*\d+$/, "");
      if (TIPS[key] && !el.dataset.tip) { el.dataset.tip = TIPS[key]; el.classList.add("hq"); }
    });
    if (document.getElementById("srtip5")) return;
    var tip = document.createElement("div");
    tip.id = "srtip5";
    root.appendChild(tip);
    function show(e) {
      var el = e.target.closest && e.target.closest(".sr [data-tip]");
      if (!el) { tip.style.display = "none"; return; }
      tip.textContent = el.dataset.tip;
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
      tip.style.top = (r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8) + "px";
    }
    root.addEventListener("mouseover", show);
    root.addEventListener("focusin", show);
    root.addEventListener("mouseleave", function () { tip.style.display = "none"; });
    root.addEventListener("focusout", function () { tip.style.display = "none"; });
    root.addEventListener("scroll", function () { tip.style.display = "none"; }, true);
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
    var body = '<div class="fin"><div class="priv stk"><div class="prow"><span class="pl2">' + LOCK + '</span><div><b>Закрытый блок.</b> Попробуйте ответить максимально честно, мы не осудим.</div></div><div class="vwho"><div class="vy"><b>Видят:</b> Яна, Дмитрий и автор отчёта</div><div class="vn"><b>Не видят:</b> коллеги, на общем экране не показывается. На общем созвоне мы не будем это обсуждать</div></div></div>'
      + '<div class="g2"><div class="col"><div><span class="lb2">Нагрузка <small>(нам важно знать, чтобы вовремя помочь)</small></span>' + chipsRow("s12:load", opts("s12:load"), false) + "</div>"
      + '<div class="grow"><span class="lb2">Окно, чтобы просто выговориться 😉</span><textarea class="ta" data-opt="1" data-ak="s12:vent" placeholder="Можно с юмором и эмоциями. Здесь можно всё, кроме оскорблений людей"' + dis() + ">" + E(AV["s12:vent"]) + "</textarea></div></div>"
      + "<div><span class=\"lb2\">Самочувствие <small>(можно несколько)</small></span>" + chipsRow("s12:wellbeing", opts("s12:wellbeing"), true) + "</div></div></div>";
    return qa(9, "srb12", "Нагрузка и самочувствие", "", body, { lock: true });
  }

  // --------------------------------------------------------------- подсветка незаполненного
  var OPTRE = /Необязательно|Комментар/i, pend = false;
  function isReq(el) {
    if (el.type === "hidden" || el.disabled) return false;
    if (el.matches(".dth,.ndt") || el.closest("[hidden]")) return false;
    if (el.closest("#srb4")) return el.classList.contains("rq");
    if (el.closest(".stw")) return false;
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
      g.classList.toggle("miss", !g.closest("[hidden]") && !!g.querySelector("button:not(:disabled)") && !g.querySelector(".on"));
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
      var retry = t.closest("[data-sr-retry]");
      if (retry && !RO) {
        if (retry.dataset.srRetry === "all") {
          var refs = commitDraftEdits(sr);
          Object.keys(drafts.writes).filter(function (key) {
            return !refs.has(key) && (key.indexOf("note|" + WEEK + "|") === 0 || key.indexOf("kp|") === 0);
          }).forEach(retryWrite);
        } else retryWrite(retry.dataset.srRetry);
        return;
      }
      var jump = t.closest("[data-sr-jump]");
      if (jump) {
        var target = sr.querySelector('.qa[data-q="' + jump.dataset.srJump + '"]');
        if (!target) return;
        target.classList.add("open");
        var heading = target.querySelector(".qb");
        heading.setAttribute("aria-expanded", "true");
        heading.focus({preventScroll: true});
        target.scrollIntoView({block: "start"});
        return;
      }
      var detail = t.closest("[data-sr-detail]");
      if (detail) {
        var open = detail.parentNode.classList.toggle("sr-row-open");
        detail.setAttribute("aria-expanded", String(open));
        detail.textContent = open ? "Свернуть детали" : "Показать детали";
        return;
      }
      later();
      var card = t.closest("[data-sr-card]");
      if (card && !RO && window.DS && window.DS.reportKp) { openKpEditor(card, true); return; }
      var basis = t.closest("[data-sr-basis]");
      if (basis && !RO) { openKpEditor(basis, false); return; }
      var promise = t.closest("[data-sr-promise]");
      if (promise && !RO) {
        var picker = promise.parentNode.querySelector(".prd");
        try { picker.showPicker(); } catch (e2) { picker.focus(); }
        return;
      }
      var qb = t.closest(".qb");
      if (qb) {
        qb.setAttribute("aria-expanded", String(qb.parentNode.classList.toggle("open")));
        return;
      }
      var ac = t.closest("[data-ac]"); if (ac) { ac.setAttribute("aria-expanded", String(ac.parentNode.classList.toggle("open"))); return; }
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
        prepareRows(sr);
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
      if (!RO && t.closest("[data-add4]")) {
        var key = "s4:m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        FILTER4 = null;
        document.getElementById("srdebtRows").insertAdjacentHTML("beforeend", manualDebtRow(key, {}));
        sum4();
        prepareRows(sr);
        document.querySelector('[data-manual="' + key + '"] input').focus();
        return;
      }
      var removeDebt = t.closest("[data-del4]");
      if (removeDebt && !RO) {
        var manual = removeDebt.closest("[data-manual]");
        saveNote(manual.dataset.manual, "");
        manual.remove();
        sum4();
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
    document.addEventListener("submit", function (e) {
      if (RO || !e.target.matches(".sr .sr-mpb")) return;
      e.preventDefault();
      var amount = e.target.elements.mpb.value;
      saveNote("s3:mpb", amount);
      var chart = document.getElementById("sr-weekly-chart"), data = chart.dataset;
      var registry = +data.registry, mpb = num(amount), plan = +data.plan, fact = registry + mpb;
      var percent = plan ? Math.round(fact * 100 / plan) : 0;
      chart.innerHTML = weeklyPayments(plan, +data.threshold, fact, percent, data.period, mpb);
      document.getElementById("sr-weekly-fact").textContent = fmt(fact);
      document.getElementById("sr-weekly-percent").textContent = plan ? percent + "%" : "—";
      document.getElementById("sr-mpb-source").textContent = "Реестр оплат: " + fmt(registry) + " ₽ · МПБ вручную: " + fmt(mpb) + " ₽";
    });
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
      if (t.type === "date" && !t.validity.valid) { rememberEdit(t, "Укажите существующую дату."); reportDrafts(); return; }
      if (!t.classList.contains("dtx")) forgetEdit(t);
      if (t.classList.contains("rsel")) t.title = t.value || t.getAttribute("aria-label");
      if (t.matches(".psel")) {
        var tone = {ok: "g", wait: "o", late: "r"}[DEBT_TONES[t.value]];
        t.closest(".ps4").className = "ps4 " + (tone ? "c-" + tone : "emp");
      }
      if (t.hasAttribute("data-debt-tone")) {
        if (t.closest(".sr-debt-select")) t.closest(".sr-debt-select").classList.toggle("c0", !t.value);
        t.dataset.debtTone = DEBT_TONES[t.value] || "";
        t.title = t.value || t.getAttribute("aria-label");
      }
      if (t.dataset.md) {
        var manual = t.closest("[data-manual]"), key = manual.dataset.manual, row = manualDebt(key);
        var field = t.dataset.md;
        row[field] = field === "sum" && t.value ? String(Math.max(0, Math.min(99999999999, Math.round(Number(t.value))))) : t.value;
        if (field === "past") delete row.result;
        if (row.type === "pre") {
          delete row.claim;
          if (row.step === "Претензия") delete row.step;
          if (row.past === "Претензия") { delete row.past; delete row.result; }
        }
        saveNote(key, JSON.stringify(row), t);
        if (["type", "base", "event", "contact", "past", "why"].includes(field)) {
          var expanded = manual.classList.contains("sr-row-open");
          manual.outerHTML = manualDebtRow(key, row);
          var replacement = document.querySelector('[data-manual="' + key + '"]');
          if (expanded) replacement.classList.add("sr-row-open");
          prepareRows(t.closest(".sr") || document.querySelector(".sr"));
          restoreEdits(replacement);
          reportDrafts();
        }
        else if (field === "sum") { manual.dataset.sum = row.sum; t.value = row.sum; }
        sum4();
        if (field === "why" && row.why === "Свой вариант") {
          document.querySelector('[data-manual="' + key + '"] [data-md="whytext"]').focus();
        }
        return;
      }
      if (t.classList.contains("dtx")) {
        if (t.closest(".kpd")) return;                          // дата отправки КП сохраняется на focusout (commitKp)
        var iso = validTextDate(t);
        if (!iso) return;
        if (t.dataset.akp) { var p0 = t.dataset.akp.split("|"); saveKp(p0[0], p0[1], iso); }
        else if (t.dataset.cu) { cuSet(t.dataset.cu, iso); recalc5(); }
        else if (t.dataset.ak) saveNote(t.dataset.ak, iso, t);
        return;
      }
      if (t.classList.contains("prd")) {
        var pill = t.parentNode.querySelector("[data-sr-promise]");
        pill.className = "prm sg4 pm4 " + (!t.value ? "emp" : t.value < isoOf(todayD()) ? "bad" : "ok");
        pill.querySelector(".sb4").textContent = dmIso(t.value) || "дата?";
      }
      if (t.dataset.akp != null) {
        if (t.classList.contains("sr-sale-prob")) {
          t.parentElement.dataset.tone = t.value || t.dataset.fallback;
          t.previousElementSibling.textContent = t.options[t.selectedIndex].textContent;
        }
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
        saveNote(t.dataset.ak, t.value, t);
        if (t.matches("[data-past4] select") && /:past$/.test(t.dataset.ak)) {
          var prefix = t.dataset.ak.slice(0, -4), isPre = prefix.startsWith("s4:");
          saveNote(prefix + "result", "");
          t.closest("[data-past4]").innerHTML = debtPast(
            function (f) { return 'data-ak="' + E(prefix + f) + '"'; },
            function (f) { return AV[prefix + f]; }, isPre);
        }
        if (t.classList.contains("tsel")) t.className = "tsel rq " + ({ "Предоплата": "pre", "Доплата": "add", "Постоплата": "post" }[t.value] || "");
        if (t.classList.contains("rsel")) {
          t.parentNode.className = "rsn " + (RC4[t.value] || "c0");
          var other = t.closest(".debt-fields").querySelector(".debt-other");
          other.hidden = t.value !== "Свой вариант";
          if (!other.hidden) other.querySelector("input").focus();
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
      if (!RO && t.matches("input,textarea")) {
        var old = drafts.edits[editId(t)];
        rememberEdit(t);
        if ((!old && editId(t)) || (old && old.error)) reportDrafts();
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
      var t = e.target;
      if (e.key === "Escape" && t.closest && t.closest(".sr .kpd") && t.classList.contains("dtx")) {
        var cell = t.closest(".kpd");
        forgetEdit(t);
        renderKp(cell);
        reportDrafts();
        cell.querySelector(".dt5").focus();
        return;
      }
      if (e.key !== "Enter") return;
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
      if (r.last_bd == null) r.last_bd = -1;
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
    html: function (report, ro) {
      R = report; RO = !!ro; WEEK = report.week_start; FILTER4 = null; MVO = false;
      openDrafts();
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
      Object.assign(AV, item("s4").manual_debts || {});
      if (!RO) applyWrites();
      CD = list(AV["s7:custom"]);
      compat();
      PL = item("s14").prev_list || [];
      var body = zone("--zb:#c3d3c6;--zbg:#f4f7f4;--zh:#e1eae3;--zt:#2e4636;--zc:#5f7f69", "КП, оплаты", block1() + block2() + block3())
        + zone("--zb:#dfc9c2;--zbg:#f9f5f3;--zh:#efe2dd;--zt:#5a3329;--zc:#a0675a", "Должники и риски", block4())
        + zone("--zb:#c4cfdc;--zbg:#f4f6f9;--zh:#e2e8ef;--zt:#2a3d53;--zc:#5a7391", "План на следующую неделю", block5())
        + zone("--zb:#d9d0bf;--zbg:#f8f6f2;--zh:#ece6db;--zt:#4a4030;--zc:#8c7a5b", "Мнение", loopBlock() + block6() + block7() + block8() + block9());
      var closeTime = report.cutoff ? new Date(report.cutoff * 1000).toLocaleTimeString("ru-RU", {timeZone:"Europe/Moscow", hour:"2-digit", minute:"2-digit"}) : "";
      var period = dmyIso(report.week_start) + (report.cutoff ? " " + (report.start_time || closeTime) : "") + " — " + dmyIso(report.week_end)
        + (report.cutoff ? " " + closeTime + " МСК" : "");
      var head = '<div class="sr-head"><h1>' + E(report.person || report.title)
        + ' <span>(менеджер отдела продаж)</span></h1><span class="sr-period">Неделя <b>' + E(period) + '</b></span></div>'
        + '<div class="sr-save-line"><span class="sr-save-status" id="srStatus" role="status">' + (report.closed ? "Неделя закрыта · сохранённый отчёт" : report.closed_missing ? "Неделя закрыта · архивный снимок недоступен"
        : RO ? "Только чтение" : "Изменения сохраняются автоматически") + '</span><button type="button" data-sr-retry="all" id="srRetryAll" hidden>Повторить сохранение</button></div>'
        + sectionNav(Boolean((item("s12").inputs || []).length));
      bindEvents();
      setTimeout(function () {
        var root = document.querySelector(".sr");
        if (!root) return;
        document.querySelectorAll(".sr .kpd").forEach(renderKp);
        wrapC();
        recalc5();
        sum4();
        tipInit(root);
        refCState();
        sortG1(true);
        sortG2(true);
        prepareRows(root);
        if (!RO) { restoreEdits(root); recalc5(); reportDrafts(); }
        mark();
      }, 0);
      return '<div class="sr">' + head + body + "</div>";
    }
  };
  bindEvents();
})();
