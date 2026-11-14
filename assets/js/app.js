(function(){
const C=window.MH,$=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const sb=(C.SUPABASE_URL&&window.supabase)?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;
window.MH_SB=sb;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS=['spotify','apple','soundcloud','ytmusic','youtube','facebook','instagram','tiktok','x'];
const ok=u=>u&&u!=='#'&&/^https?:\/\//.test(u);
const img=u=>u?`<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`:'';
const svg=d=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="${d}"/></svg>`;
const I={play:svg('M8 5v14l11-7z'),pause:svg('M6 5h4v14H6zM14 5h4v14h-4z'),prev:svg('M6 6h2v12H6zM20 6v12L9.5 12z'),next:svg('M16 6h2v12h-2zM4 6v12l10.5-6z'),
 shuffle:svg('M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z'),
 repeat:svg('M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z'),
 vol:svg('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'),
 mute:svg('M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'),
 queue:svg('M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z'),
 down:svg('M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z'),
 link:svg('M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'),
 share:svg('M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z')};
/* red verified mark: shown for artists who are on the Mon HipHop roster */
const VB='<svg class="vb" viewBox="0 0 24 24" role="img" aria-label="Verified artist"><title>Verified artist</title><path fill="currentColor" d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/></svg>';
const badge=a=>a&&a.verified?VB:'';
function icons(links,keys){links=links||{};
 const h=(keys||ICONS).filter(k=>ok(links[k])).map(k=>`<a href="${esc(links[k])}" target="_blank" rel="noopener" aria-label="${k}"><svg class="ico"><use href="#i-${k}"/></svg></a>`).join('');
 return h?`<div class="socials">${h}</div>`:''}
const cnt=n=>{n=n||0;const t=n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1e3?(n/1e3).toFixed(1).replace('.0','')+'K':String(n);return t+(n===1?' play':' plays')};
const fmt=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ytId=u=>{const m=String(u||'').match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/);return m?m[1]:''};
const profilePath=a=>'a/'+encodeURIComponent(a.username||a.id);
const profileUrl=a=>location.origin+'/'+profilePath(a);
const vThumb=v=>v.thumb_url||(ytId(v.youtube_url)?`https://i.ytimg.com/vi/${ytId(v.youtube_url)}/hqdefault.jpg`:'');
/* ---- share buttons (copy / Facebook / X / LINE / phone share sheet) ---- */
const enc=encodeURIComponent;
/* share buttons: icon only (logo circles); the name is in title/aria-label for accessibility */
const mark=(bg,t)=>`<b class="sb" style="background:${bg}" aria-hidden="true">${t}</b>`;
const sic=id=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const shareBar=(url,title)=>{const u=enc(url),t=enc(title),ut=enc(title+' '+url);
 const A=(name,href,ico)=>`<a class="sh" href="${href}" target="_blank" rel="noopener" title="${name}" aria-label="Share on ${name}">${ico}</a>`;
 const G=(name,go,ico)=>`<button type="button" class="sh" data-share="go" data-go="${go}" data-name="${name}" title="${name}" aria-label="Share on ${name}">${ico}</button>`;
 return `<div class="share" data-url="${esc(url)}" data-title="${esc(title)}">`+
 `<button type="button" class="sh copy" data-share="copy" title="Copy link" aria-label="Copy link">${I.link}</button>`+
 A('Facebook',`https://www.facebook.com/sharer/sharer.php?u=${u}`,sic('facebook'))+
 A('X',`https://twitter.com/intent/tweet?url=${u}&text=${t}`,sic('x'))+
 A('LINE',`https://social-plugins.line.me/lineit/share?url=${u}`,mark('#06c755','LINE'))+
 A('WhatsApp',`https://wa.me/?text=${ut}`,mark('#25d366','WA'))+
 A('Telegram',`https://t.me/share/url?url=${u}&text=${t}`,mark('#2aabee','TG'))+
 A('Threads',`https://www.threads.net/intent/post?text=${ut}`,mark('#111','@'))+
 A('Reddit',`https://www.reddit.com/submit?url=${u}&title=${t}`,mark('#ff4500','r/'))+
 G('Instagram','https://www.instagram.com/',sic('instagram'))+
 G('TikTok','https://www.tiktok.com/',sic('tiktok'))+
 `<a class="sh" href="mailto:?subject=${t}&body=${ut}" title="Email" aria-label="Share by email">${mark('#5f5f68','@')}</a>`+
 `<button type="button" class="sh" data-share="native" title="More" aria-label="More share options" ${navigator.share?'':'hidden'}>${I.share}</button></div>`};
let toastT;function toast(t){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.append(el)}
 el.textContent=t;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),2200)}
