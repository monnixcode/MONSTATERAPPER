/* Mon HipHop — sign in / sign up / artist dashboard
   Loaded on every page AFTER app.js. Needs the SQL in supabase/003_artist_accounts.sql. */
(function(){
const U=window.MH_U,sb=window.MH_SB;
if(!U)return;
const {esc,img,icons,ok,badge,shareBar,profileUrl,profilePath,ytId,vThumb}=U;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const LK=['spotify','apple','soundcloud','ytmusic','youtube','facebook','instagram','tiktok','x'];
const AUDIO_TYPES={mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',flac:'audio/flac',webm:'audio/webm'};
const MAX_AUDIO=50*1024*1024;
const VIDEO_TYPES={mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',mov:'video/quicktime'};
const MAX_VIDEO=50*1024*1024;  // Supabase free plan limit per file
const ME=window.MH_ME={user:null,artist:null,admin:false};
let meP=Promise.resolve(),lastId=null;

/* ---------- session ---------- */
async function refreshMe(){
 ME.user=null;ME.artist=null;ME.admin=false;
 if(sb){
  const {data:{session}}=await sb.auth.getSession();
  ME.user=session?session.user:null;lastId=ME.user?ME.user.id:null;
  if(ME.user){
   const [a,adm]=await Promise.all([sb.from('artists').select('*').eq('user_id',ME.user.id).maybeSingle(),sb.rpc('is_admin')]);
   ME.artist=a.data||null;ME.admin=adm.data===true;
  }
 }
 drawAuth();
}
const navTo=url=>{const a=document.createElement('a');a.href=url;document.body.append(a);a.click();a.remove()};
const initial=n=>esc((n||'?').trim().charAt(0)||'?');
const avatar=(a,fallback)=>a&&a.avatar_url?`<img src="${esc(a.avatar_url)}" alt="" onerror="this.remove()">`:`<span class="ini">${initial(a&&a.name||fallback)}</span>`;

/* ---------- header buttons ---------- */
function drawAuth(){
 const els=$$('#auth');if(!els.length)return;const set=h=>els.forEach(e=>{e.innerHTML=h});
 if(!sb){set('');return}
 if(!ME.user){set('<button type="button" class="btn ghost sm" data-auth="in">Sign in</button><button type="button" class="btn solid sm" data-auth="up"><span class="l-long">Create account</span><span class="l-short">Sign up</span></button>');return}
 const nm=ME.artist?ME.artist.name:(ME.admin?'Admin':(ME.user.user_metadata?.account_type==='listener'?'Listener':(ME.user.email||'').split('@')[0]));
 set(`<a class="me" href="account.html" title="Dashboard">${avatar(ME.artist,nm)}<span>${esc(nm)}${badge(ME.artist)}</span></a><button type="button" class="btn ghost sm" data-auth="out">Sign out</button>`);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-auth]');if(!b)return;e.preventDefault();
 const k=b.dataset.auth;if(k==='out')signOut();else openAuth(k)});
async function signOut(){await sb.auth.signOut();ME.user=null;ME.artist=null;ME.admin=false;drawAuth();
 if($('#acct'))initAcct();if(location.pathname.endsWith('account.html'))navTo('index.html')}

/* ---------- auth dialog (v4: tabs, icons, password strength, clear messages) ---------- */
const dlg=document.createElement('dialog');dlg.className='auth-dlg';dlg.setAttribute('aria-labelledby','auth-title');document.body.append(dlg);
dlg.onclick=e=>{if(e.target===dlg||e.target.closest('[data-x]'))dlg.close()};
const AI={
 mail:'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
 lock:'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
 user:'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
 eye:'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
 eyeOff:'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z',
 check:'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'};
const ico2=(k)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${AI[k]}"/></svg>`;
const ico=(k)=>`<svg class="fi" viewBox="0 0 24 24" aria-hidden="true"><path d="${AI[k]}"/></svg>`;
const X='<button class="x" data-x type="button" aria-label="Close">×</button>';
const brand=()=>`<div class="abrand"><img src="logo.png" alt="" width="30" height="30"><span>Mon HipHop</span></div>${X}`;
const tabs=v=>`<div class="seg" role="tablist" aria-label="Account"><button type="button" role="tab" aria-selected="${v==='in'}" class="${v==='in'?'on':''}" data-sw="in">Sign in</button><button type="button" role="tab" aria-selected="${v==='up'}" class="${v==='up'?'on':''}" data-sw="up">Create account</button></div>`;
const field=(label,icon,input)=>`<div class="fld"><label>${label}</label><div class="inp">${ico(icon)}${input}</div></div>`;
const pwField=(name,label,auto,meter)=>`<div class="fld"><label>${label}</label><div class="inp has-eye">${ico('lock')}<input name="${name}" type="password" minlength="8" maxlength="72" autocomplete="${auto}" placeholder="${meter?'At least 8 characters':'Your password'}" required><button type="button" class="eye" data-pw aria-label="Show password" title="Show password">${ico2('eye')}</button></div>${meter?'<div class="meter" hidden aria-hidden="true"><i></i><i></i><i></i><i></i></div><small class="pwl" aria-live="polite"></small>':''}</div>`;
const VIEWS={
 in:()=>`<div class="ad">${brand()}${tabs('in')}<h2 id="auth-title">Welcome back</h2><p class="sub">Sign in to manage your profile, music and videos.</p>
  <form class="form" data-form="in">${field('Email','mail','<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required>')}
  ${pwField('password','Password','current-password')}
  <div class="row-link"><button class="lnk" type="button" data-sw="forgot">Forgot password?</button></div>
  <button class="btn solid wide">Sign in</button><p class="msg" role="alert" hidden></p></form></div>`,
 up:()=>`<div class="ad">${brand()}${tabs('up')}<h2 id="auth-title">Create your account</h2><p class="sub" id="up-sub">Listen to Mon State rappers, follow artists and keep your favourites in one place.</p>
  <form class="form" data-form="up">
  <fieldset class="acct-type"><legend>I am a…</legend>
   <label><input type="radio" name="account_type" value="listener" checked><span><b>Listener</b><small>Play music &amp; videos, follow artists</small></span></label>
   <label><input type="radio" name="account_type" value="artist"><span><b>Artist</b><small>Get a profile, upload your music &amp; videos</small></span></label>
  </fieldset>
  <div class="artist-only" hidden>${field('Artist name','user','<input name="artist" maxlength="60" autocomplete="nickname" placeholder="Your stage name">')}
  <div class="fld"><label>Username</label><div class="inp"><span class="pre" aria-hidden="true">@</span><input class="unm" name="username" maxlength="24" minlength="3" pattern="[A-Za-z0-9_]{3,24}" autocapitalize="none" autocomplete="username" placeholder="yourname"></div><small>3–24 characters: letters, numbers or underscore. This is your profile link.</small></div></div>
  ${field('Email','mail','<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required>')}
  ${pwField('password','Password','new-password',true)}
  <label class="agree"><input type="checkbox" name="agree" required><span>I agree to the <a href="about.html#terms" target="_blank" rel="noopener">Terms of use</a> and <a href="about.html#privacy" target="_blank" rel="noopener">Privacy policy</a>.</span></label>
  <button class="btn solid wide">Create account</button><p class="msg" role="alert" hidden></p></form></div>`,
 forgot:()=>`<div class="ad">${brand()}<h2 id="auth-title">Reset your password</h2><p class="sub">Enter your email and we will send you a link to choose a new password.</p>
  <form class="form" data-form="forgot">${field('Email','mail','<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required>')}
  <button class="btn solid wide">Send reset link</button><p class="msg" role="alert" hidden></p></form>
  <p class="alt"><button class="lnk" type="button" data-sw="in">← Back to sign in</button></p></div>`,
 reset:()=>`<div class="ad">${brand()}<h2 id="auth-title">Choose a new password</h2><p class="sub">Use at least 8 characters.</p>
  <form class="form" data-form="reset">${pwField('password','New password','new-password',true)}
  <button class="btn solid wide">Save password</button><p class="msg" role="alert" hidden></p></form></div>`
};
function openAuth(view,html){
 dlg.innerHTML=html||VIEWS[view]();
 if(!dlg.open)dlg.showModal();
 const i=$$('input',dlg).find(x=>x.offsetParent&&!['radio','checkbox'].includes(x.type));if(i&&!matchMedia('(pointer:coarse)').matches)i.focus();
}
const done=(title,text)=>openAuth(0,`<div class="ad">${brand()}<div class="done-ic">${ico2('check')}</div><h2 id="auth-title">${title}</h2><p class="sub">${text}</p><div class="cta"><button class="btn solid wide" type="button" data-x>Got it</button></div></div>`);
dlg.addEventListener('click',e=>{
 const s=e.target.closest('[data-sw]');if(s){openAuth(s.dataset.sw);return}
 const p=e.target.closest('[data-pw]');if(p){const i=p.previousElementSibling,show=i.type==='password';i.type=show?'text':'password';
  p.innerHTML=ico2(show?'eyeOff':'eye');
  p.setAttribute('aria-label',show?'Hide password':'Show password');p.title=show?'Hide password':'Show password'}});
/* password strength (sign-up / reset) */
dlg.addEventListener('input',e=>{
 if(e.target.name==='password'&&e.target.form&&['up','reset'].includes(e.target.form.dataset.form)){
  const f=e.target.form,m=$('.meter',f),l=$('.pwl',f),v=e.target.value;if(!m)return;
  if(!v){m.hidden=true;l.textContent='';return}
  let lv;const sc=[v.length>=8,v.length>=12,/[a-z]/.test(v)&&/[A-Z]/.test(v),/\d/.test(v),/[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
  if(v.length<8)lv=1;else lv=sc>=4?4:sc>=3?3:2;
  m.hidden=false;m.dataset.l=lv;l.textContent=['','Too short','Fair','Good','Strong'][lv]}
 if(e.target.matches('.unm')){e.target.value=e.target.value.replace(/[^A-Za-z0-9_]/g,'')}});
dlg.addEventListener('change',e=>{
 if(e.target.name!=='account_type')return;
 const f=e.target.form,art=e.target.value==='artist',sub=$('#up-sub',dlg);
 $('.artist-only',f).hidden=!art;
 if(sub)sub.textContent=art?'Set up your artist profile. Add your photo, cover, music and videos after you sign in.':'Listen to Mon State rappers, follow artists and keep your favourites in one place.'});
dlg.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target,kind=f.dataset.form,btn=$('button.btn',f),note=$('.msg',f);
 const say=(t,good)=>{note.hidden=!t;note.textContent=t||'';note.classList.toggle('ok',!!good)};
 say('');btn.disabled=true;const was=btn.textContent;btn.textContent='Please wait…';
 try{await ({in:doIn,up:doUp,forgot:doForgot,reset:doReset}[kind])(f,say)}
 catch(err){say(friendly(err))}
 finally{btn.disabled=false;btn.textContent=was}});
function friendly(err){const m=(err&&err.message)||'Something went wrong.';
 if(/invalid login/i.test(m))return'Wrong email or password.';
 if(/not confirmed/i.test(m))return'Please confirm your email first. Check your inbox.';
 if(/already registered/i.test(m))return'This email is already registered. Try signing in.';
 if(/database error/i.test(m))return'Could not create the account. The artist name or username may already be taken.';
 if(/password/i.test(m)&&/(short|least|weak)/i.test(m))return'Password must be at least 8 characters.';
 if(/rate limit|too many/i.test(m))return'Too many attempts. Please wait a minute and try again.';
 if(/fetch|network/i.test(m))return'Network problem. Check your connection and try again.';
 return m}
async function doIn(f,say){
 const {error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.password.value});
 if(error)return say(friendly(error));
 await(meP=refreshMe());dlg.close();
 if(!location.pathname.endsWith('account.html'))navTo('account.html');else initAcct()}
async function doUp(f,say){
 const isArtist=f.account_type.value==='artist',accountType=isArtist?'artist':'listener';
 const artist=isArtist?f.artist.value.trim():'',username=isArtist?f.username.value.trim().toLowerCase():'',email=f.email.value.trim(),password=f.password.value;
 if(!f.agree.checked)return say('Please accept the Terms of use and Privacy policy to continue.');
 if(password.length<8)return say('Password must be at least 8 characters.');
 if(isArtist&&(!artist||! /^[A-Za-z0-9_]{3,24}$/.test(username)))return say('Artist name and username are required for an artist account.');
 const chk=isArtist?await sb.rpc('check_signup',{nm:artist,un:username}):{data:null,error:null};
 if(chk.error)return say('Sign-up is not set up yet. Ask the site admin to run the Supabase setup file.');
 if(chk.data)return say(chk.data);
 const {data,error}=await sb.auth.signUp({email,password,options:{data:{account_type:accountType,artist_name:artist,username,terms_accepted_at:new Date().toISOString()},emailRedirectTo:location.origin+'/account.html'}});
 if(error)return say(friendly(error));
 if(data.user&&data.user.identities&&data.user.identities.length===0)return say('This email is already registered. Try signing in.');
 if(data.session){await(meP=refreshMe());dlg.close();navTo('account.html')}
 else done('Check your inbox',`We sent a confirmation link to <b>${esc(email)}</b>. Open it to activate your account, then sign in.${isArtist?' Your artist profile goes live once your email is confirmed.':''}`)}
async function doForgot(f,say){
 const {error}=await sb.auth.resetPasswordForEmail(f.email.value.trim(),{redirectTo:location.origin+'/account.html'});
 if(error)return say(friendly(error));
 say('If that email has an account, a reset link is on its way.',true)}
async function doReset(f,say){
 const {error}=await sb.auth.updateUser({password:f.password.value});
 if(error)return say(friendly(error));
 dlg.close();done('Password updated','You can now use your new password.')}

/* ---------- auth events ---------- */
if(sb){
 sb.auth.onAuthStateChange((ev,session)=>{
  const id=session&&session.user?session.user.id:null;
  setTimeout(()=>{
   if(ev==='PASSWORD_RECOVERY'){openAuth('reset');return}
   if(ev==='SIGNED_OUT'||(ev==='SIGNED_IN'&&id!==lastId)){
    lastId=id;meP=refreshMe().then(()=>{if($('#acct'))initAcct()})}
  },0)});
}
meP=refreshMe();

/* ---------- storage helpers ---------- */
async function shrink(f,max){try{if(!/^image\/(jpe?g|png|webp)$/.test(f.type))return f;const m=await createImageBitmap(f),k=Math.min(1,max/Math.max(m.width,m.height)),c=document.createElement('canvas');
 c.width=Math.round(m.width*k);c.height=Math.round(m.height*k);c.getContext('2d').drawImage(m,0,0,c.width,c.height);
 const b=await new Promise(r=>c.toBlob(r,'image/webp',.85));return b?new File([b],'i.webp',{type:'image/webp'}):f}catch(e){return f}}
async function upload(file,folder,max){
 if(file.type.startsWith('image/'))file=await shrink(file,max||1600);
 const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5)||'bin';
 const path=`u/${ME.user.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
 const {error}=await sb.storage.from('media').upload(path,file,{contentType:file.type||AUDIO_TYPES[ext]||VIDEO_TYPES[ext]||'application/octet-stream',cacheControl:'31536000'});
 if(error)throw error;
 return sb.storage.from('media').getPublicUrl(path).data.publicUrl}
function removeFile(url){ // best effort: only ever deletes files inside this user's own folder
 const m=url&&String(url).match(/\/object\/public\/media\/(u\/[^?#]+)/);
 if(m&&ME.user&&m[1].startsWith('u/'+ME.user.id+'/'))sb.storage.from('media').remove([decodeURIComponent(m[1])]).catch(()=>{})}
const pickLinks=f=>{const o={};for(const k of LK){const v=f['link_'+k].value.trim();if(v){if(!ok(v))throw new Error('Links must start with https://');o[k]=v}}return o};
const linksFields=l=>`<div class="lk">${LK.map(x=>`<input name="link_${x}" placeholder="${x}" value="${esc((l||{})[x])}" inputmode="url">`).join('')}</div>`;
const picker=(name,label,cur,cls,hint)=>`<div class="fld"><label>${label}</label><div class="up">${cur?`<img class="${cls}" src="${esc(cur)}" alt="" data-prev="${name}">`:`<img class="${cls}" alt="" data-prev="${name}" hidden>`}</div><input type="file" name="${name}" accept="image/*" data-prevfor="${name}"><span class="hint">${hint}</span></div>`;
document.addEventListener('change',e=>{const i=e.target;if(!i.dataset||!i.dataset.prevfor||!i.files[0])return;
 const p=$(`[data-prev="${i.dataset.prevfor}"]`,i.closest('form'));if(p){p.src=URL.createObjectURL(i.files[0]);p.hidden=false}});

/* ---------- dashboard ---------- */
let tab='profile',editing=null,flash='';
const ensure=()=>meP;
function initAcct(){
 const root=$('#acct');if(!root)return;
 root.innerHTML='<div class="sk"></div>';
 ensure().then(()=>{if($('#acct')===root)drawAcct(root)})}
function drawAcct(root){
 if(!sb){root.innerHTML='<p class="note">Add SUPABASE_URL and SUPABASE_ANON_KEY in assets/js/config.js first.</p>';return}
 if(!ME.user){root.innerHTML=`<div class="panel acct-card"><h2>Artist area</h2><p class="lead" style="margin:14px auto 0;text-align:center">Sign in to edit your profile, upload your photo and cover, and release your music.</p><div class="cta"><button class="btn solid" data-auth="in" type="button">Sign in</button><button class="btn ghost" data-auth="up" type="button">Sign up</button></div></div>`;return}
 if(!ME.artist){
  if(ME.admin){root.innerHTML=`<div class="panel acct-card"><h2>Admin account</h2><p class="lead" style="margin:14px auto 0;text-align:center">This account manages the site. It has no artist profile.</p><div class="cta"><a class="btn solid" href="panel-x7k2.html">Open admin panel</a><button class="btn ghost" data-auth="out" type="button">Sign out</button></div></div>`;return}
  const md=ME.user.user_metadata||{};
  root.innerHTML=`<div class="panel acct-card" style="text-align:left"><h2>Create your artist profile</h2><p class="hint" style="margin:10px 0 18px">Your account is ready. Choose the name and username fans will see.</p>
   <form id="np"><div class="fld"><label>Account type</label><select name="account_type"><option value="artist">Artist</option><option value="listener">Listener / Music fan</option></select></div><div class="fld"><label>Artist name</label><input name="artist" maxlength="60" value="${esc(md.artist_name)}" required></div>
   <div class="fld"><label>Username</label><div class="at"><span>@</span><input name="username" maxlength="24" minlength="3" pattern="[A-Za-z0-9_]{3,24}" autocapitalize="none" value="${esc(md.username)}" required></div></div>
   <button class="btn solid">Create profile</button> <button class="btn ghost" data-auth="out" type="button">Sign out</button><p id="nst" class="note msg" hidden></p></form></div>`;
  $('#np').onsubmit=async e=>{e.preventDefault();const f=e.target,st=$('#nst'),btn=$('button.btn',f);
   const say=t=>{st.hidden=!t;st.textContent=t};btn.disabled=true;say('');
   const {error}=await sb.rpc('create_my_artist',{nm:f.artist.value.trim(),un:f.username.value.trim().toLowerCase()});
   if(error){say(friendly(error));btn.disabled=false;return}
   await(meP=refreshMe());initAcct()};
  return}
 const a=ME.artist;
 root.innerHTML=`<section class="acct-hero"><div class="cover">${img(a.cover_url)}</div><div class="who"><div class="avatar">${avatar(a)}</div>
  <div><h2>${esc(a.name)}${badge(a)}</h2><p class="uname">@${esc(a.username||'')}</p>
  <p class="vstat ${a.verified?'on':''}">${a.verified?'Verified artist · your red mark is live':'Not verified yet · the red mark is for artists on the Mon HipHop roster. <a href="contact.html">Contact us</a> to get verified.'}</p></div>
  <div class="acct-actions"><a class="btn ghost sm" href="${esc(profilePath(a))}">Public page</a></div></div></section>
  <div class="tabs">${[['profile','Profile'],['tracks','My music'],['videos','My videos'],['account','Account']].map(([k,l])=>`<button type="button" data-tab="${k}" class="${k===tab?'on':''}">${l}</button>`).join('')}</div><div id="acct-body"></div>`;
 $$('[data-tab]',root).forEach(b=>b.onclick=()=>{tab=b.dataset.tab;editing=null;flash='';drawAcct(root)});
 ({profile:tProfile,tracks:tTracks,videos:tVideos,account:tAccount}[tab])($('#acct-body',root),root)}
const flashNote=()=>flash?`<p class="note ok msg">${esc(flash)}</p>`:'';

/* --- profile tab --- */
function tProfile(box,root){const a=ME.artist;
 const pu=profileUrl(a);
 box.innerHTML=`<div class="panel share-panel" style="max-width:720px;margin:0 0 20px"><h3>Share your profile</h3><p class="hint" style="margin:0 0 10px">Anyone can open this link. On Facebook, LINE, X and others it shows your cover picture (or your profile picture) with your name.</p><div class="urlbox"><input readonly value="${esc(pu)}" aria-label="Profile link" onfocus="this.select()"><button type="button" class="cpy" data-share="native" data-url="${esc(pu)}" data-title="${esc(a.name)} on Mon HipHop" aria-label="Share profile" title="Share"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></button></div></div>
 <div class="panel" style="max-width:720px"><h3>Edit profile</h3>${flashNote()}<form id="pf">
  <div class="fld"><label>Artist name</label><input name="name" maxlength="60" value="${esc(a.name)}" required></div>
  <div class="fld"><label>Role / tagline</label><input name="role" maxlength="40" value="${esc(a.role)}" placeholder="Rapper · Mon State"></div>
  <div class="fld"><label>Bio</label><textarea name="bio" rows="5" maxlength="600" placeholder="Tell people who you are">${esc(a.bio)}</textarea></div>
  ${picker('avatar','Profile picture',a.avatar_url,'av','Square photo works best.')}<button class='btn ghost sm' type='button' data-remove-image='avatar'>Remove profile picture</button>
  ${picker('cover','Cover picture',a.cover_url,'cv','Wide image, for example 1600×600.')}<button class='btn ghost sm' type='button' data-remove-image='cover'>Remove cover picture</button>
  <div class="fld"><label>Your links</label>${linksFields(a.links)}</div>
  <button class="btn solid">Save profile</button><p id="pst" class="note msg" hidden></p></form></div>`;
 $$('[data-remove-image]',box).forEach(b=>b.onclick=()=>{const k=b.dataset.removeImage;$('#pf').dataset['remove'+k]='1';const im=$(`[data-prev="${k}"]`,$('#pf'));if(im){im.removeAttribute('src');im.hidden=true}b.textContent='Image will be removed'});
 $('#pf').onsubmit=async e=>{e.preventDefault();const f=e.target,st=$('#pst'),btn=$('button.btn',f);
  const say=(t,good)=>{st.hidden=!t;st.textContent=t;st.classList.toggle('ok',!!good)};
  btn.disabled=true;say('Saving…',true);
  try{const o={name:f.name.value.trim(),role:f.role.value.trim(),bio:f.bio.value.trim()||null,links:pickLinks(f)};
   if(!o.name)throw new Error('Artist name is required.');
   const old=[];
   if(f.dataset.removeavatar==='1'){o.avatar_url=null;old.push(a.avatar_url)}if(f.dataset.removecover==='1'){o.cover_url=null;old.push(a.cover_url)}
   if(f.avatar.files[0]){o.avatar_url=await upload(f.avatar.files[0],'profile',800);old.push(a.avatar_url)}
   if(f.cover.files[0]){o.cover_url=await upload(f.cover.files[0],'profile',1600);old.push(a.cover_url)}
   const {data,error}=await sb.from('artists').update(o).eq('id',a.id).select().single();
   if(error)throw error;old.forEach(removeFile);ME.artist=data;drawAuth();flash='Profile saved.';drawAcct(root)}
  catch(err){say(friendly(err));btn.disabled=false}}}

/* --- music tab --- */
async function tTracks(box,root){
 box.innerHTML='<div class="sk"></div>';
 const {data,error}=await sb.from('releases').select('*').eq('artist_id',ME.artist.id).order('created_at',{ascending:false});
 const rows=data||[],v=editing||{};
 box.innerHTML=`<div class="adm-cols"><div class="panel"><h3>My music (${rows.length})</h3>${error?`<p class="note">${esc(error.message)}</p>`:''}
  ${rows.map(r=>`<div class="row">${(r.cover_url||ME.artist.avatar_url)?`<img src="${esc(r.cover_url||ME.artist.avatar_url)}" alt="">`:'<span class="ph"></span>'}<b>${esc(r.title)}<small>${esc(r.type||'Single')} · ${r.play_count||0} plays</small></b><span class="acts"><button class="btn ghost sm" data-e="${r.id}" type="button">Edit</button><button class="btn ghost sm" data-d="${r.id}" type="button">Delete</button></span></div>`).join('')||'<p class="empty">No music yet. Upload your first track.</p>'}</div>
  <div class="panel"><h3>${editing?'Edit track':'Upload a track'}</h3>${flashNote()}<form id="tf">
  <div class="fld"><label>Title</label><input name="title" maxlength="100" value="${esc(v.title)}" required></div>
  <div class="fld"><label>Type</label><select name="type">${['Single','EP','Album','Mixtape'].map(o=>`<option ${o===(v.type||'Single')?'selected':''}>${o}</option>`).join('')}</select></div>
  <div class="fld"><label>Release date</label><input type="date" name="release_date" value="${esc(v.release_date||new Date().toISOString().slice(0,10))}"></div>
  ${picker('cover','Cover art (optional)',v.cover_url,'tr','Square image. If empty, your profile picture is used.')}
  <div class="fld"><label>Audio file ${editing?'(leave empty to keep current)':''}</label>${v.audio_url?`<audio controls preload="none" src="${esc(v.audio_url)}"></audio>`:''}<input type="file" name="audio" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" ${editing?'':'required'}><span class="hint">MP3, WAV, M4A, AAC, OGG or FLAC · max 50 MB. Only upload music you own the rights to.</span></div>
  <div class="fld"><label>Streaming links</label>${linksFields(v.links)}</div>
  <button class="btn solid">${editing?'Save changes':'Upload track'}</button> ${editing?'<button type="button" class="btn ghost" id="tcx">Cancel</button>':''}<p id="tst" class="note msg" hidden></p></form></div></div>`;
 flash='';
 $$('[data-e]',box).forEach(b=>b.onclick=()=>{editing=rows.find(r=>r.id===b.dataset.e);tTracks(box,root);scrollTo({top:box.offsetTop,behavior:'smooth'})});
 $$('[data-d]',box).forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.d);if(!confirm(`Delete "${r.title}"? This cannot be undone.`))return;
  const {error}=await sb.from('releases').delete().eq('id',r.id);if(error)return alert(friendly(error));
  removeFile(r.audio_url);removeFile(r.cover_url);editing=null;flash='Track deleted.';tTracks(box,root)});
 if(editing)$('#tcx').onclick=()=>{editing=null;tTracks(box,root)};
 $('#tf').onsubmit=async e=>{e.preventDefault();const f=e.target,st=$('#tst'),btn=$('button.btn',f);
  const say=(t,good)=>{st.hidden=!t;st.textContent=t;st.classList.toggle('ok',!!good)};
  try{const file=f.audio.files[0];
   if(file){const ext=file.name.split('.').pop().toLowerCase();
    if(!AUDIO_TYPES[ext]&&!file.type.startsWith('audio/'))throw new Error('Please choose an audio file (MP3, WAV, M4A, AAC, OGG or FLAC).');
    if(file.size>MAX_AUDIO)throw new Error('Audio file is larger than 50 MB.')}
   if(!editing&&!file)throw new Error('Please choose an audio file.');
   btn.disabled=true;say(file?'Uploading… large files can take a minute. Keep this page open.':'Saving…',true);
   const o={title:f.title.value.trim(),type:f.type.value,release_date:f.release_date.value||null,links:pickLinks(f)};
   if(!o.title)throw new Error('Title is required.');
   const old=[];
   if(f.cover.files[0]){o.cover_url=await upload(f.cover.files[0],'covers',1200);if(editing)old.push(editing.cover_url)}
   if(file){o.audio_url=await upload(file,'audio');if(editing)old.push(editing.audio_url)}
   const r=editing?await sb.from('releases').update(o).eq('id',editing.id):await sb.from('releases').insert({...o,artist_id:ME.artist.id});
   if(r.error){[o.cover_url,o.audio_url].forEach(removeFile);throw r.error}
   old.forEach(removeFile);flash=editing?'Track saved.':'Track uploaded. It is live on the Releases page.';editing=null;tTracks(box,root)}
  catch(err){say(/row-level security/i.test(err.message||'')?'You reached the limit of 60 tracks, or your profile is not linked to this account.':friendly(err));btn.disabled=false}}}

/* --- videos tab --- */
async function tVideos(box,root){
 box.innerHTML='<div class="sk"></div>';
 const {data,error}=await sb.from('videos').select('*').eq('artist_id',ME.artist.id).order('created_at',{ascending:false});
 const rows=data||[],v=editing||{};
 const noTable=error&&/relation|schema cache|does not exist/i.test(error.message||'');
 box.innerHTML=`<div class="adm-cols"><div class="panel"><h3>My videos (${rows.length})</h3>${noTable?'<p class="note">Videos are not set up yet. The site admin must run supabase/005_videos.sql.</p>':error?`<p class="note">${esc(error.message)}</p>`:''}
  ${rows.map(r=>`<div class="row">${vThumb(r)?`<img src="${esc(vThumb(r))}" alt="">`:'<span class="ph"></span>'}<b>${esc(r.title)}<small>${r.video_url?'Uploaded video':'YouTube'}</small></b><span class="acts"><button class="btn ghost sm" data-e="${r.id}" type="button">Edit</button><button class="btn ghost sm" data-d="${r.id}" type="button">Delete</button></span></div>`).join('')||'<p class="empty">No videos yet. Upload your first music video.</p>'}</div>
  <div class="panel"><h3>${editing?'Edit video':'Add a music video'}</h3>${flashNote()}<form id="vf">
  <div class="fld"><label>Title</label><input name="title" maxlength="100" value="${esc(v.title)}" required></div>
  <div class="fld"><label>Video file ${editing&&v.video_url?'(leave empty to keep current)':''}</label>${v.video_url?`<video controls preload="none" playsinline src="${esc(v.video_url)}" style="width:100%;max-height:220px;border-radius:8px;margin-bottom:8px"></video>`:''}<input type="file" name="video" accept="video/mp4,video/webm,video/quicktime,.mp4,.m4v,.webm,.mov"><span class="hint">MP4 (H.264) works everywhere · WebM · MOV · max 50 MB. Only upload videos you own the rights to.</span></div>
  <div class="fld"><label>…or a YouTube link</label><input name="yt" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" value="${esc(v.youtube_url)}"><span class="hint">Video bigger than 50 MB? Upload it to YouTube (Public or Unlisted) and paste the link here.</span></div>
  ${picker('thumb','Thumbnail (optional)',v.thumb_url,'tr','Wide image works best. YouTube videos use their own thumbnail if you leave this empty.')}
  <button class="btn solid">${editing?'Save changes':'Add video'}</button> ${editing?'<button type="button" class="btn ghost" id="vcx">Cancel</button>':''}<p id="vst" class="note msg" hidden></p></form></div></div>`;
 flash='';
 $$('[data-e]',box).forEach(b=>b.onclick=()=>{editing=rows.find(r=>r.id===b.dataset.e);tVideos(box,root);scrollTo({top:box.offsetTop,behavior:'smooth'})});
 $$('[data-d]',box).forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.id===b.dataset.d);if(!confirm(`Delete "${r.title}"? This cannot be undone.`))return;
  const {error}=await sb.from('videos').delete().eq('id',r.id);if(error)return alert(friendly(error));
  removeFile(r.video_url);removeFile(r.thumb_url);editing=null;flash='Video deleted.';tVideos(box,root)});
 if(editing)$('#vcx').onclick=()=>{editing=null;tVideos(box,root)};
 $('#vf').onsubmit=async e=>{e.preventDefault();const f=e.target,st=$('#vst'),btn=$('button.btn',f);
  const say=(t,good)=>{st.hidden=!t;st.textContent=t;st.classList.toggle('ok',!!good)};
  try{const file=f.video.files[0],yt=f.yt.value.trim();
   if(file){const ext=file.name.split('.').pop().toLowerCase();
    if(!VIDEO_TYPES[ext]&&!file.type.startsWith('video/'))throw new Error('Please choose a video file (MP4, WebM or MOV).');
    if(file.size>MAX_VIDEO)throw new Error('Video file is larger than 50 MB. Upload it to YouTube and paste the link instead.')}
   if(yt&&!ytId(yt))throw new Error('Please paste a normal YouTube link (youtube.com or youtu.be).');
   if(!file&&!yt&&!(editing&&editing.video_url))throw new Error('Choose a video file or paste a YouTube link.');
   const title=f.title.value.trim();if(!title)throw new Error('Title is required.');
   btn.disabled=true;say(file?'Uploading… this can take a few minutes. Keep this page open.':'Saving…',true);
   const o={title,youtube_url:yt||null},old=[];
   if(f.thumb.files[0]){o.thumb_url=await upload(f.thumb.files[0],'thumbs',1200);if(editing)old.push(editing.thumb_url)}
   if(file){o.video_url=await upload(file,'video');if(editing)old.push(editing.video_url)}
   const r=editing?await sb.from('videos').update(o).eq('id',editing.id):await sb.from('videos').insert({...o,artist_id:ME.artist.id});
   if(r.error){[o.thumb_url,o.video_url].forEach(removeFile);throw r.error}
   old.forEach(removeFile);flash=editing?'Video saved.':'Video added. It is live on the Videos page and your profile.';editing=null;tVideos(box,root)}
  catch(err){say(/row-level security/i.test(err.message||'')?'You reached the limit of 20 videos, or your profile is not linked to this account.':/mime|not supported|invalid.*type/i.test(err.message||'')?'This video format is not accepted. Use MP4, WebM or MOV.':friendly(err));btn.disabled=false}}}

/* --- account tab --- */
function tAccount(box){
 box.innerHTML=`<div class="panel" style="max-width:520px"><h3>Account</h3><p class="hint" style="margin-bottom:18px">Signed in as <b>${esc(ME.user.email)}</b></p>${flashNote()}
  <form id="unf"><div class="fld"><label>Username</label><div class="at"><span>@</span><input name="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_]{3,24}" value="${esc(ME.artist ? ME.artist.username : (ME.user.user_metadata.username||''))}" required></div></div><button class="btn ghost">Update username</button><p id="unst" class="note msg" hidden></p></form><form id="pw"><div class="fld"><label>New password</label><div class="pw"><input name="p1" type="password" minlength="8" maxlength="72" autocomplete="new-password" required><button type="button" data-pw>Show</button></div></div>
  <div class="fld"><label>Repeat new password</label><input name="p2" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></div>
  <button class="btn solid">Change password</button><p id="wst" class="note msg" hidden></p></form>
  <div class="linkbox"><button class="btn ghost" data-auth="out" type="button">Sign out</button></div></div>`;
 flash='';
 const uf=$('#unf');if(uf)uf.onsubmit=async e=>{e.preventDefault();const f=e.target,st=$('#unst'),username=f.username.value.trim().toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username)){st.hidden=false;st.textContent='Use 3–24 letters, numbers or underscores.';return}const btn=$('button.btn',f);btn.disabled=true;let error;if(ME.artist){({error}=await sb.from('artists').update({username}).eq('id',ME.artist.id))}else{({error}=await sb.auth.updateUser({data:{username}}))}btn.disabled=false;st.hidden=false;st.textContent=error?friendly(error):'Username updated.';if(!error){await(meP=refreshMe());drawAcct($('#acct'))}};
 $('#pw').onsubmit=async e=>{e.preventDefault();const f=e.target,st=$('#wst'),btn=$('button.btn',f);
  const say=(t,good)=>{st.hidden=!t;st.textContent=t;st.classList.toggle('ok',!!good)};
  if(f.p1.value!==f.p2.value)return say('Passwords do not match.');
  btn.disabled=true;const {error}=await sb.auth.updateUser({password:f.p1.value});btn.disabled=false;
  if(error)return say(friendly(error));f.reset();say('Password changed.',true)}}
document.addEventListener('click',e=>{const p=e.target.closest('#acct [data-pw]');if(!p)return;const i=p.previousElementSibling,s=i.type==='password';i.type=s?'text':'password';p.textContent=s?'Hide':'Show'});

U.hooks.push(()=>{drawAuth();initAcct()});
drawAuth();initAcct();
})();

/* ---------- privacy & cookie consent ----------
   The choice is kept in localStorage (mh_cookie_choice = accept | reject). Analytics in app.js only run after "accept".
   Footer link "Cookie settings" re-opens this so visitors can change their mind at any time. */
(function(){
const KEY='mh_cookie_choice',DET='mh_consent';
let box=null;
const get=()=>{try{return localStorage.getItem(KEY)}catch(e){return null}};
const save=on=>{try{localStorage.setItem(KEY,on?'accept':'reject');localStorage.setItem(DET,JSON.stringify({necessary:true,analytics:!!on,ts:new Date().toISOString()}))}catch(e){}};
const close=()=>{if(box){box.remove();box=null}};
function open(focus){
 close();const on=get()==='accept';
 box=document.createElement('aside');box.className='cookie-consent';box.setAttribute('role','dialog');box.setAttribute('aria-label','Privacy and cookie preferences');
 box.innerHTML=`<div class="cc-main"><strong>Privacy &amp; cookies</strong><p>We use essential storage to keep you signed in and the site secure. With your permission we also count site visits, music plays and video views to see what listeners enjoy. You can change your choice at any time.</p><a href="about.html#privacy">Privacy policy</a> · <a href="about.html#terms">Terms of use</a></div>
<div class="cta"><button type="button" class="btn ghost sm" data-cc="reject">Reject optional</button><button type="button" class="btn ghost sm" data-cc="custom" aria-expanded="false">Customize</button><button type="button" class="btn solid sm" data-cc="accept">Accept all</button></div>
<div class="cc-opts" hidden><div class="cc-opt"><div><b>Strictly necessary</b><small>Sign-in session, security and remembering this choice. Always on.</small></div><span class="cc-sw"><input type="checkbox" checked disabled aria-label="Strictly necessary (always on)"><i></i></span></div>
<div class="cc-opt"><div><b>Analytics</b><small>Anonymous counts of site visits, music plays and video views.</small></div><span class="cc-sw"><input type="checkbox" name="analytics" ${on?'checked':''} aria-label="Analytics"><i></i></span></div>
<button type="button" class="btn solid sm" data-cc="save">Save choices</button></div>`;
 box.addEventListener('click',e=>{
  const b=e.target.closest('[data-cc]');if(!b)return;const k=b.dataset.cc;
  if(k==='custom'){const o=box.querySelector('.cc-opts'),show=o.hidden;o.hidden=!show;b.setAttribute('aria-expanded',String(show));return}
  save(k==='accept'?true:k==='save'?box.querySelector('[name=analytics]').checked:false);close()});
 document.body.append(box);
 if(focus){const f=box.querySelector('[data-cc]');if(f)f.focus()}}
const p=document.querySelector('footer p');
if(p&&!p.querySelector('[data-cookie-settings]')){
 const a=(h,t)=>{const x=document.createElement('a');x.href=h;x.textContent=t;return x};
 const cs=document.createElement('button');cs.type='button';cs.className='lnk-cookie';cs.dataset.cookieSettings='';cs.textContent='Cookie settings';cs.addEventListener('click',()=>open(true));
 p.append(' · ',a('about.html#terms','Terms'),' · ',a('about.html#privacy','Privacy'),' · ',cs)}
if(!get())open(false);
})();
