/* Реестр выездов и карточка выезда в заказе. */
(function () {
  "use strict";
  var V = window.DSV = { meta: null, data: null, month: "", who: "", tab: "all", sel: 0, form: null, err: "", busy: false, extra: null, up: "", upKind: "" };
  var PLAN_OK = /\.(pdf|jpe?g)$/i, PLAN_ACCEPT = ".pdf,.jpg,.jpeg,application/pdf,image/jpeg";
  var VIEW = ["owner", "ops", "sales", "design"];
  var KIND_COL = { survey: "#0F6E56", supervision: "#BA7517", handover: "#2f6fbd", other: "#888780" };
  var MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  var MON_S = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  var WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
  var TAKE = { survey: ["ТЗ обследования (программа на телефоне)", "Планы этажей от заказчика", "Лазерная рулетка"], supervision: ["Журнал авторского надзора", "Комплект проекта"] };

  function C() { return window.MPBC; }
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function api(path, body) { return C().call("/../ds/visits" + path, body ? { body: body } : {}); }
  function toast(m) { if (window.toast) window.toast(m); else if (window.MPBT && MPBT.toast) MPBT.toast(m); }
  function pos() { var m = C() && C().me; return m ? (m.position || (m.role === "admin" ? "owner" : "")) : ""; }
  function meId() { return (C() && C().me && C().me.id) || 0; }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function today() { return new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Novokuznetsk"}); }
  function pd(s) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function diff(a, b) { return Math.round((pd(b) - pd(a)) / 86400000); }
  function dm(s) { var d = pd(s); return d ? d.getDate() + " " + MON_S[d.getMonth()] : "—"; }
  function color(n) { var P = ["#2f6fbd", "#238a58", "#8a5fd0", "#1f9a9a", "#c2527f", "#b8892a"], h = 0; n = n || "?"; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return n === "Иван" ? "#238a58" : P[h % P.length]; }
  function av(n) { return '<span class="vz-av" style="background:' + color(n) + '">' + E((n || "?")[0]) + "</span>"; }
  function cityKey(s) { s = String(s || "").toLowerCase().replace(/ё/g, "е").replace(/^(г\.?|город)\s*/, "").trim(); return { "спб": "санкт-петербург", "питер": "санкт-петербург", "петербург": "санкт-петербург" }[s] || s; }
  function root() { return document.getElementById("visits-app"); }

  var css = document.createElement("style");
  css.textContent = ""
    + ".vz-sum{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.vz-st{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 16px}"
    + ".vz-st small{display:block;font-size:.76rem;color:var(--muted)}.vz-st b{display:block;font-size:1.25rem;margin-top:3px}.vz-st b i{font-style:normal;font-size:.8rem;font-weight:500;color:var(--muted);margin-left:5px}.vz-st b.ok{color:var(--ok)}.vz-st b.bad{color:var(--bad)}"
    + ".vz-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.vz-chip{border:1px solid var(--line)!important;background:var(--surface)!important;border-radius:99px;padding:5px 12px!important;display:inline-flex;align-items:center;gap:7px;font-size:.86rem}"
    + ".vz-chip.on{border-color:var(--brand)!important;background:var(--brand-soft)!important;color:var(--brand);font-weight:700}.vz-chip small{color:var(--muted)}.vz-chip.on small{color:var(--brand)}.vz-chip .vz-av{margin-left:-6px}"
    + ".vz-month{margin-left:auto;display:flex;align-items:center;gap:6px;font-weight:700}.vz-month button{border:1px solid var(--line)!important;background:var(--surface)!important;border-radius:8px;width:30px;height:30px;color:var(--muted)}"
    + ".vz-tabs{display:flex;gap:18px;border-bottom:1px solid var(--line);margin:10px 0 0;overflow-x:auto;scrollbar-width:none}.vz-tabs button{padding:10px 0!important;color:var(--muted);font-weight:600;border-bottom:2px solid transparent!important;margin-bottom:-1px;white-space:nowrap}"
    + ".vz-tabs button.on{color:var(--ink);border-color:var(--ink)!important}.vz-tabs span{margin-left:5px;font-size:.78rem;color:var(--muted)}.vz-tabs span.bad{color:var(--bad);font-weight:800}"
    + ".vz-wrap{display:flex;gap:20px;align-items:flex-start;margin-top:14px}.vz-list{flex:1;min-width:0}.vz-g{margin-bottom:18px}"
    + ".vz-gh{font-size:.74rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:4px 4px 8px;display:flex;gap:8px}.vz-gh.bad{color:var(--bad)}.vz-gh span{letter-spacing:0;font-weight:600}"
    + ".vz-rows{background:var(--surface);border:1px solid var(--line);border-radius:14px;overflow:hidden}"
    + ".vz-row{display:grid;grid-template-columns:58px minmax(0,1fr) 150px 140px 140px;align-items:center;gap:12px;padding:10px 14px;border-top:1px solid var(--line);cursor:pointer;position:relative}"
    + ".vz-row:first-child{border-top:0}.vz-row:hover{background:var(--surface-2)}.vz-row.sel{background:var(--brand-soft)}.vz-row.sel::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--brand)}"
    + ".vz-dt{border-radius:10px;background:var(--surface-2);text-align:center;padding:5px 0;line-height:1.15}.vz-dt b{display:block;font-size:1.05rem}.vz-dt span{font-size:.68rem;color:var(--muted);text-transform:uppercase}"
    + ".vz-dt.today{background:var(--brand);color:#fff}.vz-dt.today span{color:rgba(255,255,255,.8)}"
    + ".vz-t{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vz-s{color:var(--muted);font-size:.8rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
    + ".vz-tag{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);white-space:nowrap}.vz-tag i{width:8px;height:8px;border-radius:50%;flex:none}"
    + ".vz-who{display:flex;align-items:center;gap:8px;font-size:.84rem;white-space:nowrap;overflow:hidden}"
    + ".vz-av{width:22px;height:22px;border-radius:50%;display:inline-grid;place-items:center;font-size:.68rem;font-weight:800;color:#fff;flex:none}"
    + ".vz-pill{justify-self:end;font-size:.76rem;font-weight:700;border-radius:7px;padding:3px 8px;white-space:nowrap;background:var(--surface-2);color:var(--muted)}"
    + ".vz-pill.go{background:var(--brand-soft);color:var(--brand)}.vz-pill.need{background:color-mix(in srgb,var(--bad) 12%,transparent);color:var(--bad)}.vz-pill.done{background:color-mix(in srgb,var(--ok) 14%,transparent);color:var(--ok)}.vz-pill.cancel{text-decoration:line-through}"
    + ".vz-dr{width:400px;flex:none;background:var(--surface);border:1px solid var(--line);border-radius:16px;position:sticky;top:16px;box-shadow:var(--shadow-m,0 6px 24px rgba(0,0,0,.08));max-height:calc(100vh - 32px);overflow:auto}"
    + ".vz-dh{padding:18px 20px 14px;border-bottom:1px solid var(--line)}.vz-dh .x{float:right;color:var(--muted);font-size:1.1rem}.vz-dh .k{font-size:.78rem;color:var(--muted)}.vz-dh h2{font-size:1.1rem;margin:6px 0 0!important;line-height:1.3}"
    + ".vz-dh .when{margin-top:8px;font-weight:700}.vz-dh .when.bad{color:var(--bad)}.vz-db{padding:16px 20px}"
    + ".vz-kv{display:grid;grid-template-columns:100px 1fr;gap:9px 10px;font-size:.88rem;margin:0}.vz-kv dt{color:var(--muted)}.vz-kv dd{margin:0;min-width:0;overflow-wrap:anywhere}.vz-kv a{color:var(--brand);font-weight:700;text-decoration:none}"
    + ".vz-sec{margin-top:16px;border-top:1px solid var(--line);padding-top:12px}.vz-sec>.h{font-size:.76rem;color:var(--muted);font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;gap:8px}"
    + ".vz-ck{display:flex;gap:8px;align-items:flex-start;font-size:.86rem;margin-bottom:6px;cursor:pointer}.vz-ck input{margin-top:3px}"
    + ".vz-files{display:flex;gap:8px;flex-wrap:wrap}.vz-fl{border:1px solid var(--line)!important;border-radius:10px;padding:6px 10px!important;font-size:.8rem;display:inline-flex;gap:6px;align-items:center;max-width:100%}"
    + ".vz-fl span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px}.vz-fl em{font-style:normal;color:var(--muted);cursor:pointer}"
    + ".vz-drop{display:block;border:1.5px dashed var(--line);border-radius:10px;padding:12px;text-align:center;color:var(--muted);font-size:.84rem;margin-top:8px;cursor:pointer}.vz-drop.on{border-color:var(--brand);color:var(--brand)}"

    + ".vz-add{display:flex;gap:6px;margin-top:8px}.vz-add input{flex:1;min-width:0;border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--surface)}.vz-add input.n{flex:0 0 90px}"
    + ".vz-note{background:var(--surface-2);border-radius:10px;padding:10px 12px;font-size:.8rem;color:var(--muted);line-height:1.45;margin-top:14px}.vz-note.bad{background:color-mix(in srgb,var(--bad) 10%,transparent);color:var(--bad)}"
    + ".vz-acts{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.vz-acts .grow{flex:1;justify-content:center}.vz-hint{font-size:.76rem;color:var(--muted);margin-top:6px}"
    + ".vz-wrap.dr .vz-row{grid-template-columns:54px minmax(0,1fr) 110px 120px}.vz-wrap.dr .vz-row .vz-tag{display:none}"
    + ".vz-folder{display:flex;gap:10px;margin-top:14px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}.vz-folder b{display:block;font-size:.8rem;overflow-wrap:anywhere}"
    + ".vz-folder small{display:block;color:var(--muted);font-size:.74rem;margin:3px 0 8px}.vz-folder>span{font-size:1.2rem}"
    + ".vz-f2{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}.vz-empty{padding:28px;text-align:center;color:var(--muted)}"
    + ".vz-op .vz-orow{display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font-size:.86rem;cursor:pointer}.vz-op .vz-orow:first-of-type{border-top:0}.vz-op .vz-orow b{width:54px;color:var(--muted);flex:none}.vz-op .vz-orow span{flex:1;min-width:0}"
    + "@media (max-width:1150px){.vz-row{grid-template-columns:54px minmax(0,1fr) 120px}.vz-row .vz-tag,.vz-row .vz-who{display:none}.vz-sum{grid-template-columns:repeat(2,minmax(0,1fr))}"
    + ".vz-dr{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);max-height:none;border-radius:0;z-index:60}}"
    + "@media (max-width:600px){.vz-month{margin-left:0}.vz-f2{grid-template-columns:1fr}}";
  css.textContent += ".vz-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:12px}.vz-table{border-collapse:collapse;width:100%;min-width:850px;background:var(--surface);font-size:.85rem}.vz-table th,.vz-table td{padding:10px 8px;border:1px solid var(--line);text-align:center;overflow-wrap:anywhere}.vz-table td:nth-child(3){text-align:left;max-width:300px}.vz-table td small,.vz-table td strong{display:block}.vz-table td small{color:var(--muted)}.vz-table strong{color:var(--bad)}.vz-table tbody th{text-align:left}.vb-issue,.vb-requested,.vb-materials,.vb-plan,.vb-done,.vb-cancel{color:#20334a}.vb-issue{background:#f8dcd8}.vb-requested{background:#f6ead0}.vb-materials{background:#ebe6f6}.vb-plan{background:#e1eaf6}.vb-done{background:#d9efe0}.vb-cancel{background:#eceff3}.vz-list{min-width:0}";
  css.textContent += ".vz-table thead{background:var(--surface-2)}.vz-table thead small{display:inline-grid;place-items:center;background:var(--brand-soft);color:var(--brand);width:15px;height:15px;border-radius:50%;cursor:help}.vz-st{border-top:3px solid #4b80ac}.vz-st:nth-child(2){border-top-color:#c68a38}.vz-st:nth-child(3){border-top-color:#9871bd}.vz-st:nth-child(4){border-top-color:#47906b}.vz-table tr{line-height:1.35}.vz-table td small{margin-top:3px}.vz-dr{max-width:100%}";
  css.textContent += ".vz-over{color:var(--bad);font-weight:700}.vz-tabs{gap:8px;flex-wrap:wrap;padding:8px 0}.vz-tabs button{padding:6px 12px!important;background:var(--surface-2);border:1px solid var(--line)!important;border-radius:18px}.vz-tabs button.on{outline:2px solid var(--brand);outline-offset:-2px}";
  css.textContent += ".vz-state{display:inline-block;border-radius:8px;padding:4px 8px;line-height:1.25}.vs-requested{background:#f8dcd8;color:#a5281b}.vs-plan{background:#e1eaf6;color:#1d4f9e}.vs-moved{background:#f6ead0;color:#7a5300}.vs-occurred{background:#f8e2cf;color:#8a4310}.vs-received{background:#ebe6f6;color:#3b2d66}.vs-done{background:#d9efe0;color:#17653a}.vs-cancel{background:#eceff3;color:#4a5566}.vz-table td strong{display:table;margin:4px auto 0;border-radius:5px;padding:2px 5px;background:#fdeeed;color:#a5281b}.vz-st .vz-kpi-note{font-size:.72rem;margin-top:4px}";
  document.head.appendChild(css);

  /* ---------- данные ---------- */
  function load() {
    var month = V.month;
    V.err = "";
    var m = V.meta ? Promise.resolve(V.meta) : api("/meta").then(function (r) { V.meta = r; });
    return Promise.all([m, api("?month=" + month).then(function (r) { if (month === V.month) V.data = r; })]).then(null, function (e) { V.err = String(e); });
  }
  function items() { return (V.data && V.data.items) || []; }
  function byId(id) { return items().filter(function (x) { return x.id === id; })[0] || (V.extra && V.extra.id === id ? V.extra : null); }
  function put(v) {
    var arr = items(), i = arr.map(function (x) { return x.id; }).indexOf(v.id);
    if (i >= 0) arr[i] = v; else if (V.data) arr.push(v);
    if (V.extra && V.extra.id === v.id) V.extra = v;
    load().then(paint);      // итоги месяца и порядок — с сервера
  }

  V.mount = function () {
    V.quick=null;
    var el = root();
    if (!el) return;
    if (!C() || !C().loggedIn()) { el.innerHTML = '<div class="ds dspage"><div class="head"><div><h1>Выезды</h1><p>Войдите, чтобы увидеть выезды</p></div></div></div>'; return; }
    var q = /[?&]v=(\d+)/.exec(location.hash), nw = /[?&]new=(\d+)/.exec(location.hash);
    if (!V.month || V.month === V.lastCurrentMonth) V.month = today().slice(0, 7);
    V.lastCurrentMonth = today().slice(0, 7);
    if (!V.data) el.innerHTML = '<div class="ds dspage"><div class="loading">Загружаю…</div></div>';
    load().then(function () {
      if (q) {
        V.sel = +q[1]; V.form = null;
        if (!byId(V.sel)) api("/" + V.sel).then(function (v) { V.extra = v; paint(); }, function (e) { toast(String(e)); V.sel = 0; paint(); });
      }
      if (nw && pos()==="ops") openForm({ order_id: +nw[1] });
      if (q || nw) history.replaceState(null, "", "#/visits");
      paint();
    });
  };

  /* ---------- список ---------- */
  function shown() {
    return items().filter(function (v) { return !V.who || String(v.executor_id) === V.who; });
  }
  var STATE = {requested:"Запрошен",plan:"Назначен",occurred:"Был, ждём материалы",received:"Материалы у Полины",done:"Выполнен",cancel:"Отменён"};
  var FILTERS = {all:"Все",issue:"Требуют действия",requested:"Ждут даты",plan:"Назначены",materials:"Ждём материалы",done:"Готово",cancel:"Отменено"};
  function matches(v,f) {
    if (f==="all") return v.state!=="cancel";
    if (f==="issue") return !!v.issue;
    if (f==="materials") return v.state==="occurred" || v.state==="received";
    return v.state===f;
  }
  function tabCount(f) { return shown().filter(v=>matches(v,f)).length; }
  function statusLabel(v) {
    if (v.state==="done" && v.handed_on) return "Передано проектировщику";
    if (v.state==="plan" && v.previous_day) return "Перенесён";
    return STATE[v.state] || v.state;
  }
var visitStatus={
 req:['Запрошен','#f8dcd8','#a5281b','Полина попросила выезд, даты ещё нет. Норма — назначить дату в течение 1 р.д.'],
 plan:['Назначен','#e1eaf6','#1d4f9e','Дата и кто едет известны.'],
 moved:['Перенесён','#f6ead0','#7a5300','Дату перенесли. Причина видна под меткой.'],
 wait:['Был, ждём материалы','#f8e2cf','#8a4310','Выезд состоялся, у Полины материалов ещё нет. Норма — 1 р.д.'],
 got:['Материалы у Полины','#ebe6f6','#3b2d66','Материалы получены. Передать проектировщику в тот же день.'],
 sent:['Передано проектировщику','#d9efe0','#17653a','Готово: материалы ушли в проектирование.'],
 cancel:['Отменён','#eceff3','#4a5566','Выезд не нужен или заказчик отказался.']
};
  function shortDay(day, weekday) {
    const d = pd(day);
    return d ? day.slice(8,10) + "." + day.slice(5,7) + (weekday ? " (" + WD[d.getDay()] + ")" : "") : "—";
  }
  function personColor(name) {
    if (/дмитри/i.test(name)) return "#2f7d55";
    if (/ядыкин/i.test(name)) return "#c0466e";
    return color(name);
  }
  function person(name) {
    return name ? '<span class="pers"><span class="av" style="background:'+personColor(name)+'">'+E(name[0])+'</span>'+E(name)+'</span>' : '<span class="pl r">не назначен</span>';
  }
  function row(v,i,group) {
    const key = {requested:"req",plan:v.previous_day?"moved":"plan",occurred:"wait",received:"got",done:"sent",cancel:"cancel"}[v.state];
    const st=visitStatus[key] || [statusLabel(v),"#eceff3","#4a5566",""];
    const d=pd(v.day), age=v.tz_days;
    const dateCell=d ? '<span class="dd"><b>'+d.getDate()+'</b><span>'+MON_S[d.getMonth()]+', '+WD[d.getDay()]+'</span></span>'+(v.day===today()?'<span class="pl b">сегодня</span>':'') : '<span class="dd none"><b>нет даты</b><span>с '+shortDay(v.asked)+'</span></span>';
    let detail="";
    if(key==="moved") detail="было "+shortDay(v.previous_day)+" · "+(v.reason||"");
    if(key==="cancel") detail=v.reason||"";
    if(key==="sent" && v.handed_on) detail=shortDay(v.handed_on,true);
    if(key==="got" && v.received_on) detail="получено "+shortDay(v.received_on,true);
    const tz=age==null || ["done","cancel"].includes(v.state) ? '<span class="sb">—</span>' :
      '<span class="days '+(age>5?'r':'g')+'">'+E(age)+'</span><span class="pl '+(age>5?'r':'g')+'">'+(age>5?'сверх нормы '+(age-5):'в норме')+'</span>';
    let acts="";
    function button(label,op,cls) {
      return '<button type="button" class="'+cls+'" data-vrow="'+v.id+'" data-op="'+op+'">'+label+'</button>';
    }
    if(key==="req" && V.meta.driver) acts+=button("Назначить дату","edit","b sm bl");
    if(v.state==="plan" && v.executor_id===meId()) acts+=button("Выезд состоялся","occurred","b sm bl");
    if(v.state==="plan" && V.meta.driver) acts+=button("Перенести","edit","b sm");
    if(key==="wait" && pos()==="ops") acts+=button("Материалы получены","materials","b sm gr");
    if(key==="got" && pos()==="ops") acts+=button("Передала проектировщику","done","b sm gr");
    if(pos()==="ops" && !["done","cancel"].includes(v.state)) acts+=button("отменить","cancel","ex");
    const cells=[
      '<span class="nb">'+(i+1)+'</span>',dateCell,
      '<button class="nm" data-vsel="'+v.id+'">'+E(v.address||v.object||"Открыть выезд")+'</button><span class="ob">'+E([v.order_number?"№"+v.order_number:"",v.system,v.customer].filter(Boolean).join(" · "))+'</span><span class="who">'+E(v.kind_label)+'</span>',
      person(v.executor),'<span class="dt">'+shortDay(v.asked,true)+'</span><span class="sb">'+E(v.created_by?"запросила "+v.created_by:"")+'</span>',
      '<span class="chip" style="background:'+st[1]+';color:'+st[2]+'" tabindex="0" data-visit-tip="'+E(st[3])+'">'+E(st[0])+'</span>'+(detail?'<span class="sb">'+E(detail)+'</span>':'')+(v.issue?'<span class="pl r">'+E(v.issue)+'</span>':''),
      tz,acts||'<span class="sb">—</span>'
    ];
    return '<div class="tr '+group+(i%2?' z':'')+'">'+cells.map((cell,n)=>'<span class="c'+(n===7?' acts':'')+'">'+cell+'</span>').join("")+'</div>';
  }
function band(c,t){var s='';for(var j=0;j<8;j++)s+='<span class="c"></span>';return '<div class="tr grp '+c+'">'+s+'<span class="gl">'+t+'</span></div>';}

  function groups() {
    const headers=["№","Дата выезда","Объект","Кто едет","Запросили","Статус","ТЗ на сборе","Действия"];
    const tips={"Дата выезда": "Когда едут на объект. «Нет даты» — выезд запрошен, но не назначен.", "Объект": "Адрес, номер проекта, вид работ, заказчик и тип выезда.", "Кто едет": "Дмитрий или Александр Ядыкин.", "Запросили": "Когда Полина попросила выезд. Норма — назначить дату в течение 1 р.д.", "Статус": "Где сейчас выезд. Красная плашка — нарушена норма: дата не назначена, материалов нет или они не переданы проектировщику.", "ТЗ на сборе": "Сколько рабочих дней собирается ТЗ этого проекта. Берётся из вкладки «ТЗ». Красное — сверх нормы 5 р.д.", "Действия": "Следующее действие по выезду. Кнопка меняется по статусу."};
    let html='<div class="tr hd">'+headers.map((h,i)=>'<span class="c'+(tips[h]?' hq':'')+'" tabindex="0" data-visit-tip="'+E(tips[h]||"")+'">'+h+(i===2?'<small>адрес · проект · заказчик</small>':i===6?'<small>р.д.</small>':'')+'</span>').join("")+'</div>';
    const rows=shown().filter(v=>matches(v,V.tab));
    let i=0;
    for(const [key,cls,title,note] of [["issue","r","Требуют действия","нарушена норма — сначала эти"],["requested","o","Ждут даты","Полина запросила выезд"],["materials","v","Материалы: получить и передать","выезд был"],["plan","bu","Предстоящие","по дате выезда"],["done","gr","Готово","материалы у проектировщика"],["cancel","g","Отменено",""]]) {
      const list=rows.filter(v=>key==="issue"?v.issue:!v.issue && matches(v,key)).sort((a,b)=>(a.day||"").localeCompare(b.day||"")*(key==="done"?-1:1));
      if(!list.length) continue;
      html+=band(cls,title+' · '+list.length+' <small>'+note+'</small>');
      for(const v of list) html+=row(v,i++,cls);
    }
    return html+(rows.length?"":'<div class="empty">Ничего нет.</div>');
  }
function kpi(c,l,v,d){return '<div class="kpi" style="background:'+c+'"><span class="lb">'+l+'</span><b>'+v+'</b><span class="description">'+d+'</span></div>';}

  function summary() {
    const rows=items(), dated=rows.filter(v=>v.day && v.state!=="cancel"), req=rows.filter(v=>v.state==="requested");
    const late=req.filter(v=>v.issue).length;
    const inMonth=["январе","феврале","марте","апреле","мае","июне","июле","августе","сентябре","октябре","ноябре","декабре"][Number(V.month.slice(5))-1];
    const handed=Object.values(V.data?.summary?.handed||{}).reduce((a,b)=>a+b,0);
    return kpi("#5b84c4","Выездов в "+inMonth,dated.length+" <small>выполнено "+dated.filter(v=>["occurred","received","done"].includes(v.state)).length+"</small>","Плюс запрошено без даты: "+req.length+".")+
      kpi("#c0564d","Ждут даты",req.length+(late?" <small>просрочено "+late+"</small>":""),"Полина запросила, дату не назначили. Норма — 1 р.д. Пока даты нет, ТЗ стоит.")+
      kpi("#d08a4e","Материалы не у проектировщика",rows.filter(v=>matches(v,"materials")).length,"Выезд был, но материалы ещё не дошли до проектирования. Норма — 1 р.д. после выезда.")+
      kpi("#4f8a68","Передано проектировщику",handed,"В "+inMonth+". Перенесено выездов: "+rows.filter(v=>v.state==="plan" && v.previous_day).length+".");
  }
  function chips() {
    const people=new Map((V.meta?.people||[]).map(p=>[String(p.id),p.name]));
    for(const v of items()) if(v.executor_id) people.set(String(v.executor_id),v.executor);
    people.delete("");
    return [["","Все"],...people].map(([id,name])=>'<button class="pch'+(V.who===id?' on':'')+'" data-vwho="'+E(id)+'">'+(id?'<span class="av" style="background:'+personColor(name)+'">'+E((name||"?")[0])+'</span>':'')+E(name)+' <span class="n">'+items().filter(v=>v.state!=="cancel" && (!id || String(v.executor_id)===id)).length+'</span></button>').join("");
  }

  function clearTip() { root()?.querySelector(".visit-tip")?.remove(); }
  function showTip(e) {
    const node=e.target.closest?.("[data-visit-tip]");
    if(!node || !root()?.contains(node) || !node.dataset.visitTip) return;
    clearTip();
    const tip=document.createElement("div");
    tip.className="visit-tip"; tip.textContent=node.dataset.visitTip; tip.setAttribute("role","tooltip");
    root().append(tip);
    const box=node.getBoundingClientRect();
    tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,box.left+(box.width-tip.offsetWidth)/2))+"px";
    tip.style.top=(box.bottom+tip.offsetHeight+8<innerHeight?box.bottom+6:Math.max(8,box.top-tip.offsetHeight-6))+"px";
  }
  for(const event of ["mouseover","focusin"]) document.addEventListener(event,showTip);
  for(const event of ["mouseout","focusout"]) document.addEventListener(event,e=>{
    if(e.target.closest?.("[data-visit-tip]")) clearTip();
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && root()?.offsetWidth && (V.quick||V.form||V.sel)) root().querySelector("[data-vclose]")?.click();
  });
  function quickDialog() {
    const v=byId(V.sel), mode=V.quick;
    const project=v?' · №'+E(v.order_number||v.kp_number||"—"):"";
    const titles={request:"Запросить выезд",assign:"Назначить выезд",move:"Перенести выезд",materials:"Материалы с выезда"};
    const submit={request:"Запросить",assign:"Назначить",move:"Перенести",materials:"Сохранить"};
    let fields="", sub=v?E(v.address||v.object):"Запрос увидят Дмитрий и Александр. Норма — назначить дату в течение 1 р.д.";
    if(mode==="request"){
      const orders=window.DS?.orders?.()||[];
      fields='<label class="fld"><span>Проект <i>*</i></span><select name="order" required><option value="">Выберите проект</option>'+orders.map(o=>'<option value="'+E(o.id)+'">'+E(o.label||o.number)+'</option>').join("")+'</select></label><label class="fld"><span>Адрес объекта <i>*</i></span><input name="address" required></label><button type="button" class="ex" data-vadvanced>Расширенная форма</button>';
    } else if(mode==="materials"){
      sub="Отметьте, какие материалы получила Полина.";
      fields='<div class="cl">'+V.meta.materials.map(m=>'<label><input type="checkbox" name="material" value="'+E(m)+'">'+E(m)+'</label>').join("")+'</div>';
    } else {
      const day=pd(today()), choices=[];
      for(let i=1;i<=3;i++){
        do { day.setDate(day.getDate()+1); } while([0,6].includes(day.getDay()));
        choices.push('<button type="button" class="op" data-field="day" data-value="'+iso(day)+'">+'+i+' р.д. <small>'+shortDay(iso(day),true)+'</small></button>');
      }
      fields='<label class="fld"><span>Дата выезда <i>*</i></span><span class="opts">'+choices.join("")+'</span><input name="day" type="date" min="'+today()+'" required></label>';
      const options=mode==="assign"?V.meta.people.map(p=>[p.id,p.name]):["перенёс заказчик","заняты мы","нет доступа на объект","погода"].map(x=>[x,x]);
      const name=mode==="assign"?"executor":"reason";
      fields+='<div class="fld"><span>'+(mode==="assign"?"Кто едет":"Причина")+' <i>*</i></span><span class="opts">'+options.map(([value,label])=>'<button type="button" class="op" data-field="'+name+'" data-value="'+E(value)+'">'+E(label)+'</button>').join("")+'</span>'+(mode==="move"?'<input name="reason" required placeholder="Причина переноса">':'<input name="executor" type="hidden">')+'</div>';
    }
    return '<div class="ov"><form class="md" id="vzQuick" role="dialog" aria-modal="true" aria-labelledby="vzTitle"><div class="mh"><div><h3 id="vzTitle">'+titles[mode]+project+'</h3><p>'+sub+'</p></div><button type="button" class="x" data-vclose aria-label="Закрыть">×</button></div><div class="mb">'+fields+'<span class="err" role="alert"></span></div><div class="mf"><button type="button" class="b" data-vclose>Отмена</button><button class="b '+(mode==="materials"?"gr":"bl")+'">'+submit[mode]+'</button></div></form></div>';
  }
  document.addEventListener("submit",async function(e){
    const form=e.target;
    if(form.id!=="vzQuick" || !root()?.contains(form)) return;
    e.preventDefault();
    if(V.busy) return;
    const f=new FormData(form), mode=V.quick;
    const id=V.sel;
    let path="", body;
    const err=form.querySelector(".err");
    if(mode==="request"){
      body={order_id:Number(f.get("order")),kind:"survey",address:f.get("address").trim(),take:TAKE.survey.map(t=>({t}))};
      if(!body.address){err.textContent="Укажите адрес объекта"; return;}
    } else if(mode==="materials"){
      path="/"+id+"/status"; body={status:"received",received_items:f.getAll("material")};
      if(!body.received_items.length){err.textContent="Отметьте полученные материалы";return;}
    } else {
      path="/"+id+"/edit";body={day:f.get("day")};
      if(mode==="assign"){
        body.executor_id=Number(f.get("executor"));
        if(!body.executor_id){err.textContent="Выберите исполнителя";return;}
      } else body.reason=f.get("reason").trim();
    }
    V.busy=true;
    try { const visit=await api(path,body); V.month=(visit.day||visit.asked).slice(0,7); V.quick=null; V.sel=0; put(visit); paint(); }
    catch(error){err.textContent=String(error);}
    finally {V.busy=false;}
  });

  /* ---------- карточка ---------- */
  function folder(v) {
    if (!v.order_number || !window.DS || !DS.folderUrl) return "";
    var o = { number: v.order_number, object: v.order_object };
    return '<div class="vz-folder"><span>📂</span><div><b>' + E(DS.FOLDER_ROOT + "\\" + v.order_number + ". " + v.order_object) + "</b><small>Фото и ТЗ обследования — и сюда. Откроется в проводнике (нужен VPN и установленная кнопка)</small>"
      + '<a class="btn ghost sm" style="text-decoration:none" href="' + DS.folderUrl(o, false) + '">Перейти в папку на сервере</a></div></div>';
  }
  function mapUrl(v) { return "https://yandex.ru/maps/?text=" + encodeURIComponent([v.city, v.address].filter(Boolean).join(", ")); }
  function drawer(v) {
    if (!v) return "";
    var t = today(), mine = v.executor_id === meId(), ed = v.can_edit, own = ed || mine;
    var when = !v.day ? "Дата не назначена" : (v.day === t ? "Сегодня" : diff(t, v.day) === 1 ? "Завтра" : WD[pd(v.day).getDay()].replace(/^./, function (c) { return c.toUpperCase(); })) + ", " + dm(v.day) + (v.tm ? ", " + v.tm : "")
      + (v.state === "need" ? " · прошёл " + diff(v.day, t) + " дн. назад" : v.state === "done" ? " · выполнен" : v.state === "cancel" ? " · отменён" : "");
    var k = E(v.kind_label) + (v.kind === "supervision" ? " " + v.sup_n + (v.sup_total ? " из " + v.sup_total : "") : "") + (v.order_number ? " · №" + E(v.order_number) : v.kp_number ? " · КП №" + E(v.kp_number) + " (договора ещё нет)" : "");
    var ord = v.order_number ? (v.order_open ? '<a href="#/task/' + v.order_id + '">№' + E(v.order_number) + "</a>" : "№" + E(v.order_number)) + (v.customer ? " · " + E(v.customer) : "")
      : v.kp_number ? '<a href="#/commerce-kp/' + v.kp_id + '">КП №' + E(v.kp_number) + "</a>" + (v.customer ? " · " + E(v.customer) : "") : "—";
    var who = V.meta && V.meta.driver && v.state === "plan" && V.meta.people.length
      ? '<select data-vexec="' + v.id + '" style="border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface);max-width:100%">' + V.meta.people.map(function (p) { return '<option value="' + p.id + '"' + (p.id === v.executor_id ? " selected" : "") + ">" + E(p.name) + "</option>"; }).join("") + "</select>"
      : '<span class="vz-who">' + av(v.executor) + E(v.executor || "—") + "</span>";
    var take = (v.take || []).map(function (x, i) { return '<label class="vz-ck"><input type="checkbox" data-vtake="' + i + '"' + (x.done ? " checked" : "") + (own ? "" : " disabled") + ">" + E(x.t) + "</label>"; }).join("")
      + (own ? '<div class="vz-add"><input id="vzTake" placeholder="Добавить: что взять с собой"><button class="btn ghost sm" data-vtakeadd="1">+</button></div>' : "");
    var files = (v.files || []).length
      ? '<div class="vz-files">' + v.files.map(function (f) { return '<button class="vz-fl" data-vfile="' + f.id + '" title="Скачать · ' + E(f.by_name) + '">📎 <span>' + E(f.name) + "</span>" + (own ? '<em data-vfdel="' + f.id + '" title="Удалить">✕</em>' : "") + "</button>"; }).join("") + "</div>" : "";
    var drop = own && v.state !== "cancel" ? '<label class="vz-drop" id="vzDrop"><input type="file" id="vzFiles" multiple hidden>' + (V.up && V.upKind === "result" ? "Загружаю " + E(V.up) : "Перетащите сюда фото и ТЗ обследования или нажмите, чтобы выбрать") + "</label>" : "";
    var plans = (v.plans || []).length
      ? '<div class="vz-files">' + v.plans.map(function (f) { return '<button class="vz-fl" data-vfile="' + f.id + '" title="Скачать · ' + E(f.by_name) + '">🗺 <span>' + E(f.name) + "</span>" + (ed ? '<em data-vfdel="' + f.id + '" title="Удалить">✕</em>' : "") + "</button>"; }).join("") + "</div>"
      : ed ? "" : '<div class="vz-hint">Планировок не приложили</div>';
    var planDrop = ed && v.state !== "cancel" ? '<label class="vz-drop" id="vzPlanDrop"><input type="file" id="vzPlanFiles" multiple accept="' + PLAN_ACCEPT + '" hidden>' + (V.up && V.upKind === "plan" ? "Загружаю " + E(V.up) : "Перетащите планировки (PDF или JPEG) или нажмите, чтобы выбрать") + "</label>" : "";
    var note = v.state === "need" ? '<div class="vz-note bad">📎 Выезд прошёл, а материалов нет. Утром исполнителю придёт напоминание, а операционному менеджеру — задача проконтролировать.</div>'
      : v.state === "plan" ? '<div class="vz-note">🔔 Напоминание ' + E(v.executor || "исполнителю") + " в Telegram накануне в 18:00 и за 2 часа до выезда (по времени города).</div>" : "";
    var nf = !(v.files || []).length, acts = "";
    if ((v.state==="requested" || v.state==="plan") && V.meta.driver)
      acts+='<button class="btn ghost sm" data-vedit="1">'+(v.state==="requested"?"Назначить дату":"Перенести / изменить")+'</button>';
    if(v.state==="plan" && mine) acts+='<button class="btn primary sm" data-vstatus="occurred">Выезд состоялся</button>';
    if(v.state==="occurred" && pos()==="ops") {
      acts+='<fieldset><legend>Что получено</legend>'+V.meta.materials.map(m=>'<label class="vz-ck"><input type="checkbox" name="vzReceived" value="'+E(m)+'">'+E(m)+'</label>').join("")+'</fieldset><button class="btn primary sm" data-vstatus="received">Материалы получены</button>';
    }
    if((v.received_items||[]).length) acts+='<div class="vz-hint">Получено: '+v.received_items.map(E).join(", ")+'</div>';
    if(v.state==="received" && pos()==="ops") acts+='<button class="btn primary sm" data-vstatus="done">Передала проектировщику</button>';
    if(pos()==="ops" && !["done","cancel"].includes(v.state)) acts+='<button class="btn ghost sm" data-vstatus="cancel">Отменить</button>';
    if ((pos() === "owner" || pos() === "ops") && nf && ["requested","plan","cancel"].includes(v.state)) acts += '<button class="btn ghost sm" data-vdel="1" style="color:var(--bad)" title="Удалить выезд">🗑</button>';
    return '<aside class="vz-dr"><div class="vz-dh"><button class="x" data-vclose="1" title="Закрыть">✕</button><div class="k">' + k + "</div><h2>" + E(v.object || v.address || "Объект") + '</h2><div class="when' + (v.state === "need" ? " bad" : "") + '">' + E(when) + "</div></div>"
      + '<div class="vz-db"><dl class="vz-kv"><dt>Кто едет</dt><dd>' + who + "</dd>"
      + "<dt>Адрес</dt><dd>" + E([v.city, v.address].filter(Boolean).join(", ") || "—") + (v.city || v.address ? ' · <a href="' + mapUrl(v) + '" target="_blank" rel="noopener">Карта</a>' : "") + "</dd>"
      + "<dt>На объекте</dt><dd>" + E(v.contact || "—") + (v.phone ? '<br><a href="tel:' + E(v.phone.replace(/[^\d+]/g, "")) + '">' + E(v.phone) + "</a>" : "") + "</dd>"
      + "<dt>Задача</dt><dd>" + ord + "</dd>" + "<dt>Система</dt><dd>" + (v.system ? "<b>" + E(v.system) + "</b>" : '<span style="color:var(--muted)">не указана</span>') + "</dd>"
      + (v.goal ? "<dt>Цель</dt><dd>" + E(v.goal) + "</dd>" : "") + "</dl>" + folder(v)
      + '<div class="vz-sec"><div class="h">Планировки для обследования <span>PDF, JPEG</span></div>' + plans + planDrop + "</div>"
      + '<div class="vz-sec"><div class="h">Взять с собой</div>' + (take || '<div class="vz-hint">—</div>') + "</div>"
      + '<div class="vz-sec"><div class="h">Материалы <span>' + (v.state === "done" ? "выезд закрыт" : "обязательно для закрытия") + "</span></div>" + files + drop + "</div>"

      + note + (acts ? '<div class="vz-acts">' + acts + "</div>" : "")

      + '<div class="vz-hint" style="margin-top:12px">Назначил ' + E(v.created_by || "—") + "</div></div></aside>";
  }

  /* ---------- форма: новый выезд / перенос ---------- */
  function cityExec(city) {
    var k = cityKey(city), c = ((V.meta && V.meta.cities) || []).filter(function (x) { return cityKey(x.city) === k; })[0];
    return c ? c.executor_id : 0;
  }
  function openForm(init) {
    var f = { id: 0, kind: "survey", order_id: 0, object: "", system: null, city: "", address: "", day: "", tm: "", executor_id: 0, auto: true, contact: "", phone: "", goal: "", sup_total: 0 };
    Object.keys(init || {}).forEach(function (k) { f[k] = init[k]; });
    V.form = f; V.sel = 0;
    fromOrder(f, 0);
    if (window.DS && DS.ensureOrders) DS.ensureOrders().then(function () { if (V.form === f) { fromOrder(f, 0); paint(); } });
  }
  function orderOf(id) { return id && window.DS && DS.orders ? DS.orders().filter(function (x) { return x.id === id; })[0] : null; }
  /* задача выбрана — объект и система подставляются из неё (если их не вписали руками) */
  function fromOrder(f, prev) {
    var o = orderOf(f.order_id), p = orderOf(prev);
    if (!o) return;
    if (!f.object || (p && f.object === p.object)) f.object = o.object;
    if (f.system == null || (p && f.system === p.system)) f.system = o.system;
  }
  function formHtml() {
    var f = V.form, ppl = (V.meta && V.meta.people) || [];
    var orders = window.DS && DS.orders ? DS.orders() : [];
    var opt = function (v, t, on) { return '<option value="' + E(v) + '"' + (on ? " selected" : "") + ">" + E(t) + "</option>"; };
    var kinds = Object.keys((V.meta && V.meta.kinds) || {}).map(function (k) { return opt(k, V.meta.kinds[k], f.kind === k); }).join("");
    if (f.order_id && !orderOf(f.order_id) && f.order_label) orders = orders.concat([{ id: f.order_id, label: f.order_label }]);      // задача скрыта от роли — оставляем как есть
    var link = '<select id="vfLink"><option value="">— выберите задачу —</option>' + orders.map(function (o) { return opt(o.id, o.label, f.order_id === o.id); }).join("") + "</select>";
    var ex = f.auto && !f.id ? cityExec(f.city) : f.executor_id;
    var who = '<select id="vfExec"><option value="0">' + (f.id ? "—" : "по городу" + (cityExec(f.city) ? "" : " (выберите)")) + "</option>" + ppl.map(function (p) { return opt(p.id, p.name, ex === p.id); }).join("") + "</select>";
    var cities = ((V.meta && V.meta.cities) || []).map(function (c) { var p = ppl.filter(function (x) { return x.id === c.executor_id; })[0]; return E(c.city) + " — " + E(p ? p.name : "не задан"); }).join(", ");
    return '<aside class="vz-dr"><div class="vz-dh"><button class="x" data-vclose="1" title="Закрыть">✕</button><div class="k">' + (f.id ? "Изменить выезд" : "Новый выезд") + "</div><h2>" + (f.id ? "Перенести или изменить" : "Запросить выезд") + "</h2></div>"
      + '<div class="vz-db ds"><div class="fld"><label>Тип</label><select id="vfKind">' + kinds + "</select></div>"
      + '<div class="fld"><label>Задача (папка на сервере) *</label>' + link + "</div>"
      + '<div class="fld"><label>Объект</label><input id="vfObj" value="' + E(f.object) + '" placeholder="ТЦ «Радуга», 2 этаж"></div>'
      + '<div class="fld"><label>Система для проектирования</label><input id="vfSys" value="' + E(f.system || "") + '" readonly></div>'
      + '<div class="vz-f2"><div class="fld"><label>Город</label><input id="vfCity" value="' + E(f.city) + '" placeholder="Кемерово" list="vfCities"><datalist id="vfCities">' + ((V.meta && V.meta.cities) || []).map(function (c) { return '<option value="' + E(c.city) + '">'; }).join("") + "</datalist></div>"
      + (f.id ? '<div class="fld"><label>Кто едет</label>' + who + "</div>" : "") + "</div>"
      + (f.id ? '<div class="vz-hint">' + cities + "</div>" : "")
      + '<div class="fld"><label>Адрес</label><input id="vfAddr" value="' + E(f.address) + '" placeholder="пр. Ленина, 92"></div>'
      + (!f.id && pos()==="ops" ? "" : '<div class="vz-f2"><div class="fld"><label>Дата</label><input id="vfDay" type="date" value="' + E(f.day) + '"></div><div class="fld"><label>Время</label><input id="vfTm" type="time" value="' + E(f.tm) + '"></div></div>')
      + '<div class="vz-f2"><div class="fld"><label>Контакт на объекте</label><input id="vfCont" value="' + E(f.contact) + '" placeholder="Сергей, прораб"></div><div class="fld"><label>Телефон</label><input id="vfPhone" value="' + E(f.phone) + '" placeholder="+7 …"></div></div>'
      + '<div class="fld"><label>Цель</label><textarea id="vfGoal" placeholder="Обследование для проекта СПС, СОУЭ: 2 этаж, 3 200 м²">' + E(f.goal) + "</textarea></div>"
      + (f.id ? "" : '<div class="fld"><label>Планировки для обследования (PDF, JPEG)</label><input type="file" id="vfPlans" multiple accept="' + PLAN_ACCEPT + '">'
        + ((f.planFiles || []).length ? '<div class="vz-files" style="margin-top:6px">' + f.planFiles.map(function (x, i) { return '<span class="vz-fl">🗺 <span>' + E(x.name) + '</span><em data-vfpdel="' + i + '" title="Убрать">✕</em></span>'; }).join("") + "</div>" : "") + "</div>")
      + '<div class="vz-f2"><div class="fld"' + (f.kind === "supervision" ? "" : ' style="display:none"') + '><label>Надзор: всего выездов</label><input id="vfSup" type="number" min="0" value="' + (f.sup_total || "") + '" placeholder="по договору"></div>'
      + "</div>"
      + (V.err ? '<div class="vz-note bad">' + E(V.err) + "</div>" : "")
      + '<div class="vz-acts"><button class="btn primary sm grow" data-vsave="1"' + (V.busy ? " disabled" : "") + ">" + (f.id ? "Сохранить" : "Запросить выезд") + '</button><button class="btn ghost sm" data-vclose="1">Отмена</button></div></div></aside>';
  }
  function readForm() {
    var f = V.form, g = function (id) { var e = document.getElementById(id); return e ? e.value : ""; };
    f.kind = g("vfKind") || f.kind; f.object = g("vfObj"); f.city = g("vfCity"); f.address = g("vfAddr"); f.day = g("vfDay"); f.tm = g("vfTm");
    f.contact = g("vfCont"); f.phone = g("vfPhone"); f.goal = g("vfGoal"); f.sup_total = +g("vfSup") || 0;
    var ex = +g("vfExec") || 0; if (ex && (!f.auto || ex !== cityExec(f.city))) { f.executor_id = ex; f.auto = false; } else if (!ex) { f.auto = true; f.executor_id = 0; }
    if (document.getElementById("vfSys")) f.system = g("vfSys");
    if (document.getElementById("vfLink")) { var prev = f.order_id; f.order_id = +g("vfLink") || 0; if (prev !== f.order_id) fromOrder(f, prev); }
  }
  function saveForm() {
    readForm();
    var f = V.form;
    if (!f.order_id) { V.err = "Выберите задачу, к которой относится выезд"; paint(); return; }
    if ((!f.day && f.id) || (!f.day && !f.address.trim())) { V.err = f.id ? "Укажите дату выезда" : "Укажите адрес объекта"; paint(); return; }
    var body = { order_id: f.order_id, kind: f.kind, object: f.object, system: f.system || "", city: f.city, address: f.address, day: f.day, tm: f.tm, contact: f.contact, phone: f.phone, goal: f.goal };
    if (f.kind === "supervision") body.sup_total = f.sup_total;

    var ex = f.auto && !f.id ? 0 : f.executor_id;
    if (ex) body.executor_id = ex;
    if (f.id && !ex && !byId(f.id)?.executor_id) { V.err="Выберите исполнителя"; paint(); return; }
    if (f.id && byId(f.id)?.day && byId(f.id).day!==f.day) {
      body.reason=prompt("Причина переноса")?.trim();
      if (!body.reason) return;
    }
    if (!f.id && pos()==="ops") { body.day=""; body.tm=""; delete body.executor_id; }
    if (!f.id) body.take = (TAKE[f.kind] || []).map(function (t) { return { t: t }; });
    V.busy = true; V.err = ""; paint();
    (f.id ? api("/" + f.id + "/edit", body) : api("", body)).then(function (v) {
      V.busy = false; V.form = null; V.sel = v.id;
      V.month = (v.day || v.asked).slice(0, 7);
      put(v); toast(f.id ? "Выезд изменён" : v.day ? "Выезд назначен: " + v.executor : "Запрос на выезд создан"); paint();
      if ((f.planFiles || []).length) sendFiles(f.planFiles, "plan");      // планировки — сразу к новому выезду
    }, function (e) { V.busy = false; V.err = String(e); paint(); });
  }

  /* ---------- отрисовка ---------- */
  function paint() {
    var el = root();
    if (!el || el.style.display === "none") return;
    var y = +V.month.slice(0, 4), m = +V.month.slice(5, 7);
    var dr = V.quick ? "" : V.form ? formHtml() : drawer(byId(V.sel));
    const colors=[["#fff","#1b3a5e"],["#f8dcd8","#a5281b"],["#fdeeed","#a5281b"],["#e1eaf6","#1d4f9e"],["#f8e2cf","#8a4310"],["#d9efe0","#17653a"],["#eceff3","#4a5566"]];
    const buttons=Object.entries(FILTERS).map(([key,label],i)=>'<button class="ft'+(V.tab===key?' on':'')+'" data-vtab="'+key+'" style="background:'+colors[i][0]+';color:'+colors[i][1]+(i===0?';border-color:#c3ccd8':'')+'">'+label+' · '+tabCount(key)+'</button>').join("");
    const td=today();
    el.innerHTML='<div class="visit-register"><div class="visit-wrap"><div class="visit-top"><div><h1>Выезды</h1><div class="sub">Сегодня '+WD[pd(td).getDay()]+' '+shortDay(td)+' · выезды на объект для сбора ТЗ</div></div>'+
      (pos()==="ops"?'<button class="b bl" data-vnew="1">+ Запросить выезд</button>':'')+'</div>'+
      (V.err && !V.form?'<div role="alert">'+E(V.err)+'</div>':'')+
      '<div class="intro">Выезд нужен, чтобы <b>собрать ТЗ</b>. Полина запрашивает выезд. Дмитрий или Александр назначают дату. После выезда материалы — в течение <b>1 р.д.</b> у Полины, в тот же день — у проектировщика. Пока материалов нет, ТЗ стоит, и дни на сборе идут.</div><div class="g4">'+summary()+'</div><div class="ppl">'+chips()+
      '<span class="mon"><button data-vmon="-1" aria-label="Прошлый месяц">‹</button>'+(V.month<td.slice(0,7)?'Архив · ':'')+MONTHS[m-1]+' '+y+'<button data-vmon="1" aria-label="Следующий месяц">›</button></span></div>'+
      '<div class="filters">'+buttons+'</div><div class="visit-card"><div class="tw"><div class="tb vyt">'+groups()+'</div></div><div class="foot"><span>Отменённые — фильтр «Отменено».</span></div></div></div>'+(V.quick?quickDialog():"")+'</div>'+
      (dr?'<div class="visit-overlay ds" role="dialog" aria-modal="true" aria-label="Выезд">'+dr+'</div>':'');
    [["vzDrop", "vzFiles", "result"], ["vzPlanDrop", "vzPlanFiles", "plan"]].forEach(function (x) {
      var drop = document.getElementById(x[0]), inp = document.getElementById(x[1]);
      if (inp) inp.onchange = function () { sendFiles(inp.files, x[2]); };
      if (drop) {
        drop.ondragover = function (e) { e.preventDefault(); drop.classList.add("on"); };
        drop.ondragleave = function () { drop.classList.remove("on"); };
        drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove("on"); sendFiles(e.dataTransfer.files, x[2]); };
      }
    });

  }

  function edit(body) {
    var v = byId(V.sel); if (!v) return;
    api("/" + v.id + "/edit", body).then(function (nv) { put(nv); paint(); }, function (e) { toast(String(e)); });
  }
  function sendFiles(list, kind) {
    var v = byId(V.sel), files = Array.prototype.slice.call(list || []);
    if (!v || !files.length || V.up) return;
    if (kind === "plan") {
      var bad = files.filter(function (f) { return !PLAN_OK.test(f.name); });
      if (bad.length) { toast("Планировки — только PDF или JPEG: " + bad.map(function (f) { return f.name; }).join(", ")); return; }
    }
    var toks = [], i = 0;
    var next = function () {
      if (i >= files.length) return Promise.resolve();
      var f = files[i++];
      return C().upload(f, f.name, function (pc) { V.up = f.name + " — " + pc + "%" + (files.length > 1 ? " (" + i + " из " + files.length + ")" : ""); var d = document.getElementById(kind === "plan" ? "vzPlanDrop" : "vzDrop"); if (d) d.lastChild.textContent = "Загружаю " + V.up; })
        .then(function (t) { toks.push(t); return next(); });
    };
    V.up = files[0].name; V.upKind = kind; paint();
    next().then(function () { return api("/" + v.id + "/files", { uploads: toks, kind: kind }); })
      .then(function (nv) { V.up = ""; put(nv); toast(files.length > 1 ? "Файлы загружены" : "Файл загружен"); paint(); }, function (e) { V.up = ""; toast(String(e)); paint(); });
  }
  function download(fid) {
    C().blob("/ds/visits/files/" + fid).then(function (f) {
      var a = document.createElement("a"); a.href = URL.createObjectURL(f.blob); a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, function (e) { toast(String(e)); });
  }

  document.addEventListener("click", function (e) {
    var el = root();
    if (!el || !el.contains(e.target)) return;
    var b = e.target.closest("[data-field],[data-vadvanced],[data-vrow],[data-vfpdel],[data-vsel],[data-vwho],[data-vtab],[data-vmon],[data-vnew],[data-vclose],[data-vsave],[data-vedit],[data-vstatus],[data-vdel],[data-vfile],[data-vfdel],[data-vtakeadd]");
    if (!b) return;
    var d = b.dataset, v = byId(V.sel);
    if (d.vfdel != null) {
      e.preventDefault(); e.stopPropagation();
      if (!confirm("Удалить файл?")) return;
      api("/" + v.id + "/files/" + d.vfdel + "/delete", {}).then(function (nv) { put(nv); paint(); }, function (er) { toast(String(er)); });
      return;
    }
    if(d.field && V.quick){
      const f=b.closest("form"); f.elements[d.field].value=d.value;
      f.querySelectorAll('[data-field="'+d.field+'"]').forEach(x=>x.classList.toggle("on",x===b)); return;
    }
    if(d.vadvanced!=null){
      const f=b.closest("form"); V.quick=null; openForm({order_id:Number(f.elements.order.value),address:f.elements.address.value}); paint();return;
    }
    if (d.vsel != null || d.vrow != null) {
      V.sel=Number(d.vrow || d.vsel); V.form=null; V.err=""; V.quick=d.op==="edit"?(byId(V.sel).day?"move":"assign"):d.op==="materials"?"materials":null; paint();
      if(V.quick) return;
      else if(["cancel","occurred","done"].includes(d.op)) el.querySelector('[data-vstatus="'+d.op+'"]')?.click();
      else if(d.op==="materials") el.querySelector('[name="vzReceived"]')?.focus();
      return;
    }
    if (d.vwho != null) { V.who = d.vwho; paint(); return; }
    if (d.vtab != null) { V.tab = d.vtab; paint(); return; }
    if (d.vmon != null) {
      var y = +V.month.slice(0, 4), m = +V.month.slice(5, 7) - 1 + (+d.vmon), dt = new Date(y, m, 1);
      V.month = iso(dt).slice(0, 7); V.data = null; V.sel = 0; V.form = null; load().then(paint); return;
    }
    if (d.vnew != null) { V.err = ""; V.sel=0; V.form=null; V.quick="request"; paint();
      if(window.DS?.ensureOrders) DS.ensureOrders().then(()=>{
        const select=root()?.querySelector('#vzQuick select[name="order"]');
        if(select && select.options.length===1) {
          for(const o of DS.orders()) select.add(new Option(o.label||o.number,o.id));
        }
      }).catch(er=>toast(String(er)));
      return; }
    if (d.vclose != null) { if(V.busy)return; V.quick=null; V.sel = V.form && V.form.back || 0; V.form = null; V.err = ""; paint(); return; }
    if (d.vsave != null) { saveForm(); return; }
    if (d.vedit != null && v) { V.err = ""; openForm({ id: v.id, order_id: v.order_id, order_label: "№" + v.order_number + " · " + (v.customer || "") + " · " + (v.order_object || ""), kind: v.kind, object: v.object, system: v.system || "", city: v.city, address: v.address, day: v.day, tm: v.tm, executor_id: v.executor_id, auto: false, contact: v.contact, phone: v.phone, goal: v.goal, sup_total: v.sup_total }); V.sel = 0; V.form.back = v.id; paint(); return; }
    if (d.vstatus != null && v) {
      var body={status:d.vstatus};
      if(d.vstatus==="received"){
        body.received_items=Array.from(el.querySelectorAll('[name="vzReceived"]:checked'),x=>x.value);
        if(!body.received_items.length){toast("Отметьте полученные материалы");return;}
      }
      if(d.vstatus==="cancel"){body.reason=prompt("Причина отмены")?.trim();if(!body.reason)return;}
      api("/" + v.id + "/status", body).then(function (nv) { put(nv); toast(statusLabel(nv)); paint(); }, function (er) { toast(String(er)); });
      return;
    }
    if (d.vdel != null && v) {
      if (!confirm("Удалить выезд совсем? Обычно достаточно «Отменить».")) return;
      api("/" + v.id + "/delete", {}).then(function () { V.sel = 0; if (V.data) V.data.items = items().filter(function (x) { return x.id !== v.id; }); toast("Выезд удалён"); load().then(paint); }, function (er) { toast(String(er)); });
      return;
    }
    if (d.vfile != null) { download(d.vfile); return; }
    if (d.vtakeadd != null && v) {
      var t = (document.getElementById("vzTake") || {}).value || "";
      if (t.trim()) edit({ take: (v.take || []).concat([{ t: t.trim(), done: false }]) });
      return;
    }
    if (d.vfpdel != null && V.form) { readForm(); V.form.planFiles.splice(+d.vfpdel, 1); paint(); return; }

  });
  document.addEventListener("change", function (e) {
    var el = root();
    if (!el || !el.contains(e.target)) return;
    var t = e.target, v = byId(V.sel);
    if (t.hasAttribute("data-vtake") && v) { var i = +t.getAttribute("data-vtake"); edit({ take: (v.take || []).map(function (x, j) { return j === i ? { t: x.t, done: t.checked } : x; }) }); return; }
    if (t.hasAttribute("data-vexec") && v) { edit({ executor_id: +t.value }); return; }
    if (V.form && t.id === "vfPlans") {
      readForm();
      var picked = Array.prototype.slice.call(t.files || []), bad = picked.filter(function (f) { return !PLAN_OK.test(f.name); });
      if (bad.length) toast("Пропущены — не PDF и не JPEG: " + bad.map(function (f) { return f.name; }).join(", "));
      V.form.planFiles = (V.form.planFiles || []).concat(picked.filter(function (f) { return PLAN_OK.test(f.name); }));
      paint(); return;
    }
    if (V.form && (t.id === "vfKind" || t.id === "vfCity" || t.id === "vfLink" || t.id === "vfExec")) {
      readForm();
      paint();
    }
  });

  /* ---------- блок «Выезды» в карточке заказа ---------- */
  var cache = {};
  V.panel = function (o) {
    if (!o || VIEW.indexOf(pos()) < 0) return "";
    return '<div class="panel pad vz-op" data-vzorder="' + o.id + '"><h3 style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>Выезды</span>'
      + (pos()==="ops" ? '<a class="btn ghost sm" style="text-decoration:none" href="#/visits?new=' + o.id + '">+ Запросить</a>' : "") + '</h3><div class="vz-ob">' + (cache[o.id] ? orderRows(cache[o.id].items) : '<p class="sub" style="margin:6px 0 0">Загрузка…</p>') + "</div></div>";
  };
  function orderRows(a) {
    if (!a.length) return '<p class="sub" style="margin:6px 0 0">Выездов пока не было</p>';
    var sup = a.filter(function (v) { return v.kind === "supervision" && v.state !== "cancel"; });
    var head = sup.length ? '<div class="vz-hint" style="margin:4px 0 6px">Авторский надзор: ' + sup.length + (sup[sup.length - 1].sup_total ? " из " + sup[sup.length - 1].sup_total : "") + "</div>" : "";
    return head + a.map(function (v) {
      var pill = '<span class="vz-pill">'+E(statusLabel(v))+"</span>";
      return '<a class="vz-orow" style="text-decoration:none;color:inherit" href="#/visits?v=' + v.id + '"><b>' + dm(v.day) + "</b><span>" + E(v.executor || "—") + " · " + E(v.kind_label.toLowerCase()) + (v.goal ? ", " + E(v.goal.slice(0, 60)) : "") + "</span>" + pill + "</a>";
    }).join("");
  }
  function fill(el) {
    var id = +el.getAttribute("data-vzorder"), c = cache[id];
    el.setAttribute("data-filled", "1");
    if (c && Date.now() - c.at < 30000) return;
    api("?order_id=" + id).then(function (r) {
      cache[id] = { at: Date.now(), items: r.items };
      document.querySelectorAll('[data-vzorder="' + id + '"] .vz-ob').forEach(function (x) { x.innerHTML = orderRows(r.items); });
    }, function () { document.querySelectorAll('[data-vzorder="' + id + '"]').forEach(function (x) { x.remove(); }); });      // старый мост без выездов
  }
  new MutationObserver(function () { document.querySelectorAll("[data-vzorder]:not([data-filled])").forEach(fill); }).observe(document.body, { childList: true, subtree: true });

  if (C()) {
    C().on && C().on("logout", function () { V.meta = V.data = V.extra = null; V.sel = 0; V.form = null; cache = {}; });
    C().on && C().on("login", function () { V.meta = V.data = null; });       // раздел перерисует globalRouter (ds.js слушает вход)
    if (C().loggedIn && C().loggedIn() && /^#\/visits/.test(location.hash)) { if (typeof window.globalRouter === "function") window.globalRouter(); else V.mount(); }      // вход случился раньше, чем загрузился этот файл: меню и раздел — заново
  }
})();
