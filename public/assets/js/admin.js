(async function(){
const sb=window.MH_SB,app=document.getElementById('app'),out=document.getElementById('logout');
const $=(s,r=document)=>r.querySelector(s);
const shell=$('#shell'),nav=$('#nav'),main=$('#main');
const ICON={artists:'<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',releases:'<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 13.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm0-5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',videos:'<path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/>',news:'<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>',messages:'<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>',settings:'<path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',logs:'<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>'};
const GROUPS=[['Content',['artists','releases','videos','news']],['Inbox',['messages']],['System',['settings','logs']]];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!sb){app.innerHTML='<p class="note">Add SUPABASE_URL and SUPABASE_ANON_KEY in assets/js/config.js first.</p>';return}
const LK=['spotify','apple','soundcloud','ytmusic','youtube','facebook','instagram','tiktok','x'];
// fields: [column, label, type, required]
const S={
 artists:{label:'Artists',order:['sort',true],title:'name',thumb:'avatar_url',fields:[
  ['name','Artist name','text',1],['username','Username (no @)','text'],['role','Role','text'],['bio','Bio','textarea'],
  ['avatar_url','Profile picture','image'],['cover_url','Cover picture','image'],['sort','Order (lower number comes first)','number'],
  ['verified','Verified (red mark)','checkbox'],['links','Links','links']]},
 releases:{label:'Releases',order:['release_date',false],title:'title',thumb:'cover_url',fields:[
  ['title','Title','text',1],['artist_id','Artist','artist'],['type','Type','select:Single,EP,Album,Mixtape'],['release_date','Release date','date'],
  ['cover_url','Cover art','image'],['audio_url','Audio file','audio'],['links','Streaming links','links']]},
 videos:{label:'Videos',order:['created_at',false],title:'title',thumb:'thumb_url',fields:[
  ['title','Title','text',1],['artist_id','Artist','artist'],['video_url','Video file (max 50 MB)','video'],['youtube_url','YouTube link (for bigger videos)','text'],['thumb_url','Thumbnail','image']]},
 news:{label:'News',order:['published_at',false],title:'title',thumb:'image_url',fields:[
  ['title','Headline','text',1],['body','Body','textarea'],['image_url','Image','image'],['published_at','Date','datetime-local']]},
 messages:{label:'Messages',order:['created_at',false],title:'name',readonly:1,fields:[]},
 settings:{label:'Settings',custom:1},
 logs:{label:'Logs',custom:1}
};
let tab='artists',edit=null,artists=[],emails={};
async function boot(){
 const {data:{session}}=await sb.auth.getSession();out.hidden=!session;
 if(!session)return login();
 const {data:isAdmin}=await sb.rpc('is_admin');
 if(isAdmin!==true){shell.hidden=true;app.innerHTML=`<div class="login form"><h2>Access denied</h2><p class="note">This account is not an admin. Artists manage their profile from the Dashboard on the main site.</p><a class="btn ghost" href="account.html">Go to Dashboard</a></div>`;return}
 panel()}
out.onclick=async()=>{await sb.auth.signOut();boot()};
function login(){shell.hidden=true;app.innerHTML=`<form class="login form"><h2>Admin sign in</h2><input name="e" type="email" placeholder="Email" required><input name="p" type="password" placeholder="Password" required><button class="btn solid">Sign in</button><p id="ln" class="note" hidden></p></form>`;
 $('.login').onsubmit=async e=>{e.preventDefault();const f=e.target,{error}=await sb.auth.signInWithPassword({email:f.e.value,password:f.p.value});
  if(error){const n=$('#ln');n.hidden=false;n.textContent='Sign in failed: '+error.message}else boot()}}
async function panel(){
 app.innerHTML='';shell.hidden=false;
 const {data:{session}}=await sb.auth.getSession();$('#who').textContent=session?session.user.email:'';
 nav.innerHTML=GROUPS.map(([g,keys])=>`<p class="grp">${g}</p>`+keys.map(k=>`<button type="button" class="nv${k===tab?' on':''}" data-t="${k}"${k===tab?' aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><span>${S[k].label}</span></button>`).join('')).join('');
 nav.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;edit=null;panel();scrollTo(0,0)});
 main.innerHTML=`<header class="adm-head"><div><p class="crumb">Admin</p><h1>${S[tab].label}</h1></div></header><div id="body"></div>`;
 if(S[tab].custom)return tab==='logs'?logs():settings();
 const {data:aa}=await sb.from('artists').select('id,name').order('name');artists=aa||[];
 if(tab==='artists'){emails={};const {data:em}=await sb.rpc('admin_artist_emails');(em||[]).forEach(x=>emails[x.artist_id]=x.email)}
 const s=S[tab],{data,error}=await sb.from(tab).select('*').order(s.order[0],{ascending:s.order[1]});
 const rows=data||[],aname=id=>(artists.find(a=>a.id===id)||{}).name;
 $('#body').innerHTML=`<div class="adm-cols"><div class="panel"><h3>${s.label} (${rows.length})</h3>${error?`<p class="note">${esc(error.message)}</p>`:''}
 ${rows.map(r=>`<div class="row">${s.thumb&&r[s.thumb]?`<img src="${esc(r[s.thumb])}" alt="">`:'<span class="ph"></span>'}<b>${esc(r[s.title])}${tab==='artists'&&r.verified?'<span class="pill v">Verified</span>':''}${tab==='artists'?`<small>${r.username?'@'+esc(r.username)+' · ':''}${emails[r.id]?esc(emails[r.id]):'no account'}</small>`:''}${tab==='releases'?`<small>${esc(aname(r.artist_id)||'No artist')} · ${r.play_count||0} plays</small>`:''}${tab==='videos'?`<small>${esc(aname(r.artist_id)||'No artist')} · ${r.video_url?'uploaded file':'YouTube'}</small>`:''}${s.readonly?`<small>${esc(r.email)}</small><span class="msg-box">${esc(r.message)}</span>`:''}</b>${s.readonly?'':`<button class="btn ghost sm" data-e="${r.id}">Edit</button>`}<button class="btn ghost sm" data-d="${r.id}">Delete</button></div>`).join('')||'<p class="empty">Nothing here yet</p>'}</div>
 ${s.readonly?'':`<div class="panel"><h3>${edit?'Edit':'Add new'}</h3><form id="f"></form></div>`}</div>`;
 $('#body').querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{edit=rows.find(r=>r.id===b.dataset.e);panel()});
 $('#body').querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this item?')){const {error}=await sb.from(tab).delete().eq('id',b.dataset.d);if(error)alert(error.message);edit=null;panel()}});
 if(!s.readonly)form(s)}
