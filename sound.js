/* Звук уведомлений CRM. Мелодию каждый выбирает сам в личном кабинете («Звук в CRM»); файлы — в папке sounds/
   (все мелодии — свой синтез). Встроенный «динь-дон» — отдельная мелодия и запасной сигнал, если файл не загрузился.
   Настройки (включён, громкость, мелодия) хранятся в браузере. Браузер разрешает звук после первого нажатия на странице. */
(function () {
  "use strict";
  var LS = "ds_sound", DEF = "horn-war", ctx = null, lastAt = 0, cur = null;
  // группы мелодий для выбора: [id (= sounds/<id>.wav), название, длительность в секундах]
  var SOUNDS = [
    ["Боевые рога", [["horn-war", "Призыв к войне", 3.8], ["horn-battle", "Боевой рог", 2.2], ["horn-signal", "Сигнал — два гудка", 2.4],
                     ["horn-drums", "Рог и барабаны", 2.8], ["horn-short", "Короткий рог", 1.6], ["horn-low", "Низкий могучий рог", 2.4]]],
    ["Фэнтези", [["loot", "Добыча — звон монет", 0.4], ["harp", "Магия — арфа", 0.9], ["horn-hunt", "Охотничий рог", 0.8],
                 ["levelup", "Новый уровень", 1.0], ["portal", "Портал", 0.8], ["potion", "Зелье — бульк", 0.3]]],
    ["Весёлые", [["coin8", "Монетка 8-бит", 0.4], ["powerup8", "Бонус 8-бит", 0.4], ["bubbles", "Пузырьки", 0.3], ["cuckoo", "Кукушка", 0.4],
                 ["bird", "Птичка — чирик", 0.4], ["boing", "Пружинка — бойнг", 0.3], ["robot", "Робот", 0.3], ["laser", "Лазер — пиу-пиу", 0.3],
                 ["whistle", "Свисток восхищения", 0.6]]],
    ["Спокойные", [["classic", "Динь-дон (классический)", 0.6], ["marimba", "Маримба", 0.6], ["ukulele", "Укулеле", 0.6],
                   ["glasses", "Бокалы — дзынь", 0.8], ["sonar", "Сонар с эхом", 0.7], ["bongo", "Бонго — тум-тук", 0.3]]]
  ];
  var BY = {};
  SOUNDS.forEach(function (g) { g[1].forEach(function (x) { BY[x[0]] = x; }); });
  function cfg() {
    try { var c = JSON.parse(localStorage.getItem(LS) || "{}"); return { on: c.on !== false, vol: c.vol > 0 ? Math.min(1, c.vol) : 0.9, snd: BY[c.snd] ? c.snd : DEF }; }
    catch (e) { return { on: true, vol: 0.9, snd: DEF }; }
  }
  function save(c) { try { localStorage.setItem(LS, JSON.stringify(c)); } catch (e) {} }
  function audioCtx() {
    if (!ctx) { var C = window.AudioContext || window.webkitAudioContext; if (C) ctx = new C(); }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function chime(vol) {                         // двухтональный «динь-дон», как у мессенджеров и CRM
    var a = audioCtx(); if (!a) return;
    var t0 = a.currentTime + 0.01, master = a.createGain();
    master.gain.value = vol; master.connect(a.destination);
    [[880, 0, 0.22], [1318.5, 0.16, 0.5]].forEach(function (n) {
      [1, 2].forEach(function (h) {
        var o = a.createOscillator(), g = a.createGain();
        o.type = h === 1 ? "sine" : "triangle"; o.frequency.value = n[0] * h;
        var s = t0 + n[1], v = h === 1 ? 0.9 : 0.25;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(v, s + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, s + n[2]);
        o.connect(g); g.connect(master); o.start(s); o.stop(s + n[2] + 0.05);
      });
    });
  }
  function play(force, id) {
    var c = cfg(), x = BY[id] || BY[c.snd];
    if (!c.on && !force) return;
    var now = Date.now(); if (!force && now - lastAt < Math.max(700, x[2] * 1000)) return;   // пока звучит прежний сигнал, новый не накладываем
    lastAt = now;
    if (cur) { try { cur.pause(); } catch (e) {} cur = null; }      // при переборе мелодий в настройках прежняя не доигрывает
    if (x[0] === "classic") { try { chime(c.vol); } catch (e) {} return; }
    try {
      var au = new Audio("sounds/" + x[0] + ".wav"); au.volume = c.vol; cur = au;
      au.play().then(null, function () { chime(c.vol); });
    } catch (e) { try { chime(c.vol); } catch (e2) {} }
  }
  document.addEventListener("click", function () { audioCtx(); }, { once: true });
  if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", function (e) { if (e.data && e.data.type === "push-sound") play(); });
  window.DSSound = {
    play: function () { play(); }, test: function (id) { play(true, id); }, get: cfg, list: function () { return SOUNDS; },
    set: function (p) {
      var c = cfg();
      if ("on" in p) c.on = !!p.on;
      if ("vol" in p) c.vol = Math.max(0.1, Math.min(1, +p.vol || 0.9));
      if ("snd" in p && BY[p.snd]) c.snd = p.snd;
      save(c); return c;
    }
  };
})();
