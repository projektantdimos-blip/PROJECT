'use strict';
var TODAY,WEEK,T0,NOWM,TZ=[],QS=[],COR=[],MY=[],FWD=[],INC=[],MSG=[],DONE=[],MV={},ED=null,MYF='all',movesToday=0;
var URL_TZ='./index.html#/tz-registry',CORREG={},AVC={Иван:'#2f8f5b',Александр:'#d9824a',Дмитрий:'#5b84c4',Яна:'#c2527f'};
const $=id=>document.getElementById(id);
const preview=window.opsPreview;
if(preview)URL_TZ='https://projektantdimos-blip.github.io/PROJECT/#/tz-registry';
let data,busy=false,submitAction;
const api=(path,body)=>parent.DS.tzRegistryApi(path,body);
function paint(d){
  data=d;T0=d.today;TODAY=pd(T0);WEEK=pd(T0);WEEK.setDate(WEEK.getDate()-(WEEK.getDay()+6)%7);
  NOWM=mins(d.time);TZ=d.tz;QS=d.questions;COR=d.projects;INC=d.calls;MY=d.mine;FWD=d.forward;MSG=d.messages||[];
  CORREG.atCust=COR.filter(x=>x.dir==='app').length;DONE=[];MV={};movesToday=0;
  for(const e of d.events){
    const dir=e.action==='Согласовали'?'app':e.action==='Отметила «Работа сдана»'?'hand':COR.find(x=>x.p===e.oid)?.dir||'tz';
    const key=e.qid?'q'+e.qid:(dir==='tz'?'t':dir)+e.oid;
    if(e.action==='Перенесено'){MV[key]={d:e.due,why:e.reason};if(e.day===T0)movesToday++;}
    else {delete MV[key];if(e.day===T0){DONE=DONE.filter(x=>x.key!==key);DONE.push({key,p:e.oid,dir,a:e.action,d:e.due,s:e.step});}}
  }
  $('h1').textContent='Сегодня, '+TODAY.toLocaleDateString('ru-RU',{weekday:'short',day:'numeric',month:'long'});
  $('view').innerHTML=renderToday();
  document.querySelectorAll('.kpi').forEach(k=>k.title=KTIP[k.querySelector('.lb').textContent]||'');
  document.querySelectorAll('[data-tip]').forEach(k=>k.title=k.dataset.tip.replace(/<[^>]+>/g,''));
  document.querySelectorAll('.th').forEach(h=>Array.from(h.children).forEach(c=>c.title=THT[h.classList[0]+'|'+c.textContent]||c.textContent));
}
function msg(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(msg.timer);msg.timer=setTimeout(()=>$('toast').hidden=true,5000);}
async function load(){try{paint(preview||await api('/today/ops'));}catch(e){$('view').textContent='Не удалось загрузить окно: '+e.message;}}
function field(name,label,type='text',options=[],value='',required=true){
  const attrs=' name="'+name+'" '+(required?'required':'');
  const input=options.length?'<select'+attrs+'>'+options.map(o=>{const [v,t]=Array.isArray(o)?o:[o,o];return '<option value="'+esc(v)+'">'+esc(t)+'</option>';}).join('')+'</select>':
    '<input'+attrs+' type="'+type+'" value="'+esc(value)+'">';
  return '<label class="fld">'+esc(label)+input+'</label>';
}
function dialog(title,fields,fn){
  submitAction=fn;$('ovl').innerHTML='<dialog open class="ops-dialog"><form id="ops-form"><h3>'+esc(title)+'</h3>'+fields+
    '<p role="alert"></p><div class="controls"><button type="button" class="b ghost" data-cancel>Отмена</button><button class="b bl">Сохранить</button></div></form></dialog>';
  $('ops-form').querySelector('input,select,button')?.focus();
}
const people=()=>data.people.map(x=>[x.id,x.name]);
async function change(body){
  if(preview){msg('Предпросмотр на снимке CRM. Запись отключена.');return;}
  await api('/today/ops/action',body);await load();
}
document.addEventListener('submit',async e=>{
  if(e.target.id!=='ops-form')return;e.preventDefault();if(busy)return;busy=true;
  try{await submitAction(Object.fromEntries(new FormData(e.target)));$('ovl').replaceChildren();}
  catch(err){e.target.querySelector('[role=alert]').textContent=err.message||String(err);}finally{busy=false;}
});
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||busy)return;const a=b.dataset;
 try{
 if('cancel' in a){$('ovl').replaceChildren();return;}
 if(a.myf){MYF=a.myf;paint(data);return;}
 if(a.goto){parent.location.hash='#/tz-registry';return;}
 if(b.id==='addmy'||b.id==='addmy2')dialog('Моя задача',field('title','Что сделать')+field('due','Срок','date',[],T0),v=>change({action:'mine',...v}));
 if(a.my){const t=MY.find(x=>x.id===+a.my);await change({action:'toggle',id:t.id,done:!t.ok});}
 if(b.id==='addfw')dialog('Передать вопрос коллеге',field('to','Кому','',people())+field('customer','Заказчик')+field('text','Вопрос'),v=>change({action:'forward',...v}));
 if(a.frem||a.fclose)await change({action:a.frem?'remind':'close',id:+(a.frem||a.fclose)});
 if(a.incundo)await change({action:'undo_call',call_id:a.incundo});
 if(a.inc){
   const [id,what]=a.inc.split('|'),call=INC.find(c=>String(c.id)===id);
   const save=async v=>{
     await change({action:'call',call_id:id,customer:call.who,...v,to:v.to||null});
     if(preview)return;
     const bar=$('toast');bar.replaceChildren(document.createTextNode('Звонок обработан. '));
     const undo=document.createElement('button');undo.textContent='Отменить';undo.className='b ghost sm';
     undo.onclick=async()=>{try{await change({action:'undo_call',call_id:id});msg('Отменено');}catch(err){msg(err.message);}};
     bar.append(undo);bar.hidden=false;clearTimeout(msg.timer);msg.timer=setTimeout(()=>bar.hidden=true,15000);
   };
   if(what==='fail')await save({text:'Не дозвонилась'});
   else dialog('Пропущенный звонок · '+call.who,field('text','Итог разговора','text',[],what==='toSasha'?'Перезвонить заказчику':call.ai)+
     field('to','Что дальше','',what==='toSasha'?people().filter(o=>data.people.find(p=>p.id===o[0]).position==='sales'):[['','Решила сама'],...people()]),save);
 }
 if(b.id==='addq'){
   if(!TZ.length){msg('В реестре нет доступных проектов');return;}
   dialog('Вопрос или возврат по ТЗ',field('oid','Проект','',TZ.map(r=>[r.p,'№'+r.number+' · '+r.cu]))+
     field('kind','Вид','',['Вопрос заказчика','Возврат заказчику','Вопрос проектировщика','Возврат от проектировщика'])+
     field('item','Пункт формы ТЗ')+field('text','Суть вопроса')+field('why','Причина возврата проектировщика','',['','Не проверила по плану','Заказчик заполнил не всё, не заметила','Пункта нет в форме ТЗ','Изменилось у заказчика после передачи','Другое'])+
     field('step','Следующий шаг')+field('due','Дата','date',[],T0),async v=>{
       if(preview)return change({});await api('/tz-registry/'+v.oid,{...v,action:'question'});await load();
     });
 }
 if(a.do||a.mv){ED={key:a.do||a.mv,mode:a.do?'done':'move',d:a.mv?iso(addWd(TODAY,1)):''};paint(data);return;}
 if('dcancel' in a){ED=null;paint(data);return;}
 if(ED){
   if($('dns'))ED.s=$('dns').value.trim();
   if($('dnd')?.value)ED.d=$('dnd').value;
   if(a.da||a.dd||a.mw){if(a.da)ED.a=a.da;if(a.dd)ED.d=a.dd;if(a.mw)ED.w=a.mw;paint(data);return;}
 }
 if(a.msave||a.dsave){
   const t=tasks().find(x=>x.key===ED.key),move=!!a.msave;
   if(move?(!ED.w||!ED.d||ED.d<=T0):(!ED.a||(!TERM.includes(ED.a)&&(!ED.s||!ED.d||ED.d<T0)))){ED.tried=true;paint(data);return;}
   const payload={action:move?'move':'done',oid:t.p,qid:t.q?.id||0,step:move?t.what:ED.s||'',due:ED.d||'',result:ED.a||'',reason:ED.w||''};
   if(ED.a==='Передала в проектирование'){
     const checklist=preview?[]:(await api('/orders/'+t.p+'/tz')).items.filter(i=>!i.done);
     const checks=checklist.map(i=>'<label><input type="checkbox" name="check'+i.idx+'" required> '+esc(i.title)+'</label>').join('');
     dialog('Передать в проектирование',field('form','Дата формы ТЗ','date',[],T0)+
       field('checked','Проверил Иван?','',[['','Выбрать'],'да','нет'])+checks,
       async v=>{await change({...payload,...v,confirm:checklist.map(i=>i.idx)});ED=null;paint(data);});
   }else{busy=true;try{await change(payload);ED=null;paint(data);}finally{busy=false;}}
 }
 }catch(err){msg(err.message||String(err));}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('ovl').replaceChildren();});
load();
if(!preview)setInterval(()=>{if(!document.hidden&&!busy&&!ED&&!$('ovl').children.length)load();},60000);

