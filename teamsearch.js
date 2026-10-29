/* «Внутренние»: поиск по словам во всех чатах, которые видит сотрудник. Работает от строки «Поиск по чатам…» (team.js):
   под ней появляется блок «Сообщения» — нажатие открывает чат и подсвечивает найденное сообщение. Сервер: /api/ds/team/search. */
(function () {
  "use strict";
  var timer = 0, seq = 0;
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function when(ts) {
    var d = new Date(ts * 1000), n = new Date();
    return d.toDateString() === n.toDateString() ? pad(d.getHours()) + ":" + pad(d.getMinutes())
      : pad(d.getDate()) + "." + pad(d.getMonth() + 1) + (d.getFullYear() !== n.getFullYear() ? "." + d.getFullYear() : "");
  }
  function words(q) { return q.toLowerCase().replace(/ё/g, "е").split(/\s+/).filter(function (w) { return w.length >= 2; }); }
  function snippet(text, ws) {                  // кусок вокруг первого найденного слова, слова подсвечены
    var low = text.toLowerCase().replace(/ё/g, "е"), at = -1;
    ws.forEach(function (w) { var i = low.indexOf(w); if (i >= 0 && (at < 0 || i < at)) at = i; });
    var from = Math.max(0, at - 50), s = (from ? "…" : "") + text.slice(from, from + 160) + (text.length > from + 160 ? "…" : "");
    var html = E(s);
    ws.forEach(function (w) {
      var rx = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/е/g, "[её]"), "gi");
      html = html.replace(rx, function (m) { return "<mark>" + m + "</mark>"; });
    });
    return html;
  }
  function box() {
    var inp = document.getElementById("tSearch"); if (!inp) return null;
    var b = document.getElementById("tMsgHits");
    if (!b) {
      b = document.createElement("div"); b.id = "tMsgHits"; b.hidden = true;
      var rooms = document.getElementById("tRooms");
      if (rooms && rooms.parentNode) rooms.parentNode.insertBefore(b, rooms); else inp.parentNode.appendChild(b);
      b.addEventListener("click", function (e) {
        var h = e.target.closest ? e.target.closest(".tmh") : null; if (!h) return;
        openHit(h, h.getAttribute("data-room"), +h.getAttribute("data-mid"));
      });
    }
    return b;
  }
  function run(q) {
    var b = box(); if (!b) return;
    var ws = words(q), my = ++seq;
    if (!ws.length || !window.MPBC) { b.hidden = true; b.innerHTML = ""; return; }
    MPBC.call("/../ds/team/search?q=" + encodeURIComponent(q)).then(function (list) {
      if (my !== seq) return;
      b.hidden = false;
      b.innerHTML = '<div class="tmh-h">Сообщения · ' + list.length + (list.length >= 60 ? "+" : "") + "</div>"
        + (list.length ? list.map(function (m) {
          return '<button type="button" class="tmh" data-room="' + E(m.room_id) + '" data-mid="' + m.id + '"><div class="tmh-t"><b>' + E(m.room) + "</b><span>" + when(m.ts) + "</span></div>"
            + '<div class="tmh-s"><i>' + E(m.user) + ":</i> " + snippet(m.text + (m.files ? " 📎 " + m.files : ""), ws) + "</div></button>";
        }).join("") : '<div class="tmh-e">Ничего не нашлось</div>');
    }, function () { if (my === seq) { b.hidden = false; b.innerHTML = '<div class="tmh-e">Поиск недоступен — обновите сервер или страницу</div>'; } });
  }
  function openHit(btn, room, mid) {            // открыть чат и подсветить сообщение; старое (не загружено в чат) — показать целиком здесь
    var tries = 0, shown = null;
    var show = function (el) { shown = el; el.scrollIntoView({ block: "center" }); el.classList.add("tmh-flash"); setTimeout(function () { el.classList.remove("tmh-flash"); }, 2400); };
    if (location.hash !== "#/team?room=" + encodeURIComponent(room)) location.hash = "#/team?room=" + encodeURIComponent(room);
    setTimeout(function look() {                // ждём, пока чат откроется и перерисуется (он сам прокручивается вниз)
      var el = document.getElementById("m" + mid);
      if (el) {
        show(el);
        setTimeout(function () { var again = document.getElementById("m" + mid); if (again && again !== shown) show(again); }, 900);      // перерисовали ещё раз — подсвечиваем снова
        return;
      }
      if (++tries < 20) return setTimeout(look, 200);
      if (btn && document.body.contains(btn)) { btn.classList.add("full"); var s = btn.querySelector(".tmh-s"); if (s) s.insertAdjacentHTML("beforeend", '<div class="tmh-old">Старое сообщение — в чате загружены только последние</div>'); }
    }, 600);
  }
  document.addEventListener("input", function (e) {
    if (!e.target || e.target.id !== "tSearch") return;
    var v = e.target.value;
    clearTimeout(timer); timer = setTimeout(function () { run(v); }, 300);
  });
  var css = document.createElement("style");
  css.textContent =
    "#tMsgHits{margin:6px 0 10px;max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:12px;background:var(--card)}" +
    "#tMsgHits .tmh-h{position:sticky;top:0;padding:7px 12px;font-size:.75rem;font-weight:700;color:var(--muted);background:var(--card);border-bottom:1px solid var(--line)}" +
    "#tMsgHits .tmh{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:none;padding:8px 12px;font:inherit;color:var(--ink);cursor:pointer}" +
    "#tMsgHits .tmh:hover{background:var(--bg)}#tMsgHits .tmh:last-child{border-bottom:0}" +
    "#tMsgHits .tmh-t{display:flex;gap:8px;justify-content:space-between;font-size:.82rem}#tMsgHits .tmh-t span{color:var(--muted);font-size:.75rem;white-space:nowrap}" +
    "#tMsgHits .tmh-s{font-size:.8rem;color:var(--muted);margin-top:2px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
    "#tMsgHits .tmh.full .tmh-s{display:block;-webkit-line-clamp:unset}#tMsgHits .tmh-s i{font-style:normal;color:var(--ink)}" +
    "#tMsgHits mark{background:#fde68a;color:inherit;border-radius:3px;padding:0 1px}#tMsgHits .tmh-e,#tMsgHits .tmh-old{padding:10px 12px;font-size:.8rem;color:var(--muted)}#tMsgHits .tmh-old{padding:4px 0 0}" +
    ".x-msg.tmh-flash{outline:2px solid #f0b429;outline-offset:2px;border-radius:12px;transition:outline-color .3s}";
  document.head.appendChild(css);
})();
