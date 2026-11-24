/* Проекты DS — «Пятничный созвон» и недельные отчёты (вынесено из ds.js 19.11, коммит модульности).
   Контекст ядра — DS._ctx (ds.js подключается раньше в index.html). */
(function () {
  "use strict";
  var X = window.DS._ctx;
  var S = X.S, E = X.E, dmy = X.dmy, pos = X.pos, ava = X.ava, toast = X.toast, isoDay = X.isoDay, monday = X.monday, api = X.api, paint = X.paint;
  /* ---------- недельные отчёты ---------- */
  function downloadText(name, text, mime) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + text], { type: (mime || "text/plain") + ";charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function rpLeads(p) { return p === "owner" || p === "sales" || p === "ops" || p === "design"; }      /* руководители видят отчёты всех отделов (17.11, п.10) */
  function loadReport() {
    if (!S.rp) S.rp = { kind: reportKind(), start: isoDay(monday()), data: null };
    if (!rpLeads(pos())) S.rp.kind = reportKind();
    return api("/reports/" + S.rp.kind + "?start=" + S.rp.start).then(function (d) { S.rp.data = d; S.err = ""; }, function (e) { S.rp.data = null; S.err = String(e); });
  }
  /* ---------- пятничный созвон: отчёты отделов по вопросам таблицы «Созвоны» ---------- */
  var RP_KINDS = [["sales", "Продажи"], ["ops", "Проекты"], ["design", "Проектирование"]];
  var RP_MODE = { auto: ["a", "● Авто"], semi: ["s", "◐ Авто + комментарий"], manual: ["m", "✎ Вручную"] };
  var RP_TAG = { a: "background:var(--ok-soft);color:var(--ok)", s: "background:var(--warn-soft);color:var(--warn)", m: "background:#f0e9fa;color:#7A4FB5" };
  function rpTag(mode) { var m = RP_MODE[mode] || RP_MODE.manual; return '<span class="pill" style="' + RP_TAG[m[0]] + ';white-space:nowrap;flex:none">' + m[1] + "</span>"; }
  function rpCell(v) { return v && typeof v === "object" ? '<span class="pill ' + E(v.tone || "info") + '">' + E(v.t) + "</span>" : E(v == null ? "" : v); }
  function rpInput(i, ro) {
    var dis = ro ? " disabled" : "", st = 'style="width:100%;min-width:120px;border:1px solid var(--line);border-radius:9px;padding:6px 9px;background:var(--surface);color:var(--ink);font:inherit"';
    if (i.kind === "area") return '<textarea rows="2" data-rpk="' + E(i.key) + '" ' + st + ' placeholder="' + E(i.ph || "Ответ") + '"' + dis + ">" + E(i.v || "") + "</textarea>";
    if (i.sv && !i.v && i.kind === "text") return '<input data-rpk="' + E(i.key) + '" value="' + E(i.sv) + '" ' + st + dis + ' title="Заполнила CRM — можно поправить">';      // предложение CRM вписано сразу
    if (i.kind === "select") return '<select data-rpk="' + E(i.key) + '" ' + st + dis + ">" + i.options.map(function (o) { return '<option value="' + E(o) + '"' + (o === i.v ? " selected" : "") + ">" + E(o || "— причина —") + "</option>"; }).join("") + "</select>";
    if (i.kind === "chips") return '<div style="display:flex;gap:4px;flex-wrap:wrap">' + i.options.map(function (o) { return '<button type="button" class="btn sm ' + (o === i.v ? "primary" : "ghost") + '" data-rpchip="' + E(i.key) + "|" + E(o) + '"' + dis + ">" + E(o) + "</button>"; }).join("") + "</div>";
    if (i.kind === "kp") return '<select data-rpkp="' + i.kp + "|" + i.field + '" ' + st + dis + ">" + i.options.map(function (o) { return '<option value="' + E(o[0]) + '"' + (o[0] === (i.v || "") ? " selected" : "") + ">" + E(o[1]) + "</option>"; }).join("") + "</select>";
    if (i.kind === "kptext") return '<input data-rpkp="' + i.kp + "|" + i.field + '" value="' + E(i.v || "") + '" ' + st + ' placeholder="' + E(i.ph || "") + '"' + dis + ">";
    if (i.kind === "kpdate") return '<input type="date" data-rpkp="' + i.kp + "|" + i.field + '" value="' + E(i.v || "") + '" ' + st + dis + ">";
    return '<input data-rpk="' + E(i.key) + '" value="' + E(i.v || "") + '" ' + st + ' placeholder="' + E(i.ph || "") + '"' + (i.kind === "num" ? ' inputmode="numeric"' : "") + dis + ">";
  }
  /* ячейка строки: номер задачи — ссылка на её карточку (у всех отделов) */
  function rpLink(c, r) {
    var s = rpCell(c);
    if (!r.oid || typeof c !== "string") return s;
    var a = '<a href="#/task/' + r.oid + '" title="Открыть карточку задачи">', n = "№" + E(r.onum);
    if (c.trim() === r.onum) return a + n + "</a>";
    return s.replace(n, a + n + "</a>");
  }
  /* строки вопроса таблицей: № по порядку, «Всего», у плана оплат — × «убрать из плана на эту неделю» */
  function rpTable(it, ro, cls) {
    if (!it.cols.length) return "";
    rpxCss();
    var hid = it.hidden || [];
    var more = hid.length ? '<div class="rphid">Убрано из плана: ' + hid.length + " (" + hid.map(function (h) { return E(h[1]); }).join(", ") + ")"
      + (ro ? "" : ' · <button type="button" data-rpunhide="' + E(it.id) + '">вернуть все</button>') + "</div>" : "";
    if (!it.rows.length) return '<div class="note">' + E(it.empty || "Нет данных") + "</div>" + more;
    var x = !ro && it.rows.some(function (r) { return r.hide_key; });
    var al = it.cols.map(function (c, k) { return rpAl(it.rows[0].cells[k], it.rows[0].inputs && it.rows[0].inputs[k - it.rows[0].cells.length]); });
    return (cls === "tbl" ? '<div class="rpcnt">Всего: ' + it.rows.length + "</div>" : "") + '<div style="overflow:auto"><table class="' + cls + '"><thead><tr><th class="rpno">№</th>'
      + it.cols.map(function (c, k) { return '<th class="' + al[k] + '">' + E(c) + "</th>"; }).join("") + (x ? '<th class="rpno"></th>' : "") + "</tr></thead><tbody>"
      + it.rows.map(function (r, n) {
        return '<tr><td class="rpno">' + (n + 1) + "</td>" + r.cells.map(function (c, k) { return '<td class="' + al[k] + '">' + rpLink(c, r) + "</td>"; }).join("")
          + (r.inputs || []).map(function (i, k) { return '<td class="' + al[r.cells.length + k] + '">' + rpInput(i, ro) + "</td>"; }).join("")
          + (x ? '<td class="rpno">' + (r.hide_key ? '<button type="button" class="rpx-x" data-rphide="' + E(r.hide_key) + '" title="Убрать из плана на эту неделю">×</button>' : "") + "</td>" : "") + "</tr>";
      }).join("") + "</tbody></table></div>" + more;
  }
  /* выравнивание столбца по первой строке: плашки, даты, № — по центру; суммы — справа; комментарий — широкая графа */
  function rpAl(c, inp) {
    if (inp) return inp.kind === "text" || inp.kind === "kptext" || inp.kind === "area" ? "rpin" : "c";
    if (c && typeof c === "object") return "c";
    var t = String(c == null ? "" : c).trim();
    if (/^(\d{2}\.\d{2}(\.\d{2,4})?|—|[\w-]{1,6})$/.test(t)) return "c";
    if (/^\d[\d\s]*(₽)?$/.test(t)) return "r";
    return "";
  }
  function rpDone(it) {
    if (it.mode === "auto" || it.auto_text) return true;
    var rowsOk = it.rows.every(function (r) { return !(r.inputs || []).length || r.inputs.some(function (i) { return i.v; }); });
    var req = it.inputs.filter(function (i) { return i.req; });
    var qOk = !it.inputs.length || (req.length ? req.every(function (i) { return i.v; }) : it.inputs.some(function (i) { return i.v; }));
    return it.mode === "manual" ? qOk : rowsOk && qOk;
  }
  function rpItem(it, ro) {
    var body = "";
    if (it.hint) body += '<div style="color:var(--muted);font-size:.8rem;margin:-2px 0 8px">' + E(it.hint) + "</div>";
    if (it.kv.length) body += '<div style="display:flex;gap:22px;flex-wrap:wrap;margin-bottom:10px">' + it.kv.map(function (x) { return '<div style="font-size:.82rem;color:var(--muted)">' + E(x[0]) + '<b style="display:block;font-size:1.12rem;color:var(--ink)">' + E(x[1]) + "</b></div>"; }).join("") + "</div>";
    body += rpTable(it, ro, "tbl");
    if (it.total) body += '<div style="display:flex;justify-content:space-between;font-weight:700;padding-top:8px"><span>Итого</span><span>' + E(it.total) + "</span></div>";
    if (it.note) body += '<div class="note" style="margin-top:8px">' + E(it.note) + "</div>";
    if (it.auto_text) {
      body += '<div style="white-space:pre-wrap;line-height:1.45;padding:8px 10px;border-radius:10px;background:var(--brand-soft)"><small style="display:block;color:var(--brand);font-weight:700;margin-bottom:3px">Заполнила CRM</small>' + E(it.auto_text) + "</div>"
        + '<div class="fld" style="margin-top:8px"><label>Комментарий — по необходимости</label>' + rpInput(Object.assign({}, it.inputs[0], { ph: "Комментарий" }), ro) + "</div>";
    } else body += it.inputs.map(function (i) { return '<div class="fld" style="margin-top:8px">' + (i.label ? "<label>" + E(i.label) + "</label>" : "") + rpInput(i, ro) + "</div>"; }).join("");
    if (it.comment_key && !it.auto_text) body += '<div class="fld" style="margin-top:8px"><label>Комментарий — по необходимости</label><textarea rows="2" data-rpc="' + E(it.id) + '" style="width:100%;border:1px solid var(--line);border-radius:9px;padding:6px 9px;background:var(--surface);color:var(--ink);font:inherit" placeholder="Комментарий"' + (ro ? " disabled" : "") + ">" + E(it.comment || "") + "</textarea></div>";
    if (it.src) body += '<div style="font-size:.74rem;color:var(--muted);margin-top:8px">⛁ ' + E(it.src) + "</div>";
    return '<div class="panel pad" style="margin-bottom:12px"><div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px"><span style="flex:none;width:26px;height:26px;border-radius:8px;background:var(--surface-2);display:grid;place-items:center;font-weight:700;font-size:.8rem;color:var(--muted)">' + it.n + '</span><b style="flex:1;line-height:1.35">' + E(it.q) + "</b>" + rpTag(it.auto_text ? "semi" : it.mode) + "</div>"
      + '<div style="padding-left:36px">' + body + "</div></div>";
  }
  function reportKind() { var p = pos(); return p === "ops" ? "ops" : p === "design" ? "design" : (p === "owner" ? (S.rp && S.rp.kind) || "sales" : "sales"); }
  function rpFind(key) { var f = null; ((S.rp && S.rp.data && S.rp.data.items) || []).forEach(function (it) { it.inputs.concat.apply(it.inputs, it.rows.map(function (r) { return r.inputs || []; })).forEach(function (i) { if (i.key === key) f = i; }); }); return f; }
  function rpSave(key, text) {
    var i = rpFind(key); if (i) i.v = text;
    return api("/reports/" + S.rp.kind + "/answer", { start: S.rp.start, key: key, text: text }).catch(function (er) { toast(String(er)); });
  }
  function rpCsv(r) {
    var q = function (v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return "﻿" + [["Пятничный созвон: " + r.title + (r.person ? " (" + r.person + ")" : ""), dmy(r.week_start) + " — " + dmy(r.week_end), ""], ["№", "Вопрос", "Ответ"]].concat(r.items.map(function (it) { return [it.n, it.q, rpAns(it) || "—"]; })).map(function (row) { return row.map(q).join(";"); }).join("\r\n");
  }
  /* вид «как в Excel» (как была таблица «Созвоны»): строка на вопрос, ячейка «Ответ» правится целиком.
     Ответ на ручной вопрос — это сам ответ (тот же, что в карточке); ответ, собранный CRM, можно переписать — он сохранится отдельно
     ({вопрос}:all) и заменит собранный в отчёте и выгрузке, «↺ как у CRM» возвращает собранный. */
  var RPX_CSS = ".ds .rpx{overflow:auto;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:14px;box-shadow:var(--shadow-s,none)}"
    + ".ds .rpx table{border-collapse:collapse;width:100%;min-width:560px;table-layout:fixed}.ds .rpx th,.ds .rpx td{border:1px solid var(--line);vertical-align:top;padding:0}"
    + ".ds .rpx tr>*:first-child{border-left:0}.ds .rpx tr>*:last-child{border-right:0}.ds .rpx thead th{border-top:0}"
    + ".ds .rpx thead th{background:var(--surface-2);color:var(--muted);font-weight:600;font-size:.7rem;letter-spacing:.06em;text-align:center;height:24px;position:sticky;top:0;z-index:1}"
    + ".ds .rpx .rn{background:var(--surface-2);color:var(--muted);text-align:center;font-size:.72rem;width:38px;padding:7px 0}.ds .rpx .ttl td.c{background:var(--brand-soft);color:var(--brand);font-weight:700;font-size:1rem}"
    + ".ds .rpx .hd td.c{background:var(--surface-2);font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}.ds .rpx td.c{padding:8px 10px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}.ds .rpx td.num{text-align:center;font-weight:700;color:var(--muted)}"
    + ".ds .rpx td.q{font-weight:600}.ds .rpx td.q small{display:block;color:var(--muted);font-weight:400;font-size:.76rem;margin-top:4px;white-space:normal}.ds .rpx td.a{padding:0;position:relative}.ds .rpx td.a.ed{background:var(--warn-soft)}"
    + ".ds .rpx textarea{display:block;width:100%;border:0;outline:0;resize:none;background:transparent;color:inherit;font:inherit;line-height:1.4;padding:8px 10px;margin:0;min-height:34px;overflow:hidden;box-shadow:none;border-radius:0}"
    + ".ds .rpx textarea:focus{box-shadow:inset 0 0 0 2px var(--brand);background:var(--surface)}.ds .rpx textarea[disabled]{color:inherit;-webkit-text-fill-color:var(--ink);opacity:1}"
    + ".ds .rpx .rpxm{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:0 10px 6px;font-size:.72rem;color:var(--warn)}.ds .rpx .rpxm button{border:0;background:none;color:var(--brand);font:inherit;font-weight:700;cursor:pointer;padding:0}"
    + ".ds .rpxc{border-top:1px dashed var(--line)}.ds .rpxc textarea{display:block;width:100%;border:0;outline:0;resize:none;background:transparent;color:inherit;font:inherit;font-size:.86rem;font-style:italic;line-height:1.4;padding:6px 10px;margin:0;min-height:30px;overflow:hidden;box-shadow:none;border-radius:0}"
    + ".ds .rpxc textarea:focus{box-shadow:inset 0 0 0 2px var(--brand);background:var(--surface);font-style:normal}.ds .rpxc textarea::placeholder{color:var(--muted)}"
    + ".ds .rpxs{margin:0 8px 8px;padding:8px 10px;border:1px dashed var(--brand);border-radius:10px;background:var(--brand-soft);font-size:.84rem}"
    + ".ds .rpxs b{display:block;color:var(--brand);font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}.ds .rpxs .t{white-space:pre-wrap;line-height:1.4;color:var(--ink)}"
    + ".ds .rpx .rpxv{padding:8px 10px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}.ds .rpx .rpxn{padding:0 10px 8px;font-size:.78rem;color:var(--muted)}"
    + ".ds .rpx .rpxin{padding:4px 10px 8px}.ds .rpx .rpxin label{display:block;font-size:.76rem;color:var(--muted);margin-bottom:3px}.ds .rpx .rpxtb{padding:6px 8px 8px}"
    + ".ds .rpx table.rpxi{min-width:0;width:100%;table-layout:auto;border-collapse:collapse}.ds .rpx .rpxi th,.ds .rpx .rpxi td{border:0;border-bottom:1px solid var(--line);padding:5px 8px;font-size:.84rem;vertical-align:middle;line-height:1.35}"
    + ".ds .rpx .rpxi thead th{position:static;height:auto;text-align:left;font-size:.72rem;letter-spacing:0;background:var(--surface-2)}.ds .rpx .rpxi tr:last-child td{border-bottom:0}.ds .rpx .rpxi input,.ds .rpx .rpxi select{min-width:0!important;width:100%!important;padding:4px 6px!important;font-size:.82rem!important}"
    + ".ds .rpcnt{font-size:.74rem;color:var(--muted);margin:2px 0 4px}.ds .rphid{font-size:.76rem;color:var(--muted);margin-top:6px}.ds .rphid button{border:0;background:none;color:var(--brand);font:inherit;font-weight:700;cursor:pointer;padding:0}"
    + ".ds th.rpno,.ds td.rpno{width:34px;text-align:center;color:var(--muted);font-weight:700}.ds .rpx-x{border:0;background:none;color:var(--muted);font-size:1.15rem;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px}.ds .rpx-x:hover{color:var(--bad);background:var(--surface-2)}"
    + ".ds .rpx tbody tr:not(.ttl):not(.hd)>td{border-top:3px solid var(--line)}.ds .rpx tbody tr:not(.ttl):not(.hd)>td.num,.ds .rpx tbody tr:not(.ttl):not(.hd)>td.q{background:var(--surface-2)}"
    + ".ds .rpx td.num{font-size:1.05rem;color:var(--brand)}"
    + ".ds .rpx .rpxk{display:flex;flex-wrap:wrap;gap:6px 8px;margin:8px 10px 2px;padding:7px 10px;border-radius:10px;background:var(--brand-soft);border-left:3px solid var(--brand)}"
    + ".ds .rpx .rpxk span{font-size:.8rem;color:var(--muted)}.ds .rpx .rpxk span+span:before{content:'·';margin-right:8px;color:var(--muted)}.ds .rpx .rpxk b{color:var(--ink);font-size:.9rem}"
    + ".ds .rpx .rpxi th.c,.ds .rpx .rpxi td.c,.ds .tbl th.c,.ds .tbl td.c{text-align:center}.ds .rpx .rpxi td.c,.ds .tbl td.c{white-space:nowrap}.ds .rpx .rpxi select{min-width:105px!important}.ds .rpx .rpxi th.r,.ds .rpx .rpxi td.r,.ds .tbl th.r,.ds .tbl td.r{text-align:right;white-space:nowrap}"
    + ".ds .rpx .rpxi td.rpin,.ds .tbl td.rpin{min-width:230px;width:36%}.ds .rpx .rpxin.need label{color:var(--bad);font-weight:700}"
    + ".ds .rpx.rpql{border:0;background:none;box-shadow:none;overflow:visible;border-radius:0}"
    + ".ds .rpqt{padding:10px 14px;margin:0 0 12px;border-radius:12px;background:var(--brand-soft);color:var(--brand);font-weight:700;font-size:1rem}"
    + ".ds .rpq{background:var(--surface);border:1px solid var(--line);border-radius:14px;margin:0 0 16px;overflow:hidden;box-shadow:var(--shadow-s,none)}.ds .rpq.need{border-color:var(--warn)}"
    + ".ds .rpqh{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:flex-start;padding:10px 14px;background:var(--brand-soft);border-bottom:1px solid var(--line)}"
    + ".ds .rpqh .qn{flex:none;min-width:30px;height:30px;padding:0 6px;border-radius:9px;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:800;font-size:.95rem}"
    + ".ds .rpqh .qt{flex:1;min-width:200px;font-weight:700;color:var(--ink);line-height:1.35;padding-top:4px}.ds .rpqh .qt small{display:block;font-weight:400;color:var(--muted);font-size:.76rem;margin-top:2px}"
    + ".ds .rpqh .qneed{flex:none;margin-top:4px}.ds .rpqh .qs{flex-basis:100%;display:flex;flex-wrap:wrap;gap:2px 16px;padding-left:42px;font-size:.8rem;color:var(--muted)}.ds .rpqh .qs b{color:var(--brand);font-size:.95rem}"
    + ".ds .rpqb{padding:6px 6px 4px}.ds .rpx .rpqb>textarea{border:1px solid var(--line);border-radius:10px;margin:6px 8px;width:calc(100% - 16px)}"
    + "@media (max-width:640px){.ds .rpqh .qs{padding-left:0}.ds .rpqh .qt{min-width:0}}"
    + ".ds .rpbn{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.ds .rpbn button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:6px 11px;font:inherit;font-size:.8rem;cursor:pointer}"
    + ".ds .rpbn button b{font-weight:700}.ds .rpbn .ok{border-color:var(--ok);color:var(--ok)}.ds .rpbn .wa{border-color:var(--warn);color:var(--warn)}"
    + ".ds .rpb{--tone:var(--brand);--tone-soft:var(--brand-soft);border:1px solid var(--line);border-radius:16px;margin:0 0 22px;background:var(--surface-2);overflow:hidden;box-shadow:var(--shadow-s,none)}"
    + ".ds .rpb.t-ok{--tone:var(--ok);--tone-soft:var(--ok-soft)}.ds .rpb.t-warn{--tone:var(--warn);--tone-soft:var(--warn-soft)}.ds .rpb.t-bad{--tone:var(--bad);--tone-soft:var(--bad-soft)}.ds .rpb.t-muted{--tone:var(--muted);--tone-soft:var(--surface-2)}"
    + ".ds .rpbh{display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;background:var(--tone-soft);user-select:none}"
    + ".ds .rpb .bi{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-weight:800;color:#fff;background:var(--tone)}"
    + ".ds .rpb .bt{font-weight:800;font-size:1.06rem;color:var(--ink)}.ds .rpb .bs{font-size:.78rem;color:var(--muted)}"
    + ".ds .rpb .bst{margin-left:auto;font-size:.75rem;font-weight:700;padding:3px 10px;border-radius:9px;white-space:nowrap}.ds .rpb .bst.wa{background:var(--warn-soft);color:var(--warn)}.ds .rpb .bst.ok{background:var(--ok-soft);color:var(--ok)}"
    + ".ds .rpb .bst:empty{display:none}.ds .rpb .bst:empty+.bch{margin-left:auto}.ds .rpb .bch{color:var(--muted);font-size:.8rem;white-space:nowrap}"
    + ".ds .rpbk{display:flex;flex-wrap:wrap;gap:6px 24px;padding:10px 16px 11px 62px;border-top:1px solid var(--line);background:var(--surface)}.ds .rpbk span{font-size:.76rem;color:var(--muted)}.ds .rpbk b{display:block;font-size:1.12rem;color:var(--ink);font-weight:800}"
    + ".ds .rpbq{padding:14px 14px 0;border-top:1px solid var(--line)}.ds .rpb.col .rpbq{display:none}"
    + "@media (max-width:640px){.ds .rpbk{padding-left:16px}.ds .rpbq{padding:10px 8px 0}}"
    + ".ds .rpxs .bt{display:flex;gap:8px;margin-top:7px}.ds .rpxs button{border:1px solid var(--brand);background:var(--brand);color:#fff;border-radius:8px;padding:4px 10px;font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}";
  function rpxCss() { if (!document.getElementById("ds-rpx-css")) { var st = document.createElement("style"); st.id = "ds-rpx-css"; st.textContent = RPX_CSS; document.head.appendChild(st); } }
  function rpOwn(it) { return it.mode === "manual" && it.inputs.length === 1 && !it.rows.length && !it.kv.length && !it.auto_text ? it.inputs[0] : null; }      // ответ ячейки — сам ответ на вопрос (CRM о нём ничего не знает)
  /* предложение CRM показываем, пока сотрудник сам не ответил (у вопроса «по сотрудникам» — пока все строки пустые) */
  function rpSugOpen(it) {
    if (!it.suggest) return false;
    var own = rpOwn(it); if (own) return !own.v;
    var keys = Object.keys(it.suggest.fill || {});
    return !it.edited && keys.every(function (k) { var i = rpFind(k); return !i || !i.v; });
  }
  function rpSug(it, ro) {
    if (!rpSugOpen(it)) return "";
    return '<div class="rpxs"><b>💡 Предложение CRM</b><div class="t">' + E(it.suggest.text) + "</div>" + (ro ? "" : '<div class="bt"><button type="button" data-rpsug="' + E(it.id) + '" title="Подставить в ответ — дальше можно дописать">Подставить</button></div>') + "</div>";
  }
  function rpAns(it) { var own = rpOwn(it); if (own) return own.v || ""; var t = it.edited || it.crm || ""; return it.comment ? (t ? t + "\n" : "") + "Комментарий: " + it.comment : t; }
  function rpCm(it, ro) {                  // комментарий сотрудника к ответу CRM — по необходимости
    if (!it.comment_key || (ro && !it.comment)) return "";
    return '<div class="rpxc"><textarea data-rpc="' + E(it.id) + '" rows="1" placeholder="Комментарий — по необходимости"' + (ro ? " disabled" : "") + ">" + E(it.comment || "") + "</textarea></div>";
  }
  function rpRows(text) { return Math.min(40, Math.max(1, String(text || "").split("\n").length)); }
  function rpFit() { document.querySelectorAll(".rpx textarea, .rpxc textarea").forEach(function (t) { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }); }      // высота ячейки — по тексту, как «Перенос текста» в Excel
  addEventListener("resize", function () { if (document.querySelector(".rpx")) rpFit(); });
  /* отчёт по смысловым блокам: шапка блока — итоги, «заполнить N» / «готово»; блоки открыты при первом просмотре.
     k — итоги блока: [вопрос, подпись в kv | "#rows" (строк) | "#total", своя подпись] */
  var RP_BLOCKS = {
    sales: [
      { t: "Деньги недели", s: "считает CRM", tone: "ok", q: ["s1", "s2", "s3"], k: [["s1", "Оплаты"], ["s3", "План"], ["s3", "Выполнение"], ["s1", "Запросы", "Запросов (КП)"]] },
      { t: "Ждём оплату", s: "кто должен и что делаем", tone: "warn", q: ["s4", "s5", "s6"], k: [["s4", "#rows", "Счета без оплаты"], ["s4", "Более 5 раб. дней", "из них более 5 дн."], ["s6", "#total", "Долги по сданным"]] },
      { t: "План на следующую неделю", s: "воронка и кто без ответа", tone: "brand", q: ["s7", "s8"], k: [["s7", "Итого по группам", "В плане"], ["s7", "С учётом вероятности"], ["s8", "#rows", "КП без ответа 3+ дн."]] },
      { t: "Отказы", s: "почему потеряли и вернёмся ли", tone: "bad", q: ["s9"], k: [["s9", "#rows", "За неделю"], ["s9", "Отказов за месяц", "За месяц"], ["s9", "Чаще всего"]] },
      { t: "Команда и процесс", s: "пишет сотрудник", tone: "muted", q: ["s10", "s11", "s12", "s13"], k: [["s12", "Нагрузка (CRM)", "Нагрузка"]] }],
    ops: [
      { t: "Поток проектов", s: "пришло и ушло дальше", tone: "ok", q: ["o1", "o8"], k: [["o1", "Пришло"], ["o1", "Передано", "Передано в проектирование"], ["o8", "Отправлено", "На согласование"]] },
      { t: "ТЗ", s: "заполнение и возвраты", tone: "warn", q: ["o2", "o3", "o4", "o5", "o6"], k: [["o2", "На этапе ТЗ"], ["o2", "Из них 5+ раб. дней"], ["o5", "В среднем", "ТЗ → проектирование"], ["o4", "#rows", "Вернули заказчику"], ["o6", "#rows", "Вернули из проектирования"]] },
      { t: "Корректировки", s: "причины и сроки", tone: "bad", q: ["o7"], k: [["o7", "Корректировок"]] },
      { t: "Команда и процесс", s: "пишет сотрудник", tone: "muted", q: ["o9", "o10", "o11", "o12"], k: [] }],
    design: [
      { t: "Сроки", s: "сдано и что под угрозой", tone: "brand", q: ["d1", "d2", "d3", "d4"], k: [["d1", "Запланировано"], ["d1", "Сдано в срок"], ["d1", "Не сдано"], ["d3", "#rows", "Под угрозой"], ["d4", "#rows", "Сдадим на след. неделе"]] },
      { t: "ТЗ и корректировки", s: "что мешает плану", tone: "warn", q: ["d5", "d6"], k: [["d5", "Получено", "ТЗ получено"], ["d5", "Некорректных"], ["d6", "Корректировок"]] },
      { t: "Сотрудники", s: "как идут дела у каждого", tone: "ok", q: ["d7"], k: [] },
      { t: "Команда и процесс", s: "пишет сотрудник", tone: "muted", q: ["d8", "d9", "d10", "d11"], k: [] }]
  };
  function rpBlocks(r, ro, one) {
    rpxCss();
    var by = {}, used = {};
    r.items.forEach(function (it) { by[it.id] = it; });
    var defs = (RP_BLOCKS[r.kind] || []).map(function (b) { return Object.assign({}, b, { items: b.q.map(function (id) { return by[id]; }).filter(Boolean) }); });
    defs.forEach(function (b) { b.items.forEach(function (it) { used[it.id] = 1; }); });
    var rest = r.items.filter(function (it) { return !used[it.id]; });
    if (rest.length) defs.push({ t: "Прочее", s: "", tone: "muted", items: rest, k: [] });
    defs = defs.filter(function (b) { return b.items.length; });
    if (!S.rpCol) S.rpCol = {};
    var left = function (b) { return ro ? 0 : b.items.filter(function (it) { return !rpDone(it); }).length; };
    var nav = '<div class="rpbn">' + defs.map(function (b, i) {
      var l = left(b), n = b.items.length;
      return '<button type="button" class="' + (ro ? "" : l ? "wa" : "ok") + '" data-rpblk="' + i + '"><b>' + (i + 1) + " · " + E(b.t) + "</b>" + (ro ? "" : l ? " " + (n - l) + " из " + n : " ✓") + "</button>";
    }).join("") + "</div>";
    return nav + defs.map(function (b, i) {
      var l = left(b), key = r.kind + ":" + r.week_start + ":" + i, col = S.rpCol[key] === true;
      var kpi = (b.k || []).map(function (k) {
        var it = by[k[0]]; if (!it) return "";
        var v = k[1] === "#rows" ? String(it.rows.length) : k[1] === "#total" ? it.total : (it.kv.filter(function (x) { return x[0] === k[1]; })[0] || [])[1];
        if (v == null || v === "" || v === "—") return "";
        return "<span>" + E(k[2] || k[1]) + "<b>" + E(String(v)) + "</b></span>";
      }).join("");
      return '<section class="rpb t-' + b.tone + (col ? " col" : "") + '" id="rpb' + i + '"><div class="rpbh" data-rpbcol="' + E(key) + '" title="Свернуть / развернуть блок"><span class="bi">' + (i + 1) + "</span>"
        + '<div class="bx"><div class="bt">' + E(b.t) + "</div>" + (b.s ? '<div class="bs">' + E(b.s) + "</div>" : "") + "</div>"
        + '<span class="bst ' + (l ? "wa" : "ok") + '">' + (ro ? "" : l ? "заполнить " + l : "готово") + '</span><span class="bch">' + (col ? "▸ развернуть" : "▾") + "</span></div>"
        + (kpi ? '<div class="rpbk">' + kpi + "</div>" : "") + '<div class="rpbq">' + b.items.map(one).join("") + "</div></section>";
    }).join("");
  }
  function rpCardReport(r, ro) {
    rpxCss();
    setTimeout(rpFit, 0);
    var MODE = { auto: "считает CRM", semi: "CRM + ваш комментарий", manual: "отвечаете вы", fill: "заполнила CRM · можно дописать комментарий" };
    var cards = rpBlocks(r, ro, function (it) {
      var sum = rpSum(it), need = !ro && !rpDone(it);
      return '<section class="rpq' + (need ? " need" : "") + '"><div class="rpqh"><span class="qn">' + it.n + '</span><div class="qt">' + E(it.q)
        + "<small>" + E(MODE[it.auto_text ? "fill" : it.mode] || "") + (it.hint && !it.auto_text ? " · " + E(it.hint) : "") + "</small></div>"
        + (need ? '<span class="pill warn qneed">заполнить</span>' : "")
        + (sum.length ? '<div class="qs">' + sum.map(function (x) { return "<span>" + E(x[0]) + " <b>" + E(x[1]) + "</b></span>"; }).join("") + "</div>" : "")
        + '</div><div class="rpqb">' + rpXAns(it, ro) + "</div></section>";
    });
    return '<div class="rpx rpql"><div class="rpqt">Пятничный созвон: ' + E(r.title) + (r.person ? " (" + E(r.person) + ")" : "") + " · " + dmy(r.week_start).slice(0, 5) + " — " + dmy(r.week_end).slice(0, 5) + "</div>" + cards + "</div>";
  }
  /* ответ в ячейке: свой ответ на ручной вопрос — правится; посчитанное CRM — только читать, под ним комментарий */
  /* итоги вопроса: цифры CRM, «Всего» строк, «Итого» — в полосу-заголовок вопроса */
  function rpSum(it) {
    if (it.auto_text || rpOwn(it)) return [];
    var sum = it.kv.slice();
    if (it.cols.length && it.rows.length) sum.push(["Всего", String(it.rows.length)]);
    if (it.total) sum.push(["Итого", it.total]);
    return sum;
  }
  function rpXAns(it, ro) {
    var own = rpOwn(it);
    if (own) return '<textarea data-rpx="' + E(it.id) + '" rows="' + rpRows(own.v) + '" placeholder="' + (ro ? "" : "Ответ…") + '"' + (ro ? " disabled" : "") + ">" + E(own.v || "") + "</textarea>" + rpSug(it, ro);
    var h = "";
    if (it.auto_text) return '<div class="rpxv">' + E(it.auto_text) + "</div>" + rpCm(it, ro);        // CRM уже вписала ответ — предложение не повторяем
    else {
      if (it.cols.length) h += '<div class="rpxtb">' + rpTable(it, ro, "rpxi") + "</div>";
      if (it.note) h += '<div class="rpxn">' + E(it.note) + "</div>";
      h += it.inputs.map(function (i) { return '<div class="rpxin' + (i.req && !i.v ? " need" : "") + '">' + (i.label ? "<label>" + E(i.label) + "</label>" : "") + rpInput(i, ro) + "</div>"; }).join("");
      if (!h && !rpSum(it).length) h = '<div class="rpxv">' + E(it.crm || it.empty || "—") + "</div>";        // только цифры — они уже в полосе вопроса
    }
    return h + rpSug(it, ro) + rpCm(it, ro);
  }
  function rpSaveX(id, text) {
    var it = ((S.rp && S.rp.data && S.rp.data.items) || []).filter(function (x) { return x.id === id; })[0]; if (!it) return;
    var own = rpOwn(it);
    if (own) return rpSave(own.key, text);
  }
  document.addEventListener("input", function (e) {
    var t = e.target; if (!t.dataset || !(t.dataset.rpx || t.dataset.rpc)) return;
    t.style.height = "auto"; t.style.height = t.scrollHeight + "px";
  });
  document.addEventListener("change", function (e) {
    var t = e.target; if (!t.dataset || !S.rp || !S.rp.data) return;
    if (t.dataset.rpx) return rpSaveX(t.dataset.rpx, t.value);
    if (t.dataset.rpc) {
      var it = S.rp.data.items.filter(function (x) { return x.id === t.dataset.rpc; })[0]; if (!it || !it.comment_key) return;
      it.comment = t.value.trim();
      if (it.auto_text) it.inputs[0].v = it.comment;                // у ручного вопроса комментарий хранится как ответ
      rpSave(it.comment_key, it.comment);
    }
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-rpsug],[data-rphide],[data-rpunhide],[data-rpref],[data-rpblk],[data-rpbcol]") : null; if (!t || !S.rp || !S.rp.data) return;
    if (t.dataset.rpbcol) { S.rpCol = S.rpCol || {}; S.rpCol[t.dataset.rpbcol] = !t.closest(".rpb").classList.contains("col"); return paint(); }
    if (t.dataset.rpblk) {                                                     // к блоку: развернуть и прокрутить
      var sec = document.getElementById("rpb" + t.dataset.rpblk); if (!sec) return;
      if (sec.classList.contains("col")) { S.rpCol = S.rpCol || {}; S.rpCol[sec.querySelector("[data-rpbcol]").dataset.rpbcol] = false; paint(); sec = document.getElementById("rpb" + t.dataset.rpblk); }
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (t.dataset.rpref) { t.disabled = true; return loadReport().then(paint).then(function () { toast("Отчёт обновлён"); }); }
    if (t.dataset.rphide) { t.disabled = true; return rpSave(t.dataset.rphide, "1").then(loadReport).then(paint); }
    if (t.dataset.rpunhide) {
      var hi = S.rp.data.items.filter(function (x) { return x.id === t.dataset.rpunhide; })[0]; if (!hi) return;
      return Promise.all((hi.hidden || []).map(function (h) { return rpSave(h[0], ""); })).then(loadReport).then(paint);
    }
    if (t.dataset.rpsug) {
      var si = S.rp.data.items.filter(function (x) { return x.id === t.dataset.rpsug; })[0]; if (!si || !si.suggest) return;
      t.disabled = true;
      var fill = si.suggest.fill || {};
      return Promise.all(Object.keys(fill).map(function (k) { return rpSave(k, fill[k]); })).then(loadReport).then(function () { toast("Подставлено — можно дописать"); paint(); });
    }
  });
  function reportScreen() {
    var p = pos(), r = S.rp && S.rp.data;
    var tabs = rpLeads(p) ? '<div class="seg">' + RP_KINDS.map(function (x) { return '<button data-rpkind="' + x[0] + '" class="' + (S.rp && S.rp.kind === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div>" : "";
    if (!r) return '<div class="head"><div><h1>Пятничный созвон</h1></div></div>' + tabs + '<div class="note">' + (S.err ? E(S.err) : "Нет данных") + "</div>";
    if (r.kind === "sales" && window.DSSalesReport) return DSSalesReport.html(r, !r.can_edit, p, tabs);
    var ro = !r.can_edit, tone = { ok: "var(--ok)", bad: "var(--bad)", brand: "var(--brand)", warn: "var(--warn)" };
    var done = r.items.filter(rpDone).length, auto = r.items.filter(function (it) { return it.mode !== "manual"; }).length;
    var head = '<div class="head"><div><h1>Пятничный созвон · ' + E(r.title) + "</h1><p>Неделя " + dmy(r.week_start).slice(0, 5) + " — " + dmy(r.week_end).slice(0, 5) + ". Цифры и списки CRM считает сама; допишите комментарии и ответы на ручные вопросы — в пятницу в 17:00 отчёт уйдёт руководителю.</p></div>"
      + '<div style="display:flex;gap:10px;flex-wrap:wrap"><div class="seg"><button data-rpnav="-1">← Пред.</button><button data-rpnav="0" class="on">Эта</button><button data-rpnav="1">След. →</button></div>'
      + '<button class="btn ghost" data-rpref="1" title="Пересчитать отчёт по данным CRM на сейчас">⟳ Обновить</button></div></div>'
      + (tabs ? '<div style="margin-bottom:14px">' + tabs + "</div>" : "");
    var who = '<div class="panel pad" style="display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap">' + (r.person ? ava(r.person, "lg") : "") + "<div><b>" + E(r.person || r.title) + '</b><br><small style="color:var(--muted)">' + E(r.title) + " · " + r.items.length + " вопросов · CRM отвечает на " + auto + "</small></div>"
      + '<div style="margin-left:auto;min-width:200px;font-size:.82rem;color:var(--muted)">Заполнено ' + done + " из " + r.items.length + '<div style="height:7px;background:var(--line);border-radius:9px;margin-top:5px;overflow:hidden"><i style="display:block;height:100%;width:' + Math.round(done / r.items.length * 100) + '%;background:var(--ok)"></i></div></div></div>';
    var legend = '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.8rem;color:var(--muted);margin-bottom:12px"><span>' + rpTag("auto") + " считает CRM</span><span>" + rpTag("semi") + " список из CRM, вы дописываете «что сделал · следующий шаг»</span><span>" + rpTag("manual") + " отвечаете вы</span></div>";
    var tiles = '<div class="tiles" style="margin-bottom:16px">' + r.tiles.map(function (x) { return '<div class="tile" style="--c:' + (tone[x[0]] || "var(--brand)") + '"><div class="n">' + E(x[1]) + '</div><div class="l">' + E(x[2]) + "</div></div>"; }).join("") + "</div>";
    return head + who + tiles + '<div class="note" style="margin:0 0 10px">То, что посчитала CRM, не правится — при необходимости допишите комментарий под ответом. Ответы на свои вопросы и поля в таблицах сохраняются сами. Номер задачи открывает её карточку; в плане оплат лишние КП убираются крестиком ×.</div>' + rpCardReport(r, ro);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-rpchip]") : null; if (!t || !S.rp || !S.rp.data) return;
    var kv = t.dataset.rpchip.split("|"), cur = rpFind(kv[0]), val = cur && cur.v === kv[1] ? "" : kv[1];
    rpSave(kv[0], val); paint();
  });

  window.DSFriday = { loadReport: loadReport, reportScreen: reportScreen, downloadText: downloadText, rpSave: rpSave, rpFind: rpFind, rpCsv: rpCsv };
})();