async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){const x=document.createElement('textarea');x.value=t;x.style.cssText='position:fixed;opacity:0';document.body.append(x);x.select();let ok=false;try{ok=document.execCommand('copy')}catch(e2){}x.remove();return ok}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-share]');if(!b)return;
 const box=b.closest('[data-url]');if(!box)return;const url=box.dataset.url,title=box.dataset.title||document.title;
 if(b.dataset.share==='native'){try{await navigator.share({title,url})}catch(err){}return}
 if(b.dataset.share==='go'){const c=copyText(url);window.open(b.dataset.go,'_blank','noopener');const n=b.dataset.name||'';toast(await c?`Link copied — paste it in ${n}`:'Copy the link and paste it in '+n);return}
 toast(await copyText(url)?'Link copied':'Copy failed — select the link and copy it')});
const R={
 artists:a=>`<article class="artist rv" data-href="${esc(profilePath(a))}" tabindex="0" role="link" aria-label="${esc(a.name)} profile"><div class="cover">${img(a.cover_url)}</div><div class="avatar">${img(a.avatar_url)}</div><div class="info"><h3>${esc(a.name)}${badge(a)}</h3>${a.username?`<p class="uname">@${esc(a.username)}</p>`:''}<p class="role">${esc(a.role)}</p>${a.bio?`<p class="bio">${esc(a.bio)}</p>`:''}${icons(a.links)}</div></article>`,
 releases:r=>{const ar=r.artists&&r.artists.name||'';const cover=r.cover_url||(r.artists&&r.artists.avatar_url)||'';
  const rest=[r.type,r.release_date&&r.release_date.slice(0,4)].filter(Boolean).map(esc);
  const meta=[ar?`<a class="alink" href="${esc(profilePath(r.artists))}">${esc(ar)}</a>`+badge(r.artists):'',...rest].filter(Boolean).join(' · ');
  return `<article class="release rv"><div class="art">${img(cover)}${r.audio_url?`<button type="button" class="fab" data-play="${esc(r.audio_url)}" data-rid="${esc(r.id)}" data-title="${esc(r.title)}" data-artist="${esc(ar)}" data-aurl="${esc(r.artists?profilePath(r.artists):'')}" data-cover="${esc(cover)}" aria-label="Play ${esc(r.title)}">${I.play}</button>`:''}</div><div class="info"><h3>${esc(r.title)}</h3><p class="meta">${meta}</p>${r.audio_url?`<span class="plays" data-plays="${esc(r.id)}">${cnt(r.play_count)}</span>`:''}${icons(r.links)}</div></article>`},
 /* Spotify-style track row (artist profile page) */
 track:(r,i,a)=>{const cover=r.cover_url||a.avatar_url||'';return `<div class="trk"><button type="button" class="tb" data-play="${esc(r.audio_url)}" data-rid="${esc(r.id)}" data-title="${esc(r.title)}" data-artist="${esc(a.name)}" data-aurl="${esc(profilePath(a))}" data-cover="${esc(cover)}" aria-label="Play ${esc(r.title)}"><span class="n">${i+1}</span>${I.play}</button><div class="tc">${img(cover)}</div><div class="tt"><b>${esc(r.title)}</b><small>${[r.type,r.release_date&&r.release_date.slice(0,4)].filter(Boolean).map(esc).join(' · ')}</small></div><span class="plays" data-plays="${esc(r.id)}">${cnt(r.play_count)}</span></div>`},
 videos:v=>{const ar=v.artists&&v.artists.name||'',t=vThumb(v);
  return `<article class="video rv" data-video="${esc(v.id)}" tabindex="0" role="button" aria-label="Watch ${esc(v.title)}"><div class="thumb">${img(t)}<span class="vplay">${I.play}</span></div><div class="info"><h3>${esc(v.title)}</h3><p class="meta">${ar?`<a class="alink" href="${esc(profilePath(v.artists))}">${esc(ar)}</a>`+badge(v.artists):''}</p></div></article>`},
 news:n=>`<article class="card rv" data-open="news" data-id="${esc(n.id)}" tabindex="0">${img(n.image_url)}<div class="info"><time>${fmt(n.published_at)}</time><h3>${esc(n.title)}</h3>${n.body?`<p>${esc(n.body)}</p>`:''}</div></article>`
};
const ORDER={artists:['sort',true],releases:['release_date',false],videos:['created_at',false],news:['published_at',false]};
const CACHE={};
const byPlays=a=>[...a].sort((x,y)=>(y.play_count||0)-(x.play_count||0)||new Date(y.release_date||0)-new Date(x.release_date||0));
async function load(t,limit){const d=await load0(t,limit);d.forEach(x=>CACHE[t+x.id]=x);return d}
async function load0(t,limit){
 if(sb){let q=sb.from(t).select(t==='releases'||t==='videos'?'*, artists(id,name,avatar_url,verified,username)':'*');
  if(t==='releases')q=q.order('play_count',{ascending:false}).order('release_date',{ascending:false});
  else if(t==='artists')q=q.order('verified',{ascending:false}).order('sort',{ascending:true}).order('created_at',{ascending:true});
  else q=q.order(ORDER[t][0],{ascending:ORDER[t][1]});
  if(limit)q=q.limit(limit);
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
/* ---- persistent player (Spotify-style bar + "Now playing" sheet; lives outside <main>, survives page changes) ---- */
const au=new Audio();au.preload='none';window.MH_AUDIO=au;
let Q=[],qi=-1,counted=false,shuf=false,rep=0,hist=[];  // rep: 0 off · 1 all · 2 one
try{const v=parseFloat(localStorage.mh_vol);au.volume=isFinite(v)?Math.min(1,Math.max(0,v)):.9}catch(e){au.volume=.9}
const pl=document.createElement('div');pl.id='player';
const ctl=()=>`<button type="button" data-pl="shuffle" class="sm" aria-label="Shuffle" aria-pressed="false">${I.shuffle}</button><button type="button" data-pl="prev" aria-label="Previous">${I.prev}</button><button type="button" data-pl="toggle" class="big" aria-label="Play or pause">${I.play}</button><button type="button" data-pl="next" aria-label="Next">${I.next}</button><button type="button" data-pl="repeat" class="sm" aria-label="Repeat" aria-pressed="false">${I.repeat}<i>1</i></button>`;
pl.innerHTML=`<div class="thin"><i></i></div><div class="wrap pl">
 <div class="pl-l" data-pl="open" role="button" tabindex="0" aria-label="Open now playing"><div class="pc"></div><div class="pt"><b></b><small></small></div></div>
 <div class="pl-c"><div class="pb">${ctl()}</div><div class="pbar"><span class="tm cur">0:00</span><input class="rng seek" type="range" min="0" max="1000" value="0" aria-label="Seek"><span class="tm dur">0:00</span></div></div>
 <div class="pl-r"><button type="button" data-pl="open" class="sm" aria-label="Queue">${I.queue}</button><button type="button" data-pl="mute" class="sm" aria-label="Mute">${I.vol}</button><input class="rng vol" type="range" min="0" max="100" value="90" aria-label="Volume"></div>
 <button type="button" class="mtoggle" data-pl="toggle" aria-label="Play or pause">${I.play}</button></div>`;
document.body.append(pl);
const np=document.createElement('div');np.id='nowp';np.hidden=true;
np.innerHTML=`<div class="np-in"><div class="np-top"><button type="button" data-pl="close" aria-label="Close">${I.down}</button><span>Now playing</span><i></i></div>
 <div class="np-art"></div><div class="np-meta"><b></b><small></small></div><details class="np-share"><summary>Share this song</summary><div></div></details>
 <div class="np-seek"><input class="rng seek" type="range" min="0" max="1000" value="0" aria-label="Seek"><div><span class="tm cur">0:00</span><span class="tm dur">0:00</span></div></div>
 <div class="pb">${ctl()}</div><h4>Up next</h4><div class="np-q"></div></div>`;
document.body.append(np);
const mmss=s=>isFinite(s)&&s>0?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const setP=(el,v)=>el.style.setProperty('--p',(v/(+el.max||1)*100)+'%');
const seeks=$$('.seek',document.body).filter(x=>pl.contains(x)||np.contains(x));
seeks.forEach(x=>setP(x,0));const vol=$('.vol',pl);
const setVol=v=>{vol.value=Math.round(v*100);setP(vol,vol.value)};setVol(au.muted?0:au.volume);
function sync(){const on=!au.paused,cur=Q[qi]&&Q[qi].url;
 $$('[data-pl=toggle],.mtoggle').forEach(b=>b.innerHTML=on?I.pause:I.play);
 $$('[data-play]').forEach(b=>{const a=b.dataset.play===cur&&on;b.classList.toggle('on',a);
  const t=b.closest('.trk');if(t)t.classList.toggle('on',b.dataset.play===cur);
  const old=$('svg',b);if(old)old.outerHTML=a?I.pause:I.play;
  if(b.classList.contains('play')){const sp=$('span',b);if(sp)sp.textContent=a?'Pause':'Play'}});
 $$('[data-pl=shuffle]').forEach(b=>{b.classList.toggle('on',shuf);b.setAttribute('aria-pressed',shuf)});
 $$('[data-pl=repeat]').forEach(b=>{b.classList.toggle('on',rep>0);b.classList.toggle('one',rep===2);b.setAttribute('aria-pressed',rep>0)});
 $$('.np-q .qi').forEach(r=>r.classList.toggle('on',+r.dataset.i===qi));
 pl.classList.toggle('is-playing',on)}
function drawQ(){$('.np-q',np).innerHTML=Q.map((t,i)=>`<button type="button" class="qi${i===qi?' on':''}" data-i="${i}"><span class="qc">${img(t.cover)}</span><span class="qt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></button>`).join('')}
function meta(t){$$('.pc,.np-art').forEach(e=>e.innerHTML=img(t.cover));$$('.pt b,.np-meta b').forEach(e=>e.textContent=t.title);$$('.pt small').forEach(e=>e.textContent=t.artist);
 const au_=t.aurl?location.origin+'/'+t.aurl:location.origin+'/releases.html';
 $('.np-meta small',np).innerHTML=t.aurl?`<a href="${esc(t.aurl)}">${esc(t.artist)}</a>`:esc(t.artist);
 $('.np-share>div',np).innerHTML=shareBar(au_,`${t.title} — ${t.artist}`);
 if('mediaSession' in navigator&&window.MediaMetadata){try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title,artist:t.artist,album:'Mon HipHop',artwork:t.cover?[{src:new URL(t.cover,location.href).href}]:[]})}catch(e){}}}
