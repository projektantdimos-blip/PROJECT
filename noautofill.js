/* Запрет автозаполнения и подсказок браузера во всех полях CRM: пароли, логины, имена, адреса, телефоны.
   Поля PIN становятся обычными текстовыми со скрытыми символами, поэтому браузер не предлагает сохранить и не подставляет пароль. */
(function () {
  "use strict";
  var SKIP = { hidden: 1, checkbox: 1, radio: 1, file: 1, range: 1, button: 1, submit: 1, color: 1, reset: 1, image: 1 };
  var SENS = /name|email|mail|phone|tel|addr|inn|fio|city|login|user|pin|pass|пин|имя|почт|телефон|адрес|город|фио/i;
  function fix(el) {
    var tag = el.tagName;
    if (tag === "INPUT") {
      var t = (el.getAttribute("type") || "text").toLowerCase();
      if (t === "password") {
        el.setAttribute("type", "text");
        el.classList.add("pin-mask");
        if (!el.getAttribute("inputmode")) el.setAttribute("inputmode", "numeric");
        t = "text";
      }
      if (SKIP[t]) return;
      var hint = (el.id || "") + " " + (el.getAttribute("name") || "") + " " + (el.getAttribute("placeholder") || "") + " " + (el.getAttribute("aria-label") || "");
      var want = SENS.test(hint) ? "nope" : "off";
      if (el.getAttribute("autocomplete") !== want) el.setAttribute("autocomplete", want);
      if (el.getAttribute("autocorrect") !== "off") el.setAttribute("autocorrect", "off");
      if (el.hasAttribute("name") && SENS.test(el.getAttribute("name")) && !el.__nfName) { el.__nfName = 1; el.setAttribute("name", "f" + Math.random().toString(36).slice(2, 9)); }
    } else if (tag === "TEXTAREA" || tag === "SELECT") {
      if (el.getAttribute("autocomplete") !== "off") el.setAttribute("autocomplete", "off");
    } else if (tag === "FORM") {
      el.setAttribute("autocomplete", "off");
    }
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches("input,textarea,select,form")) fix(root);
    var list = root.querySelectorAll("input,textarea,select,form");
    for (var i = 0; i < list.length; i++) fix(list[i]);
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { for (var i = 0; i < m.addedNodes.length; i++) if (m.addedNodes[i].nodeType === 1) scan(m.addedNodes[i]); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("focusin", function (e) { var el = e.target; if (el && el.tagName === "INPUT") fix(el); }, true);
  var st = document.createElement("style");
  st.textContent = ".pin-mask{-webkit-text-security:disc;text-security:disc}input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px var(--surface,#fff) inset!important;-webkit-text-fill-color:var(--ink,#000)!important}";
  document.head.appendChild(st);
  scan(document);
})();
