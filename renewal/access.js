// Who may open which course.
// A student gives a name and the last four digits of a phone number. The two together make a key;
// the roster (Firestore, edited on the teacher's admin page) holds one small record per key that says
// which courses the student may open. The reader asks for that one record and for nothing else.
// This decides what the reader shows. It is not a strong lock: the lesson files themselves stay public.
// Off, with every course open and nothing asked, when the page is opened from a folder (the ZIP)
// or while access-config.js names no project.
(()=>{'use strict';
const C=window.BRAVO_ACCESS_CONFIG||{};
const ON=!!C.projectId&&/^https?:$/.test(location.protocol);
const BASE='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(C.projectId||'')+'/databases/(default)/documents/';
const STORE='bravo-access',OPEN='bravo-access-open',COOKIE='bravo_in';
const HOUR=3600e3,KEEP=30*24*HOUR,VISIT=12*HOUR,RECHECK=5*60e3;
const COURSES=[{id:1,name:'AI로 똑똑하게 일하기',days:'1~4차시'},{id:2,name:'AI 영상 놀이터',days:'5~8차시'},{id:3,name:'나에게 딱 맞는 AI 만들기',days:'9~12차시'}];

// The admin page makes the key with these same three functions; change them and no student matches the roster.
const normName=s=>String(s??'').normalize('NFC').replace(/\s+/g,'').toLowerCase();
const normDigits=s=>String(s??'').replace(/\D/g,'').slice(-4);
async function keyOf(name,digits){
 const text='bravo-ai-life:v1:'+normName(name)+':'+normDigits(digits);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
const write=(k,v)=>{try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
// Without 'keep' a visit ends when the browser is closed: a cookie with no date lives exactly that long.
const hasCookie=()=>document.cookie.split('; ').includes(COOKIE+'=1');
const setCookie=on=>{document.cookie=COOKIE+'='+(on?'1':'')+';path=/;SameSite=Lax'+(location.protocol==='https:'?';Secure':'')+(on?'':';max-age=0');};
function session(){
 const s=read(STORE);
 if(s&&s.key&&Array.isArray(s.subjects)&&s.until>Date.now()&&(s.keep||hasCookie()))return s;
 if(s)write(STORE,null);
 return null;
}

// off: no roster in use · checking: first visit, waiting for the roster · open: the teacher opened everything
// out: nobody signed in · in: signed in, `subjects` lists the open courses
const S={status:'off',name:'',subjects:[],note:''};
const listeners=[];let told='',last=0,busy=null;
const stamp=()=>JSON.stringify([S.status,S.name,S.subjects,S.note]);
function tell(){const now=stamp();if(now===told)return;told=now;listeners.forEach(f=>{try{f(S);}catch(e){console.error(e);}});}

// One record: its fields, null when there is none, an exception when the roster gave no usable answer.
async function record(path){
 const stop=new AbortController(),timer=setTimeout(()=>stop.abort(),6000);
 try{
  const r=await fetch(BASE+path,{cache:'no-store',signal:stop.signal});
  if(r.status===404)return null;
  if(!r.ok)throw new Error('roster answered '+r.status);
  return (await r.json()).fields||{};
 }finally{clearTimeout(timer);}
}
const whole=v=>v&&'integerValue' in v?Number(v.integerValue):v&&'doubleValue' in v?Number(v.doubleValue):NaN;
const subjectsOf=f=>[...new Set(((f.subjects&&f.subjects.arrayValue&&f.subjects.arrayValue.values)||[]).map(whole).filter(n=>COURSES.some(c=>c.id===n)))].sort();

function settle(open,s){
 S.status=open?'open':s?'in':'out';S.name=s?s.name:'';S.subjects=s?s.subjects:[];
 if(S.status!=='out')S.note='';
 tell();
}
// Ask the roster again: has the teacher opened everything, and what may this student open now?
// No answer (no network, quota) changes nothing: the last known answer stays.
function refresh(){
 if(!ON)return Promise.resolve();
 if(busy)return busy;
 const asked=session();
 busy=Promise.allSettled([record('settings/gate'),asked?record('access/'+asked.key):null]).then(([gate,mine])=>{
  last=Date.now();
  let open=S.status==='open';
  if(gate.status==='fulfilled'){open=!!(gate.value&&gate.value.open&&gate.value.open.booleanValue);write(OPEN,{open,at:last});}
  let now=session();   // the student may have signed out, or in as someone else, while the answer was on its way
  if(now&&asked&&now.key===asked.key&&mine.status==='fulfilled'){
   if(mine.value===null){write(STORE,null);setCookie(false);now=null;S.note='gone';}
   else{now.subjects=subjectsOf(mine.value);if(now.keep)now.until=last+KEEP;write(STORE,now);}
  }
  settle(open,now);
 }).finally(()=>{busy=null;});
 return busy;
}
// 'in' · 'unknown' (no such name and digits on the roster) · 'offline' (the roster gave no answer)
async function signIn(name,digits,keep){
 if(!ON)return 'in';
 if(!normName(name)||normDigits(digits).length!==4)return 'unknown';
 let key,fields;
 try{key=await keyOf(name,digits);fields=await record('access/'+key);}catch(e){return 'offline';}
 if(fields===null)return 'unknown';
 write(STORE,{name:String(name).trim().replace(/\s+/g,' '),key,subjects:subjectsOf(fields),keep:!!keep,until:Date.now()+(keep?KEEP:VISIT)});
 setCookie(true);S.note='';
 settle(S.status==='open',session());
 return 'in';
}
function signOut(){write(STORE,null);setCookie(false);S.note='';settle(S.status==='open',null);}
function start(){
 if(!ON)return;
 const s=session(),o=read(OPEN);
 S.status=o&&o.open?'open':s?'in':o?'out':'checking';S.name=s?s.name:'';S.subjects=s?s.subjects:[];told=stamp();
 refresh();
 const again=()=>{if(document.visibilityState==='visible'&&Date.now()-last>RECHECK)refresh();};
 document.addEventListener('visibilitychange',again);setInterval(again,60e3);
}
const allows=day=>S.status==='off'||S.status==='open'||(S.status==='in'&&S.subjects.includes(Math.ceil(day/4)));

window.BRAVO_ACCESS={on:ON,config:C,courses:COURSES,state:S,allows,start,refresh,signIn,signOut,keyOf,normName,normDigits,subscribe:f=>{listeners.push(f);}};
})();