function playIdx(i,fromHist){if(!fromHist&&qi>=0&&qi!==i)hist.push(qi);qi=i;counted=false;const t=Q[i];
 if(window.MH_closeVideo)window.MH_closeVideo();
 au.src=t.url;au.play().catch(()=>{});meta(t);drawQ();
 pl.classList.add('show');document.body.classList.add('has-player');sync()}
function nextIdx(){if(Q.length<2)return rep===1?0:-1;
 if(shuf){let k;do{k=Math.floor(Math.random()*Q.length)}while(k===qi);return k}
 if(qi<Q.length-1)return qi+1;return rep===1?0:-1}
const next=()=>{const k=nextIdx();k<0?(au.pause(),au.currentTime=0,sync()):playIdx(k)};
const prev=()=>{if(au.currentTime>3||(!hist.length&&qi<1)){au.currentTime=0;return}
 if(hist.length)return playIdx(hist.pop(),true);playIdx(qi-1)};
['play','pause'].forEach(e=>au.addEventListener(e,()=>{sync();if('mediaSession' in navigator)navigator.mediaSession.playbackState=au.paused?'paused':'playing'}));
au.addEventListener('durationchange',()=>$$('.dur').forEach(e=>e.textContent=mmss(au.duration)));
au.ontimeupdate=()=>{const t=Q[qi];if(!counted&&t&&t.rid&&au.currentTime>=Math.min(30,(au.duration||60)/2)){counted=true;logPlay(t.rid)}
 if(au.duration){const v=au.currentTime/au.duration*1000;seeks.forEach(x=>{if(!x.dragging){x.value=v;setP(x,v)}});$('.thin i',pl).style.width=v/10+'%'}
 $$('.cur').forEach(e=>e.textContent=mmss(au.currentTime))};
