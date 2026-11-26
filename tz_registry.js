'use strict';
(function () {
var TODAY, WEEK, T0, TZ=[], QS=[], editable=false, employee='', filt='Все', qq='', ED=null, flashP=0, busy=false;
var host=parent!==window && parent.DS;
var $=function(id){return document.getElementById(id);};
var DOW=['вс','пн','вт','ср','чт','пт','сб'];
function pd(s){var a=(s||'').split('-');return new Date(+a[0],a[1]-1,+a[2]);}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dm(s){if(!s)return '—';var d=pd(s);return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0');}
function dmw(s){if(!s)return '—';return dm(s)+' ('+DOW[pd(s).getDay()]+')';}
function wd(a,b){var n=0,d=new Date(a);while(d<b){d.setDate(d.getDate()+1);var k=d.getDay();if(k&&k<6)n++;}return n;}
function addWd(d,n){var x=new Date(d);while(n>0){x.setDate(x.getDate()+1);var k=x.getDay();if(k&&k<6)n--;}return x;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function isToday(s){return s&&iso(pd(s))===iso(TODAY);}
function isLate(s){return s&&pd(s)<TODAY&&!isToday(s);}
var STAGE={
 'new':['Новое из продаж','#e1eaf6','#1d4f9e','Пришла предоплата по КП, проект попал к вам сам. Задача — в тот же день отправить заказчику форму ТЗ.'],
 'collect':['Сбор данных','#f6ead0','#7a5300','Форма ТЗ у заказчика или посредника, собираем данные.'],
 'visit':['Выезд на объект','#ebe6f6','#3b2d66','Без выезда ТЗ не собрать. Дату и кто едет видно под меткой.'],
 'check':['Проверка у Ивана','#dcefe6','#1f6b46','ТЗ собрано, Иван проверяет перед передачей. Норма — 1 р.д.'],
 'done':['Передано в проектирование','#d9efe0','#17653a','ТЗ у проектировщиков. Дни на сборе остановились.']
};
var BLOCK=['','Жду данные от заказчика','Заказчик не отвечает','Данные у посредника','Жду выезд на объект','Жду информацию с выезда','Жду ответ Ивана','Правлю ТЗ','Жду ответ проектировщика','Жду оплату','Нет папки на сервере','Другое'];

function daysOf(r){return r.came ? wd(pd(r.came),r.handed?pd(r.handed):TODAY) : 0;}
function zone(r){if(r.stage==='done')return 'done';var d=daysOf(r);return d>10?'pause':(d>5?'act':'norm');}
function openQ(p){return QS.filter(function(q){return q.p===p&&q.open;});}
function allQ(p){return QS.filter(function(q){return q.p===p;});}
function tz(p){for(var i=0;i<TZ.length;i++)if(TZ[i].p===p)return TZ[i];}

/* ---------- шапка ---------- */
function nextOpts(){var o=[[iso(addWd(TODAY,1)),'завтра'],[iso(addWd(TODAY,2)),'+2 р.д.'],[iso(addWd(TODAY,3)),'+3 р.д.']];return o;}
function kpi(c,l,v,d){return '<div class="kpi" style="background:'+c+'"><span class="lb">'+l+'</span><b>'+v+'</b><span class="ds">'+d+'</span></div>';}

/* ---------- ТЗ ---------- */
var HT={'Проект':'Номер проекта и номер КП, из которого он пришёл. Проект появляется здесь сам, когда приходит предоплата по КП или начинается сбор данных по заказу без аванса.','Заказчик':'Кто заказчик, объект, вид работ и кто заполняет форму ТЗ: сам заказчик или посредник.','Пришло из продаж':'Дата предоплаты. Для заказов без аванса используется дата поступления в работу.','Этап':'Что сейчас происходит с ТЗ. Нажмите, чтобы поменять. «Передать в проектирование» открывает форму для отметки о передаче.','На сборе':'Рабочие дни с прихода из продаж до передачи. Считаются сами. <b>Зелёный</b> — до 5 р.д. (норма). <b>Красный</b> — сверх нормы, на плашке видно на сколько дней. С 11 р.д. ТЗ уходит на паузу.','Последний контакт':'Когда последний раз были на связи с заказчиком или посредником. Подтягивается из состоявшихся звонков по этому заказу.','Что тормозит':'Одна главная причина.','Следующий шаг':'Что сделать и когда. Без шага и даты ТЗ подсвечивается.','Вопросы':'Возвраты и вопросы по ТЗ от заказчика и от проектировщиков. <b>Красное «ждёт ответа»</b> — вопрос задан, ответа ещё нет. <b>«Все решены»</b> — на все вопросы ответили. Нажмите, чтобы открыть список.','Действия':'<b>Передать в проектирование</b> — откроется окно: дата формы ТЗ и проверил ли Иван. <b>+ Вопрос</b> — добавить вопрос или возврат по этому проекту.'};
function disabled(value){return value ? " disabled" : "";}
function hdr(){return '<div class="tr hd">'+['№','Проект','Заказчик<small>объект · вид работ · кто заполняет</small>','Пришло из продаж','Этап','На сборе<small>р.д.</small>','Последний контакт','Что тормозит','Следующий шаг<small>и дата</small>','Вопросы<small>по ТЗ</small>','Действия'].map(function(x){return '<span class="c">'+x+'</span>';}).join('')+'</div>';}
function stageCell(r){
  var s=STAGE[r.stage];
  if(ED&&ED.p===r.p&&ED.f==='st'){
    return '<span class="edb">'+Object.keys(STAGE).filter(function(k){return k!==r.stage;}).map(function(k){return '<button type="button" class="op" data-stg="'+r.p+'|'+k+'">'+(k==='done'?'→ Передать в проектирование':STAGE[k][0])+'</button>';}).join('')+'<button type="button" class="ex" data-ed="">отмена</button></span>';
  }
  var sub='';
  if(r.stage==='visit'&&r.visit){sub=isToday(r.visit.d)?'<span class="pl b">выезд сегодня · '+esc(r.visit.who.split(' ')[0])+'</span>':(pd(r.visit.d)>TODAY?'<span class="pl b">выезд '+dmw(r.visit.d)+'</span>':(r.visit.info?'<span class="pl g">инфо получена '+dm(r.visit.info)+'</span>':'<span class="pl r">инфо нет '+wd(pd(r.visit.d),TODAY)+' р.д.</span>'));}
  if(r.stage==='check'&&r.ivan){var n=wd(pd(r.ivan),TODAY);sub='<span class="pl '+(n>1?'r':'n')+'">у Ивана '+n+' р.д.</span>';}
  if(r.stage==='done'){sub='<span class="sb">'+dmw(r.handed)+'</span>'+(r.ivanOk==='нет'?'<span class="pl a">без проверки Ивана</span>':'');}
  if(r.stage==='done')return '<span class="chip" style="background:'+s[1]+';color:'+s[2]+'" data-tip="'+esc(s[3])+'">'+s[0]+'</span>'+sub;
  return '<button type="button" class="inl" data-ed="st|'+r.p+'"'+disabled(!editable||!r.can_edit)+'><span class="chip" style="background:'+s[1]+';color:'+s[2]+'" data-tip="'+esc(s[3])+'">'+s[0]+'</span>'+sub+'<span class="pen">изменить</span></button>';
}
function daysCell(r){
  var d=daysOf(r),z=zone(r),over=d>5,cl=over?'r':'g';
  var sub=over?'<span class="pl r">сверх нормы '+(d-5)+(r.stage!=='done'&&z==='pause'?' · пауза':'')+'</span>':(r.stage==='done'?'<span class="pl g">в норме</span>':(d===5?'<span class="pl a">последний день</span>':'<span class="pl g">в норме</span>'));
  if(r.stage==='done')sub+='<span class="sb">итого</span>';
  return '<span class="days '+cl+'">'+(r.came?' '+d:'—')+'</span>'+(r.came?sub:'');
}
function lastCell(r){if(!r.last)return '<span class="sb">ещё не было</span>';if(isToday(r.last))return '<span class="pl g">сегодня</span>';var n=wd(pd(r.last),TODAY);return '<span class="dt">'+dmw(r.last)+'</span><span class="pl '+(n<=2?'g':(n<=5?'a':'r'))+'">'+n+' р.д. назад</span>';}
function blkCell(r){
  if(r.stage==='done')return '<span class="sb">—</span>';
  if(ED&&ED.p===r.p&&ED.f==='blk')return '<span class="edb cn">'+BLOCK.filter(function(b){return b;}).map(function(b){return '<button type="button" class="op'+(b===r.blk?' on':'')+'" data-blkv="'+r.p+'|'+esc(b)+'">'+esc(b)+'</button>';}).join('')+'<button type="button" class="ex" data-ed="">отмена</button></span>';
  return '<button type="button" class="blb" data-ed="blk|'+r.p+'"'+disabled(!editable||!r.can_edit)+'><span class="blt'+(r.blk?'':' need')+'">'+esc(r.blk||'выбрать причину')+'</span><span class="pen">изменить</span></button>';
}
function stepCell(r){
  if(r.stage==='done'){var oq=openQ(r.p).find(function(q){return q.side==='pr';});return oq?'<span class="stp">'+esc(oq.step)+'</span><span class="nx '+(isLate(oq.sd)?'late':(isToday(oq.sd)?'today':''))+'">'+dmw(oq.sd)+'</span>':'<span class="sb">у проектировщиков</span>';}
  if(ED&&ED.p===r.p&&ED.f==='sd'){
    return '<span class="edb"><input type="text" id="sst" maxlength="300" value="'+esc(r.step)+'" aria-label="Следующий шаг"><span class="opts">'+[[T0,'сегодня']].concat(nextOpts()).map(function(o){return '<button type="button" class="op" data-sdd="'+r.p+'|'+o[0]+'">'+o[1]+' <small>'+dm(o[0])+'</small></button>';}).join('')+'</span><input type="date" min="'+T0+'" data-sdi="'+r.p+'" aria-label="Другая дата"><button type="button" class="ex" data-ed="">отмена</button></span>';
  }
  if(!r.sd)return '<button type="button" class="inl" data-ed="sd|'+r.p+'"'+disabled(!editable||!r.can_edit)+'><span class="pl r">нет шага</span><span class="pen">поставить шаг</span></button>';
  var late=isLate(r.sd),tod=isToday(r.sd);
  return '<button type="button" class="inl" data-ed="sd|'+r.p+'"'+disabled(!editable||!r.can_edit)+'><span class="stp">'+esc(r.step)+'</span><span class="nx '+(late?'late':(tod?'today':''))+'">'+dmw(r.sd)+'</span><span class="pl '+(late?'r':(tod?'b':'n'))+'">'+(late?'пропущен '+wd(pd(r.sd),TODAY)+' р.д.':(tod?'сегодня':'через '+wd(TODAY,pd(r.sd))+' р.д.'))+'</span><span class="pen">изменить</span></button>';
}
function qCell(r){var a=allQ(r.p),o=openQ(r.p);if(!a.length)return '<span class="sb">нет</span>';return '<button type="button" class="qcnt '+(o.length?'r':'n')+'" data-qs="'+r.p+'" data-tip="'+esc(a.map(function(q){return '<b>'+esc(q.kind)+'</b> · '+esc(q.item)+(q.open?' — ждёт ответа':' — решён');}).join('<br>'))+'">'+(o.length?o.length+' ждёт ответа':'все решены')+'</button><span class="qall">всего вопросов: '+a.length+'</span>';}
function row(r,i,g){
  return '<div class="tr '+g+(i%2?' z':'')+(r.p===flashP?' flash':'')+'" id="row'+r.p+'">'+
   '<span class="c"><span class="nb">'+(i+1)+'</span></span>'+
   '<span class="c"><a class="pj" href="./#/task/'+r.p+'" target="_parent" data-order="'+r.p+'">№'+esc(r.number||r.p)+'</a>'+(r.kp?'<span class="kpn">КП '+esc(r.kp)+'</span>':'')+'</span>'+
   '<span class="c"><span class="nm">'+esc(r.cu)+'</span><span class="ob">'+esc(r.ob)+' · '+esc(r.wk)+'</span><span class="who">'+esc(r.by||'—')+'</span></span>'+
   '<span class="c"><span class="dt">'+dmw(r.came)+'</span></span>'+
   '<span class="c">'+stageCell(r)+'</span>'+
   '<span class="c">'+daysCell(r)+'</span>'+
   '<span class="c">'+lastCell(r)+'</span>'+
   '<span class="c">'+blkCell(r)+'</span>'+
   '<span class="c">'+stepCell(r)+'</span>'+
   '<span class="c">'+qCell(r)+'</span>'+
   '<span class="c acts">'+((r.stage!=='done'||r.can_handoff)?'<button type="button" class="b sm gr" data-hand="'+r.p+'"'+disabled(!editable||(!r.can_edit&&!r.can_handoff))+'>'+(r.stage==='done'?'Отметка о передаче':'Передать в проектирование')+'</button>':'')+'<button type="button" class="b sm ghost" data-addq="'+r.p+'"'+disabled(!editable)+'>+ Вопрос</button></span></div>';
}
function band(cls,t){var c='';for(var j=0;j<11;j++)c+='<span class="c"></span>';return '<div class="tr grp '+cls+'">'+c+'<span class="gl">'+t+'</span></div>';}
function match(r){
  if(qq&&((r.number||r.p)+' '+r.cu+' '+(r.kp||'')).toLowerCase().indexOf(qq.toLowerCase().trim())<0)return false;
  if(filt==='Все')return r.stage!=='done'||openQ(r.p).length||pd(r.handed)>=WEEK;
  if(filt==='С открытыми вопросами')return openQ(r.p).length>0;
  if(filt==='Все переданные')return r.stage==='done';
  for(var k in STAGE)if(STAGE[k][0]===filt)return r.stage===k;
  return true;
}
function byStep(a,b){return (a.sd||'9').localeCompare(b.sd||'9');}
function renderTz(){
  var L=TZ.filter(match),i=0,h='';
  var F=[['Все','#fff','#1b3a5e']];Object.keys(STAGE).forEach(function(k){if(k!=='done')F.push([STAGE[k][0],STAGE[k][1],STAGE[k][2]]);});F.push(['С открытыми вопросами','#f8dcd8','#a5281b'],['Все переданные','#d9efe0','#17653a']);
  var cnt=function(f){var s=filt;filt=f;var n=TZ.filter(match).length;filt=s;return n;};
  var sh=qq;qq='';var fl=F.map(function(f){return '<button type="button" class="ft'+(f[0]===filt?' on':'')+'" data-f="'+f[0]+'" style="background:'+f[1]+';color:'+f[2]+(f[1]==='#fff'?';border-color:#c3ccd8':'')+'">'+f[0]+' · '+cnt(f[0])+'</button>';}).join('');qq=sh;
  var A=TZ.filter(function(r){return r.stage!=='done';});
  var act=A.filter(function(r){return zone(r)==='act';}).length,pau=A.filter(function(r){return zone(r)==='pause';}).length,nost=A.filter(function(r){return !r.sd||isLate(r.sd);}).length;
  h+='<div class="intro">Все ТЗ, которые вы ведёте. Проекты появляются <b>автоматически</b> после поступления предоплаты или начала сбора данных по заказу без аванса. Дни на сборе считаются автоматически. Здесь можно менять этап, причину и следующий шаг.</div>';
  var oq=QS.filter(function(q){return q.open;}),oqp=oq.filter(function(q){return q.side==='pr';}).length,HW=TZ.filter(function(r){return r.handed&&pd(r.handed)>=WEEK;}),hwN=HW.length,avgW=hwN?Math.round(HW.reduce(function(s,r){return s+daysOf(r);},0)/hwN*10)/10:'—';
  h+='<div class="g4">'+kpi('#5b84c4','В работе',A.length,'ТЗ, которые ещё не переданы в проектирование.')+kpi('#c0564d','Сверх нормы 5 р.д.',(act+pau)+' <small>из '+A.length+'</small>','Из них на паузе (11+ р.д.): '+pau+'. По каждому — шаг каждый день или причина паузы.')+kpi('#7a66b0','Ждут вашего ответа',oq.length,'Вопросы и возвраты по ТЗ без ответа. От проектировщиков: '+oqp+' — пока нет ответа, проект стоит.')+kpi('#d08a4e','Средний срок сбора',avgW+' <small>р.д.</small>','ТЗ, переданные за неделю ('+hwN+'). Норма — 5 р.д. Без шага или шаг пропущен: '+nost+'.')+'</div>';
  h+='<div class="filters">'+fl+'</div><div class="per"><input id="q" type="search" placeholder="Поиск: номер проекта, КП или заказчик" aria-label="Поиск" value="'+esc(qq)+'"></div>';
  var t='<div class="card"><div class="tw"><div class="tb ttz">'+hdr();
  var G=[['act','o','Требуют действия · 6–10 р.д.','шаг каждый день'],['norm','bu','В норме · до 5 р.д.','по дате шага'],['pause','g','На паузе · 11 р.д. и больше','раз в неделю спросить, актуально ли']];
  G.forEach(function(g){var S=L.filter(function(r){return r.stage!=='done'&&zone(r)===g[0];}).sort(byStep);if(S.length){t+=band(g[1],g[2]+' · '+S.length+' <small>'+g[3]+'</small>');S.forEach(function(r){t+=row(r,i++,g[1]);});}});
  var D=L.filter(function(r){return r.stage==='done';});
  var Dq=D.filter(function(r){return openQ(r.p).length;}),Dw=D.filter(function(r){return !openQ(r.p).length;}).sort(function(a,b){return a.handed<b.handed?1:-1;});
  if(Dq.length){t+=band('r','Передано, есть открытый вопрос · '+Dq.length+' <small>проектировщик ждёт ответа</small>');Dq.forEach(function(r){t+=row(r,i++,'r');});}
  if(Dw.length){t+=band('gr',(filt==='Все переданные'?'Все переданные':'Передано за эту неделю')+' · '+Dw.length+' <small>свежие сверху</small>');Dw.forEach(function(r){t+=row(r,i++,'gr');});}
  if(!L.length)t+='<div class="empty">Ничего не найдено. Снимите фильтр или измените поиск.</div>';
  t+='</div></div><div class="foot"><span>Переданные раньше этой недели — фильтр «Все переданные».</span></div></div>';
  return h+t;
}

var M=null;
function modal(){
  var o=document.getElementById('ovl');if(!M){o.innerHTML='';return;}
  var h='';
  if(M.t==='hand'){var r=tz(M.p);
    h='<div class="ov"><div class="md" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="mh"><div><h3 id="mt">Передать в проектирование · №'+esc(r.number||r.p)+'</h3><p>'+esc(r.cu)+' · '+esc(r.wk)+' · на сборе '+daysOf(r)+' р.д.</p>'+(!r.can_handoff?'<p>Завершите чек-лист ТЗ в карточке. Затем здесь можно сохранить дату получения и отметку о проверке.</p>':'')+'</div><button type="button" class="x" data-close aria-label="Закрыть">×</button></div><div class="mb">'+
     '<div class="row2"><label class="fld"><span>Форма ТЗ получена <i>*</i></span><input type="date" id="hf" value="'+(M.f||'')+'" max="'+T0+'"></label><label class="fld"><span>Передано</span><input type="date" id="hd" value="'+(M.hd||T0)+'" max="'+T0+'"></label></div>'+
     '<div class="fld"><span>Проверено Иваном <i>*</i></span><span class="opts'+(M.tried&&!M.iv?' need':'')+'">'+['да','нет'].map(function(v){return '<button type="button" class="op'+(M.iv===v?' on':'')+'" data-iv="'+v+'">'+(v==='да'?'Да, проверил':'Нет, передала без проверки')+'</button>';}).join('')+'</span></div>'+
     '<label class="fld"><span>Комментарий</span><textarea id="hc" maxlength="500" placeholder="Необязательно">'+esc(M.comment||'')+'</textarea></label>'+(M.err?'<span class="err">'+M.err+'</span>':'')+
     '</div><div class="mf"><button type="button" class="b" data-close>Отмена</button>'+(r.can_handoff?'<button type="button" class="b gr" id="hsave">Сохранить</button>':'<button type="button" class="b gr" data-order="'+r.p+'">Открыть чек-лист в заказе</button>')+'</div></div></div>';
  }
  if(M.t==='q'){
    var kinds=[['cu','Возврат заказчику'],['cu','Вопрос заказчика'],['pr','Возврат от проектировщика'],['pr','Вопрос проектировщика']];
    var pr=M.kind&&M.kind.indexOf('проектиров')>0;
    h='<div class="ov"><div class="md" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="mh"><div><h3 id="mt">Вопрос или возврат по ТЗ</h3><p>Вопрос появится в строке проекта и останется открытым до ответа.</p></div><button type="button" class="x" data-close aria-label="Закрыть">×</button></div><div class="mb">'+
     '<label class="fld"><span>Проект <i>*</i></span><select id="qp">'+TZ.map(function(r){return '<option value="'+r.p+'"'+(r.p===M.p?' selected':'')+'>№'+esc(r.number||r.p)+' · '+esc(r.cu)+' · '+esc(r.wk)+'</option>';}).join('')+'</select></label>'+
     '<div class="fld"><span>Что произошло <i>*</i></span><span class="opts'+(M.tried&&!M.kind?' need':'')+'">'+kinds.map(function(k){return '<button type="button" class="op'+(M.kind===k[1]?' on':'')+'" data-qk="'+k[1]+'">'+k[1]+'</button>';}).join('')+'</span></div>'+
     '<div class="row2"><label class="fld"><span>Пункт формы ТЗ <i>*</i></span><input type="text" id="qi" maxlength="200" placeholder="Например: п. 12 Место ППКП" value="'+esc(M.qi||'')+'"></label>'+(pr?'<label class="fld"><span>Потеряно, р.д.</span><input type="number" id="ql" min="0" max="365" value="'+esc(M.ql||'')+'" placeholder="0"></label>':'<span></span>')+'</div>'+
     '<label class="fld"><span>Суть <i>*</i></span><textarea id="qt" maxlength="500" placeholder="Что спросили или что вернули">'+esc(M.qt||'')+'</textarea></label>'+
     (pr?'<label class="fld"><span>Почему пропустили <i>*</i></span><select id="qw"><option value="">выбрать</option><option>Не проверила по плану</option><option>Заказчик заполнил не всё, не заметила</option><option>Пункта нет в форме ТЗ</option><option>Изменилось у заказчика после передачи</option><option>Другое</option></select></label>':'')+
     '<div class="row2"><label class="fld"><span>Следующий шаг <i>*</i></span><input type="text" id="qs" maxlength="300" placeholder="Например: уточнить у заказчика" value="'+esc(M.qs||'')+'"></label><label class="fld"><span>Дата шага <i>*</i></span><input type="date" id="qd" min="'+T0+'" value="'+(M.qd||T0)+'"></label></div>'+
     (M.err?'<span class="err">'+M.err+'</span>':'')+
     '</div><div class="mf"><button type="button" class="b" data-close>Отмена</button><button type="button" class="b p" id="qsave">Добавить</button></div></div></div>';
  }
  if(M.t==='list'){var r2=tz(M.p),A=allQ(M.p);
    h='<div class="ov"><div class="md" role="dialog" aria-modal="true" aria-labelledby="mt"><div class="mh"><div><h3 id="mt">Вопросы по ТЗ · №'+esc(r2.number||r2.p)+'</h3><p>'+esc(r2.cu)+' · '+esc(r2.wk)+'</p></div><button type="button" class="x" data-close aria-label="Закрыть">×</button></div><div class="mb">'+
     A.map(function(q){return '<div class="fl"><b>'+esc(q.kind)+' · '+esc(q.item)+'</b>'+esc(q.text)+'<br><span class="sb">'+dmw(q.date)+(q.why?' · почему пропустили: '+esc(q.why):'')+(q.lost?' · потеряно '+Number(q.lost)+' р.д.':'')+'</span><div style="margin-top:6px">'+(q.open?(editable?'<button type="button" class="b sm gr" data-qclose="'+q.id+'">Закрыть: ответ дан</button>':'<span class="pl r">Ждёт ответа</span>'):'<span class="pl g">закрыт'+(q.how?': '+esc(q.how):'')+'</span>')+'</div></div>';}).join('')+
     '</div><div class="mf"><button type="button" class="b" data-close>Готово</button><button type="button" class="b p" data-addq="'+r2.p+'"'+disabled(!editable)+'>+ Добавить</button></div></div></div>';
  }
  o.innerHTML=h;
  if(M.t==='q'&&$('qw')&&M.qwv)$('qw').value=M.qwv;
}
function toast(t){var e=document.getElementById('toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){e.hidden=true;},2800);}


async function load(){
  if(!host || !host.tzRegistryApi){
    $("status").textContent="Откройте реестр из меню CRM «Заказы».";
    return;
  }
  try {
    var result=await host.tzRegistryApi("/tz-registry");
    if(!result || !Array.isArray(result.rows)) throw Error("Реестр ТЗ недоступен");
    TZ=result.rows;
    QS=result.questions;
    editable=result.editable;
    employee=result.name;
    T0=result.today;
    TODAY=pd(T0);
    WEEK=addWd(TODAY,0);
    WEEK.setDate(WEEK.getDate()-(WEEK.getDay()+6)%7);
    if(M&&!tz(M.p)) M=null;
    render();
    $("status").hidden=true;
  } catch(error) {
    $("status").hidden=false;
    $("status").textContent="Не удалось загрузить реестр. "+(error.message||String(error));
  }
}

function render(){
  var previous=document.querySelector('.tw'), left=previous?previous.scrollLeft:0;
  var focus=document.activeElement && document.activeElement.id;
  $("sub").textContent="Сегодня "+dmw(T0)+(employee?" · "+employee:"");
  $("addq").hidden=!editable;
  $("addq").disabled=!TZ.length || busy;
  $("view").innerHTML=renderTz();
  document.querySelectorAll('.tr.hd>.c').forEach(function(cell){
    var key=cell.firstChild.textContent.trim();
    if(HT[key]){
      cell.dataset.tip=HT[key];
      cell.classList.add('hq');
      cell.tabIndex=0;
    }
  });
  document.querySelector('.tw').scrollLeft=left;
  modal();
  if(M&&M.tried){
    var fields=M.t==='hand'?['hf']:M.t==='q'?['qi','qt','qs','qd','qw']:[];
    fields.forEach(function(id){
      var el=$(id);
      if(el&&(!el.value.trim()||!el.validity.valid))el.setAttribute('aria-invalid','true');
    });
  }
  if(focus&&$(focus)&&focus!=="q")$(focus).focus({preventScroll:true});
}

async function save(p, action, values, message, keepModal){
  if(busy||!editable)return;
  busy=true;
  var control=document.activeElement;
  if(control && control.tagName==="BUTTON")control.disabled=true;
  try {
    await host.tzRegistryApi("/tz-registry/"+p, Object.assign({action:action},values));
    if(!keepModal)M=null;
    ED=null;
    flashP=p;
    toast(message);
    await load();
  } catch(error) {
    if(M){M.err=error.message||String(error);render();}
    else toast(error.message||String(error));
  } finally {
    busy=false;
    if(control?.isConnected && control.tagName==="BUTTON")control.disabled=false;
    $("addq").disabled=!TZ.length;
  }
}

function values(ids){
  return Object.fromEntries(ids.map(function(id){return [id,$(id)?.value.trim()||""];}));
}
function keepQ(){
  var v=values(["qp","qi","qt","qs","qd","ql","qw"]);
  M.p=Number(v.qp)||M.p;
  M.qi=v.qi; M.qt=v.qt; M.qs=v.qs; M.qd=v.qd; M.ql=v.ql; if($('qw')) M.qwv=v.qw;
}
function keepHand(){
  var v=values(["hf","hd","hc"]);
  M.f=v.hf; M.hd=v.hd; M.comment=v.hc;
}
function openHand(p){
  var r=tz(p);
  ED=null;
  M={t:'hand',p:p,f:r.form,hd:r.handed,iv:r.ivanOk,comment:r.handoffComment};
  render();
  $("hf").focus();
}
function saveStep(p,due){
  var step=$('sst').value.trim();
  if(!step || due<T0){
    $('sst').setAttribute('aria-invalid','true');
    $('sst').focus();
    return;
  }
  save(p,'step',{step:step,due:due},'Следующий шаг сохранён');
}

document.addEventListener('click',function(e){
  var b=e.target.closest('button,[data-order]');
  if(!b||b.disabled||!T0)return;
  var d=b.dataset, split, p;
  if(d.order){e.preventDefault();parent.location.hash="#/task/"+d.order;return;}
  if(d.f){filt=d.f;render();return;}
  if(d.qs){M={t:'list',p:+d.qs};render();document.querySelector('.md .x').focus();return;}
  if(d.close!=null){M=null;render();return;}
  if(!editable||busy)return;
  if(d.ed!=null){
    split=d.ed.split('|');
    ED=d.ed?{f:split[0],p:+split[1]}:null;
    render();
    if($('sst'))$('sst').focus();
    return;
  }
  if(d.stg){
    split=d.stg.split('|');
    p=+split[0];
    if(split[1]==='done')openHand(p);
    else save(p,'stage',{value:split[1]},'Этап сохранён');
    return;
  }
  if(d.blkv){
    split=d.blkv.split('|');
    save(+split[0],'blocker',{value:split[1]},'Причина сохранена');
    return;
  }
  if(d.sdd){split=d.sdd.split('|');saveStep(+split[0],split[1]);return;}
  if(d.hand){openHand(+d.hand);return;}
  if(d.addq||b.id==='addq'){
    if(!TZ.length)return;
    M={t:'q',p:+d.addq||TZ[0].p};
    render();
    $('qp').focus();
    return;
  }
  if(d.qclose){save(M.p,'close',{question_id:+d.qclose},'Вопрос закрыт',true);return;}
  if(d.iv){keepHand();M.iv=d.iv;M.err='';render();return;}
  if(d.qk){keepQ();M.kind=d.qk;render();return;}
  if(b.id==='hsave'){
    keepHand();
    if(!M.f||!M.iv||M.f>M.hd||M.hd>T0){
      M.tried=true;M.err='Проверьте даты и отметьте, проверил ли Иван.';render();return;
    }
    save(M.p,'handoff',{form:M.f,due:M.hd,value:M.iv,text:M.comment},'Отметка о передаче сохранена');
    return;
  }
  if(b.id==='qsave'){
    keepQ();
    var designer=M.kind&&M.kind.includes('проектиров'), lost=Number(M.ql||0);
    if(!M.kind||!M.qi||!M.qt||!M.qs||!M.qd||M.qd<T0||(designer&&(!M.qwv||!Number.isInteger(lost)||lost<0||lost>365))){
      M.tried=true;M.err='Заполните обязательные поля и проверьте даты.';render();return;
    }
    save(M.p,'question',{kind:M.kind,item:M.qi,text:M.qt,step:M.qs,due:M.qd,why:M.qwv,lost:lost},'Вопрос добавлен');
  }
});
document.addEventListener('change',function(e){
  if(e.target.dataset.sdi&&e.target.value&&editable&&!busy)saveStep(+e.target.dataset.sdi,e.target.value);
});
document.addEventListener('input',function(e){
  if(e.target.id==='q'){
    qq=e.target.value;
    var cursor=e.target.selectionStart;
    render();
    $('q').focus({preventScroll:true});
    $('q').setSelectionRange(cursor,cursor);
  }
  if(e.target.hasAttribute('aria-invalid')&&e.target.value.trim())e.target.removeAttribute('aria-invalid');
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&M&&!busy){M=null;render();}
});

(function(){var tb=document.getElementById('tipb'),cur=null;
function show(el){var t=el.getAttribute('data-tip');if(!t){tb.hidden=true;return;}tb.innerHTML=t;tb.hidden=false;var r=el.getBoundingClientRect(),w=tb.offsetWidth,h=tb.offsetHeight,x=Math.min(Math.max(8,r.left+r.width/2-w/2),window.innerWidth-w-8),y=r.bottom+8;if(y+h>window.innerHeight-8)y=r.top-h-8;tb.style.left=x+'px';tb.style.top=y+'px';}
document.addEventListener('mouseover',function(e){var el=e.target.closest&&e.target.closest('[data-tip]');if(el!==cur){cur=el;if(el)show(el);else tb.hidden=true;}});
document.addEventListener('focusin',function(e){var el=e.target.closest&&e.target.closest('[data-tip]');if(el)show(el);});
document.addEventListener('focusout',function(){tb.hidden=true;cur=null;});
window.addEventListener('scroll',function(){tb.hidden=true;cur=null;},true);})();

load();
})();
