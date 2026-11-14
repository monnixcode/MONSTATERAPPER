#!/usr/bin/env node
/* Static host fallback (GitHub Pages etc.): pre-builds one small HTML page per artist and per video
 * so Facebook / LINE / X / WhatsApp / Telegram can read a proper preview card.
 *
 *   public/a/<username>/index.html   ← artist.html  + artist name, bio, cover/profile picture
 *   public/v/<video id>/index.html   ← videos.html  + video title, thumbnail
 *
 * Run by .github/workflows/deploy-pages.yml before every deploy (and once an hour).
 * On Cloudflare Pages you do not need this — functions/a and functions/v do the same live.
 * Usage:  node scripts/gen-share-pages.mjs            (reads Supabase URL/key from assets/js/config.js)
 *         SITE_URL=https://example.com node scripts/gen-share-pages.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');   // the folder Cloudflare / GitHub Pages publish
const cfg = readFileSync(join(pub, 'assets/js/config.js'), 'utf8');
const SB = process.env.SUPABASE_URL || (cfg.match(/SUPABASE_URL\s*=\s*"([^"]+)"/) || [])[1];
const KEY = process.env.SUPABASE_ANON_KEY || (cfg.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/) || [])[1];
const cname = existsSync(join(pub, 'CNAME')) ? readFileSync(join(pub, 'CNAME'), 'utf8').trim() : '';
const SITE = (process.env.SITE_URL || (cname ? 'https://' + cname : '')).replace(/\/$/, '');
if (!SB || !KEY) { console.error('Supabase URL/key not found'); process.exit(1); }
if (!SITE) { console.error('Set SITE_URL or add a CNAME file'); process.exit(1); }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = (u) => { try { return new URL(u, SITE + '/').href; } catch { return SITE + '/logo.png'; } };
const get = async (q) => {
  const r = await fetch(`${SB}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`${q} → HTTP ${r.status}`);
  return r.json();
};

function inject(html, o) {
  const meta = (attr, name, value) => {
    const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`);
    return re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html;
  };
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(o.title)}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${esc(o.url)}$2`);
  html = meta('name', 'description', o.desc);
  html = meta('property', 'og:type', o.type);
  html = meta('property', 'og:title', o.title);
  html = meta('property', 'og:description', o.desc);
  html = meta('property', 'og:url', o.url);
  html = meta('property', 'og:image', o.image);
  html = meta('name', 'twitter:card', o.card);
  html = meta('name', 'twitter:title', o.title);
  html = meta('name', 'twitter:description', o.desc);
  html = meta('name', 'twitter:image', o.image);
  return html;
}

const artistShell = readFileSync(join(pub, 'artist.html'), 'utf8');
const videoShell = readFileSync(join(pub, 'videos.html'), 'utf8');
const safe = (s) => /^[A-Za-z0-9_-]{1,64}$/.test(s);
const YT = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/;

for (const d of ['a', 'v']) rmSync(join(pub, d), { recursive: true, force: true });

const artists = await get('artists?select=id,name,username,role,bio,avatar_url,cover_url');
let n = 0;
for (const a of artists) {
  const handle = a.username || a.id;
  if (!safe(handle)) continue;
  const desc = (a.bio ? a.bio.replace(/\s+/g, ' ').trim() : `${a.role || 'Artist'} on Mon HipHop. Listen to music and watch videos.`).slice(0, 180);
  const html = inject(artistShell, {
    title: `${a.name} — Mon HipHop`, desc, type: 'profile', url: `${SITE}/a/${handle}`,
    image: abs(a.cover_url || a.avatar_url || '/logo.png'), card: a.cover_url ? 'summary_large_image' : 'summary',
  });
  const dirs = new Set([handle, String(a.id), String(handle).toLowerCase()]);
  for (const h of dirs) { if (!safe(h)) continue; mkdirSync(join(pub, 'a', h), { recursive: true }); writeFileSync(join(pub, 'a', h, 'index.html'), html); }
  n++;
}

let m = 0;
try {
  const videos = await get('videos?select=id,title,thumb_url,youtube_url,artists(name,avatar_url)');
  for (const v of videos) {
    if (!safe(v.id)) continue;
    const artist = v.artists && v.artists.name ? v.artists.name : '';
    const yt = (v.youtube_url || '').match(YT);
    const html = inject(videoShell, {
      title: `${v.title}${artist ? ' — ' + artist : ''} | Mon HipHop`,
      desc: `Watch “${v.title}”${artist ? ' by ' + artist : ''} on Mon HipHop.`, type: 'video.other', url: `${SITE}/v/${v.id}`,
      image: abs(v.thumb_url || (yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : '') || (v.artists && v.artists.avatar_url) || '/logo.png'),
      card: 'summary_large_image',
    });
    mkdirSync(join(pub, 'v', v.id), { recursive: true });
    writeFileSync(join(pub, 'v', v.id, 'index.html'), html);
    m++;
  }
} catch (e) { console.warn('videos skipped:', e.message); } // 005_videos.sql not run yet

console.log(`share pages: ${n} artists, ${m} videos`);
