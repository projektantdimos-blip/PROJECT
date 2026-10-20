/* Личные напоминания: быстрая кнопка «⏰ Напомнить» в диалогах («Команда» и «Заказчики») и вкладка «Мои напоминания»
   в разделе «Мои задачи» у проектировщиков и руководителя проектного отдела. Напоминания хранятся на сервере (/reminders)
   и приходят в приложении, push и MAX — по настройкам сотрудника в личном кабинете. */
(function () {
  "use strict";
  var R = window.DSRemind = {};
  function $(id) { return document.getElementById(id); }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function p2(n) { return n < 10 ? "0" + n : "" + n; }
  function isoD(d) { return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function hm(d) { return p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function toast(msg) {
    var t = $("xToast"); if (!t) { t = document.createElement("div"); t.id = "xToast"; t.className = "x-toast"; document.body.appendChild(t); }
    t.innerHTML = "<span>" + msg + "</span>"; t.className = "x-toast on"; clearTimeout(toast.h); toast.h = setTimeout(function () { t.className = "x-toast"; }, 3500);
  }
  function presets() {
    var n = new Date(), out = [["15 мин", new Date(n.getTime() + 15 * 60000)], ["1 час", new Date(n.getTime() + 60 * 60000)]];
    var t18 = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 18, 0); if (t18 > new Date(n.getTime() + 30 * 60000)) out.push(["Сегодня 18:00", t18]);
    out.push(["Завтра 9:00", new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 9, 0)]);
    return out;
  }
  /* быстрое окно: o = {text, link, label} */
  R.open = function (o) {
    var C = window.MPBC; if (!C) return;
    C.requireLogin().then(function () { show(o || {}); }, function () {});
  };
  function show(o) {
    var old = $("rmBg"); if (old) old.remove();
    var pr = presets(), chosen = pr[0][1], custom = false;
    var bg = document.createElement("div"); bg.id = "rmBg"; bg.className = "rm-bg";
    bg.innerHTML = '<div class="rm-box"><div class="rm-h"><b>⏰ Напомнить мне</b><button type="button" id="rmX" aria-label="Закрыть">✕</button></div>'
      + '<input type="text" id="rmText" maxlength="280" value="' + E(o.text || "") + '" placeholder="О чём напомнить?">'
      + (o.label ? '<div class="rm-src">Откроется: ' + E(o.label) + "</div>" : "")
      + '<div class="rm-chips" id="rmChips">' + pr.map(function (p, i) { return '<button type="button" data-i="' + i + '" class="' + (i === 0 ? "on" : "") + '">' + E(p[0]) + "</button>"; }).join("") + '<button type="button" data-i="c">Своё время…</button></div>'
      + '<div class="rm-custom" id="rmCustom" hidden><input type="date" id="rmD"><input type="time" id="rmT"></div>'
      + '<div class="rm-err" id="rmErr"></div><button type="button" class="rm-go" id="rmGo">Поставить напоминание</button></div>';
    document.body.appendChild(bg);
    var close = function () { bg.remove(); };
    bg.onclick = function (e) { if (e.target === bg) close(); };
    $("rmX").onclick = close;
    var nowD = new Date(Date.now() + 60 * 60000); $("rmD").value = isoD(nowD); $("rmT").value = hm(nowD);
    $("rmChips").onclick = function (e) {
      var b = e.target.closest("button[data-i]"); if (!b) return;
      [].forEach.call($("rmChips").children, function (x) { x.classList.toggle("on", x === b); });
      custom = b.dataset.i === "c"; $("rmCustom").hidden = !custom; if (!custom) chosen = pr[+b.dataset.i][1];
    };
    $("rmText").focus(); $("rmText").setSelectionRange($("rmText").value.length, $("rmText").value.length);
    $("rmGo").onclick = function () {
      var text = $("rmText").value.trim(); if (!text) { $("rmErr").textContent = "Напишите, о чём напомнить"; return; }
      var when = chosen;
      if (custom) { var d = $("rmD").value, t = $("rmT").value; if (!d || !t) { $("rmErr").textContent = "Укажите дату и время"; return; } when = new Date(d + "T" + t); }
      if (!(when.getTime() > Date.now() - 60000)) { $("rmErr").textContent = "Это время уже прошло"; return; }
      $("rmGo").disabled = true;
      window.MPBC.call("/reminders", { body: { title: text, d: isoD(when), tm: hm(when), before: 0, fire_ts: when.getTime() / 1000, rep: "", task_row: 0, task_label: o.label || "", link: o.link || "" } })
        .then(function () { close(); toast("Напомню в " + hm(when) + (isoD(when) !== isoD(new Date()) ? " (" + isoD(when).split("-").reverse().slice(0, 2).join(".") + ")" : "")); if (window.MPBX && MPBX.reload) MPBX.reload(); })
        .catch(function (e) { $("rmGo").disabled = false; $("rmErr").textContent = String(e); });
    };
  }
  /* «Мои задачи» у проектировщиков и руководителя проектного отдела: вкладки «План на неделю» и «Мои напоминания» */
  function bar() {
    var el = $("my-tabs"), app = $("my-app");
    if (!el && app) { el = document.createElement("div"); el.id = "my-tabs"; el.className = "my-tabs"; app.parentNode.insertBefore(el, app); }
    return el;
  }
  R.tabsVisible = function (on) { var el = bar(); if (el) el.style.display = on ? "flex" : "none"; };
  R.designerMy = function () {
    var el = bar(); if (!el) return;
    var tab = window.__myTab || "plan";
    el.innerHTML = [["plan", "План на неделю"], ["rem", "Мои напоминания"]].map(function (x) { return '<button type="button" data-t="' + x[0] + '" class="' + (tab === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("");
    el.style.display = "flex";
    el.onclick = function (e) { var b = e.target.closest("button[data-t]"); if (!b) return; window.__myTab = b.dataset.t; try { localStorage.setItem("ds_mytab", b.dataset.t); } catch (er) {} R.designerMy(); };
    if (tab === "rem") { window.__myRem = true; if (window.MPBX && MPBX.render) MPBX.render("my"); }
    else { window.__myRem = false; if (window.DS) DS.mount("week", $("my-app")); }
  };
  try { window.__myTab = localStorage.getItem("ds_mytab") || "plan"; } catch (e) { window.__myTab = "plan"; }
})();