au.onended=()=>{counted=false;if(rep===2){au.currentTime=0;au.play().catch(()=>{})}else next()};
seeks.forEach(x=>{x.addEventListener('input',()=>{x.dragging=true;setP(x,x.value);if(au.duration)au.currentTime=x.value/1000*au.duration});x.addEventListener('change',()=>{x.dragging=false})});
vol.oninput=()=>{au.muted=false;au.volume=vol.value/100;setP(vol,vol.value);try{localStorage.mh_vol=au.volume}catch(e){};sync2()};
const sync2=()=>$('[data-pl=mute]',pl).innerHTML=au.muted||au.volume===0?I.mute:I.vol;
const openNP=o=>{np.hidden=!o;document.body.classList.toggle('np-open',o);if(o){drawQ();const c=$('.qi.on',np);if(c)c.scrollIntoView({block:'nearest'})}};
const doPl=k=>{
 if(k==='toggle')au.paused?au.play().catch(()=>{}):au.pause();
 else if(k==='next')next();else if(k==='prev')prev();
 else if(k==='shuffle'){shuf=!shuf;sync()}
 else if(k==='repeat'){rep=(rep+1)%3;sync()}
 else if(k==='mute'){au.muted=!au.muted;setVol(au.muted?0:au.volume);sync2()}
 else if(k==='open')openNP(true);else if(k==='close')openNP(false)};