function form(s){const v=edit||{},f=$('#f');
 f.innerHTML=s.fields.map(([k,l,t,req])=>{let i;
  if(t==='textarea')i=`<textarea name="${k}" rows="4">${esc(v[k])}</textarea>`;
  else if(t==='artist')i=`<select name="${k}"><option value="">—</option>${artists.map(a=>`<option value="${a.id}" ${a.id===v[k]?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`;
  else if(t.startsWith('select'))i=`<select name="${k}">${t.split(':')[1].split(',').map(o=>`<option ${o===v[k]?'selected':''}>${o}</option>`).join('')}</select>`;
  else if(t==='checkbox')i=`<label class="chk"><input type="checkbox" name="${k}" ${(edit?v[k]:true)?'checked':''}> Show the red mark next to this artist</label>`;
  else if(t==='image'||t==='audio'||t==='video')i=`${v[k]?(t==='image'?`<img class="prev" src="${esc(v[k])}" alt="">`:t==='video'?`<video controls preload="none" playsinline src="${esc(v[k])}" style="width:100%;max-height:200px"></video>`:`<audio controls src="${esc(v[k])}"></audio>`):''}<input type="file" name="${k}" accept="${t}/*">`;
  else if(t==='links')i=`<div class="lk">${LK.map(x=>`<input name="link_${x}" placeholder="${x}" value="${esc((v.links||{})[x])}">`).join('')}</div>`;
  else if(t==='datetime-local')i=`<input type="datetime-local" name="${k}" value="${v[k]?new Date(new Date(v[k])-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):''}">`;
  else i=`<input type="${t}" name="${k}" value="${esc(v[k])}" ${req?'required':''}>`;
  return `<div class="fld"><label>${l}</label>${i}</div>`}).join('')+`<button class="btn solid">Save</button> ${edit?'<button type="button" class="btn ghost" id="cx">Cancel</button>':''}<p id="st" class="note" hidden></p>`;
 if(tab==='artists'&&edit)f.insertAdjacentHTML('afterend',linkBox());
 if(edit)$('#cx').onclick=()=>{edit=null;panel()};
 if(tab==='artists'&&edit)wireLink();
 f.onsubmit=async e=>{e.preventDefault();const st=$('#st');st.hidden=false;st.textContent='Saving…';
  try{const o={},links={};
   for(const [k,,t] of s.fields){
    if(t==='links'){LK.forEach(x=>{const z=f['link_'+x].value.trim();if(z)links[x]=z});o.links=links}
    else if(t==='image'||t==='audio'||t==='video'){const file=f[k].files[0];o[k]=file?await up(file,tab):(v[k]||null)}
    else if(t==='checkbox')o[k]=f[k].checked;
    else{let z=f[k].value;if(z==='')z=null;else if(t==='number')z=+z;else if(t==='datetime-local')z=new Date(z).toISOString();o[k]=z}}
   if(tab==='videos'&&!o.artist_id)throw new Error('Choose an artist.');
   if(tab==='videos'&&!o.video_url&&!o.youtube_url)throw new Error('Add a video file or a YouTube link.');
   const r=edit?await sb.from(tab).update(o).eq('id',edit.id):await sb.from(tab).insert(o);
   if(r.error)throw r.error;edit=null;panel()}
  catch(err){st.textContent='Error: '+err.message}}}
/* link a signed-up account to an existing artist profile */
const linkBox=()=>`<div class="linkbox"><h3>Linked account</h3><p class="hint" style="margin:8px 0 12px">${emails[edit.id]?'Signed in artist: <b>'+esc(emails[edit.id])+'</b>':'No account is linked. The artist must sign up first, then enter their email here so they can manage this profile.'}</p><div class="two"><input id="lem" type="email" placeholder="Artist's account email" value="${esc(emails[edit.id])}"><button type="button" class="btn ghost sm" id="lgo">${emails[edit.id]?'Change':'Link'}</button></div>${emails[edit.id]?'<button type="button" class="lnk" id="lun">Unlink account</button>':''}<p id="lst" class="note" hidden></p></div>`;
function wireLink(){const st=$('#lst'),run=async em=>{st.hidden=false;st.textContent='Working…';
  const {error}=await sb.rpc('admin_link_artist',{aid:edit.id,em});
  if(error){st.textContent=error.message;return}edit=null;panel()};
 $('#lgo').onclick=()=>{const em=$('#lem').value.trim();if(!em){st.hidden=false;st.textContent='Enter the account email first.';return}run(em)};
 const u=$('#lun');if(u)u.onclick=()=>confirm('Unlink this account from the profile?')&&run('')}
async function shrink(f){try{if(!/^image\/(jpe?g|png|webp)$/.test(f.type))return f;const m=await createImageBitmap(f),k=Math.min(1,1600/Math.max(m.width,m.height)),c=document.createElement('canvas');c.width=Math.round(m.width*k);c.height=Math.round(m.height*k);c.getContext('2d').drawImage(m,0,0,c.width,c.height);const b=await new Promise(r=>c.toBlob(r,'image/webp',.85));return b?new File([b],'i.webp',{type:'image/webp'}):f}catch(e){return f}}
async function up(file,folder){file=await shrink(file);const p=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${file.name.split('.').pop().toLowerCase()}`;
 const {error}=await sb.storage.from('media').upload(p,file,{contentType:file.type,cacheControl:'31536000'});if(error)throw error;
 return sb.storage.from('media').getPublicUrl(p).data.publicUrl}
/* ---- activity log (table activity_log, filled by DB triggers — see supabase/004_activity_log.sql) ---- */
const LF={t:'',a:'',q:''},LN=100;let lrows=[],lmore=false;
const fmtT=d=>new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'});
const showV=v=>v===null||v===undefined?'—':typeof v==='object'?JSON.stringify(v):String(v);
async function logs(more){
 if(!more){lrows=[]}
 let q=sb.from('activity_log').select('*').order('id',{ascending:false}).range(lrows.length,lrows.length+LN-1);
 if(LF.t)q=q.eq('table_name',LF.t);if(LF.a)q=q.eq('action',LF.a);
 if(LF.q){const z=LF.q.replace(/[%,()]/g,' ').trim();if(z)q=q.or(`actor_email.ilike.%${z}%,summary.ilike.%${z}%`)}
 const {data,error}=await q;
 if(error){$('#body').innerHTML=`<div class="panel"><h3>Logs</h3><p class="note">${esc(error.message)}</p><p class="note">Run <b>supabase/004_activity_log.sql</b> in Supabase &gt; SQL Editor first.</p></div>`;return}
 lrows=lrows.concat(data||[]);lmore=(data||[]).length===LN;
 const opt=(a,v)=>a.map(x=>`<option value="${x}" ${x===v?'selected':''}>${x||'All'}</option>`).join('');
 $('#body').innerHTML=`<div class="panel"><h3>Activity log (${lrows.length}${lmore?'+':''})</h3>
 <div class="logbar"><select id="lt">${opt(['','artists','releases','videos','news','settings','messages','auth'],LF.t)}</select>
 <select id="la">${opt(['','insert','update','delete','signup','confirm','signin'],LF.a)}</select>
 <input id="lq" placeholder="Search email / name" value="${esc(LF.q)}">
 <button class="btn ghost sm" id="lr">Refresh</button><button class="btn ghost sm" id="lp">Delete old logs…</button></div>
 ${lrows.map(r=>{const ch=r.changes&&Object.keys(r.changes).length?Object.entries(r.changes).map(([k,v])=>v&&typeof v==='object'&&('new' in v||'old' in v)?`<div><code>${esc(k)}</code> ${esc(showV(v.old))} → ${esc(showV(v.new))}</div>`:`<div><code>${esc(k)}</code> ${esc(showV(v))}</div>`).join(''):'';
  return `<div class="logrow"><time>${fmtT(r.created_at)}</time><span class="pill ${esc(r.actor_role)}">${esc(r.actor_role)}</span><span class="pill a-${esc(r.action)}">${esc(r.action)}</span><b>${esc(r.table_name)}${r.summary?' · '+esc(r.summary):''}<small>${esc(r.actor_email||'anonymous')}</small>${ch?`<details><summary>Details</summary>${ch}</details>`:''}</b></div>`}).join('')||'<p class="empty">No log entries yet</p>'}
 ${lmore?'<button class="btn ghost sm" id="lm" style="margin-top:14px">Load more</button>':''}</div>`;
 const re=()=>logs();
 $('#lt').onchange=e=>{LF.t=e.target.value;re()};$('#la').onchange=e=>{LF.a=e.target.value;re()};
 $('#lq').onkeydown=e=>{if(e.key==='Enter'){LF.q=e.target.value.trim();re()}};
 $('#lr').onclick=re;if($('#lm'))$('#lm').onclick=()=>logs(true);
 $('#lp').onclick=async()=>{const d=parseInt(prompt('Delete log entries older than how many days?','90'),10);if(!d||d<1)return;
  if(!confirm(`Delete all log entries older than ${d} days?`))return;
  const {data:n,error:er}=await sb.rpc('admin_purge_logs',{days:d});if(er)alert(er.message);else alert(`Deleted ${n} entries`);re()}}
async function settings(){const {data}=await sb.from('settings').select('*').eq('key','about_body').maybeSingle();
 $('#body').innerHTML=`<div class="panel" style="max-width:640px"><h3>About page text</h3><form id="f"><div class="fld"><textarea name="v" rows="6">${esc(data&&data.value)}</textarea></div><button class="btn solid">Save</button><p id="st" class="note" hidden></p></form></div>`;
 $('#f').onsubmit=async e=>{e.preventDefault();const {error}=await sb.from('settings').upsert({key:'about_body',value:e.target.v.value}),st=$('#st');st.hidden=false;st.textContent=error?error.message:'Saved'}}
sb.auth.onAuthStateChange((ev)=>{if(ev==='SIGNED_OUT')setTimeout(boot,0)});
boot()})();
