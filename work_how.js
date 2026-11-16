/* «Работа → Как работаем» по макету «Мини-CRM» (Ч5, ИИ-агенты/tasks/automation-engineer_08.md; макет — screens/мини-срм-макет, regHtml).
   Схема конвейера для сотрудников: блоки «Продажи · общие», «Проект», «Нормо-техническая», «Деньги · общие»; у шага — кто, срок, что дальше,
   что делает CRM; фильтр «Чья роль», «Что делаю я», «Общие правила», «Печать / ссылка».
   Тексты — по макету, но описывают CRM как она работает сейчас (решение владельца 16.11): правил, которых ещё нет (акт и счёт у РОП,
   авто-«Закрыто» по 1С, напоминания по постоплате, платный 3-й круг, «＋ Обращение», «Запросить исходные», «Организовать выезд»,
   отметка дня по задачам, «Оба»), здесь нет. Сроки — из «Этапов и сроков» (GET /flow = ds_stages.catalog(), его читают все роли).
   Включается при DS_WORK (index.html); при DS_WORK = false — прежний «Конвейер заказа» (ds.js, flowScreen()). */
(function () {
  "use strict";
  function X() { return DS.cvCtx(); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var RROLE = { rop: ["РОП · Александр", "#3a86d6"], om: ["Опер. менеджер · Полина", "#d0598b"], ivan: ["Иван · рук. проектного", "#2fa66a"], des: ["Проектировщик", "#8b6fe0"],
    nt: ["Нормо-тех специалист", "#0f8a8a"], dima: ["Дмитрий", "#5a6bd8"], acc: ["Бухгалтер", "#c98412"] };
  var RDEF = { owner: "", sales: "rop", ops: "om", design: "ivan", designer: "des", acc: "acc", norm: "nt" };

  /* срок шага — из «Этапов и сроков»: d(id) — «N р.д.» (или подпись срока), lab(id) — подпись срока (или «N р.д.») */
  function step(id) { var r = null; ((X().S.fl || {}).lanes || []).forEach(function (l) { l.steps.forEach(function (s) { if (s.id === id) r = s; }); }); return r; }
  function d(id) { var s = step(id); return !s ? "—" : s.days != null ? s.days + " р.д." : s.label || "—"; }
  function lab(id) { var s = step(id); return !s ? "—" : s.label || (s.days != null ? s.days + " р.д." : "—"); }
  var VISIT_TERM = "организовать — 2 р.д. после аванса";      // в «Этапах и сроках» шага «Выезд» нет — срок из макета

  var REG = {
    "1": { t: "Обращение", who: ["rop", "om"], term: function () { return lab("a1") + "; вводные — " + d("a2"); },
      act: { rop: ["Заводит обращение в ходе телефонного разговора", "Выясняет объект, системы, площадь, сроки", "Нужно обследование — закладывает выезд в КП"],
        om: ["Разбирает задачу «Обращение»: «Передать дальше» — продажам «Сбор вводных», или «Задача не требуется»"] },
      crm: ["Заявка с сайта — задача «Обращение» и срочное уведомление", "Новый диалог в мессенджерах или почте — уведомление продажам и операционному менеджеру"], next: "КП выставлено → 2" },
    "2": { t: "КП отправлено", who: ["rop"], term: function () { return "ответ заказчика — " + d("a3"); },
      act: { rop: ["Доводит КП до решения: звонок, вопросы, правка КП", "Отказ — с причиной"] },
      crm: ["Долго нет общения — напоминание отделу продаж, КП подсвечивается красным", "«⭐ Следим» с обещанной датой — напоминание менеджеру КП в этот день"], next: "Заказчик согласен → 3" },
    "3": { t: "Договор и счёт", who: ["rop", "acc"], term: function () { return d("a4"); },
      act: { rop: ["Формирует договор в конструкторе", "Заранее отправляет заказчику, какие исходные данные и ТЗ понадобятся"], acc: ["Отправляет договор в ЭДО", "Выставляет счёт на аванс"] },
      crm: ["Договор создан — бухгалтеру задача «Направить договор заказчику в ЭДО»", "«Договор подписан» — проектная задача, папка на сервере и чат проекта", "С авансом — бухгалтеру задача «Выставить счёт на аванс»"],
      next: "Договор подписан → 4 (без аванса — сразу 5)" },
    "4": { t: "Ждём аванс", who: ["acc", "rop"], term: function () { return lab("a6"); },
      act: { acc: ["Следит за поступлением"], rop: ["Напоминает заказчику"] },
      crm: ["Аванс из 1С — задача сама уходит на «Сбор данных»", "Аванс не пришёл дольше порога — напоминание бухгалтеру и продажам", "Проект или нормо-тех — по системам и услугам КП (смешанный заказ — «Проект»)"],
      next: "Аванс пришёл → 5 или Н1" },
    "5": { t: "Сбор данных", who: ["om"], term: function () { return d("p1"); }, sub: "5.1",
      act: { om: ["Собирает планировки, ТЗ, техусловия", "Сообщает заказчику: работы начнутся после согласования ТЗ", "Данные собраны — «Передать «Готов к проектированию»»"] },
      crm: ["Ставит операционному менеджеру задачу «Собрать исходные данные»", "Стадия затянулась — уведомление ответственному и руководителю"], next: "Данные собраны → 6" },
    "5.1": { t: "Выезд", who: ["om"], term: function () { return VISIT_TERM; },
      act: { om: ["Согласует дату и доступ на объект", "Назначает выездного по городу, передаёт планировки и что снять", "Материалы — в карточку выезда в тот же день"] },
      crm: ["Накануне в 18:00 и за 2 часа — напоминание выездному", "Наутро без материалов — задача «Нет материалов выезда»", "Выезд закрывается только с материалами"], next: "Выезд закрыт → данные собраны" },
    "6": { t: "В работе", who: ["ivan", "des"], term: function () { return lab("p2") + "; проверка — " + d("p4"); }, sub: "6.1",
      act: { ivan: ["По четвергам распределяет задачи: исполнитель и сроки («Занятость»)", "«Срочно» — ставит в план за 1 р.д.", "Проверяет за 1 р.д., замечания — на доработку"],
        des: ["Проектирует по плану", "Готово — «На проверку»", "Отмечает отработанные дни в «План на неделю»"] },
      crm: ["Нет исполнителя дольше порога — напоминание Ивану (срочные — руководителю)", "Срок по плану и по договору — напоминания", "Вернули с проверки — исполнителю задача «Доработка»",
        "Готовит заказчику сообщение «принят в работу» — уйдёт после подтверждения опер. менеджера"], next: "Проверка принята → 7" },
    "6.1": { t: "Корректировки", who: ["ivan", "des", "om"], term: function () { return "корректировка — " + d("p6"); },
      act: { ivan: ["Ставит корректировку исполнителю и срок"], des: ["Выполняет в срок корректировки"], om: ["Замечания заказчика — переводит на «Корректировку»", "Нормо-техническая работа: задачу на корректировку получает он сам, а не Иван"] },
      crm: ["Показывает номер круга корректировки", "Задача Ивану «Корректировка по замечаниям заказчика», уведомление исполнителю", "Срок по умолчанию — из «Этапов и сроков»"], next: "Готово → снова 7" },
    "7": { t: "На согласовании", who: ["om"], term: function () { return d("p5"); },
      act: { om: ["Отправляет проект: «по договору у Вас 5 р.д. на замечания»", "Замечания — на «Корректировку», принято — «Сдано»"] },
      crm: ["Задача «Отправить проект заказчику» и готовое сообщение заказчику — после подтверждения", "Долго на стадии — задача «Уточнить судьбу проекта»"], next: "Замечания → 6.1 · принято → 8" },
    "8": { t: "Сдано · акт", who: ["om", "acc"], term: function () { return "акт и счёт — " + d("c1"); },
      act: { om: ["Заказчик принял — отмечает «Сдано»"], acc: ["Акт и счёт с учётом аванса — заказчику", "Отмечает «Акт отправлен»"] },
      crm: ["Бухгалтеру задача «Направить акт и счёт», уведомление бухгалтеру и руководителю", "Готовит заказчику сообщение «проект сдан» — после подтверждения"], next: "Акт и счёт отправлены → 9" },
    "n1": { t: "Исходные данные", who: ["om"], term: function () { return d("p1"); }, sub: "n1.1",
      act: { om: ["Собирает экспликацию, планы, число людей"] }, crm: ["Ставит операционному менеджеру задачу «Собрать исходные данные»"], next: "Данные собраны → Н2" },
    "n1.1": { t: "Выезд", who: ["om"], term: function () { return VISIT_TERM; },
      act: { om: ["Как 5.1: дата, доступ, выездной по городу", "Что снять для расчёта: помещения, нагрузка, пути эвакуации, люди"] }, crm: ["То же, что в 5.1"], next: "Выезд закрыт → Н2" },
    "n2": { t: "Расчёт", who: ["nt"], term: function () { return lab("p3"); },
      act: { nt: ["Выполняет расчёт", "Готово — «На проверку»"] }, crm: ["Срок по плану и по договору — напоминания"], next: "На проверку → Н3" },
    "n3": { t: "Проверка", who: ["dima", "om"], term: function () { return d("p4"); },
      act: { dima: ["Проверяет расчёт"], om: ["Задача «Проверить проект» — у операционного отдела: после проверки — «На согласование»"] },
      crm: ["Задача «Проверить проект» операционному отделу"], next: "Принято → Н4" },
    "n4": { t: "Выдано", who: ["om"], term: function () { return d("p5"); },
      act: { om: ["Выдаёт расчёт заказчику", "Замечания экспертизы / МЧС — на «Корректировку»", "Принято — отмечает «Сдано»"] },
      crm: ["Задача «Отправить проект заказчику»", "Долго на стадии — задача «Уточнить судьбу»", "«Сдано» — бухгалтеру задача «Направить акт и счёт», как в шаге 8"], next: "Акт и счёт отправлены → 9" },
    "9": { t: "Ждём оплату", who: ["acc"], term: function () { return lab("c2"); },
      act: { acc: ["Следит за оплатой"] }, crm: ["Оплата из 1С отмечается сама: статус и дата", "КП в реестре — «В постоплате», после оплаты — «Закрыто»"], next: "Оплачено → 10" },
    "10": { t: "Закрыто", who: ["acc", "rop"], term: function () { return lab("c3"); },
      act: { acc: ["Ставит «Закрыто»: акт подписан, оплата получена"], rop: ["«Постпродажное взаимодействие»: отзыв, ТО, допуслуги — задача у менеджера по продажам из КП, если его нет — у отдела продаж"] },
      crm: ["Уводит задачу в архив", "Через несколько дней — менеджеру по продажам из КП (если его нет — отделу продаж) задача «Постпродажное взаимодействие»"], next: "" },
    "11": { t: "⏸ Пауза по заказчику", who: ["om", "ivan"], term: function () { return "до даты возврата"; },
      act: { om: ["Ставит паузу на шагах 5–8, Н1–Н4: причина и дата возврата («Меню задачи» → «Пауза по заказчику»)", "«Вернуть» — на прежний шаг; «Продлить» — новая дата и причина"],
        ivan: ["Ставит паузу на проектных шагах 5–8: причина и дата возврата", "«Вернуть» — на прежний шаг"] },
      crm: ["Сроки и напоминания не идут, задача не просрочена; срок договора не меняется", "В дату возврата — задача «Пауза закончилась: вернуть или продлить» операционному менеджеру",
        "«Вернуть» — сроки служебных задач, план исполнителя и срок корректировки сдвигаются на рабочие дни паузы", "Заказчику ничего не уходит"], next: "«Вернуть» → прежний шаг" }
  };
  var ORDER = ["1", "2", "3", "4", "5", "5.1", "6", "6.1", "7", "8", "n1", "n1.1", "n2", "n3", "n4", "9", "10", "11"];      // порядок шагов в «Что делаю я»
  var RULES = ["У каждого шага один ответственный; дальше — по кнопке ответственного или автоматически, следующему приходит уведомление",
    "Сроки этапов и напоминаний — в рабочих днях (правит руководитель в «Этапах и сроках»)",
    "<b>Операционный менеджер — главный оператор CRM:</b> может менять направление, стадию, исполнителя, сроки, паузу, заказчика, выезды, корректировки на любом шаге",
    "Акт, счёт и «Закрыто» — бухгалтер",
    "Сообщения заказчику, которые готовит CRM, уходят только после подтверждения операционного менеджера",
    "Проектировщики отмечают отработанные дни в «План на неделю»"];

  function st() { var S = X().S; if (!S.hw) S.hw = { rg: RDEF[X().pos()] || "", open: "" }; return S.hw; }
  function no(k) { return k[0] === "n" ? "Н" + k.slice(1) : k; }
  function laneColor(k) { return k[0] === "n" ? "var(--sys)" : /^[1-4]$/.test(k) ? "var(--org)" : /^(9|10|11)$/.test(k) ? "var(--ok)" : "var(--brand)"; }
  function card(k, small) {
    var s = REG[k], w = st(), mine = !w.rg || s.who.indexOf(w.rg) >= 0;
    return '<button type="button" class="hw-c' + (small ? " sm" : "") + (mine ? (w.rg ? " my" : "") : " dim") + (w.open === k ? " on" : "") + '" data-hwo="' + k + '">'
      + '<span class="hw-h"><span class="hw-no">' + no(k) + "</span><b>" + s.t + "</b></span>"
      + '<span class="hw-w">' + s.who.map(function (r) { return '<i style="--rc:' + RROLE[r][1] + '">' + RROLE[r][0].split(" · ")[0] + "</i>"; }).join("") + "</span>"
      + '<span class="hw-t">⏱ ' + E(s.term()) + "</span>" + (s.next ? '<span class="hw-n">→ ' + s.next + "</span>" : "") + "</button>";
  }
  function col(k) { return '<div class="hw-col">' + card(k) + (REG[k].sub ? '<div class="hw-sub">' + card(REG[k].sub, 1) + "</div>" : "") + "</div>"; }
  function row(keys) { return '<div class="hw-row">' + keys.map(function (k, i) { return (i ? '<span class="hw-ar">→</span>' : "") + col(k); }).join("") + "</div>"; }
  function detail(k) {
    var s = REG[k];
    return '<div class="hw-pop" id="hwPop" style="--lc:' + laneColor(k) + '"><div class="hw-dh"><span class="hw-no big">' + no(k) + "</span><div><h3>" + s.t + "</h3><small>⏱ " + E(s.term()) + '</small></div><button type="button" class="x" data-hwo="" title="Закрыть">✕</button></div>'
      + s.who.map(function (r) { return '<div class="hw-dw"><b style="color:' + RROLE[r][1] + '">' + RROLE[r][0] + "</b><ul>" + (s.act[r] || []).map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul></div>"; }).join("")
      + (s.crm.length ? '<div class="hw-dw crm"><b>⚙ CRM делает сама</b><ul>' + s.crm.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul></div>" : "")
      + (s.next ? '<div class="hw-next">Дальше: <b>' + s.next + "</b></div>" : "") + "</div>";
  }
  function html() {
    var x = X(), w = st();
    if (!x.S.fl) return '<div class="head"><div><h1>Как работаем</h1></div></div><div class="note">' + E(x.S.err || "Нет данных") + "</div>";
    var head = '<div class="head hw-head"><div><h1>Как работаем</h1><p>Кто что делает на каждом шаге, сроки и что CRM делает сама. Нажмите на шаг — подробности.</p></div>'
      + '<div class="hw-btns"><button type="button" class="btn ghost" data-hwp="1" title="Распечатать схему">🖨 Печать</button><button type="button" class="btn ghost" data-hwl="1" title="Скопировать ссылку для сотрудника">🔗 Ссылка</button></div></div>';
    var chips = '<div class="hw-roles"><span class="vlab">Чья роль:</span><button type="button" class="hw-r' + (!w.rg ? " on" : "") + '" data-hwr="">Все</button>'
      + Object.keys(RROLE).map(function (k) { return '<button type="button" class="hw-r' + (w.rg === k ? " on" : "") + '" data-hwr="' + k + '" style="--rc:' + RROLE[k][1] + '"><i></i>' + RROLE[k][0] + "</button>"; }).join("") + "</div>";
    var flow = '<div class="hw-flow">'
      + '<div class="hw-lane sales"><div class="hw-lh">Продажи · общие</div>' + row(["1", "2", "3", "4"]) + "</div>"
      + '<div class="hw-split">⬇ Договор подписан и аванс получен — заказ идёт по направлению: проект или нормо-тех (по системам и услугам КП; сменить вручную — «Меню задачи»: руководитель, РОП, опер. менеджер)</div>'
      + '<div class="hw-lane proj"><div class="hw-lh">Проект</div>' + row(["5", "6", "7", "8"]) + "</div>"
      + '<div class="hw-lane norm"><div class="hw-lh">Нормо-техническая · расчёты и категории</div>' + row(["n1", "n2", "n3", "n4"]) + "</div>"
      + '<div class="hw-split">⬇ Акт и счёт отправлены</div>'
      + '<div class="hw-lane money"><div class="hw-lh">Деньги · общие</div>' + row(["9", "10"]).replace(/<\/div>$/, '<span class="hw-ar" style="opacity:0">→</span>' + col("11") + "</div>") + "</div></div>";      // шаг 11 «Пауза» — рядом с 9–10, как в макете
    var todo = "";
    if (w.rg) {
      var list = ORDER.filter(function (k) { return REG[k].act[w.rg]; });
      todo = '<div class="panel pad hw-todo"><h3 style="color:' + RROLE[w.rg][1] + '">Что делаю я · ' + RROLE[w.rg][0] + "</h3>" + list.map(function (k) {
        return '<div class="hw-ti"><button type="button" class="hw-no" data-hwo="' + k + '" style="--lc:' + laneColor(k) + '">' + no(k) + "</button><div><b>" + REG[k].t + " <small>· " + E(REG[k].term()) + "</small></b><ul>"
          + REG[k].act[w.rg].map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul></div></div>";
      }).join("") + "</div>";
    }
    var rules = '<div class="panel pad hw-rules"><h3>Общие правила</h3><ul>' + RULES.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul></div>";
    return '<div class="hw-page">' + head + chips + flow + '<div class="hw-low">' + todo + rules + "</div>" + (w.open && REG[w.open] ? detail(w.open) : "") + "</div>";
  }
  /* окно шага — рядом с карточкой (на телефоне — снизу экрана) */
  function place() {
    var pop = document.getElementById("hwPop"), w = st(); if (!pop || !w.open) return;
    var a = document.querySelector('#flow-app .hw-c[data-hwo="' + w.open + '"]') || document.querySelector('#flow-app .hw-ti [data-hwo="' + w.open + '"]');
    if (innerWidth < 760 || !a) { pop.classList.add("sheet"); return; }
    var host = pop.offsetParent || document.body, hr = host.getBoundingClientRect(), rc = a.getBoundingClientRect(), W = Math.min(360, innerWidth - 20), left, top;
    pop.style.width = W + "px";
    if (rc.right + 12 + W <= innerWidth - 10) { left = rc.right + 10; top = rc.top; }
    else if (rc.left - W - 12 >= 10) { left = rc.left - W - 10; top = rc.top; }
    else { left = Math.max(10, Math.min(rc.left, innerWidth - W - 10)); top = rc.bottom + 8; }
    var h = pop.offsetHeight; if (top + h > innerHeight - 10) top = Math.max(10, innerHeight - h - 10);
    pop.style.left = left - hr.left + "px"; pop.style.top = top - hr.top + "px";
  }
  function after() { place(); }

  function inside(e) { return !!(e.target.closest && e.target.closest("#flow-app .hw-page")); }
  document.addEventListener("click", function (e) {
    var w;
    if (!inside(e)) return;
    var t = e.target.closest("[data-hwo],[data-hwr],[data-hwp],[data-hwl]");
    if (!t) { if (!e.target.closest("#hwPop")) { w = st(); if (w.open) { w.open = ""; X().paint(); } } return; }
    var dd = t.dataset; w = st();
    if (dd.hwo != null) { w.open = dd.hwo && dd.hwo !== w.open ? dd.hwo : ""; return X().paint(); }
    if (dd.hwr != null) { w.rg = dd.hwr; return X().paint(); }
    if (dd.hwp) { document.body.classList.add("hw-printing"); setTimeout(function () { window.print(); }, 50); return; }
    if (dd.hwl) {
      var url = location.href.split("#")[0] + "#/flow";
      try { navigator.clipboard.writeText(url).then(function () { X().toast("Ссылка скопирована: " + url); }, function () { X().toast(url); }); } catch (er) { X().toast(url); }
    }
  });
  window.addEventListener("afterprint", function () { document.body.classList.remove("hw-printing"); });
  window.addEventListener("resize", function () { if (document.getElementById("hwPop")) place(); });

  window.DSWorkHow = { html: html, after: after };
})();
