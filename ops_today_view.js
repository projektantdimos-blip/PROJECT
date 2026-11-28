var DOW=['вс','пн','вт','ср','чт','пт','сб'];
function pd(s){var a=s.split('-');return new Date(+a[0],a[1]-1,+a[2]);}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dm(s){var d=pd(s);return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0');}
function dmw(s){if(!s)return '—';return dm(s)+' ('+DOW[pd(s).getDay()]+')';}
function wd(a,b){var n=0,d=new Date(a);while(d<b){d.setDate(d.getDate()+1);var k=d.getDay();if(k&&k<6)n++;}return n;}
function addWd(d,n){var x=new Date(d);while(n>0){x.setDate(x.getDate()+1);var k=x.getDay();if(k&&k<6)n--;}return x;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function isToday(s){return s&&iso(pd(s))===iso(TODAY);}
function isLate(s){return s&&pd(s)<TODAY&&!isToday(s);}
var DIRTIP={tz:'ТЗ: от предоплаты до передачи проектировщикам. Сбор до 5 р.д., проверка Ивана 1 р.д.',cor:'Корректировка: замечания заказчика → реестр → Иван → исправления с ведомостью → заказчику.',app:'Согласование: проект у заказчика, ждём ответ 5 р.д., на 6-й звоним.',hand:'Сдача: проект согласован → «Работа сдана» → Александр выставляет счёт на остаток.'};
var DIRN={tz:'ТЗ',cor:'Корректировка',app:'Согласование',hand:'Сдача'};
function daysOf(r){return wd(pd(r.came),r.handed?pd(r.handed):TODAY);}
function zone(r){if(r.stage==='done')return 'done';var d=daysOf(r);return d>10?'pause':(d>5?'act':'norm');}
function openQ(p){return QS.filter(function(q){return q.p===p&&q.open;});}
function allQ(p){return QS.filter(function(q){return q.p===p;});}
function tz(p){for(var i=0;i<TZ.length;i++)if(TZ[i].p===p)return TZ[i];}

function tasks(){
  var L=[];
  QS.forEach(function(q){if(q.open&&q.side==='pr'){L.push({key:'q'+q.id,p:q.p,r:tz(q.p),dir:'tz',lvl:1,what:q.step||'Ответить проектировщику',tags:['stop'],tagt:['держит проектировщиков'],facts:[['Вопрос пришёл',dmw(q.date)],['Пункт ТЗ',q.item],['Суть',q.text]],due:q.sd||T0,q:q});}});
  QS.forEach(function(q){if(q.open&&q.side==='cu'){var r=tz(q.p);if(r&&r.sd&&(isLate(r.sd)||isToday(r.sd)))return;L.push({key:'q'+q.id,p:q.p,r:r,dir:'tz',lvl:2,what:'Добрать у заказчика: '+q.item,tags:['new'],tagt:['возврат заказчику'],facts:[['Вернули',dmw(q.date)],['Что не так',q.text]],due:q.sd||T0,q:q});}});
  TZ.forEach(function(r){
    if(r.stage==='done')return;
    var d=daysOf(r),late=isLate(r.sd),tod=isToday(r.sd);
    if(r.sd&&!late&&!tod&&(d<5||d>10))return;
    var t={key:'t'+r.p,p:r.p,r:r,dir:'tz',lvl:2,what:r.step||'Поставить следующий шаг',tags:[],tagt:[],facts:[],due:r.sd};
    if(late){t.lvl=1;}
    if(!late&&!tod&&d===5){t.what='Решить: передать сегодня или назвать причину';t.due=T0;}
    if(d>=6&&d<=10){t.lvl=1;t.tags.push('warn');t.tagt.push('сверх нормы');}
    if(d===5){t.tags.push('warn');t.tagt.push('последний день нормы');}
    if(d>10&&r.last&&wd(pd(r.last),TODAY)<5)return;
    if(d>10){t.tags.push('pause');t.tagt.push('на паузе');}
    if(r.stage==='new'){t.tags.push('new');t.tagt.push('новое из продаж');t.facts.push(['Предоплата по КП',r.kp+' · '+dmw(r.came)]);}
    t.facts.push(['На сборе ТЗ',d+' р.д. · норма 5']);
    if(r.stage==='check')t.facts.push(['У Ивана с',dmw(r.ivan)+' · норма 1 р.д.']);
    if(r.stage==='visit'&&r.visit)t.facts.push(isToday(r.visit.d)?['Выезд','сегодня · '+r.visit.who]:['Выезд был',dmw(r.visit.d)+' · информации нет '+wd(pd(r.visit.d),TODAY)+' р.д.']);
    if(r.blk)t.facts.push(['Тормозит',r.blk]);
    L.push(t);
  });
  COR.forEach(function(c){var late=isLate(c.sd),tod=isToday(c.sd);if(!late&&!tod)return;var t={key:c.dir+c.p,p:c.p,r:c,dir:c.dir,lvl:late?1:c.lvl,what:c.what,tags:[],tagt:[],facts:c.facts,due:c.sd};
    if(c.dir==='app'&&c.lvl===1){t.tags.push('warn');t.tagt.push('сверх нормы');}
    if(c.dir==='cor'&&/платн/.test(c.what)){t.tags.push('money');t.tagt.push('платная');}
    L.push(t);});
  L=L.filter(function(t){var m=MV[t.key];return !(m&&pd(m.d)>TODAY);});
  DONE.forEach(function(x){L.forEach(function(t){if(t.key===x.key){t.done=x;}});});
  DONE.forEach(function(x){if(!L.some(function(t){return t.key===x.key;}))L.push({key:x.key,p:x.p,r:tz(x.p)||corOf(x.p),dir:x.dir,lvl:x.lvl,what:x.what,tags:[],tagt:[],facts:[],done:x});});
  return L;
}
function corOf(p){for(var i=0;i<COR.length;i++)if(COR[i].p===p)return COR[i];}
var ACTS={tz:['Позвонила','Написала','Получила данные','Ответила проектировщику','Отдала Ивану','Передала в проектирование','Другое'],
 cor:['Внесла в реестр','Передала Ивану','Отправила заказчику','Передала Александру','Позвонила','Написала','Другое'],
 app:['Позвонила','Написала','Получила замечания','Согласовали','Не дозвонилась','Другое'],
 hand:['Отметила «Работа сдана»','Другое']};
var TERM=['Передала в проектирование','Отметила «Работа сдана»'];
var MVWHY=['заказчик попросил','жду коллегу','не успела','другое'];
var PROC={
 tz:{t:'ТЗ',c:'bu',steps:['Пришла предоплата по КП','Форма ТЗ заказчику — в тот же день','Сбор данных — до 5 р.д.','Проверка Ивана — 1 р.д.','Передача проектировщикам'],note:'6–10 р.д. на сборе — шаг каждый день. С 11-го р.д. ТЗ уходит на паузу: раз в неделю спрашиваем, актуально ли.'},
 cor:{t:'Корректировки',c:'o',steps:['Пришли замечания','В реестр — в день получения','Передать Ивану','Исправления + ведомость замечаний','Отправить заказчику'],note:'Круги 1 и 2 бесплатно. 3-й круг и замена оборудования вне ТЗ — платно: цену и счёт ставит Александр, работу начинаем после оплаты.'},
 app:{t:'Согласование проектов',c:'v',steps:['Проект отправлен заказчику','Ждём ответ — 5 р.д.','На 6-й р.д. звоним','Согласован или есть замечания'],note:'Есть замечания — они уходят в «Корректировки». Согласован — проект переходит в «Сдачу».'},
 hand:{t:'Сдача проектов',c:'gr',steps:['Проект согласован','Отметить «Работа сдана»','У Александра задача: счёт на остаток'],note:'Заказчик согласовал — отметьте «Работа сдана». Дальше счёт выставляет Александр.'}
};
var TAGTIP={stop:'<b>Красный</b> — из-за этой задачи стоит работа других людей. Делать первой.',warn:'<b>Оранжевый</b> — срок по норме вышел или выходит сегодня.',money:'<b>Жёлтый</b> — вопрос денег: решает Александр.',new:'<b>Голубой</b> — новое: только что пришло, нужен первый шаг.',pause:'<b>Серый</b> — на паузе: раз в неделю проверить, актуально ли.'};
function nextOpts(){return [[iso(addWd(TODAY,1)),'завтра'],[iso(addWd(TODAY,2)),'+2 р.д.'],[iso(addWd(TODAY,3)),'+3 р.д.']];}
function th(cls,cols){return '<div class="'+cls+' th">'+cols.map(function(c){return '<div>'+c+'</div>';}).join('')+'</div>';}
function dirH(t){var d=t.dir||'tz';return '<span class="dir '+d+'" data-tip="'+DIRTIP[d]+'">'+DIRN[d]+'</span>';}
function doneForm(t){
  var e=ED||{};var acts=ACTS[t.dir||'tz'];
  var h='<div class="fpart"><span class="sth'+(e.tried&&!e.a?' rq':'')+'">Что сделала *</span><span class="opts'+(e.tried&&!e.a?' need':'')+'">'+acts.map(function(a){return '<button type="button" class="op'+(e.a===a?' on':'')+'" data-da="'+a+'">'+a+'</button>';}).join('')+'</span></div>';
  if(TERM.indexOf(e.a)<0){
    h+='<div class="fpart"><span class="sth'+(e.tried&&(!e.s||!e.d)?' rq':'')+'">Следующий шаг и дата *</span><input type="text" id="dns" value="'+esc(e.s!=null?e.s:'')+'" placeholder="Например: позвонить заказчику по ТЗ" aria-label="Следующий шаг"><span class="opts'+(e.tried&&!e.d?' need':'')+'">'+nextOpts().map(function(o){return '<button type="button" class="op'+(e.d===o[0]?' on':'')+'" data-dd="'+o[0]+'">'+o[1]+' <small>'+dm(o[0])+'</small></button>';}).join('')+'<input type="date" id="dnd" class="dti" min="'+T0+'" value="'+(e.d&&nextOpts().every(function(o){return o[0]!==e.d;})?e.d:'')+'" aria-label="Другая дата шага"></span></div>';
  } else h+='<div class="fpart"><span class="sb">'+(e.a==='Передала в проектирование'?'Откроется окно передачи: дата формы ТЗ и проверка Ивана.':'Александр получит задачу выставить счёт на остаток.')+'</span></div>';
  h+='<div class="fbtn"><button type="button" class="b gr sm" data-dsave="'+t.key+'">Сохранить</button><button type="button" class="ex" data-dcancel>отмена</button></div>';
  return h;
}
function moveForm(t){
  var e=ED||{},o=[[iso(addWd(TODAY,1)),'завтра'],[iso(addWd(TODAY,2)),'послезавтра']],other=e.d&&o.every(function(x){return x[0]!==e.d;});
  return '<div class="mvf"><span class="mvk">На когда</span>'+o.map(function(x){return '<button type="button" class="op'+(e.d===x[0]?' on':'')+'" data-dd="'+x[0]+'">'+x[1]+'</button>';}).join('')+'<input type="date" id="dnd" class="dti'+(other?' on':'')+'" min="'+iso(addWd(TODAY,1))+'" value="'+(other?e.d:'')+'" aria-label="Другой день">'+
   '<span class="mvk" style="margin-left:10px">Причина</span>'+MVWHY.map(function(w){return '<button type="button" class="op'+(e.w===w?' on':'')+(e.tried&&!e.w?' needop':'')+'" data-mw="'+w+'">'+w+'</button>';}).join('')+
   '<span class="mvbtn"><button type="button" class="b p sm" data-msave="'+t.key+'">Перенести'+(e.d?' на '+dm(e.d):'')+'</button><button type="button" class="ex" data-dcancel>отмена</button></span></div>';
}
// Одна причина «почему сейчас»: текст и смысл цвета (r — вас ждут или срок прошёл, o — вышла норма, b — новое, g — деньги, n — прочее)
function reason(t){
  var r=t.r||{};
  if(t.q&&t.q.side==='pr')return ['r','Проектировщик ждёт ответа с '+dmw(t.q.date)];
  if(t.q)return ['b','Заказчик вернул форму: '+t.q.text.charAt(0).toLowerCase()+t.q.text.slice(1)];
  if(t.due&&isLate(t.due)){var ex=t.dir!=='tz'?(r.why||''):(r.blk||'');return ['r','Шаг пропущен'+(ex?' · '+ex.charAt(0).toLowerCase()+ex.slice(1):'')];}
  if(t.dir!=='tz')return [r.tone||'n',r.why||''];
  var d=daysOf(r);
  if(r.stage==='visit'&&r.visit&&!isToday(r.visit.d)&&!r.visit.info)return ['r','Выезд был '+dmw(r.visit.d)+', материалов нет '+wd(pd(r.visit.d),TODAY)+' р.д.'];
  if(r.stage==='check'&&r.ivan){var n=wd(pd(r.ivan),TODAY);if(n>1)return ['o','Иван проверяет ТЗ '+n+' р.д. при норме 1'];}
  if(d>10)return ['n','ТЗ на паузе: собирается '+d+' р.д.'];
  if(d>5)return ['o','ТЗ собирается '+d+' р.д. при норме 5'];
  if(d===5)return ['o','Последний день нормы: 5-й р.д. сбора ТЗ'];
  if(r.stage==='new')return ['b','Пришла предоплата по КП '+r.kp+': форму ТЗ отправляем в тот же день'];
  if(r.stage==='visit'&&r.visit&&isToday(r.visit.d))return ['b','Выезд сегодня, едет '+r.visit.who+'. Материалы — в тот же день'];
  if(r.stage==='check')return ['n','ТЗ у Ивана на проверке с '+dmw(r.ivan)];
  return ['n',r.blk?'Тормозит: '+r.blk.toLowerCase():'Шаг по плану на сегодня'];
}
function dueW(d){
  if(!d)return '<span class="sb">—</span>';
  var late=isLate(d),tod=isToday(d),n=late?wd(pd(d),TODAY):wd(TODAY,pd(d));
  var w=tod?'сегодня':late?(n===1?'вчера':n+' р.д. назад'):(n===1?'завтра':'через '+n+' р.д.');
  return '<span class="dw '+(late?'late':tod?'tod':'')+'" title="'+dmw(d)+'">'+w+'</span>';
}
function projH(t){var r=t.r||{};return '<div class="pjl"><span class="pj">№'+esc((tz(t.p)||{}).number||t.p)+'</span>'+(t.noDir?'':dirH(t))+'</div>'+(r.cu?'<span class="cul">'+esc(r.cu)+' · '+esc(r.ob)+', '+esc(r.wk)+'</span>':'');}
function taskRow(t){
  if(t.done)return '<div class="tk dn"><div>'+projH(t)+'</div><div><span class="what">✓ '+esc(t.done.a)+'</span><span class="rs t-n">'+(t.done.s?'Дальше: '+esc(t.done.s):(t.done.a==='Отметила «Работа сдана»'?'Дальше: Александр выставит счёт':'Дальше: у проектировщиков'))+'</span></div><div>'+(t.done.d?dueW(t.done.d):'<span class="sb">—</span>')+'</div><div><span class="sb">в итоге дня</span></div></div>';
  var op=ED&&ED.key===t.key,rs=reason(t);
  var details=(t.facts||[]).map(x=>x.join(': ')).join(' · ');
  var h='<div class="tk'+(op?' ed':'')+'" title="'+esc(details)+'"><div>'+projH(t)+'</div><div><span class="what">'+esc(t.what)+'</span>'+(rs[1]?'<span class="rs t-'+rs[0]+'">'+esc(rs[1])+'</span>':'')+'</div><div>'+dueW(t.due)+'</div><div class="acts2"><button type="button" class="b bl sm" data-do="'+t.key+'" data-tip="Отметить, что сделали, и поставить следующий шаг с датой.">Сделано</button><button type="button" class="mvl" data-mv="'+t.key+'" data-tip="Новая дата и причина. Переносы видны в итоге дня.">перенести</button></div></div>';
  if(op)h+='<div class="tkf">'+(ED.mode==='move'?moveForm(t):doneForm(t))+'</div>';
  return h;
}
var TKH=['Проект','Что сделать и почему','Когда сделать','Отметить'];
function mins(hm){var a=hm.split(':');return +a[0]*60+(+a[1]);}
function dur(m){if(m<60)return m+' мин';var h=Math.floor(m/60),r=m%60;return h+' ч'+(r?' '+r+' мин':'');}
function incRow(x,i){
  var w=Math.max(0,NOWM-mins(x.t));
  var sub='Звонил в '+x.t+(x.p?' · проект №'+esc(x.p):' · проекта нет')+(x.tr&&!x.done?' · не дозвонилась в '+x.tr:'');
  var h='<div class="crow'+(i%2?' z':'')+(x.done?' done':'')+'"><div><div class="ct"><span class="cnb'+(!x.done&&w>30?' late':'')+'">'+(i+1)+'</span><span class="ctx">'+esc(x.who)+' · '+esc(x.ph)+'</span></div><div class="cs">'+sub+'</div></div><div class="cago">'+(x.done?'<span class="sb">—</span>':'<span class="agop">'+dur(w)+' назад</span>')+'</div><div class="cbtns">';
  if(x.done)h+='<span class="cres">'+esc(x.done)+'</span><button type="button" class="b ed2" data-incundo="'+esc(x.id)+'">Изменить</button>';
  else h+=(x.tr?'<span class="cres f">Не дозвонилась</span>':'')+'<button type="button" class="b pp" data-inc="'+esc(x.id)+'|ok" data-tip="Поговорили с заказчиком. Откроется окно: итог разговора и что дальше — решили сами или передать вопрос коллеге.">Перезвонила</button>'+(x.tr?'':'<button type="button" class="b rr" data-inc="'+esc(x.id)+'|fail" data-tip="Не взяли трубку. Звонок останется в списке, перезвоните ещё раз.">Не дозвонилась</button>')+'<button type="button" class="b pa" data-inc="'+esc(x.id)+'|toSasha" data-tip="Звонок по продажам: новый заказчик, цена, КП, оплата. Звонок уйдёт Александру в его «Пропущенные входящие», он перезвонит сам.">→ Александру</button>';
  return h+'</div></div>';
}
var FST=['Ждём ответ','Напомнила','Ответ получен','Передала заказчику'];
function fwdRow(f){
  var cl=f.state==='Передала заказчику';
  return '<div class="fw'+(cl?' dn':'')+'"><div><span class="whoto"><span class="av" style="background:'+(AVC[f.to]||'#6b7686')+'">'+esc(f.to[0])+'</span>'+esc(f.to)+'</span></div><div><span class="nm">'+esc(f.who)+'</span>'+(f.p?'<span class="ob">проект №'+esc(f.p)+'</span>':'')+'</div><div><span class="txt">'+esc(f.q)+'</span><span class="srcl">из: '+esc(f.src||'—')+'</span></div><div><span class="dt">'+(f.since===T0?'сегодня':dmw(f.since))+'</span><span class="sb">в '+f.st+'</span></div><div class="fstc">'+(cl?'<span class="fsp ok">✓ Передала заказчику</span>':f.ans?'<span class="fsp ans">Ответ получен</span><button type="button" class="b sm pp" data-fclose="'+f.id+'">Передала заказчику</button>':'<span class="fsp w">'+(f.rem?'Напомнила '+esc(f.rem):'Ждём ответ')+'</span>'+(f.rem||!f.canRemind?'':'<button type="button" class="b sm ghost" data-frem="'+f.id+'">Напомнить</button>'))+'</div><div>'+(f.ans?'<span class="ans">'+esc(f.ans)+'</span><span class="sb">'+esc(f.to)+' · '+esc(f.at||'')+'</span>':'<span class="sb">ответа пока нет</span>')+'</div></div>';
}
var TF='all',SUMOPEN=false;
function waitM(f){var m=f.since===T0?NOWM-mins(f.st):(18*60-mins(f.st))+(NOWM-9*60)+(wd(pd(f.since),TODAY)-1)*540;return Math.max(0,m);}
function myRow2(x){var me=x.from==='сама';return '<div class="my2'+(x.ok?' dn':'')+'"><div><button type="button" class="cb'+(x.ok?' on':'')+'" data-my="'+x.id+'" aria-label="Отметить выполненной">'+(x.ok?'✓':'')+'</button></div><div><span class="mt">'+esc(x.t)+'</span>'+(x.isNew&&!x.ok?'<span class="newp">новая от коллеги</span>':'')+'</div><div>'+(me?'<span class="sb">я сама</span>':'<span class="whoto sm"><span class="av" style="background:'+(AVC[x.from]||'#6b7686')+'">'+esc(x.from[0])+'</span>'+esc(x.from)+'</span>')+'</div><div>'+dueW(x.sd)+'</div></div>';}
function renderToday(){
  var L=tasks(),open=L.filter(function(t){return !t.done;}),dn=L.filter(function(t){return t.done;});
  var b1=open.filter(function(t){return t.lvl===1;});
  var incO=INC.filter(function(x){return !x.done;}),incL=incO.reduce(function(m,x){return Math.max(m,NOWM-mins(x.t));},0);
  var fwO=FWD.filter(function(f){return f.state!=='Передала заказчику';}),fwLong=fwO.filter(function(f){return !f.ans&&waitM(f)>120;}).length,fwA=fwO.filter(function(f){return !!f.ans;}).length;
  var nQ=b1.filter(function(t){return t.q;}).length,nOver=b1.filter(function(t){return t.tagt.indexOf('сверх нормы')>=0;}).length,nLate=b1.filter(function(t){return isLate(t.due);}).length;
  var myT=MY.filter(function(x){return pd(x.sd)<=TODAY;}),allT=open.length+dn.length+myT.length,doneT=dn.length+myT.filter(function(x){return x.ok;}).length;
  var TA=TZ.filter(function(r){return r.stage!=='done';}),zN=TA.filter(function(r){return zone(r)==='norm';}).length,zA=TA.filter(function(r){return zone(r)==='act';}).length,zP=TA.filter(function(r){return zone(r)==='pause';}).length;
  var hw=TZ.filter(function(r){return r.handed&&pd(r.handed)>=WEEK;}),avg=hw.length?Math.round(hw.reduce(function(x,r){return x+daysOf(r);},0)/hw.length*10)/10:0;
  var corPaid=open.filter(function(t){return t.dir==='cor'&&t.tagt.indexOf('платная')>=0;}).length,corLate=open.filter(function(t){return t.dir==='cor'&&isLate(t.due);}).length;
  var appLong=COR.filter(c=>c.dir==='app'&&c.lvl===1).length,toHand=COR.filter(c=>c.dir==='hand').length;
  var bar=function(parts){var tot=parts.reduce(function(x,p){return x+p[0];},0)||1;return '<div class="kbar">'+parts.map(function(p){return p[0]?'<i style="width:'+(p[0]/tot*100)+'%;background:'+p[1]+'"></i>':'';}).join('')+'</div>';};
  var h='<div class="g4">'+
   '<div class="kpi" style="background:#2c4a73"><span class="lb">Мой день</span><b>'+doneT+' <small>из '+allT+' сделано</small></b>'+bar([[doneT,'#ffffff'],[allT-doneT,'rgba(255,255,255,.25)']])+'<span class="ds">Осталось '+(allT-doneT)+' · из них горит '+b1.length+'</span></div>'+
   '<div class="kpi" style="background:#4a78b8"><span class="lb">ТЗ на сборе</span><b>'+TA.length+' <small>ТЗ в работе</small></b>'+bar([[zN,'#ffffff'],[zA,'#ffc98a'],[zP,'rgba(255,255,255,.35)']])+'<span class="ds">в норме '+zN+' · дольше нормы '+zA+' · на паузе '+zP+'<br>передано за неделю: '+hw.length+' · в среднем '+avg+' р.д.</span><a class="klink" href="'+URL_TZ+'" target="_parent" rel="noopener">Открыть реестр ТЗ →</a></div>'+
   '<div class="kpi" style="background:#c4722e"><span class="lb">Корректировки</span><b>—</b><span class="ds">Ожидаем подключение Google-таблицы</span></div>'+
   '<div class="kpi" style="background:#7a64b8"><span class="lb">Согласование и сдача</span><b>'+CORREG.atCust+' <small>проекта у заказчиков</small></b><span class="ds">ждут ответа дольше 5 р.д.: '+appLong+'<br>согласованы, ждут отметки «Работа сдана»: '+toHand+'</span><span class="klink off"></span></div>'+
   '</div>';
  // Пропущенные звонки
  h+='<div class="blk mc k-r"><div class="bh mch" data-tip="Заказчики звонили, а вы не ответили. Перезвонить в течение 30 минут — раньше всего остального. Сообщения сюда не попадают: на них вы отвечаете в мессенджерах."><span class="bt"><span class="hq">Пропущенные звонки</span><span class="ccnt">'+incO.length+'</span></span><small>перезвонить в течение 30 минут</small></div><div class="crow th"><div>Кто звонил</div><div>Сколько ждёт</div><div>Что сделать</div></div>'+INC.map(incRow).join('')+'</div>';
  if(MSG.length)h+='<div class="msgbar" data-tip="На сообщения вы отвечаете в мессенджерах. Здесь только сигнал: сообщение ждёт ответа дольше рабочего дня."><span class="mbk">Сообщения без ответа дольше рабочего дня<span class="mbn">'+MSG.length+'</span></span><span class="mbl">'+MSG.map(function(m){return '<b>'+esc(m.who)+'</b> · '+esc(m.ch)+', с '+esc(m.since);}).join('<i>·</i>')+'</span><a class="mbgo" href="./index.html#/chat" target="_parent" rel="noopener">Открыть мессенджеры →</a></div>';
  // Вопросы, переданные коллегам
  var col=th('fw',['Кому','Заказчик','Вопрос','Когда передала','Что сейчас','Ответ коллеги'])+FWD.map(fwdRow).join('')+'<div class="foot2"><button type="button" class="b sm ghost" id="addfw">+ Передать вопрос из сообщения</button></div>';
  h+='<div class="blk k-o"><div class="bh ho" data-tip="Вопросы заказчиков, которые вы передали Ивану, Александру или Дмитрию. Коллега видит вопрос в своей «Сегодня» и отвечает в задаче за 2 часа. Ответ появляется здесь сам. Вопрос закрыт, только когда ответ у заказчика."><span class="bt"><span class="hq">Вопросы, переданные коллегам</span><span class="ccnt">'+fwO.length+'</span></span><small>коллега отвечает за 2 часа · закрыт, когда ответ у заказчика</small></div><div class="tw2">'+col+'</div></div>';
  // Задачи по проектам: сверху «Горит» из всех направлений, ниже группы по направлениям
  var byDue=function(x,y){return (x.due||'9')<(y.due||'9')?-1:((x.due||'9')>(y.due||'9')?1:0);};
  var U=b1.slice().sort(byDue),D=dn;
  var GS={tz:'сбор ТЗ до 5 р.д.',cor:'замечания — в реестр в день получения',app:'ответ заказчика до 5 р.д.',hand:'после отметки Александр выставит счёт'};
  var body=th('tk',TKH);
  if(U.length)body+='<div class="gb r">Горит · '+U.length+'<small>вас ждут или срок прошёл</small></div>'+U.map(taskRow).join('');
  ['tz','cor','app','hand'].forEach(function(k){var S=open.filter(function(t){return t.lvl!==1&&t.dir===k;}).sort(byDue);
    if(S.length)body+='<div class="gb d-'+k+'" data-tip="'+esc(PROC[k].note)+'">'+PROC[k].t+' · '+S.length+'<small>'+GS[k]+'</small></div>'+S.map(function(t){t.noDir=true;return taskRow(t);}).join('');});
  if(!open.length)body+='<div class="empty">На сегодня задач нет.</div>';
  if(D.length)body+='<div class="gb gr">Уже сделано · '+D.length+'</div>'+D.map(taskRow).join('');
  h+='<div class="blk k-b"><div class="bh hb" data-tip="Задачи по проектам на сегодня. Сверху — то, что горит, из всех направлений. Ниже — по порядку: ТЗ, корректировки, согласование, сдача."><span class="bt"><span class="hq">Задачи по проектам</span></span><small>сверху то, что горит</small></div><div class="tw2">'+body+'</div></div>';
  // Мои задачи + Итог дня — две половинки
  var myO=MY.filter(function(x){return !x.ok;}).length,fromC=MY.filter(function(x){return x.from!=='сама'&&!x.ok;}).length,newC=MY.filter(function(x){return x.isNew&&!x.ok;}).length;
  var MF=[['all','Все',myO],['col','От коллег',fromC],['me','Свои',MY.filter(function(x){return x.from==='сама'&&!x.ok;}).length]];
  var myList=MY.filter(function(x){return MYF==='all'||(MYF==='col'?x.from!=='сама':x.from==='сама');});
  var my='<div class="blk k-t"><div class="bh ht" data-tip="Ваши задачи и задачи от коллег. Коллега ставит вам задачу в CRM — она сразу появляется здесь с пометкой «новая от коллеги». Когда отметите «Готово», коллега увидит это у себя."><span class="bt"><span class="hq">Мои задачи</span><span class="ccnt">'+myO+'</span></span><small>'+(newC?newC+' новых от коллег':'свои и от коллег')+'</small></div><div class="fbar">'+MF.map(function(f){return '<button type="button" class="ft2'+(MYF===f[0]?' on':'')+'" data-myf="'+f[0]+'">'+f[1]+' <span>'+f[2]+'</span></button>';}).join('')+'</div>'+th('my2',['Готово','Задача','От кого','Срок'])+(myList.length?myList.map(myRow2).join(''):'<div class="empty">Задач нет.</div>')+'<div class="foot2"><button type="button" class="b sm ghost" id="addmy2">+ Добавить задачу</button></div></div>';
  h+='<div class="g2h">'+my+dayTotal(L,dn)+'</div>';
  return h;
}
var THT={
 'crow|Кто звонил':'Заказчик из CRM, телефон, время звонка и проект.','crow|Сколько ждёт':'Сколько прошло с пропущенного звонка. Перезвонить нужно за 30 минут.','crow|Что сделать':'«Перезвонила» — итог разговора и что дальше. «Не дозвонилась» — звонок остаётся. «→ Александру» — звонок по продажам, он перезвонит сам.',
 'fw|Кому':'Коллега, которому передан вопрос.','fw|Что сейчас':'Когда коллега ответил в задаче, статус «Ответ получен» ставится сам. Ждёте дольше 2 часов — нажмите «Напомнить». Вам остаётся одно: отметить «Передала заказчику».',
 'tk|Когда сделать':'«Сегодня» — сделать сегодня. «Вчера» или «2 р.д. назад» — уже опоздали. Наведите на слово — увидите дату.','tk|Отметить':'«Сделано» — что сделали и следующий шаг. «перенести» — новая дата и причина. Для переноса укажите причину.',
 'my2|Готово':'Нажмите, чтобы отметить задачу выполненной. Отметку можно снять.','my2|Задача':'Что сделать.','my2|От кого':'Кто поставил задачу: вы сами или коллега.','my2|Срок':'До какого дня.',
 'ic|Время звонка':'Когда звонили и не дозвонились до вас.','ic|Кто звонил':'Заказчик из CRM и номер телефона.','ic|Проект':'Проект заказчика, если он есть в CRM.',
 'ic|Ждёт':'Сколько прошло с обращения. Норма — 30 минут. <b>Зелёный</b> — в норме, <b>красный</b> — дольше.','ic|Действия':'«→ Александру» — звонок по продажам, он перезвонит сам. «Перезвонила» — окно с итогом разговора: решили сами или передали вопрос коллеге. «Не дозвонилась» — звонок остаётся в списке.',
 'fw|Кому передала':'Коллега, которому передан вопрос.','fw|Заказчик':'Чей вопрос и по какому проекту.','fw|Вопрос':'Суть вопроса одной строкой и откуда он пришёл: звонок, мессенджер, почта.','fw|Когда передала':'Дата и время передачи. Норма ответа — 2 часа.',
 'fw|Статус':'Ставите сами: Ждём ответ → Напомнила (если прошло 2 часа) → Ответ получен → Передала заказчику. Закрыт только последний.','fw|Ответ коллеги':'Коллега пишет ответ в своей задаче в «Сегодня» — ответ появляется здесь сам. Отвечать голосом или в чате нельзя: ответ должен остаться в задаче.',
 'tk|Проект':'Номер проекта, направление и заказчик: объект, вид работ.','tk|Что сделать и почему':'Сверху — что сделать: кому и о чём. Ниже — почему это нужно сделать сейчас.',
 'tk|Срок':'Когда нужно было сделать шаг. Наведите на слово — увидите дату.','tk|Действие':'«Сделано» — что сделали и следующий шаг. «перенести» — новая дата и причина. Для переноса укажите причину.',
 'my|Готово':'Нажмите, чтобы отметить задачу выполненной. Отметку можно отменить.','my|Задача':'Что сделать.','my|Кто поставил':'Вы сами или коллега.','my|Срок':'До какого дня.',
 'tom|Проект':'Номер и направление.','tom|Заказчик':'Заказчик и вид работ.','tom|Шаг':'Что запланировано на завтра.','tom|Дата':'Дата шага.'
};
var KTIP={'Мой день':'Сколько задач на сегодня уже сделано: задачи по проектам и ваши задачи.','ТЗ на сборе':'Все ТЗ, которые вы собираете. Норма — 5 р.д. с прихода из продаж. С 11-го р.д. ТЗ уходит на паузу.','Корректировки':'Корректировки в работе по реестру корректировок: сколько просрочено, по скольким нет ведомости от проектировщиков, сколько платных ждут решения Александра.','Согласование и сдача':'Проекты, отправленные заказчикам на согласование. Ответ — 5 р.д. Согласованные проекты нужно отметить «Работа сдана».'};
function dayTotal(L,dn){
  var cnt=function(a){return dn.filter(function(t){return t.done.a===a;}).length;};
  var self=INC.filter(function(x){return x.done==='Перезвонила, решила сама';}).length,pass=INC.filter(function(x){return x.done&&x.done.toLowerCase().includes('передала');}).length;
  var tzL=L.filter(function(t){return t.dir==='tz';}),tzD=tzL.filter(function(t){return t.done;}).length;
  var fwN=FWD.filter(function(f){return f.since===T0;}).length,fwC=FWD.filter(function(f){return f.state==='Передала заказчику';}).length,pj=L.length;
  var rows=[
   ['Пропущенные звонки разобраны',(self+pass)+' из '+INC.length],
   ['Вопросы коллегам: передано · закрыто',fwN+' · '+fwC],
   ['Задачи по проектам сделаны',dn.length+' из '+pj],
   ['Передано в проектирование',cnt('Передала в проектирование')],
   ['Отмечено «Работа сдана»',cnt('Отметила «Работа сдана»')],
   ['Перенесено задач',movesToday]
  ];
  return '<div class="blk k-s"><div class="bh hs" data-tip="Считается сам из того, что вы отметили за день. Это сводка для вас: что сделано, что передано коллегам, что перенесено. Ничего заполнять не нужно."><span class="bt"><span class="hq">Итог дня</span></span><small>сводка вашего дня</small></div><div class="sum"><div class="sh"><span>Что сделано за день</span><span>Сколько</span></div>'+rows.map(function(r){return '<div><span>'+r[0]+'</span><b>'+r[1]+'</b></div>';}).join('')+'</div></div>';
}

