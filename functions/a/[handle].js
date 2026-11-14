/* Cloudflare Pages Function — serves /a/<username> (or /a/<artist id>)
 *
 * Facebook / LINE / X / Discord / WhatsApp crawlers do NOT run JavaScript, so the
 * preview card (title, description, picture) must already be in the HTML they download.
 * This function looks the artist up in Supabase and writes the tags into artist.html:
 *
 *   og:image = artist cover picture  →  else profile picture  →  else the site logo
 *
 * The browser then loads the normal profile page from the same HTML.
 * Optional env vars (Pages > Settings > Variables): SUPABASE_URL, SUPABASE_ANON_KEY
 * (they default to the same public values as assets/js/config.js). */

const DEFAULT_URL = 'https://fmxbjxypdtqcnxxwwucy.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteGJqeHlwZHRxY254eHd3dWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDQ2NTksImV4cCI6MjEwODU4MDY1OX0.s9spCFEbZr8ArnJkdf-X5IIEKovsvduhOwzvV0rz6PU';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getShell(env, url) {
  // Pages serves artist.html at the "pretty" URL /artist, so follow redirects through ASSETS
  let u = new URL('/artist', url);
  for (let i = 0; i < 3; i++) {
    const r = await env.ASSETS.fetch(new Request(u, { redirect: 'manual' }));
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
      u = new URL(r.headers.get('location'), u);
      continue;
    }
    return r;
  }
  return env.ASSETS.fetch(new Request(new URL('/artist.html', url)));
}

async function findArtist(env, handle) {
  const base = env.SUPABASE_URL || DEFAULT_URL;
  const key = env.SUPABASE_ANON_KEY || DEFAULT_KEY;
  const col = UUID.test(handle) ? 'id' : 'username';
  const val = col === 'id' ? handle : handle.toLowerCase();
  const q = `${base}/rest/v1/artists?select=id,name,username,role,bio,avatar_url,cover_url&${col}=eq.${encodeURIComponent(val)}&limit=1`;
  const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

const abs = (u, origin) => { try { return new URL(u, origin).href; } catch (e) { return origin + '/logo.png'; } };

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const handle = String(params.handle || '');
  const shell = await getShell(env, url);

  if (!/^[A-Za-z0-9_-]{1,64}$/.test(handle)) return shell;

  let artist = null;
  try { artist = await findArtist(env, handle); } catch (e) { /* show the generic page */ }
  if (!artist) {
    return new Response(shell.body, { status: 404, headers: shell.headers });
  }

  const canonical = `${url.origin}/a/${encodeURIComponent(artist.username || artist.id)}`;
  const title = `${artist.name} — Mon HipHop`;
  const desc = (artist.bio ? artist.bio.replace(/\s+/g, ' ').trim() : `${artist.role || 'Artist'} on Mon HipHop. Listen to music and watch videos.`).slice(0, 180);
  const image = abs(artist.cover_url || artist.avatar_url || '/logo.png', url.origin);
  const card = artist.cover_url ? 'summary_large_image' : 'summary';

  const setMeta = (sel, value) => ({
    element(el) { el.setAttribute('content', value); },
  });

  const out = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(title); } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', canonical); } })
    .on('meta[name="description"]', setMeta('d', desc))
    .on('meta[property="og:title"]', setMeta('t', title))
    .on('meta[property="og:description"]', setMeta('d', desc))
    .on('meta[property="og:url"]', setMeta('u', canonical))
    .on('meta[property="og:image"]', setMeta('i', image))
    .on('meta[name="twitter:card"]', setMeta('c', card))
    .on('meta[name="twitter:title"]', setMeta('t', title))
    .on('meta[name="twitter:description"]', setMeta('d', desc))
    .on('meta[name="twitter:image"]', setMeta('i', image))
    .transform(new Response(shell.body, { status: 200, headers: shell.headers }));

  const headers = new Headers(out.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300');
  headers.delete('Content-Length');
  return new Response(out.body, { status: 200, headers });
}
