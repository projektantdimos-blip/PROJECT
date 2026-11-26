/* «Пятничный созвон» — окно Полины (вкладка «Проекты»), макет 26.11.
   Внешний вид 1-в-1 по согласованному макету; данные /reports/ops2/friday, сохранение /reports/ops2/save.
   Заполняет ops/owner, остальные роли — чтение. Закрытый блок 9 сервер вырезает у чужих. */
(function () {
  "use strict";
  var X = window.DS._ctx;
  var S = X.S, E = X.E, api = X.api, toast = X.toast, pos = X.pos;
  var D = null;                     // данные сервера
  var RO = true;                    // только чтение
  var M = { answers: {}, tz_rows: [], tz_events: [], situations: [], paid_fixes: [] };
  var saveTimer = null, saving = false;

  var OF_CSS = `
#ofr{--bg:#f4f6f8;--ink:#1d2733;--muted:#46515e;--line:#d3dbe3;--blue:#2a65a0;--blue-bg:#dbe8f5;--blue-bd:#a9c3de;--blue-tx:#1b3a5e;--cream:#fff0c8;--cream-bd:#d3b25c;--cream-tx:#3d2c05;--input-bd:#bf9a3e}
#ofr{color-scheme:light}
#ofr{background:var(--bg);color:var(--ink)}
#ofr{margin:0;font-family:"Segoe UI",Roboto,Arial,sans-serif;font-size:15px;line-height:1.4;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:20px}
#ofr *{box-sizing:border-box}
#ofr .page{max-width:1200px;margin:0 auto}
#ofr .top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
#ofr .top h1{font-size:22px;font-weight:600;margin:0;text-wrap:balance}
#ofr .top h1 .role{font-weight:400;color:var(--muted);font-size:17px}
#ofr .cnt{background:#fbe0d0;color:#7a3410;border-radius:16px;padding:5px 13px;font-size:13px;font-weight:600}
#ofr .cnt.ok{background:#dff1e6;color:#17653a}
#ofr .note{font-size:13px;color:var(--muted);margin:0 0 10px}
#ofr .key{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#2f3a46;margin:6px 0 14px}
#ofr .key i{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-3px;margin-right:6px}
#ofr .kb{background:var(--blue-bg);border:1px solid #9fbbd8}
#ofr .ka{background:var(--cream);border:1px solid var(--cream-bd)}
#ofr .zn{border-radius:14px;margin-bottom:18px;overflow:hidden;border:1px solid var(--zb);background:var(--zbg)}
#ofr .zh{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;background:var(--zh);color:var(--zt)}
#ofr .zh b{font-size:16px;font-weight:700}
#ofr .zh b.big{font-size:18px;font-weight:700;line-height:1.2}
#ofr .zh small{font-size:13px;font-weight:400;display:block;margin-top:1px}
#ofr .zs{font-size:13px;font-weight:600;background:#fff;border-radius:14px;padding:4px 12px;color:var(--zt);white-space:nowrap}
#ofr .zi{padding:12px}
#ofr .qa{background:#fff;border:1px solid var(--line);border-left:6px solid var(--zc);border-radius:12px;margin-bottom:10px;overflow:hidden}
#ofr .qa:last-child{margin-bottom:0}
#ofr .qb{display:flex;align-items:center;gap:12px;padding:12px 14px;width:100%;border:0;background:#fff;font:inherit;text-align:left;cursor:pointer;color:var(--ink)}
#ofr .qb:focus-visible{outline:3px solid var(--blue);outline-offset:-3px}
#ofr .no{width:30px;height:30px;border-radius:8px;background:var(--zc);color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none}
#ofr .qb .t{flex:1;min-width:0}
#ofr .qb b{font-size:15px;font-weight:600;display:block}
#ofr .qb small{font-size:13px;color:var(--muted)}
#ofr .pl{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
#ofr .pl span{background:var(--blue-bg);border:1px solid var(--blue-bd);color:#163456;border-radius:14px;padding:3px 11px;font-size:14px}
#ofr .pl strong{font-weight:700}
#ofr .tg.n{background:#eceff3;color:#46515e}
#ofr .ac3{border-radius:12px;overflow:hidden;border:1px solid #b4bcc8;background:#e8ebf0;color:#2b3445;margin:0 0 8px}
#ofr .ac3.ok{background:#e3f4e8;border-color:#8fcaa3;color:#1d4d2f}
#ofr .ac3.red{background:#fbe8e6;border-color:#e3a9a4;color:#6a1f1f}
#ofr .ac3 .acb{display:flex;justify-content:space-between;gap:8px;width:100%;border:0;font:inherit;font-size:15px;font-weight:700;padding:11px 14px;cursor:pointer;text-align:left;background:#d6dbe3;color:#2b3445}
#ofr .ac3 .acb:focus-visible{outline:3px solid var(--blue);outline-offset:-3px}
#ofr .ac3.ok .acb{background:#c3e6cf;color:#17653a}
#ofr .ac3.red .acb{background:#f4cbc7;color:#8a2a22}
#ofr .ac3 .acb span:last-child{font-weight:600;font-size:14px}
#ofr .ac3 .bdy{display:none}
#ofr .ac3.open .bdy{display:block}
#ofr .ac3 .r1{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;padding:9px 14px;border-bottom:1px solid rgba(0,0,0,.08);font-size:14px}
#ofr .ac3 .r1 .vt{font-size:12px;font-weight:600;opacity:.85}
#ofr .ac3 .r1 b{text-align:right;justify-self:end}
#ofr .ac3 .cap1{font-size:11px;font-weight:600;padding:6px 14px;background:rgba(255,255,255,.55)}
#ofr .ac3 .cap1 .vt{font-size:11px;opacity:1}
#ofr .lane .cl2{display:flex;flex-direction:column;align-items:center;gap:2px}
#ofr .lane .vh{font-size:10px;font-weight:600;color:#46515e}
#ofr .ac3 .tt1{display:flex;justify-content:space-between;padding:10px 14px;font-weight:700;background:rgba(0,0,0,.06);border-top:2px solid rgba(0,0,0,.15)}
#ofr .ac3.ok, #ofr .ac3.red{background:#fff;color:#1d2733}
#ofr .ac3.ok .acb, #ofr .ac3.red .acb{border-bottom:2px solid}
#ofr .ac3.ok .acb{border-bottom-color:#2f8f5b}
#ofr .ac3.red .acb{border-bottom-color:#cf4a3d}
#ofr .ac3.ok .cap1{background:#eaf5ee;color:#17653a;border-bottom:1px solid #8fcaa3;padding-top:7px;padding-bottom:7px}
#ofr .ac3.red .cap1{background:#fcecea;color:#8a2a22;border-bottom:1px solid #e3a9a4;padding-top:7px;padding-bottom:7px}
#ofr .ac3.ok .r1:not(.cap1){border-bottom:1px solid #dcebe1}
#ofr .ac3.red .r1:not(.cap1){border-bottom:1px solid #f3dcda}
#ofr .ac3.ok .r1, #ofr .ac3.red .r1{border-bottom:0}
#ofr .ac3.ok .r1:not(.cap1):nth-of-type(odd){background:#e6f4ec}
#ofr .ac3.red .r1:not(.cap1):nth-of-type(odd){background:#fbe8e6}
#ofr .ac3.ok .r1 .vt, #ofr .ac3.red .r1 .vt{color:#46515e;opacity:1}
#ofr .ac3.ok .tt1{background:#c3e6cf;color:#17653a;border-top:1px solid #8fcaa3}
#ofr .ac3.red .tt1{background:#f4cbc7;color:#8a2a22;border-top:1px solid #e3a9a4}
#ofr .pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:start;margin-bottom:8px}
#ofr .pair .ac3{margin:0}
@media(max-width:700px){}
#ofr .ar4{display:grid;grid-template-columns:118px minmax(0,1fr) minmax(0,1fr) 140px;gap:8px;align-items:end;padding:8px 0;border-top:1px dashed var(--cream-bd)}
#ofr .ar4:first-of-type{border-top:0}
#ofr .an4{font-size:13px;line-height:1.25;align-self:center}
#ofr .an4 b{display:block;font-size:14px;font-weight:600}
#ofr .ar5{display:grid;grid-template-columns:112px minmax(0,1fr) 112px minmax(0,2.2fr) 118px;gap:8px;align-items:center;padding:7px 0;border-top:1px dashed var(--cream-bd)}
#ofr .ar5.f{border-top:0}
#ofr .ar5.hd5{border-top:0;padding:0;margin-bottom:-10px;font-size:13px;font-weight:600;color:#5a4410}
#ofr .ar5 .in{height:32px;font-size:12px;padding:0 6px}
#ofr .ar5.hd5 span:nth-child(n+2){text-align:center;white-space:nowrap}
#ofr .in:disabled{opacity:.45;background:#f3ead0}
#ofr .dtw{position:relative;display:block}
#ofr .dtw .dtx{padding-right:30px}
#ofr .dtb{position:absolute;right:4px;top:4px;width:24px;height:24px;border:0;background:none;color:#6b4e0a;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
#ofr .dtb:disabled{opacity:.45;cursor:default}
#ofr .dth{position:absolute;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none}
@media(max-width:600px){}
#ofr .ar5 .an4{grid-column:1/-1}
#ofr .ar5.hd5{display:none}
#ofr }
@media(max-width:600px){#ofr .ar4{grid-template-columns:1fr 1fr}
#ofr .an4{grid-column:1/-1}
#ofr }
#ofr .ln{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin:10px 0 12px;align-items:start}
#ofr .lane{border-radius:12px;overflow:hidden;border:1px solid #b4bcc8;background:#e8ebf0;color:#2b3445}
#ofr .lane h4{margin:0;padding:9px 12px;font-size:14px;font-weight:700;background:#d6dbe3;display:flex;justify-content:space-between}
#ofr .lane .i{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid #d1d6de;font-size:13px;line-height:1.25}
#ofr .lane:not(.wide) .i{grid-template-columns:minmax(0,1fr) auto;gap:2px 8px}
#ofr .lane:not(.wide) .i>span:first-child{grid-area:1/1}
#ofr .lane:not(.wide) .i .vt{grid-area:2/1}
#ofr .lane:not(.wide) .i b{grid-area:1/2/3/3;align-self:center}
#ofr .lane .vt{font-size:11px;font-weight:600;color:#46515e}
#ofr .lane.ok .vt{color:#17653a}
#ofr .lane.red .vt{color:#8a2a22}
#ofr .lane.wide .i.tt{grid-template-columns:1fr auto}
#ofr .lane .i b{text-align:right;justify-self:end}
#ofr .lane .cl{display:grid;grid-template-columns:repeat(7,30px);gap:2px;justify-self:center}
#ofr .rt{display:grid;grid-template-columns:96px 104px 104px 92px;gap:10px;justify-self:end;align-items:center}
#ofr .lane.wide .cap.r6 .rt>span{font-size:11px;font-weight:600;text-align:center}
#ofr .lane.wide .cap.r6 .rt>b{font-size:11px;font-weight:600}
#ofr .lane.wide .i.r6{grid-template-columns:205px auto auto minmax(150px,1fr);gap:10px;position:relative}
#ofr .lane.wide .i.r6::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(#cdd3dc,#cdd3dc) 222px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 496px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 602px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 716px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 830px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 932px 0/1px 100% no-repeat}
#ofr .lane.wide .i:not(.cap):not(.tt){font-size:15px;padding:10px 12px}
#ofr .lane.wide .cl{grid-template-columns:repeat(7,36px)}
#ofr .lane.wide .m i{width:18px;height:18px}
#ofr .lane.wide .i.cap .m{font-size:12px}
#ofr .lane.wide .i.cap>span:first-child{font-size:13px}
#ofr .lane.wide .cap.r6 .rt>span, #ofr .lane.wide .cap.r6 .rt>b{font-size:12px}
#ofr .lane.wide .i.r6 .rt>b{justify-self:center;text-align:center}
#ofr .lane.wide .i.r6>.cl{justify-self:center}
#ofr .lane.wide .i.tt.r6{grid-template-columns:205px auto auto minmax(150px,1fr)}
#ofr .lane.wide .cmq{height:30px;font-size:13px;padding:0 8px;border:1.5px solid #c3cad5;border-radius:8px;background:#fff;color:#1d2733;width:100%}
#ofr .lane.wide .cmq:focus{outline:none;border-color:#2a65a0}
#ofr .lane.wide .i.tt.r6>span:nth-child(2){width:264px}
#ofr .lane.wide .i.sep.sep.sep{display:block;grid-template-columns:none;padding:5px 12px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:#f0dcd9!important;color:#8a2a22;border-bottom:1px solid #e3c4c0}
#ofr .lane.wide .i.sep.sepn.sep{background:#dfe4ea!important;color:#46515e;border-bottom:1px solid #cfd5dd}
#ofr .lane.wide .i.r6:not(.cap):not(.tt){padding-top:7px;padding-bottom:7px}
#ofr .lane.wide .cap.r6>span:last-child{text-align:left}
#ofr .lane.wide .i.tt.r6::before{display:none}
#ofr .ac3 .r1.cap1>span:first-child{font-size:12px}
#ofr .ac3 .r1.cap1 b{font-size:12px;font-weight:600}
#ofr .lane.wide .i.cap>span:first-child{font-size:12px}
@media(max-width:1180px){}
#ofr .ac3 .lane.wide{min-width:1100px}
#ofr }
#ofr .nq{position:relative;display:flex;align-items:center;justify-content:center;gap:4px}
#ofr .nbtn{border:1.5px dashed #c0392b;background:#fff;color:#a5281b;border-radius:8px;padding:4px 8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
#ofr .nv{font-size:13px}
#ofr .ned{border:0;background:none;color:#6b7684;cursor:pointer;font-size:13px;padding:0 2px}
#ofr .npop{position:absolute;z-index:30;top:100%;right:0;margin-top:4px;background:#fff;border:1.5px solid #b4bcc8;border-radius:10px;padding:8px;width:216px;display:flex;flex-wrap:wrap;gap:5px;box-shadow:0 4px 14px rgba(0,0,0,.14);text-align:left}
#ofr .npop.up{top:auto;bottom:100%;margin-top:0;margin-bottom:4px}
#ofr .npop button{border:1.5px solid #b4bcc8;background:#f6f8fa;color:#1d2733;border-radius:14px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
#ofr .npop button:hover{background:#dbe8f5}
#ofr .ncal{width:100%;font-size:12px;color:#46515e;display:flex;align-items:center;gap:6px;margin-top:2px}
#ofr .ndt{font:inherit;font-size:12px;border:1.5px solid #b4bcc8;border-radius:8px;padding:2px 4px}
#ofr .lane.wide .cap.r6>span{font-size:11px;font-weight:600;text-align:center}
#ofr .lane.wide .cap.r6>span:first-child{text-align:left}
#ofr .lane.wide .cap.r6>span.cl{text-align:initial}
#ofr .lane.wide .cap.r6>b{font-size:11px;font-weight:600}
#ofr .pq{font-size:12px;font-weight:700;border-radius:12px;padding:3px 8px;justify-self:center;align-self:center;white-space:nowrap;min-width:80px;text-align:center;display:inline-block}
#ofr .pq.h{background:#d63a68;color:#fff}
#ofr .pq.m2{background:#ffe27a;color:#5c4300}
#ofr .pq.l{background:#a9d8f7;color:#08507f}
#ofr .lq, #ofr .nq{text-align:center;font-size:13px}
#ofr .lq.r, #ofr .nq.r{color:#a5281b;font-weight:700}
#ofr .cmpt{color:#17653a;font-size:13px}
#ofr .cmpt.dn{color:#a5281b}
#ofr .lane.wide .i b{font-size:15px}
#ofr .lane.wide .i.tt b{font-size:16px}
#ofr .ac3 .r1 b{font-size:15px}
#ofr .ac3 .tt1 span:last-child{font-size:16px}
#ofr .ac3 .acb span:last-child{font-size:15px}
#ofr .cmpt{font-size:14px}
#ofr .an4{font-size:14px}
#ofr .pl strong{font-size:15px}
#ofr .dc span:not(.tg){font-size:14px}
#ofr .dc .tg{white-space:normal;line-height:1.25;max-width:100%}
#ofr .tot{font-size:14px}
#ofr .lane .m{display:flex;justify-content:center}
#ofr .lane .m i{display:block;width:11px;height:11px;border-radius:50%}
#ofr .lane .m i.o{background:none;border:1.5px solid #bcc5d1}
#ofr .lane .i.cap{font-size:9px;font-weight:700;color:#46515e;padding:6px 12px;background:rgba(255,255,255,.55)}
#ofr .lane .i.cap .m{font-size:10px;font-weight:700}
#ofr .lane .i.cap>span:first-child{font-size:11px;font-weight:600}
#ofr .lane .i.cap b{font-weight:600;font-size:11px}
#ofr .lane.wide .i:not(.cap):not(.tt):nth-child(odd){background:rgba(255,255,255,.45)}
#ofr .lane .i:last-child{border-bottom:0}
#ofr .lane .i.tt{background:#d6dbe3;border-top:2px solid #b4bcc8;border-bottom:0;font-weight:700}
#ofr .lane .i b{font-weight:700;white-space:nowrap}
#ofr .lane.ok{background:#e3f4e8;border-color:#8fcaa3;color:#1d4d2f}
#ofr .lane.ok h4{background:#c3e6cf;color:#17653a}
#ofr .lane.ok .i{border-color:#bfe0cb}
#ofr .pl span.g{background:#dff1e6;border-color:#8fcaa3;color:#17653a}
#ofr .lane.red{background:#fbe8e6;border-color:#e3a9a4;color:#6a1f1f}
#ofr .lane.red h4{background:#f4cbc7;color:#8a2a22}
#ofr .lane.red .i{border-color:#efc4c0}
#ofr .pl span.r{background:#fbe3e0;border-color:#e3a9a4;color:#a5281b}
@media(max-width:600px){}
#ofr }
#ofr .st{font-size:13px;font-weight:600;padding:4px 11px;border-radius:14px;background:#fbefd4;color:#8a5600;white-space:nowrap}
#ofr .st.ok{background:#dff1e6;color:#17653a}
#ofr .ch{font-size:18px;color:var(--muted);transition:transform .15s}
#ofr .qb .ch{flex:none;width:30px;height:30px;border-radius:50%;background:#e4eaf3;border:1px solid #b9c4d4;display:inline-flex;align-items:center;justify-content:center;font-size:0;color:#1d2733}
#ofr .qb .ch svg{display:block;width:16px;height:16px;fill:none}
#ofr .qb:hover .ch{background:#d3deec;border-color:#8fa3bd}
#ofr .qa.open .ch{transform:rotate(180deg)}
#ofr .bx{display:none;padding:2px 14px 14px}
#ofr .qa.open .bx{display:block}
#ofr .tot{font-size:13px;color:#3b5878;background:#eef4fa;border-radius:8px;padding:8px 12px;margin:10px 0 12px}
#ofr .tg{display:inline-block;font-size:12px;font-weight:600;padding:2px 9px;border-radius:10px;white-space:nowrap;margin-top:4px;width:fit-content}
#ofr .tg.w{background:#fbefd4;color:#8a5600}
#ofr .tg.p{background:#dff1e6;color:#17653a}
#ofr .tg.r{background:#fbe3e0;color:#a5281b}
#ofr .pr{display:grid;grid-template-columns:180px minmax(0,1fr);gap:10px;margin-bottom:10px}
#ofr .dc{background:var(--blue-bg);border:1px solid var(--blue-bd);border-radius:12px;padding:12px 14px;color:var(--blue-tx);display:flex;flex-direction:column;justify-content:center;min-width:0}
#ofr .dc b{font-size:15px;font-weight:600;display:block}
#ofr .dc span{font-size:13px;color:#3b5878}
#ofr .ac{background:var(--cream);border:1px solid var(--cream-bd);border-radius:12px;padding:12px;color:var(--cream-tx);min-width:0}
#ofr .lb2{font-size:13px;color:#5a4410;display:block;margin:0 0 4px}
#ofr .lab{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b4e0a;display:block;margin:0 0 6px}
#ofr .in{width:100%;height:42px;border:1.5px solid var(--input-bd);border-radius:10px;padding:0 12px;font:inherit;font-size:15px;background:#fff;color:var(--ink)}
#ofr .in:focus, #ofr .ta:focus{outline:none;border-color:#7d5d12;background:#fffdf5}
#ofr .ta{width:100%;height:60px;border:1.5px solid var(--input-bd);border-radius:10px;padding:9px 12px;font:inherit;font-size:15px;background:#fff;color:var(--ink);resize:none}
#ofr .g2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px}
#ofr .g3{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:10px;margin-top:10px}
#ofr .sg{display:inline-flex;flex-wrap:wrap;border:1.5px solid var(--input-bd);border-radius:10px;overflow:hidden;background:#fff}
#ofr .sg button{border:0;border-right:1px solid #e3cf95;background:#fff;color:var(--cream-tx);font:inherit;font-size:14px;padding:9px 13px;cursor:pointer}
#ofr .sg button:last-child{border-right:0}
#ofr .sg button.on{background:var(--blue);color:#fff}
#ofr .mcs{display:flex;gap:6px;flex-wrap:wrap}
#ofr .mc{border:1.5px solid var(--input-bd);background:#fff;color:var(--cream-tx);border-radius:18px;padding:7px 14px;font:inherit;font-size:14px;cursor:pointer}
#ofr .mc.on{background:var(--blue);border-color:var(--blue);color:#fff}
#ofr .fin{background:var(--cream);border:1px solid var(--cream-bd);border-radius:12px;padding:14px;display:grid;gap:12px;color:var(--cream-tx)}
#ofr .cmt{border-top:1px dashed var(--cream-bd);padding-top:12px}
#ofr .chp{border:1px solid #c9a850;background:#fffaf0;color:#6b4e0a;border-radius:16px;padding:4px 10px;font:inherit;font-size:13px;cursor:pointer}
#ofr .chs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#ofr .ask2{background:var(--cream);border:1px solid var(--cream-bd);border-radius:12px;padding:14px;color:var(--cream-tx);margin-bottom:12px}
#ofr .nm{background:#fff;border:1px solid #d9b95f;border-radius:10px;padding:9px 12px;margin-bottom:12px}
#ofr .nm b{font-size:15px;font-weight:600;display:block}
#ofr .nm span{font-size:13px;color:#6b4e0a}
#ofr .tgl{background:#fff;border:1.5px solid var(--blue-bd);color:#1f4f80;border-radius:10px;padding:9px 14px;font:inherit;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:12px}
#ofr .al{display:none;margin-bottom:12px}
#ofr .al.on{display:block}
#ofr .lst{background:#e9f1f9;border:1px solid var(--blue-bd);border-radius:12px;padding:6px 14px;color:var(--blue-tx)}
#ofr .lst div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid #cfdeee;font-size:14px;align-items:center}
#ofr .lst div:last-child{border-bottom:0}
#ofr .lst b{font-weight:600;white-space:nowrap}
#ofr .br{margin:4px 0 8px}
#ofr .br .l{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--blue-tx);margin-bottom:3px}
#ofr .br .t{height:14px;border-radius:7px;background:#cfdeee;display:flex;overflow:hidden}
#ofr .br .t i{display:block;height:100%}
#ofr .more{font-size:13px;color:var(--blue);margin:0 0 12px}
#ofr .nx{border:2px dashed #b4bcc8;border-radius:14px;padding:14px 16px;color:var(--muted);font-size:14px;background:#fafbfc}
@media(max-width:600px){}
#ofr .qb{flex-wrap:wrap}
#ofr }
@media(prefers-reduced-motion:reduce){#ofr .ch{transition:none}
#ofr }
#ofr .lane.wide.pay .i.r6{grid-template-columns:205px 264px 120px 104px minmax(150px,1fr)}
#ofr .lane.wide.pay .i.r6::before{background:linear-gradient(#cdd3dc,#cdd3dc) 222px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 496px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 626px 0/1px 100% no-repeat,linear-gradient(#cdd3dc,#cdd3dc) 740px 0/1px 100% no-repeat}
#ofr .lane.wide.pay .i.r6>b{justify-self:center;text-align:center}
#ofr .lane.wide.pay .i.cap.r6>span:nth-child(3){text-align:center}
#ofr .lane.wide.pay .i.tt.r6{grid-template-columns:205px 264px 120px 104px minmax(150px,1fr)}
#ofr .lane.wide.pay .i.tt.r6>b{justify-self:center}
#ofr .lane.wide.pay .cl .m{cursor:pointer}
#ofr .lane.wide.pay .cl .m i.o:hover{border-color:#2a65a0}
#ofr .pay .tc{display:flex;justify-content:center}
#ofr .tsel{appearance:none;-webkit-appearance:none;border:1.5px dashed #c0392b;background:#fff;color:#a5281b;border-radius:12px;padding:3px 8px;font:inherit;font-size:12px;font-weight:700;text-align:center;text-align-last:center;cursor:pointer;width:104px;height:26px}
#ofr .tsel.pre{background:#cfe0f3;color:#1b4a7e;border:1.5px solid #cfe0f3}
#ofr .tsel.add{background:#fde7b0;color:#6b4a00;border:1.5px solid #fde7b0}
#ofr .tsel.post{background:#cdebd9;color:#17653a;border:1.5px solid #cdebd9}
#ofr .payw{margin:10px 0 12px}
@media(max-width:1180px){}
#ofr .payw .lane.wide{min-width:930px}
#ofr }
#ofr .plw{margin:10px 0 12px}
#ofr .pl3 h4{font-size:14px}
#ofr .pl3 .pbd{padding:14px 18px 16px;background:#fff}
#ofr .pl3 .pbig{display:flex;gap:30px;flex-wrap:wrap;align-items:flex-end}
#ofr .pl3 .pbig span{display:block;font-size:13px;color:#46515e;margin-bottom:2px}
#ofr .pl3 .pbig b{font-size:26px;font-weight:700;color:#1d2733}
#ofr .pl3 .pbig b.g{color:#2a6b45}
#ofr .pl3 .pbig b.r{color:#a5281b}
#ofr .pl3 .ptr{position:relative;height:22px;background:#e6eaf0;border-radius:6px;margin-top:26px}
#ofr .pl3 .pfl{position:absolute;left:0;top:0;bottom:0;background:#4a8f60;border-radius:6px}
#ofr .pl3 .pmk{position:absolute;top:-6px;bottom:-6px;width:3px;transform:translateX(-1.5px);border-radius:2px}
#ofr .pl3 .pmt{position:absolute;top:-26px;font-size:12.5px;font-weight:700;white-space:nowrap;transform:translateX(-50%)}
#ofr .pl3 .pmt.rr{transform:translateX(-100%)}
#ofr .pl3 .pun{display:flex;justify-content:space-between;font-size:12px;color:#6a7480;margin-top:8px}
#ofr .pl3 .pbig{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:stretch}
#ofr .pl3 .pbig>div{border:1px solid #cfd6de;border-radius:10px;background:#f6f8fa;padding:12px 16px 12px}
#ofr .pl3 .pbig>div:nth-child(2){background:#e3f4e8;border-color:#8fcaa3}
#ofr .pl3 .pbig>div:nth-child(3){background:#fbe8e6;border-color:#e3a9a4}
#ofr .pl3 .pbig span{display:block;font-size:13px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#3a4552;margin-bottom:8px}
#ofr .pl3 .pbig b{display:block;font-size:30px;line-height:1.1}
#ofr .pl3 .ptr{margin-top:34px}
#ofr .plw{margin:6px 0 8px}
#ofr .pl3 h4{padding:6px 12px;font-size:13px}
#ofr .pl3 .pbd{padding:10px 14px 10px}
#ofr .pl3 .pbig{gap:10px}
#ofr .pl3 .pbig>div{padding:7px 12px 8px;border-radius:8px}
#ofr .pl3 .pbig span{font-size:11.5px;margin-bottom:3px}
#ofr .pl3 .pbig b{font-size:22px}
#ofr .pl3 .ptr{margin-top:24px;height:16px}
#ofr .pl3 .pmt{top:-21px;font-size:11.5px}
#ofr .pl3 .pmk{top:-4px;bottom:-4px}
#ofr .pl3 .pun{display:none}
#ofr #b3 .fin{gap:8px;padding:10px 12px}
#ofr #b3 .fin .ta{min-height:0;height:40px;padding:8px 10px}
#ofr #b3 .fin .in{height:36px}
#ofr #b3 .fin .lab{margin-bottom:3px}
#ofr .pl3 .pbd{padding:12px 14px 18px}
#ofr .pl3 .ptr{margin-top:40px;height:26px;border-radius:8px}
#ofr .pl3 .pfl{border-radius:8px}
#ofr .pl3 .pmk{top:-7px;bottom:-7px;width:4px;transform:translateX(-2px)}
#ofr .pl3 .pmt{top:-27px;font-size:13.5px}
@media(max-width:620px){}
#ofr }
#ofr .lane.wide.dbt{background:#fcf4f3;border-color:#e3a9a4}
#ofr .lane.wide.dbt h4{background:#f4cbc7;color:#6a1f1f;font-size:14px}
#ofr .lane.wide.dbt .i.r6, #ofr .lane.wide.dbt .i.tt.r6{grid-template-columns:200px 112px 100px 90px 104px 224px minmax(150px,1fr) 130px;gap:0;padding-left:0;padding-right:0;border-bottom-color:#efd3d0}
#ofr .lane.wide.dbt .i.r6::before{display:none}
#ofr .lane.wide.dbt .i.r6>*{padding:0 9px;border-left:1px solid #e6c9c6;display:flex;align-items:center;justify-content:center;align-self:stretch;min-height:34px;text-align:center}
#ofr .lane.wide.dbt .i.r6>*:first-child{border-left:0;justify-content:flex-start;padding-left:12px}
#ofr .lane.wide.dbt .i.tt.r6>span:nth-child(2){width:auto}
#ofr .lane.wide.dbt .i.tt.r6>b{justify-self:stretch}
#ofr .lane.wide.dbt .cap.r6>span, #ofr .lane.wide.dbt .cap.r6>span:last-child{text-align:center;justify-content:center}
#ofr .lane.wide.dbt .cap.r6>span:first-child{justify-content:flex-start}
#ofr .lane.wide.dbt .i.cap{background:#faf1f0}
#ofr .lane.wide.dbt .dnm{flex-direction:column;align-items:flex-start;justify-content:center}
#ofr .lane.wide.dbt .dnm b{font-size:15px;font-weight:600;text-align:left;white-space:normal}
#ofr .lane.wide.dbt .i.r6>.dnm{position:relative;padding-left:30px}
#ofr .lane.wide.dbt .n4{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-style:normal;font-size:13px;font-weight:700;color:#8a2a22;opacity:.8}
#ofr .lane.wide.dbt .dnm small{font-size:12px;color:#6a7480;font-weight:400}
#ofr .lane.wide.dbt .i.r6>b.sm{justify-self:auto;font-size:15px}
#ofr .lane.wide.dbt .dd{color:#a5281b;font-weight:700;font-size:14px}
#ofr .lane.wide.dbt .i.tt{background:#f4cbc7;border-top:2px solid #e3a9a4;color:#6a1f1f}
#ofr .dpill{border-radius:12px;padding:2px 10px;font-size:11.5px;font-weight:700;white-space:nowrap}
#ofr .dpill.pre{background:#fde7b0;color:#6b4a00}
#ofr .dpill.debt{background:#f4cbc7;color:#8a2a22;border:1px solid #e3a9a4}
#ofr .lane.wide.dbt .i.r6>.dnm{flex-direction:column;align-items:flex-start;justify-content:center;text-align:left}
#ofr .dcm{display:block;width:100%;height:34px;border:1.5px solid #c3cad5;border-radius:8px;padding:0 10px;font:inherit;font-size:13px;background:#fff;color:#1d2733;margin:0 0 4px}
#ofr .dcm:focus{outline:none;border-color:#c0504d}
#ofr .rsn{position:relative;display:inline-flex;align-items:center;width:100%;height:30px;border-radius:15px;border:1.5px solid transparent}
#ofr .rsn .rd{position:absolute;left:10px;width:9px;height:9px;border-radius:50%;pointer-events:none}
#ofr .rsn select{appearance:none;-webkit-appearance:none;background:transparent;border:0;width:100%;height:100%;padding:0 20px 0 26px;font:inherit;font-size:12.5px;font-weight:700;color:inherit;cursor:pointer;text-overflow:ellipsis;outline:none}
#ofr .rsn select:focus-visible{outline:2px solid #2a65a0;outline-offset:1px;border-radius:14px}
#ofr .rsn select option{color:#1d2733;background:#fff;font-weight:600}
#ofr .rsn::after{content:"\\25BE";position:absolute;right:8px;font-size:11px;pointer-events:none}
#ofr .rsn.c1, #ofr .rch.c1{background:#ffe9a8;color:#6b4a00;border-color:#d3b25c}
#ofr .rsn.c2, #ofr .rch.c2{background:#ffd6bd;color:#7a3410;border-color:#e8a374}
#ofr .rsn.c3, #ofr .rch.c3{background:#cfe0f3;color:#1b4a7e;border-color:#a9c3de}
#ofr .rsn.c4, #ofr .rch.c4{background:#c9453f;color:#fff;border-color:#c9453f}
#ofr .rsn.c5, #ofr .rch.c5{background:#e3d6f5;color:#4a2d82;border-color:#c3a9e8}
#ofr .rsn.c0, #ofr .rch.c0{background:#fff;color:#a5281b;border:1.5px dashed #c0392b}
#ofr .rsn.c1 .rd{background:#d3a31f}
#ofr .rsn.c2 .rd{background:#e8833a}
#ofr .rsn.c3 .rd{background:#2a65a0}
#ofr .rsn.c5 .rd{background:#7a4fc0}
#ofr .rsn.c4 .rd, #ofr .rsn.c0 .rd{display:none}
#ofr .rsn.c4 select, #ofr .rsn.c0 select{padding-left:14px}
#ofr .rsum{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
#ofr .rsum .rl{font-size:12px;font-weight:600;color:#46515e;margin-right:2px}
#ofr .rch{font:inherit;font-size:12px;font-weight:600;padding:5px 11px;border-radius:13px;border:1.5px solid transparent;cursor:pointer}
#ofr .rch.off{opacity:.35}
#ofr .rch.rrs{background:#fff;border:1.5px solid #c9d0d8;color:#46515e}
#ofr #mv5.mv5{padding:0;text-align:left;overflow:hidden;font-size:14px}
#ofr #mv5 .mvt{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border:0;background:none;font:inherit;color:#7a2018;cursor:pointer;text-align:left}
#ofr #mv5 .mvt:focus-visible{outline:2px solid #2a65a0;outline-offset:-2px}
#ofr #mv5 .mvg{background:#c9453f;color:#fff;border-radius:11px;padding:2px 10px;font-size:12px;font-weight:700;white-space:nowrap}
#ofr #mv5 .mvs{flex:1;min-width:0}
#ofr #mv5 .mva{font-size:13px;white-space:nowrap}
#ofr #mv5 .mvb[hidden]{display:none}
#ofr #mv5 .mvh{padding:6px 12px 2px;font-size:12px;font-weight:700;color:#a5281b;border-top:1px solid #efc4c0}
#ofr #mv5 .mvr{display:grid;grid-template-columns:minmax(0,1fr) 120px 110px;gap:8px;padding:6px 12px;font-size:14px;align-items:center}
#ofr #mv5 .mvr>:nth-child(n+2){text-align:right}
#ofr #mv5 .mvr.mvc{font-size:11.5px;font-weight:700;color:#a5281b;padding-top:2px;padding-bottom:2px}
#ofr #mv5 .mvr:not(.mvc){border-top:1px solid #efc4c0}
@media(max-width:1180px){}
#ofr }
#ofr .sub{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}
#ofr .lbl{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6a7480;margin-right:4px}
#ofr .cr{border-radius:14px;padding:3px 11px;font-size:14px;font-weight:600;white-space:nowrap}
#ofr .cr.r{background:#fbe3e0;border:1px solid #e3a9a4;color:#a5281b}
#ofr .cr.g{background:#dff1e6;border:1px solid #8fcaa3;color:#17653a}
#ofr .cr.n{background:#eceff3;border:1px solid #c9d0d8;color:#46515e}
#ofr .k1{--gc:#8fcaa3;--gh:#c3e6cf;--gt:#17653a;--gb:#f2faf5}
#ofr .k2{--gc:#d3b25c;--gh:#fde7b0;--gt:#6b4a00;--gb:#fffaf0}
#ofr .k3{--gc:#a9c3de;--gh:#d3e2f2;--gt:#1b3a5e;--gb:#f4f8fc}
#ofr .grp{border:1px solid var(--gc);border-radius:12px;background:var(--gb);overflow:hidden;margin-bottom:10px}
#ofr .grp>h5{margin:0;padding:9px 12px;font-size:14px;font-weight:700;background:var(--gh);color:var(--gt);display:flex;justify-content:space-between;gap:8px}
#ofr .grp>h5 small{font-weight:400;font-size:12.5px}
#ofr .gr{display:grid;gap:8px;align-items:center;padding:7px 12px;border-top:1px solid rgba(0,0,0,.07);font-size:14px}
#ofr .gr.cap{font-size:11.5px;font-weight:700;color:#46515e;background:rgba(255,255,255,.55);border-top:0}
#ofr .cols2{grid-template-columns:minmax(120px,1fr) minmax(84px,.65fr) minmax(144px,.75fr) minmax(176px,1.2fr) minmax(220px,1.6fr) minmax(180px,1.35fr) minmax(116px,.9fr)}
#ofr .cols3{grid-template-columns:150px 120px 190px minmax(0,1fr) 120px}
#ofr .gr input, #ofr .gr select{height:30px;border:1.5px solid #bf9a3e;border-radius:8px;padding:0 8px;font:inherit;font-size:13px;background:#fff;width:100%;color:#1d2733}
#ofr .gr .dtw .dtx{padding-right:30px}
#ofr .dta{background:#dbe8f5;border:1px solid #a9c3de;color:#163456;border-radius:8px;padding:4px 8px;font-size:13px;white-space:nowrap;display:inline-block}
#ofr .tp{font-size:11.5px;font-weight:700;border-radius:10px;padding:2px 8px;white-space:nowrap;width:fit-content}
#ofr .tp.pre{background:#cfe0f3;color:#1b4a7e}
#ofr .tp.post{background:#cdebd9;color:#17653a}
#ofr .sg.s{display:flex;width:100%}
#ofr .sg.s button{flex:1;padding:5px 4px;font-size:12.5px}
#ofr .add{border:1.5px dashed #8aa4c0;border-radius:8px;background:#fff;color:#1f4f80;font:inherit;font-size:13px;font-weight:600;padding:5px 12px;cursor:pointer;width:100%}
#ofr .tot5{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:6px 0 10px}
#ofr .tot5>div{border-radius:10px;padding:8px 12px;border:1px solid #cfd6de;background:#f6f8fa;font-size:12px;font-weight:700;color:#46515e;text-transform:uppercase;letter-spacing:.03em}
#ofr .tot5 i{display:block;font-style:normal;font-size:12px;font-weight:600;text-transform:none;letter-spacing:0;margin-top:2px;color:#46515e}
#ofr .tot5 i.mini{font-size:10.5px;font-weight:500;color:#6a7480}
#ofr .tot5 .thr{font-weight:700}
#ofr .tot5 .thr.ok{color:#17653a}
#ofr .tot5 .thr.no{color:#a5281b}
#ofr .tot5 b{display:block;font-size:22px;color:#1d2733;text-transform:none;letter-spacing:0;margin-top:2px}
#ofr .tot5 .a{background:#e3f4e8;border-color:#8fcaa3}
#ofr .tot5 .b{background:#fff0c8;border-color:#d3b25c}
#ofr .tot5 .c{background:#f1f3f6;border:1px dashed #aab3bd}
#ofr .tot5 .d{background:#dbe8f5;border-color:#2a65a0}
#ofr .real{display:grid;grid-template-columns:200px 1fr;gap:10px;align-items:center}
#ofr .p5w{overflow-x:auto}
#ofr .cols1{grid-template-columns:minmax(120px,1fr) minmax(84px,.65fr) minmax(144px,.75fr) minmax(176px,1.2fr) minmax(220px,1.6fr) minmax(180px,1.35fr) minmax(116px,.9fr)}
#ofr .cols1 .bs{display:flex;flex-direction:column;gap:2px;align-items:flex-start}
#ofr .cols1 .bs small{font-size:12px;color:#46515e}
#ofr .cols1 .sg.ac{flex-wrap:nowrap;align-self:center;padding:0}
#ofr .cols1 .sg.ac button{font-size:11.5px;padding:6px 2px;white-space:nowrap}
#ofr .cols1 .due{display:flex;flex-direction:column;gap:3px;align-items:flex-start;font-size:13.5px;color:#1d2733}
#ofr .stc{display:inline-block;border-radius:12px;padding:2px 9px;font-size:12px;font-weight:700;white-space:nowrap;border:1px solid transparent}
#ofr .stc.ok{background:#e3f4e8;color:#17653a;border-color:#8fcaa3}
#ofr .stc.w{background:#ffe9a8;color:#6b4a00;border-color:#d3b25c}
#ofr .stc.u{background:#dbe8f5;color:#1b4a7e;border-color:#a9c3de}
#ofr .stc.n{background:#eceff3;color:#46515e;border-color:#c9d0d8;font-weight:600}
#ofr .mv5{border:1px solid #e3a9a4;background:#fbe3e0;color:#7a2018;border-radius:10px;padding:8px 12px;font-size:13.5px;margin:0 0 10px}
#ofr .mv5 small{display:block;color:#a5281b;font-size:12px;margin-top:2px}
#ofr .cols1 .tp{font-size:12.5px;padding:3px 7px}
#ofr .cols1 .bs .lb5{font-size:12px;color:#46515e;white-space:nowrap}
#ofr .cols1 .bs .dtw{width:128px}
#ofr .stw{position:relative;display:inline-block}
#ofr .stw::after{content:"\\25BE";position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:11px;color:#46515e;pointer-events:none}
#ofr .stg{appearance:none;-webkit-appearance:none;border:0;background:transparent;font:inherit;font-size:12px;color:#46515e;padding:0 14px 0 0;cursor:pointer;text-align:center;text-align-last:center;outline:none}
#ofr .gr select.stg{border:0;height:auto;width:auto;background:transparent;padding:0 14px 0 0;border-radius:0}
#ofr .stg:focus-visible{outline:2px solid #2a65a0;border-radius:4px}
#ofr .cols1 .due .stc{background:none;border:0;padding:0;font-size:12.5px;font-weight:600}
#ofr .cols1 .due .stc.ok{color:#17653a}
#ofr .cols1 .due .stc.w{color:#8a5a00}
#ofr .cols1 .due .stc.w.last{color:#c0262d}
#ofr .cols1 .due .stc.u{color:#1b4a7e}
#ofr [data-tip]{cursor:help}
#ofr .inf{font-style:normal;color:#6a7480;font-size:12px}
#ofr .p5w .gr>.c>.due{flex:1;width:100%;justify-content:center}
#ofr #tip5{position:fixed;z-index:99;max-width:270px;background:#1d2733;color:#fff;font-size:12.5px;line-height:1.4;padding:8px 11px;border-radius:8px;pointer-events:none;box-shadow:0 4px 14px rgba(0,0,0,.25);display:none;text-align:left;font-weight:400;text-transform:none;letter-spacing:0}
#ofr .kpd{display:flex;flex-direction:column;align-items:center;gap:2px}
#ofr .dt5{font-size:14px;cursor:pointer}
#ofr .dt5.ph{font-weight:400;color:#9aa3ad}
#ofr .kpd small{font-size:12px;color:#5b6572}
#ofr .kpd .dtw{width:124px}
#ofr .rl5{font-size:12.5px;color:#5b6572;line-height:1.45;margin:2px 2px 12px}
#ofr .p5w .grp{min-width:1130px}
#ofr .amt{font-size:15px;font-weight:700;color:#000}
#ofr .p5w .gr{gap:0;padding:0 6px;align-items:stretch}
#ofr .p5w .gr>.c{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:7px 8px;border-left:1px solid rgba(0,0,0,.16);min-width:0}
#ofr .p5w .gr>.c:first-child{border-left:0}
#ofr .p5w .sg.s{flex-wrap:nowrap}
#ofr .p5w .sg.s button{white-space:nowrap}
#ofr .p5w .gr>.c>.dtw, #ofr .p5w .gr>.c>.sg, #ofr .p5w .gr>.c>input{width:100%}
#ofr .p5w .gr>.c .dtx{text-align:center;padding:0 26px 0 6px}
#ofr .p5w .gr>.c>input{text-align:center}
#ofr .cols1 .bs, #ofr .cols1 .due{align-items:center}
#ofr .p5w .grp>h5{justify-content:center;gap:28px}
#ofr .tot5>div{text-align:center}
#ofr #st5{justify-content:center}
#ofr .mv5{text-align:center}
#ofr .rl5{text-align:center}
#ofr .real .lb2{display:block;text-align:center}
#ofr .real input{text-align:center}
@media(max-width:700px){}
#ofr .real{grid-template-columns:1fr}
#ofr }
#ofr .tp{border:1px solid transparent}
#ofr .tp.pre{background:#e4e7ec;color:#3f4652;border-color:#e4e7ec}
#ofr .tp.post{background:#fff;color:#3f4652;border-color:#aab3c0}
#ofr .cols1 .stw{display:inline-block}
#ofr .cols1 .stw::after{right:8px;font-size:12px;color:#2a65a0}
#ofr .gr select.stg{border:1.5px solid #9fb3cc;background:#fff;border-radius:8px;height:26px;padding:0 24px 0 9px;font-size:12px;font-weight:600;color:#1b3a5e;text-align:left;text-align-last:left;cursor:pointer}
#ofr .gr select.stg:hover{border-color:#2a65a0}
#ofr .cols1 .bs .lb5{font-size:12px;font-weight:600;color:#6a7480;height:26px;display:inline-flex;align-items:center}
#ofr .cols1 .bs .dta{font-weight:700;font-size:13.5px;padding:3px 12px}
#ofr .seg5{display:inline-flex;border:1px solid #a9c3de;border-radius:8px;overflow:hidden;font-size:12px;line-height:1.2;cursor:default}
#ofr .seg5 .sa{background:#dbe8f5;color:#1b3a5e;font-weight:600;padding:4px 9px;text-align:center}
#ofr .seg5 .sb{background:#fff;color:#1d2733;font-weight:700;font-size:13.5px;padding:0 10px;display:flex;align-items:center;white-space:nowrap}
#ofr .crm5{display:inline-block;font-size:10.5px;font-weight:700;color:#1b4a7e;background:#dbe8f5;border-radius:6px;padding:1px 5px;vertical-align:1px}
#ofr .seg5{border-color:#c3cbd6}
#ofr .seg5 .sa.ev-d{background:#e6e9f2;color:#3c4660}
#ofr .seg5 .sa.ev-s{background:#e2f0e7;color:#25603d}
#ofr .seg5 .sa.ev-o{background:#fbeccb;color:#7a5300}
#ofr .seg5 .sa{width:84px;box-sizing:border-box;padding-left:4px;padding-right:4px}
#ofr input.miss, #ofr select.miss, #ofr textarea.miss{border-color:#d63a3a!important;background:#fff1f0!important}
#ofr .pick{font-size:12.5px;font-weight:600;color:#1f4f80;margin:0 0 6px}
#ofr .pick.off{visibility:hidden}
#ofr .mcs.miss .mc{border:1.5px dashed #2a65a0;background:#f2f7fd;color:#1b3a5e}
#ofr .mcs.miss .mc:hover, #ofr .sg.miss button:hover{background:#dbe8f5}
#ofr .sg.miss:not(.sc10){border:1.5px dashed #2a65a0}
#ofr .sg.miss:not(.sc10) button{background:#f2f7fd;color:#1b3a5e}
#ofr .sg.sc10.miss button{border:1.5px dashed #2a65a0;background:#f2f7fd;color:#1b3a5e}
#ofr .p5w .sg.s button.on{font-weight:700}
#ofr .p5w .sg.s button[data-p=h].on{background:#cdebd9;color:#17653a}
#ofr .p5w .sg.s button[data-p=m].on{background:#ffe9a8;color:#6b4a00}
#ofr .p5w .sg.s button[data-p=l].on{background:#dfe3ea;color:#46515e}
#ofr .tp.pre{background:#ebe3f8;color:#51398a;border-color:#d3c4ee}
#ofr .tp.post{background:#d6eef3;color:#12596d;border-color:#b3dce6}
#ofr .kps{display:inline-block;font-size:11.5px;font-weight:700;border-radius:10px;padding:1px 8px;line-height:1.25;text-align:center;max-width:100%;border:1px solid transparent}
#ofr .kps.ok{background:#fff;color:#46515e;border-color:#cfd6de}
#ofr .kps.w{background:#ffe9a8;color:#6b4a00;border-color:#d3b25c}
#ofr .kps.r{background:#fbe3e0;color:#a5281b;border-color:#e3a9a4}
#ofr .kpg{display:inline-flex;border:1px solid #c3cbd6;border-radius:8px;overflow:hidden;font-size:11.5px;line-height:1.2;cursor:default}
#ofr .kpg .ka{width:68px;box-sizing:border-box;padding:3px 4px;text-align:center;font-weight:600}
#ofr .kpg .kb{background:#fff;color:#1d2733;font-weight:700;font-size:13px;padding:0 8px;display:flex;align-items:center;justify-content:center;min-width:44px;white-space:nowrap}
#ofr .kpg-r .ka{background:#fbe3e0;color:#a5281b}
#ofr .kpg-w .ka{background:#ffe9a8;color:#6b4a00}
#ofr .kpg-o .ka{background:#eceff3;color:#46515e}
#ofr .kpg .ka{width:80px;padding:4px 8px;font-size:11px}
#ofr .kpg .kb{min-width:38px;padding:0 6px;font-size:12.5px}
#ofr .kpg .ka, #ofr .kpg .kb{border:0!important;border-radius:0!important}
#ofr .kpg .kb{border-left:1px solid #c3cbd6!important}
#ofr .cs4{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.5fr) minmax(0,1.5fr) 150px;gap:8px;align-items:end;margin-bottom:10px}
#ofr .cs4 .sg{width:100%}
#ofr .cs4 .sg button{flex:1}
@media(max-width:700px){}
#ofr .sg.sc10{display:flex;flex-wrap:wrap;align-items:center;gap:6px;border:0;background:none;overflow:visible;border-radius:10px}
#ofr .sg.sc10 button{width:44px;height:36px;padding:0;border:1.5px solid var(--input-bd);border-radius:10px;background:#fff;font:inherit;font-size:15px;font-weight:600;color:var(--ink)}
#ofr .sg.sc10 button.on{background:var(--blue);border-color:var(--blue);color:#fff}
#ofr .sg.sc10 .se{font-size:12.5px;color:#7a6a3a;margin:0 6px}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .fin{background:#fff;border-color:#c9ced6;color:#232a34}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .lb2{color:#232a34}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .lb2 small, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .se{color:#66707d}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .mc{border-color:#aab2bd;color:#232a34}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .mc.on{border-color:var(--blue);color:#fff}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg:not(.sc10){border-color:#aab2bd}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg:not(.sc10) button{border-right-color:#e1e5ea;color:#232a34}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg:not(.sc10) button.on{color:#fff}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.sc10 button{border-color:#aab2bd;color:#232a34}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.sc10 button.on{border-color:var(--blue);color:#fff}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .in, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .ta{border-color:#aab2bd}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .in:focus, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .ta:focus{border-color:#2a65a0;background:#fff}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .mcs.miss .mc, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.sc10.miss button{border:1.5px dashed #8a94a2;background:#f6f7f9;color:#232a34}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.miss:not(.sc10){border:1.5px dashed #8a94a2}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.miss:not(.sc10) button{background:#f6f7f9;color:#232a34}
#ofr #b10 .fin{counter-reset:q;gap:10px}
#ofr #b10 .fin>div{background:#f3f5f8;border:1px solid #dde2e8;border-radius:10px;padding:12px}
#ofr #b10 .fin>div>.lb2{counter-increment:q;display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:10px}
#ofr #b10 .fin>div>.lb2::before{content:counter(q);flex:none;width:22px;height:22px;border-radius:6px;background:#5b6675;color:#fff;font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
#ofr #b10 .lb2 small{font-weight:400}
#ofr #b10 .mcs.miss .mc, #ofr #b10 .sg.sc10.miss button{background:#fff}
#ofr #b10 .mcs .mc:not(.on):not(:hover){background:#fff}
#ofr #p11:empty{display:none}
#ofr #b12 .sg{display:flex;width:100%}
#ofr #b12 .sg button{flex:1;padding:9px 6px;white-space:nowrap}
#ofr #p11 .pr11{background:#f3f5f8;border:1px solid #dde2e8;border-radius:10px;padding:12px;margin-bottom:8px}
#ofr #p11 .pr11:last-child{margin-bottom:0}
#ofr #p11 .pr11>.lb2{font-weight:600;margin-bottom:8px}
#ofr #p11 .pr11>.lb2 small{font-weight:400}
#ofr #p11 .r11{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
#ofr #p11 .r11 .sg button{font-size:13px;padding:8px 12px;white-space:nowrap}
#ofr #b11 .mcs .mc:not(.on):not(:hover){background:#fff}
#ofr #b11 .mcs.miss .mc{background:#fff}
@media(max-width:600px){}
#ofr }
#ofr .loop5{background:var(--zbg);border:1px solid var(--zb);border-left:6px solid var(--zc);border-radius:12px;padding:12px 14px 14px;margin:0 0 20px}
#ofr .lh5{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;color:#1d2733;font-size:14px}
#ofr .ex5{font-size:11px;color:#6a7480;background:#fff;border:1px solid #c9d0d8;border-radius:10px;padding:1px 8px}
#ofr .k5{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#ofr .col5{border-radius:9px;padding:6px 8px;border:1px solid}
#ofr .col5.ok5{background:#e3f4e8;border-color:#a8d5b9;--st:#17653a}
#ofr .col5.wk5{background:#fff0c8;border-color:#e3c97a;--st:#6b4a00}
#ofr .ct5{font-size:12px;font-weight:600;color:var(--st);margin:0 0 4px;display:flex;justify-content:space-between;line-height:1.2}
#ofr .it5{background:#fff;border-radius:7px;padding:4px 8px;font-size:13px;line-height:1.3;border:1px solid #e2e6eb;color:#1d2733;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#ofr .col5.nw5{background:#fff;border-color:#bfb0da;--st:#4a3a7a;display:flex;flex-direction:column}
#ofr .col5.nw5 .ta{flex:1;min-height:92px;width:100%;box-sizing:border-box;resize:vertical}
#ofr .col5.st5b{background:#f6f8fa;border-color:#d5dbe2;display:flex;flex-direction:column;gap:8px}
#ofr .col5.st5b .hd5{color:#1d2733;font-size:13px;margin:0}
#ofr .sub5{border-radius:8px;padding:5px 7px;border:1px solid}
#ofr .sub5.ok5{background:#e3f4e8;border-color:#a8d5b9;--st:#17653a}
#ofr .sub5.wk5{background:#fff0c8;border-color:#e3c97a;--st:#6b4a00}
@media(max-width:560px){}
#ofr }
#ofr .it5 em{font-style:normal;font-size:11.5px;color:var(--st);font-weight:600;white-space:nowrap}
@media(max-width:600px){}
#ofr }
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13){background:var(--zbg);padding:12px 14px 14px}
#ofr :is(#b11, #ofr #b12, #ofr #b13) .fin{background:#fff;border:1.5px solid #bfb0da;border-radius:12px;padding:14px;box-shadow:0 1px 2px rgba(60,40,110,.08)}
#ofr #b10 .fin{background:transparent;border:0;padding:0}
#ofr #b10 .fin>div{background:#fff;border:1.5px solid #bfb0da;box-shadow:0 1px 2px rgba(60,40,110,.08)}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .lb2{color:#1d2733;font-weight:600;font-size:14px}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .lb2 small, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .se{color:#4f5a68;font-weight:400}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .mc{border:1.5px solid #7f8a99;background:#fff;color:#1d2733}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .mc.on{background:var(--blue);border-color:var(--blue);color:#fff}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .mcs.miss .mc{border:1.5px dashed #5f6b7b;background:#fff;color:#1d2733}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.sc10 button{border:1.5px solid #7f8a99;background:#fff;color:#1d2733}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.sc10 button.on{background:var(--blue);border-color:var(--blue);color:#fff}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.sc10.miss button{border:1.5px dashed #5f6b7b;background:#fff;color:#1d2733}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg:not(.sc10){border-color:#7f8a99}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .sg.miss:not(.sc10){border:1.5px dashed #5f6b7b}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .in, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .ta{border-color:#7f8a99}
#ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .in::placeholder, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13) .ta::placeholder{color:#6b7684}
#ofr .zn .qa{border-top-color:var(--zb);border-right-color:var(--zb);border-bottom-color:var(--zb)}
#ofr .zn .qa .qb{background:var(--zh);background:color-mix(in srgb,var(--zh) 65%,#fff)}
#ofr .zn .qa .qb b{color:var(--zt)}
#ofr .zn .qa.open .qb{border-bottom:1px solid var(--zb)}
#ofr .zn .qa .bx{background:var(--zbg);padding:12px 14px 14px}
#ofr #m10 .ex10{margin-top:8px}
#ofr #m10 .ex10:first-child{margin-top:0}
#ofr .zn .qa{margin-bottom:20px}
#ofr .zn .qa:last-child{margin-bottom:0}
#ofr .zn{margin-bottom:30px}
#ofr .zn .zi{background:#fff;padding:16px 14px}
#ofr .rsn.c6, #ofr .rch.c6{background:#d3eee9;color:#0f5c52;border-color:#9fd5cb}
#ofr .rsn.c6 .rd{background:#2a9d8f}
#ofr #m10 .chn{display:block;font-size:12.5px;font-weight:600;color:#4a4066;margin:0 0 3px}
#ofr #b12 .fin{background:transparent;border:0;padding:0;gap:10px;box-shadow:none}
#ofr #b12 .fin>div:not(.g2), #ofr #b12 .fin>.g2>div{background:#fff;border:1.5px solid #bfb0da;border-radius:10px;padding:12px;box-shadow:0 1px 2px rgba(60,40,110,.08)}
#ofr #b12 .fin>.g2{gap:10px;align-items:start}
#ofr #b12 .sg button{white-space:normal;line-height:1.2;padding:8px 6px}
#ofr #b12 .sg button:nth-child(3){flex:1.6}
#ofr #b12 .fin>.g2{align-items:stretch}
#ofr #b12 .fin>.g2>div.col{background:transparent;border:0;padding:0;box-shadow:none;display:grid;gap:10px;grid-template-rows:auto 1fr}
#ofr #b12 .col>div{background:#fff;border:1.5px solid #bfb0da;border-radius:10px;padding:12px;box-shadow:0 1px 2px rgba(60,40,110,.08)}
#ofr #b12 .grow{display:flex;flex-direction:column}
#ofr #b12 .grow .ta{flex:1;min-height:90px;resize:none}
#ofr #b12 .mcs .mc{flex:1 1 auto;text-align:center}
#ofr #b12 .fin>.priv{display:flex;align-items:center;gap:10px;border-left:5px solid #7a4fc0;background:#f7f3fd;font-size:14px;line-height:1.4;color:#2a1a52}
#ofr #b12 .priv .pl2{display:inline-flex;flex:none}
#ofr #b12 .fin>.priv.stk{flex-direction:column;align-items:stretch;gap:8px}
#ofr #b12 .prow{display:flex;align-items:center;gap:10px}
#ofr #b12 .vwho{display:grid;grid-template-columns:1fr 1.3fr;gap:10px;margin-left:32px}
#ofr #b12 .vwho>div{border-radius:8px;padding:6px 10px;font-size:13px;line-height:1.35}
#ofr #b12 .vy{background:#e3f4e8;color:#17653a}
#ofr #b12 .vn{background:#fbe3e0;color:#a5281b}
@media(max-width:600px){}
#ofr }
#ofr #b13 .fin{background:transparent;border:0;padding:0;gap:10px;box-shadow:none}
#ofr #b13 .fin>div{background:#fff;border:1.5px solid #bfb0da;border-radius:10px;padding:12px;box-shadow:0 1px 2px rgba(60,40,110,.08)}
#ofr #b13 .wch{margin-top:8px}
#ofr #b13 .wch:first-child{margin-top:0}
#ofr #b13 .lb3{display:block;font-size:12.5px;font-weight:700;color:#4a2d82;margin:0 0 4px}
#ofr .rsn.c7, #ofr .rch.c7{background:#e4e8ed;color:#46515e;border-color:#c9d0d8}
#ofr .rsn.c7 .rd{background:#6a7480}
#ofr .lane.wide.dbt .drow .rown{width:100%}
#ofr .tw{overflow-x:auto;margin-bottom:10px}
#ofr .tb{min-width:1010px;border:1px solid var(--blue-bd);border-radius:12px;overflow:hidden;background:#fff}
#ofr .tb .tr{display:grid;grid-template-columns:var(--c);align-items:stretch;border-top:1px solid #d6e0ec}
#ofr .tb .tr:first-child{border-top:0}
#ofr .tb .tr>div{padding:8px 10px;display:flex;flex-direction:column;justify-content:center;gap:4px;border-left:1px solid #e1e8f0;min-width:0}
#ofr .tb .tr>div:first-child{border-left:0}
#ofr .tb .cap{background:#e9f0f8;font-size:12px;font-weight:700;color:#3a4a5e}
#ofr .tb .cap>div{padding:7px 10px;text-align:center;align-items:center}
#ofr .tb .cm{background:#f2f7fc;color:var(--blue-tx)}
#ofr .tb .an{background:var(--cream)}
#ofr .tb .cm b{font-size:14.5px;color:#1d2733}
#ofr .tb .cm small{font-size:12.5px;color:#3b5878}
#ofr .tb .in, #ofr .tb select.in{height:34px;font-size:13px;padding:0 8px}
#ofr .tb .an .in{width:100%}
#ofr .fc{display:inline-block;font-size:12.5px;font-weight:700;border-radius:12px;padding:2px 10px;background:#fff;border:1px solid var(--blue-bd);color:#163456;width:fit-content}
#ofr .fc.r{background:#fbe3e0;border-color:#e3a9a4;color:#a5281b}
#ofr .fc.w{background:#ffe9a8;border-color:#d3b25c;color:#6b4a00}
#ofr .fc.g{background:#dff1e6;border-color:#8fcaa3;color:#17653a}
#ofr .crmbar{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:8px;margin-bottom:10px}
#ofr .crmbar>div{background:var(--blue-bg);border:1px solid var(--blue-bd);border-radius:10px;padding:8px 12px;color:var(--blue-tx);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
#ofr .crmbar b{display:block;font-size:22px;text-transform:none;letter-spacing:0;margin-top:2px;color:#1d2733}
#ofr .crmbar small{display:block;font-size:12px;font-weight:600;text-transform:none;letter-spacing:0;color:#46515e;margin-top:1px}
#ofr .crmbar .g{background:#e3f4e8;border-color:#8fcaa3}
#ofr .crmbar .w{background:#fff0c8;border-color:#d3b25c}
#ofr .crmbar .r{background:#fbe8e6;border-color:#e3a9a4}
#ofr .crmbar .kv{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:13px;font-weight:600;text-transform:none;letter-spacing:0;color:#3a4a5e;border-top:1px solid rgba(0,0,0,.1);padding:3px 0 0;margin-top:5px}
#ofr .crmbar .kv b{display:inline;font-size:15px;margin:0;color:#1d2733}
#ofr .src{font-size:12.5px;color:#4f5f72;margin:0 0 8px}
#ofr .okl{background:#e3f4e8;border:1px solid #8fcaa3;color:#17653a;border-radius:10px;padding:8px 12px;font-size:13.5px;font-weight:600;margin:0 0 10px}
#ofr .dyn{display:grid;gap:8px}
#ofr .q3r{display:grid;grid-template-columns:minmax(0,2.2fr) 110px minmax(0,1.2fr);gap:8px;align-items:center}
#ofr .q3r .in{height:38px}
#ofr .nx2{background:#fff8e6;border:1px solid #e3c97a;border-radius:10px;padding:9px 12px;font-size:13.5px;color:#5a4410;margin:0 0 10px}
#ofr .two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
#ofr .bx2{background:#fff;border:1px solid var(--blue-bd);border-radius:12px;padding:10px 12px}
#ofr .nov1{margin:-2px 0 8px;font-size:13.5px;color:#3a4a5e}
#ofr .nov1 b{font-size:15px;color:#1d2733}
#ofr .bx2 h6{margin:0 0 8px;font-size:12.5px;font-weight:700;color:#3a4a5e;text-transform:uppercase;letter-spacing:.03em}
#ofr .brl{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(60px,1fr) 88px;gap:12px;align-items:center;font-size:13.5px;line-height:1.25;padding:4px 0;border-top:1px solid #e1e8f0}
#ofr .brl:first-of-type{border-top:0}
#ofr .brl i{display:block;height:10px;border-radius:5px;background:#cfdeee;position:relative;overflow:hidden}
#ofr .brl i u{position:absolute;left:0;top:0;bottom:0;background:#2a65a0;border-radius:5px}
#ofr .brl b{text-align:right;font-size:13.5px;white-space:nowrap}
#ofr .brl span{text-align:left}
#ofr .dq{background:#fbe8e6;border:1px solid #e3a9a4;border-radius:10px;padding:9px 12px;color:#7a2018;font-size:13.5px;margin-bottom:10px}
#ofr .dq b{font-weight:700}
#ofr .t3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:10px;margin-bottom:10px}
#ofr .t3>div{border-radius:12px;padding:12px 14px;border:1px solid;min-height:160px}
#ofr .t3 .k-b{background:#e8f0f9;border-color:#a9c3de;color:#1b3a5e}
#ofr .t3 .k-g{background:#e3f4e8;border-color:#8fcaa3;color:#17653a}
#ofr .t3 .k-y{background:#fff4d2;border-color:#d3b25c;color:#6b4a00}
#ofr .t3 .big{display:flex;align-items:center;gap:12px;margin:0 0 8px}
#ofr .t3 .big b{font-size:34px;font-weight:700;line-height:1;color:#1d2733}
#ofr .t3 .big p{margin:0;font-size:13.5px;font-weight:700;line-height:1.25}
#ofr .t3 .lst3{background:rgba(255,255,255,.72);border-radius:8px;overflow:hidden}
#ofr .t3 .r, #ofr .t3 .cp{display:grid;grid-template-columns:58px minmax(0,1fr) 108px;align-items:stretch;font-size:13.5px;line-height:1.3;color:#1d2733}
#ofr .t3 .c4 .r, #ofr .t3 .c4 .cp{grid-template-columns:54px minmax(0,1fr) 66px 92px}
#ofr .t3 .c4 .r span:nth-child(2){font-size:13px;padding-left:7px;padding-right:2px}
#ofr .t3 .c4 .r em{font-size:12px;white-space:normal;line-height:1.2}
#ofr .t3 .c4b .r, #ofr .t3 .c4b .cp{grid-template-columns:58px minmax(0,1fr) 72px 72px}
#ofr .t3 .r>*, #ofr .t3 .cp>*{padding:6px 6px;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center}
#ofr .t3 .r>span:nth-child(2){justify-content:flex-start;text-align:left;padding-left:9px}
#ofr .t3 .r>*+*, #ofr .t3 .cp>*+*{border-left:1px solid rgba(0,0,0,.14)}
#ofr .t3 .r{border-top:1px solid rgba(0,0,0,.08)}
#ofr .t3 .cp{background:rgba(0,0,0,.05);font-size:11.5px;font-weight:700;color:#46515e}
#ofr .t3 .cp>*{padding:3px 6px;font-size:11px;white-space:nowrap}
#ofr .t3 .cp>*:nth-child(2){justify-content:center;text-align:center;padding-left:6px}
#ofr .t3 .r i{font-style:normal;font-weight:700;font-size:15px}
#ofr .t3 .r span{color:#1d2733;font-weight:600}
#ofr .t3 .r .ok{display:block;text-align:left;color:#17653a;font-weight:600;grid-column:1/-1;border-left:0}
#ofr .t3 .r em{font-style:normal;font-size:12.5px;color:#3a4a5e;white-space:nowrap}
#ofr .t3 .r u{text-decoration:none;font-size:12.5px;font-weight:700;white-space:nowrap}
#ofr .t3 .r u.n1{color:#46515e}
#ofr .t3 .r u.r1{color:#a5281b}
#ofr .t3 .r u.w1{color:#8a5a00}
#ofr .tb .pj, #ofr .tb .pw{background:#f2f7fc;align-items:center;text-align:center}
#ofr .tb .pj b{font-size:15px;font-weight:700;color:#1d2733}
#ofr .tb .pc2{background:#f2f7fc;align-items:center;text-align:center}
#ofr .tb .pc2 b{font-size:13.5px;font-weight:600;color:#1d2733}
#ofr .tb .pw em{font-style:normal;font-size:12.5px;color:#3a4a5e;white-space:normal;line-height:1.2}
#ofr .tb .pw .wk{justify-content:center;margin:0}
#ofr .tb .cm .scell{text-align:center}
#ofr .tb .cm .scell b.pd{align-self:center}
#ofr .tb .cm.s3{padding:6px 8px}
#ofr .sc3{display:flex;gap:8px;align-items:stretch;width:100%}
#ofr .sc3>i{display:none}
#ofr .sc3.w>i{background:#8a5a00}
#ofr .sc3>div{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center}
#ofr .sc3 .bg3{font-size:22px;font-weight:700;line-height:1}
#ofr .sc3 .bg3 small{font-size:12px;font-weight:400;color:#46515e}
#ofr .sc3 .bg3.sm{font-size:15px}
#ofr .sc3 .bg3.r, #ofr .sc3 .bd3.r{color:#a5281b}
#ofr .sc3 .bg3.w, #ofr .sc3 .bd3.w{color:#8a5a00}
#ofr .sc3 .bd3{font-size:12px;font-weight:700;border-radius:8px;padding:0 8px}
#ofr .sc3 .bd3.r{background:#fbe3e0}
#ofr .sc3 .bd3.w{background:#ffe9a8}
#ofr .sc3>div>small{font-size:12px;color:#46515e}
#ofr .pcell{display:flex;align-items:center;gap:10px}
#ofr .pcell .pn{flex:none;background:#fff;border:1px solid var(--blue-bd);border-radius:8px;padding:4px 8px;font-size:15px;font-weight:700;color:#1d2733;min-width:46px;text-align:center}
#ofr .pcell .pu{min-width:0}
#ofr .pcell .pu b{display:block;font-size:14.5px;font-weight:700;color:#1d2733;line-height:1.2}
#ofr .pcell .pu b.nn{font-weight:600;color:#6a7480;font-style:italic}
#ofr .pcell .pu small{display:block;font-size:12.5px;color:#46515e;margin-top:1px}
#ofr .wk{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
#ofr .wk i{font-style:normal;font-size:11.5px;font-weight:700;background:#fff;border:1px solid #b9c9dc;color:#1b3a5e;border-radius:8px;padding:0 7px}
#ofr .scell b.pd{display:inline-block;font-size:14px;font-weight:700;border-radius:10px;padding:2px 10px;width:fit-content}
#ofr .scell b.pd.r{background:#fbe3e0;color:#a5281b;border:1px solid #e3a9a4}
#ofr .scell b.pd.w{background:#ffe9a8;color:#6b4a00;border:1px solid #d3b25c}
#ofr .scell small{display:block;font-size:12.5px;color:#46515e;line-height:1.3}
#ofr .scell small em{font-style:normal;font-weight:700;color:#a5281b}
#ofr .t3 .ft{margin:8px 0 0;font-size:12.5px;color:#46515e}
#ofr .t3 .ft b{font-weight:700;color:#1d2733}
#ofr [data-q="1"] .t3>div{display:flex;flex-direction:column}
#ofr [data-q="1"] .t3 .ft{margin-top:auto;padding-top:8px;text-align:left;align-self:flex-start}
@media(max-width:700px){}
@media(max-width:700px){#ofr .crmbar,#ofr .two,#ofr .q3r{grid-template-columns:1fr 1fr}
#ofr .q3r{grid-template-columns:1fr}
#ofr .two{grid-template-columns:1fr}
#ofr .brl{grid-template-columns:minmax(0,1.2fr) minmax(40px,.8fr) 84px;gap:8px}
#ofr }
#ofr .s3 .bo4{display:flex;flex-direction:column;gap:3px;align-items:stretch;width:100%;cursor:help}
#ofr .s3 .sg4{display:flex;border:1px solid #c3cbd6;border-radius:7px;overflow:hidden;background:#fff;min-height:26px}
#ofr .s3 .sa4{width:66px;flex:none;font-size:10.5px;font-weight:600;line-height:1.15;padding:2px 4px;display:flex;align-items:center;justify-content:center;text-align:center;white-space:normal;background:#e6e9f2;color:#3c4660}
#ofr .s3 .sb4{flex:1;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#1d2733;white-space:nowrap;padding:0 4px;border-left:1px solid #c3cbd6}
#ofr .s3 .sg4.lt4{min-height:22px;border-color:#e3a9a4}
#ofr .s3 .lt4 .sa4{background:#fbe3e0;color:#a5281b}
#ofr .s3 .lt4 .sb4{color:#a5281b;border-left-color:#e3a9a4}
#ofr .s3 .sg4.lt4.w4{border-color:#e8cf86}
#ofr .s3 .lt4.w4 .sa4{background:#fbeccb;color:#7a5300}
#ofr .s3 .lt4.w4 .sb4{color:#7a5300;border-left-color:#e8cf86}
#ofr .pj .tp1{display:block;margin-top:3px;font-size:10.5px;font-weight:700;color:#7a5300;background:#fbeccb;border-radius:6px;padding:1px 5px}
#ofr .lad1{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin:10px 0 0;font-size:12.5px;color:#1d2733}
#ofr .lad1 .st{display:inline-flex;flex-direction:column;border-radius:7px;padding:3px 8px;font-weight:700;font-size:12px;border:1px solid}
#ofr .lad1 .st em{font-style:normal;font-weight:400;font-size:11.5px}
#ofr .lad1 .st.w{background:#fbeccb;color:#7a5300;border-color:#e8cf86}
#ofr .lad1 .st.r{background:#fbe3e0;color:#a5281b;border-color:#e3a9a4}
#ofr .lad1 .st.d{background:#a5281b;color:#fff;border-color:#a5281b}
#ofr .lad1 small{flex-basis:100%;color:#46515e;font-size:12px}
#ofr .s3 .stp{margin-top:3px;align-self:center;font-size:11px;font-weight:700;border-radius:6px;padding:1px 7px;border:1px solid}
#ofr .s3 .stp.w{background:#fbeccb;color:#7a5300;border-color:#e8cf86}
#ofr .s3 .stp.r{background:#fbe3e0;color:#a5281b;border-color:#e3a9a4}
#ofr .s3 .stp.d{background:#a5281b;color:#fff;border-color:#a5281b}
#ofr .sub1{margin:10px 0 0;font-size:12.5px;color:#46515e}
#ofr .an .oth1{margin-top:6px}
#ofr .hn1{display:block;font-weight:400;font-size:11.5px;color:#5b6572}
#ofr .dt1{align-items:center;text-align:center}
#ofr .dt1 b{font-size:14px;color:#1d2733}
#ofr .dt1 .ov1s{display:block;font-weight:400}
#ofr .ov1c{align-items:center;text-align:center}
#ofr .ov1{font-size:18px;font-weight:700;line-height:1}
#ofr .ov1.r{color:#a5281b}
#ofr .ov1.w{color:#7a5300}
#ofr .ov1.n{color:#8a94a2}
#ofr .ov1.n2{color:#1d2733}
#ofr .ov1s{font-size:11.5px;color:#46515e}
#ofr .na1{font-size:13px;font-weight:600;color:#1d2733;line-height:1.3}
#ofr .ps2{font-size:12px;font-weight:700;border-radius:7px;padding:2px 8px;border:1px solid}
#ofr .ps2.t{background:#dbe8f5;color:#1b3a5e;border-color:#a9c3de}
#ofr .ps2.w{background:#e2f0e7;color:#25603d;border-color:#a8d0b5}
#ofr .ps2.h{background:#f3f5f8;color:#46515e;border-color:#d6dde6;font-weight:600;white-space:normal}
#ofr .rl2{font-size:12.5px;color:#46515e;line-height:1.45;margin:4px 2px 0}
#ofr .nm1{display:block;font-size:11.5px;font-weight:400;color:#5b6572}
#ofr .lb2 .nm1{display:inline;margin-left:6px}
#ofr .lad1 .st.g{background:#e2f0e7;color:#25603d;border-color:#a8d0b5}
#ofr .pl span.y{background:#fff4d2;border-color:#d3b25c;color:#6b4a00}
#ofr .t3 .k-b{background:#dbe8f5;border-color:#a9c3de}
#ofr .tb1{box-shadow:0 1px 4px rgba(27,58,94,.14)}
#ofr .tb1 .tr>div, #ofr .tb1 .cm, #ofr .tb1 .an, #ofr .tb1 .pj, #ofr .tb1 .pc2, #ofr .tb1 .pw{background:#fff}
#ofr .tb1 .cap>div{background:#dbe8f5;color:#1b3a5e}
#ofr .tb1 .cap>div.f{background:#f6ecd0;color:#5a4410}
#ofr .tb1 .tr:not(.cap)>div{padding-top:12px;padding-bottom:12px}
#ofr .tb1 .cap>div{border-left-color:#a9c3de}
#ofr .tb1 .cap>div.f{border-left-color:#d8c48a}
#ofr .tb1 .cap{border-bottom:1px solid #a9c3de}
#ofr .ps2.au{background:#ece6f6;color:#4a3678;border-color:#c4b5e0}
#ofr .pl span.p{background:#eceff3;border-color:#b9c2ce;color:#3c4660}
#ofr .pl span.bt{background:#dbe8f5;border-color:#7fa6cf;color:#1b3a5e}
#ofr .sepr{padding:5px 12px;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:#eef2f6;color:#46515e;border-top:1px solid #d6e0ec}
#ofr .tb .sepr:first-child{border-top:0}
#ofr .sepr.sb2{font-size:13.5px;font-weight:800;color:#1d2733;background:#e3eaf2;letter-spacing:.03em;padding:7px 12px}
#ofr .sepr.sb2 span{font-weight:700;color:#46515e;text-transform:none;letter-spacing:0;margin-left:4px}
#ofr .sepr span{font-weight:600;text-transform:none;letter-spacing:0;color:#6a7480;margin-left:6px}
#ofr .tb .na{background:#f6f8fa!important;color:#6a7480;font-size:12.5px;align-items:center;text-align:center}
#ofr .fc.n{background:#f3f5f8;border-color:#d6dde6;color:#46515e}
#ofr .lk{display:flex;gap:10px;align-items:center;border-left:5px solid #5b6675;background:#fff;border-radius:10px;padding:10px 12px;font-size:14px;line-height:1.4;color:#2f3a46;margin-bottom:12px;border-top:1px solid #d6dde6;border-right:1px solid #d6dde6;border-bottom:1px solid #d6dde6}
#ofr .lk svg{flex:none}
#ofr .dl3{margin:0;padding:0;list-style:none;font-size:13px;line-height:1.35;color:#1d2733}
#ofr .dl3 li{padding:5px 0;border-top:1px solid #e1e8f0}
#ofr .dl3 li:first-child{border-top:0}
#ofr .dl3 b{font-weight:700}
#ofr .ivd{margin-top:6px}
#ofr .ivd small{display:block;font-size:11.5px;color:#5a4410;margin-bottom:3px}
#ofr .sg.sm{display:flex;width:100%}
#ofr .sg.sm button{flex:1;padding:6px 6px;font-size:13px}
#ofr .hp small{display:block;font-size:11.5px;color:#5a4410;margin-bottom:3px}
#ofr .what{background:#fff8e6;border:1px solid #e3c97a;border-radius:10px;padding:9px 12px;font-size:13.5px;color:#5a4410;margin:0 0 10px}
#ofr .what b{font-weight:700}
#ofr #q10 .fin>div{background:#fff;border:1px solid #d6dde6;border-radius:10px;padding:12px}
#ofr #q10 .fin{background:transparent;border:0;padding:0;gap:10px}
#ofr #q10 .lb2{color:#1d2733;font-weight:600;font-size:14px}
#ofr .hint{margin:0 0 12px;background:#fffdf3;border:1px dashed #d3b25c;border-radius:10px;padding:6px 12px;font-size:13px;color:#4a3a10}
#ofr .hint summary{cursor:pointer;font-weight:700;color:#7a5300;list-style:none}
#ofr .hint summary::before{content:'💡 ';}
#ofr .hint summary::-webkit-details-marker{display:none}
#ofr .hint ul{margin:6px 0 4px;padding-left:18px;line-height:1.45}
#ofr .hint li{margin:2px 0}
#ofr .dcw{flex-direction:row!important;flex-wrap:wrap;justify-content:flex-start!important;gap:6px!important}
#ofr .dc3{display:inline-flex;align-items:baseline;gap:4px;border:1px solid;border-radius:8px;padding:3px 8px;font-size:12.5px}
#ofr .dc3 em{font-style:normal;font-size:11px;opacity:.85;margin-left:4px}
#ofr .dc3.g{background:#e2f0e7;border-color:#a8d0b5;color:#25603d}
#ofr .dc3.w{background:#fbeccb;border-color:#e8cf86;color:#7a5300}
#ofr .dc3.r{background:#fbe3e0;border-color:#e3a9a4;color:#a5281b}
#ofr .dc3.n{background:#f3f5f8;border-color:#d6dde6;color:#46515e}
#ofr .ov1.ok5{color:#25603d}
#ofr .dfm{margin-top:10px}
#ofr .dg3{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:800px){}
#ofr .gz{display:inline-block;font-size:12px;border-radius:6px;padding:1px 8px;margin-bottom:4px}
#ofr .gz.c, #ofr .gt.c{background:#dbe8f5;color:#1b3a5e}
#ofr .gz.m, #ofr .gt.m{background:#fbe3e0;color:#a5281b}
#ofr .gz.n, #ofr .gt.n{background:#ece6f6;color:#4a3678}
#ofr .gz.q{background:#eceff3;color:#3c4660}
#ofr .gt{font-style:normal;font-size:10.5px;font-weight:700;border-radius:5px;padding:0 5px;margin-left:4px}
#ofr .bx2.one{margin-top:10px}
#ofr .sum3{margin:8px 0 0;font-size:13px;color:#1d2733}
#ofr #pcsg{margin:6px 0 8px;max-width:260px}
#ofr .zh{padding:14px 18px}
#ofr .zh b.big{font-size:17.5px;letter-spacing:.01em}
#ofr .qb{padding:13px 16px;gap:14px}
#ofr .qb b{font-size:15.5px;font-weight:650;letter-spacing:.005em;line-height:1.35}
#ofr .qb small{font-size:12.5px;margin-top:2px;display:block}
#ofr .qb .no{width:32px;height:32px;border-radius:9px;font-size:15px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.18)}
#ofr .pl{margin-top:8px;gap:7px}
#ofr .pl span{padding:4px 12px;font-size:13px;border-radius:999px;letter-spacing:.005em}
#ofr .pl strong{font-size:14px}
#ofr .qb .ch{width:32px;height:32px;background:#fff;border:1px solid #c3cfdd;transition:transform .18s ease,background .15s}
#ofr .qb .ch:hover{background:#eef3fa}
#ofr .qa.open>.qb .ch{transform:rotate(180deg)}
#ofr .tb .cap>div{padding:10px 12px;font-size:12px;letter-spacing:.03em;line-height:1.35}
#ofr .tb .cap{border-bottom-width:2px}
#ofr .tb .sepr{letter-spacing:.02em}
#ofr .tb .tr>div{padding-left:12px;padding-right:12px}
#ofr .zn .qa .bx, #ofr :is(#ofr #b10, #ofr #b11, #ofr #b12, #ofr #b13){background:#fff!important}
#ofr .adds{display:flex;gap:10px;flex-wrap:wrap}
#ofr .adds .add{max-width:280px}
#ofr .byc{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 0;font-size:13px}
#ofr .byc .bl{color:#1d2733;margin-right:4px}
#ofr .tb .an .dtw{margin-top:6px}
#ofr .tb .an>.dtw:first-child, #ofr .q3t .an .dtw{margin-top:0}
#ofr .tb .an .fc{margin-bottom:2px}
#ofr .q3t .iv{display:flex;width:100%}
#ofr .q3t .iv button{flex:1}
#ofr .hq{text-decoration:none!important;cursor:help}
#ofr .hq::after{content:"?";display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;margin-left:5px;border-radius:50%;background:#2a65a0;color:#fff;font:700 10px/1 "Segoe UI",Roboto,Arial,sans-serif;vertical-align:2px;flex:none;opacity:.8}
#ofr .hq:hover::after{opacity:1}
#ofr .tb .cap>div.hq{flex-direction:row;flex-wrap:wrap;justify-content:center;align-content:center;gap:0}
#ofr .tb .an, #ofr .tb1 .an{background:#fff!important}
#ofr .bx .lb2.q2h[style]{font-size:18px!important;margin-top:30px!important;margin-bottom:12px!important}
#ofr .tb.q2a .cap>div, #ofr .tb.q2a .cap>div.f, #ofr .tb.q2a .cap{background:#bcd2ea!important;color:#0f2d4d!important;border-left-color:#9cb8d8!important}
#ofr .tb.q2b .cap>div, #ofr .tb.q2b .cap>div.f, #ofr .tb.q2b .cap{background:#d9cdf0!important;color:#2e1a5e!important;border-left-color:#bba9e2!important}
#ofr .q2a{border-color:#8fb0d3}
#ofr .q2b{border-color:#bba9e2}
#ofr .q2b .cap{border-bottom:2px solid #a893d8!important}
#ofr .q2a .cap>div, #ofr .q2b .cap>div{padding-top:12px!important;padding-bottom:12px!important;font-size:13px}
#ofr .q2a .sepr{background:#dbe8f5!important;color:#163456!important;font-size:12.5px!important;border-top:2px solid #8fb0d3!important;border-bottom:1px solid #a9c3de}
#ofr .q2b .sepr{background:#ebe4f8!important;color:#3a2470!important;font-size:12.5px!important;border-top:2px solid #bba9e2!important}
#ofr .bx .t3{margin-bottom:26px;gap:14px}
#ofr .bx .tw{margin-bottom:26px}
#ofr .bx>.lb2[style], #ofr .bx .lb2[style*="font-weight:700"]{margin-top:30px!important;margin-bottom:10px!important;font-size:15px!important}
#ofr .bx>.fin{margin-top:22px}
#ofr .bx .crmbar{margin-bottom:22px}
#ofr .bx .bx2{margin-bottom:22px}
#ofr .tb .tr>div{padding-left:12px;padding-right:12px}
#ofr .tb1 .tr:not(.cap)>div{padding-top:14px;padding-bottom:14px}
#ofr .tb .tr{border-top:1px solid #c7d4e3}
#ofr .tb .an .in, #ofr .tb .an select.in{min-height:36px}
#ofr .tb .sepr{padding-top:9px!important;padding-bottom:9px!important}
#ofr .tb .cap, #ofr .tb .cap>div, #ofr .tb1 .cap>div{background:#bcd2ea!important;color:#0f2d4d!important;font-size:12.5px}
#ofr .tb .cap>div.f, #ofr .tb1 .cap>div.f{background:#f0d27e!important;color:#3d2a00!important}
#ofr .tb1 .cap, #ofr .tb .cap{border-bottom:2px solid #8fb0d3}
#ofr .tb .cap>div{border-left-color:#9cb8d8!important}
#ofr .lst3 .cp{background:#d3dfec!important;color:#1b3a5e!important}
#ofr .tipb{position:fixed;max-width:320px;background:#1f3550;color:#fff;font:600 12.5px/1.45 "Segoe UI",Roboto,Arial,sans-serif;padding:9px 12px;border-radius:10px;z-index:9999;pointer-events:none;box-shadow:0 8px 22px rgba(21,32,46,.28)}
#ofr .hq{text-decoration:underline dotted 1.5px;text-underline-offset:3px;cursor:help}
/* адаптив карточек: на узком экране колонки не схлопываются */
#ofr .t3{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
#ofr .t3 .r span:nth-child(2){overflow-wrap:anywhere}
#ofr .t3 .r em{white-space:normal}

/* CRM .ds .tb{display:flex} ломал таблицы макета — принудительно block, разделители на всю ширину */
#ofr .tb{display:block}
#ofr .tb .sepr{display:block;width:100%;box-sizing:border-box}
#ofr .tb .tr{display:grid}
#ofr .tb .an input.in::placeholder{font-size:12px}

/* кнопка аккордеона: рамка и стрелка в цвете зоны, при открытии — заливка */
#ofr .qb .ch{width:32px;height:32px;border-radius:50%;background:#fff;border:1.5px solid var(--zb);color:var(--zt);transition:transform .18s ease,background .15s,border-color .15s}
#ofr .qb .ch svg{stroke:var(--zt)}
#ofr .qb .ch:hover{background:var(--zh);border-color:var(--zc)}
#ofr .qa.open>.qb .ch{background:var(--zh);border-color:var(--zc)}

`;

    /* ---------- helpers ---------- */
  function esc(v) { return E(v == null ? "" : v); }
  function num(v) { return '<strong>' + esc(v) + '</strong>'; }
  function dshort(iso) {                        // 2026-11-26 -> 26.11 (вт)
    if (!iso) return "";
    var d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
    if (isNaN(d)) return "";
    var wd = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"][d.getDay()];
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + " (" + wd + ")";
  }
  function pd(t) {                              // 'дд.мм.гг' -> Date
    var m = /^(\d\d)\.(\d\d)\.(\d\d)$/.exec((t || "").trim());
    return m ? new Date(2000 + +m[3], +m[2] - 1, +m[1]) : null;
  }
  function wd2(a, b) {                          // рабочие дни между датами (как в макете)
    if (!a || !b || b < a) return null;
    var n = 0, d = new Date(a);
    while (d < b) { d.setDate(d.getDate() + 1); if (d.getDay() && d.getDay() < 6) n++; }
    return n;
  }
  function df(name, val, req) {                 // поле даты «дд.мм.гг» + календарь
    return '<span class="dtw"><input class="in' + (req ? " rq" : "") + ' dtx" data-ofd="' + name + '" type="text" inputmode="numeric" maxlength="8" placeholder="дд.мм.гг" autocomplete="off" value="' + esc(val || "") + '"' + (RO ? " disabled" : "") + '>'
      + '<button type="button" class="dtb"' + (RO ? " disabled" : "") + ' aria-label="Календарь"><svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5 2v3M11 2v3" stroke="currentColor" stroke-width="1.4" fill="none"/></svg></button>'
      + '<input type="date" class="dth" tabindex="-1"' + (RO ? " disabled" : "") + '></span>';
  }
  function sel(name, opts, val, req, groups) {
    var h = '<select class="in' + (req ? " rq" : "") + '" data-ofd="' + name + '"' + (RO ? " disabled" : "") + '><option value="">выбрать</option>';
    if (groups) {
      groups.forEach(function (g) {
        h += '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (o) { return '<option' + (o === val ? " selected" : "") + '>' + esc(o) + "</option>"; }).join("") + "</optgroup>";
      });
    } else {
      h += opts.map(function (o) { return '<option' + (o === val ? " selected" : "") + '>' + esc(o) + "</option>"; }).join("");
    }
    return h + "</select>";
  }
  function inp(name, ph, val, req) {
    return '<input class="in' + (req ? " rq" : "") + '" data-ofd="' + name + '" type="text" placeholder="' + esc(ph) + '" value="' + esc(val || "") + '"' + (RO ? " disabled" : "") + ">";
  }
  function ta(name, ph, val, req) {
    return '<textarea class="ta' + (req ? " rq" : "") + '" data-ofd="' + name + '" placeholder="' + esc(ph || "Необязательно") + '"' + (RO ? " disabled" : "") + ">" + esc(val || "") + "</textarea>";
  }
  function commentFld(qid) {
    return '<div class="fin"><div style="border:0;padding:0"><span class="lab">Комментарий</span>' + ta("cm:" + qid, "Необязательно", M.answers["cm:" + qid]) + "</div></div>";
  }
  function sg(name, opts, val, req, cls) {      // переключатель-кнопки
    return '<div class="sg' + (req ? " rq" : "") + (cls ? " " + cls : "") + '" data-ofsg="' + name + '">'
      + opts.map(function (o) { return '<button type="button"' + (o === val ? ' class="on"' : "") + (RO ? " disabled" : "") + ">" + esc(o) + "</button>"; }).join("") + "</div>";
  }
  function chips(name, opts, vals) {            // мультичипы; vals — массив
    vals = vals || [];
    return '<div class="mcs rq" data-ofmc="' + name + '">'
      + opts.map(function (o) { return '<button type="button" class="mc' + (vals.indexOf(o) >= 0 ? " on" : "") + '"' + (RO ? " disabled" : "") + ">" + esc(o) + "</button>"; }).join("") + "</div>";
  }
  function pj(cell) { return '<div class="pj"' + (cell.left ? ' style="align-items:flex-start;text-align:left"' : "") + "><b>" + esc(cell.n) + "</b>" + (cell.sub || "") + (cell.tag || "") + "</div>"; }
  function cardK(cls, big, title, cols, rows, foot) {
    return '<div class="k-b ' + cls + '"><div class="big"><b>' + big + "</b><p>" + title + '</p></div><div class="lst3"><div class="cp">'
      + cols.map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</div>"
      + rows.map(function (r) { return '<div class="r">' + r.map(function (x, i) { return i === 0 ? "<i>" + esc(x) + "</i>" : (typeof x === "string" && x.charAt(0) === "§" ? "<u class='" + x.slice(1, 3) + "'>" + esc(x.slice(4)) + "</u>" : (i === r.length - 1 ? "<em>" + esc(x) + "</em>" : "<span>" + esc(x) + "</span>")); }).join("") + "</div>"; }).join("")
      + '</div><p class="ft">' + foot + "</p></div>";
  }

  /* ---------- вопрос 1: ТЗ в работе ---------- */
  var STALL_GROUPS = [["Заказчик", ["Жду данные от заказчика", "Заказчик не отвечает", "Данные у посредника", "Жду оплату"]],
                      ["Выезд", ["Жду выезд на объект", "Жду информацию с выезда"]],
                      ["Мы", ["Правлю ТЗ", "Жду ответ проектировщика", "Нет папки на сервере"]],
                      ["Другое", ["Другое"]]];
  var DONE_OPTS = ["Позвонила заказчику", "Написала в мессенджер", "Написала на почту", "Связалась с посредником", "Отправила напоминание", "Ещё не начинала"];
  var STEP_OPTS = ["Написать", "Позвонить", "Поставить на паузу", "Снять с паузы", "Другое"];

  function collectRow(o, isPause) {
    var k = "q1:o" + o.id + ":";
    var tag = "";
    if (o.visit && o.visit.status === "plan") tag = '<span class="fc g" style="margin-top:4px">выезд ' + esc(dshort(o.visit.day)) + ' · запланирован</span>';
    else if (o.visit && o.visit.status !== "plan") tag = '<span class="fc r" style="margin-top:4px">выезд ' + esc(dshort(o.visit.day)) + ' · нет информации</span>';
    if (isPause) tag = '<span class="ps2 au" style="margin-top:4px">пауза авто с ' + esc(o.pause_from || "") + "</span>";
    var over = o.days - 5;
    return '<div class="tr" data-oid="' + o.id + '">'
      + pj({ n: o.number, left: true, sub: '<small class="ov1s" style="font-size:12.5px;color:#1d2733">' + esc(o.customer) + "</small>" + (o.days > 14 ? '<small class="ov1s">с прошлой недели</small>' : ""), tag: tag })
      + '<div class="cm ov1c"><input class="in" data-ofd="' + k + 'tzby" placeholder="Кто заполняет ТЗ" value="' + esc(M.answers[k + "tzby"] || "") + '"' + (RO ? " disabled" : "") + "></div>"
      + '<div class="pw"><em>' + esc(o.works || "—") + "</em></div>"
      + '<div class="cm dt1"><b>' + esc(dshort(o.since_iso)) + "</b></div>"
      + '<div class="cm ov1c"><span class="ov1 ' + (isPause ? "n2" : "r") + '">' + o.days + ' р.д.</span>' + (isPause ? '<small class="ov1s">на паузе</small>' : '<small class="ov1s">сверх нормы: ' + Math.max(over, 0) + "</small>") + "</div>"
      + '<div class="cm dt1">' + (o.contact ? "<b>" + esc(o.contact.day) + "</b>" + (o.contact.by ? '<small class="ov1s">' + esc(o.contact.action) + "</small>" : '<small class="ov1s">—</small>') : "<b>—</b>") + "</div>"
      + '<div class="an">' + sel(k + "stall", null, M.answers[k + "stall"], true, STALL_GROUPS) + (M.answers[k + "stall"] === "Другое" ? inp(k + "stallOther", "Напишите причину", M.answers[k + "stallOther"], true) : inp(k + "stallOther", "Напишите причину", "", false).replace('class="in', 'class="in oth1" hidden')) + "</div>"
      + '<div class="an">' + sel(k + "done", DONE_OPTS, M.answers[k + "done"], true) + "</div>"
      + '<div class="an">' + sel(k + "step", STEP_OPTS, M.answers[k + "step"], true) + (M.answers[k + "step"] === "Другое" ? inp(k + "stepOther", "Напишите шаг", M.answers[k + "stepOther"], true) : inp(k + "stepOther", "Напишите шаг", "", false).replace('class="in', 'class="in oth1" hidden')) + "</div>"
      + '<div class="an">' + df(k + "due", M.answers[k + "due"], true) + "</div></div>";
  }

  function q1Html() {
    var q1 = D.q1, cl = q1.collect, wk = q1.week;
    var filling = cl.filling, action = cl.action, pause = cl.pause;
    var visitsN = D.visits.new.length + D.visits.old.length;
    var pl = '<span>пришло из продаж <strong>' + wk.created_n + '</strong></span><span class="g">передано в проектирование <strong>' + wk.ready_n + '</strong></span>'
      + '<span class="y">в заполнении <strong>' + filling.length + '</strong></span><span class="r">требуют действия <strong>' + action.length + '</strong></span>'
      + '<span class="p">на паузе <strong>' + pause.length + '</strong></span><span class="bt">выездов <strong>' + visitsN + '</strong></span>';
    var cards = '<div class="t3">'
      + cardK("", wk.created_n, "Пришло из продаж", ["Проект", "Заказчик", "Вид работы"],
              wk.came.slice(0, 6).map(function (o) { return [o.number, o.customer, o.works]; }),
              "Прошлая неделя: <b>" + Math.max(wk.created_n - wk.came.filter(function (x) { return x.is_new; }).length, 0) + "</b>")
      + cardK("k-g", wk.ready_n, "Передано в проектирование", ["Проект", "Заказчик", "Вид работы"],
              wk.passed.slice(0, 6).map(function (o) { return [o.number, o.customer, o.works]; }),
              "Из переданных вернули: <b>" + wk.returned + "</b>")
      + cardK("k-y c4", filling.length, 'В заполнении <small class="nm1">в норме, до 5 р.д.</small>', ["Проект", "Заказчик", "Срок", "Вид работы"],
              filling.slice(0, 6).map(function (o) { return [o.number, o.customer, "§w1:" + o.days + " р.д.", o.works]; }),
              "Сегодня последний день: <b>" + filling.filter(function (o) { return o.days >= 5; }).length + "</b>")
      + "</div>";
    var actTbl = action.length || pause.length
      ? '<div class="tw"><div class="tb tb1" style="min-width:1090px;--c:118px 106px 72px 100px 94px 100px 1fr 1fr 1fr 116px"><div class="tr cap"><div>Проект</div><div>Кто заполняет ТЗ</div><div>Вид работы</div><div>На сборе ТЗ с</div><div>Сколько дней</div><div>Последний контакт</div><div class="f">Что тормозит</div><div class="f">Что уже сделала</div><div class="f">Следующий шаг</div><div class="f">Срок шага</div></div>'
        + (action.length ? '<div class="sepr sb2">Требуют действия <span>(6–10 р.д.)</span></div>' + action.map(function (o) { return collectRow(o, false); }).join("") : "")
        + (pause.length ? '<div class="sepr sb2">На паузе <span>(11 р.д. и больше)</span></div>' + pause.map(function (o) { return collectRow(o, true); }).join("") : "")
        + "</div></div>"
      : '<div class="note">Все ТЗ в норме (до 5 рабочих дней) — действия не требуются</div>';
    /* выезды */
    var vRows = function (list) {
      return list.map(function (v) {
        var k = "q1:v" + v.oid + ":";
        var info;
        if (!v.done && v.status === "plan") info = '<span class="fc n">ещё не выезжали</span>';
        else if (v.done) {
          var passed = M.answers[k + "sent"];
          var dd = wd2(new Date(v.day_iso + "T12:00:00"), new Date());
          if (passed) info = '<span class="fc g">передала ' + esc(passed) + "</span>";
          else if (dd >= 1) info = '<span class="fc r">нет · ' + dd + ' р.д. после выезда</span>';
          else info = '<span class="fc n">жду данные</span>';
        } else info = '<span class="fc n">—</span>';
        return '<div class="tr"><div class="pj"><b>' + esc(v.number) + "</b></div><div class=\"pc2\"><b>" + esc(v.customer) + '</b></div><div class="pw"><em>' + esc(v.works || "—")
          + '</em></div><div class="cm dt1"><b>' + esc(v.asked) + '</b></div><div class="cm ov1c"><span class="na1">' + esc(v.who || "—") + '</span></div><div class="cm dt1"><b>' + esc(dshort(v.day_iso)) + "</b>" + (v.status === "plan" ? '<small class="ov1s">запланирован</small>' : "") + '</div><div class="cm ov1c">' + info + '</div><div class="an">' + (v.done ? df(k + "sent", M.answers[k + "sent"], false) : '<span class="na">—</span>') + "</div></div>";
      }).join("");
    };
    var visitTbl = (D.visits.new.length || D.visits.old.length)
      ? '<div class="tw"><div class="tb tb1" style="min-width:960px;--c:56px 110px 90px 96px 140px 104px 1.1fr 1fr"><div class="tr cap"><div>Проект</div><div>Заказчик</div><div>Вид работы</div><div>Выезд запросили</div><div>Кто едет</div><div>Дата выезда</div><div>Информация с выезда у Полины</div><div class="f">Передала проектировщику</div></div>'
        + (D.visits.new.length ? '<div class="sepr">Новые за неделю</div>' + vRows(D.visits.new) : "")
        + (D.visits.old.length ? '<div class="sepr">Перешли с прошлой недели</div>' + vRows(D.visits.old) : "")
        + "</div></div>"
      : '<div class="note">Выездов нет</div>';
    return { pl: pl, body: cards
      + '<span class="lb2">ТЗ, требующие действия, и ТЗ на паузе</span>' + actTbl
      + '<span class="lb2">Выезды на объект</span>' + visitTbl + commentFld("q1") };
  }

  /* ---------- вопрос 2: вопросы и возвраты по ТЗ ---------- */
  var POINTS = ["Производитель СОУЭ", "Производитель ОКЛ", "Пункты 31–32 (данные об объекте)", "Прибор для индикации (БУ-32, БКИ)", "Планировки", "Состав систем", "Вентиляция", "Исходные данные", "Другое"];
  var WHY = ["Заказчик не дал данные, передала без них", "Не проверила этот пункт", "Пункт формы непонятен заказчику", "Проектировщику нужно больше, чем есть в форме", "Другое"];
  function pointSel(name, val, req) { return sel(name, POINTS, val, req) + (val === "Другое" ? inp(name + ":oth", "Какой пункт", M.answers[name + ":oth"] || findEvOther(name), true) : ""); }
  function findEvOther(name) { return ""; }
  function evRow(e) {
    var k = "q2:e" + e.id + ":";
    if (e.kind === "rr") return '<div class="tr"><div class="an">' + inp(k + "n", "№ и заказчик", e.n, true) + '</div><div class="an"><span class="fc">вернули заказчику</span>' + df(k + "d", e.d, true) + '</div><div class="an">' + pointSel(k + "p", e.point, true) + '</div><div class="an">' + inp(k + "q", "Чего не хватало", e.what, true) + '</div><div class="an">' + inp(k + "a", "Как решили", e.why, true) + '</div><button type="button" class="ofdel" data-ofdel="tz_events|' + e.id + '"' + (RO ? " disabled" : "") + ">✕</button></div>";
    if (e.kind === "q") return '<div class="tr"><div class="an">' + inp(k + "n", "№ и заказчик", e.n, true) + '</div><div class="an"><span class="fc g">вопрос заказчика</span></div><div class="an">' + pointSel(k + "p", e.point, true) + '</div><div class="an">' + inp(k + "q", "Суть вопроса", e.what, true) + '</div><div class="an">' + inp(k + "a", "Как решили", e.why, true) + '</div><button type="button" class="ofdel" data-ofdel="tz_events|' + e.id + '"' + (RO ? " disabled" : "") + ">✕</button></div>";
    return '<div class="tr"><div class="an">' + inp(k + "n", "№ и заказчик", e.n, true) + '</div><div class="an">' + sel(k + "k", ["Вернул проектировщик", "Вопрос проектировщика"], e.d, true) + df(k + "d2", e.step_date, false) + '</div><div class="an">' + pointSel(k + "p", e.point, true) + '</div><div class="an">' + sel(k + "w", WHY, e.why, true) + '</div><div class="an">' + inp(k + "l", "р.д.", e.lost, true) + '</div><div class="an">' + inp(k + "s", "Следующий шаг", e.step, true) + '</div><div class="an">' + df(k + "sd", e.other, true) + '</div><button type="button" class="ofdel" data-ofdel="tz_events|' + e.id + '"' + (RO ? " disabled" : "") + ">✕</button></div>";
  }
  function q2Html() {
    var ev = M.tz_events;
    var rr = ev.filter(function (e) { return e.kind === "rr"; }), br = ev.filter(function (e) { return e.kind === "br"; }), qs = ev.filter(function (e) { return e.kind === "q"; });
    var lost = br.reduce(function (s, e) { return s + (+e.lost || 0); }, 0);
    var pl = '<span class="bt">от заказчиков <strong>' + (rr.length + qs.length) + '</strong></span><span class="y">от проектировщиков <strong>' + br.length + '</strong></span><span class="r">потеряно <strong>' + lost + '</strong> р.д.</span>';
    var addBtns = RO ? "" : '<div class="adds"><button class="add" type="button" data-ofadd="rr">+ Добавить возврат заказчику</button><button class="add" type="button" data-ofadd="q">+ Добавить вопрос заказчика</button></div>';
    var body = '<span class="lb2 q2h">1. До передачи в проектирование: заказчик и форма ТЗ</span>'
      + '<div class="tw"><div class="tb q2a" style="min-width:1000px;--c:150px 185px 1fr 1.2fr 1.2fr"><div class="tr cap"><div>Проект</div><div>Что произошло</div><div class="f">Пункт формы</div><div class="f">Суть вопроса</div><div class="f">Как решили</div></div>'
      + '<div class="sepr">Возвраты заказчику · добавляете вы</div>' + rr.map(evRow).join("")
      + '<div class="sepr">Вопросы заказчиков · добавляете вы</div>' + qs.map(evRow).join("") + "</div></div>"
      + addBtns
      + '<div class="fin" style="margin-top:14px"><div style="border:0;padding:0"><span class="lb2">Какой пункт формы ТЗ предлагаете исправить и как?</span>' + inp("q2:fixform", "Необязательно: например, «Производитель СОУЭ: добавить список на выбор»", M.answers["q2:fixform"]) + "</div></div>"
      + '<span class="lb2 q2h">2. После передачи в проектирование: проектировщики</span>'
      + '<div class="tw"><div class="tb q2b" style="min-width:1120px;--c:150px 185px 1fr 1.2fr 110px 1fr 124px"><div class="tr cap"><div>Проект</div><div>Что произошло</div><div class="f">Пункт ТЗ</div><div class="f">Почему пропустили</div><div>Потеряно</div><div class="f">Следующий шаг</div><div class="f">Дата шага</div></div>'
      + '<div class="sepr">Добавляете вы</div>' + br.map(evRow).join("") + "</div></div>"
      + (RO ? "" : '<button class="add" type="button" data-ofadd="br" style="max-width:300px">+ Добавить возврат или вопрос проектировщика</button>')
      + commentFld("q2");
    return { pl: pl, body: body };
  }

  /* ---------- вопрос 3: итог по ТЗ ---------- */
  function q3Html() {
    var rows = M.tz_rows;
    var pl = '<span>передано <strong id="of-q3n">' + rows.length + '</strong></span><span>в среднем <strong id="of-q3avg">—</strong> р.д.</span>'
      + '<span class="g">без возврата <strong id="of-q3nr">—</strong></span><span>проверено Иваном <strong id="of-q3iv">—</strong></span>';
    var body = '<span class="lb2">ТЗ, переданные в проектирование за неделю</span>'
      + '<div class="tw"><div class="tb q3t" style="min-width:1080px;--c:110px 1fr 150px 160px 90px 1fr 150px"><div class="tr cap"><div>Проект</div><div>Заказчик</div><div>Форма ТЗ получена</div><div>Готово к проектированию</div><div>Дней</div><div>Вернули?</div><div>Проверено Иваном</div></div>'
      + rows.map(function (r) {
          var k = "q3:r" + r.id + ":";
          return '<div class="tr"><div class="an">' + inp(k + "n", "№", r.n, true) + '</div><div class="an">' + inp(k + "cust", "Заказчик", r.customer, true) + '</div><div class="an">' + df(k + "fd", r.form_date, true) + '</div><div class="an">' + df(k + "rd", r.ready_date, true) + '</div><div class="cm ov1c dd"><span class="ov1 of-dn">—</span><small class="ov1s">р.д.</small></div><div class="an">' + sel(k + "ret", ["Нет", "Вернули заказчику", "Вернул проектировщик"], r.returned, true) + '</div><div class="an">' + sg(k + "ivan", ["Да", "Нет"], r.ivan, true, "rq sm iv") + '</div><button type="button" class="ofdel" data-ofdel="tz_rows|' + r.id + '"' + (RO ? " disabled" : "") + ">✕</button></div>";
        }).join("") + "</div></div>"
      + (RO ? "" : '<button class="add" type="button" data-ofadd="tzrow" style="max-width:260px">+ Добавить ТЗ</button>')
      + '<div class="byc" id="of-q3byc"></div>'
      + '<div class="fin" style="margin-top:22px"><div style="border:0;padding:0"><span class="lb2">Какое ТЗ на этой неделе было самым трудным и почему?</span>' + inp("q3:hard", "Номер проекта и одна-две фразы", M.answers["q3:hard"], true) + '</div><div style="border:0;padding:0"><span class="lb2">Что одно улучшите в сборе ТЗ на следующей неделе?</span>' + inp("q3:improve", "Одна конкретная вещь", M.answers["q3:improve"], true) + "</div></div>"
      + commentFld("q3");
    return { pl: pl, body: body };
  }

  /* ---------- зона 2: согласование проектов ---------- */
  function q4Html() {
    var ap = D.approval;
    var pl = '<span>отправлено <strong>' + ap.sent_n + '</strong></span><span class="g">согласовано без правок <strong>' + ap.ok_n + '</strong></span>'
      + '<span class="y">с правками <strong>' + ap.fix_n + '</strong></span><span class="r">без ответа больше 5 р.д. <strong>' + ap.wait5_n + '</strong></span>';
    var bar = '<div class="crmbar" style="--n:4"><div>Отправлено за неделю<b>' + ap.sent_n + '</b><small>всего на согласовании ' + ap.wait_n + "</small></div>"
      + '<div class="g">Согласовано без правок<b>' + ap.ok_n + "</b></div>"
      + '<div class="w">Согласовано с правками<b>' + ap.fix_n + '</b><small>в блок «Корректировки»</small></div>'
      + '<div class="r">Ждём ответа<b>' + ap.wait_n + "</b><small>из них больше 5 р.д.: " + ap.wait5_n + "</small></div></div>";
    var rows = ap.rows.map(function (o) {
      var k = "q4:o" + o.id + ":";
      var stepCell = o.days > 5
        ? '<div class="an">' + inp(k + "step", "Следующий шаг", M.answers[k + "step"], true) + '</div><div class="an">' + df(k + "due", M.answers[k + "due"], true) + "</div>"
        : '<div class="na" style="grid-column:span 2">в норме, шаг не нужен</div>';
      return '<div class="tr"' + (o.is_new ? ' data-ofnew="1"' : "") + '><div class="pj"><b>' + esc(o.number) + "</b></div><div class=\"pc2\"><b>" + esc(o.customer) + '</b></div><div class="pw"><em>' + esc(o.works || "—")
        + '</em></div><div class="cm dt1"><b>' + esc(o.sent) + '</b></div><div class="cm ov1c"><span class="ov1 ' + (o.days > 5 ? "r" : "n2") + '">' + o.days + '</span><small class="ov1s">р.д.</small></div>'
        + '<div class="cm dt1">' + (o.contact ? "<b>" + esc(o.contact.day) + "</b>" + (o.contact.action ? '<small class="ov1s">' + esc(o.contact.action) + "</small>" : "") : "<b>—</b>") + "</div>" + stepCell + "</div>";
    }).join("");
    var seprN = ap.rows.some(function (o) { return o.is_new; }) ? '<div class="sepr">Новые за неделю</div>' : "";
    var seprO = ap.rows.some(function (o) { return !o.is_new; }) ? '<div class="sepr">Перешли с прошлой недели</div>' : "";
    var body = bar + '<div class="tw"><div class="tb tb1" style="min-width:960px;--c:56px 116px 92px 104px 96px 130px 1.4fr 112px"><div class="tr cap"><div>Проект</div><div>Заказчик</div><div>Вид работы</div><div>Отправлено заказчику</div><div>Без ответа</div><div>Последний контакт</div><div class="f">Следующий шаг</div><div class="f">Дата шага</div></div>'
      + seprN + ap.rows.filter(function (o) { return o.is_new; }).map(function () { return ""; }).join("")
      + rows + seprO + "</div></div>" + commentFld("q4");
    /* разделители новые/прошлые — проще: строки уже в DOM, пометим через data-ofnew и разобьём ниже в render */
    return { pl: pl, body: bar + q4Table(ap) + commentFld("q4") };
  }
  function q4Table(ap) {
    function row(o) {
      var k = "q4:o" + o.id + ":";
      var stepCell = o.days > 5
        ? '<div class="an">' + inp(k + "step", "Следующий шаг", M.answers[k + "step"], true) + '</div><div class="an">' + df(k + "due", M.answers[k + "due"], true) + "</div>"
        : '<div class="na" style="grid-column:span 2">в норме, шаг не нужен</div>';
      return '<div class="tr"><div class="pj"><b>' + esc(o.number) + "</b></div><div class=\"pc2\"><b>" + esc(o.customer) + '</b></div><div class="pw"><em>' + esc(o.works || "—")
        + '</em></div><div class="cm dt1"><b>' + esc(o.sent) + '</b></div><div class="cm ov1c"><span class="ov1 ' + (o.days > 5 ? "r" : "n2") + '">' + o.days + '</span><small class="ov1s">р.д.</small></div>'
        + '<div class="cm dt1">' + (o.contact ? "<b>" + esc(o.contact.day) + "</b>" + (o.contact.action ? '<small class="ov1s">' + esc(o.contact.action) + "</small>" : "") : "<b>—</b>") + "</div>" + stepCell + "</div>";
    }
    var nw = ap.rows.filter(function (o) { return o.is_new; }), old = ap.rows.filter(function (o) { return !o.is_new; });
    return '<div class="tw"><div class="tb tb1" style="min-width:960px;--c:56px 116px 92px 104px 96px 130px 1.4fr 112px"><div class="tr cap"><div>Проект</div><div>Заказчик</div><div>Вид работы</div><div>Отправлено заказчику</div><div>Без ответа</div><div>Последний контакт</div><div class="f">Следующий шаг</div><div class="f">Дата шага</div></div>'
      + (nw.length ? '<div class="sepr">Новые за неделю</div>' + nw.map(row).join("") : "")
      + (old.length ? '<div class="sepr">Перешли с прошлой недели</div>' + old.map(row).join("") : "")
      + (ap.rows.length ? "" : '<div class="note" style="padding:12px">Ничего не ждёт согласования</div>') + "</div></div>";
  }

  /* ---------- зона 3: корректировки ---------- */
  function q5Html() {
    var fx = D.fixes;
    var wNew = fx.week_new, open = fx.open;
    var paidN = open.filter(function (r) { return r.paid; }).length;
    var pl = '<span>новых раундов <strong>' + wNew.length + '</strong></span><span class="r">открыто <strong>' + open.length + '</strong></span><span class="y">платных у Саши <strong>' + M.paid_fixes.length + '</strong></span>';
    var cards = '<div class="t3">'
      + cardK("c4b", wNew.length, "Новых раундов за неделю", ["Проект", "Заказчик", "Раунд", "Замеч."],
              wNew.map(function (r) { return [r.number, r.customer, "§n1:№ " + r.n, String((r.remarks.match(/Ⓝ/g) || []).length || r.n)]; }),
              "Замечаний: <b>" + wNew.length + "</b>")
      + cardK("k-g c4b", open.filter(function (r) { return !r.open; }).length || wNew.filter(function (r) { return !r.open; }).length, "Раундов закрыто", ["Проект", "Заказчик", "Раунд", "Замеч."],
              wNew.filter(function (r) { return !r.open; }).map(function (r) { return [r.number, r.customer, "§n1:№ " + r.n, "—"]; }), "Прошлая неделя: <b>—</b>")
      + cardK("k-y c4b", open.length, "Открыто на конец недели", ["Проект", "Заказчик", "Срок", "Раунд"],
              open.slice(0, 6).map(function (r) { return [r.number, r.customer, "§w1:" + (r.days == null ? "—" : r.days + " р.д."), "§n1:№ " + r.n]; }),
              "Платных: <b>" + paidN + "</b>")
      + "</div>";
    var month = fx.month;
    var bar = '<div class="bx2 one"><h6>Причины замечаний за ' + monthName() + '</h6><p class="nov1">' + monthName() + ': <b>' + month.rounds + "</b> раундов · замечаний с причиной <b>" + month.total_with_cat + "</b></p>"
      + Object.keys(month.by_cat).map(function (k) {
          var v = month.by_cat[k], pct = month.total_with_cat ? Math.round(v / month.total_with_cat * 100) : 0;
          return '<div class="brl"><span>' + esc(k) + "</span><i><u style=\"width:" + pct + '%"></u></i><b>' + v + " (" + pct + "%)</b></div>";
        }).join("") + "</div>";
    var paid = M.paid_fixes.map(function (r) {
      var k = "q5:p" + r.id + ":";
      return '<div class="tr"><div class="cm"><b>' + esc(r.n) + "</b><small>" + esc(r.customer) + '</small></div><div class="cm"><b>' + esc(r.round_) + '</b></div><div class="cm"><b>' + esc(r.sent) + '</b></div><div class="an">'
        + sel(k + "st", ["Ждём решения Саши", "Счёт выставлен", "Оплачен", "Отказ"], r.status, true)
        + '</div><div class="an">' + inp(k + "cm", "Комментарий (необязательно)", r.comment) + '</div><button type="button" class="ofdel" data-ofdel="paid_fixes|' + r.id + '"' + (RO ? " disabled" : "") + ">✕</button></div>";
    }).join("");
    var body = cards + bar
      + '<span class="lb2">Платные корректировки, переданные Саше</span>'
      + '<div class="tw"><div class="tb" style="min-width:860px;--c:150px 90px 130px 1fr 1.2fr"><div class="tr cap"><div>Проект</div><div>Раунд</div><div>Передала Саше</div><div>Статус</div><div>Комментарий</div></div>'
      + paid + "</div></div>"
      + (RO ? "" : '<button class="add" type="button" data-ofadd="paidfix" style="max-width:300px">+ Добавить платную корректировку</button>')
      + '<div class="fin" style="margin-bottom:10px"><div style="border:0;padding:0"><span class="lb2">По всем ли корректировкам получена ведомость от проектировщиков?</span>'
      + sg("q5:ved", ["Да, по всем", "Нет, не по всем"], M.answers["q5:ved"], true)
      + '<div id="of-vedx"' + (M.answers["q5:ved"] === "Нет, не по всем" ? "" : " hidden") + ' style="margin-top:10px"><div class="g3" style="margin-top:0">' + inp("q5:vedx", "По каким проектам нет ведомости и что делаете", M.answers["q5:vedx"], true) + df("q5:vedd", M.answers["q5:vedd"], true) + "</div></div></div></div>"
      + '<div class="fin"><div style="border:0;padding:0"><span class="lb2">Главная причина недели: что меняем, чтобы она не повторялась?</span>' + inp("q5:main", "Одна мысль: что и кто делает", M.answers["q5:main"], true) + "</div></div>"
      + commentFld("q5");
    return { pl: pl, body: body };
  }
  function monthName() { var m = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"]; return m[new Date().getMonth()]; }

  /* ---------- зона 4: ситуации с заказчиками ---------- */
  function sitRow(r) {
    var k = "q6:s" + r.id + ":";
    return '<div class="tr"><div class="an">' + inp(k + "n", "№", r.n, true) + '</div><div class="an">' + inp(k + "cust", "Заказчик", r.customer, true) + '</div><div class="an">'
      + sel(k + "what", ["Жаловался", "Ждал ответа дольше суток", "Торопил со сроком", "Другое"], r.what, true)
      + (r.what === "Другое" ? inp(k + "whatOth", "Что случилось", r.other, true) : "")
      + '</div><div class="an">' + inp(k + "did", "Что сделала", r.did, true) + '</div><div class="an">'
      + sel(k + "to", ["Решила сама", "Ивану", "Саше", "Дмитрию", "Яне"], r.to_, true) + '</div><div class="an">'
      + sel(k + "help", ["Нет", "Да"], r.help, true, "hlp") + '</div><div class="an"><span class="hp"' + (r.help === "Да" ? "" : " hidden") + ">" + inp(k + "who", "Кто", r.who, true) + '</span></div><div class="an"><span class="hp"' + (r.help === "Да" ? "" : " hidden") + ">" + df(k + "until", r.until_date, true) + '</span></div><button type="button" class="ofdel" data-ofdel="situations|' + r.id + '"' + (RO ? " disabled" : "") + ">✕</button></div>";
  }
  function q6Html() {
    var ss = M.situations;
    var helpN = ss.filter(function (r) { return r.help === "Да"; }).length;
    var pl = '<span>ситуаций <strong>' + ss.length + '</strong></span><span class="r">нужна помощь <strong>' + helpN + "</strong></span>";
    var none = M.answers["q6:none"] === "1";
    var body = '<div class="what"><b>Что записываем:</b> любого заказчика, который жаловался, ждал ответа дольше суток или торопил со сроком. Даже если всё уже решили.</div>'
      + '<div class="fin" style="margin-bottom:10px"><div style="border:0;padding:0"><span class="lb2">Были такие ситуации на этой неделе?</span>'
      + sg("q6:was", ["Были", "Ничего не было за неделю"], none ? "Ничего не было за неделю" : "Были", true)
      + '</div></div><div id="of-sitx"' + (none ? " hidden" : "") + '>'
      + '<div class="tw"><div class="tb" style="min-width:1140px;--c:70px 120px 200px 1.4fr 140px 100px 1fr 128px"><div class="tr cap"><div>Проект</div><div>Заказчик</div><div>Что случилось</div><div>Что сделала</div><div>Кому передала</div><div>Нужна помощь?</div><div>Кто поможет</div><div>До какой даты</div></div>'
      + ss.map(sitRow).join("") + "</div></div>"
      + (RO ? "" : '<button class="add" type="button" data-ofadd="sit" style="max-width:260px">+ Добавить ситуацию</button>') + "</div>"
      + commentFld("q6");
    return { pl: pl, body: body };
  }

  /* ---------- зона 5: мнение ---------- */
  var HARD7 = ["Заказчик долго не присылает ТЗ", "Не хватает исходных данных", "Недозвон", "Заказчик молчит по согласованию", "Спор, платная корректировка или нет", "Заказчик торопит", "Сложно выйти на того, кто решает", "Не могу назвать срок заказчику", "Меняют требования после согласования", "Сложно объяснить требования нормы", "Слишком много задач сразу", "Отвлекают, не могу сосредоточиться"];
  var TIME8 = ["ТЗ", "Корректировки", "Согласование проектов", "CRM", "Жду ответа от проектировщиков", "Жду ответа от Ивана", "Сверка ведомостей замечаний", "Много задач сразу, теряются приоритеты", "Срочное перебивает плановое", "Теряются сообщения в рабочих каналах", "Задачи копятся к концу недели", "Работаю допоздна, чтобы всё успеть", "Ничего не мешало", "Свой вариант"];
  var LBL8 = {"ТЗ": "с ТЗ", "Корректировки": "с корректировками", "Согласование проектов": "с согласованием проектов", "CRM": "в CRM", "Жду ответа от проектировщиков": "с ожиданием ответа проектировщиков", "Жду ответа от Ивана": "с ожиданием ответа Ивана", "Сверка ведомостей замечаний": "со сверкой ведомостей замечаний", "Много задач сразу, теряются приоритеты": "с приоритетами при большом числе задач", "Срочное перебивает плановое": "со срочными задачами, которые перебивают плановые", "Теряются сообщения в рабочих каналах": "с сообщениями в рабочих каналах", "Задачи копятся к концу недели": "с накоплением задач к концу недели", "Работаю допоздна, чтобы всё успеть": "с рабочим временем и переработками"};
  function q7Html() {
    var body = '<div class="fin"><div><span class="lb2">Насколько легко было общаться с заказчиками на этой неделе?</span>'
      + '<div class="sg rq sc10"><span class="se">совсем нет</span>' + [1,2,3,4,5,6,7,8,9,10].map(function (n) { return '<button type="button"' + (String(M.answers["q7:scale"]) === String(n) ? ' class="on"' : "") + (RO ? " disabled" : "") + ">" + n + "</button>"; }).join("") + '<span class="se">очень</span></div></div>'
      + '<div><span class="lb2">Что давалось тяжелее всего <small>(можно несколько)</small></span>'
      + chips("q7:hard", HARD7, M.answers["q7:hard"] || []) + '</div>'
      + '<div id="of-q7ex"><span class="lb2">Один пример <small>заказчик и что произошло</small></span><input class="in" data-ofd="q7:example" type="text" placeholder="Коротко" value="' + esc(M.answers["q7:example"] || "") + '"' + (RO ? " disabled" : "") + "></div></div>";
    return { pl: "", body: body };
  }
  function q8sub(k, label, ph) {
    return '<div class="pr11" data-ofsub="' + esc(k) + '"><span class="lb2">' + esc(label) + ' <small>(один случай)</small></span><div class="r11">'
      + '<input class="in rq" data-ofd="' + k + ':case" type="text" placeholder="' + esc(ph) + '" value="' + esc((M.answers[k + ":case"]) || "") + '"' + (RO ? " disabled" : "") + ">"
      + sg(k + ":type", ["Ошибка", "Хочу функцию"], M.answers[k + ":type"], true, "rq t11") + "</div></div>";
  }
  function q8Html() {
    var sel8 = M.answers["q8:what"] || [];
    var none = sel8.indexOf("Ничего не мешало") >= 0;
    var body = '<div class="fin"><div><span class="lb2"><small>(можно несколько)</small></span>'
      + chips("q8:what", TIME8, sel8) + '</div>'
      + '<div id="of-q8subs">' + sel8.filter(function (k) { return k !== "Ничего не мешало"; }).map(function (k) {
          if (k === "Свой вариант") return '<div class="pr11" data-ofsub="Свой вариант"><span class="lb2">Свой вариант</span><input class="in rq" data-ofd="q8:own" type="text" placeholder="Напишите, что ещё отнимало время и силы" value="' + esc(M.answers["q8:own"] || "") + '"' + (RO ? " disabled" : "") + "></div>";
          return q8sub("q8:w:" + k, "Что именно не так " + (LBL8[k] || "· " + k) + "?", "Например: искала ответ проектировщика в чате, потратила 20 минут");
        }).join("") + "</div>"
      + '<div id="of-q8none"' + (none ? "" : " hidden") + '><span class="lb2">Что одно можно сделать удобнее?</span><input class="in" data-ofd="q8:easier" type="text" placeholder="Необязательно: одна идея, что улучшить" value="' + esc(M.answers["q8:easier"] || "") + '"' + (RO ? " disabled" : "") + "></div></div>";
    return { pl: "", body: body };
  }
  function q9Html() {
    var inner = '<div class="fin"><div><span class="lb2">Сколько вечеров на этой неделе работали после рабочего времени?</span>'
      + '<div class="sg rq sc10"><span class="se">ни одного</span>' + [0,1,2,3,4,5].map(function (n) { return '<button type="button"' + (String(M.answers["q9:evenings"]) === String(n) ? ' class="on"' : "") + (RO ? " disabled" : "") + ">" + n + "</button>"; }).join("") + '<span class="se">каждый день</span></div></div>'
      + '<div><span class="lb2">Что чаще всего доделывали вечером?</span>' + inp("q9:what", "Необязательно: что именно", M.answers["q9:what"]) + "</div>"
      + '<div><span class="lb2">Нагрузка на этой неделе</span>' + sg("q9:load", ["Мало", "Норма", "Много", "Перегруз"], M.answers["q9:load"], true) + "</div>"
      + '<div><span class="lb2">Что забрать у вас или с чем помочь?</span>' + ta("q9:help", "", M.answers["q9:help"]) + "</div></div>";
    var lock = '<div class="lk"><svg viewBox="0 0 20 20" width="20" height="20"><rect x="4" y="9" width="12" height="9" rx="2" fill="#5b6675"></rect><path d="M7 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="#5b6675" stroke-width="2"></path></svg><span>Закрытый блок. Видят: Полина, Дмитрий, Яна. На общем созвоне не обсуждаем.</span></div>';
    return { pl: '<span class="p">закрытый блок</span>', body: lock + (D.locked ? inner : "") };
  }
  function loopHtml() {
    return '<div class="k5"><div class="col5 nw5"><span class="lb2">Что предлагаете изменить?</span>' + ta("loop:proposal", "Необязательно: что бы вы изменили в работе, процессах, CRM или общении с заказчиками?", M.answers["loop:proposal"]) + '</div>'
      + '<div class="col5 st5b"><p class="ct5 hd5"><span>Ваши предложения с прошлой недели</span></p>'
      + '<div class="sub5 ok5"><p class="ct5"><span>Сделано</span></p>' + inp("loop:done", "Что из прошлых предложений сделано", M.answers["loop:done"]) + "</div>"
      + '<div class="sub5 wk5"><p class="ct5"><span>В работе</span></p>' + inp("loop:doing", "Что в работе и до какого срока", M.answers["loop:doing"]) + "</div></div></div>";
  }

  /* ---------- сборка страницы ---------- */
  function qa(n, title, tip, pl, body, open, extra) {
    return '<div class="qa' + (open ? " open" : "") + '"' + (extra || "") + '><button class="qb" type="button"><span class="no">' + n + '</span>'
      + '<span class="t"><b data-tip="' + esc(tip) + '" class="hq">' + esc(title) + "</b>" + (pl ? '<span class="pl">' + pl + "</span>" : "") + "</span>"
      + '<span class="ch"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M3 6l5 5 5-5" fill="none" stroke="#1d2733" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></button>'
      + '<div class="bx">' + body + "</div></div>";
  }
  function zone(colors, title, tip, inner) {
    return '<div class="zn" style="' + colors + '"><div class="zh"><div><b class="big hq" data-tip="' + esc(tip) + '">' + esc(title) + "</b></div></div>"
      + '<div class="zi">' + inner + "</div></div>";
  }
  var Z1 = "--zb:#a9c3de;--zbg:#eef4fa;--zh:#d3e2f2;--zt:#1b3a5e;--zc:#2a65a0";
  var Z2 = "--zb:#8fcaa3;--zbg:#eef8f1;--zh:#cfead9;--zt:#17653a;--zc:#2f8f5b";
  var Z3 = "--zb:#e0cf9a;--zbg:#fbf6e6;--zh:#f3e7b9;--zt:#5a4410;--zc:#b8892a";
  var Z4 = "--zb:#c3b5e0;--zbg:#f5f2fb;--zh:#e3dbf3;--zt:#4a2d82;--zc:#7a4fc0";
  var Z5 = "--zb:#d9d0bf;--zbg:#f8f6f2;--zh:#ece6db;--zt:#4a4030;--zc:#8c7a5b";

  function render() {
    var q1 = q1Html(), q2 = q2Html(), q3 = q3Html(), q4 = q4Html(), q5 = q5Html(), q6 = q6Html(), q7 = q7Html(), q8 = q8Html(), q9 = q9Html();
    var h = '<style>' + OF_CSS + '</style><div id="ofr">'
      + '<div class="top"><h1>' + esc(D.person) + ' <span class="role">(' + esc(D.role) + ')</span></h1>'
      + '<span class="cnt" id="ofr-cnt"></span></div>'
      + '<p class="note" style="margin-top:4px">Во всех списках сначала идут новые за неделю, ниже те, что перешли с прошлой недели. Один проект считается один раз. Наведите на «?» — пояснение.</p>'
      + '<div style="display:flex;justify-content:flex-end;margin:4px 0 10px;font-size:12px;color:var(--muted)"><span id="ofr-saved" hidden>✓ Сохранено</span></div>'
      + zone(Z1, "ТЗ и передача в проектирование", "Как идёт сбор ТЗ и передача проектов проектировщикам.",
          qa(1, "ТЗ в работе", "Цифры, карточки и выезды считает CRM. Вы заполняете только строки «Требуют действия» и «На паузе».", q1.pl, q1.body, true)
          + qa(2, "Вопросы и возвраты по ТЗ", "Две части: до передачи (заказчик и форма) и после (проектировщики). Строки добавляете вы, плашки считаются сами.", q2.pl, q2.body)
          + qa(3, "Итог по ТЗ", "Вы вносите каждое ТЗ с двумя датами. Дни, плашки и «по заказчикам» считаются сами.", q3.pl, q3.body))
      + zone(Z2, "Согласование проектов", "Проекты, которые ждут ответа заказчика.",
          qa(4, "Проекты на согласовании у заказчика", "Шаг и дату пишете, только если проект без ответа больше 5 р.д.", q4.pl, q4.body))
      + zone(Z3, "Корректировки заказчиков", "Замечания заказчиков по проектам и что с ними делаем.",
          qa(5, "Корректировки", "Все числа считает CRM по реестру корректировок. Вручную — статусы платных, ведомости и главная причина недели.", q5.pl, q5.body))
      + zone(Z4, "Заказчики", "Сложные случаи с заказчиками за неделю.",
          qa(6, "Ситуации с заказчиками", "«Нужна помощь» отмечайте честно: это сигнал, где нужна поддержка.", q6.pl, q6.body))
      + zone(Z5, "Мнение", "Вопросы к Полине: что улучшить, что отнимает время, какая нагрузка.",
          '<div class="loop5">' + loopHtml() + "</div>"
          + qa(7, "Что в общении с заказчиками можно улучшить?", "Мнение Полины: что мешает в работе с заказчиками.", q7.pl, q7.body)
          + qa(8, "Что отнимало больше всего времени на этой неделе?", "Задачи, которые можно делать быстрее или передать другому.", q8.pl, q8.body)
          + qa(9, "Нагрузка и самочувствие", "Блок видят только Полина, Яна и Дмитрий.", q9.pl, q9.body))
      + '<div id="ofr-tipb" class="tipb" hidden></div></div>';
    return h;
  }

  /* ---------- пересчёты (плашки, дни, «по заказчикам») ---------- */
  function recalc() {
    var root = document.getElementById("ofr");
    if (!root) return;
    /* вопрос 3: дни по строкам */
    var sum = 0, cnt = 0, nr = 0, iv = 0, by = {};
    root.querySelectorAll('.q3t .tr').forEach(function (tr) {
      var fd = tr.querySelector('[data-ofd$=":fd"]'), rd = tr.querySelector('[data-ofd$=":rd"]');
      var n = wd2(pd(fd && fd.value), pd(rd && rd.value));
      var c = tr.querySelector(".of-dn");
      if (c) { c.textContent = n === null ? "—" : n; c.className = "ov1 of-dn " + (n === null ? "n" : n <= 5 ? "ok5" : n <= 10 ? "w" : "r"); }
      if (n !== null) { sum += n; cnt++; var cust = tr.querySelector('[data-ofd$=":cust"]'); var k = cust && cust.value.trim() || "без заказчика"; (by[k] = by[k] || []).push(n); }
      var ret = tr.querySelector('[data-ofd$=":ret"]');
      if (ret && ret.value === "Нет") nr++;
      var ivOn = tr.querySelector('.iv .on');
      if (ivOn && ivOn.textContent === "Да") iv++;
    });
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set("of-q3n", M.tz_rows.length); set("of-q3avg", cnt ? Math.round(sum / cnt * 10) / 10 : "—");
    set("of-q3nr", nr + " из " + M.tz_rows.length); set("of-q3iv", iv + " из " + M.tz_rows.length);
    var ks = Object.keys(by).sort(function (p, q) { return avg(by[q]) - avg(by[p]); });
    function avg(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
    var byc = document.getElementById("of-q3byc");
    if (byc) byc.innerHTML = ks.length ? '<b class="bl">По заказчикам, в среднем:</b>' + ks.map(function (k) {
      var m = Math.round(avg(by[k]) * 10) / 10;
      return '<span class="dc3 ' + (m <= 5 ? "g" : m <= 10 ? "w" : "r") + '"><b>' + esc(k) + "</b> · " + m + " р.д.</span>";
    }).join("") : "";
    /* вопрос 2: плашки */
    var lost = 0;
    root.querySelectorAll('[data-ofd$=":l"]').forEach(function (e) { lost += +e.value || 0; });
    var evN = { rr: 0, q: 0, br: 0 };
    M.tz_events.forEach(function (e) { evN[e.kind] = (evN[e.kind] || 0) + 1; });
    /* вопрос 6: плашки */
    var helpN = 0;
    M.situations.forEach(function (r) { if (r.help === "Да") helpN++; });
    /* счётчик заполненности */
    var need = 0, done = 0;
    root.querySelectorAll(".rq").forEach(function (el) {
      if (el.closest("[hidden]") || el.offsetParent === null) return;
      need++;
      if (el.classList.contains("sg") || el.classList.contains("mcs")) { if (el.querySelector(".on")) done++; }
      else if (String(el.value).trim()) done++;
    });
    var cntEl = document.getElementById("ofr-cnt");
    if (cntEl) {
      cntEl.textContent = done + " из " + need;
      cntEl.className = "cnt" + (need && done >= need ? " ok" : "");
    }
  }

  /* ---------- события ---------- */
  function bind(root) {
    root.addEventListener("click", function (e) {
      var qb = e.target.closest && e.target.closest(".qb");
      if (qb) { qb.parentNode.classList.toggle("open"); return; }
      var db = e.target.closest && e.target.closest(".dtb");
      if (db && !RO) {
        var h = db.parentNode.querySelector(".dth");
        if (h) { try { h.showPicker(); } catch (err) { h.focus(); } }
        return;
      }
      var sgB = e.target.closest && e.target.closest(".sg button");
      if (sgB && !RO) {
        var grp = sgB.parentNode;
        grp.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
        sgB.classList.add("on");
        onField(grp);
        return;
      }
      var mc = e.target.closest && e.target.closest(".mc");
      if (mc && !RO) {
        mc.classList.toggle("on");
        onField(mc.parentNode);
        return;
      }
      var add = e.target.closest && e.target.closest("[data-ofadd]");
      if (add && !RO) { onAdd(add.getAttribute("data-ofadd")); return; }
      var del = e.target.closest && e.target.closest("[data-ofdel]");
      if (del && !RO) { onDel(del.getAttribute("data-ofdel")); }
    });
    root.addEventListener("input", function (e) { if (e.target.closest("[data-ofd]")) onField(e.target); });
    root.addEventListener("change", function (e) {
      var t = e.target;
      if (t.classList && t.classList.contains("dth")) {
        var p = t.parentNode.querySelector(".dtx");
        if (t.value && p) {
          var v = t.value.split("-");
          p.value = v[2] + "." + v[1] + "." + v[0].slice(2);
          onField(p);
        }
        return;
      }
      if (t.closest("[data-ofd]")) onField(t);
    });
    /* маска дд.мм.гг */
    root.addEventListener("input", function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains("dtx")) return;
      var d = t.value.replace(/\D/g, "").slice(0, 6), o = d.slice(0, 2);
      if (d.length > 2) o += "." + d.slice(2, 4);
      if (d.length > 4) o += "." + d.slice(4, 6);
      t.value = o;
    });
    /* тултипы */
    var tip = root.querySelector("#ofr-tipb");
    root.addEventListener("mouseover", function (e) {
      var el = e.target.closest && e.target.closest("[data-tip]");
      if (!el || !tip) { if (tip) tip.hidden = true; return; }
      tip.textContent = el.getAttribute("data-tip");
      tip.hidden = false;
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      var x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
      var y = r.bottom + 8;
      if (y + h > window.innerHeight - 8) y = r.top - h - 8;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
    root.addEventListener("mouseout", function (e) { if (tip && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-tip]"))) tip.hidden = true; });
  }

  function onField(el) {
    var key = el.getAttribute && el.getAttribute("data-ofd");
    var grp = el.closest && el.closest("[data-ofsg],[data-ofmc]");
    if (grp) {
      var gk = grp.getAttribute("data-ofsg") || grp.getAttribute("data-ofmc");
      if (grp.classList.contains("mcs")) {
        var vals = [].map.call(grp.querySelectorAll(".mc.on"), function (b) { return b.textContent; });
        if (gk === "q8:what") {
          var none = vals.indexOf("Ничего не мешало") >= 0;
          if (el.classList.contains("mc") && el.classList.contains("on") && el.textContent !== "Ничего не мешало" && none)
            vals = vals.filter(function (v) { return v !== "Ничего не мешало"; }), syncChips(grp, vals), none = false;
          if (el.classList.contains("mc") && el.classList.contains("on") && el.textContent === "Ничего не мешало")
            vals = ["Ничего не мешало"], syncChips(grp, vals), none = true;
          var nx = document.getElementById("of-q8none");
          if (nx) nx.hidden = !none;
          rebuildSubs(vals);
        }
        if (gk === "q7:hard") {
          var ex = document.getElementById("of-q7ex");
          if (ex) ex.querySelector(".lb2").innerHTML = vals.length > 1 ? "Один пример по каждой проблеме <small>заказчик и что произошло</small>" : "Один пример <small>заказчик и что произошло</small>";
        }
        setAns(gk, vals);
      } else {
        setAns(gk, el.textContent);
        if (gk === "q6:was") {
          var sx = document.getElementById("of-sitx");
          if (sx) sx.hidden = el.textContent !== "Были";
        }
        if (gk === "q5:ved") {
          var vx = document.getElementById("of-vedx");
          if (vx) vx.hidden = el.textContent !== "Нет, не по всем";
        }
        if (el.closest(".iv")) recalc();
      }
      recalc();
      return;
    }
    if (!key) return;
    var v = el.value;
    setAns(key, v);
    /* «Другое» рядом с селектом */
    if (el.tagName === "SELECT") {
      var oth = el.parentNode.querySelector(".oth1");
      if (oth) {
        var on = el.value === "Другое";
        oth.hidden = !on;
        oth.classList.toggle("rq", on);
        if (!on) { oth.value = ""; setAns(key + "Other", ""); }
      }
      if (el.classList.contains("hlp")) {
        var tr = el.closest(".tr");
        if (tr) tr.querySelectorAll(".hp").forEach(function (hp) { hp.hidden = el.value !== "Да"; });
      }
    }
    recalc();
  }
  function syncChips(grp, vals) {
    grp.querySelectorAll(".mc").forEach(function (b) { b.classList.toggle("on", vals.indexOf(b.textContent) >= 0); });
  }
  function rebuildSubs(vals) {
    var box = document.getElementById("of-q8subs");
    if (!box) return;
    var cur = {};
    box.querySelectorAll(".pr11").forEach(function (p) { cur[p.getAttribute("data-ofsub")] = true; });
    vals.filter(function (k) { return k !== "Ничего не мешало"; }).forEach(function (k) {
      var id = k === "Свой вариант" ? "Свой вариант" : k;
      if (cur[id]) return;
      var div = document.createElement("div");
      if (k === "Свой вариант") {
        div.className = "pr11"; div.setAttribute("data-ofsub", "Свой вариант");
        div.innerHTML = '<span class="lb2">Свой вариант</span><input class="in rq" data-ofd="q8:own" type="text" placeholder="Напишите, что ещё отнимало время и силы"' + (RO ? " disabled" : "") + ">";
      } else {
        div.className = "pr11"; div.setAttribute("data-ofsub", id);
        div.innerHTML = '<span class="lb2">Что именно не так ' + (LBL8[k] || k) + '? <small>(один случай)</small></span><div class="r11">'
          + '<input class="in rq" data-ofd="q8:w:' + k + ':case" type="text" placeholder="Например: искала ответ проектировщика в чате, потратила 20 минут"' + (RO ? " disabled" : "") + ">"
          + '<div class="sg rq t11" data-ofsg="q8:w:' + k + ':type"><button type="button"' + (RO ? " disabled" : "") + ">Ошибка</button><button type=\"button\"" + (RO ? " disabled" : "") + ">Хочу функцию</button></div></div>";
      }
      box.appendChild(div);
    });
    box.querySelectorAll(".pr11").forEach(function (p) {
      var id = p.getAttribute("data-ofsub");
      if (vals.indexOf(id) < 0) p.remove();
    });
  }

  /* ---------- добавление/удаление строк ---------- */
  function onAdd(kind) {
    if (kind === "tzrow") M.tz_rows.push({ id: "tmp" + Date.now(), n: "", customer: "", form_date: "", ready_date: "", returned: "", ivan: "" });
    else if (kind === "paidfix") M.paid_fixes.push({ id: "tmp" + Date.now(), n: "", customer: "", round_: "", sent: "", status: "", comment: "" });
    else if (kind === "sit") M.situations.push({ id: "tmp" + Date.now(), n: "", customer: "", what: "", other: "", did: "", to_: "", help: "", who: "", until_date: "" });
    else M.tz_events.push({ id: "tmp" + Date.now(), kind: kind, n: "", d: "", point: "", other: "", what: "", why: "", lost: "", step: "", step_date: "" });
    redraw(true);
  }
  function onDel(spec) {
    var p = spec.split("|"), table = p[0], id = p[1];
    M[table] = M[table].filter(function (r) { return String(r.id) !== String(id); });
    redraw(true);
  }
  function redraw(keepFocus) {
    var mount = document.getElementById("ofr-mount");
    if (!mount) return;
    var sc = window.scrollY;
    var openNo = [].map.call(mount.querySelectorAll(".qa.open"), function (q) { var n = q.querySelector(".no"); return n ? n.textContent.trim() : ""; });
    paintInto(mount);
    [].forEach.call(mount.querySelectorAll(".qa"), function (q) {
      var n = q.querySelector(".no");
      if (n && openNo.indexOf(n.textContent.trim()) >= 0) q.classList.add("open");
    });
    window.scrollTo(0, sc);
    scheduleSave();
  }
  function paintInto(mount) {
    mount.innerHTML = render();
    if (!mount._ofrBound) { mount._ofrBound = true; bind(mount); }
    recalc();
  }

  /* ---------- загрузка и точка входа ---------- */
  function load(start) {
    return api("/reports/ops2/friday?start=" + start).then(function (d) {
      D = d;
      RO = !(pos() === "ops" || pos() === "owner");
      M = { answers: JSON.parse(JSON.stringify(d.answers || {})),
            tz_rows: d.tz_rows || [], tz_events: d.tz_events || [],
            situations: d.situations || [], paid_fixes: d.paid_fixes || [] };
      var mount = document.getElementById("ofr-mount");
      if (mount) paintInto(mount);
    }, function (e) { toast(String(e)); });
  }

  window.DSOpsFriday = { load: load, redraw: redraw };
})();
