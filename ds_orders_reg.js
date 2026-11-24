/* Проекты DS — «Заказы»: реестр проектных задач для РОПа (#/orders, 24.11).
   Данные — общая загрузка ds.js (S.orders); клик по строке открывает карточку задачи (data-open обрабатывает ядро).
   Поиск — по номеру, заказчику, объекту, системе, стадии, исполнителю (на клиенте, без запросов). */
(function () {
  "use strict";
  var T = window.DSOrdersReg = {};
  var q = "";                                    // строка поиска (живёт между перерисовками)

  function X() { return window.DS._ctx; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function money(n) { return Number(n || 0).toLocaleString("ru-RU") + " ₽"; }
  function dmy(s) { return s ? s.slice(8, 10) + "." + s.slice(5, 7) : "—"; }
  function sysText(o) {
    var list = (o.systems && o.systems.length ? o.systems : []).join(".");
    return (list + (o.systems_other ? " " + o.systems_other : "") + (o.modern ? " модернизация" : "")).trim() || o.system || "—";
  }
  function stageTone(st) {
    var c = { "Готов к проектированию": "info", "В проектировании": "ok", "Проверка": "sys", "Корректировка": "warn", "Сдано": "ok", "Закрыто": "muted", "Пауза": "muted", "Ожидает аванс": "warn", "Сбор данных": "info" };
    return c[st] || "info";
  }
  function paid(o) {
    var a = o.adv_paid ? "аванс ✓" : (+o.adv_sum > 0 ? "аванс не пришёл" : "без аванса");
    var p = o.post_paid ? " · постоплата ✓" : (o.stage === "Закрыто" || o.stage === "Сдано" ? " · постоплата ждёт" : "");
    return a + p;
  }

  T.html = function () {
    var S = X().S, list = (S.orders || []).slice().sort(function (a, b) { return (parseInt(b.number, 10) || 0) - (parseInt(a.number, 10) || 0); });
    var needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(function (o) {
        return [o.number, o.customer, o.object, sysText(o), o.stage, o.executor].join(" ").toLowerCase().indexOf(needle) >= 0;
      });
    }
    var open = list.filter(function (o) { return ["Закрыто"].indexOf(o.stage) < 0; }).length;
    var sum = list.reduce(function (a, o) { return a + (+o.amount || 0); }, 0);
    return '<div class="head"><div><h1>Заказы</h1><p>Проектные задачи: что в работе, сроки и оплаты. Всего ' + list.length + " · открытых " + open + " · на " + money(sum) + '</p></div></div>'
      + '<div class="panel" style="padding:10px 12px;margin-bottom:12px"><input id="orq" data-orq="1" placeholder="Поиск: №, заказчик, объект, система, стадия, исполнитель" value="' + E(q) + '" style="width:100%"></div>'
      + '<div class="panel" style="overflow:auto"><table class="tbl"><thead><tr><th>№</th><th>Заказчик</th><th>Объект</th><th>Системы</th><th>Стадия</th><th style="text-align:right">Сумма</th><th>Оплата</th><th>Срок</th><th>Исполнитель</th></tr></thead><tbody>'
      + (list.map(function (o) {
        var late = o.left_days != null && o.left_days < 0 && o.stage !== "Закрыто";
        return '<tr data-open="' + o.id + '" style="cursor:pointer" title="Открыть задачу №' + E(o.number) + '">'
          + "<td><b>№" + E(o.number) + "</b>" + (o.urgent ? ' <span class="pill bad">срочно</span>' : "") + "</td>"
          + '<td>' + E(o.customer || "—") + "</td>"
          + '<td class="ell" title="' + E(o.object || "") + '">' + E(o.object || "—") + "</td>"
          + "<td>" + E(sysText(o)) + "</td>"
          + '<td><span class="pill ' + stageTone(o.stage) + '">' + E(o.stage || "—") + "</span>" + (o.stage === "Пауза" ? ' <small style="color:var(--muted)">⏸</small>' : "") + "</td>"
          + '<td class="r"><b>' + money(o.amount) + "</b></td>"
          + '<td>' + E(paid(o)) + "</td>"
          + '<td' + (late ? ' style="color:var(--bad);font-weight:700"' : "") + ">" + (o.due_date ? dmy(o.due_date) + (late ? " · просрочено" : "") : "—") + "</td>"
          + "<td>" + E(o.executor || "—") + "</td></tr>";
      }).join("") || '<tr><td colspan="9">Заказов по этому фильтру нет</td></tr>')
      + "</tbody></table></div>";
  };

  /* поиск — мягко (перерисовка через paint ядра) */
  document.addEventListener("input", function (e) {
    if (!e.target.dataset || !e.target.dataset.orq) return;
    q = e.target.value;
    var el = e.target;
    var pos = el.selectionStart;
    if (window.DS && DS._ctx && DS._ctx.paint) DS._ctx.paint();
    var n = document.getElementById("orq");
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) { } }
  });
})();
