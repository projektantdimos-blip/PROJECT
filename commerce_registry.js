(function () {
  "use strict";
  const host = parent === window ? null : parent.DS;
  const api = path => host.commerceApi(path);
  const send = (path, body) => host.commerceApi(path, body);
  const isPay = new URLSearchParams(location.search).get("view") === "payments";
  const $ = id => document.getElementById(id);
  const today = new Date();
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const now = iso(today);
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() + 6) % 7);
  const week = iso(monday);
  const month = now.slice(0, 7) + "-01";
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const money = n => (Number(n) || 0).toLocaleString("ru-RU", {maximumFractionDigits: 2}) + " ₽";
  const dm = s => s ? s.slice(8, 10) + "." + s.slice(5, 7) + "." + s.slice(0, 4) : "—";
  const shortDate = s => s ? dm(s).slice(0, 5) : "—";
  const bd = (a, b) => {
    if (!a || a > b) return 0;
    let d = new Date(a + "T12:00:00"), n = 0;
    const end = new Date(b + "T12:00:00");
    while (d < end) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() && d.getDay() !== 6) n++;
    }
    return n;
  };
  const open = new Set(["КП отправлено", "Доки отправлены", "В предоплате"]);
  const afterSale = new Set(["В работе", "В постоплате", "Закрыто"]);
  const refused = ["Дорого","Условия оплаты","Сроки","Дешевле у конкурента","Выбрали другого (не по цене)","Отложили","Пропал","Пока прицениваются","Не наш профиль","Другое (в комментарии)"];
  const payGroups = [
    ["bill", "Выставить счёт на остаток", "r", "Работы сданы, счёт ещё не выставлен"],
    ["late", "Просроченные оплаты", "r", "Срок оплаты или обещание клиента прошли · блок 4 пятничного отчёта"],
    ["wait", "Счёт выставлен, ждём оплату", "v", "Срок оплаты ещё не прошёл"],
    ["work", "В работе", "o", "Переданные КП и текущие заказы"],
    ["full", "Оплачено полностью", "g", "Оплаты за текущий месяц"],
    ["arch", "Архив оплат", "g", "Оплаты прошлых месяцев · история платежей в строке"]
  ];
  const kpGroups = [
    ["late", "Пропущен контакт", "r", "позвонить первыми"],
    ["today", "Позвонить сегодня", "w", "следующий контакт назначен на сегодня"],
    ["rest", "Дальше по графику", "o", ""],
    ["refused", "Архив отказов", "g", ""]
  ];
  const filterPay = [["all","Все","#fff","#1b3a5e"],["bill","Выставить счёт","#f6d3cf","#8a2a22"],
    ["late","Просроченные оплаты","#f8dfdc","#a5281b"],["wait","Ждём оплату","#ebe6f6","#3b2d66"],
    ["work","В работе","#dde7f6","#1d4f9e"],["full","Оплачено полностью","#d9efe0","#17653a"],["arch","Архив оплат","#e4e7ec","#4a5566"]];
  const filterKp = [["all","Все","#fff","#1b3a5e"],["sent","КП отправлено","#dde7f6","#1d4f9e"],
    ["advance","Ждём предоплату","#f6ead0","#7a5300"],["noprob","Без вероятности","#fdeeed","#a5281b"],["refused","Архив отказов","#e4e7ec","#4a5566"]];
  const headerTips = {
    "№ КП": "Номер КП в CRM.",
    "Заказчик": "Название заказчика и вид работ. Нажмите на синее название, чтобы открыть карточку.",
    "Дата выставления КП": "Когда КП отправили клиенту.",
    "Сумма КП": "Полная сумма по КП. У «Ждём предоплату» под суммой указано, сколько ждём от клиента.",
    "Статус": "Где сейчас КП. Наведите на метку статуса, чтобы прочитать пояснение.",
    "Вероятность": "Насколько вероятна продажа. Наведите на кнопку, чтобы узнать правило для каждого уровня.",
    "Последний контакт": "Рабочих дней с последнего контакта. <b>Зелёный</b> — до 2, <b>жёлтый</b> — 3–5, <b>красный</b> — больше 5. Больше 10 рабочих дней без ответа — звонок и письмо «Актуально ли КП?». Ещё 5 дней тишины — отказ «Пропал».",
    "Следующий контакт": "Когда связаться в следующий раз. Нажмите на дату, чтобы поменять. Красная дата означает, что срок контакта прошёл.",
    "Итог последнего контакта": "Что сказал клиент в последний раз и что дальше. Нажмите, чтобы записать новый итог. Последний контакт обновится на сегодня.",
    "Причина отказа": "Причина из общего списка. Те же причины используются в пятничном отчёте.",
    "Когда отказались": "Дата, когда записали отказ.",
    "Комментарий": "Личная заметка менеджера по КП. Она доступна этому менеджеру в обоих реестрах.",
    "Сумма по договору": "Полная сумма по договору. Полоска показывает разбивку на предоплату и остаток. Наведите на сумму, чтобы увидеть суммы, даты и статус оплаты.",
    "Предоплата": "Первый платёж. КП может появиться в реестре оплат после перевода кнопкой «В оплаты» или поступления предоплаты.",
    "Постоплата": "Остаток после сдачи работ. Наведите на метку, чтобы понять статус и следующий шаг.",
    "Этап работ": "Сдачу работ отмечают в карточке задачи. После сдачи проверьте, нужно ли выставить счёт на остаток.",
    "Срок оплаты": "<b>Акт подписан:</b> 5 рабочих дней от подписания или срок из договора. <b>Акт отправлен без подписи:</b> ещё 5 рабочих дней, по умолчанию всего 10 от счёта. Если даты счёта нет, отсчёт от отправки акта. <b>Доплата без акта:</b> 5 рабочих дней от счёта или срок из договора. Если исходной даты нет, срок можно назначить вручную.",
    "Обещали оплатить": "Дата, которую назвал клиент. Нажмите, чтобы поставить или поменять."
  };
  const probabilityTips = {
    low: "<b>Низкая</b> — нет ответа 5+ рабочих дней или клиент просто узнаёт цену и сравнивает.",
    mid: "<b>Средняя</b> — клиент отвечает и объект реальный, но срок и бюджет не названы.",
    high: "<b>Высокая</b> — клиент подтвердил интерес и назвал срок или бюджет, контакт был в последние 3 рабочих дня."
  };
  const quoteTips = {
    "КП отправлено": "КП у клиента, ждём решения. Узнайте решение и поставьте дату следующего контакта.",
    "Ждём предоплату": "Клиент согласился, ждём предоплату. Когда она поступит, КП появится в реестре оплат.",
    "Отказ": "Причина выбирается из общего списка. КП находится в архиве отказов."
  };
  const postTips = {
    paid: "<b>Оплачен</b> — деньги поступили. При опоздании указан срок просрочки.",
    late: "<b>Просрочка</b> — прошёл срок оплаты или обещанная клиентом дата. Свяжитесь с клиентом. Просроченные оплаты разбираются в блоке 4 пятничного отчёта.",
    wait: "<b>Счёт выставлен</b> — ждём оплату. Дата отсчитывается по условиям договора.",
    bill: "<b>Счёт не выставлен</b> — работа сдана. Выставьте счёт на остаток.",
    work: "<b>После сдачи работ</b> — счёт на остаток выставляется после отметки «Работа сдана»."
  };
  const tip = HTML => ' data-tip="'+esc(HTML)+'"';
  const explained = (label, cls, content) => '<span class="'+cls+'" tabindex="0"'+tip(content)+'>'+esc(label)+'</span>';
  const state = { rows: [], editable: false, filter: "all", ready: false, undo: null, busy: 0 };
  const noteWrites = new Map();
  const tooltip = $("rgTooltip");
  let undoTimer;
  let activeTip = null;
  function hideTip() {
    if (activeTip) activeTip.removeAttribute("aria-describedby");
    activeTip = null;
    tooltip.hidden = true;
  }
  function showTip(anchor) {
    if (!anchor || !anchor.dataset.tip || activeTip === anchor) return;
    hideTip();
    activeTip = anchor;
    tooltip.innerHTML = anchor.dataset.tip;
    tooltip.hidden = false;
    anchor.setAttribute("aria-describedby", tooltip.id);
    const rect = anchor.getBoundingClientRect();
    const left = Math.min(Math.max(8, rect.left + (rect.width - tooltip.offsetWidth) / 2), innerWidth - tooltip.offsetWidth - 8);
    const below = rect.bottom + 8;
    tooltip.style.left = Math.max(8, left) + "px";
    tooltip.style.top = Math.max(8, below + tooltip.offsetHeight <= innerHeight - 8 ? below : rect.top - tooltip.offsetHeight - 8) + "px";
  }
  document.addEventListener("pointerover", e => {
    if (e.pointerType === "touch") return;
    const anchor = e.target.closest("[data-tip]");
    if (anchor) showTip(anchor);
    else if (activeTip) hideTip();
  });
  document.addEventListener("pointerout", e => {
    if (activeTip && activeTip.contains(e.target) && !activeTip.contains(e.relatedTarget) && activeTip !== document.activeElement) hideTip();
  });
  document.addEventListener("focusin", e => showTip(e.target.closest("[data-tip]")));
  document.addEventListener("focusout", e => { if (activeTip === e.target) hideTip(); });
  document.addEventListener("click", e => {
    const anchor = e.target.closest("[data-tip]");
    if (anchor && !anchor.hasAttribute("data-action")) showTip(anchor);
    else if (!anchor) hideTip();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTip(); });
  window.addEventListener("scroll", hideTip, true);
  window.addEventListener("resize", hideTip);
  function status(text, error) {
    $("rgStatus").textContent = text;
    $("rgStatus").classList.toggle("rg-error", !!error);
  }
  function renderUndo() {
    const step = state.undo;
    $("rgUndo").disabled = !state.editable || !step || state.busy > 0 || noteWrites.size > 0;
    $("rgUndoLabel").textContent = step ? step.label + " · КП №" + step.number : "Нет действий для отмены";
    $("rgUndoQuick").disabled = $("rgUndo").disabled || +$("rgUndoQuick").dataset.step !== (step && step.id);
  }
  function hideUndoBar() {
    clearTimeout(undoTimer);
    $("rgUndoBar").hidden = true;
  }
  function offerUndo(result) {
    if (!result.changed || !result.undo || !state.undo || result.undo.id !== state.undo.id) return;
    hideUndoBar();
    $("rgUndoMessage").textContent = result.undo.label + " · КП №" + result.undo.number;
    $("rgUndoQuick").dataset.step = result.undo.id;
    $("rgUndoBar").hidden = false;
    renderUndo();
    undoTimer = setTimeout(hideUndoBar, 10000);
  }
  function received(r) { return r.payments.reduce((sum, p) => sum + p.amount, 0); }
  function left(r) { return Math.max(0, r.amount - received(r)); }
  function paymentDate(r) { return r.payments.map(p => p.date).filter(Boolean).sort().at(-1) || ""; }
  function payGroup(r) {
    if ((r.amount > 0 && left(r) <= 0) || (r.post_paid && (!r.adv_sum || r.adv_paid))) {
      const last = paymentDate(r);
      return last && last < month ? "arch" : "full";
    }
    if (r.delivered || r.status === "В постоплате") {
      if (r.due && r.due < now || r.pay_expect && r.pay_expect < now) return "late";
      if (r.invoice_date || r.due || r.status === "В постоплате") return "wait";
      if (r.delivered && r.post_sum > 0) return "bill";
    }
    return "work";
  }
  function kpGroup(r) {
    if (r.status === "Отказ") return "refused";
    if (r.next_contact === now) return "today";
    return r.next_contact && r.next_contact < now ? "late" : "rest";
  }
  function inRegister(r) {
    if (isPay) return r.status !== "Отказ" && (r.transferred || afterSale.has(r.status) || r.adv_paid || r.post_paid || r.payments.length);
    return r.status === "Отказ" || (!r.transferred && open.has(r.status) && !r.adv_paid && !r.post_paid && !r.payments.length);
  }
  function match(r, filter) {
    if (isPay) return filter === "all" ? payGroup(r) !== "arch" : payGroup(r) === filter;
    if (r.status === "Отказ") return filter === "refused";
    if (filter === "sent") return r.status === "КП отправлено";
    if (filter === "advance") return r.status !== "КП отправлено";
    return filter === "noprob" ? !r.pay_prob : filter === "all";
  }
  function period(r) {
    const q = $("rgSearch").value.trim().toLocaleLowerCase("ru");
    const from = $("rgFrom").value, to = $("rgTo").value;
    const day = $("rgDateMode").value === "next" ? r.next_contact
      : isPay ? (r.invoice_date || paymentDate(r) || r.issued_date || r.created_date) : (r.issued_date || r.created_date);
    return (!q || [r.number, r.order_number, r.customer, r.object].join(" ").toLocaleLowerCase("ru").includes(q))
      && (!(from || to) || day && (!from || day >= from) && (!to || day <= to));
  }
  function c(markup, cls = "") { return '<div class="c '+cls+'">'+markup+"</div>"; }
  const plain = (s, cls = "sb") => '<span class="'+cls+'">'+esc(s || "—")+'</span>';
  function button(action, label, r, cls = "", attrs = "") {
    return '<button type="button" class="b sm '+cls+'" data-action="'+action+'" data-id="'+r.id+'" '+attrs+'>'+label+'</button>';
  }
  const phone = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A18 18 0 0 1 4 6.2 2 2 0 0 1 6 4h3l2 5-2.5 1.5a14 14 0 0 0 5 5L15 13z"/></svg>';
  function customer(r) {
    const name = r.customer || "заказчик не указан";
    const link = state.editable || r.order_id ? '<button type="button" class="nm lk" data-action="open" data-id="'+r.id+'" title="Открыть карточку">'+esc(name)+' <span class="ar">↗</span></button>' : plain(name, "nm");
    const call = state.editable ? '<button type="button" class="rg-call" data-action="call" data-id="'+r.id+'" title="'+(r.contacts.length ? "Позвонить" : "У заказчика нет номера телефона")+'" aria-label="Позвонить по КП '+esc(r.number)+'"'+(r.contacts.length ? "" : " disabled")+'>'+phone+'</button>' : "";
    const note = '<textarea rows="1" class="manager-note" data-note="'+r.id+'" maxlength="1000" aria-label="Заметка менеджера по КП '+esc(r.number)+'" placeholder="Заметка менеджера"'+(state.editable ? "" : " readonly")+'>'+esc(r.note)+'</textarea>';
    return c(link + plain(r.object, "ob") + (r.systems ? '<p class="wk"><b>Вид работ:</b> '+esc(r.systems)+'</p>' : "") + '<div class="row-tools">'+note+call+'</div>', "l");
  }
  function contact(r) {
    if (!r.last_contact) return plain("—");
    const age = bd(r.last_contact, now);
    return plain(age ? age + " р.д. назад" : "сегодня", "pr " + (age >= 3 ? "late" : "ok")) + plain(shortDate(r.last_contact));
  }
  function dateControl(r, key) {
    const day = r[key];
    const text = day ? shortDate(day) : "Назначить";
    if (!state.editable) return plain(day ? text : "—");
    return button(key === "next_contact" ? "next" : "expect", esc(text), r, "inl", 'title="Изменить дату"');
  }
  function prob(r) {
    return '<div class="seg'+(r.pay_prob ? "" : " need")+'">'+[["low","низкая","v1"],["mid","средняя","v2"],["high","высокая","v3"]].map(([key, label, tone]) =>
      '<button type="button" class="'+tone+(r.pay_prob === key ? " on" : "")+'" data-action="prob" data-id="'+r.id+
      '" data-value="'+key+'" aria-pressed="'+(r.pay_prob === key)+'"'+(state.editable ? "" : " disabled")+'>'+label+'</button>').join("")+'</div>';
  }
  function prefix(r, i) { return c(plain(i + 1, "nb")) + c(plain("№" + r.number, "kp")) + customer(r); }
  function kpRow(r, i) {
    const archive = r.status === "Отказ";
    const statusName = archive ? "Отказ" : r.status === "КП отправлено" ? r.status : "Ждём предоплату";
    const actions = !state.editable ? "" : archive ? (r.order_id ? "" : button("restore", "Вернуть в работу", r)) :
      button("transfer", "В оплаты", r, "", 'data-transfer title="Передать в реестр оплат"') +
      (r.order_id ? "" : button("refuse", "Отказ", r, "rfo"));
    const latest = r.last_touch || r.comment;
    const touch = state.editable && !archive ? button("touch", esc(latest || "Записать итог") + (latest ? '<small class="pen">записать итог</small>' : ""), r, "inl") : plain(r.refuse_note || latest);
    const statusChip = plain(statusName, "chip " + (archive ? "rg-refused" : statusName === "КП отправлено" ? "rg-sent" : "rg-advance"));
    return prefix(r, i) + c(plain(dm(r.issued_date || r.created_date), "dt")) + c(plain(money(r.amount), "am")) +
      c(statusChip + (state.editable && r.status === "КП отправлено" && !r.order_id && r.adv_sum > 0
        ? button("advance", "Ждём предоплату", r, "rg-stage") : "")) +
      c(archive ? plain(r.refuse_reason) : prob(r)) + c(archive ? plain(dm(r.status_date), "dt") : contact(r)) +
      c(archive ? plain("—") : dateControl(r, "next_contact")) + c(touch, "l") + c(actions, "acts");
  }
  function payRow(r, i) {
    const group = payGroup(r), paid = received(r);
    const paidAdvance = r.payments.filter(p => p.kind === "advance").reduce((s, p) => s + p.amount, 0);
    const split = r.amount > 0 ? Math.min(100, Math.max(0, Math.round(r.adv_sum / r.amount * 100))) : 0;
    const summary = plain(money(r.amount), "am") + '<span class="spl" aria-hidden="true"><i style="width:'+split+'%;background:#4f8a68"></i><i style="width:'+(100-split)+'%;background:#d08a4e"></i></span>' +
      plain(split+" / "+(100-split)) + (paid > 0 ? '<span class="rg-payment-detail" title="'+esc(r.payments.map(p => dm(p.date)+" · "+money(p.amount)).join("\n"))+'">'+esc("Получено "+money(paid))+'</span>' : "");
    const stage = group === "full" || group === "arch" ? "Оплачено полностью" : group === "work" ? "В работе" : "Работа сдана";
    const due = r.due ? plain(dm(r.due), "pd " + (group === "late" ? "late" : "ok")) + plain(r.due_event) :
      group === "bill" ? plain("Считается после выставления счёта") : plain("—");
    const actions = state.editable ? (group === "bill" ? button("invoice", "✓ Счёт выставлен", r, "inv") : "") +
      (group === "full" || group === "arch" ? button("open", "Открыть", r) : button("touch", "Итог звонка", r, "bl")) : "";
    const adv = r.adv_sum ? plain(money(r.adv_sum), "am") + plain(r.adv_paid ? "Оплачен" : paidAdvance ? "Получено " + money(paidAdvance) : "Оплата не поступила", "ps " + (r.adv_paid ? "paid" : "none")) : plain("—");
    const post = r.post_sum ? plain(money(r.post_sum), "am") + plain(r.post_paid ? "Оплачен" : group === "bill" ? "Счёт не выставлен" :
      group === "late" ? "Просрочено" : group === "wait" ? "Счёт выставлен" : "После сдачи работ", "ps " + (r.post_paid ? "paid" : group)) : plain("—");
    const stageNote = group === "work" && r.adv_paid ? "Предоплата получена, работа идёт"
      : r.transferred && group === "work" ? "Передано из реестра КП"
      : r.delivered_on ? "Сдано " + shortDate(r.delivered_on) : r.order_stage;
    return prefix(r, i) + c(summary) + c(adv) + c(post) + c(plain(stage, "chip rg-sent") + plain(stageNote)) +
      c(due) + c(group === "full" || group === "arch" ? plain("—") : dateControl(r, "pay_expect")) + c(contact(r)) + c(actions, "acts");
  }
  function header() {
    const labels = isPay ? ["№","№ КП","Заказчик","Сумма по договору","Предоплата","Постоплата","Этап работ","Срок оплаты","Обещали оплатить","Последний контакт","Действия"]
      : ["№","№ КП","Заказчик","Дата выставления КП","Сумма КП","Статус",state.filter === "refused" ? "Причина отказа" : "Вероятность","Последний контакт","Следующий контакт","Итог последнего контакта","Действия"];
    return '<div class="tr hd">'+labels.map((label, i) => c(esc(label)+(i === 2 ? '<small>объект и вид работ</small>' : ""), i === 2 ? "l" : "")).join("")+'</div>';
  }
  function sum(rows, get) { return rows.reduce((total, r) => total + get(r), 0); }
  function kpis(all, shown) {
    const tiles = [];
    if (isPay) {
      const wait = shown.filter(r => payGroup(r) === "wait"), late = shown.filter(r => payGroup(r) === "late");
      const incoming = shown.flatMap(r => r.payments).filter(p => p.date >= week && p.date <= now);
      tiles.push(["#7a66b0","Ждём оплату по счетам",money(sum(wait, left)),"КП",wait.length,"Срок оплаты по договору ещё не прошёл."],
        ["#c0675f","Просроченные оплаты",money(sum(late, left)),"КП",late.length,"Срок оплаты или обещание клиента прошли."],
        ["#4f8a68","Пришло на этой неделе",money(sum(incoming, p => p.amount)),"оплат",incoming.length,"Поступления с понедельника."]);
    } else {
      const newKp = all.filter(r => r.issued_date >= week && r.issued_date <= now && match(r, "all"));
      const high = shown.filter(r => r.pay_prob === "high" && r.status !== "Отказ");
      const sold = state.rows.filter(r => r.payments.some(p => p.date >= week && p.date <= now));
      const rejects = all.filter(r => r.status === "Отказ" && r.status_date >= week && r.status_date <= now);
      tiles.push(["#6f82a8","Новые КП за неделю",money(sum(newKp, r => r.amount)),"КП",newKp.length,"Выставлены с понедельника."],
        ["#5b84c4","КП без оплаты",money(sum(shown.filter(r => r.status !== "Отказ"), r => r.amount)),"КП",shown.filter(r => r.status !== "Отказ").length,"Выставленные КП без поступлений."],
        ["#4f8a68","Высокая вероятность продажи",money(sum(high, r => r.amount)),"КП",high.length,"КП с высокой вероятностью оплаты."],
        ["#7a66b0","Итог недели","Продано "+sold.length+" · Отказы "+rejects.length,"продано на",money(sum(sold, r => r.amount)),"Факты оплаты и отказы за неделю."]);
    }
    return tiles.map(([tone, label, value, unit, count, text]) => '<div class="kpi" style="background:'+tone+'"><span class="lb">'+esc(label)+'</span><b>'+esc(value)+'</b><span class="ds">'+esc(text)+'</span><div class="gl"><span>'+esc(unit)+'</span><strong>'+esc(count)+'</strong></div></div>').join("");
  }
  function render() {
    renderUndo();
    const rows = state.rows.filter(inRegister);
    const inPeriod = rows.filter(period);
    const shown = inPeriod.filter(r => match(r, state.filter));
    const filters = isPay ? filterPay : filterKp;
    $("rgFilters").innerHTML = filters.map(([key, label, bg, color]) => '<button type="button" class="ft'+(key === state.filter ? " on" : "")+
      '" data-action="filter" data-value="'+key+'" aria-pressed="'+(key === state.filter)+'" style="background:'+bg+';color:'+color+'">'+label+
      ' · '+inPeriod.filter(r => match(r, key)).length+'</button>').join("");
    $("rgKpis").innerHTML = kpis(inPeriod, shown);
    let i = 0, markup = header();
    (isPay ? payGroups : kpGroups).forEach(([key, title, tone, help]) => {
      const group = shown.filter(r => (isPay ? payGroup(r) : kpGroup(r)) === key);
      if (!group.length) return;
      if (!isPay && key !== "refused") group.sort((a,b) => (a.next_contact || "9").localeCompare(b.next_contact || "9"));
      if (isPay && key === "work") {
        const paid = group.some(r => r.adv_paid);
        if (paid) help = "Предоплата получена, работа идёт" + (group.some(r => !r.adv_paid) ? " · также КП, переданные в работу без поступления оплаты" : "");
      }
      markup += '<div class="tr grp '+tone+'">'+("<span class=\"c\"></span>").repeat(11)+'<span class="gl">'+title+' · '+group.length+
        (help ? ' <small>'+help+'</small>' : "")+'</span></div>';
      markup += group.map(r => '<div class="tr '+tone+(i % 2 ? " z" : "")+'">'+(isPay ? payRow(r,i++) : kpRow(r,i++))+'</div>').join("");
    });
    if (!shown.length) markup += '<div class="empty">'+(state.ready ? "Ничего не найдено. Измените фильтр или поиск." : "Загрузка…")+'</div>';
    $("rgTable").innerHTML = markup;
    $("rgCount").textContent = "Строк: " + shown.length;
  }
  async function load() {
    try {
      const data = await api("/commerce/registry");
      state.rows = data.rows;
      state.editable = data.editable;
      state.undo = data.undo;
      state.ready = true;
      $("rgMeta").textContent = [dm(now), data.name].filter(Boolean).join(" · ");
      document.querySelector('[data-action="create"]').hidden = isPay || !state.editable;
      render();
      status("");
    } catch (e) {
      state.ready = true;
      render();
      status(String(e), true);
    }
  }
  async function mutate(path, body, control) {
    if (control) control.disabled = true;
    state.busy++;
    renderUndo();
    try {
      await Promise.allSettled(noteWrites.values());
      const result = await send(path, body);
      $("rgModal").close();
      await load();
      if (path === "/commerce/undo") {
        hideUndoBar();
        status("Действие отменено");
      } else offerUndo(result);
    } catch (error) {
      status(String(error), true);
      const message = $("rgModal").querySelector(".rg-error");
      if ($("rgModal").open && message) message.textContent = String(error);
    } finally {
      state.busy--;
      if (control && control.dataset.action !== "undo") control.disabled = false;
      renderUndo();
    }
  }
  function edit(r, action, values, control) {
    return mutate("/commerce/registry/"+r.id, {action:action, ...values}, control);
  }
  function dialog(title, content, submit) {
    const modal = $("rgModal");
    modal.innerHTML = '<form><div class="mh"><h3 id="rgModalTitle">'+esc(title)+'</h3><button type="button" class="x" aria-label="Закрыть">×</button></div><div class="mb">'+content+
      '<span class="rg-error" role="status"></span></div><div class="mf"><button type="submit" class="b bl">Сохранить</button></div></form>';
    modal.querySelector(".x").onclick = () => modal.close();
    const form = modal.querySelector("form");
    form.onsubmit = e => { e.preventDefault(); submit(new FormData(form), form.querySelector('[type="submit"]')); };
    modal.showModal();
  }
  function changeDate(r, key) {
    const label = key === "next_contact" ? "Следующий контакт" : "Обещали оплатить";
    dialog(label, '<label>'+label+' <input class="mdate" name="date" type="date" value="'+esc(r[key])+'"></label>', (form, b) =>
      edit(r, key === "next_contact" ? "next" : "expect", {text:form.get("date")}, b));
  }
  function call(r) {
    if (r.contacts.length === 1) {
      host.commerceCall(r.contacts[0], r);
      return;
    }
    dialog("Позвонить · "+r.customer, '<label>Контакт <select name="phone" required>'+r.contacts.map((p,i) =>
      '<option value="'+i+'">'+esc([p.name,p.phone].filter(Boolean).join(" · "))+'</option>').join("")+'</select></label>', fields => {
      $("rgModal").close();
      host.commerceCall(r.contacts[Number(fields.get("phone"))], r);
    });
    $("rgModal").querySelector('[type="submit"]').textContent = "Позвонить";
  }
  function touch(r) {
    const promise = isPay ? '<label>Клиент назвал дату оплаты <input class="mdate" name="promise" type="date" value="'+esc(r.pay_expect)+'"></label>' : "";
    dialog("Итог звонка по КП "+r.number, '<label>Касание <select name="kind">'+["Звонок","Письмо","Мессенджер","Встреча"].map(k => '<option>'+k+'</option>').join("")+
      '</select></label><label>Итог<textarea name="note" maxlength="300"></textarea></label>'+promise+'<label>Следующий контакт <input class="mdate" name="next" type="date" required min="'+now+'" value="'+esc(r.next_contact >= now ? r.next_contact : "")+'"></label>', (f,b) =>
      edit(r,"touch",{kind:f.get("kind"),next_contact:f.get("next"),text:f.get("note"),pay_expect:f.get("promise")},b));
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-action]");
    if (!b || !host) return;
    const action = b.dataset.action;
    if (action === "undo") {
      if (state.undo && !b.disabled && (!b.dataset.step || +b.dataset.step === state.undo.id)) mutate("/commerce/undo", {step_id:state.undo.id}, b);
      return;
    }
    if (action === "create") { parent.location.hash = "#/kpc"; return; }
    if (action === "filter") { state.filter = b.dataset.value; render(); return; }
    if (action === "month" || action === "all") {
      $("rgFrom").value = action === "month" ? month : "";
      $("rgTo").value = action === "month" ? now : "";
      render(); return;
    }
    const r = state.rows.find(row => row.id === +b.dataset.id);
    if (!r) return;
    if (action === "open") { host.commerceOpen(r); return; }
    if (!state.editable) return;
    if (action === "call") call(r);
    else if (action === "touch") touch(r);
    else if (action === "next" || action === "expect") changeDate(r, action === "next" ? "next_contact" : "pay_expect");
    else if (action === "due") dialog("Назначить срок оплаты", '<label>Срок оплаты <input class="mdate" name="date" type="date" required value="'+esc(r.due_manual ? r.due : "")+'"></label>',
      (f, btn) => edit(r, "due", {text:f.get("date")}, btn));
    else if (action === "prob") edit(r, "prob", {text:r.pay_prob === b.dataset.value ? "" : b.dataset.value}, b);
    else if (action === "refuse") dialog("Причина отказа", '<label>Причина <select name="reason" required><option value="">выбрать</option>'+
      refused.map(v => '<option>'+esc(v)+'</option>').join("")+'</select></label>', (f, btn) =>
      edit(r, "refuse", {text:f.get("reason")}, btn));
    else if (action === "restore") dialog("Вернуть КП в работу", '<label>Следующий контакт <input class="mdate" name="next" type="date" required min="'+now+'" value="'+esc(r.next_contact >= now ? r.next_contact : "")+'"></label>', (f,btn) =>
      edit(r, "restore", {next_contact:f.get("next")}, btn));
    else if (action === "advance") {
      if (r.next_contact) edit(r, "advance", {}, b);
      else dialog("Ждём предоплату", '<label>Следующий контакт <input class="mdate" name="next" type="date" required min="'+now+'"></label>', (f,btn) =>
        edit(r, "advance", {next_contact:f.get("next")}, btn));
    }
    else if (action === "transfer" || action === "invoice") edit(r, action, {}, b);
  });
  document.addEventListener("change", e => {
    if (["rgDateMode","rgFrom","rgTo"].includes(e.target.id)) { render(); return; }
    const input = e.target.closest("[data-note]");
    if (!input || !state.editable) return;
    const id = +input.dataset.note, text = input.value;
    const row = state.rows.find(r => r.id === id);
    if (!row || row.note === text) return;
    const previous = row.note;
    row.note = text;
    const pending = Promise.resolve(noteWrites.get(id)).catch(() => {}).then(() => send("/commerce/registry/"+id, {action:"note",text}));
    noteWrites.set(id, pending);
    renderUndo();
    status("Сохраняем заметку…");
    pending.then(result => {
      if (noteWrites.get(id) === pending) {
        noteWrites.delete(id);
        if (result.undo && (!state.undo || result.undo.id >= state.undo.id)) state.undo = result.undo;
        renderUndo();
        offerUndo(result);
        status("Заметка сохранена");
      }
    }, err => {
      if (noteWrites.get(id) === pending) {
        noteWrites.delete(id);
        row.note = previous;
        renderUndo();
        status(String(err), true);
      }
    });
  });
  $("rgSearch").addEventListener("input", render);
  $("rgTitle").textContent = isPay ? "Реестр оплат" : "Реестр КП";
  $("rgIntro").textContent = isPay ? "Счета и оплаты по КП. Переданные из реестра КП позиции появляются в группе «В работе»."
    : "Выставленные КП без оплаты. Звоните, указывайте вероятность и дату следующего контакта. Чтобы передать КП, нажмите «В оплаты».";
  $("rgTable").classList.add(isPay ? "pyt" : "kpt");
  if (isPay) { document.body.classList.add("payment-preview"); $("rgDateMode").options[0].textContent = "по дате счёта или оплаты"; }
  render();
  if (host && host.commerceApi) load();
  else status("Откройте реестр из раздела «Коммерция» CRM.", true);
  window.refreshCommerceRegistry = load;
})();
