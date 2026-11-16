/* «Работа → Конвейер» по макету «Мини-CRM» (Ч1, ИИ-агенты/tasks/automation-engineer_08.md; макет — screens/мини-срм-макет, convScreen).
   Сверху плитки этапов: Продажи → Проект ‖ Нормо-тех → Деньги и закрытие (сколько, сумма, шаги, просрочка). Нажатие на плитку —
   ниже лента шагов этапа (с подшагами 5.1 «Выезд» и 6.1 «Корректировки») и карточки; каждой роли сразу открыт её этап.
   Только обзор: стадии и статусы КП здесь не меняются — клик по карточке открывает нынешнее окно задачи или окно КП.
   Рядом с «Направлением» — прежние виды «Список» (проектные задачи списком) и «Организационные» (как были во вкладке «Задач»).
   Данные — те же /orders, /kp, /visits, что у остальных экранов; что роли не положено (деньги, чужие задачи), режет сервер (ds_policy).
   Включается при DS_WORK (index.html); при DS_WORK = false — прежние «Задачи» (ds.js, screen()). */
(function () {
  "use strict";
  function X() { return DS.cvCtx(); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- шаги конвейера (номера и названия — как в макете и «Как работаем») ---------- */
  var LANES = [["sales", "Продажи", "var(--org)", [1, 2, 3, 4]], ["proj", "Проект", "var(--brand)", [5, 6, 7, 8]], ["norm", "Нормо-тех", "var(--sys)", ["n1", "n2", "n3", "n4"]], ["money", "Деньги и закрытие", "var(--ok)", [9, 10]]];
  var SUBOF = { 5: "s51", 6: "s61", 10: "pause" };       // подшаги: 5.1 «Выезд», 6.1 «Корректировки», 11 «⏸ Пауза» (план 10; как SUBOF2 в макете)
  var NAME = { 1: "Обращение", 2: "КП отправлено", 3: "Договор и счёт", 4: "Ждём аванс", 5: "Сбор данных", s51: "Выезд", 6: "В работе", s61: "Корректировки", 7: "На согласовании", 8: "Сдано · акт",
    9: "Ждём оплату", 10: "Закрыто", pause: "⏸ Пауза", n1: "Исходные данные", n2: "Расчёт", n3: "Проверка", n4: "Выдано" };
  /* кто ведёт шаг — как в CRM сейчас (акт, счёт и «Закрыто» — бухгалтер; проверку непроектных работ ставит операционному отделу) */
  var WHO = { 1: "РОП / опер. менеджер", 2: "РОП", 3: "РОП + бухгалтер", 4: "бухгалтер · 1С", 5: "опер. менеджер", s51: "опер. менеджер", 6: "Иван · проектировщик", s61: "Иван · проектировщик",
    7: "опер. менеджер", 8: "бухгалтер", 9: "бухгалтер · 1С", 10: "за 30 дней", pause: "опер. менеджер · Иван", n1: "опер. менеджер", n2: "нормо-тех спец.", n3: "опер. менеджер", n4: "опер. менеджер" };
  /* свои шаги роли (яркие), по таблице Е.1 плана design_rabota_2026-11-15.md */
  var MINE = { sales: [1, 2, 3, 4, 9, 10], ops: [5, "s51", 6, "s61", 7, "n1", "n2", "n3", "n4", "pause"], design: [5, 6, "s61", 7, 8, "pause"], designer: [6, "s61", "n2", "n3", "n4"], acc: [3, 4, 8, 9, "n4"] };
  var LANEDEF = { sales: "sales", acc: "mine" };            // какой этап открыт при входе; остальным — «Проект»
  var KP_ROLES = { owner: 1, sales: 1, ops: 1, acc: 1 };    // кому сервер отдаёт реестр КП (kp_list)
  var KP_EDIT = { owner: 1, sales: 1, ops: 1 };             // кто правит КП (окно КП); бухгалтеру — переход в реестр
  var ACTIVE = ["Сбор данных", "Готов к проектированию", "В проектировании", "Проверка", "На согласовании", "Корректировка"];
  var CARDS_MAX = 60;
  var VIS_TTL = 60000;                                       // выезды старше минуты перечитываются при перерисовке Конвейера

  function pos() { return X().projPos(); }                  // нормативный специалист-исполнитель — как проектировщик (только свои задачи)
  function money() { return !!X().can("money"); }
  function allKeys() { var a = []; LANES.forEach(function (l) { l[3].forEach(function (k) { a.push(k); if (SUBOF[k]) a.push(SUBOF[k]); }); }); return a; }
  function mineList() { return MINE[pos()] || allKeys(); }
  function isMine(k) { return mineList().indexOf(k) >= 0; }
  function laneKeys(l) { var a = []; l[3].forEach(function (k) { a.push(k); if (SUBOF[k]) a.push(SUBOF[k]); }); return a; }
  function stepNo(k) { return k === "s51" ? "5.1" : k === "s61" ? "6.1" : k === "pause" ? "11" : typeof k === "string" ? "Н" + k.slice(1) : String(k); }
  function keyOf(v) { return /^\d+$/.test(v) ? +v : v; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function st() {
    var S = X().S;
    if (!S.cv) S.cv = { dir: lsGet("ds_cvdir") || "all", mode: lsGet("ds_cvmode") || "conv", lane: "", step: 0, whof: "", more: false };
    return S.cv;
  }
  function dirOn() { var p = pos(); return p === "owner" || p === "ops"; }
  function modes() {
    var p = X().pos(), org = p === "owner" || p === "sales" || p === "ops" || p === "acc";
    return [["conv", "Конвейер"], ["list", "Список"]].concat(org ? [["org", "Организационные"]] : []);
  }
  function fmtK(v) { return !v ? "—" : v >= 1e6 ? (v / 1e6).toFixed(2).replace(/0$/, "").replace(".", ",") + " млн" : Math.round(v / 1000) + " тыс."; }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function since30() { var d = new Date(); d.setDate(d.getDate() - 30); return iso(d); }

  /* ---------- стадия задачи / статус КП → шаг ---------- */
  function orderStep(o) {
    var s = o.stage, np = !!o.nonproj;
    if (s === "Пауза") return "pause";                                              // шаг 11: и проект, и нормо-тех; срок не горит (ACTIVE без «Паузы»)
    if (s === "Ожидает аванс") return 4;
    if (s === "Закрыто") return 10;
    if (s === "Сдано") return o.act_sent ? 9 : np ? "n4" : 8;
    if (pos() === "acc" && o.adv_mode === "advance" && !o.adv_paid) return 4;      // бухгалтер видит такую задачу только из-за неоплаченного аванса
    if (np) return s === "Сбор данных" ? "n1" : s === "Проверка" ? "n3" : s === "На согласовании" || s === "Корректировка" ? "n4" : "n2";
    if (s === "Сбор данных") return 5;
    if (s === "Корректировка") return "s61";
    if (s === "На согласовании") return 7;
    return 6;                                                                       // «Готов к проектированию», «В проектировании», «Проверка»
  }
  function kpStep(k) {
    var s = k.status;
    if (s === "Обращение" || s === "Сбор вводных" || s === "Новое обращение") return 1;
    if (s === "КП отправлено") return 2;
    if (s === "Доки отправлены") return 3;
    if (s === "В предоплате") return 4;
    if (s === "В постоплате") return k.post_paid ? 0 : 9;
    if (s === "Закрыто") return (k.status_date || "") >= since30() ? 10 : 0;
    return 0;                                                                       // «В работе» (задача уже идёт), «Отказ»
  }
  function closedRecent(o) {                                                        // «Закрыто» за 30 дней: по дате закрытия с моста (B1 плана 10; без денег — тоже)
    var d = o.closed_date != null ? o.closed_date : [o.post_date || "", o.adv_date || ""].sort().pop();      // старый мост без closed_date — по последней оплате
    return (d || "") >= since30();
  }
  function orderSum(o, k) { var a = +o.amount || 0; return k === 9 ? Math.max(0, a - (o.adv_paid ? +o.adv_sum || 0 : 0)) : a; }
  function kpSum(kp, k) { return k === 9 ? (+kp.post_sum || 0) : (+kp.amount || 0); }

  /* все карточки конвейера: {k: шаг, o: задача | kp: КП, visit} */
  function items() {
    var x = X(), S = x.S, w = st(), out = [], ids = {}, vis = {};
    (S.cvVis || []).forEach(function (v) { if (v.order_id && !vis[v.order_id]) vis[v.order_id] = v; });
    (S.orders || []).forEach(function (o) {
      ids[o.id] = 1;
      var dv = dirOn() ? w.dir : "all"; if (dv === "p" && o.nonproj || dv === "n" && !o.nonproj) return;
      var k = orderStep(o);
      if (k === 10 && !closedRecent(o)) return;
      out.push({ k: k, o: o, visit: o.stage !== "Закрыто" && o.stage !== "Сдано" && o.stage !== "Пауза" ? vis[o.id] || null : null });      // на паузе выезд 5.1 не показываем
    });
    if (KP_ROLES[x.pos()]) (S.kp || []).forEach(function (kp) {
      if (kp.order_id && ids[kp.order_id]) return;                                 // по КП есть задача — показываем задачу
      var k = kpStep(kp); if (k) out.push({ k: k, kp: kp });
    });
    return out;
  }
  function inStep(it, k) { return k === "s51" ? !!it.visit : it.k === k; }
  function text(it) {
    if (it.kp) return [it.kp.number, it.kp.customer, it.kp.object, it.kp.manager].join(" ");
    var o = it.o; return [o.number, o.customer, o.object, o.system, X().sysText(o), o.executor].join(" ");
  }
  function whoOf(it) { return it.kp ? it.kp.manager || "не назначен" : it.o.executor || "не назначен"; }
  function late(it) { return !!it.o && ACTIVE.indexOf(it.o.stage) >= 0 && it.o.left_days != null && it.o.left_days < 0; }
  function stats(all) {
    var c = {}, s = {}, lt = {};
    all.forEach(function (it) {
      var sum = it.kp ? kpSum(it.kp, it.k) : orderSum(it.o, it.k);
      c[it.k] = (c[it.k] || 0) + 1; s[it.k] = (s[it.k] || 0) + sum;
      if (it.visit) c.s51 = (c.s51 || 0) + 1;
      if (late(it)) LANES.forEach(function (l) { if (laneKeys(l).indexOf(it.k) >= 0) lt[l[0]] = (lt[l[0]] || 0) + 1; });
    });
    return { c: c, s: s, late: lt };
  }

  /* ---------- этапы (плитки) и лента шагов ---------- */
  function lanesOn(all) {
    var w = st(), p = pos();
    return LANES.filter(function (l) {
      var dv = dirOn() ? w.dir : "all"; if (dv === "n" && l[0] === "proj" || dv === "p" && l[0] === "norm") return false;
      if (l[0] === "norm" && X().pos() === "design") return false;                 // проектному отделу непроектные работы сервер не отдаёт
      if (p === "designer") return all.some(function (it) { return laneKeys(l).indexOf(it.k) >= 0; });      // проектировщику — только этапы со своими задачами
      return true;
    });
  }
  function openLane(L) {
    var w = st();
    if (w.step) { var f = L.filter(function (l) { return laneKeys(l).indexOf(w.step) >= 0; })[0]; if (f) return f; }
    var want = w.lane || LANEDEF[pos()] || "proj";
    if (want === "mine") return null;
    return L.filter(function (l) { return l[0] === want; })[0] || L.filter(function (l) { return laneKeys(l).some(isMine); })[0] || L[0] || null;
  }
  function tiles(L, ol, z) {
    var m = money();
    return '<div class="cv-b">' + L.map(function (l, i) {
      var cnt = l[3].reduce(function (a, k) { return a + (z.c[k] || 0); }, 0), sum = l[3].reduce(function (a, k) { return a + (z.s[k] || 0); }, 0);
      var sub = !m ? "в работе" : l[0] === "money" ? "ждём " + fmtK(z.s[9]) + " · закрыто " + fmtK(z.s[10]) : fmtK(sum);
      var mine = laneKeys(l).some(isMine), lt = z.late[l[0]];
      return (i ? '<span class="cv-tar">' + (l[0] === "norm" && L[i - 1][0] === "proj" ? "‖" : "→") + "</span>" : "")
        + '<button type="button" class="cv-tile' + (ol && ol[0] === l[0] ? " on" : "") + (mine ? "" : " dim") + '" data-cvl="' + l[0] + '" style="--lc:' + l[2] + '">'
        + '<span class="cv-th">' + l[1] + (lt ? '<em class="cv-late">просрочено ' + lt + "</em>" : "") + "</span>"
        + '<span class="cv-tv"><b>' + cnt + "</b><em>" + sub + "</em></span>"
        + '<span class="cv-ms">' + l[3].map(function (k) { return '<i class="' + (z.c[k] ? "" : "z") + '" title="' + E(NAME[k]) + '"><s>' + stepNo(k) + "</s>" + (z.c[k] || 0) + "</i>"; }).join("") + "</span></button>";
    }).join("") + "</div>";
  }
  function laneColor(k) { var l = LANES.filter(function (x) { return laneKeys(x).indexOf(k) >= 0; })[0]; return l ? l[2] : "var(--brand)"; }
  function chip(k, z, sub) {
    var w = st();
    return '<button type="button" class="cv-chip' + (sub ? " sub" : "") + (w.step === k ? " on" : "") + (isMine(k) ? "" : " dim") + '" data-cvs="' + k + '" style="--lc:' + laneColor(k) + '" title="' + E(NAME[k] + " · " + WHO[k]) + '">'
      + '<span class="cv-no">' + stepNo(k) + '</span><span class="cv-nm">' + NAME[k] + "</span><b>" + (z.c[k] || 0) + "</b>"
      + (money() && !sub && z.s[k] ? "<em>" + fmtK(z.s[k]) + "</em>" : "") + "<small>" + WHO[k] + "</small></button>";
  }
  function ribbon(keys, ol, z) {
    var main = keys.filter(function (k) { return k !== "s51" && k !== "s61" && k !== "pause"; });
    return '<div class="cv-open" style="--lc:' + (ol ? ol[2] : "var(--brand)") + '">' + main.map(function (k) {
      return chip(k, z, 0) + (SUBOF[k] && keys.indexOf(SUBOF[k]) >= 0 ? chip(SUBOF[k], z, 1) : "");
    }).join('<span class="cv-ar">›</span>') + "</div>";
  }

  /* ---------- карточки ---------- */
  function dm(s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) : ""; }
  function orderCard(it) {
    var x = X(), o = it.o, add = "";
    if (o.nonproj) add += '<span class="pill sys cv-mix">нормо-тех</span>';
    if (o.stage === "Корректировка" && o.fix_n) add += '<span class="pill warn cv-mix">6.1 · корректировка, круг ' + o.fix_n + "</span>";
    if (it.visit) add += '<span class="pill info cv-mix">5.1 · выезд ' + E(dm(it.visit.day)) + (it.visit.executor ? " — " + E(it.visit.executor) : "") + "</span>";
    if (it.k === 4 && o.stage !== "Ожидает аванс") add += '<span class="pill warn cv-mix">ждём аванс · ' + E(o.stage) + "</span>";
    if (it.k === "pause") add += '<span class="pill muted cv-mix" title="Ушла с шага «' + E(o.pause_from || "") + '»">⏸ пауза до ' + E(dm(o.pause_until)) + (o.pause_reason ? " · " + E(o.pause_reason) : "") + "</span>";
    if (it.k === 9) add += '<span class="pill ' + (o.post_paid ? "ok" : "warn") + ' cv-mix">акт отправлен' + (money() && !o.post_paid ? " · ждём " + E(x.money(orderSum(o, 9))) : "") + "</span>";
    var c = x.card(o, true);
    if (o.stage === "Закрыто") c = c.replace(/<span class="pill (bad|warn|info|muted)">[^<]*<\/span><\/span><\/span><\/button>$/, '<span class="pill ok">закрыто</span></span></span></button>');      // срок договора у закрытой не горит
    return add ? c.replace('<span class="meta">', '<span class="cv-adds">' + add + '</span><span class="meta">') : c;
  }
  function kpNote(kp, k) {
    var x = X(), d = kp.last_days;
    if (k === 1) return [kp.lead_date ? "обращение " + dm(kp.lead_date) : "черновик", "muted"];
    if (k === 2) {
      if (kp.watch && kp.pay_expect) return ["⭐ обещал " + dm(kp.pay_expect), "info"];
      return [d == null ? "нет общения" : d === 0 ? "общались сегодня" : "без ответа " + x.plural(d, ["день", "дня", "дней"]), x.kpTone(kp)];
    }
    if (k === 3) return ["договор в ЭДО" + (kp.status_date ? " · " + dm(kp.status_date) : ""), "muted"];
    if (k === 4) return ["ждём аванс", "warn"];
    if (k === 9) return ["ждём оплату", "warn"];
    return ["закрыто" + (kp.status_date ? " " + dm(kp.status_date) : ""), "ok"];
  }
  function kpCard(it) {
    var x = X(), kp = it.kp, k = it.k, nt = kpNote(kp, k), sum = kpSum(kp, k);
    var act = KP_EDIT[x.pos()] ? 'data-kpedit="' + kp.id + '" title="Окно КП"' : 'data-kpgo="1" title="Открыть реестр КП"';
    return '<button type="button" class="task cv-kp" ' + act + '><span class="stripe" style="--c:' + (k <= 4 ? "var(--org)" : "var(--ok)") + '"></span><span class="body">'
      + '<span class="r1"><span class="num" style="color:var(--org)">' + E(x.kpNo(kp.number)) + "</span><span>" + E(kp.customer || kp.customer_text || "") + "</span></span>"
      + '<span class="ttl" style="display:block">' + E(kp.object || "—") + "</span>"
      + '<span class="meta">' + (kp.manager ? x.ava(kp.manager, "sm") + '<span style="font-size:.84rem;margin-right:auto">' + E(kp.manager) + "</span>" : '<span class="pill muted" style="margin-right:auto">без менеджера</span>')
      + (money() && sum ? '<span class="pill muted">' + E(x.money(sum)) + "</span>" : "") + '<span class="pill ' + nt[1] + '">' + E(nt[0]) + "</span></span></span></button>";
  }
  function sortIt(a, b) {
    if (!!a.kp !== !!b.kp) return a.kp ? -1 : 1;                                   // сначала продажи (КП), потом задачи — как в макете
    if (a.k === 10 || b.k === 10) return (parseInt((b.o || b.kp).number, 10) || 0) - (parseInt((a.o || a.kp).number, 10) || 0);
    if (a.kp) return (b.kp.last_days || 0) - (a.kp.last_days || 0);
    return (b.o.urgent ? 1 : 0) - (a.o.urgent ? 1 : 0) || (a.o.left_days == null ? 9999 : a.o.left_days) - (b.o.left_days == null ? 9999 : b.o.left_days);
  }

  /* ---------- экран ---------- */
  function head() {
    var x = X(), p = x.pos(), w = st();
    var btns = p === "designer" || x.projPos() === "designer" ? "" : '<div class="cv-btns">' + (x.fullCtl() ? '<button class="btn ghost" data-new="work" title="Исходные уже есть: задача минует аванс и сбор данных и сразу уходит исполнителю «В проектирование»">' + x.ic("plus") + "Сразу в проектирование</button>" : "")
      + (x.taskCtl() ? '<button class="btn ghost" data-new="fix" title="Замечания по уже сделанному проекту: задача сразу встаёт на «Корректировку» со сроком">' + x.ic("plus") + "Сразу на корректировку</button>" : "")
      + '<button class="btn accent" data-ntopen="1">' + x.ic("plus") + "Новая задача</button></div>";
    var seg = function (list, cur, attr) { return '<div class="seg">' + list.map(function (z) { return '<button type="button" data-' + attr + '="' + z[0] + '" class="' + (cur === z[0] ? "on" : "") + '">' + z[1] + "</button>"; }).join("") + "</div>"; };
    var ms = modes(), mode = ms.some(function (z) { return z[0] === w.mode; }) ? w.mode : "conv";
    return '<div class="head cv-head"><div><h1>Конвейер</h1></div>' + btns + "</div>"
      + '<div class="cv-bar"><label class="cv-q"><input id="dsQ" type="search" autocomplete="off" placeholder="Поиск: №, заказчик, объект, исполнитель…" value="' + E(x.S.ov.q || "") + '"></label>'
      + '<span class="cv-segs">' + (dirOn() && mode === "conv" ? '<span class="cv-seg"><span class="vlab">Направление</span>' + seg([["all", "Все"], ["p", "Проекты"], ["n", "Нормо-тех"]], w.dir, "cvd") + "</span>" : "")
      + '<span class="cv-seg">' + seg(ms, mode, "cvm") + "</span></span></div>";
  }
  function conv() {
    var x = X(), w = st(), all = items(), z = stats(all), L = lanesOn(all), ol = openLane(L), q = (x.S.ov.q || "").trim().toLowerCase();
    var keys = ol ? laneKeys(ol) : mineList().slice().sort(function (a, b) { return allKeys().indexOf(a) - allKeys().indexOf(b); });
    var shown, title;
    if (q) { shown = all.filter(function (it) { return text(it).toLowerCase().indexOf(q) >= 0; }); title = "Поиск по всем шагам"; }
    else if (w.step) { shown = all.filter(function (it) { return inStep(it, w.step); }); title = "Шаг " + stepNo(w.step) + ". " + NAME[w.step]; }
    else {
      var my = keys.filter(isMine), use = my.length ? my : keys;
      shown = all.filter(function (it) { return use.some(function (k) { return inStep(it, k); }); });
      title = ol ? ol[1] + (pos() === "owner" || !my.length ? " · все шаги" : " · мои шаги") : "Все мои шаги";
    }
    var names = {}; shown.forEach(function (it) { names[whoOf(it)] = 1; });
    if (w.whof) shown = shown.filter(function (it) { return whoOf(it) === w.whof; });
    shown.sort(sortIt);
    var lt = shown.filter(late).length, lim = w.more ? shown.length : CARDS_MAX;
    var back = w.step && !q ? '<button type="button" class="cv-link" data-cvs="0"><span class="cv-lk-l">' + (ol ? "весь этап «" + ol[1] + "»" : "все мои шаги") + '</span><span class="cv-lk-s">✕ шаг</span></button>'
      : ol && !q && LANEDEF[pos()] === "mine" ? '<button type="button" class="cv-link" data-cvl="mine"><span class="cv-lk-l">все мои шаги</span><span class="cv-lk-s">✕ этап</span></button>' : "";      // B5: назад к своим шагам
    var who = '<select class="cv-sel" data-cvw="1" title="По исполнителю"><option value="">по исполнителю ▾</option>' + Object.keys(names).sort(function (a, b) { return a.localeCompare(b, "ru"); })
      .concat(w.whof && !names[w.whof] ? [w.whof] : []).map(function (n) { return '<option value="' + E(n) + '"' + (w.whof === n ? " selected" : "") + ">" + E(n) + "</option>"; }).join("") + "</select>";
    var cards = shown.slice(0, lim).map(function (it) { return it.kp ? kpCard(it) : orderCard(it); }).join("");
    var wait = KP_ROLES[x.pos()] && x.S.kp == null ? '<div class="note">Загружаю реестр КП…</div>' : "";
    return tiles(L, ol, z) + ribbon(keys, ol, z)
      + '<div class="cv-lh"><b>' + E(title) + '</b><span class="cv-cnt">' + shown.length + "</span>" + back + '<span class="grow"></span>' + (lt ? '<span class="pill bad">просрочено ' + lt + "</span>" : "") + who + "</div>"
      + wait + '<div class="cv-cards">' + cards + (shown.length ? "" : '<div class="note">Здесь пусто</div>') + "</div>"
      + (shown.length > lim ? '<button type="button" class="btn ghost cv-more" data-cvx="1">Показать все ' + shown.length + "</button>" : "");
  }
  function ensure() {
    var x = X(), S = x.S;
    if (KP_ROLES[x.pos()] && S.kp == null && !S.cvKpL) { S.cvKpL = 1; x.api("/kp").then(function (k) { S.kp = k; }, function () { S.kp = []; }).then(function () { S.cvKpL = 0; x.paint(); }); }
    if ((S.cvVis == null || Date.now() - (S.cvVisAt || 0) > VIS_TTL) && !S.cvVisL) {      // B4: выезды, поставленные после входа, — без перезагрузки страницы
      S.cvVisL = 1;
      x.api("/visits").then(function (r) { S.cvVis = ((r && r.items) || []).filter(function (v) { return v.status === "plan"; }); }, function () { if (S.cvVis == null) S.cvVis = []; })
        .then(function () { S.cvVisAt = Date.now(); S.cvVisL = 0; x.paint(); });
    }
  }
  function html() {
    ensure();
    var w = st(), ms = modes(), mode = ms.some(function (z) { return z[0] === w.mode; }) ? w.mode : "conv";
    var body = mode === "conv" ? conv() : X().screen({ type: mode === "org" ? "o" : "p" });
    return '<div class="ds dspage cv-page">' + head() + body + "</div>";
  }
  function after() {
    var w = st(), rb = document.querySelector("#tasks-app .cv-open"), on = rb && rb.querySelector(".cv-chip.on");
    if (rb && on && rb.scrollWidth > rb.clientWidth) rb.scrollLeft = Math.max(0, on.offsetLeft - 8);
    else if (rb && rb.scrollWidth > rb.clientWidth && !w.step) { var f = rb.querySelector(".cv-chip:not(.dim)"); if (f) rb.scrollLeft = Math.max(0, f.offsetLeft - 8); }
  }

  /* ---------- нажатия: этап, шаг, направление, вид, «по исполнителю» ---------- */
  function inside(e) { return !!(e.target.closest && e.target.closest("#tasks-app .cv-page")); }
  document.addEventListener("click", function (e) {
    if (!inside(e)) return;
    var t = e.target.closest("[data-cvl],[data-cvs],[data-cvd],[data-cvm],[data-cvx]"); if (!t) return;
    var d = t.dataset, w = st();
    if (d.cvl) { w.lane = d.cvl; w.step = 0; w.more = false; }
    else if (d.cvs != null) { var k = keyOf(d.cvs); w.step = k === 0 || w.step === k ? 0 : k; w.more = false; }
    else if (d.cvd) { w.dir = d.cvd; w.step = 0; w.lane = ""; lsSet("ds_cvdir", d.cvd); }
    else if (d.cvm) { w.mode = d.cvm; lsSet("ds_cvmode", d.cvm); }
    else if (d.cvx) w.more = true;
    X().paint();
  });
  document.addEventListener("change", function (e) {
    if (!inside(e) || !e.target.dataset || !e.target.dataset.cvw) return;
    st().whof = e.target.value; X().paint();
  });

  window.DSWorkConv = { html: html, after: after };
})();
