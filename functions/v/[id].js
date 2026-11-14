/* Cloudflare Pages Function — serves /v/<video id>
 * Same idea as functions/a/[handle].js: puts the video title + thumbnail into the HTML
 * so Facebook / LINE / X / WhatsApp / Telegram show a proper preview card.
 *   og:image = uploaded thumbnail → YouTube thumbnail → artist picture → site logo */

const DEFAULT_URL = 'https://fmxbjxypdtqcnxxwwucy.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteGJqeHlwZHRxY254eHd3dWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDQ2NTksImV4cCI6MjEwODU4MDY1OX0.s9spCFEbZr8ArnJkdf-X5IIEKovsvduhOwzvV0rz6PU';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YT = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([A-Za-z0-9_-]{11})/;

async function getShell(env, url) {
  let u = new URL('/videos', url);
  for (let i = 0; i < 3; i++) {
    const r = await env.ASSETS.fetch(new Request(u, { redirect: 'manual' }));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), u); continue; }
    return r;
  }
  return env.ASSETS.fetch(new Request(new URL('/videos.html', url)));
}

async function findVideo(env, id) {
  const base = env.SUPABASE_URL || DEFAULT_URL, key = env.SUPABASE_ANON_KEY || DEFAULT_KEY;
  const q = `${base}/rest/v1/videos?select=id,title,thumb_url,youtube_url,artists(name,avatar_url)&id=eq.${encodeURIComponent(id)}&limit=1`;
  const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  return (await r.json())[0] || null;
}

const abs = (u, origin) => { try { return new URL(u, origin).href; } catch (e) { return origin + '/logo.png'; } };

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const id = String(params.id || '');
  const shell = await getShell(env, url);
  if (!UUID.test(id)) return shell;

  let v = null;
  try { v = await findVideo(env, id); } catch (e) { /* generic page */ }
  if (!v) return new Response(shell.body, { status: 404, headers: shell.headers });

  const artist = v.artists && v.artists.name ? v.artists.name : '';
  const yt = (v.youtube_url || '').match(YT);
  const title = `${v.title}${artist ? ' — ' + artist : ''} | Mon HipHop`;
  const desc = `Watch “${v.title}”${artist ? ' by ' + artist : ''} on Mon HipHop.`;
  const canonical = `${url.origin}/v/${v.id}`;
  const image = abs(v.thumb_url || (yt ? `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` : '') || (v.artists && v.artists.avatar_url) || '/logo.png', url.origin);
  const set = (value) => ({ element(el) { el.setAttribute('content', value); } });

  const out = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', canonical); } })
    .on('meta[name="description"]', set(desc))
    .on('meta[property="og:type"]', set('video.other'))
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(desc))
    .on('meta[property="og:url"]', set(canonical))
    .on('meta[property="og:image"]', set(image))
    .on('meta[name="twitter:card"]', set('summary_large_image'))
    .on('meta[name="twitter:title"]', set(title))
    .on('meta[name="twitter:description"]', set(desc))
    .on('meta[name="twitter:image"]', set(image))
    .transform(new Response(shell.body, { status: 200, headers: shell.headers }));

  const headers = new Headers(out.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300');
  headers.delete('Content-Length');
  return new Response(out.body, { status: 200, headers });
}
