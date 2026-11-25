(()=>{'use strict';
const D=window.BRAVO_DECK,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const all=[...D.slides,...D.extras],byId=new Map(all.map(s=>[s.id,s]));
// A topic edition (another subject, same lessons) carries its own cover text and remembers its own place.
const E=D.edition||null,KEY='bravo-slide'+(E?'-'+E.key:''),EDITIONS=window.BRAVO_EDITIONS||[];
let current=null,optionalReturn=null,tocDay=1;
// Who may open which course (access.js). Without a roster, or opened from a folder, everything is open and nothing is asked.
const A=window.BRAVO_ACCESS||{state:{status:'off'},allows:()=>true,subscribe(){},start(){},refresh(){}};
const allowed=day=>A.allows(day),gated=()=>A.state.status==='checking'||A.state.status==='out';
// 'day': the course is the student's, but the teacher has not opened this lesson for the class yet (lessons open on the day they are taught)
const notYet=day=>!!A.why&&A.why(day)==='day';
const firstOpen=()=>D.lessons.find(l=>allowed(l.day))||null;

// A section is a run of consecutive slides that share a name inside one lesson.
const runs=[],runOf=new Map();
for(const s of D.slides){
 let r=runs[runs.length-1];
 if(!r||r.day!==s.day||r.name!==s.section){r={day:s.day,name:s.section,slides:[]};runs.push(r);}
 r.slides.push(s);runOf.set(s.id,r);
}
// An optional series is a former exercise kept whole: its slides follow each other
// with Next, and the last one returns to the lesson.
const seriesMap=new Map();
for(const e of D.extras){
 if(!e.series)continue;
 const key=e.day+'|'+e.series;
 if(!seriesMap.has(key))seriesMap.set(key,[]);
 seriesMap.get(key).push(e);
}
const matesOf=s=>s&&s.series?seriesMap.get(s.day+'|'+s.series):null;
const lessonOf=day=>D.lessons.find(l=>l.day===day);
const sectionsOf=day=>runs.filter(r=>r.day===day&&r.name!=='시작');
const courseNames=['','AI로 똑똑하게 일하기','AI 영상 놀이터','나에게 딱 맞는 AI 만들기'];
const copyIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
const doneIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function go(id){if(location.hash.slice(1)===id)render();else location.hash=id;}
let toastTimer;
function toast(t){$('#toast').textContent=t;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').textContent='',2600);}
function saved(){try{return byId.get(localStorage.getItem(KEY));}catch(e){return null;}}

function copyBox(text,i,label,kind){
 return '<section class="prompt '+kind+'"><div class="prompt-head"><span>'+esc(label)+'</span><button class="copy" data-copy="'+i+'" aria-label="복사" title="복사">'+copyIcon+'</button></div><pre>'+esc(text)+'</pre></section>';
}
function checklist(items){
 return '<ul class="checks">'+items.map(c=>'<li><label><input type="checkbox"><span>'+esc(c)+'</span></label></li>').join('')+'</ul>';
}
function figure(s){
 if(!s.media)return '';
 let inner,style='';
 if(s.mediaType==='video'||s.mediaType==='audio')inner='<'+s.mediaType+' controls playsinline preload="metadata" src="'+esc(s.media)+'"></'+s.mediaType+'>';
 else{
  if(s.mediaW){
   const w=s.mediaW,cap=Math.min(w>1300?1240:1040,Math.round(w*(w<400?2.2:w<800?1.5:1.3)));
   style=' style="--mw:'+cap+'px;aspect-ratio:'+w+'/'+s.mediaH+'"';
  }
  inner='<img id="slideImage" src="'+esc(s.media)+'" alt="'+esc(s.alt||s.title)+'"'+style+'><button class="image-open'+(s.zoomAt?' '+esc(s.zoomAt):'')+'" id="zoomButton">⛶ 크게 보기</button>';
 }
 let html='<figure class="visual'+(s.refImage?' reference':'')+(s.fit?' fit':'')+' '+esc(s.mediaType||'img')+'">';
 if(s.refImage)html+='<p class="ribbon">참고 화면 · 이 단계를 직접 찍은 화면이 아닙니다</p>';
 html+='<div class="frame">'+inner+'</div>';
 if(s.gif)html+='<button class="gif-toggle" id="gifToggle" aria-pressed="false">▶ 순서대로 재생</button>';
 if(s.note)html+='<figcaption>'+esc(s.note)+(s.source?' · <a target="_blank" rel="noopener" href="'+esc(s.source)+'">공식 도움말</a>':'')+'</figcaption>';
 return html+'</figure>';
}

function cover(){
 const first=firstOpen(),kept=saved(),last=kept&&allowed(kept.day)?kept:null,who=A.state.status==='in'?A.state:null;
 let html='<article class="slide cover"><span class="label">BRAVO AI LIFE</span><h1>한 장씩 보고,<br>그대로 따라 하세요.</h1><p class="cover-story">'+(E?esc(E.cover):'12번의 수업이 하나의 사업으로 이어집니다. 가상 러닝화 브랜드 <b>PACE 01</b>의 사업계획부터 광고, 고객 응대, 웹페이지까지 직접 만듭니다.')+'</p><p>시작을 누르면 첫 번째 화면부터 안내합니다.<br>다음 장으로 갈 때는 아래 ‘다음’ 또는 키보드의 → 키를 누르세요.</p><div class="cover-actions">'+(first?'<button class="primary start" id="startButton">'+first.day+'차시 시작　→</button>':(who&&who.subjects.length?'<p class="cover-none">아직 열린 수업이 없습니다. 수업하는 날 선생님이 엽니다.</p><button class="resume" id="coverRetry">다시 확인하기</button>':'<p class="cover-none">아직 열린 수업이 없습니다. 선생님께 말씀해 주세요.</p>'));
 if(last&&last.number>1)html+='<button class="resume" id="resumeButton">이어서 보기 · '+last.day+'차시 '+last.number+'번째 장</button>';
 html+='</div>';
 if(who)html+='<p class="cover-who"><span><b>'+esc(who.name)+'</b> 님'+(who.subjects.length?' · 열린 과목 Bravo AI Life '+who.subjects.join(' · '):'')+'</span><button id="signOut">다른 이름으로 들어가기</button></p>';
 html+='<p class="small">다른 차시를 보려면 오른쪽 위 ‘목차’를 누르세요.</p><div class="cover-steps"><span>① 화면 보기</span>→<span>② 직접 해 보기</span>→<span>③ 다음 장</span></div>';
 // The same lessons on another subject: one line of links, the current edition marked.
 if(EDITIONS.length>1)html+='<nav class="cover-editions" aria-label="주제 고르기"><b>주제 고르기</b>'+EDITIONS.map(x=>(x.key===(E?E.key:'pace')?'<span class="here">':'<a href="'+esc(x.href)+'">')+esc(x.name)+'<small>'+esc(x.scope)+'</small>'+(x.key===(E?E.key:'pace')?'</span>':'</a>')).join('')+'</nav>';
 html+='</article>';
 $('#stage').innerHTML=html;
 $('#location').textContent='한 장씩 따라 하는 AI 수업';$('#counter').textContent='여기서 시작하세요';$('#nextHint').textContent=first?first.day+'차시 · '+first.title:'';
 $('#prev').disabled=true;$('#next').disabled=!first;$('#next').textContent='수업 시작 →';$('#progress').style.width='0%';document.title='Bravo AI Life · 한 장씩 따라 하기'+(E?' · '+E.name:'');
 if(first)$('#startButton').onclick=()=>go(first.id);
 if($('#signOut'))$('#signOut').onclick=()=>A.signOut();
 if($('#coverRetry'))$('#coverRetry').onclick=async()=>{
  const b=$('#coverRetry');b.disabled=true;b.textContent='확인하고 있습니다';
  await A.refresh();
  if(document.body.contains(b)){b.disabled=false;b.textContent='다시 확인하기';toast('아직 열리지 않았습니다.');}   // otherwise the cover was drawn again with the lesson
 };
 if($('#resumeButton'))$('#resumeButton').onclick=()=>go(last.id);
}

function chapter(s){
 const m=s.meta||{},secs=sectionsOf(s.day);
 let html='<article class="slide chapter'+(s.media?' has-art':'')+'"><div class="ch-main"><p class="ch-kicker"><b>'+s.day+'차시</b><span>Bravo AI Life '+(m.course||'')+' · '+esc(courseNames[m.course]||'')+'</span>'+(m.date?'<span>'+esc(m.date)+'</span>':'')+'</p><h1>'+esc(s.title)+'</h1>';
 if(s.text?.length)html+='<p class="ch-lead">'+esc(s.text[0])+'</p>';
 // Kept short on purpose: the story is on the map slide, the results on the closing slide, the order in the table of contents.
 if(m.goals?.length)html+='<section class="ch-goals"><h2>오늘 할 일</h2><ol class="goals">'+m.goals.map(g=>'<li>'+esc(g)+'</li>').join('')+'</ol></section>';
 html+='<p class="ch-start"><button data-open-toc>오늘의 순서 보기<small>'+secs.length+'부분 · '+s.total+'장</small></button><span>아래 ‘다음’을 누르면 시작합니다</span></p>';
 html+='</div>';
 if(s.media)html+='<figure class="ch-art"><img src="'+esc(s.media)+'" alt=""></figure>';
 return html+'</article>';
}

// The map of the whole course: three courses, twelve lessons, one business.
function journeyMap(j){
 let html='<div class="journey'+(j.courses.length===1?' one':'')+'">';
 j.courses.forEach((name,c)=>{
  html+='<section class="j-course'+(c+1===j.course?' now':'')+'"><h2><small>Bravo AI Life '+(c+1)+'</small>'+esc(name)+'</h2><ol>';
  html+=j.stages.filter(st=>Math.ceil(st.day/4)===c+1).map(st=>'<li'+(st.day===j.day?' class="here"':allowed(st.day)?'':' class="locked"')+'><button data-jump="day-'+st.day+'"><b>'+st.day+'</b><span>'+esc(st.name)+'<small>'+esc(st.tool)+'</small></span>'+(st.day===j.day?'<em>오늘</em>':'')+'</button></li>').join('');
  html+='</ol></section>';
 });
 return html+'</div>';
}

function slide(s,extra){
 const run=runOf.get(s.id),ps=s.prompts||[],tp=s.template||[],split=s.layout==='split'&&s.media,mates=matesOf(s);
 const copies=[...ps,...tp];
 let cls='slide role-'+(s.role||'action')+(s.kind?' kind-'+s.kind:'')+(s.media?'':' no-media')+(split?' split':'');
 let head='<header class="slide-head"><p class="crumb"><span class="badge">'+esc(s.phase)+'</span>';
 if(s.tool)head+='<span class="section">'+esc(s.tool)+' 기본 사용법</span>';
 else if(!extra&&s.section)head+='<span class="section">'+esc(s.section)+'</span>';
 if(!extra&&run&&run.slides.length>1)head+='<span class="step">'+(run.slides.indexOf(s)+1)+' / '+run.slides.length+'</span>';
 if(mates)head+='<span class="series">선택 실습 · '+esc(s.series)+'</span><span class="step">'+(mates.indexOf(s)+1)+' / '+mates.length+'</span>';
 head+='</p><h1>'+esc(s.title)+'</h1></header>';
 let lead='';
 if(s.text?.length)lead+='<div class="instructions">'+s.text.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>';
 if(s.steps?.length)lead+='<ol class="steps">'+s.steps.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ol>';
 if(s.points?.length)lead+='<ul class="points">'+s.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ul>';
 if(s.journey)lead+=journeyMap(s.journey);
 if(s.openLink)lead+='<p><a class="open-platform" href="'+esc(s.openLink.url)+'" target="_blank" rel="noopener">'+esc(s.openLink.name)+'</a></p>';
 if(s.downloads?.length)lead+='<div class="downloads">'+s.downloads.map(a=>'<a download href="'+esc(a.url)+'">'+esc(a.name)+'</a>').join('')+'</div>';
 let after='';
 const promptLabel=s.copyLabel||'복사해서 AI에 입력하세요';
 after+=ps.map((p,i)=>copyBox(p,i,promptLabel,s.copyLabel?'answer':'request')).join('');
 after+=tp.map((p,i)=>copyBox(p,ps.length+i,promptLabel,'request')).join('');
 if(s.promptReflowed&&ps.length)after+='<p class="reflow-note">원문 내용은 그대로이며, 읽기 쉽게 줄바꿈만 정리했습니다.</p>';
 if(s.checks?.length)after+='<section class="checkbox"><h2>'+(s.kind==='recap'?'오늘 직접 해 본 일':'확인하세요')+'</h2>'+checklist(s.checks)+'</section>';
 if(s.next)after+='<p class="next-lesson">'+esc(s.next)+'</p>';
 // A portrait picture stands beside the whole slide, so its caption joins the text column.
 if((!s.media||split)&&s.note)after+='<p class="plain-note">'+esc(s.note)+(s.source?' · <a target="_blank" rel="noopener" href="'+esc(s.source)+'">공식 도움말</a>':'')+'</p>';
 const fig=figure(split?{...s,note:''}:s);
 const body=split?'<div class="col">'+head+'<div class="lead">'+lead+'</div><div class="after">'+after+'</div></div>'+fig:head+lead+fig+after;
 $('#stage').innerHTML='<article class="'+cls+'">'+body+'</article>';
 $$('.copy').forEach(b=>b.onclick=async()=>{
  const text=copies[Number(b.dataset.copy)];let ok=true;
  try{await navigator.clipboard.writeText(text);}
  catch(e){const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.append(t);t.select();ok=document.execCommand('copy');t.remove();}
  if(ok){b.innerHTML=doneIcon;b.classList.add('done');setTimeout(()=>{b.innerHTML=copyIcon;b.classList.remove('done');},2000);}
  toast(ok?'복사했어요. 입력창을 누르고 Ctrl+V로 붙여 넣으세요.':'글을 직접 선택한 뒤 Ctrl+C로 복사해 주세요.');
 });
 const img=$('#slideImage');
 if(img){
  const zoom=()=>{const d=$('#zoom'),z=d.querySelector('img');z.src=img.src;z.alt=s.alt||s.title;d.showModal();};
  $('#zoomButton').onclick=zoom;img.onclick=zoom;img.onload=more;
 }
 if($('#gifToggle'))$('#gifToggle').onclick=()=>{
  const b=$('#gifToggle'),play=b.getAttribute('aria-pressed')!=='true';
  img.style.aspectRatio=play?'auto':'';img.src=play?s.gif:s.media;
  b.setAttribute('aria-pressed',String(play));b.textContent=play?'■ 멈추기':'▶ 순서대로 재생';
 };
}

// Nobody is signed in yet: ask for the name and the four digits before anything of the lessons is shown.
// The notice about the name and digits (access-config.js: BRAVO_PRIVACY). Consent given on this browser is remembered.
const P=window.BRAVO_PRIVACY||{who:'수업 강사',keep:'과정이 끝난 뒤 삭제'},AGREED='bravo-privacy-agreed';
const agreed=()=>{try{return localStorage.getItem(AGREED)==='1';}catch(e){return false;}};
function gateScreen(){
 document.body.classList.add('gated');current=null;
 let html='<article class="slide cover gate"><span class="label">BRAVO AI LIFE</span><h1>수강생 확인</h1>';
 if(A.state.status==='checking')html+='<p>잠시만 기다려 주세요.</p>';
 else html+='<p>이름과 휴대폰 번호 뒷자리 네 개를 입력하면 수업 자료가 열립니다.</p>'
  +'<form class="gate-form" id="gateForm" autocomplete="off" novalidate>'
  +'<label for="gateName">이름</label><input id="gateName" type="text" maxlength="30" placeholder="예: 홍길동" autocomplete="off" autocapitalize="off" spellcheck="false">'
  +'<label for="gateDigits">휴대폰 번호 뒷자리 네 개</label><input id="gateDigits" type="text" inputmode="numeric" maxlength="4" placeholder="예: 1234" autocomplete="off">'
  +'<div class="gate-consent"><label class="gate-keep"><input id="gateAgree" type="checkbox"'+(agreed()?' checked':'')+'><span><b>개인정보 수집·이용에 동의합니다</b> (필수)</span></label>'
  +'<details><summary>안내 보기</summary><dl class="privacy">'
  +'<dt>수집하는 곳</dt><dd>'+esc(P.who)+'</dd>'
  +'<dt>수집 항목</dt><dd>이름, 휴대폰 번호 뒷자리 4자리</dd>'
  +'<dt>이용 목적</dt><dd>수강생 확인과 과목별 수업 자료 열람</dd>'
  +'<dt>보관 기간</dt><dd>'+esc(P.keep)+'</dd>'
  +'</dl><p class="privacy-note">동의하지 않을 수 있습니다. 다만 동의하지 않으면 수업 자료에 들어갈 수 없습니다.</p></details></div>'
  +'<button class="primary start" id="gateButton">들어가기\u3000→</button>'
  +'<p class="gate-msg" id="gateMsg" role="alert">'+(A.state.note==='gone'?'다시 확인이 필요합니다. 이름과 번호를 입력해 주세요.':'')+'</p></form>'
  +'<p class="small">수강 신청 때 알려 주신 이름과 번호입니다. 열리지 않으면 선생님께 말씀해 주세요.</p>';
 $('#stage').innerHTML=html+'</article>';
 $('#location').textContent='한 장씩 따라 하는 AI 수업';document.title='Bravo AI Life · 수강생 확인';$('#stage').scrollTop=0;more();
 const form=$('#gateForm');if(!form)return;
 const say=t=>{$('#gateMsg').textContent=t;},digits=$('#gateDigits');
 digits.addEventListener('input',()=>{digits.value=digits.value.replace(/\D/g,'').slice(0,4);});
 digits.addEventListener('paste',e=>{e.preventDefault();digits.value=A.normDigits(e.clipboardData.getData('text'));});   // a whole phone number: keep its last four
 form.onsubmit=async e=>{
  e.preventDefault();
  const name=$('#gateName').value,b=$('#gateButton');
  if(!A.normName(name)){say('이름을 입력해 주세요.');$('#gateName').focus();return;}
  if(A.normDigits(digits.value).length!==4){say('휴대폰 번호 뒷자리 네 개를 모두 입력해 주세요.');digits.focus();return;}
  if(!$('#gateAgree').checked){say('개인정보 수집·이용에 동의해 주세요.');$('#gateAgree').focus();return;}
  try{localStorage.setItem(AGREED,'1');}catch(e){}
  b.disabled=true;say('확인하고 있습니다.');
  const result=await A.signIn(name,digits.value);
  if(result==='in')return;   // the reader has already drawn itself again
  b.disabled=false;
  say(result==='unknown'?'명단에서 찾지 못했습니다. 이름과 번호 네 자리를 다시 확인해 주세요.':'지금은 확인할 수 없습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.');
 };
 if(matchMedia('(pointer:fine)').matches)$('#gateName').focus({preventScroll:true});
}
// A lesson of a course this student has not been given, or a lesson the teacher has not opened for the class yet.
function lockedScreen(s){
 const c=Math.ceil(s.day/4),lesson=lessonOf(s.day),to=firstOpen(),later=D.lessons.find(l=>l.day>s.day&&allowed(l.day)),soon=notYet(s.day),what=soon?'아직 열리지 않은 수업':'열리지 않은 과목';
 let html='<article class="slide cover gate"><span class="label">BRAVO AI LIFE '+c+'</span><h1>'+what+'입니다</h1><p>'+s.day+'차시 ‘'+esc(lesson.title)+'’는 '
  +(soon?'수업하는 날 선생님이 엽니다. 수업이 시작되었으면 아래 ‘다시 확인하기’를 눌러 주세요.':'<b>Bravo AI Life '+c+' · '+esc(courseNames[c])+'</b> 과목의 수업입니다. 수강 중인 과목의 수업만 볼 수 있습니다.')+'</p><div class="cover-actions">';
 if(to)html+='<button class="'+(soon?'resume':'primary start')+'" id="lockedGo">'+to.day+'차시로 가기\u3000→</button>';
 html+='<button class="'+(soon?'primary start':'resume')+'" id="lockedRetry">다시 확인하기</button></div><p class="small">'+(soon?'계속 열리지 않으면 선생님께 말씀해 주세요.':'수강 중인데 열리지 않으면 선생님께 말씀해 주세요.')+'</p></article>';
 $('#stage').innerHTML=html;
 $('#location').textContent=s.day+'차시 · '+lesson.title;$('#counter').textContent=what;$('#nextHint').textContent='';
 $('#prev').disabled=false;$('#next').disabled=false;$('#next').textContent=later?later.day+'차시로 →':'처음으로 →';$('#progress').style.width='0%';document.title='Bravo AI Life · '+what;
 if(to)$('#lockedGo').onclick=()=>go(to.id);
 $('#lockedRetry').onclick=async()=>{
  const b=$('#lockedRetry');b.disabled=true;b.textContent='확인하고 있습니다';
  await A.refresh();
  if(document.body.contains(b)){b.disabled=false;b.textContent='다시 확인하기';toast('아직 열리지 않았습니다.');}   // otherwise the lesson is already on the screen
 };
}

function render(){
 if(gated()){gateScreen();return;}
 document.body.classList.remove('gated');
 let id=decodeURIComponent(location.hash.slice(1)||'start');
 if(/^day-\d+$/.test(id))id=lessonOf(Number(id.slice(4)))?.id||'start';
 current=byId.get(id)||null;
 $$('video,audio').forEach(v=>v.pause());
 if(!current){cover();$('#stage').scrollTop=0;more();return;}
 if(!allowed(current.day)){lockedScreen(current);$('#stage').scrollTop=0;more();return;}
 const s=current,ix=D.slides.indexOf(s),extra=ix<0,lesson=lessonOf(s.day);
 tocDay=s.day;
 if(s.kind==='chapter')$('#stage').innerHTML=chapter(s);else slide(s,extra);
 $$('#stage [data-jump]').forEach(b=>b.onclick=()=>go(b.dataset.jump));
 $$('#stage [data-open-toc]').forEach(b=>b.onclick=()=>$('#tocButton').click());
 $('#prev').disabled=false;$('#next').disabled=false;
 const mates=extra?matesOf(s):null,mi=mates?mates.indexOf(s):-1,mateNext=mates?mates[mi+1]:null;
 $('#next').textContent=extra?(mateNext?'다음 →':'수업으로 돌아가기 →'):ix===D.slides.length-1?'처음으로 →':'다음 →';
 $('#location').textContent=s.day+'차시 · '+lesson.title;
 $('#counter').textContent=mates?'선택 실습　'+(mi+1)+' / '+mates.length:extra?'선택 예제':s.day+'차시　'+s.number+' / '+s.total;
 const next=D.slides[ix+1];
 $('#nextHint').textContent=extra?(mateNext?'다음: '+mateNext.title:'원래 보던 수업으로 돌아갑니다'):next?(next.day!==s.day?(allowed(next.day)?'다음: '+next.day+'차시 시작':notYet(next.day)?'다음 차시는 수업하는 날 열립니다':'다음 차시는 열리지 않은 과목입니다'):'다음: '+next.title):(E?E.last:'전체 수업의 마지막 장입니다');
 $('#progress').style.width=mates?((mi+1)/mates.length*100)+'%':extra?'100%':(s.number/s.total*100)+'%';
 document.title=(mates?'선택 실습 '+(mi+1)+'/'+mates.length:extra?'선택 예제':s.day+'차시 '+s.number+'/'+s.total)+' · '+s.title;
 $('#stage').scrollTop=0;$('#stage').focus({preventScroll:true});more();
 if(!extra){try{localStorage.setItem(KEY,s.id);}catch(e){}}
}

// Tell the reader when the rest of a slide is below the visible area.
function more(){const st=$('#stage');$('#more').hidden=st.scrollHeight-st.scrollTop-st.clientHeight<40;}
$('#more').onclick=()=>$('#stage').scrollBy({top:$('#stage').clientHeight*.75,behavior:'smooth'});
$('#stage').addEventListener('scroll',more,{passive:true});window.addEventListener('resize',more);

function leaveExtra(step){
 const mates=matesOf(current),to=mates?mates[mates.indexOf(current)+step]:null;
 go(to?to.id:optionalReturn||lessonOf(current.day).id);
}
function next(){
 if(gated())return;
 if(!current){const first=firstOpen();if(first)go(first.id);return;}
 if(!allowed(current.day)){const later=D.lessons.find(l=>l.day>current.day&&allowed(l.day));return go(later?later.id:'start');}
 const i=D.slides.indexOf(current);if(i<0)return leaveExtra(1);go(D.slides[i+1]?.id||'start');
}
function prev(){
 if(gated()||!current)return;
 if(!allowed(current.day)){const before=D.slides.filter(x=>x.day<current.day&&allowed(x.day)).pop();return go(before?before.id:'start');}
 const i=D.slides.indexOf(current);if(i<0)return leaveExtra(-1);go(D.slides[i-1]?.id||'start');
}

function toc(){
 let lessons='';
 for(let c=1;c<=3;c++){
  if(!D.lessons.some(l=>Math.ceil(l.day/4)===c))continue;   // a topic edition may hold one course only
  const mine=D.lessons.filter(l=>Math.ceil(l.day/4)===c),given=mine.some(l=>allowed(l.day)||notYet(l.day));   // the course is the student's, whether or not a lesson is open yet
  lessons+='<h3>Bravo AI Life '+c+'<small>'+esc(courseNames[c])+(given?'':' · 열리지 않은 과목')+'</small></h3>';
  lessons+=mine.map(l=>'<button data-day="'+l.day+'"'+(allowed(l.day)?'':' disabled')+(l.day===tocDay?' class="active" aria-current="true"':'')+'><b>'+l.day+'</b><span>'+esc(l.title)+(notYet(l.day)?'<small>수업하는 날 열립니다</small>':'')+'</span></button>').join('');
 }
 $('#tocLessons').innerHTML=lessons;
 if(!allowed(tocDay)){   // nothing is open to this student (or not in this edition)
  $('#tocSections').innerHTML='<h3>열린 수업이 없습니다</h3><p class="toc-none">'+(D.lessons.some(l=>notYet(l.day))?'수업하는 날 선생님이 그날의 수업을 엽니다.':'수강 중인 과목의 수업만 열 수 있습니다. 선생님께 말씀해 주세요.')+'</p>';
  $$('#tocLessons button').forEach(b=>b.onclick=()=>{tocDay=Number(b.dataset.day);toc();});
  return;
 }
 const lesson=lessonOf(tocDay),first=byId.get(lesson.id),dayExtras=D.extras.filter(e=>e.day===tocDay);
 const series=[...seriesMap.entries()].filter(([k])=>k.startsWith(tocDay+'|')).map(([,v])=>v),extras=dayExtras.filter(e=>!e.series);
 let html='<h3>'+tocDay+'차시 · '+esc(lesson.title)+(first.meta?.date?'<small>'+esc(first.meta.date)+'</small>':'')+'</h3>';
 html+='<div class="toc-list"><button class="from-start" data-jump="'+lesson.id+'"><b>▶</b><span>처음부터 보기</span><small>'+first.total+'장</small></button>';
 html+=sectionsOf(tocDay).map((r,i)=>'<button data-jump="'+r.slides[0].id+'"'+(current&&runOf.get(current.id)===r?' class="here"':'')+'><b>'+(i+1)+'</b><span>'+esc(r.name)+'</span><small>'+r.slides.length+'장</small></button>').join('')+'</div>';
 if(series.length)html+='<h4>선택 실습 '+series.length+'개 <small>다른 소재로 한 번 더 연습합니다</small></h4><div class="toc-list extra">'+series.map(v=>'<button data-jump="'+v[0].id+'" data-extra="1"'+(current&&matesOf(current)===v?' class="here"':'')+'><span>'+esc(v[0].series)+'</span><small>'+v.length+'장</small></button>').join('')+'</div>';
 if(extras.length)html+='<h4>선택 예제·참고 '+extras.length+'개 <small>본 수업 순서와 별개입니다</small></h4><div class="toc-list extra">'+extras.map(e=>'<button data-jump="'+e.id+'" data-extra="1"><span>'+esc(e.title)+'</span></button>').join('')+'</div>';
 $('#tocSections').innerHTML=html;
 $$('#tocLessons button').forEach(b=>b.onclick=()=>{tocDay=Number(b.dataset.day);toc();$('#tocSections').scrollTop=0;});
 $$('#tocSections [data-jump]').forEach(b=>b.onclick=()=>{
  if(b.dataset.extra&&current&&D.slides.includes(current))optionalReturn=current.id;
  $('#toc').close();go(b.dataset.jump);
 });
}
$('#tocButton').onclick=()=>{tocDay=current&&allowed(current.day)?current.day:(firstOpen()||{day:1}).day;toc();$('#toc').showModal();};
$$('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close();}));
$('#prev').onclick=prev;$('#next').onclick=next;
$('#fullButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){toast('키보드의 F11 키로 전체 화면을 열어 주세요');}};
document.addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||e.ctrlKey||e.altKey||e.metaKey||/INPUT|TEXTAREA|VIDEO|AUDIO/.test(e.target.tagName))return;
 if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();next();}
 if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prev();}
});
// The roster answered, or somebody signed in or out: draw again with what is open now.
A.subscribe(()=>{$$('dialog[open]').forEach(d=>d.close());render();});
window.addEventListener('hashchange',render);A.start();render();
})();