document.addEventListener('click',e=>{const b=e.target.closest('[data-pl]');if(!b||!(pl.contains(b)||np.contains(b)))return;doPl(b.dataset.pl)});
np.addEventListener('click',e=>{if(e.target.closest('a[href]'))openNP(false)});
document.addEventListener('click',e=>{const q=e.target.closest('.qi');if(q&&np.contains(q))playIdx(+q.dataset.i)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!np.hidden)openNP(false);
 if(e.key==='Enter'&&e.target.matches('.pl-l'))openNP(true);
 if(e.code==='Space'&&qi>=0&&!e.target.closest('input,textarea,select,button,a,[contenteditable],dialog')){e.preventDefault();doPl('toggle')}});
if('mediaSession' in navigator){const ms=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch(e){}};
 ms('play',()=>au.play());ms('pause',()=>au.pause());ms('previoustrack',prev);ms('nexttrack',next);
 ms('seekto',d=>{if(d.seekTime!=null)au.currentTime=d.seekTime})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-play]');if(!b)return;
 const same=Q[qi]&&Q[qi].url===b.dataset.play;
 const seen=new Set();Q=$$('[data-play]',b.closest('[data-queue]')||b.closest('.grid')||document).filter(x=>!seen.has(x.dataset.play)&&seen.add(x.dataset.play)).map(x=>({url:x.dataset.play,title:x.dataset.title,artist:x.dataset.artist,aurl:x.dataset.aurl,cover:x.dataset.cover,rid:x.dataset.rid}));
 qi=Q.findIndex(t=>t.url===b.dataset.play);
 if(same){au.paused?au.play().catch(()=>{}):au.pause()}else{hist=[];playIdx(qi,true)}});
