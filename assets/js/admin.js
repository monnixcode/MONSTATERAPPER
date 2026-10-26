(async function(){
const sb=window.MH_SB,app=document.getElementById('app'),out=document.getElementById('logout');
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!sb){app.innerHTML='<p class="note">ใส่ SUPABASE_URL และ SUPABASE_ANON_KEY ใน assets/js/config.js ก่อน</p>';return}
const LK=['spotify','apple','soundcloud','ytmusic','youtube','facebook','instagram','tiktok','x'];
// [คอลัมน์, ป้ายชื่อ, ชนิด, จำเป็น]
const S={
 artists:{label:'ศิลปิน',order:['sort',true],title:'name',thumb:'avatar_url',fields:[['name','ชื่อศิลปิน','text',1],['role','บทบาท','text'],['bio','ประวัติย่อ','textarea'],['avatar_url','รูปโปรไฟล์','image'],['cover_url','รูปปก (cover)','image'],['sort','ลำดับ (เลขน้อยขึ้นก่อน)','number'],['links','ลิงก์','links']]},
 releases:{label:'เพลง / ผลงาน',order:['release_date',false],title:'title',thumb:'cover_url',fields:[['title','ชื่อเพลง','text',1],['artist_id','ศิลปิน','artist'],['type','ประเภท','select:Single,EP,Album,Mixtape'],['release_date','วันที่ปล่อย','date'],['cover_url','หน้าปกเพลง','image'],['audio_url','ไฟล์เพลง','audio'],['links','ลิงก์สตรีมมิ่ง','links']]},
 news:{label:'ข่าว',order:['published_at',false],title:'title',thumb:'image_url',fields:[['title','หัวข้อ','text',1],['body','เนื้อหา','textarea'],['image_url','รูปภาพ','image'],['published_at','วันที่','datetime-local']]},
 messages:{label:'ข้อความติดต่อ',order:['created_at',false],title:'name',readonly:1,fields:[]},
 settings:{label:'ตั้งค่า',custom:1}
};
let tab='artists',edit=null,artists=[];
async function boot(){const {data:{session}}=await sb.auth.getSession();out.hidden=!session;session?panel():login()}
out.onclick=async()=>{await sb.auth.signOut();boot()};
function login(){app.innerHTML=`<form class="login form"><h2>เข้าสู่ระบบแอดมิน</h2><input name="e" type="email" placeholder="อีเมล" required><input name="p" type="password" placeholder="รหัสผ่าน" required><button class="btn solid">เข้าสู่ระบบ</button><p id="ln" class="note" hidden></p></form>`;
 $('.login').onsubmit=async e=>{e.preventDefault();const f=e.target,{error}=await sb.auth.signInWithPassword({email:f.e.value,password:f.p.value});
  if(error){const n=$('#ln');n.hidden=false;n.textContent='เข้าสู่ระบบไม่สำเร็จ: '+error.message}else boot()}}
async function panel(){
 app.innerHTML=`<div class="tabs">${Object.entries(S).map(([k,v])=>`<button data-t="${k}" class="${k===tab?'on':''}">${v.label}</button>`).join('')}</div><div id="body"></div>`;
 app.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;edit=null;panel()});
 if(S[tab].custom)return settings();
 const {data:aa}=await sb.from('artists').select('id,name').order('name');artists=aa||[];
 const s=S[tab],{data,error}=await sb.from(tab).select('*').order(s.order[0],{ascending:s.order[1]});
 const rows=data||[];
 $('#body').innerHTML=`<div class="adm-cols"><div class="panel"><h3>${s.label} (${rows.length})</h3>${error?`<p class="note">${esc(error.message)}</p>`:''}
 ${rows.map(r=>`<div class="row">${s.thumb&&r[s.thumb]?`<img src="${esc(r[s.thumb])}" alt="">`:'<span class="ph"></span>'}<b>${esc(r[s.title])}${tab==='releases'?`<small>${r.play_count||0} plays</small>`:''}${s.readonly?`<small>${esc(r.email)}</small><span class="msg-box">${esc(r.message)}</span>`:''}</b>${s.readonly?'':`<button class="btn ghost sm" data-e="${r.id}">แก้ไข</button>`}<button class="btn ghost sm" data-d="${r.id}">ลบ</button></div>`).join('')||'<p class="empty">ยังไม่มีข้อมูล</p>'}</div>
 ${s.readonly?'':`<div class="panel"><h3>${edit?'แก้ไข':'เพิ่มใหม่'}</h3><form id="f"></form></div>`}</div>`;
 $('#body').querySelectorAll('[data-e]').forEach(b=>b.onclick=()=>{edit=rows.find(r=>r.id===b.dataset.e);panel()});
 $('#body').querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{if(confirm('ลบรายการนี้?')){await sb.from(tab).delete().eq('id',b.dataset.d);edit=null;panel()}});
 if(!s.readonly)form(s)}
