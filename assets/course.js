const select=(s)=>[...document.querySelectorAll(s)];
function showTab(id){select('[data-tab]').forEach(b=>{const on=b.dataset.tab===id;b.setAttribute('aria-pressed',String(on));document.getElementById(b.dataset.tab).hidden=!on})}
select('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
let timer;function note(s){document.querySelector('output').textContent=s;clearTimeout(timer);timer=setTimeout(()=>document.querySelector('output').textContent='',2200)}
const copyTimers = new WeakMap();
document.querySelectorAll("button.copy").forEach(button => {
  button.onclick = async () => {
    const source = button.closest(".copybox,.copyarea").querySelector("pre");
    const status = document.querySelector('output[role="status"]');
    try {
      await navigator.clipboard.writeText(source.textContent);
    } catch {
      const field = document.createElement("textarea");
      field.value = source.textContent;
      field.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.append(field);
      field.select();
      let copied = false;
      try { copied = document.execCommand("copy"); }
      finally { field.remove(); button.focus({preventScroll:true}); }
      if (!copied) {
        source.hidden = false;
        const range = document.createRange();
        range.selectNodeContents(source);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        if(status) status.textContent = "선택된 원문을 Ctrl+C로 복사하세요.";
        return;
      }
    }
    button.dataset.copied = "";
    if(status) status.textContent = "원문을 복사했습니다.";
    clearTimeout(copyTimers.get(button));
    copyTimers.set(button, setTimeout(() => {
      delete button.dataset.copied;
      if(status && !document.querySelector(".copy[data-copied]")) status.textContent = "";
    }, 1800));
  };
});

const modal=document.querySelector('dialog');select('.photo,.guide figure img').forEach(b=>{b.onclick=()=>{const im=b.tagName==='IMG'?b:b.querySelector('img');if(im){modal.querySelector('img').src=im.src;modal.showModal()}}});modal.querySelector('button').onclick=()=>modal.close();
select('[data-save]').forEach(t=>{try{t.value=localStorage.getItem(t.dataset.save)||'';t.oninput=()=>{try{localStorage.setItem(t.dataset.save,t.value)}catch{}}}catch{}});
select('.save').forEach(b=>b.onclick=()=>{const t=b.parentElement.querySelector('textarea');const url=URL.createObjectURL(new Blob([t.value],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=t.dataset.save+'-검토.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
function route(){if(location.hash==='#lab'&&document.querySelector('details#lab'))document.querySelector('details#lab').open=true;const m=location.hash.match(/^#case(\d+)$/);if(m){let a=document.querySelectorAll('.lesson-toc a[href^="D"],.casecard')[Number(m[1])-1];if(a)location.replace(a.href)}}route();window.addEventListener('hashchange',route);

function openChapterContents(){if(/^#day-\d{2}$/.test(location.hash)){const section=document.getElementById(location.hash.slice(1));const details=section?.querySelector('details');if(details)details.open=true}}
openChapterContents();window.addEventListener('hashchange',openChapterContents);
if (location.protocol === "file:") {
  let loadFiles;
  document.querySelectorAll(".prerequisites a[download]").forEach(link => {
    link.addEventListener("click", async event => {
      event.preventDefault();
      if (!loadFiles) {
        loadFiles = new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.onload = resolve;
          script.onerror = reject;
          script.src = "준비자료_오프라인.js";
          document.head.append(script);
        });
      }
      try {
        await loadFiles;
        const name = decodeURIComponent(new URL(link.href).pathname.split("/").pop());
        const bytes = Uint8Array.from(atob(window.bravoDownloads[name]), ch => ch.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], {type:"application/octet-stream"}));
        const save = document.createElement("a");
        save.href = url;
        save.download = link.download;
        save.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch {
        loadFiles = null;
        location.href = link.href;
      }
    });
  });
}