/* ---- play counting: a play counts after 30s (or half of a short track); the server de-dupes per visitor per day ---- */
function bump(rid){const r=CACHE['releases'+rid];if(r)r.play_count=(r.play_count||0)+1;$$('[data-plays]').forEach(el=>{if(el.dataset.plays===rid&&r)el.textContent=cnt(r.play_count)})}
async function logPlay(rid){let vid='anon';try{vid=localStorage.mh_vid||(localStorage.mh_vid=crypto.randomUUID())}catch(e){}
 if(!sb)return bump(rid);const {data,error}=await sb.rpc('log_play',{rid,vid});if(!error&&data===true)bump(rid)}
/* ---- detail dialog ---- */
const dlg=document.createElement('dialog');document.body.append(dlg);
dlg.onclick=e=>{if(e.target===dlg||e.target.closest('[data-x]'))dlg.close()};
async function openIt(kind,id){const X='<button class="x" data-x aria-label="Close">×</button>';
 if(kind==='artist'){const a=CACHE['artists'+id];if(!a)return;const rel=(await load('releases')).filter(r=>r.artist_id===a.id);
  dlg.innerHTML=`${X}<div class="m-head">${img(a.avatar_url)}<div><h2>${esc(a.name)}${badge(a)}</h2>${a.username?`<p class="uname">@${esc(a.username)}</p>`:''}<p class="role">${esc(a.role)}</p></div></div>${a.bio?`<p class="bio">${esc(a.bio)}</p>`:''}${icons(a.links)}<h3>Releases</h3>${rel.length?`<div class="grid releases">${rel.map(R.releases).join('')}</div>`:`<p class="empty">No releases from this artist yet.</p>`}`}
 else{const n=CACHE['news'+id];if(!n)return;dlg.innerHTML=`${X}${img(n.image_url)}<time>${fmt(n.published_at)}</time><h2>${esc(n.title)}</h2><p class="bio">${esc(n.body)}</p>`}
 $$('.rv',dlg).forEach(x=>x.classList.add('in'));sync();dlg.showModal()}
