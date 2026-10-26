/* ============ ตั้งค่าเว็บ ============
   1) ใส่ค่าจาก Supabase > Project Settings > API
   2) ถ้ายังไม่ใส่ เว็บจะแสดงข้อมูลตัวอย่าง (FALLBACK) ด้านล่างแทน */
const SUPABASE_URL = "https://fmxbjxypdtqcnxxwwucy.supabase.co";       // https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";  // anon public key (ปลอดภัยที่จะเปิดเผย)

const LINKS = {

  // Mon HipHop official channels (top of the page)
  label: {
    // Follow
    youtube:    "https://youtube.com/@monhiphop?si=I8sAI1r5LVYtQNVO",
    facebook:   "https://www.facebook.com/share/1KEp6zJRcE/",
    instagram:  "https://www.instagram.com/monhiphop_?xtok=eTNvazJlcXM5Y3Zz",
    x:          "https://x.com/monhiphop_",
    tiktok:     "https://www.tiktok.com/@monhiphop?_r=1&_t=ZS-9AqIS1BIjYY",
    // Listen on (streaming)
    spotify:    "https://open.spotify.com/artist/4JTkFROtJ0VLuuODg8UNN9?si=JduJbhBHSTOySAxaIUAAeg&utm_source=copy-link",
    apple:      "https://music.apple.com/us/artist/mon-hiphop-underground/6809851342",   // Apple Music
    soundcloud: "https://on.soundcloud.com/CR2xsIri4piWNIMrMD",
    ytmusic:    "https://music.youtube.com/@monhiphop?si=IpmlMVtqlcr6i8yr"    // YouTube Music
  },

  // Each artist (the key must match data-artist in index.html)
  artists: {
    artist1: {
      spotify:    "https://open.spotify.com/artist/3yskKASDsHFESxrKb1gWAF?si=kO61__Z2QW-3-CpbvIGBGQ&utm_source=copy-link",
      soundcloud: "https://on.soundcloud.com/DR5R6ubGmIibFOLKoi",
      youtube:    "https://youtube.com/@suriyashit?si=77wHcbIwo4GKCq2M",
      facebook:   "https://www.facebook.com/share/1CpqaySiXS/",
      instagram:  "https://www.instagram.com/1suriyaaa?obrf=MTQxMmE5YXhzazRoaw==",
      tiktok:     "https://www.tiktok.com/@suriyashit?_r=1&_t=ZS-9Aq0EqBcXP0"
    },
    artist2: {
      spotify:    "https://open.spotify.com/artist/3WGBwvd4bSDftBRaR78tIO?si=f-Mmgkd2TfKnbLXgDX8MGA&utm_source=copy-link",
      soundcloud: "https://on.soundcloud.com/BbujFz4NcoFKqJHxvA",
      youtube:    "https://youtube.com/@nonkizz?si=FxhnlZXJ4Q8SFFbD",
      facebook:   "https://www.facebook.com/share/14tT5aGHzrJ/",
      instagram:  "https://www.instagram.com/non_kizzy_official?vrfl=ZTJvMG9sMzNseHdp",
      tiktok:     "https://www.tiktok.com/@nonkizz3?_r=1&_t=ZS-9AqI3M3JtIu"
    },
    artist3: {
      spotify:    "#",
      soundcloud: "#",
      youtube:    "https://youtube.com/@2013dady?si=ZLdX_9aSDKOCbUkT",
      facebook:   "https://www.facebook.com/share/1CLF4QQpd2/",
      instagram:  "#",
      tiktok:     "https://www.tiktok.com/@monstate.tv?_r=1&_t=ZS-9AqJrRpHcUY"
    }
  }
};

window.MH = {
  SUPABASE_URL, SUPABASE_ANON_KEY, LINKS,
  FALLBACK: {
    artists: [
      {id:"1", name:"Suriya", role:"Rapper · Mon State", avatar_url:"images/suriya.jpg", cover_url:"images/suriya_cover.jpg", links:LINKS.artists.artist1},
      {id:"2", name:"Nonkizz", role:"Rapper · Mon State", avatar_url:"images/nonkizz.jpg", cover_url:"images/nonkizz-cover.jpg", links:LINKS.artists.artist2},
      {id:"3", name:"MonState Daddy", role:"Rapper · Mon State", avatar_url:"images/monstatedaddy.jpg", cover_url:"images/monstatedaddy-cov.jpg", links:LINKS.artists.artist3}
    ],
    releases: [], news: []
  }
};
