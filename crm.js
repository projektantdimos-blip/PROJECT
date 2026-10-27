/* Связь с сервером CRM (/api/crm): вход по PIN, опрос состояния, уведомления, push.
   Адрес и ключ сервера — config.js или ⚙ (localStorage: ds_bridge). Личная сессия — localStorage: ds_session. */
(function () {
  "use strict";
  var C = window.MPBC = { me: null, prefs: null, sync: null, bot: false, users: [] };
  var listeners = {};
  C.on = function (n, f) { (listeners[n] = listeners[n] || []).push(f); };
  function emit(n, a) { (listeners[n] || []).forEach(function (f) { try { f(a); } catch (e) { console.error(e); } }); }
  function $(id) { return document.getElementById(id); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ic(n) { return window.icon ? window.icon(n) : ""; }

  /* ---------- настройки и запросы ---------- */
  function cfg() {
    try { var c = JSON.parse(localStorage.getItem("ds_bridge") || "{}"), d = window.DS_CONFIG || {}; return { url: String(c.url || d.url || "").replace(/\/+$/, ""), key: c.key || d.key || "" }; }
    catch (e) { return { url: "", key: "" }; }
  }
  function tok() { try { return localStorage.getItem("ds_session") || ""; } catch (e) { return ""; } }
  function setSession(t) { try { if (t) localStorage.setItem("ds_session", t); else localStorage.removeItem("ds_session"); } catch (e) {} }
  C.configured = function () { var c = cfg(); return !!(c.url && c.key); };
  C.loggedIn = function () { return !!(C.me && tok()); };

  C.call = function (path, opts) {
    opts = opts || {};
    var c = cfg();
    if (!c.url || !c.key) return Promise.reject("Мост не подключён: адрес и ключ — в ⚙ (как для «Общения»)");
    var h = { "X-Api-Key": c.key, "Content-Type": "application/json" };
    if (opts.auth !== false && tok()) h["X-Session"] = tok();
    return fetch(c.url + "/api/crm" + path, {
      method: opts.method || (opts.body ? "POST" : "GET"), headers: h,      // без cache:"no-store" — иначе предзапрос OPTIONS перед каждым запросом; не кэшировать велит мост
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (r.status === 401 && opts.auth !== false && tok()) { C.me = null; setSession(""); emit("logout"); throw "Сессия истекла — войдите снова"; }
      if (!r.ok) {
        return r.json().then(function (j) { return j; }, function () { return {}; }).then(function (j) {
          if (r.status === 404 && j && j.detail === "Not Found") throw "Эта функция требует обновления сервера моста (загрузите новую папку app и перезапустите — см. гайд). Сайт уже обновлён.";
          throw (j && typeof j.detail === "string") ? j.detail : ("Ошибка сервера " + r.status);
        });
      }
      return r.json();
    }, function () { throw "Сервер недоступен. Проверьте адрес моста в ⚙ и интернет"; });
  };

  /* загрузка файла на мост потоком (до 50 МБ, как FILE_MAX_MB на сервере) → номер загрузки для send-file; onProgress(0–100) */
  C.MAX_FILE_MB = 50;
  C.upload = function (blob, name, onProgress) {
    var c = cfg();
    if (!c.url || !c.key) return Promise.reject("Мост не подключён: адрес и ключ — в ⚙");
    if (blob.size > C.MAX_FILE_MB * 1024 * 1024) return Promise.reject("Файл больше " + C.MAX_FILE_MB + " МБ");
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open("POST", c.url + "/api/crm/upload");
      x.setRequestHeader("X-Api-Key", c.key);
      if (tok()) x.setRequestHeader("X-Session", tok());
      x.setRequestHeader("Content-Type", blob.type || "application/octet-stream");
      x.setRequestHeader("X-File-Name", encodeURIComponent(name || blob.name || "файл"));
      if (onProgress) x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round(e.loaded * 100 / e.total)); };
      x.onload = function () {
        var j = {}; try { j = JSON.parse(x.responseText || "{}"); } catch (e) {}
        if (x.status >= 200 && x.status < 300 && j.upload) return resolve(j.upload);
        if (x.status === 404) return reject("Загрузка больших файлов требует обновления сервера моста");
        reject(typeof j.detail === "string" ? j.detail : ("Ошибка сервера " + x.status));
      };
      x.onerror = function () { reject("Связь прервалась при загрузке файла — попробуйте ещё раз"); };
      x.send(blob);
    });
  };

  /* файл с моста (PDF/Word и т.п.): { blob, name } */
  C.blob = function (path) {
    var c = cfg();
    if (!c.url || !c.key) return Promise.reject("Мост не подключён: адрес и ключ — в ⚙");
    var h = { "X-Api-Key": c.key };
    if (tok()) h["X-Session"] = tok();
    return fetch(c.url + "/api" + path, { headers: h }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { return j; }, function () { return {}; }).then(function (j) { throw (j && typeof j.detail === "string") ? j.detail : ("Ошибка сервера " + r.status); });
      var cd = r.headers.get("Content-Disposition") || "", m = /filename\*=UTF-8'[^']*'([^;]+)/i.exec(cd) || /filename="?([^";]+)"?/i.exec(cd), name = "документ";
      if (m) { try { name = decodeURIComponent(m[1]); } catch (e) { name = m[1]; } }
      return r.blob().then(function (b) {
        if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) { var ext = { "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png" }[b.type]; if (ext) name += ext; }
        return { blob: b, name: name };
      });
    }, function () { throw "Сервер недоступен. Проверьте адрес моста в ⚙ и интернет"; });
  };

  /* ---------- вход ---------- */
  C.init = function () {
    if (!tok() || !C.configured()) { emit("ready"); return Promise.resolve(); }
    return C.call("/me").then(function (r) { C.me = r.user; C.prefs = r.prefs; C.bot = r.bot; C.maxBot = r.max_bot || ""; startPolling(); emit("login", C.me); })
      .catch(function () { /* сессия недействительна — просто не вошли */ }).then(function () { emit("ready"); });
  };
  C.login = function (name, pin) {
    return C.call("/auth/login", { auth: false, body: { name: name, pin: pin, tz: -new Date().getTimezoneOffset() } }).then(function (r) {
      setSession(r.token); C.me = r.user;
      return C.call("/me").then(function (m) { C.prefs = m.prefs; C.bot = m.bot; C.maxBot = m.max_bot || ""; startPolling(); emit("login", C.me); return C.me; });
    });
  };
  C.logout = function () {
    // устройство перестаёт получать push этого сотрудника (на общем компьютере уведомления не должны доставаться следующему)
    try {
      if (C.pushSupported() && localStorage.getItem("ds_push_user")) {
        navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
          if (sub) C.call("/me/push/unsubscribe", { body: { endpoint: sub.endpoint } }).catch(function () {}).then(function () { return sub.unsubscribe(); });
          localStorage.removeItem("ds_push_user");
        }).catch(function () {});
      }
    } catch (e) {}
    var p = C.loggedIn() ? C.call("/auth/logout", { method: "POST", body: {} }).catch(function () {}) : Promise.resolve();
    return p.then(function () { C.me = null; C.sync = null; setSession(""); stopPolling(); emit("logout"); });
  };

  /* окно входа; возвращает Promise, который выполняется после успешного входа */
  C.requireLogin = function () {
    if (C.loggedIn()) return Promise.resolve(C.me);
    return new Promise(function (resolve, reject) {
      var v = $("xLoginVeil");
      if (!v) { v = document.createElement("div"); v.id = "xLoginVeil"; v.className = "x-mveil"; document.body.appendChild(v); }
      v.className = "x-mveil on";
      v.innerHTML = '<div class="x-modal"><h3>Вход в CRM</h3><p class="x-sub">Выберите себя и введите PIN</p><div class="x-field"><label>Сотрудник</label><select id="xLName"><option>Загрузка…</option></select></div>'
        + '<div class="x-field"><label>PIN</label><input type="password" id="xLPin" class="x-pin" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="••••"></div><div class="x-err" id="xLErr"></div>'
        + '<div class="x-row"><button class="x-btn ghost" id="xLCancel">Отмена</button><button class="x-btn primary" id="xLGo">Войти</button></div></div>';
      function close() { v.className = "x-mveil"; v.innerHTML = ""; }
      $("xLCancel").onclick = function () { close(); reject("cancel"); };
      v.onclick = function (e) { if (e.target === v) { close(); reject("cancel"); } };
      C.call("/auth/users", { auth: false }).then(function (names) {
        C.users = names;
        $("xLName").innerHTML = names.length ? names.map(function (n) { return "<option>" + E(n) + "</option>"; }).join("") : "<option value=''>Нет сотрудников</option>";
        var last = ""; try { last = localStorage.getItem("ds_last_user") || ""; } catch (e) {}
        if (last && names.indexOf(last) >= 0) $("xLName").value = last;
        $("xLPin").focus();
      }).catch(function (e) { $("xLErr").textContent = String(e); });
      function go() {
        var n = $("xLName").value, p = $("xLPin").value;
        if (!n || !p) { $("xLErr").textContent = "Выберите сотрудника и введите PIN"; return; }
        $("xLGo").disabled = true;
        C.login(n, p).then(function (u) { try { localStorage.setItem("ds_last_user", u.name); } catch (e) {} close(); resolve(u); })
          .catch(function (e) { $("xLGo").disabled = false; $("xLErr").textContent = String(e); $("xLPin").value = ""; $("xLPin").focus(); });
      }
      $("xLGo").onclick = go; $("xLPin").onkeydown = function (e) { if (e.key === "Enter") go(); };
    });
  };

  /* ---------- опрос состояния, срочные и уведомления ---------- */
  var timer = null, shownUrgent = {};
  function startPolling() { stopPolling(); C.refresh(); timer = setInterval(C.refresh, 15000); }
  function stopPolling() { if (timer) { clearInterval(timer); timer = null; } }
  /* яркое всплывающее уведомление сверху экрана + мигание вкладки; не требует разрешений браузера */
  var alertShown = {}, flashT = null;
  window.DSAlert = {
    show: function (title, body, url, urgent, fn) {
      var box = $("dsAlerts"); if (!box) { box = document.createElement("div"); box.id = "dsAlerts"; document.body.appendChild(box); }
      while (box.children.length >= 3) box.removeChild(box.firstChild);
      var el = document.createElement("div"); el.className = "ds-alert" + (urgent ? " urg" : "");
      el.innerHTML = '<span class="ai">' + (urgent ? "🔥" : "💬") + '</span><div class="at"><b>' + E(title || "Новое сообщение") + "</b><span>" + E((body || "").slice(0, 140)) + '</span></div><button type="button" aria-label="Закрыть">✕</button>';
      var gone = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.querySelector("button").onclick = function (e) { e.stopPropagation(); gone(); };
      el.onclick = function () { gone(); if (fn) fn(); else if (url) { var i = String(url).indexOf("#"); if (i >= 0) location.hash = String(url).slice(i); } };
      box.appendChild(el);
      if (!urgent) setTimeout(gone, 12000);
      if (window.DSSound) { try { DSSound.play(); } catch (e) {} }
      if (document.hidden) startFlash(title);
    }
  };
  function startFlash(msg) {
    if (flashT) return;
    var base = document.title, on = false;
    flashT = setInterval(function () { on = !on; document.title = on ? "🔔 " + (msg || "Новое сообщение") : base; }, 1000);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && flashT) { clearInterval(flashT); flashT = null; document.title = document.title.replace(/^🔔 .*$/, "Проекты DS — CRM"); } });
  C.refresh = function () {
    if (!C.loggedIn()) return Promise.resolve();
    return C.call("/sync").then(function (s) {
      var prev = C.sync; C.sync = s; paintBadges();
      if (prev) {
        var dn = (s.notif_unread || 0) - (prev.notif_unread || 0);
        if (dn > 0) C.call("/notifications").then(function (r) { (r.items || []).filter(function (n) { return !n.is_read && !alertShown[n.id]; }).slice(0, 3).forEach(function (n) { alertShown[n.id] = 1; DSAlert.show(n.title, n.body, n.url, n.urgent); }); }).catch(function () {});
      }
      // плашка и звук — только на уведомления колокольчика (задачи, @упоминания, срочное); обычные сообщения чатов видны цифрой на «Команде»
      if (prev && window.DSSound && (s.notif_unread || 0) > (prev.notif_unread || 0)) DSSound.play();
      (s.urgent || []).slice(0, 3).forEach(function (m) { if (!shownUrgent[m.id]) { shownUrgent[m.id] = 1; if (prev || Date.now() / 1000 - m.ts < 86400) urgentBanner(m); } });   // после входа — свежие неподтверждённые срочные тоже всплывают
      emit("sync", s);
    }).catch(function () {});
  };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) C.refresh(); });

  function banners() { var b = $("xBanners"); if (!b) { b = document.createElement("div"); b.id = "xBanners"; b.className = "x-banners"; document.body.appendChild(b); } return b; }
  function urgentBanner(m) {
    var b = document.createElement("div"); b.className = "x-banner urgent";
    b.innerHTML = "<b>" + ic("flame") + " Срочно · " + E(m.room) + "</b><p>" + E(m.user) + ": " + E(m.text) + '</p><div class="acts"><button class="x-btn primary" data-a="ack" style="padding:8px 14px">Прочитал</button><button class="x-btn ghost" data-a="open" style="padding:8px 14px">Открыть</button></div>';
    b.querySelector('[data-a="ack"]').onclick = function () { C.call("/team/messages/" + m.id + "/ack", { body: {} }).then(function () { b.remove(); C.refresh(); }).catch(function () {}); };
    b.querySelector('[data-a="open"]').onclick = function () { b.remove(); location.hash = "#/team?room=" + encodeURIComponent(m.room_id); };
    banners().appendChild(b);
  }
  function paintBadges() {
    var s = C.sync || {}, team = s.team_unread || 0, urg = (s.urgent || []).length;
    document.querySelectorAll('#topnav button[data-goto="#/team"], #bottomnav button[data-goto="#/team"]').forEach(function (b) {
      var o = b.querySelector(".nav-badge"); if (o) o.remove();
      if (team || urg) { var x = document.createElement("span"); x.className = "nav-badge" + (urg ? " red" : ""); x.textContent = team || urg; b.appendChild(x); }
    });
    document.querySelectorAll('button[data-notif]').forEach(function (b) {
      var o = b.querySelector(".nav-badge"); if (o) o.remove();
      if (s.notif_unread) { var x = document.createElement("span"); x.className = "nav-badge"; x.textContent = s.notif_unread; b.appendChild(x); }
    });
  }
  C.afterNav = function () {                       // вызывается после перерисовки меню
    paintBadges();
    var chip = $("meChip");
    if (chip) {
      chip.innerHTML = C.me ? E(C.me.name) + "<small>" + (C.me.role === "admin" ? "руководитель · кабинет" : "личный кабинет") + "</small>" : "Войти<small>вход по PIN</small>";
      chip.onclick = function () { location.hash = "#/me"; };
    }
    var nb = document.querySelector('button[data-notif]');
    if (nb) nb.onclick = function (e) { e.stopPropagation(); C.toggleNotifs(); };
  };
  C.on("login", C.afterNav); C.on("logout", C.afterNav); C.on("ready", C.afterNav);

  /* колокольчик: список уведомлений */
  C.toggleNotifs = function () {
    var p = $("xPop");
    if (p && p.classList.contains("on")) { p.classList.remove("on"); return; }
    C.requireLogin().then(function () {
      if (!p) { p = document.createElement("div"); p.id = "xPop"; p.className = "x-pop"; document.body.appendChild(p); }
      p.classList.add("on"); p.innerHTML = '<h6>Уведомления</h6><div class="x-empty" style="padding:20px">Загрузка…</div>';
      C.call("/notifications").then(function (r) {
        p.innerHTML = '<h6>Уведомления<span id="xReadAll">Прочитать все</span></h6>' + (r.items.map(function (n) {
          return '<div class="x-nt ' + (n.is_read ? "" : "unread") + (n.urgent ? " urg" : "") + '" data-id="' + n.id + '" data-u="' + E(n.url) + '"><span class="ni ' + (n.urgent ? "c-bad" : "c-blue") + '">' + ic(n.urgent ? "flame" : "bell") + "</span><div><b>" + E(n.title) + "</b><small>" + E(n.body) + "</small><small>" + new Date(n.ts * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + "</small></div></div>";
        }).join("") || '<div class="x-empty" style="padding:26px">Пока уведомлений нет</div>');
        var ra = $("xReadAll"); if (ra) ra.onclick = function () { C.call("/notifications/read", { body: {} }).then(function () { C.refresh(); C.toggleNotifs(); }); };
        /* открытие списка ничего не прочитывает: уведомление гаснет только после нажатия на него */
        p.querySelectorAll(".x-nt").forEach(function (n, k) {
          n.onclick = function () {
            p.classList.remove("on"); var u = n.dataset.u || ""; var i = u.indexOf("#");
            if (n.classList.contains("unread")) C.call("/notifications/read", { body: { id: +n.dataset.id } }).then(function () { C.refresh(); }).catch(function () {});
            if (i >= 0) location.hash = u.slice(i);
          };
        });
      }).catch(function (e) { p.innerHTML = '<div class="x-empty" style="padding:20px">' + E(e) + "</div>"; });
    }, function () {});
  };
  document.addEventListener("click", function (e) { var p = $("xPop"); if (p && p.classList.contains("on") && !e.target.closest("#xPop") && !e.target.closest("[data-notif]")) p.classList.remove("on"); });

  /* ---------- push на это устройство ---------- */
  function b64ToU8(s) { var p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  C.pushSupported = function () { return !!window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; };
  /* почему push недоступен на этом устройстве — человеческим языком */
  C.pushWhy = function () {
    var ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!window.isSecureContext) return "Сайт открыт без шифрования (http://). Push работает только по https: откройте https://" + location.host + location.pathname + (location.hostname.indexOf("github.io") < 0 ? " или https://projektantdimos-blip.github.io/PROJECT/" : "") + ".";
    if (ios && !(window.navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches))) return "На iPhone/iPad: в Safari нажмите «Поделиться» → «На экран «Домой»», откройте CRM с новой иконки и включите уведомления там.";
    if (!("serviceWorker" in navigator)) return "Этот браузер не умеет фоновые уведомления (приватное окно или встроенный браузер мессенджера). Откройте CRM в Chrome, Edge, Firefox или Safari.";
    if (!("PushManager" in window) || !("Notification" in window)) return "Этот браузер не поддерживает push. Откройте CRM в актуальном Chrome, Edge, Firefox или Safari (iOS 16.4+, через «На экран «Домой»»).";
    return "";
  };
  C.pushOn = function () { try { return C.pushSupported() && Notification.permission === "granted" && localStorage.getItem("ds_push_user") === (C.me ? String(C.me.id) : "x"); } catch (e) { return false; } };
  C.enablePush = function () {
    if (!C.pushSupported()) return Promise.reject(C.pushWhy() || "Push недоступен на этом устройстве.");
    return Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") throw "Уведомления не разрешены в браузере";
      return navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; });
    }).then(function (reg) {
      return C.call("/push/key").then(function (k) {
        // старая подписка с другим ключом (от прежнего адреса/сервера) мешает новой — снимаем её и подписываемся заново
        return reg.pushManager.getSubscription().then(function (old) { return old ? old.unsubscribe() : null; }).then(function () {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(k.key) });
        });
      });
    }).then(function (sub) { return C.call("/me/push/subscribe", { body: sub.toJSON() }); })
      .then(function () { try { localStorage.setItem("ds_push_user", String(C.me.id)); } catch (e) {} emit("push"); });
  };
  C.disablePush = function () {
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      var p = sub ? C.call("/me/push/unsubscribe", { body: { endpoint: sub.endpoint } }).catch(function () {}).then(function () { return sub.unsubscribe(); }) : Promise.resolve();
      return p;
    }).then(function () { try { localStorage.removeItem("ds_push_user"); } catch (e) {} emit("push"); });
  };

  /* ---------- старт ---------- */
  C.init();
})();
