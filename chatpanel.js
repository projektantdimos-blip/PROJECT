/* Проекты DS — боковая панель диалога с заказчиком (переписка Telegram / MAX / почта):
   вкладка «Заказчик» (привязка диалога к заказчику, его задачи и КП) и вкладка «КП» (КП из диалога:
   услуги из прайс-листа, запись в реестр КП с датой выставления и отправка текста заказчику в этот же диалог).
   Данные только с моста (/api/ds); доступ у продаж, операционного менеджера и руководителя. */
(function () {
  "use strict";
  var D = window.MPBD = {};
  var per = {};                       // состояние по диалогам: { tab, kp: {object, pay, items}, link, err }
  var price = null;

  function $(id) { return document.getElementById(id); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return Math.round(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function C() { return window.MPBC; }
  function api(path, body) { return C().call("/../ds" + path, body ? { body: body } : {}); }
  function toast(m) { if (window.MPBT && MPBT.toast) MPBT.toast(m); else if (window.toast) window.toast(m); }
  function st(t) { return per[t.id] || (per[t.id] = { tab: "c", err: "", busy: false, link: null, kp: null }); }

  var css = document.createElement("style");
  css.textContent = ".dsp .tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:0 0 12px}.dsp .tabs button{padding:8px 12px;font-weight:700;color:var(--muted);border-bottom:3px solid transparent;background:none;border-top:0;border-left:0;border-right:0;cursor:pointer}.dsp .tabs button.on{color:var(--brand);border-color:var(--brand)}"
    + ".dsp .card{display:flex;gap:10px;align-items:center;padding:9px 11px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;background:var(--surface-2,var(--surface));font-size:.88rem;cursor:pointer;text-decoration:none;color:inherit}.dsp .card small{display:block;color:var(--muted)}"
    + ".dsp .f{margin-bottom:10px}.dsp .f label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px}.dsp .f input,.dsp .f select{width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);color:var(--ink)}"
    + ".dsp .sv{display:flex;gap:8px;align-items:center;padding:6px 8px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px;font-size:.84rem}.dsp .sv.on{border-color:var(--brand-2);background:var(--brand-soft)}.dsp .sv span{flex:1}.dsp .sv input[type=number]{width:96px;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface);color:var(--ink)}"
    + ".dsp .err{color:var(--bad);font-weight:600;margin:6px 0;font-size:.84rem}.dsp .tot{padding:10px 12px;border-radius:12px;background:var(--surface-2,var(--surface));border:1px solid var(--line);margin:8px 0}.dsp .note{font-size:.8rem;color:var(--muted);margin:6px 0}"
    + ".dsp .pc-name{font-size:1.05rem;font-weight:800;margin:0 0 8px}.dsp .pc-reg{font-size:.7rem;font-weight:700;color:var(--ok);margin-left:6px}"
    + ".dsp .pl{display:flex;flex-direction:column;margin:0 0 7px}.dsp .pl small{color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.6px;font-weight:700}.dsp .pl span{font-size:.92rem;overflow-wrap:anywhere}"
    + ".dsp .pb{border-radius:14px;padding:11px 13px;margin-top:12px;border:1px solid}.dsp .pb h5{margin:0 0 8px;font-size:.74rem;text-transform:uppercase;letter-spacing:1px;font-weight:800}"
    + ".dsp .pb-blue{background:color-mix(in srgb,#378ADD 12%,transparent);border-color:#378ADD}.dsp .pb-blue h5{color:#378ADD}"
    + ".dsp .pb-purple{background:color-mix(in srgb,#7F77DD 13%,transparent);border-color:#7F77DD}.dsp .pb-purple h5{color:#7F77DD}"
    + ".dsp .pb-gray{background:var(--surface-2,var(--surface));border-color:var(--line)}.dsp .pb-gray h5{color:var(--muted)}"
    + ".dsp .pi{display:block;padding:7px 0;border-top:1px dashed var(--line);text-decoration:none;color:inherit;font-size:.88rem}.dsp .pb h5+.pi{border-top:0}.dsp .pi small{display:block;color:var(--muted)}"
    + ".dsp .pb-orange{background:color-mix(in srgb,#EF9F27 16%,transparent);border-color:#EF9F27}.dsp .pb-orange h5{color:#BA7517}"
    + ".dsp .pt{padding:8px 0;border-top:1px dashed var(--line)}.dsp .pb h5+.pt{border-top:0}.dsp .pt small{display:block;color:var(--muted)}.dsp .pbtn{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}"
    + ".dsp .card em{margin-left:auto;font-style:normal;font-weight:700;font-size:.8rem;color:var(--blue);white-space:nowrap}.dsp .card:hover{border-color:var(--brand-2)}.dsp .card>span{min-width:0}"
    + ".dsp .lnk{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:-2px 0 10px;font-size:.82rem;color:var(--ok)}.dsp .lnk b{font-weight:700}.dsp .lnk a{color:var(--blue);font-weight:600}.dsp .lnk a[data-sure]{color:var(--bad)}"
    + ".dsp .och{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.dsp .och button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;padding:2px 8px;font:inherit;font-size:.76rem;cursor:pointer}.dsp .och button:hover{border-color:var(--blue);color:var(--blue)}"
    + ".dsp .dsp-find input{border-color:var(--brand-2)}";
  document.head.appendChild(css);

  D.render = function (box, t, name) {
    var s = st(t);
    if (!C() || !MPBC.loggedIn()) { box.innerHTML = '<div class="dsp"><p class="note">Войдите, чтобы работать с заказчиком.</p></div>'; return; }
    box.innerHTML = '<div class="dsp"><div class="tabs">' + [["c", "Заказчик"], ["k", "КП из диалога"]].map(function (x) { return '<button data-t="' + x[0] + '" class="' + (s.tab === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + '</div><div id="dspBody"></div></div>';
    box.querySelectorAll(".tabs button").forEach(function (b) { b.onclick = function () { s.tab = b.dataset.t; s.err = ""; D.render(box, t, name); }; });
    var body = $("dspBody");
    body.innerHTML = '<p class="note">Загрузка…</p>';
    if (s.link) setChip(t, s.link);                       // метка в шапке — сразу по прошлым данным, пока грузится свежая привязка
    api("/threads/" + encodeURIComponent(t.id) + "/link?title=" + encodeURIComponent(name || "") + "&peer=" + encodeURIComponent(t.peer || "")).then(function (l) {
      s.link = l;
      setChip(t, l);
      if (!document.body.contains(body)) return;           // пока ждали ответ, открыли другой диалог — панель уже другая
      if (s.tab === "k") tabKp(body, t, name, s, box); else tabCustomer(body, t, name, s, box);
      if (s.focusUntil > Date.now() && $("dspQ")) $("dspQ").focus();
    }, function (e) { body.innerHTML = '<p class="err">' + E(e) + "</p>"; });
  };

  function again(box, t, name) { D.render(box, t, name); }

  /* Метка в шапке диалога: к какому заказчику и задаче привязан диалог (или «Привязать к задаче») */
  function setChip(t, l) {
    var b = $("chatLinkChip");
    if (!b || b.getAttribute("data-tid") !== t.id) return;
    var on = !!(l && l.customer && !l.service), o = on ? (l.orders || []).filter(function (x) { return x.stage !== "Закрыто"; }) : [];
    b.className = "chat-link " + (on ? "on" : "off");
    b.innerHTML = on ? "🔗 <span>" + E(l.customer.name) + (o.length === 1 ? " · №" + E(o[0].number) : o.length ? " · " + o.length + (o.length % 10 === 1 && o.length % 100 !== 11 ? " задача" : o.length % 10 >= 2 && o.length % 10 <= 4 && (o.length % 100 < 10 || o.length % 100 >= 20) ? " задачи" : " задач") : "") + "</span>" : "🔗 <span>Привязать к задаче</span>";
    b.title = on ? "Диалог привязан к заказчику «" + l.customer.name + "»" + (o.length ? ", задачи: " + o.map(function (x) { return "№" + x.number; }).join(", ") : "") + ". Нажмите, чтобы сменить или отвязать"
      : "Диалог не привязан: найдите задачу по номеру, заказчику или объекту";
  }
  /* Открыть поиск привязки (метка в шапке, «⋯» в списке диалогов): курсор сразу в поиск, при перерисовке панели — тоже */
  D.find = function (tid) {
    var s = per[tid] || (per[tid] = { tab: "c", err: "", busy: false, link: null, kp: null });
    s.tab = "c"; s.find = true; s.focusUntil = Date.now() + 2500;
    var i = $("dspQ");
    if (i && s.link) { i.focus(); return true; }
    return false;
  };
  D.wantsFocus = function (tid) { var s = per[tid]; return !!(s && s.focusUntil > Date.now()); };
  D.chip = function (t) { var s = per[t.id]; if (s && s.link) setChip(t, s.link); };
  function ordersNote(list) {
    return list && list.length ? " · задачи: " + list.map(function (o) { return "№" + o.number; }).join(", ") : "";
  }
  /* Поиск, к чему привязать диалог: задачи (номер, заказчик, объект) и заказчики (название, ФИО, телефон, почта) */
  function findHtml(s) {
    return '<div class="f dsp-find" style="margin:8px 0 6px"><input id="dspQ" type="search" autocomplete="off" placeholder="№ задачи, заказчик, объект, телефон…" value="' + E(s.q || "") + '"></div><div id="dspRes"></div>';
  }
  function bindFind(t, s, pick) {
    var inp = $("dspQ"), res = $("dspRes"), timer = 0, seq = 0, first = null;
    if (!inp) return;
    function run() {
      var q = inp.value.trim(); s.q = q; first = null;
      if (q.length < 2) { res.innerHTML = q ? '<p class="note">Введите хотя бы 2 символа</p>' : ""; return; }
      var my = ++seq;
      api("/threads/" + encodeURIComponent(t.id) + "/find?q=" + encodeURIComponent(q)).then(function (r) {
        if (my !== seq || !document.body.contains(res)) return;
        var items = r.orders.map(function (o) {
          return { order_id: o.id, name: o.customer, label: "№" + o.number + (o.customer ? " · " + o.customer : ""),
                   html: "<b>№" + E(o.number) + " · " + E(o.customer || "без заказчика") + "</b><small>" + E(o.object) + (o.stage ? " · " + E(o.stage) : "") + "</small>" };
        }).concat(r.customers.map(function (x) {
          return { customer_id: x.id, name: x.name, label: x.name, html: "<b>" + E(x.name) + "</b><small>совпало: " + E(x.why) + E(ordersNote(x.orders)) + "</small>" };
        }));
        res.innerHTML = items.map(function (x, i) { return '<div class="card" data-pk="' + i + '"><span>' + x.html + "</span><em>Привязать</em></div>"; }).join("")
          || '<p class="note">Ничего не найдено — проверьте номер или название.</p>';
        first = items[0] || null;
        res.querySelectorAll("[data-pk]").forEach(function (n) { n.onclick = function () { pick(items[+n.dataset.pk]); }; });
      }, function (e) { res.innerHTML = '<p class="err">' + E(e) + "</p>"; });
    }
    inp.oninput = function () { clearTimeout(timer); timer = setTimeout(run, 250); };
    inp.onkeydown = function (e) {               // Enter — привязать к первому найденному
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (first) pick(first); else { clearTimeout(timer); run(); }
    };
    if (s.q) run();
  }
  function linkTo(box, t, name, s, p) {
    api("/threads/" + encodeURIComponent(t.id) + "/link", p.order_id ? { order_id: p.order_id } : { customer_id: p.customer_id }).then(function (r) {
      s.find = false; s.q = ""; s.err = ""; s.sure = false; s.create = false;
      toast("Диалог привязан: " + (p.order_id ? p.label : r.customer || p.label));
      if (window.__chatTasksRefresh) window.__chatTasksRefresh();
      again(box, t, name);
    }, function (e) { toast(String(e)); });
  }

  function tabCustomer(body, t, name, s, box) {
    var l = s.link, h = "";
    if (l.customer) {
      var c = l.customer, ct = l.contact || (c.contacts || [])[0] || {};          // контакт именно этого диалога
      var ph = ct.phone || (l.service ? "" : (c.contacts || []).map(function (x) { return x.phone; }).filter(Boolean)[0] || "");
      var ml = ct.email || (l.service ? "" : (c.contacts || []).map(function (x) { return x.email; }).filter(Boolean)[0] || "");
      function dmy(d) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d || ""); return m ? m[3] + "." + m[2] + "." + m[1] : ""; }
      function line(label, v) { return '<div class="pl"><small>' + label + "</small><span>" + (v ? E(v) : "—") + "</span></div>"; }
      if (l.can_edit && (s.edit || (l.service && !s.skipSvc))) { editForm(body, t, name, s, box, l, ct, ph, ml); return; }
      h += '<div class="pc-name">' + E(c.name) + (c.regular ? ' <span class="pc-reg">постоянный</span>' : "")
        + (l.can_edit ? ' <a href="#" id="dspEdit" class="note" style="font-weight:600;margin-left:6px">✎ Изменить</a>' : "") + "</div>";
      if (l.can_edit) h += '<div class="lnk">🔗 <b>Диалог привязан к этому заказчику</b>' + (s.find ? "" : ' · <a href="#" id="dspRelink">Сменить</a>')
        + ' · <a href="#" id="dspUnlink"' + (s.sure ? " data-sure" : "") + ">" + (s.sure ? "Точно отвязать?" : "Отвязать") + "</a></div>"
        + (s.find ? '<div class="pb pb-orange" style="margin:0 0 12px"><h5>Перепривязать к другой задаче или заказчику</h5>' + findHtml(s)
          + '<a href="#" id="dspFindX" class="note">Отмена</a></div>' : "");
      h += line("Контактное лицо", ct.fio + (ct.pos ? " · " + ct.pos : "")) + line("Телефон", ph) + line("Почта", ml);
      if (l.auto) h += '<p class="note">Диалог привязан автоматически: ' + E(l.auto) + ".</p>";
      var tasks = l.tasks || [], NEXTT = { a1: "Сбор вводных", a2: "КП" };
      if (tasks.length) {
        h += '<div class="pb pb-orange"><h5>Задачи по диалогу · ' + tasks.length + "</h5>" + tasks.map(function (k) {
          var nx = NEXTT[k.step];
          var due = (k.due ? "до " + dmy(k.due) : "") + (k.left_days != null && k.left_days < 0 ? " · просрочена" : "") + (k.assignee ? " · " + k.assignee : "");
          return '<div class="pt"><b>' + E(String(k.title).replace(/:\s*№.*$/, "")) + "</b><small>" + E(due) + "</small>" + (k.note ? '<small>' + E(k.note) + "</small>" : "")
            + '<div class="pbtn"><button class="x-btn primary" data-tdone="' + k.id + ":" + (nx ? "next" : "done") + '">' + (nx ? "Выполнено → " + nx : "Выполнено") + "</button>"
            + (k.step === "a1" || k.step === "a2" ? '<button class="x-btn ghost" data-tdone="' + k.id + ':skip">Не требуется</button>' : "")
            + (k.order_id ? '<a class="x-btn ghost" href="#/task/' + k.order_id + '" style="text-decoration:none">Открыть</a>' : "") + "</div></div>";
        }).join("") + "</div>";
      }
      h += '<div class="pb pb-blue"><h5>В работе</h5>' + (l.orders.map(function (o) {
        return '<a class="pi" href="#/task/' + o.id + '"><b>№' + E(o.number) + " · " + E(o.object) + "</b><small>" + E(o.stage) + (o.system ? " · " + E(o.system) : "") + (o.executor ? " · " + E(o.executor) : "")
          + (o.left_days != null ? " · " + (o.left_days < 0 ? "просрочено " : "осталось ") + Math.abs(o.left_days) + " дн." : "") + "</small></a>";
      }).join("") || '<p class="note" style="margin:0">Проектных задач пока нет</p>') + "</div>";
      h += '<div class="pb pb-purple"><h5>Предложения</h5>' + (l.kp.map(function (k) {
        return '<a class="pi" href="#/kpreg/"><b>КП №' + E(String(k.number).replace(/^К-/, "")) + " · " + money(k.amount) + "</b><small>"
          + (k.issued_date ? "выставлено " + dmy(k.issued_date) : "черновик, не отправлено") + (k.object ? " · " + E(k.object) : "") + "</small></a>";
      }).join("") || '<p class="note" style="margin:0">Предложений пока нет</p>') + "</div>";
      h += '<div class="pb pb-gray"><h5>Передать по конвейеру</h5>'
        + '<button class="x-btn ghost" id="dspLeadNew" style="width:100%;justify-content:center">Создать задачу по конвейеру</button>';
      h += '<button class="x-btn ghost" id="dspHand" style="width:100%;justify-content:center;margin-top:6px">Передать специалисту…</button></div>';
      h += '<button class="x-btn primary" id="dspNewTask" style="width:100%;justify-content:center;margin-top:10px">+ Новая задача</button>';
      body.innerHTML = h;
      if (s.find) bindFind(t, s, function (p) { linkTo(box, t, name, s, p); });
      if ($("dspRelink")) $("dspRelink").onclick = function (e) { e.preventDefault(); s.find = true; s.sure = false; tabCustomer(body, t, name, s, box); $("dspQ").focus(); };
      if ($("dspFindX")) $("dspFindX").onclick = function (e) { e.preventDefault(); s.find = false; s.q = ""; tabCustomer(body, t, name, s, box); };
      body.querySelectorAll("[data-tdone]").forEach(function (btn) {
        btn.onclick = function () {
          var p = btn.getAttribute("data-tdone").split(":"), id = p[0], act = p[1];
          var req = act === "done" ? api("/tasks/" + id + "/state", { state: "done" }) : api("/tasks/" + id + "/lead", { action: act });
          req.then(function (r) {
            toast(act === "next" ? "Выполнено, передано дальше: " + (r && r.next || "") : act === "skip" ? "Задача закрыта" : "Выполнено");
            if (window.__chatTasksRefresh) window.__chatTasksRefresh();
            again(box, t, name);
          }, function (e) { toast(String(e)); });
        };
      });
      if ($("dspLeadNew")) $("dspLeadNew").onclick = function () { if (window.DS && DS.newTask) DS.newTask({ step: "a2", thread_id: t.id, thread_title: name }); };
      $("dspNewTask").onclick = function () { if (window.DS && DS.newTask) DS.newTask({ thread_id: t.id, thread_title: name }); };
      $("dspHand").onclick = function () { if (window.__chatHandoff) window.__chatHandoff(); };
      if ($("dspUnlink")) $("dspUnlink").onclick = function (e) {          // второе нажатие в течение 4 с — отвязать
        e.preventDefault();
        if (!s.sure) {
          s.sure = true; tabCustomer(body, t, name, s, box);
          setTimeout(function () { if (s.sure) { s.sure = false; if (document.body.contains(body)) tabCustomer(body, t, name, s, box); } }, 4000);
          return;
        }
        s.sure = false;
        api("/threads/" + encodeURIComponent(t.id) + "/link", { customer_id: 0 }).then(function () {
          s.focusUntil = Date.now() + 2500; toast("Диалог отвязан от «" + c.name + "»");
          if (window.__chatTasksRefresh) window.__chatTasksRefresh();
          again(box, t, name);
        }, function (er) { toast(String(er)); });
      };
      if ($("dspEdit")) $("dspEdit").onclick = function (e) { e.preventDefault(); s.edit = true; s.err = ""; tabCustomer(body, t, name, s, box); };
      return;
    }
    if (!l.can_edit) { body.innerHTML = '<p class="note">Диалог пока не привязан к заказчику.</p>'; return; }
    h += '<div class="pb pb-orange" style="margin-top:0"><h5>Диалог не привязан</h5><div class="note" style="margin:0">Найдите задачу по номеру, заказчику или объекту — или заказчика по названию, телефону, почте. Привязка — одним нажатием.</div>' + findHtml(s) + "</div>";
    if (l.suggestions.length) {
      h += '<div class="note" style="margin-top:12px">Возможно, это:</div>' + l.suggestions.map(function (x) {
        return '<div class="card" data-id="' + x.id + '"><span><b>' + E(x.name) + "</b><small>" + (x.why ? "совпало: " + E(x.why) : "похожий заказчик") + "</small>"
          + ((x.orders || []).length ? '<span class="och">' + x.orders.map(function (o) {
            return '<button type="button" data-oid="' + o.id + '" data-lbl="' + E("№" + o.number + " · " + x.name) + '" title="Привязать к задаче: ' + E(o.object) + '">№' + E(o.number) + (o.object ? " · " + E(o.object.slice(0, 22)) : "") + "</button>";
          }).join("") + "</span>" : "") + "</span><em>Привязать</em></div>";
      }).join("");
    }
    if (!s.create && l.suggestions.length) {          // есть похожие — форма нового заказчика свёрнута, чтобы не плодить дубли
      h += '<button class="x-btn ghost" id="dspNewCust" style="width:100%;justify-content:center;margin-top:8px">＋ Нет в списке — новый заказчик</button>';
      body.innerHTML = h;
      bindLinks();
      $("dspNewCust").onclick = function () { s.create = true; tabCustomer(body, t, name, s, box); $("dspName").focus(); };
      return;
    }
    function bindLinks() {
      bindFind(t, s, function (p) { linkTo(box, t, name, s, p); });
      body.querySelectorAll("[data-id]").forEach(function (n) {
        n.onclick = function () { linkTo(box, t, name, s, { customer_id: +n.dataset.id, label: n.querySelector("b").textContent }); };
      });
      body.querySelectorAll("[data-oid]").forEach(function (b) {
        b.onclick = function (e) { e.stopPropagation(); linkTo(box, t, name, s, { order_id: +b.dataset.oid, label: b.dataset.lbl }); };
      });
    }
    h += '<div class="note" style="margin-top:12px">Нет в базе — создать заказчика:</div>'
      + '<div class="f"><label>Наименование компании</label><input id="dspName" value="' + E(name || "") + '"></div>'
      + '<div class="f"><label>Контактное лицо (ФИО)</label><input id="dspFio" value="' + E(name || "") + '"></div>'
      + '<div class="f"><label>Телефон</label><input id="dspPhone" value="' + E(/^[+\d\s()-]{6,}$/.test(t.peer || "") ? t.peer : "") + '"></div>'
      + '<div class="f"><label>E-mail</label><input id="dspMail" value="' + E(/@/.test(t.peer || "") ? t.peer : "") + '"></div>'
      + (s.err ? '<div class="err">' + E(s.err) + "</div>" : "")
      + '<button class="x-btn primary" id="dspCreate" style="width:100%;justify-content:center">Создать заказчика и привязать</button>';
    body.innerHTML = h;
    bindLinks();
    $("dspCreate").onclick = function () {
      var nm = $("dspName").value.trim();
      if (!nm) { s.err = "Укажите наименование компании"; return again(box, t, name); }
      api("/threads/" + encodeURIComponent(t.id) + "/customer", { name: nm, fio: $("dspFio").value.trim(), phone: $("dspPhone").value.trim(), email: $("dspMail").value.trim() })
        .then(function () { s.err = ""; s.create = false; s.q = ""; toast("Заказчик «" + nm + "» создан, диалог привязан к нему"); again(box, t, name); }, function (e) { s.err = String(e); again(box, t, name); });
    };
  }

  /* Правка заказчика прямо в переписке (руководитель, продажи, операционный менеджер).
     Общая карточка amoCRM: контакт диалога выносится в настоящего заказчика вместе с Telegram/MAX/почтой. */
  function editForm(body, t, name, s, box, l, ct, ph, ml) {
    var svc = l.service, f = function (id, label, v, ph_) { return '<div class="f"><label>' + label + '</label><input id="' + id + '" value="' + E(v || "") + '"' + (ph_ ? ' placeholder="' + E(ph_) + '"' : "") + "></div>"; };
    body.innerHTML = (svc ? '<div class="pb pb-orange" style="margin-top:0"><h5>Контакт из amoCRM без компании</h5><div class="note" style="margin:0">Диалог привязан к общей карточке «' + E(l.customer.name) + '». Укажите настоящего заказчика: контакт, его Telegram/MAX и почта перейдут к нему. Если такой заказчик уже есть, контакт добавится к нему.</div></div>'
        : '<div class="pc-name">Изменить заказчика</div>')
      + (svc ? '<div class="note" style="margin:10px 0 0">Заказчик уже есть в базе? Найдите его или его задачу:</div>' + findHtml(s) + '<div class="note" style="margin:8px 0">Или укажите нового:</div>' : "")
      + f("dspEName", "Наименование заказчика", svc ? "" : l.customer.name, svc ? "например, ООО «СК Миллер»" : "")
      + f("dspEFio", "Контактное лицо (ФИО)", ct.fio) + f("dspEPos", "Должность", ct.pos) + f("dspEPhone", "Телефон", ph) + f("dspEMail", "E-mail", ml)
      + (s.err ? '<div class="err">' + E(s.err) + "</div>" : "")
      + '<button class="x-btn primary" id="dspESave" style="width:100%;justify-content:center"' + (s.busy ? " disabled" : "") + ">" + (svc ? "Сохранить заказчика" : "Сохранить") + "</button>"
      + '<button class="x-btn ghost" id="dspECancel" style="width:100%;justify-content:center;margin-top:6px">' + (svc ? "Пока не указывать" : "Отмена") + "</button>";
    if (svc) bindFind(t, s, function (p) {         // контакт из общей карточки amoCRM переходит к найденному заказчику вместе с диалогом
      if (!p.name) return toast("У задачи не указан заказчик — укажите его в карточке задачи");
      s.busy = true;
      api("/threads/" + encodeURIComponent(t.id) + "/customer-edit", { name: p.name, fio: ct.fio || "", pos: ct.pos || "", phone: ph || "", email: ml || "" }).then(function () {
        s.busy = false; s.edit = false; s.q = ""; s.err = "";
        toast("Контакт и диалог перенесены к заказчику «" + p.name + "»");
        again(box, t, name);
      }, function (e) { s.busy = false; toast(String(e)); });
    });
    $("dspECancel").onclick = function () { s.edit = false; s.skipSvc = svc || s.skipSvc; s.err = ""; tabCustomer(body, t, name, s, box); };
    $("dspESave").onclick = function () {
      var v = function (id) { return $(id).value.trim(); }, nm = v("dspEName");
      if (!nm) { s.err = "Укажите наименование заказчика"; return editForm(body, t, name, s, box, l, { fio: v("dspEFio"), pos: v("dspEPos") }, v("dspEPhone"), v("dspEMail")); }
      s.busy = true;
      api("/threads/" + encodeURIComponent(t.id) + "/customer-edit", { name: nm, fio: v("dspEFio"), pos: v("dspEPos"), phone: v("dspEPhone"), email: v("dspEMail") }).then(function (r) {
        s.busy = false; s.edit = false; s.err = "";
        toast(r.moved ? (r.joined ? "Контакт добавлен к заказчику «" + nm + "»" : "Заказчик «" + nm + "» создан, диалог привязан к нему") : "Заказчик сохранён");
        again(box, t, name);
      }, function (e) { s.busy = false; s.err = String(e); editForm(body, t, name, s, box, l, { fio: v("dspEFio"), pos: v("dspEPos") }, v("dspEPhone"), v("dspEMail")); });
    };
  }

  function tabKp(body, t, name, s, box) {
    if (!s.link.customer) {
      body.innerHTML = '<p class="note">Сначала привяжите диалог к заказчику на вкладке «Заказчик».</p><button class="x-btn ghost" id="dspGo" style="width:100%;justify-content:center">К заказчику</button>';
      $("dspGo").onclick = function () { s.tab = "c"; again(box, t, name); };
      return;
    }
    function draw() {
      var k = s.kp, total = k.items.reduce(function (a, i) { return a + (i.on ? (+i.price || 0) : 0); }, 0);
      var pct = k.pay === "adv50" ? 0.5 : k.pay === "adv30" ? 0.3 : 0, adv = Math.round(total * pct);
      body.innerHTML = '<p class="note">КП для «' + E(s.link.customer.name) + '». Попадёт в реестр КП, а текст появится в окне ответа: вы проверите его и отправите сами.</p>'
        + '<div class="f"><label>Объект</label><input id="dspObj" value="' + E(k.object) + '"></div>'
        + k.items.map(function (i, idx) { return '<div class="sv ' + (i.on ? "on" : "") + '"><input type="checkbox" data-sv="' + idx + '" ' + (i.on ? "checked" : "") + "><span>" + E(i.name) + '</span><input type="number" min="0" data-sp="' + idx + '" value="' + (+i.price || 0) + '"></div>'; }).join("")
        + '<div class="f" style="margin-top:8px"><label>Оплата</label><select id="dspPay">' + [["adv50", "Аванс 50%, остаток по акту"], ["adv30", "Аванс 30%, остаток по акту"], ["post100", "100% по акту"]].map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === k.pay ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></div>"
        + '<div class="tot"><b id="dspTot">' + money(total) + "</b>" + (adv ? "<div>Аванс " + money(adv) + ", остаток " + money(total - adv) + "</div>" : "<div>Без аванса, оплата по акту</div>") + "</div>"
        + '<label class="note" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="dspPdf" ' + (k.pdf === false ? "" : "checked") + '> Приложить КП файлом PDF (Telegram, MAX и почта)</label>'
        + (s.err ? '<div class="err">' + E(s.err) + "</div>" : "")
        + '<button class="x-btn primary" id="dspSend" style="width:100%;justify-content:center"' + (s.busy ? " disabled" : "") + ">Подготовить КП и вставить в окно ответа</button>";
      $("dspPdf").onchange = function () { k.pdf = this.checked; };
      $("dspObj").oninput = function () { k.object = this.value; };
      $("dspPay").onchange = function () { k.pay = this.value; draw(); };
      body.querySelectorAll("[data-sv]").forEach(function (cb) { cb.onchange = function () { k.items[+cb.dataset.sv].on = cb.checked; draw(); }; });
      body.querySelectorAll("[data-sp]").forEach(function (inp) { inp.oninput = function () { k.items[+inp.dataset.sp].price = +inp.value || 0; var tt = $("dspTot"); if (tt) tt.textContent = money(k.items.reduce(function (a, i) { return a + (i.on ? (+i.price || 0) : 0); }, 0)); }; });
      $("dspSend").onclick = send;
    }
    function send() {
      var k = s.kp, items = k.items.filter(function (i) { return i.on && +i.price > 0; }).map(function (i) { return { name: i.name, price: +i.price }; });
      if (!items.length) { s.err = "Отметьте хотя бы одну услугу с ценой"; return draw(); }
      s.busy = true; s.err = ""; draw();
      api("/threads/" + encodeURIComponent(t.id) + "/kp", { object: k.object, services: items, pay: k.pay, send: false }).then(function (r) {
        var withPdf = s.kp.pdf !== false;
        var fileP = withPdf ? C().blob("/ds/kp/" + r.id + "/doc?kind=kp&fmt=pdf").then(function (f) { return new File([f.blob], f.name, { type: "application/pdf" }); }, function () { return null; }) : Promise.resolve(null);
        return fileP.then(function (file) {
          s.busy = false; s.kp = null; s.tab = "c";
          if (window.__chatDraft) window.__chatDraft(r.text, file, r.id);
          toast("КП №" + String(r.number).replace(/^К-/, "") + " готово: проверьте текст в окне ответа и нажмите «Отправить»");
          again(box, t, name);
        });
      }, function (e) { s.busy = false; s.err = String(e); draw(); });
    }
    if (s.kp) { draw(); return; }
    var load = price ? Promise.resolve(price) : api("/price").then(function (p) { price = p.items.filter(function (i) { return i.active; }); return price; });
    load.then(function (items) {
      s.kp = { object: "", pay: "adv50", items: items.map(function (i) { return { name: i.name, price: i.price, on: false }; }) };
      draw();
    }, function (e) { body.innerHTML = '<p class="err">' + E(e) + "</p>"; });
  }
  if (window.__chatPanelReady) { var ready = window.__chatPanelReady; window.__chatPanelReady = null; ready(); }      // диалог открыт раньше, чем загрузилась панель
})();
