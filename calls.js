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
    if (on !== T.enabled) { T.enabled = on; setFast(on); if (on) api("/settings").then(function (st) { T.st = st; }).catch(function () {}); }
    if (on && SP.state_call && SP.state_call.indexOf("cb") === 0) cbTrack(s.calls);
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
    return '<button type="button" class="call-btn" data-dial="' + E(phone) + '" data-doid="' + (orderId || 0) + '" data-dcid="' + (customerId || 0) + '" title="' + (SP.ready ? "Позвонить из CRM" : "Позвонить через Sipuni: сначала зазвонит ваш телефон") + '">📞</button>';
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
      return '<button type="button" class="btn primary sm call-bar" data-dial="' + E(x.phone) + '" data-dwho="' + E(x.fio || "") + '"' + data + ' title="' + E((x.fio ? x.fio + " · " : "") + x.phone) + (SP.ready ? "" : " — сначала зазвонит ваш телефон") + '">📞 Позвонить заказчику</button>';
    }
    return '<span class="call-pick"><button type="button" class="btn primary sm call-bar" data-dialpick="1">📞 Позвонить заказчику ▾</button><span class="call-menu">'
      + list.map(function (x) { return '<button type="button" data-dial="' + E(x.phone) + '" data-dwho="' + E(x.fio || "") + '"' + data + "><b>" + E(x.fio || "Контакт") + "</b><small>" + E(x.phone) + "</small></button>"; }).join("") + "</span></span>";
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
    T.dial(b.getAttribute("data-dial"), b.getAttribute("data-dwho") || "", +b.getAttribute("data-doid") || 0, +b.getAttribute("data-dcid") || 0, b);
  }, true);
  /* звонок: с телефона — обычный звонок на свой мобильный; на компьютере — звонилка CRM; без неё — callback Sipuni (сначала звонит ваш телефон) */
  T.dial = function (phone, who, oid, cid, btn) {
    if (isPhone() && T.st && T.st.my_mobile) return cbCall(phone, who, oid, cid);
    if (SP.ready) return SP.call(phone, who, oid, cid);
    if (btn) btn.disabled = true;
    api("/dial", { phone: phone, order_id: oid || 0, customer_id: cid || 0 })
      .then(function (r) { toast("Звоним " + r.phone + ": сначала зазвонит ваш телефон (вн. " + r.ext + "), снимите трубку — Sipuni соединит с заказчиком"); })
      .catch(function (err) { toast(String(err)); })
      .then(function () { if (btn) setTimeout(function () { btn.disabled = false; }, 4000); });
  };

  /* ---------- звонилка CRM: разговор прямо в браузере через шлюз (gateway/, Asterisk ↔ Sipuni) ----------
     Мост отдаёт адрес шлюза и пароль своей линии (/calls/softphone); без них «Позвонить» работает через callback Sipuni. */
  var SP = T.sp = { ready: false, ua: null, cur: null, info: null, state: "" };
  function loadJsSIP() {
    if (window.JsSIP) return Promise.resolve();
    return new Promise(function (ok, bad) {
      var s = document.createElement("script"); s.src = "vendor/jssip.min.js?v=3.13.8"; s.onload = ok; s.onerror = function () { bad("не загрузилась звонилка"); };
      document.head.appendChild(s);
    });
  }
  function spStart() {
    if (SP.ua || SP.starting) return;
    SP.starting = true;
    api("/softphone").then(function (r) {
      var sp = r && r.softphone;
      if (!sp) { SP.none = true; return; }
      SP.info = sp;
      return loadJsSIP().then(function () {
        var host = new URL(sp.wss).hostname;
        SP.host = host;
        var ua = new JsSIP.UA({ sockets: [new JsSIP.WebSocketInterface(sp.wss)], uri: "sip:" + sp.user + "@" + host, password: sp.password,
          display_name: sp.name || "", register: true, session_timers: false, user_agent: "DS-CRM" });
        ua.on("registered", function () { SP.ready = true; SP.state = "ok"; spDot(); });
        ua.on("unregistered", function () { SP.ready = false; SP.state = "off"; spDot(); });
        ua.on("registrationFailed", function (e) { SP.ready = false; SP.state = "fail"; SP.why = e.cause || ""; spDot(); });
        ua.on("disconnected", function () { SP.ready = false; SP.state = "fail"; SP.why = "нет связи со шлюзом"; spDot(); });
        ua.on("newRTCSession", function (e) { if (e.originator === "remote") incoming(e.session); });
        ua.start();
        SP.ua = ua;
      });
    }).catch(function () {}).then(function () { SP.starting = false; });
  }
  function spStop() {
    if (SP.cur) { try { SP.cur.terminate(); } catch (e) {} }
    if (SP.ua) { try { SP.ua.stop(); } catch (e) {} }
    SP.ua = null; SP.ready = false; SP.state = ""; SP.none = false; spDot();
  }
  C.on("logout", spStop);
  /* звонилка поднимается у тех, у кого есть внутренний номер и линия подключена к шлюзу (спрашиваем мост один раз за вход) */
  setInterval(function () { if (T.enabled && C.loggedIn() && !SP.ua && !SP.none) spStart(); }, 3000);
  function spDot() { document.body.classList.toggle("sp-on", !!SP.ready); var d = $("spState"); if (d) d.innerHTML = spStateText(); }
  function spStateText() {
    return SP.state === "ok" ? '<span style="color:var(--ok)">● подключена</span> — «Позвонить» звонит прямо из CRM'
      : SP.state === "fail" ? '<span style="color:var(--bad)">● нет связи</span>' + (SP.why ? " (" + E(SP.why) + ")" : "") : "● не подключена";
  }
  function dialNum(p) { var d = String(p || "").replace(/\D/g, ""); return d.length === 10 ? "7" + d : d.length === 11 && d[0] === "8" ? "7" + d.slice(1) : d; }
  var remote = new Audio(); remote.autoplay = true;
  var ringtone = null;
  function ring(on) {
    if (on && !ringtone && window.DSSound) { try { DSSound.play(); } catch (e) {} ringtone = setInterval(function () { try { DSSound.play(); } catch (e) {} }, 2500); }
    if (!on && ringtone) { clearInterval(ringtone); ringtone = null; }
  }
  function attach(session) {
    var pc = session.connection;
    if (!pc) return;
    pc.addEventListener("track", function (ev) { remote.srcObject = ev.streams[0]; remote.play().catch(function () {}); });
  }
  function opts() {
    return { mediaConstraints: { audio: true, video: false }, pcConfig: { iceServers: SP.info && SP.info.stun ? [{ urls: SP.info.stun }] : [] },
      rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false } };
  }
  SP.call = function (phone, who, oid, cid) {
    if (SP.cur) { toast("Сначала завершите текущий звонок"); return; }
    var num = dialNum(phone);
    if (num.length < 10) { toast("Неверный номер телефона"); return; }
    api("/intent", { phone: num, order_id: oid || 0, customer_id: cid || 0 }).catch(function () {});     // чтобы звонок попал в историю нужной задачи
    var s;
    try { s = SP.ua.call("sip:" + num + "@" + SP.host, opts()); } catch (e) { toast("Звонилка: " + e.message); return; }
    track(s, { dir: "out", who: who, phone: phone, oid: oid });
    attach(s);
  };
  function incoming(s) {
    if (SP.cur) { s.terminate({ status_code: 486 }); return; }
    var num = (s.remote_identity && s.remote_identity.uri && s.remote_identity.uri.user) || "";
    var card = ((C.sync && C.sync.calls) || []).filter(function (c) { return c.state === "ring" && String(c.phone).replace(/\D/g, "").slice(-10) === num.replace(/\D/g, "").slice(-10); })[0] || {};
    track(s, { dir: "in", who: card.who || (s.remote_identity && s.remote_identity.display_name) || "", phone: card.phone || num, oid: card.order_id, number: card.number });
    ring(true);
    s.on("peerconnection", function () { attach(s); });
  }
  SP.incoming = incoming;
  function isPhone() { return !!(window.matchMedia && matchMedia("(pointer: coarse)").matches) && Math.min(screen.width, screen.height) < 820; }
  function cbCall(phone, who, oid, cid) {
    if (SP.cur || (SP.state_call && SP.state_call !== "ended")) { toast("Сначала завершите текущий звонок"); return; }
    var num = dialNum(phone);
    SP.call_info = { dir: "out", who: who, phone: phone, oid: oid, mode: "mobile", num10: num.slice(-10) };
    SP.state_call = "cb-wait"; SP.cb_id = ""; SP.cb_seen = false; SP.t0 = 0; SP.end = ""; SP.cb_at = Date.now();
    paintPhone();
    api("/dial", { phone: phone, order_id: oid || 0, customer_id: cid || 0, via: "mobile" })
      .then(function (r) { SP.call_info.mobile = r.mobile; paintPhone(); C.refresh(); })
      .catch(function (e) { SP.state_call = "ended"; SP.end = String(e); paintPhone(); });
  }
  function cbTrack(list) {
    var i = SP.call_info || {}, c = (list || []).filter(function (x) { return x.dir === "out" && String(x.phone).replace(/\D/g, "").slice(-10) === i.num10; })[0];
    if (c) {
      SP.cb_id = c.id; SP.cb_seen = true;
      var st = c.state === "talk" ? "cb-talk" : "cb-ring";
      if (st === "cb-talk" && !SP.t0) SP.t0 = c.answered ? c.answered * 1000 : Date.now();
      if (st !== SP.state_call) { SP.state_call = st; paintPhone(); }
    } else if (SP.cb_seen || Date.now() - SP.cb_at > 120000) {
      SP.state_call = "ended"; SP.end = SP.t0 ? "ok" : (SP.cb_seen ? "Не дозвонились" : "Звонок завершён");
      SP.dur = SP.t0 ? Math.round((Date.now() - SP.t0) / 1000) : 0; paintPhone();
      setTimeout(function () { if (SP.state_call === "ended") { SP.state_call = ""; paintPhone(); } }, 6000);
    }
  }
  function track(s, info) {
    SP.cur = s; SP.call_info = info; SP.t0 = 0; SP.state_call = info.dir === "in" ? "ringing-in" : "dialing"; SP.end = ""; SP.muted = false;
    s.on("progress", function () { if (info.dir === "out") { SP.state_call = "ringing"; paintPhone(); } });
    s.on("accepted", function () { SP.state_call = "talk"; SP.t0 = Date.now(); ring(false); paintPhone(); });
    s.on("confirmed", function () { if (!SP.t0) SP.t0 = Date.now(); SP.state_call = "talk"; paintPhone(); });
    function done(why) {
      ring(false);
      SP.end = why; SP.state_call = "ended"; SP.dur = SP.t0 ? Math.round((Date.now() - SP.t0) / 1000) : 0; SP.cur = null;
      remote.srcObject = null; paintPhone();
      setTimeout(function () { if (!SP.cur && SP.state_call === "ended") { SP.state_call = ""; paintPhone(); } }, 6000);
    }
    s.on("ended", function () { done("ok"); });
    s.on("failed", function (e) {
      var c = e.cause, J = JsSIP.C.causes;
      done(c === J.BUSY ? "Занято" : c === J.NO_ANSWER || c === J.REQUEST_TIMEOUT ? "Не ответили" : c === J.REJECTED ? "Звонок отклонён" : c === J.CANCELED ? "Звонок отменён"
        : c === J.USER_DENIED_MEDIA_ACCESS ? "Нет доступа к микрофону — разрешите микрофон для сайта" : c === J.UNAVAILABLE || c === J.NOT_FOUND ? "Номер недоступен" : "Не удалось: " + c);
    });
    paintPhone();
  }
  function phoneBox() { var b = $("dsPhone"); if (!b) { b = document.createElement("div"); b.id = "dsPhone"; document.body.appendChild(b); } return b; }
  var tick = null;
  function mmss(s) { return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function paintPhone() {
    var b = phoneBox(), st = SP.state_call, i = SP.call_info || {};
    clearInterval(tick); tick = null;
    if (!st) { b.innerHTML = ""; document.body.classList.remove("sp-call"); return; }
    document.body.classList.add("sp-call");
    var label = st === "dialing" ? "Соединяем…" : st === "ringing" ? "Идут гудки…" : st === "ringing-in" ? "Входящий звонок" : st === "talk" || st === "cb-talk" ? "Разговор"
      : st === "cb-wait" ? "Сейчас зазвонит ваш мобильный" + (i.mobile ? " " + i.mobile : "") + " — ответьте" : st === "cb-ring" ? "Вызываем заказчика…" : (SP.end === "ok" ? "Звонок завершён" : SP.end);
    var timer = st === "talk" || st === "cb-talk" ? ' <b class="sp-t" id="spT">' + mmss(Math.round((Date.now() - SP.t0) / 1000)) + "</b>" : st === "ended" && SP.dur ? ' <b class="sp-t">' + mmss(SP.dur) + "</b>" : "";
    var btns = st === "ringing-in" ? '<button type="button" class="sp-b ok" data-sp="answer">📞 Ответить</button><button type="button" class="sp-b no" data-sp="hang">Отклонить</button>'
      : st === "ended" ? '<button type="button" class="sp-b" data-sp="close">Закрыть</button>'
      : st.indexOf("cb") === 0 ? (SP.cb_id ? '<button type="button" class="sp-b no" data-sp="cbhang">Завершить</button>' : '<button type="button" class="sp-b" data-sp="close">Скрыть</button>')
      : '<button type="button" class="sp-b" data-sp="mute">' + (SP.muted ? "🔇 Микрофон выкл." : "🎙 Микрофон") + '</button><button type="button" class="sp-b no" data-sp="hang">Завершить</button>';
    b.innerHTML = '<div class="sp-win ' + (st === "cb-talk" ? "talk " : "") + st + (SP.min ? " min" : "") + '"><div class="sp-h"><span>' + (i.dir === "in" ? "Входящий" : "Исходящий") + (i.mode === "mobile" ? " · через ваш мобильный" : " · звонок из CRM") + '</span><button type="button" data-sp="min" title="Свернуть">' + (SP.min ? "▢" : "—") + "</button></div>"
      + '<div class="sp-who"><b>' + E(i.who || i.phone || "") + "</b><small>" + E([i.who ? i.phone : "", i.number ? "задача №" + i.number : ""].filter(Boolean).join(" · ")) + "</small></div>"
      + '<div class="sp-st">' + E(label) + timer + "</div>"
      + (i.oid && !SP.min ? '<a class="sp-link" href="#/task/' + i.oid + '">Открыть задачу</a>' : "")
      + '<div class="sp-btns">' + btns + "</div></div>";
    if (st === "talk" || st === "cb-talk") tick = setInterval(function () { var t = $("spT"); if (t) t.textContent = mmss(Math.round((Date.now() - SP.t0) / 1000)); }, 1000);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-sp]");
    if (!b) return;
    var a = b.getAttribute("data-sp"), s = SP.cur;
    if (a === "answer" && s) { ring(false); s.answer(opts()); }
    else if (a === "hang" && s) { try { s.terminate(); } catch (err) {} }
    else if (a === "mute" && s) { SP.muted = !SP.muted; if (SP.muted) s.mute({ audio: true }); else s.unmute({ audio: true }); paintPhone(); }
    else if (a === "min") { SP.min = !SP.min; paintPhone(); }
    else if (a === "close") { SP.state_call = ""; paintPhone(); }
    else if (a === "cbhang" && SP.cb_id) { api("/" + encodeURIComponent(SP.cb_id) + "/hangup", {}).catch(function (err) { toast(String(err)); }); }
  });
  window.addEventListener("beforeunload", function (e) { if (SP.cur) { e.preventDefault(); e.returnValue = "Идёт звонок"; } });


  /* ---------- набор номера: трубка у колокольчика (на телефоне — в нижнем меню) ----------
     Цифры или поиск заказчика по названию, контакту, телефону; без ввода — последние звонки. Звонит тем же путём, что «Позвонить заказчику». */
  var PH_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>';
  var DL = { open: false, q: "", pick: null, cust: null, recent: null };
  function dialerButtons() {
    var me = C.me || {}, p = me.position || (me.role === "admin" ? "owner" : ""), on = T.enabled && CALL_ROLES[p];
    var brand = document.querySelector(".side .sbrand"), sb = $("scall");
    if (on && brand && !sb) {
      sb = document.createElement("button"); sb.id = "scall"; sb.className = "sbell scall"; sb.type = "button";
      sb.title = "Набрать номер"; sb.setAttribute("aria-label", "Набрать номер"); sb.setAttribute("data-dialer", "1"); sb.innerHTML = PH_SVG;
      brand.appendChild(sb);
    } else if (!on && sb) sb.remove();
    var bn = $("bottomnav"), mb = bn && bn.querySelector("[data-dialer]");
    if (on && bn && !mb) {
      mb = document.createElement("button"); mb.type = "button"; mb.setAttribute("data-dialer", "1"); mb.innerHTML = PH_SVG + "Звонок";
      var more = bn.querySelector("[data-more]"); bn.insertBefore(mb, more || null);
    } else if (!on && mb) mb.remove();
  }
  setInterval(dialerButtons, 1500);            // нижнее меню перерисовывается при каждом переходе — возвращаем кнопку
  C.on("logout", function () { dialerClose(); dialerButtons(); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-dialer]");
    if (b) { e.preventDefault(); e.stopPropagation(); DL.open ? dialerClose() : dialerOpen(); }
  }, true);
  function dialerOpen() {
    DL.open = true; DL.q = ""; DL.pick = null;
    var bg = document.createElement("div"); bg.id = "dsDial"; bg.className = "dl-bg";
    bg.innerHTML = '<div class="dl-win" role="dialog" aria-label="Набор номера"><div class="dl-h"><b>Набор номера</b><button type="button" class="dl-x" data-dlx="1" aria-label="Закрыть">✕</button></div>'
      + '<input id="dlNum" class="dl-num" type="text" inputmode="tel" autocomplete="off" placeholder="Номер или имя заказчика">'
      + '<div class="dl-who" id="dlWho"></div><div class="dl-list" id="dlList"></div>'
      + '<div class="dl-pad">' + ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "⌫"].map(function (k) { return '<button type="button" data-dlk="' + k + '">' + k + "</button>"; }).join("") + "</div>"
      + '<button type="button" class="dl-call" id="dlCall" disabled>' + PH_SVG + 'Позвонить</button></div>';
    document.body.appendChild(bg);
    var inp = $("dlNum");
    inp.addEventListener("input", function () { DL.q = inp.value; DL.pick = null; dialerPaint(); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") dialerGo(); if (e.key === "Escape") dialerClose(); });
    bg.addEventListener("click", function (e) {
      if (e.target === bg || e.target.closest("[data-dlx]")) return dialerClose();
      var k = e.target.closest("[data-dlk]");
      if (k) { var v = k.getAttribute("data-dlk"); inp.value = v === "⌫" ? inp.value.slice(0, -1) : inp.value + v; DL.q = inp.value; DL.pick = null; dialerPaint(); return; }
      var it = e.target.closest("[data-dli]");
      if (it) { DL.pick = DL.items[+it.getAttribute("data-dli")]; inp.value = DL.pick.phone; DL.q = inp.value; dialerPaint(true); return; }
      if (e.target.closest("#dlCall")) dialerGo();
    });
    if (!isPhone()) inp.focus();
    if (!DL.cust) C.call("/../ds/customers").then(function (l) { DL.cust = l || []; dialerPaint(); }).catch(function () { DL.cust = []; });
    api("").then(function (l) { DL.recent = l || []; dialerPaint(); }).catch(function () { DL.recent = []; });
    dialerPaint();
  }
  function dialerClose() { DL.open = false; var b = $("dsDial"); if (b) b.remove(); }
  function dg(x) { return String(x || "").replace(/\D/g, ""); }
  function fold(x) { return String(x || "").toLowerCase().replace(/ё/g, "е"); }
  function dialerPaint(keepList) {
    if (!DL.open) return;
    var q = DL.q.trim(), d = dg(q), items = [];
    if (!q) {                                                    // последние звонки, по одному на номер
      var seen = {};
      (DL.recent || []).forEach(function (r) { var k = dg(r.phone).slice(-10); if (k && !seen[k] && items.length < 6) { seen[k] = 1; items.push({ phone: r.phone, who: r.who !== r.phone ? r.who : "", cid: r.customer_id, oid: r.order_id, note: (r.dir === "out" ? "↗ " : "↙ ") + hm(r.ts) }); } });
    } else if (d.length >= 3 || (!d && q.length >= 2)) {         // заказчики: телефон контакта, название, ФИО
      var f = fold(q);
      (DL.cust || []).forEach(function (c) {
        (c.contacts || []).forEach(function (x) {
          var pd = dg(x.phone);
          if (pd.length < 10 || items.length >= 6) return;
          if ((d && pd.indexOf(d.length > 10 ? d.slice(-10) : d) >= 0) || (!d && (fold(c.name).indexOf(f) >= 0 || fold(x.fio).indexOf(f) >= 0)))
            items.push({ phone: x.phone, who: [/^Контакты amoCRM/.test(c.name) ? "" : c.name, x.fio].filter(Boolean).join(" · "), cid: c.id, oid: 0, note: "" });   // общая карточка amoCRM — только ФИО
        });
      });
    }
    DL.items = items;
    if (!keepList) $("dlList").innerHTML = items.length ? (q ? "" : '<small class="dl-cap">Последние звонки</small>') + items.map(function (x, i) {
      return '<button type="button" class="dl-it" data-dli="' + i + '"><b>' + E(x.who || x.phone) + "</b><small>" + E((x.who ? x.phone : "") + (x.note ? "  " + x.note : "")) + "</small></button>";
    }).join("") : (q && !d ? '<small class="dl-cap">Никого не нашли — введите номер цифрами</small>' : "");
    var num = DL.pick ? dg(DL.pick.phone) : d;
    $("dlWho").textContent = DL.pick && DL.pick.who ? DL.pick.who : "";
    $("dlCall").disabled = num.length < 10;
  }
  function dialerGo() {
    var p = DL.pick, phone = p ? p.phone : DL.q.trim();
    if (dg(phone).length < 10) { toast("Введите номер полностью: +7 и 10 цифр"); return; }
    dialerClose();
    T.dial(phone, p ? p.who : "", p ? p.oid : 0, p ? p.cid : 0);
  }

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
            return '<div class="x-qrow"><div><b>' + E(u.name) + "</b><small>" + E(POS[u.position] || "") + '</small></div><input class="tel-ext" data-ext="' + u.id + '" value="' + E(u.ext) + '" inputmode="numeric" maxlength="6" placeholder="вн. №"><input class="tel-ext tel-mob" data-mob="' + u.id + '" value="' + E(u.mobile || "") + '" inputmode="tel" placeholder="мобильный"><button class="x-btn ghost" data-extsave="' + u.id + '" style="padding:7px 12px">Сохранить</button></div>';
          }).join("") + "</div>";
      }
      h += '<div class="x-panel pad"><h3>Последние звонки</h3><p class="x-sub">' + (st.owner ? "Все звонки компании" : "Ваши звонки") + '</p><div class="calls-panel" style="margin-top:6px">' + rows(log) + "</div></div></div>";
      h += '<div class="x-sticky"><div class="x-panel pad"><h3>Мой номер</h3><p class="x-sub">' + (st.my_ext ? "Внутренний номер Sipuni: <b>" + E(st.my_ext) + "</b>" : "Внутренний номер не указан — его задаёт руководитель") + "</p>"
        + (st.softphone ? '<p class="x-sub">Звонилка CRM: <span id="spState">' + spStateText() + "</span></p>" : "")
        + (st.my_ext ? '<div class="x-field"><label>Мой мобильный — с телефона CRM звонит через него: отвечаете и говорите как по обычному телефону</label><input id="telMyMob" inputmode="tel" value="' + E(st.my_mobile || "") + '" placeholder="+7 …"></div><button class="x-btn ghost" id="telMyMobSave" style="width:100%;justify-content:center">Сохранить мобильный</button>' : "");
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
          var id = +b.dataset.extsave, inp = body.querySelector('[data-ext="' + id + '"]'), mob = body.querySelector('[data-mob="' + id + '"]');
          api("/ext", { user_id: id, ext: inp.value.trim() }).then(function () { return api("/mobile", { user_id: id, phone: mob.value.trim() }); })
            .then(function (st) { if (st && st.my_ext !== undefined) T.st = st; toast("Сохранено"); C.refresh(); T.paintMe(body); }).catch(function (e) { toast(String(e)); });
        };
      });
      if ($("telMyMobSave")) $("telMyMobSave").onclick = function () { api("/mobile", { phone: $("telMyMob").value.trim() }).then(function (st2) { T.st = st2; toast(st2.my_mobile ? "Мобильный сохранён" : "Мобильный убран"); T.paintMe(body); }).catch(function (e) { toast(String(e)); }); };
      if ($("telCopy")) $("telCopy").onclick = function () { var i = $("telHook"); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand("copy"); } toast("Адрес скопирован"); };
      if ($("telPoll")) $("telPoll").onclick = function () { api("/poll", {}).then(function (r) { toast("Сверено: добавлено звонков — " + r.result.added); T.paintMe(body); }).catch(function (e) { toast(String(e)); }); };
    }).catch(function (e) { body.innerHTML = '<div class="x-panel"><div class="x-empty">' + E(e) + "</div></div>"; });
  };
})();
