(()=>{'use strict';
const D=window.BRAVO_DECK,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const all=[...D.slides,...D.extras],byId=new Map(all.map(s=>[s.id,s]));let current=null,optionalReturn=null;
$('#extraTab').textContent='선택 예제·참고 '+D.extras.length+'개';
const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>';
function go(id){if(location.hash.slice(1)===id)render();else location.hash=id;}
function toast(t){$('#toast').textContent=t;setTimeout(()=>$('#toast').textContent='',2000);}
function prompt(p,i){return '<section class="prompt"><div class="prompt-head"><span>복사해서 AI에 입력하세요</span><button class="copy" data-prompt="'+i+'" aria-label="프롬프트 복사" title="프롬프트 복사">'+icon+'</button></div><pre>'+esc(p)+'</pre></section>';}
function render(){
 let id=decodeURIComponent(location.hash.slice(1)||'start');if(/^day-\d+$/.test(id))id=D.lessons.find(l=>l.day===Number(id.slice(4)))?.id||'start';current=byId.get(id)||null;
 $('#stage').scrollTop=0;document.querySelectorAll('video,audio').forEach(v=>v.pause());
 if(!current){
  $('#stage').innerHTML='<article class="slide cover"><span class="label">BRAVO AI LIFE</span><h1>한 장씩 보고,<br>그대로 따라 하세요.</h1><p>시작을 누르면 첫 번째 화면부터 안내합니다.<br>다음 장으로 갈 때는 아래 ‘다음’ 또는 → 키를 누르세요.</p><button class="primary start" id="startButton">1차시 시작　→</button><p class="small">다른 차시를 보려면 오른쪽 위 ‘목차’를 누르세요.</p><div class="cover-steps"><span>① 화면 보기</span>→<span>② 직접 해 보기</span>→<span>③ 다음 장</span></div></article>';
  $('#location').textContent='한 장씩 따라 하는 AI 수업';$('#counter').textContent='여기서 시작하세요';$('#nextHint').textContent='1차시 · ChatGPT 첫걸음';$('#prev').disabled=true;$('#next').textContent='수업 시작 →';$('#progress').style.width='0%';$('#startButton').onclick=()=>go(D.slides[0].id);return;
 }
 const s=current,ix=D.slides.indexOf(s),extra=ix<0,lesson=D.lessons.find(l=>l.day===s.day);
 $('#prev').disabled=false;$('#next').textContent=extra?'수업으로 돌아가기 →':ix===D.slides.length-1?'처음으로 →':'다음 →';
 $('#location').textContent=s.day+'차시 · '+lesson.title;$('#counter').textContent=extra?'선택 예제':s.day+'차시　'+s.number+' / '+s.total;
 const next=D.slides[ix+1];$('#nextHint').textContent=extra?'원래 보던 수업으로 돌아갑니다':next?'다음: '+next.title:'전체 수업의 마지막 장입니다';$('#progress').style.width=extra?'100%':(s.number/s.total*100)+'%';
 let kind=s.kind||'',hasMedia=Boolean(s.media),ps=s.prompts||[];
 let body='<article class="slide '+esc(kind)+' '+(!hasMedia?'no-media ':'')+(!hasMedia&&ps.length?'prompt-only':'')+'"><div class="slide-head"><div class="eyebrow"><b>'+String(s.day).padStart(2,'0')+'</b><span>'+esc(extra?'선택 예제':s.platform?s.platform+' 첫걸음 '+s.platformStep+' / '+s.platformTotal:kind==='chapter'?'이번 차시':kind==='prepare'?'먼저 준비하세요':s.gif?'실행 순서 보기':ps.length?'입력하기':'보고 따라 하세요')+'</span></div><h1>'+esc(s.title)+'</h1></div>';
 if(s.text?.length)body+='<div class="instructions">'+s.text.map(p=>'<p>'+esc(p)+'</p>').join('')+'</div>';
 if(s.points?.length)body+='<ol class="points">'+s.points.map(p=>'<li>'+esc(p)+'</li>').join('')+'</ol>';
 if(s.openLink)body+='<p><a class="open-platform" href="'+esc(s.openLink.url)+'" target="_blank" rel="noopener">'+esc(s.openLink.name)+'</a></p>';
 if(s.downloads?.length)body+='<div class="downloads">'+s.downloads.map(a=>'<a download href="'+esc(a.url)+'">'+esc(a.name)+'</a>').join('')+'</div>';
 if(hasMedia){
  body+='<div class="visual">';
  if(s.mediaType==='video'||s.mediaType==='audio')body+='<'+s.mediaType+' controls preload="metadata" src="'+esc(s.media)+'"></'+s.mediaType+'>';
  else body+='<img id="slideImage" src="'+esc(s.media)+'" alt="'+esc(s.alt||s.title)+'"><button class="image-open" id="zoomButton">⛶ 화면 확대</button>';
  body+='</div>';
 }
 if(s.gif)body+='<button class="gif-toggle" id="gifToggle" aria-pressed="false">▶ 실행 순서 GIF 재생</button>';
 body+=ps.map(prompt).join('');
 if(s.promptReflowed&&ps.length)body+='<p class="reflow-note">원문 내용은 유지하고, 읽기 쉽도록 줄바꿈을 정리했습니다.</p>';
 if(s.note)body+='<div class="media-note">'+esc(s.note)+(s.source?' · <a target="_blank" rel="noopener" href="'+esc(s.source)+'">공식 도움말</a>':'')+'</div>';
 if(kind==='chapter')body+='<div class="route"><span>준비</span>→<span>입력</span>→<span>결과 확인</span>→<span>조건 바꾸기</span></div>';
 $('#stage').innerHTML=body+'</article>';
 document.querySelector('.eyebrow span').textContent=(s.activity?s.activity+' · ':'')+s.phase;
 document.querySelectorAll('.prompt-head span').forEach(n=>n.textContent=s.copyLabel||'복사해서 AI에 입력하세요');
 document.querySelectorAll('.copy').forEach(n=>{n.setAttribute('aria-label',s.copyLabel?'원문 복사':'프롬프트 복사');n.title=s.copyLabel?'원문 복사':'프롬프트 복사';});
 document.querySelectorAll('.copy').forEach(b=>b.onclick=async()=>{const text=ps[Number(b.dataset.prompt)];try{await navigator.clipboard.writeText(text);toast('프롬프트를 복사했어요');}catch(e){const t=document.createElement('textarea');t.value=text;t.style.cssText='position:fixed;opacity:0';document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();toast(ok?'프롬프트를 복사했어요':'원문을 선택한 뒤 Ctrl+C로 복사해 주세요');}});
 function zoom(){const d=$('#zoom');d.querySelector('img').src=s.media;d.querySelector('img').alt=s.alt||s.title;d.showModal();}
 if($('#zoomButton')){$('#zoomButton').onclick=zoom;$('#slideImage').onclick=zoom;}
 if($('#gifToggle'))$('#gifToggle').onclick=()=>{const b=$('#gifToggle'),play=b.getAttribute('aria-pressed')!=='true';$('#slideImage').src=play?s.gif:s.media;b.setAttribute('aria-pressed',String(play));b.textContent=play?'■ GIF 멈추기':'▶ 실행 순서 GIF 재생';};
 try{localStorage.setItem('bravo-slide',s.id);}catch(e){}
}
function next(){if(!current)return go(D.slides[0].id);const i=D.slides.indexOf(current);if(i<0)return go(optionalReturn||D.lessons.find(l=>l.day===current.day).id);go(D.slides[i+1]?.id||'start');}
function prev(){if(!current)return;const i=D.slides.indexOf(current);if(i<0)return go(optionalReturn||D.lessons.find(l=>l.day===current.day).id);go(D.slides[i-1]?.id||'start');}
function toc(extra=false){$('#coreTab').classList.toggle('active',!extra);$('#extraTab').classList.toggle('active',extra);const rows=extra?D.extras:D.lessons;$('#tocItems').innerHTML=rows.map(s=>'<button data-jump="'+s.id+'"><small>'+s.day+'차시'+(extra?' · 선택 예제':' · Bravo AI Life '+Math.ceil(s.day/4))+'</small>'+esc(s.title)+'</button>').join('');$('#tocItems').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(extra&&current&&!current.id.startsWith('e'))optionalReturn=current.id;$('#toc').close();go(b.dataset.jump);});}
$('#tocButton').onclick=()=>{toc();$('#toc').showModal();};$('#coreTab').onclick=()=>toc();$('#extraTab').onclick=()=>toc(true);document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
$('#prev').onclick=prev;$('#next').onclick=next;$('#fullButton').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){toast('브라우저의 F11 키로 전체 화면을 열어 주세요');}};
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.ctrlKey||e.altKey||e.metaKey||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();next();}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();prev();}});
window.addEventListener('hashchange',render);render();
})();
