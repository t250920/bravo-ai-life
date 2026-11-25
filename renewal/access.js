// Who may open which course.
// A student gives a name and the last four digits of a phone number. The two together make a key;
// the roster (Firestore, edited on the teacher's admin page) holds one small record per key that says
// which courses the student may open and which class (start date) the student is in. Inside an open course a lesson
// opens on the day the teacher opens it for that class (classes/{id}: the list of opened lessons).
// The reader asks for those two records and for nothing else.
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
// The browser's own SHA-256 exists only on https and localhost. The NAS copy is served over plain http
// (http://<address>:<port>), so the same digest is computed here; both give the same key.
function sha256(bytes){
 const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
 const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
 const n=bytes.length,total=Math.ceil((n+9)/64)*64,m=new Uint8Array(total);m.set(bytes);m[n]=0x80;
 const dv=new DataView(m.buffer);dv.setUint32(total-8,Math.floor(n/0x20000000));dv.setUint32(total-4,(n*8)>>>0);
 const w=new Uint32Array(64),r=(x,k)=>(x>>>k)|(x<<(32-k));
 for(let o=0;o<total;o+=64){
  for(let i=0;i<16;i++)w[i]=dv.getUint32(o+i*4);
  for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,h]=H;
  for(let i=0;i<64;i++){
   const t1=(h+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
   h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
  }
  H[0]+=a;H[1]+=b;H[2]+=c;H[3]+=d;H[4]+=e;H[5]+=f;H[6]+=g;H[7]+=h;
 }
 const out=new Uint8Array(32),ov=new DataView(out.buffer);H.forEach((x,i)=>ov.setUint32(i*4,x));
 return out.buffer;
}
async function hex(text){
 const data=new TextEncoder().encode(text);
 const hash=window.crypto&&crypto.subtle?await crypto.subtle.digest('SHA-256',data):sha256(data);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const keyOf=(name,digits)=>hex('bravo-ai-life:v1:'+normName(name)+':'+normDigits(digits));
// A class is named by the teacher (its start date, say). Its record is kept under a key made from that name
// by the admin page; a student's record carries the key, so the reader never needs the name.
const classOf=group=>hex('bravo-ai-life:class:v1:'+normName(group));

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
// out: nobody signed in · in: signed in, `subjects` lists the open courses and `days` the lessons opened for the
// student's class (null: the record names no class, so every lesson of an open course is open)
const S={status:'off',name:'',subjects:[],days:null,note:''};
const listeners=[];let told='',last=0,busy=null;
const stamp=()=>JSON.stringify([S.status,S.name,S.subjects,S.days,S.note]);
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
const numbers=v=>((v&&v.arrayValue&&v.arrayValue.values)||[]).map(whole);
const subjectsOf=f=>[...new Set(numbers(f.subjects).filter(n=>COURSES.some(c=>c.id===n)))].sort();
const classIn=f=>{const v=f.class&&f.class.stringValue;return /^[0-9a-f]{64}$/.test(v||'')?v:'';};
// The lessons opened for a class. A class nobody has opened a lesson for has no record yet: nothing is open.
const daysOf=f=>[...new Set(numbers(f&&f.days).filter(n=>Number.isInteger(n)&&n>=1&&n<=12))].sort((a,b)=>a-b);

function settle(open,s){
 S.status=open?'open':s?'in':'out';S.name=s?s.name:'';S.subjects=s?s.subjects:[];S.days=s&&Array.isArray(s.days)?s.days:null;
 if(S.status!=='out')S.note='';
 tell();
}
// Ask the roster again: has the teacher opened everything, and what may this student open now
// (the courses, and the lessons the teacher has opened for the student's class)?
// No answer (no network, quota) changes nothing: the last known answer stays.
function refresh(){
 if(!ON)return Promise.resolve();
 if(busy)return busy;
 const asked=session();
 busy=Promise.allSettled([record('settings/gate'),asked?record('access/'+asked.key):null,asked&&asked.klass?record('classes/'+asked.klass):null]).then(async([gate,mine,room])=>{
  last=Date.now();
  let open=S.status==='open';
  if(gate.status==='fulfilled'){open=!!(gate.value&&gate.value.open&&gate.value.open.booleanValue);write(OPEN,{open,at:last});}
  let now=session();   // the student may have signed out, or in as someone else, while the answer was on its way
  if(now&&asked&&now.key===asked.key&&mine.status==='fulfilled'){
   if(mine.value===null){write(STORE,null);setCookie(false);now=null;S.note='gone';}
   else{
    now.subjects=subjectsOf(mine.value);
    const klass=classIn(mine.value);
    if(!klass){now.klass='';now.days=null;}
    else if(klass===asked.klass){if(room.status==='fulfilled')now.days=daysOf(room.value);}
    else{try{const days=daysOf(await record('classes/'+klass));now.klass=klass;now.days=days;}catch(e){}}   // moved to another class; asked again next time if this got no answer
    if(now.keep)now.until=last+KEEP;
    const still=session();   // signed out, or in as someone else, while the class was being asked
    if(still&&still.key===now.key)write(STORE,now);else now=still;
   }
  }
  settle(open,now);
 }).finally(()=>{busy=null;});
 return busy;
}
// 'in' · 'unknown' (no such name and digits on the roster) · 'offline' (the roster gave no answer)
async function signIn(name,digits,keep){
 if(!ON)return 'in';
 if(!normName(name)||normDigits(digits).length!==4)return 'unknown';
 let key,fields,klass='',days=null;
 try{
  key=await keyOf(name,digits);fields=await record('access/'+key);
  if(fields===null)return 'unknown';
  klass=classIn(fields);if(klass)days=daysOf(await record('classes/'+klass));
 }catch(e){return 'offline';}
 write(STORE,{name:String(name).trim().replace(/\s+/g,' '),key,subjects:subjectsOf(fields),klass,days,keep:!!keep,until:Date.now()+(keep?KEEP:VISIT)});
 setCookie(true);S.note='';
 settle(S.status==='open',session());
 return 'in';
}
function signOut(){write(STORE,null);setCookie(false);S.note='';settle(S.status==='open',null);}
function start(){
 if(!ON)return;
 const s=session(),o=read(OPEN);
 S.status=o&&o.open?'open':s?'in':o?'out':'checking';S.name=s?s.name:'';S.subjects=s?s.subjects:[];S.days=s&&Array.isArray(s.days)?s.days:null;told=stamp();
 refresh();
 const again=()=>{if(document.visibilityState==='visible'&&Date.now()-last>RECHECK)refresh();};
 document.addEventListener('visibilitychange',again);setInterval(again,60e3);
}
// Why a lesson is closed: '' (it is open) · 'course' (the student was not given its course) · 'day' (the teacher has not opened it for the class yet)
const why=day=>S.status==='off'||S.status==='open'?'':S.status!=='in'||!S.subjects.includes(Math.ceil(day/4))?'course':S.days&&!S.days.includes(day)?'day':'';
const allows=day=>!why(day);

window.BRAVO_ACCESS={on:ON,config:C,courses:COURSES,state:S,allows,why,start,refresh,signIn,signOut,keyOf,classOf,sha256,normName,normDigits,subscribe:f=>{listeners.push(f);}};
})();
