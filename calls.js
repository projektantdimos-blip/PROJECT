/* Телефония Sipuni в CRM: карточка «Звонит …» (из опроса /sync), кнопка 📞 у телефонов (звонок через АТС),
   журнал звонков с плеером записи в карточках задачи и заказчика, вкладка «Телефония» в Личном кабинете.
   Ключи Sipuni хранятся только на мосту — сайт знает лишь, есть ли у сотрудника внутренний номер. */
(function () {
  var C = window.MPBC;
  if (!C) return;
  var T = window.DSCalls = { enabled: false };
  function $(id) { return document.getElementById(id); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function api(path, body) { return C.call("/../ds/calls" + path, body ? { body: body } : {}); }
  function toast(m) { if (window.toast) return window.toast(m); alert(m); }
  function cfg() {
    try { var c = JSON.parse(localStorage.getItem("ds_bridge") || "{}"), d = window.DS_CONFIG || {}; return { url: String(c.url || d.url || "").replace(/\/+$/, ""), key: c.key || d.key || "" }; }
    catch (e) { return { url: "", key: "" }; }
  }
  function hm(ts) { return new Date(ts * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  function dur(s) { s = s || 0; return s >= 60 ? Math.floor(s / 60) + " мин " + ("0" + s % 60).slice(-2) + " с" : s + " с"; }

  /* ---------- карточка «Звонит …» ---------- */
  var hidden = {}, rung = {}, fast = null;
  function box() { var b = $("dsCalls"); if (!b) { b = document.createElement("div"); b.id = "dsCalls"; document.body.appendChild(b); } return b; }
  function paintLive(list) {
    var b = box(), h = "";
    list.filter(function (c) { return !hidden[c.id + c.state]; }).slice(0, 3).forEach(function (c) {
      var talk = c.state === "talk", out = c.dir === "out";
      h += '<div class="ds-call' + (talk ? " talk" : "") + '" data-cid="' + E(c.id) + '"><span class="ci">' + (talk ? "🎧" : out ? "📤" : "📞") + "</span>"
        + '<div class="ct"><small>' + (talk ? "Идёт разговор" : out ? "Звоним" : "Звонит") + "</small><b>" + E(c.who || c.phone || "Неизвестный номер") + "</b>"
        + "<span>" + E([c.who !== c.phone ? c.phone : "", c.number ? "задача №" + c.number : (c.customer_id ? "" : "нет в базе заказчиков")].filter(Boolean).join(" · ")) + "</span>"
        + '<div class="ca">' + (c.order_id ? '<a href="#/task/' + c.order_id + '">Открыть задачу</a>' : "") + (c.customer_id ? '<a href="#/clients" data-ccust="' + c.customer_id + '">Заказчик</a>' : "") + "</div></div>"
        + '<button type="button" data-chide="' + E(c.id + c.state) + '" aria-label="Скрыть">✕</button></div>';
    });
    b.innerHTML = h;
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-chide]");
    if (t) { hidden[t.getAttribute("data-chide")] = 1; paintLive((C.sync && C.sync.calls) || []); }
  });
  /* событие «sync» после первого опроса при загрузке страницы может не прийти — дополнительно сверяемся с C.sync раз в секунду */
  var lastSync = null;
  setInterval(function () { if (C.sync && C.sync !== lastSync) onSync(C.sync); }, 1000);
  C.on("sync", onSync);
  function onSync(s) {
    lastSync = s;
    var on = !!(s && s.calls);
    if (on !== T.enabled) { T.enabled = on; setFast(on); }
    if (!on) { paintLive([]); return; }
    s.calls.forEach(function (c) {
      if (c.state === "ring" && c.dir === "in" && !rung[c.id]) {
        rung[c.id] = 1;
        if (window.DSSound) { try { DSSound.play(); } catch (e) {} }
      }
    });
    paintLive(s.calls);
  }
  C.on("logout", function () { T.enabled = false; setFast(false); paintLive([]); });
  /* у кого есть внутренний номер — опрашиваем чаще (5 с), чтобы карточка успела появиться, пока звонит */
  function setFast(on) {
    if (fast) { clearInterval(fast); fast = null; }
    if (on) fast = setInterval(function () { if (C.loggedIn()) C.refresh(); }, 5000);
  }

  /* ---------- кнопка 📞 у телефона ---------- */
  T.btn = function (phone, orderId, customerId) {
    if (!T.enabled || !phone || String(phone).replace(/\D/g, "").length < 10) return "";
    return '<button type="button" class="call-btn" data-dial="' + E(phone) + '" data-doid="' + (orderId || 0) + '" data-dcid="' + (customerId || 0) + '" title="Позвонить через Sipuni: сначала зазвонит ваш телефон">📞</button>';
  };
  /* большая кнопка «Позвонить заказчику» в окнах задачи, заказчика и переписки.
     contacts — [{fio, phone}]; без номера — неактивная «Номер отсутствует»; несколько номеров — выбор из списка */
  var CALL_ROLES = { owner: 1, sales: 1, ops: 1, design: 1 };
  T.bar = function (contacts, orderId, customerId) {
    var me = C.me || {}, p = me.position || (me.role === "admin" ? "owner" : "");
    if (!CALL_ROLES[p]) return "";
    var list = (contacts || []).filter(function (x) { return x && String(x.phone || "").replace(/\D/g, "").length >= 10; });
    if (!list.length) return '<button type="button" class="btn ghost sm call-bar none" disabled title="Впишите сотовый телефон в карточке заказчика">📵 Номер отсутствует</button>';
    var data = ' data-doid="' + (orderId || 0) + '" data-dcid="' + (customerId || 0) + '"';
    if (list.length === 1) {
      var x = list[0];
      return '<button type="button" class="btn primary sm call-bar" data-dial="' + E(x.phone) + '"' + data + ' title="' + E((x.fio ? x.fio + " · " : "") + x.phone) + ' — сначала зазвонит ваш телефон">📞 Позвонить заказчику</button>';
    }
    return '<span class="call-pick"><button type="button" class="btn primary sm call-bar" data-dialpick="1">📞 Позвонить заказчику ▾</button><span class="call-menu">'
      + list.map(function (x) { return '<button type="button" data-dial="' + E(x.phone) + '"' + data + "><b>" + E(x.fio || "Контакт") + "</b><small>" + E(x.phone) + "</small></button>"; }).join("") + "</span></span>";
  };
  document.addEventListener("click", function (e) {
    var pk = e.target.closest && e.target.closest("[data-dialpick]");
    document.querySelectorAll(".call-pick.on").forEach(function (x) { if (!pk || x !== pk.parentNode) x.classList.remove("on"); });
    if (pk) { e.preventDefault(); e.stopPropagation(); pk.parentNode.classList.toggle("on"); }
  }, true);

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-dial]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var pick = b.closest(".call-pick"); if (pick) pick.classList.remove("on");
    if (b.disabled) return;
    b.disabled = true;
    api("/dial", { phone: b.getAttribute("data-dial"), order_id: +b.getAttribute("data-doid") || 0, customer_id: +b.getAttribute("data-dcid") || 0 })
      .then(function (r) { toast("Звоним " + r.phone + ": сначала зазвонит ваш телефон (вн. " + r.ext + "), снимите трубку — Sipuni соединит с заказчиком"); })
      .catch(function (err) { toast(String(err)); })
      .then(function () { setTimeout(function () { b.disabled = false; }, 4000); });
  }, true);

  /* ---------- журнал звонков в карточках ---------- */
  var cache = {};
  T.panel = function (kind, id) {
    if (!id) return "";
    var key = kind + ":" + id, c = cache[key];
    if (c && c.items && !c.items.length && !T.enabled) return "";
    return '<div class="panel pad calls-panel" data-calls="' + key + '"><h3>Звонки</h3><div class="cl-body">' + (c && c.items ? rows(c.items) : '<p class="sub" style="margin:6px 0 0">Загрузка…</p>') + "</div></div>";
  };
  function rows(items) {
    if (!items.length) return '<p class="sub" style="margin:6px 0 0">Звонков пока не было</p>';
    return items.slice(0, 20).map(function (x) {
      var miss = x.status === "missed" || x.status === "busy", out = x.dir === "out";
      var ico = miss ? (out ? "↗✕" : "↙✕") : out ? "↗" : "↙";
      var what = (out ? "Исходящий" : "Входящий") + (miss ? (out ? " · не дозвонились" : " · пропущен") : x.status === "answered" ? " · " + dur(x.talk) : x.status === "talk" ? " · идёт разговор" : "");
      return '<div class="cl-row' + (miss ? " miss" : "") + '"><span class="cl-ic">' + ico + '</span><div class="cl-t"><b>' + E(x.who || x.phone || "—") + "</b><small>" + E(what) + (x.user ? " · " + E(x.user) : "") + (x.number ? " · №" + E(x.number) : "") + "</small>"
        + (x.record ? '<div class="cl-rec" data-rec="' + E(x.id) + '"><button type="button" class="btn ghost sm" data-play="' + E(x.id) + '">▶ Запись разговора</button></div>' : "") + "</div>"
        + '<span class="cl-tm">' + hm(x.ts) + "</span></div>";
    }).join("");
  }
  function fill(el) {
    var key = el.getAttribute("data-calls"), c = cache[key];
    el.setAttribute("data-filled", "1");
    if (c && Date.now() - c.at < 30000) return;
    var p = key.split(":"), q = p[0] === "order" ? "?order_id=" + p[1] : "?customer_id=" + p[1];
    cache[key] = { at: Date.now(), items: c && c.items };
    api(q).then(function (items) {
      cache[key] = { at: Date.now(), items: items };
      document.querySelectorAll('[data-calls="' + key + '"]').forEach(function (x) {
        if (!items.length && !T.enabled) { x.remove(); return; }
        x.querySelector(".cl-body").innerHTML = rows(items);
      });
    }).catch(function () {                 // старый мост без телефонии или нет доступа — блок не нужен
      document.querySelectorAll('[data-calls="' + key + '"]').forEach(function (x) { x.remove(); });
    });
  }
  new MutationObserver(function () {
    document.querySelectorAll("[data-calls]:not([data-filled])").forEach(fill);
  }).observe(document.body, { childList: true, subtree: true });

  /* запись разговора: мост отдаёт mp3 (ключи Sipuni на сайт не попадают), играем из памяти */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-play]");
    if (!b) return;
    var id = b.getAttribute("data-play"), c = cfg(), s = "";
    try { s = localStorage.getItem("ds_session") || ""; } catch (err) {}
    b.disabled = true; b.textContent = "Загрузка записи…";
    fetch(c.url + "/api/ds/calls/" + encodeURIComponent(id) + "/record", { headers: { "X-Api-Key": c.key, "X-Session": s } })
      .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw j.detail || "Ошибка " + r.status; }, function () { throw "Ошибка " + r.status; }); return r.blob(); })
      .then(function (blob) {
        var a = document.createElement("audio");
        a.controls = true; a.autoplay = true; a.preload = "auto"; a.src = URL.createObjectURL(blob); a.className = "cl-audio";
        b.replaceWith(a);
      })
      .catch(function (err) { b.disabled = false; b.textContent = "▶ Запись разговора"; toast(String(err)); });
  });

  /* ---------- Личный кабинет → Телефония ---------- */
  var POS = { owner: "Руководитель", design: "Рук. проектного отдела", sales: "Отдел продаж", ops: "Операционный менеджер", acc: "Бухгалтер", designer: "Проектировщик" };
  T.paintMe = function (body) {
    body.innerHTML = '<div class="x-panel"><div class="x-empty">Загрузка…</div></div>';
    Promise.all([api("/settings"), api("").catch(function () { return []; })]).then(function (r) {
      var st = r[0], log = r[1], h = '<div class="x-two"><div>';
      if (st.owner) {
        h += '<div class="x-panel pad" style="margin-bottom:18px"><h3>Внутренние номера сотрудников</h3><p class="x-sub">Как в Sipuni (например, 201). У кого указан номер — тому CRM показывает карточку «Звонит …» и даёт звонить кнопкой 📞</p>'
          + st.staff.map(function (u) {
            return '<div class="x-qrow"><div><b>' + E(u.name) + "</b><small>" + E(POS[u.position] || "") + '</small></div><input class="tel-ext" data-ext="' + u.id + '" value="' + E(u.ext) + '" inputmode="numeric" maxlength="6" placeholder="—"><button class="x-btn ghost" data-extsave="' + u.id + '" style="padding:7px 12px">Сохранить</button></div>';
          }).join("") + "</div>";
      }
      h += '<div class="x-panel pad"><h3>Последние звонки</h3><p class="x-sub">' + (st.owner ? "Все звонки компании" : "Ваши звонки") + '</p><div class="calls-panel" style="margin-top:6px">' + rows(log) + "</div></div></div>";
      h += '<div class="x-sticky"><div class="x-panel pad"><h3>Мой номер</h3><p class="x-sub">' + (st.my_ext ? "Внутренний номер Sipuni: <b>" + E(st.my_ext) + "</b>" : "Внутренний номер не указан — его задаёт руководитель") + "</p>";
      if (st.owner) {
        var url = st.hook_path ? cfg().url + st.hook_path : "";
        h += '<h3 style="margin-top:16px">Подключение Sipuni</h3>'
          + '<p class="x-sub">События звонков: ' + (st.hook ? "приёмник включён" : "<b>не настроен</b> — задайте SIPUNI_HOOK_TOKEN в .env моста") + "<br>API (звонок из CRM, статистика, записи): " + (st.api ? "подключено" : "<b>не подключено</b> — SIPUNI_USER и SIPUNI_SECRET в .env моста") + "</p>"
          + (url ? '<div class="x-field"><label>Адрес для Sipuni («Настройки → API → События на АТС»)</label><input id="telHook" readonly value="' + E(url) + '"></div><button class="x-btn ghost" id="telCopy" style="width:100%;justify-content:center">Скопировать адрес</button>' : "")
          + (st.api ? '<p class="x-sub" style="margin-top:12px">Сверка со статистикой Sipuni — раз в ' + st.poll_minutes + " мин" + (st.last_poll ? ", последняя " + hm(st.last_poll) : "") + (st.poll_error ? '<br><span style="color:var(--bad)">' + E(st.poll_error) + "</span>" : "") + '</p><button class="x-btn ghost" id="telPoll" style="width:100%;justify-content:center">Сверить сейчас</button>' : "");
      }
      body.innerHTML = h + "</div></div></div>";
      body.querySelectorAll("[data-extsave]").forEach(function (b) {
        b.onclick = function () {
          var inp = body.querySelector('[data-ext="' + b.dataset.extsave + '"]');
          api("/ext", { user_id: +b.dataset.extsave, ext: inp.value.trim() }).then(function () { toast("Сохранено"); C.refresh(); T.paintMe(body); }).catch(function (e) { toast(String(e)); });
        };
      });
      if ($("telCopy")) $("telCopy").onclick = function () { var i = $("telHook"); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand("copy"); } toast("Адрес скопирован"); };
      if ($("telPoll")) $("telPoll").onclick = function () { api("/poll", {}).then(function (r) { toast("Сверено: добавлено звонков — " + r.result.added); T.paintMe(body); }).catch(function (e) { toast(String(e)); }); };
    }).catch(function (e) { body.innerHTML = '<div class="x-panel"><div class="x-empty">' + E(e) + "</div></div>"; });
  };
})();