document.addEventListener('click',e=>{const c=e.target.closest('[data-open]');if(c&&!e.target.closest('a,button'))openIt(c.dataset.open,c.dataset.id)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-open]'))openIt(e.target.dataset.open,e.target.dataset.id)});
/* ---- music video dialog (uploaded file or YouTube) ---- */
const vdlg=document.createElement('dialog');vdlg.className='video-dlg';document.body.append(vdlg);
function closeVideo(){if(vdlg.open)vdlg.close();vdlg.innerHTML=''}
window.MH_closeVideo=closeVideo;
vdlg.onclick=e=>{if(e.target===vdlg||e.target.closest('[data-x]'))closeVideo()};
vdlg.addEventListener('close',()=>{vdlg.innerHTML='';const u=new URL(location.href);if(u.searchParams.has('v')){u.searchParams.delete('v');history.replaceState(history.state,'',u)}else if(/^\/v\/[^/]+/.test(u.pathname))history.replaceState(history.state,'','/videos.html')});
async function openVideo(id){let v=CACHE['videos'+id];if(!v){await load('videos');v=CACHE['videos'+id]}if(!v)return;
 au.pause();
 const y=ytId(v.youtube_url),a=v.artists||{},url=location.origin+'/v/'+enc(v.id);
 const player=v.video_url?`<video controls autoplay playsinline preload="metadata" src="${esc(v.video_url)}" ${v.thumb_url?`poster="${esc(v.thumb_url)}"`:''}></video>`
  :y?`<iframe src="https://www.youtube-nocookie.com/embed/${y}?autoplay=1&rel=0" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`:'';
 vdlg.innerHTML=`<button class="x" data-x aria-label="Close">×</button><div class="vwrap">${player}</div><h2>${esc(v.title)}</h2>${a.name?`<p class="meta"><a href="${esc(profilePath(a))}" data-x>${esc(a.name)}</a>${badge(a)}</p>`:''}${shareBar(url,v.title+(a.name?' — '+a.name:''))}`;
 vdlg.showModal();sync();if(sb&&localStorage.getItem('mh_cookie_choice')==='accept')sb.from('public_metrics').insert({event_type:'video_view',target_id:v.id}).then(()=>{})}
document.addEventListener('click',e=>{const c=e.target.closest('[data-video]');if(c&&!e.target.closest('a,button'))openVideo(c.dataset.video)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-video]'))openVideo(e.target.dataset.video)});
/* artist cards (and anything with data-href) open the profile page through the normal soft navigation */
function goHref(h){const a=document.createElement('a');a.href=h;document.body.append(a);a.click();a.remove()}
document.addEventListener('click',e=>{const c=e.target.closest('[data-href]');if(c&&!e.target.closest('a,button'))goHref(c.dataset.href)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-href]'))goHref(e.target.dataset.href)});
/* ---- artist profile page (/a/<username>) ---- */
function handleFromUrl(){const m=location.pathname.match(/\/a\/([^/?#]+)/);if(m)try{return decodeURIComponent(m[1])}catch(e){return m[1]}
 return new URLSearchParams(location.search).get('u')||''}
async function drawArtist(el){const h=handleFromUrl();
 const nf=()=>{el.innerHTML='<div class="panel acct-card"><h2>Artist not found</h2><p class="lead" style="margin:14px auto 0;text-align:center">This profile does not exist or the link is wrong.</p><div class="cta"><a class="btn solid" href="artists.html">All artists</a></div></div>';document.title='Artist not found — Mon HipHop'};
 if(!h)return nf();
 let a=null;
 if(sb){const col=UUID.test(h)?'id':'username';const r=await sb.from('artists').select('*').eq(col,col==='id'?h:h.toLowerCase()).maybeSingle();a=r.data}
 else a=(C.FALLBACK.artists||[]).find(x=>x.id===h||(x.username||'').toLowerCase()===h.toLowerCase());
 if(!a)return nf();
 CACHE['artists'+a.id]=a;
 const [rels,vids]=await Promise.all([load('releases'),load('videos')]);
 const tr=rels.filter(r=>r.artist_id===a.id&&r.audio_url),vs=vids.filter(v=>v.artist_id===a.id);
 const url=profileUrl(a),desc=(a.bio||`${a.role||'Artist'} on Mon HipHop`).replace(/\s+/g,' ').slice(0,160);
 document.title=`${a.name} — Mon HipHop`;const md=$('meta[name=description]');if(md)md.content=desc;
 const rr=tr.map(r=>({...r}));
 el.innerHTML=`<section class="aprof"><div class="cover">${img(a.cover_url)}</div><div class="ahead"><div class="avatar">${img(a.avatar_url)}</div><div><p class="kicker">${a.verified?'Verified artist':'Artist'}</p><h1>${esc(a.name)}${badge(a)}</h1>${a.username?`<p class="uname">@${esc(a.username)}</p>`:''}<p class="role">${esc(a.role)}</p></div></div>
  ${a.bio?`<p class="bio abio">${esc(a.bio)}</p>`:''}${icons(a.links)}
  <div class="panel share-panel"><h3>Share this profile</h3><div class="urlbox"><input readonly value="${esc(url)}" aria-label="Profile link" onfocus="this.select()"><button type="button" class="cpy" data-share="copy" data-url="${esc(url)}" aria-label="Copy profile link" title="Copy link">${I.link}</button></div>${shareBar(url,`${a.name} on Mon HipHop`)}</div>
  ${tr.length?`<div class="sechead"><h2>Music</h2><button type="button" class="playall" data-playall aria-label="Play all">${I.play}</button></div><div class="tracks" data-queue>${rr.map((r,i)=>R.track(r,i,a)).join('')}</div>`:''}
  ${vs.length?`<div class="sechead"><h2>Videos</h2></div><div class="grid videos">${vs.map(R.videos).join('')}</div>`:''}
  ${!tr.length&&!vs.length?'<p class="empty" style="margin-top:28px">No music or videos yet.</p>':''}</section>`;
 const pa=$('[data-playall]',el);if(pa)pa.onclick=()=>{const f=$('.tracks [data-play]',el);if(f)f.click()};
 reveal(el);sync()}
/* shared helpers + page hooks for assets/js/auth.js (sign in / sign up / artist dashboard) */
const HOOKS=[];
window.MH_U={esc,img,icons,ok,badge,VB,CACHE,load,reveal:el=>reveal(el),hooks:HOOKS,shareBar,profileUrl,profilePath,ytId,vThumb,toast};
/* ---- page-specific setup: runs on first load and after every soft navigation ---- */
function initPage(){
 HOOKS.forEach(h=>{try{h()}catch(e){console.error(e)}});
 $$('[data-artist-page]').forEach(el=>drawArtist(el).catch(e=>{console.error(e);el.innerHTML='<p class="empty">Could not load this profile.</p>'}));
 $$('[data-label-links]').forEach(el=>{const k=el.dataset.labelLinks;el.innerHTML=icons(C.LINKS.label,k?k.split(','):null).replace(/^<div class="socials">|<\/div>$/g,'')});
 $$('[data-list]').forEach(async el=>{const t=el.dataset.list;el.innerHTML='<div class="sk"></div>'.repeat(+el.dataset.limit||3);
  const rows=await load(t,+el.dataset.limit||0);
  const draw=l=>{el.innerHTML=l.length?l.map(R[t]).join(''):`<p class="empty">${rows.length?'No results.':'Coming soon.'}</p>`;reveal(el);sync()};
  if(t==='releases'&&el.hasAttribute('data-filter')&&rows.length)toolbar(el,rows,draw);else draw(rows);
  if(t==='videos'){const m=location.pathname.match(/^\/v\/([^/]+)/),v=m?decodeURIComponent(m[1]):new URLSearchParams(location.search).get('v');if(v&&CACHE['videos'+v])openVideo(v)}});
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
  if(dlg.open)dlg.close();closeVideo();
  $('main').innerHTML=m.innerHTML;document.title=d.title;
  const md=d.querySelector('meta[name=description]'),cd=$('meta[name=description]');if(md&&cd)cd.content=md.content;
  document.body.dataset.page=d.body.dataset.page;
  $$('#menu a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')===d.body.dataset.page+'.html'));
  if(push)history.pushState({},'',url);
  scrollTo(0,0);setMenu(false);initPage()}).catch(()=>{location.href=url})}
document.addEventListener('click',e=>{const a=e.target.closest('a[href]');
 if(!a||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||a.target||a.hasAttribute('download'))return;
 const u=new URL(a.href,location.href);
 if(u.origin!==location.origin||!(/(\.html|\/)$/.test(u.pathname)||/^\/a\/[^/]+$/.test(u.pathname))||u.pathname.includes('panel')||(u.pathname===location.pathname&&u.hash))return;
 e.preventDefault();if(u.href!==location.href)go(u.href,true)});
addEventListener('popstate',()=>go(location.href,false));
initPage();
})();
(function(){
const b=document.body;
document.addEventListener('pointermove',e=>{const c=e.target.closest('.card,.artist,.release');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px')});
new MutationObserver(()=>b.classList.toggle('playing',!!document.querySelector('[data-play].on'))).observe(b,{subtree:true,attributes:true,attributeFilter:['class']});
})();

(async function(){const sb=window.MH_SB;if(!sb)return;try{const {data,error}=await sb.rpc('get_public_stats');if(error||!data)return;const d=Array.isArray(data)?data[0]:data;[['stat-artists',d.artist_count],['stat-users',d.user_count],['stat-visits',d.site_visits],['stat-views',d.video_views],['stat-plays',d.music_plays]].forEach(([id,n])=>{const el=document.getElementById(id);if(el)el.textContent=Number(n||0).toLocaleString()})}catch(e){}})();

if(window.MH_SB&&localStorage.getItem('mh_cookie_choice')==='accept')window.MH_SB.from('public_metrics').insert({event_type:'site_visit'}).then(()=>{});
