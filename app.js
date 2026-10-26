(function(){
const C=window.MH,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const sb=(C.SUPABASE_URL&&window.supabase)?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
window.MH_SB=sb;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS=['spotify','apple','soundcloud','ytmusic','youtube','facebook','instagram','tiktok','x'];
const ok=u=>u&&u!=='#'&&/^https?:\/\//.test(u);
const img=u=>u?`<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`:'';
const svg=d=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="${d}"/></svg>`;
const I={play:svg('M8 5v14l11-7z'),pause:svg('M6 5h4v14H6zM14 5h4v14h-4z'),prev:svg('M6 6h2v12H6zM20 6v12L9.5 12z'),next:svg('M16 6h2v12h-2zM4 6v12l10.5-6z')};
function icons(links,keys){links=links||{};
 const h=(keys||ICONS).filter(k=>ok(links[k])).map(k=>`<a href="${esc(links[k])}" target="_blank" rel="noopener" aria-label="${k}"><svg class="ico"><use href="#i-${k}"/></svg></a>`).join('');
 return h?`<div class="socials">${h}</div>`:''}
const cnt=n=>{n=n||0;const t=n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1e3?(n/1e3).toFixed(1).replace('.0','')+'K':String(n);return t+(n===1?' play':' plays')};
const fmt=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
const R={
 artists:a=>`<article class="artist rv" data-open="artist" data-id="${esc(a.id)}" tabindex="0"><div class="cover">${img(a.cover_url)}</div><div class="avatar">${img(a.avatar_url)}</div><div class="info"><h3>${esc(a.name)}</h3><p class="role">${esc(a.role)}</p>${a.bio?`<p class="bio">${esc(a.bio)}</p>`:''}${icons(a.links)}</div></article>`,
 releases:r=>{const ar=r.artists&&r.artists.name||'';const cover=r.cover_url||(r.artists&&r.artists.avatar_url)||'';return `<article class="release rv"><div class="art">${img(cover)}</div><div class="info"><h3>${esc(r.title)}</h3><p class="meta">${esc([ar,r.type,r.release_date&&r.release_date.slice(0,4)].filter(Boolean).join(' · '))}</p>${r.audio_url?`<div class="pr"><button type="button" class="play" data-play="${esc(r.audio_url)}" data-rid="${esc(r.id)}" data-title="${esc(r.title)}" data-artist="${esc(ar)}" data-cover="${esc(cover)}">${I.play}<span>Play</span></button><span class="plays" data-plays="${esc(r.id)}">${cnt(r.play_count)}</span></div>`:''}${icons(r.links)}</div></article>`},
 news:n=>`<article class="card rv" data-open="news" data-id="${esc(n.id)}" tabindex="0">${img(n.image_url)}<div class="info"><time>${fmt(n.published_at)}</time><h3>${esc(n.title)}</h3>${n.body?`<p>${esc(n.body)}</p>`:''}</div></article>`
};
const ORDER={artists:['sort',true],releases:['release_date',false],news:['published_at',false]};
const CACHE={};
const byPlays=a=>[...a].sort((x,y)=>(y.play_count||0)-(x.play_count||0)||new Date(y.release_date||0)-new Date(x.release_date||0));
async function load(t,limit){const d=await load0(t,limit);d.forEach(x=>CACHE[t+x.id]=x);return d}
async function load0(t,limit){
 if(sb){let q=sb.from(t).select(t==='releases'?'*, artists(id,name,avatar_url)':'*');if(t==='releases')q=q.order('play_count',{ascending:false}).order('release_date',{ascending:false});else q=q.order(ORDER[t][0],{ascending:ORDER[t][1]});if(limit)q=q.limit(limit);
  const {data,error}=await q;if(!error)return t==='releases'?byPlays(data):data}
 const d=C.FALLBACK[t]||[];return limit?d.slice(0,limit):d}
const io='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1}):null;
const reveal=el=>$$('.rv',el).forEach(x=>io?io.observe(x):x.classList.add('in'));
function toolbar(el,rows,draw){let ty='All',q='';const types=['All',...new Set(rows.map(r=>r.type).filter(Boolean))];
 const bar=document.createElement('div');bar.className='toolbar';
 bar.innerHTML='<input type="search" placeholder="Search releases" aria-label="Search">'+types.map(x=>`<button type="button" class="chip${x==='All'?' on':''}">${esc(x)}</button>`).join('');
 el.before(bar);const go=()=>draw(rows.filter(r=>(ty==='All'||r.type===ty)&&(!q||(r.title+' '+(r.artists&&r.artists.name||'')).toLowerCase().includes(q))));
 bar.querySelector('input').oninput=e=>{q=e.target.value.trim().toLowerCase();go()};
 bar.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ty=b.textContent;bar.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b));go()});draw(rows)}
/* ---- persistent player (lives outside <main>, survives page changes) ---- */
const au=new Audio();au.preload='none';window.MH_AUDIO=au;let Q=[],qi=-1,counted=false;
const pl=document.createElement('div');pl.id='player';
pl.innerHTML=`<div class="wrap pl"><div class="pc"></div><div class="pt"><b></b><small></small></div><div class="pb"><button data-pl="prev" aria-label="Previous">${I.prev}</button><button data-pl="toggle" class="big" aria-label="Play or pause">${I.play}</button><button data-pl="next" aria-label="Next">${I.next}</button></div><input type="range" min="0" max="1000" value="0" aria-label="Seek"><span class="tm">0:00</span></div>`;
document.body.append(pl);
const seek=$('input',pl),tm=$('.tm',pl),mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function sync(){const on=!au.paused;$('[data-pl=toggle]',pl).innerHTML=on?I.pause:I.play;const cur=Q[qi]&&Q[qi].url;
 $$('.play').forEach(b=>{const a=b.dataset.play===cur&&on;b.classList.toggle('on',a);$('svg',b).outerHTML=a?I.pause:I.play;$('span',b).textContent=a?'Pause':'Play'})}
function playIdx(i){qi=i;counted=false;const t=Q[i];au.src=t.url;au.play().catch(()=>{});$('.pc',pl).innerHTML=img(t.cover);$('.pt b',pl).textContent=t.title;$('.pt small',pl).textContent=t.artist;
 pl.classList.add('show');document.body.classList.add('has-player');sync()}
['play','pause'].forEach(e=>au.addEventListener(e,sync));
au.ontimeupdate=()=>{const t=Q[qi];if(!counted&&t&&t.rid&&au.currentTime>=Math.min(30,(au.duration||60)/2)){counted=true;logPlay(t.rid)}if(au.duration){seek.value=au.currentTime/au.duration*1000;tm.textContent=mmss(au.currentTime)}};
au.onended=()=>{counted=false;qi<Q.length-1?playIdx(qi+1):sync()};
seek.oninput=()=>{if(au.duration)au.currentTime=seek.value/1000*au.duration};
pl.onclick=e=>{const b=e.target.closest('[data-pl]');if(!b)return;const k=b.dataset.pl;
 if(k==='toggle')au.paused?au.play():au.pause();
 if(k==='next'&&qi<Q.length-1)playIdx(qi+1);
 if(k==='prev'){if(au.currentTime>3||qi<1)au.currentTime=0;else playIdx(qi-1)}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-play]');if(!b)return;
 const same=Q[qi]&&Q[qi].url===b.dataset.play;
 Q=$$('[data-play]',b.closest('.grid')||document).map(x=>({url:x.dataset.play,title:x.dataset.title,artist:x.dataset.artist,cover:x.dataset.cover,rid:x.dataset.rid}));
 qi=Q.findIndex(t=>t.url===b.dataset.play);
 if(same)au.paused?au.play():au.pause();else playIdx(qi)});
/* ---- play counting: a play counts after 30s (or half of a short track); the server de-dupes per visitor per day ---- */
function bump(rid){const r=CACHE['releases'+rid];if(r)r.play_count=(r.play_count||0)+1;$$('[data-plays]').forEach(el=>{if(el.dataset.plays===rid&&r)el.textContent=cnt(r.play_count)})}
async function logPlay(rid){let vid='anon';try{vid=localStorage.mh_vid||(localStorage.mh_vid=crypto.randomUUID())}catch(e){}
 if(!sb)return bump(rid);const {data,error}=await sb.rpc('log_play',{rid,vid});if(!error&&data===true)bump(rid)}
/* ---- detail dialog ---- */
const dlg=document.createElement('dialog');document.body.append(dlg);
dlg.onclick=e=>{if(e.target===dlg||e.target.closest('[data-x]'))dlg.close()};
async function openIt(kind,id){const X='<button class="x" data-x aria-label="Close">×</button>';
 if(kind==='artist'){const a=CACHE['artists'+id];if(!a)return;const rel=(await load('releases')).filter(r=>r.artist_id===a.id);
  dlg.innerHTML=`${X}<div class="m-head">${img(a.avatar_url)}<div><h2>${esc(a.name)}</h2><p class="role">${esc(a.role)}</p></div></div>${a.bio?`<p class="bio">${esc(a.bio)}</p>`:''}${icons(a.links)}<h3>Releases</h3>${rel.length?`<div class="grid releases">${rel.map(R.releases).join('')}</div>`:`<p class="empty">ยังไม่มีเพลงที่เผยแพร่สำหรับศิลปินคนนี้</p>`}`}
 else{const n=CACHE['news'+id];if(!n)return;dlg.innerHTML=`${X}${img(n.image_url)}<time>${fmt(n.published_at)}</time><h2>${esc(n.title)}</h2><p class="bio">${esc(n.body)}</p>`}
 $$('.rv',dlg).forEach(x=>x.classList.add('in'));sync();dlg.showModal()}
document.addEventListener('click',e=>{const c=e.target.closest('[data-open]');if(c&&!e.target.closest('a,button'))openIt(c.dataset.open,c.dataset.id)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-open]'))openIt(e.target.dataset.open,e.target.dataset.id)});
/* ---- page-specific setup: runs on first load and after every soft navigation ---- */
function initPage(){
 $$('[data-label-links]').forEach(el=>{const k=el.dataset.labelLinks;el.innerHTML=icons(C.LINKS.label,k?k.split(','):null).replace(/^<div class="socials">|<\/div>$/g,'')});
 $$('[data-list]').forEach(async el=>{const t=el.dataset.list;el.innerHTML='<div class="sk"></div>'.repeat(+el.dataset.limit||3);
  const rows=await load(t,+el.dataset.limit||0);
  const draw=l=>{el.innerHTML=l.length?l.map(R[t]).join(''):`<p class="empty">${rows.length?'No results.':'Coming soon.'}</p>`;reveal(el);sync()};
  if(t==='releases'&&el.hasAttribute('data-filter')&&rows.length)toolbar(el,rows,draw);else draw(rows)});
 const ab=$('#about-body');if(ab&&sb)sb.from('settings').select('*').eq('key','about_body').maybeSingle().then(r=>{if(r.data&&r.data.value)ab.textContent=r.data.value});
 const f=$('#contact-form');
 if(f)f.onsubmit=async e=>{e.preventDefault();const n=$('#form-note'),d=Object.fromEntries(new FormData(f));
  if(!sb){n.textContent='Message form is not connected yet.';return}
  const {error}=await sb.from('messages').insert(d);
  n.textContent=error?'Something went wrong. Please try again.':'Thanks, your message was received.';if(!error)f.reset()}}
/* ---- menu ---- */
const mb=$('#menu-btn'),mn=$('#menu');
const setMenu=o=>{mn.classList.toggle('open',o);mb.classList.toggle('open',o);mb.setAttribute('aria-expanded',o)};
if(mb){mb.onclick=()=>setMenu(!mn.classList.contains('open'));document.addEventListener('keydown',e=>e.key==='Escape'&&setMenu(false))}
/* ---- soft navigation: real separate .html files, content swapped without a reload so audio keeps playing ---- */
function go(url,push){
 fetch(url).then(r=>{if(!r.ok)throw 0;return r.text()}).then(h=>{
  const d=new DOMParser().parseFromString(h,'text/html'),m=d.querySelector('main');if(!m)throw 0;
  if(dlg.open)dlg.close();
  $('main').innerHTML=m.innerHTML;document.title=d.title;
  const md=d.querySelector('meta[name=description]'),cd=$('meta[name=description]');if(md&&cd)cd.content=md.content;
  document.body.dataset.page=d.body.dataset.page;
  $$('#menu a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')===d.body.dataset.page+'.html'));
  if(push)history.pushState({},'',url);
  scrollTo(0,0);setMenu(false);initPage()}).catch(()=>{location.href=url})}
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');
 if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||a.target||a.hasAttribute('download'))return;
 const u=new URL(a.href,location.href);
 if(u.origin!==location.origin||!/(\.html|\/)$/.test(u.pathname)||u.pathname.includes('panel')||(u.pathname===location.pathname&&u.hash))return;
 e.preventDefault();if(u.href!==location.href)go(u.href,true)});
addEventListener('popstate',()=>go(location.href,false));
initPage();
})();
