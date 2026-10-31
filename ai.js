/* Проекты DS — ИИ-помощник (YandexGPT, мост: /api/ds/ai).
   Вкладка «ИИ» в панели диалога (chatpanel.js): что пишет заказчик, его данные, кому передать, черновик ответа по кнопке.
   Блок «ИИ-помощник» в «Автоматизации» (ds.js, только руководителю): вкл/выкл, правила передачи, стиль ответов, расход.
   ИИ только подсказывает: заказчикам ничего не отправляет, ответ вставляется в поле — отправляет сотрудник. */
(function () {
  "use strict";
  var A = window.DSAI = { st: null };
  function $(id) { return document.getElementById(id); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function C() { return window.MPBC; }
  function api(path, body) { return C().call("/../ds/ai" + path, body ? { body: body } : {}); }
  function toast(m) { if (window.MPBT && MPBT.toast) MPBT.toast(m); else if (window.toast) window.toast(m); }
  function me() { return (C() && C().me) || null; }
  function pos() { var m = me(); return m ? (m.position || (m.role === "admin" ? "owner" : "")) : ""; }
  function num(n) { return Math.round(n || 0).toLocaleString("ru-RU"); }

  var css = document.createElement("style");
  css.textContent = ".dsp .ai-head{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.dsp .ai-pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:.76rem;font-weight:700;background:var(--brand-soft);color:var(--brand)}"
    + ".dsp .ai-pill.bad{background:var(--bad-l,#fde8e8);color:var(--bad)}.dsp .ai-pill.mute{background:var(--surface-2,var(--surface));color:var(--muted)}"
    + ".dsp .ai-sum{margin:0 0 10px;font-size:.92rem;line-height:1.45}"
    + ".dsp .ai-next{margin:0 0 10px;padding:9px 12px;border-radius:12px;background:var(--brand-soft);font-size:.9rem;font-weight:600}.dsp .ai-next small,.dsp .ai-list small{display:block;color:var(--muted);font-size:.7rem;text-transform:uppercase;font-weight:700;margin-bottom:2px}"
    + ".dsp .ai-list{margin:0 0 10px}.dsp .ai-list ul{margin:2px 0 0;padding-left:18px;font-size:.88rem;line-height:1.45}.dsp .ai-list.miss{padding:9px 12px;border-radius:12px;background:var(--warn-soft);}.dsp .ai-list.miss small{color:var(--warn)}"
    + ".dsp .ai-facts{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin-bottom:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2,var(--surface))}"
    + ".dsp .ai-facts div{min-width:0}.dsp .ai-facts .w{grid-column:1/-1}.dsp .ai-facts small{display:block;color:var(--muted);font-size:.7rem;text-transform:uppercase;font-weight:700}.dsp .ai-facts b{display:block;font-size:.86rem;font-weight:600;overflow-wrap:anywhere}"
    + ".dsp .ai-route{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,#378ADD 12%,transparent);margin-bottom:8px;font-size:.88rem}.dsp .ai-route small{display:block;color:var(--muted);font-size:.76rem;margin-top:2px}"
    + ".dsp .ai-row{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.dsp .ai-row .x-btn{flex:1;justify-content:center}"
    + ".dsp .ai-draft{margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}.dsp .ai-draft textarea{width:100%;box-sizing:border-box;margin:8px 0;min-height:150px;border-radius:10px;padding:9px 10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:.88rem;resize:vertical}"
    + ".dsp .ai-foot{font-size:.74rem;color:var(--muted);margin:12px 0 0}"
    + ".ds .ai-set .f{margin:12px 0}.ds .ai-set label.t{display:block;font-size:.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:4px}"
    + ".ds .ai-set textarea{width:100%;box-sizing:border-box;min-height:96px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--surface);color:var(--ink);font:inherit;font-size:.9rem;resize:vertical}"
    + ".ds .ai-set .ck{display:flex;gap:8px;align-items:flex-start;margin:8px 0;font-size:.92rem}.ds .ai-set .ck small{display:block;color:var(--muted)}"
    + ".ds .ai-set select{width:auto;border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--surface);color:var(--ink);font:inherit}"
    + ".ds .ai-use{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px}.ds .ai-use div{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.ds .ai-use small{display:block;color:var(--muted);font-size:.76rem}.ds .ai-use b{font-size:1.1rem}"
    + ".x-aitask{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px;padding:7px 10px;border-radius:12px;font-size:.82rem;background:color-mix(in srgb,#7c5cff 7%,var(--surface,#fff));border:1px solid color-mix(in srgb,#7c5cff 25%,var(--line));color:var(--ink);max-width:100%}"
    + ".x-aitask span{flex:1;min-width:160px}.x-aitask button{border:0;border-radius:9px;padding:5px 11px;font-weight:600;font-size:.8rem;cursor:pointer;background:#7c5cff;color:#fff}"
    + ".x-aitask button.x{background:none;color:var(--muted);padding:2px 6px;font-size:1rem}.x-aitask.done{opacity:.75}"
    + ".ai-cust{border:1px solid color-mix(in srgb,#7c5cff 30%,var(--line));border-radius:14px;padding:11px 13px;margin-top:12px;background:color-mix(in srgb,#7c5cff 5%,var(--surface,#fff))}"
    + ".ai-cust h5{margin:0 0 8px;font-size:.74rem;text-transform:uppercase;letter-spacing:1px;font-weight:800;color:#6a4fe0;display:flex;align-items:center;gap:8px}.ai-cust h5 span{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:600;color:var(--muted)}"
    + ".ai-cust p{margin:0 0 8px;font-size:.9rem;line-height:1.45}.ai-cust b.lb{display:block;font-size:.7rem;text-transform:uppercase;color:var(--muted);margin:8px 0 2px}"
    + ".ai-cust ul{margin:0;padding-left:18px;font-size:.88rem}.ai-cust .st{display:inline-block;padding:2px 9px;border-radius:99px;font-size:.76rem;font-weight:700;background:var(--brand-soft);color:var(--brand)}"
    + ".ai-cust .risk li{color:var(--bad)}.ai-cust button{margin-top:8px;border:1px solid var(--line);background:var(--surface,#fff);color:var(--ink);border-radius:9px;padding:6px 12px;font:inherit;font-size:.84rem;font-weight:600;cursor:pointer}"
    + ".ai-cust button.pri{background:#7c5cff;border-color:transparent;color:#fff}.ai-cust .err{color:var(--bad);font-size:.84rem}"
    + ".ds .ai-warn{padding:10px 12px;border-radius:10px;background:var(--warn-soft);color:var(--warn);font-size:.88rem;margin:10px 0}";
  document.head.appendChild(css);

  /* ---------- статус: подключён ли ключ и включён ли помощник (один раз после входа) ---------- */
  var waiting = [];
  A.load = function () {
    if (!C() || !C().loggedIn()) { A.st = null; return Promise.resolve(null); }
    return api("/status").then(function (r) { A.st = r; return r; }, function () { A.st = null; return null; })
      .then(function (r) { var w = waiting; waiting = []; w.forEach(function (f) { f(); }); return r; });
  };
  A.on = function () { return !!(A.st && A.st.configured && A.st.enabled) && pos() !== "norm"; };
  A.whenLoaded = function (f) { waiting.push(f); };
  if (C() && C().on) { C().on("login", A.load); C().on("logout", function () { A.st = null; }); if (C().loggedIn()) A.load(); }

  /* ---------- вкладка «ИИ» панели диалога ---------- */
  var URG = { high: ["срочно", "bad"], low: ["не срочно", "mute"] };
  var TONE = { unhappy: "недоволен", claim: "⚠ претензия" };
  var drafts = {};                       // черновик ответа по диалогу не теряется при перерисовке панели
  A.tab = function (body, t, name, s, hooks) {
    var path = "/thread/" + encodeURIComponent(t.id);
    function alive() { return document.body.contains(body); }
    function wait(txt) { body.innerHTML = '<p class="note">' + E(txt) + "</p>"; }
    function err(e) {
      if (!alive()) return;
      body.innerHTML = '<p class="err">' + E(e) + '</p><button class="x-btn ghost" id="aiRetry" style="width:100%;justify-content:center">Повторить</button>';
      $("aiRetry").onclick = function () { A.tab(body, t, name, s, hooks); };
    }
    function run() { wait("ИИ разбирает переписку…"); api(path + "/triage", {}).then(function (r) { paint(r.triage); }, err); }
    function paint(tr) {
      if (!alive()) return;
      if (!tr) {
        body.innerHTML = '<p class="note">Этот диалог ИИ ещё не разбирал. Новые входящие он разбирает сам примерно через полминуты после сообщения.</p>'
          + '<button class="x-btn primary" id="aiRun" style="width:100%;justify-content:center">Разобрать сейчас</button>';
        $("aiRun").onclick = run; return;
      }
      var d = tr.data || {}, u = URG[d.urgency], l = s.link || {}, m = me();
      var f = [["Организация", d.org], ["ИНН", d.inn], ["Контакт", d.contact], ["Телефон", d.phone], ["Почта", d.email], ["Город", d.city],
        ["Объект", d.object, 1], ["Назначение", d.building], ["Класс Ф", d.fclass], ["Площадь", d.area], ["Этажность", d.floors], ["Стадия", d.stage],
        ["Работы", (d.services || []).join(", "), 1], ["Что нужно", d.need, 1], ["ТЗ и исходные", d.inputs, 1], ["Срок", d.deadline]].filter(function (x) { return x[1]; });
      var tn = TONE[d.tone];
      function list(title, a, cls) { return a && a.length ? '<div class="ai-list' + (cls ? " " + cls : "") + '"><small>' + title + "</small><ul>" + a.map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul></div>" : ""; }
      var canHand = ["design", "acc", "norm"].indexOf(pos()) < 0 && d.route_user_id && !(m && m.id === d.route_user_id);
      var h = '<div class="ai-head"><span class="ai-pill' + (d.kind === "spam" ? " mute" : "") + '">' + E(d.kind_label || d.kind) + "</span>"
        + (tn ? ' <span class="ai-pill bad">' + tn + "</span>" : "")
        + (u ? ' <span class="ai-pill ' + u[1] + '">' + u[0] + "</span>" : "") + (d.reply_needed ? ' <span class="ai-pill mute">нужен ответ</span>' : "") + "</div>"
        + (tr.stale ? '<p class="note">Пришли новые сообщения — <a href="#" id="aiRe">разобрать заново</a></p>' : "")
        + '<p class="ai-sum">' + E(d.summary) + "</p>"
        + (d.next_step ? '<div class="ai-next"><small>Следующий шаг</small>' + E(d.next_step) + "</div>" : "")
        + list("Вопросы и просьбы заказчика", d.questions)
        + (f.length ? '<div class="ai-facts">' + f.map(function (x) { return '<div' + (x[2] ? ' class="w"' : "") + "><small>" + x[0] + "</small><b>" + E(x[1]) + "</b></div>"; }).join("") + "</div>" : "")
        + list(d.kind === "new_request" || d.kind === "kp_reply" ? "Не хватает для КП — спросить" : "Что уточнить", d.missing, "miss")
        + (d.order_id ? '<a class="card" href="#/task/' + d.order_id + '"><span><b>Задача №' + E(d.order_number) + "</b><small>упомянута в переписке — открыть</small></span></a>" : "")
        + (d.auto_assigned ? '<div class="ai-route"><span>Передано автоматически: <b>' + E(d.auto_assigned) + "</b>" + (d.route_reason ? "<small>" + E(d.route_reason) + "</small>" : "") + "</span><span>✓</span></div>"
          : d.route_user_id ? '<div class="ai-route"><span>Кому передать: <b>' + E(d.route_to) + "</b>" + (d.route_reason ? "<small>" + E(d.route_reason) + "</small>" : "") + "</span>"
            + (canHand ? '<button class="x-btn ghost" id="aiHand">Передать</button>' : "") + "</div>" : "")
        + '<div class="ai-row">' + (!l.customer && l.can_edit && d.kind !== "spam" && (d.org || d.contact) ? '<button class="x-btn ghost" id="aiCust">Заполнить заказчика</button>' : "")
        + '<button class="x-btn ghost" id="aiRe2">Разобрать заново</button></div>'
        + '<div class="ai-draft"><div class="f"><label>Черновик ответа</label><input id="aiHint" placeholder="пожелание: например, запросить поэтажные планы" value="' + E((drafts[t.id] || {}).hint || "") + '"></div>'
        + '<button class="x-btn primary" id="aiDraft" style="width:100%;justify-content:center">' + ((drafts[t.id] || {}).text ? "Предложить другой вариант" : "Предложить ответ") + '</button><div id="aiOut"></div></div>'
        + '<p class="ai-foot">Подсказка ИИ (YandexGPT) — проверьте перед использованием. ИИ ничего не отправляет заказчику сам.</p>';
      body.innerHTML = h;
      [$("aiRe"), $("aiRe2")].forEach(function (b) { if (b) b.onclick = function (e) { e.preventDefault(); run(); }; });
      if ($("aiHand")) $("aiHand").onclick = function () {
        var b = this; b.disabled = true;
        C().call("/../ds/threads/" + encodeURIComponent(t.id) + "/handoff", { body: { user_id: d.route_user_id, note: (d.route_reason || d.summary || "по подсказке ИИ").slice(0, 240) } })
          .then(function (r) { toast("Диалог передан: " + r.to); b.textContent = "Передано ✓"; if (window.__chatTasksRefresh) window.__chatTasksRefresh(); }, function (e) { b.disabled = false; toast(String(e)); });
      };
      if ($("aiCust")) $("aiCust").onclick = function () {
        hooks.customer({ name: d.org || d.contact, fio: d.contact, phone: d.phone, email: d.email });
      };
      $("aiHint").oninput = function () { (drafts[t.id] = drafts[t.id] || {}).hint = this.value; };
      $("aiDraft").onclick = function () {
        var b = this; b.disabled = true; b.textContent = "Пишу черновик…";
        api(path + "/draft", { hint: $("aiHint").value }).then(function (r) {
          (drafts[t.id] = drafts[t.id] || {}).text = r.text;
          b.disabled = false; b.textContent = "Предложить другой вариант"; out();
        }, function (e) { b.disabled = false; b.textContent = "Предложить ответ"; if ($("aiOut")) $("aiOut").innerHTML = '<p class="err">' + E(e) + "</p>"; });
      };
      out();
    }
    function out() {
      var dr = drafts[t.id], box = $("aiOut");
      if (!box || !dr || !dr.text) return;
      var site = t.channel === "site";               // заявка с сайта: ответить в CRM нельзя — текст копируется для звонка или мессенджера
      box.innerHTML = '<textarea id="aiText"></textarea><button class="x-btn primary" id="aiPut" style="width:100%;justify-content:center">' + (site ? "Скопировать" : "Вставить в ответ") + "</button>";
      $("aiText").value = dr.text;
      $("aiText").oninput = function () { dr.text = this.value; };
      $("aiPut").onclick = function () {
        var txt = $("aiText").value, ta = $("chatText");
        if (site || !ta || ta.disabled) {
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("Текст скопирован"); }, function () { prompt("Скопируйте текст:", txt); });
          else prompt("Скопируйте текст:", txt);
          return;
        }
        ta.value = txt; ta.dispatchEvent(new Event("input", { bubbles: true })); ta.focus();
        var w = $("chatWrap") || document.querySelector(".chat-wrap"); if (w) w.classList.remove("show-info");      // телефон: к полю ответа
        toast("Черновик вставлен — проверьте и отправьте");
      };
    }
    wait("Загрузка…");
    api(path).then(function (r) {
      if (!r.configured) { if (alive()) body.innerHTML = '<p class="note">ИИ-помощник не подключён: нет ключа YandexGPT на сервере (см. «Автоматизация → ИИ-помощник»).</p>'; return; }
      paint(r.triage);
    }, function (e) { err(String(e).indexOf("404") >= 0 || String(e).indexOf("Not Found") >= 0 ? "ИИ-помощник появится после обновления сервера моста" : e); });
  };

  /* ---------- «Что с заказчиком?»: сводка по задачам, КП, оплатам, комментариям и переписке (ds_ai_ops). По кнопке, последняя хранится ---------- */
  A.customer = function (el, cid) {
    if (!el || !cid || !A.on() || ["owner", "sales", "ops"].indexOf(pos()) < 0) { if (el) el.innerHTML = ""; return; }
    var path = "/customer/" + cid;
    function when(ts) { var d = new Date(ts * 1000); return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
    function list(title, xs, cls) { return xs && xs.length ? '<b class="lb">' + title + '</b><ul' + (cls ? ' class="' + cls + '"' : "") + ">" + xs.map(function (x) { return "<li>" + E(x) + "</li>"; }).join("") + "</ul>" : ""; }
    function draw(n, err, busy) {
      if (!document.body.contains(el)) return;
      var d = n && n.data;
      el.innerHTML = '<div class="ai-cust"><h5>🤖 Что с заказчиком?' + (n ? "<span>" + when(n.ts) + (n.by ? " · " + E(n.by) : "") + "</span>" : "") + "</h5>"
        + (d ? '<p><span class="st">' + E(d.status_label) + "</span></p><p>" + E(d.summary) + "</p>" + list("В работе", d.in_work)
          + (d.money ? '<b class="lb">Деньги</b><p>' + E(d.money) + "</p>" : "") + (d.last_contact ? '<b class="lb">Последний контакт</b><p>' + E(d.last_contact) + "</p>" : "")
          + list("Что сделать", d.next_steps) + list("Риски", d.risks, "risk")
          : '<p class="note" style="margin:0">Сводка из задач, КП, оплат, комментариев и переписки — чтобы за минуту понять, что с заказчиком, перед звонком.</p>')
        + (err ? '<div class="err">' + E(err) + "</div>" : "")
        + '<button type="button" class="' + (d ? "" : "pri") + '" data-aicust="1"' + (busy ? " disabled" : "") + ">" + (busy ? "Собираю сводку…" : d ? "Обновить сводку" : "Собрать сводку") + "</button></div>";
      el.querySelector("[data-aicust]").onclick = function () {
        draw(n, "", true);
        api(path, {}).then(function (r) { draw(r.note); }, function (e) { draw(n, String(e)); });
      };
    }
    draw(null);
    api(path).then(function (r) { draw(r.note); }, function (e) { if (/404|Not Found/.test(String(e))) el.innerHTML = ""; else draw(null, String(e)); });
  };

  /* ---------- «Автоматизация → ИИ-помощник» (руководитель) ---------- */
  var form = null;                        // несохранённые правки настроек переживают перерисовку экрана
  A.settings = function (el) {
    if (!el) return;
    if (!A.st) { el.innerHTML = '<div class="panel pad"><h3>ИИ-помощник</h3><p class="note">Загрузка…</p></div>'; A.load().then(function () { if (document.body.contains(el)) draw(); }); return; }
    draw();
    if (Date.now() - (A.fresh || 0) > 20000) { A.fresh = Date.now(); A.load().then(function () { if (document.body.contains(el)) draw(); }); }     // свежий расход при открытии экрана
    function draw() {
      var r = A.st;
      if (!r || !r.settings) { el.innerHTML = '<div class="panel pad"><h3>ИИ-помощник</h3><p class="note">Нет данных: обновите сервер моста или войдите руководителем.</p></div>'; return; }
      var s = form || (form = JSON.parse(JSON.stringify(r.settings))), u = r.usage || {}, bk = u.by_kind || {};
      var ck = function (k, title, sub) { return '<label class="ck"><input type="checkbox" data-aik="' + k + '"' + (s[k] ? " checked" : "") + "><span><b>" + title + "</b>" + (sub ? "<small>" + sub + "</small>" : "") + "</span></label>"; };
      el.innerHTML = '<div class="panel pad ai-set" style="margin-top:16px"><h3>ИИ-помощник (YandexGPT)</h3>'
        + '<div class="sub">Разбирает каждое входящее (почта, Telegram, MAX, заявки с сайта): тип обращения, данные заказчика, кому передать. Подсказка — во вкладке «ИИ» диалога и первой строкой в задаче «Обращение». Черновик ответа — по кнопке. Заказчикам ИИ ничего не отправляет.</div>'
        + (r.configured ? "" : '<div class="ai-warn">Ключ YandexGPT на сервере не задан: впишите YANDEX_API_KEY и YANDEX_FOLDER_ID в .env моста и перезапустите его (bridge/INSTALL.md, раздел «ИИ-помощник»). Настройки можно подготовить заранее.</div>')
        + ck("enabled", "Включить ИИ-помощника", "разбор новых входящих дешёвой моделью " + E(r.models.fast))
        + ck("auto_assign", "Передавать диалог сам, если ИИ уверен", "как «Передать специалисту»: задача в «Мои задачи» и уведомление; по умолчанию — только подсказка")
        + '<div class="f" style="margin-left:26px">Где: <select data-aik="auto_scope"><option value="mail"' + (s.auto_scope === "mail" ? " selected" : "") + '>почта и заявки с сайта</option><option value="all"' + (s.auto_scope === "all" ? " selected" : "") + ">все каналы</option></select></div>"
        + ck("team_tasks", "Поручения из чатов «Команды»", "под сообщением вроде «Полина, запроси исходные до пятницы» — подсказка с кнопкой «Поставить задачу»")
        + '<div class="f"><label class="t">Кому что передавать</label><textarea data-aik="routing" placeholder="Например:\nНовые заявки и запросы стоимости — Александру.\nИсходные данные, счета, оплаты, акты — Полине.\nЗамечания к проекту и вопросы по проектированию — Ивану.">' + E(s.routing) + "</textarea></div>"
        + '<div class="f"><label class="t">Как мы пишем (для черновиков)</label><textarea data-aik="style" placeholder="Например: на «вы», коротко, без канцелярита. Срок проекта не называем без руководителя проектного отдела.">' + E(s.style) + "</textarea></div>"
        + '<button class="btn primary" id="aiSave">Сохранить</button>'
        + '<h3 style="margin-top:22px">Расход за ' + E(u.month || "месяц") + "</h3>"
        + '<div class="ai-use"><div><small>Обращений к ИИ</small><b>' + num(u.calls) + "</b></div><div><small>Токенов (вход / ответ)</small><b>" + num(u.in_tok) + " / " + num(u.out_tok) + "</b></div>"
        + "<div><small>Примерно, ₽</small><b>" + (u.rub || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 }) + "</b></div>"
        + "<div><small>Разборы / черновики</small><b>" + num((bk.triage || {}).calls) + " / " + num((bk.draft || {}).calls) + "</b></div>"
        + "<div><small>Поручения / сводки</small><b>" + num((bk.team_task || {}).calls) + " / " + num((bk.customer || {}).calls) + "</b></div>"
        + "<div><small>Сегодня</small><b>" + num((u.today || {}).calls) + "</b></div></div>"
        + '<p class="note" style="margin-top:8px">Предел — ' + r.max_per_hour + " обращений в час. Сумма — оценка по ценам из настроек моста; точный счёт — в консоли Yandex Cloud.</p></div>";
      el.querySelectorAll("[data-aik]").forEach(function (x) {
        x.oninput = x.onchange = function () { s[x.dataset.aik] = x.type === "checkbox" ? x.checked : x.value; };
      });
      $("aiSave").onclick = function () {
        var b = this; b.disabled = true;
        api("/settings", s).then(function (ns) { form = null; A.st.settings = ns; A.st.enabled = ns.enabled; toast("Настройки ИИ-помощника сохранены"); return A.load(); })
          .then(function () { if (document.body.contains(el)) draw(); }, function (e) { b.disabled = false; toast(String(e)); });
      };
    }
  };
})();