function form(s){const v=edit||{},f=$('#f');
 f.innerHTML=s.fields.map(([k,l,t,req])=>{let i;
  if(t==='textarea')i=`<textarea name="${k}" rows="4">${esc(v[k])}</textarea>`;
  else if(t==='artist')i=`<select name="${k}"><option value="">—</option>${artists.map(a=>`<option value="${a.id}" ${a.id===v[k]?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`;
  else if(t.startsWith('select'))i=`<select name="${k}">${t.split(':')[1].split(',').map(o=>`<option ${o===v[k]?'selected':''}>${o}</option>`).join('')}</select>`;
  else if(t==='image'||t==='audio')i=`${v[k]?(t==='image'?`<img class="prev" src="${esc(v[k])}" alt="">`:`<audio controls src="${esc(v[k])}"></audio>`):''}<input type="file" name="${k}" accept="${t}/*">`;
  else if(t==='links')i=`<div class="lk">${LK.map(x=>`<input name="link_${x}" placeholder="${x}" value="${esc((v.links||{})[x])}">`).join('')}</div>`;
  else if(t==='datetime-local')i=`<input type="datetime-local" name="${k}" value="${v[k]?new Date(new Date(v[k])-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16):''}">`;
  else i=`<input type="${t}" name="${k}" value="${esc(v[k])}" ${req?'required':''}>`;
  return `<div class="fld"><label>${l}</label>${i}</div>`}).join('')+`<button class="btn solid">บันทึก</button> ${edit?'<button type="button" class="btn ghost" id="cx">ยกเลิก</button>':''}<p id="st" class="note" hidden></p>`;
 if(edit)$('#cx').onclick=()=>{edit=null;panel()};
 f.onsubmit=async e=>{e.preventDefault();const st=$('#st');st.hidden=false;st.textContent='กำลังบันทึก...';
  try{const o={},links={};
   for(const [k,,t] of s.fields){
    if(t==='links'){LK.forEach(x=>{const z=f['link_'+x].value.trim();if(z)links[x]=z});o.links=links}
    else if(t==='image'||t==='audio'){const file=f[k].files[0];o[k]=file?await up(file,tab):(v[k]||null)}
    else{let z=f[k].value;if(z==='')z=null;else if(t==='number')z=+z;else if(t==='datetime-local')z=new Date(z).toISOString();o[k]=z}}
   const r=edit?await sb.from(tab).update(o).eq('id',edit.id):await sb.from(tab).insert(o);
   if(r.error)throw r.error;edit=null;panel()}
  catch(err){st.textContent='ผิดพลาด: '+err.message}}}
async function shrink(f){try{if(!/^image\/(jpe?g|png|webp)$/.test(f.type))return f;const m=await createImageBitmap(f),k=Math.min(1,1600/Math.max(m.width,m.height)),c=document.createElement('canvas');c.width=Math.round(m.width*k);c.height=Math.round(m.height*k);c.getContext('2d').drawImage(m,0,0,c.width,c.height);const b=await new Promise(r=>c.toBlob(r,'image/webp',.85));return b?new File([b],'i.webp',{type:'image/webp'}):f}catch(e){return f}}
async function up(file,folder){file=await shrink(file);const p=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${file.name.split('.').pop().toLowerCase()}`;
 const {error}=await sb.storage.from('media').upload(p,file,{contentType:file.type,cacheControl:'31536000'});if(error)throw error;
 return sb.storage.from('media').getPublicUrl(p).data.publicUrl}
async function settings(){const {data}=await sb.from('settings').select('*').eq('key','about_body').maybeSingle();
 $('#body').innerHTML=`<div class="panel" style="max-width:640px"><h3>ข้อความหน้า About</h3><form id="f"><div class="fld"><textarea name="v" rows="6">${esc(data&&data.value)}</textarea></div><button class="btn solid">บันทึก</button><p id="st" class="note" hidden></p></form></div>`;
 $('#f').onsubmit=async e=>{e.preventDefault();const {error}=await sb.from('settings').upsert({key:'about_body',value:e.target.v.value}),st=$('#st');st.hidden=false;st.textContent=error?error.message:'บันทึกแล้ว'}}
sb.auth.onAuthStateChange((ev)=>{if(ev==='SIGNED_OUT')boot()});
boot()})();
