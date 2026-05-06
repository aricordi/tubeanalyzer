// TubeAnalyzer — YouTube Data API v3 + Gemini AI service layer
// API keys live in localStorage — nothing ever sent to a third-party server.
(function () {
  'use strict';

  const YT_BASE  = 'https://www.googleapis.com/youtube/v3';
  const GM_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  // ─── Cache (localStorage with TTL) ────────────────────────────────────────
  const CACHE_1H  = 60 * 60 * 1000;
  const CACHE_24H = 24 * 60 * 60 * 1000;

  function cget(k) {
    try {
      const r = localStorage.getItem('ta$' + k);
      if (!r) return null;
      const { d, t, ttl } = JSON.parse(r);
      if (Date.now() - t > (ttl || CACHE_1H)) { localStorage.removeItem('ta$' + k); return null; }
      return d;
    } catch (e) { return null; }
  }
  function cset(k, d, ttl = CACHE_1H) {
    try { localStorage.setItem('ta$' + k, JSON.stringify({ d, t: Date.now(), ttl })); } catch (e) {}
  }

  // ─── Key management ────────────────────────────────────────────────────────
  const Keys = {
    get yt()     { return localStorage.getItem('ta_yt_key')     || ''; },
    get gemini() { return localStorage.getItem('ta_gemini_key') || ''; },
    setYt(v)     { localStorage.setItem('ta_yt_key',     v.trim()); },
    setGemini(v) { localStorage.setItem('ta_gemini_key', v.trim()); },
    hasYt()      { return this.yt.length > 10; },
    hasGemini()  { return this.gemini.length > 10; },
    clearAll()   {
      localStorage.removeItem('ta_yt_key');
      localStorage.removeItem('ta_gemini_key');
    },
  };

  // ─── YouTube fetch wrapper ─────────────────────────────────────────────────
  async function ytFetch(endpoint, params) {
    if (!Keys.hasYt()) throw Object.assign(new Error('No YouTube API key configured'), { code: 'NO_KEY' });
    const url = new URL(`${YT_BASE}/${endpoint}`);
    url.searchParams.set('key', Keys.yt);
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg  = body.error?.message || `HTTP ${res.status}`;
      if (res.status === 400) throw Object.assign(new Error(msg), { code: 'BAD_KEY' });
      if (res.status === 403) throw Object.assign(new Error(msg), { code: 'QUOTA' });
      throw Object.assign(new Error(msg), { code: 'YT_ERR' });
    }
    return res.json();
  }

  // ─── YouTube: search videos (100 units / call) ────────────────────────────
  async function searchVideos(query, { maxResults = 20, order = 'relevance', channelId } = {}) {
    const ck = `search:${query}:${maxResults}:${order}:${channelId || ''}`;
    const hit = cget(ck);
    if (hit) return hit;
    const data = await ytFetch('search', { part: 'snippet', type: 'video', q: query, maxResults, order, channelId });
    cset(ck, data, CACHE_24H);
    return data;
  }

  // ─── YouTube: video details batch (1 unit / call) ─────────────────────────
  async function getVideoDetails(ids) {
    const arr = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
    if (!arr.length) return [];
    const results = [];
    for (let i = 0; i < arr.length; i += 50) {
      const batch = arr.slice(i, i + 50);
      const ck    = `vd:${batch.join(',')}`;
      let   data  = cget(ck);
      if (!data) {
        data = await ytFetch('videos', { part: 'statistics,contentDetails,snippet', id: batch.join(',') });
        cset(ck, data, CACHE_1H);
      }
      results.push(...(data.items || []));
    }
    return results;
  }

  // ─── YouTube: channel details (1 unit / call) ─────────────────────────────
  async function getChannel(id) {
    const ck  = `chan:${id}`;
    const hit = cget(ck);
    if (hit) return hit;
    const data = await ytFetch('channels', { part: 'statistics,snippet,brandingSettings', id });
    const item = data.items?.[0] || null;
    if (item) cset(ck, item, CACHE_24H);
    return item;
  }

  // ─── YouTube: batch channel stats ─────────────────────────────────────────
  async function getChannelsBatch(ids) {
    const arr = [...new Set(ids.filter(Boolean))];
    if (!arr.length) return {};
    const map = {};
    for (let i = 0; i < arr.length; i += 50) {
      const batch = arr.slice(i, i + 50).sort();
      const ck    = `chbatch:${batch.join(',')}`;
      let   data  = cget(ck);
      if (!data) {
        data = await ytFetch('channels', { part: 'statistics,snippet', id: batch.join(',') });
        cset(ck, data, CACHE_24H);
      }
      (data.items || []).forEach(ch => { map[ch.id] = ch; });
    }
    return map;
  }

  // ─── YouTube: search channels by name/handle ──────────────────────────────
  async function searchChannels(query, maxResults = 8) {
    const ck  = `chsearch:${query}:${maxResults}`;
    const hit = cget(ck);
    if (hit) return hit;
    const data = await ytFetch('search', { part: 'snippet', type: 'channel', q: query, maxResults });
    const ids  = (data.items || []).map(i => i.id?.channelId).filter(Boolean);
    let statsMap = {};
    if (ids.length) { statsMap = await getChannelsBatch(ids); }
    // Normalize to internal channel format
    const normalized = (data.items || []).map(item => {
      const channelId = item.id?.channelId || '';
      const ch        = statsMap[channelId];
      const subs      = parseInt(ch?.statistics?.subscriberCount || 0);
      return {
        id:        channelId,
        handle:    (item.snippet?.customUrl || item.snippet?.title || channelId).replace(/^@/, '').replace(/\s+/g, ''),
        name:      item.snippet?.title || 'Unknown',
        subs,
        niche:     guessNiche(item.snippet?.title || '', item.snippet?.description || ''),
        colors:    window.chanColor ? window.chanColor(channelId) : ['#3b82f6', '#1e3a8a'],
        thumbnail: item.snippet?.thumbnails?.high?.url || '',
        isReal:    true,
      };
    });
    cset(ck, normalized, CACHE_1H);
    return normalized;
  }

  // ─── YouTube: channel's recent videos (100 units) ─────────────────────────
  async function getChannelVideos(channelId, maxResults = 20) {
    const ck  = `chvids:${channelId}:${maxResults}`;
    const hit = cget(ck);
    if (hit) return hit;
    const data = await ytFetch('search', { part: 'snippet', channelId, type: 'video', order: 'date', maxResults });
    cset(ck, data, CACHE_1H);
    return data;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function parseDuration(iso) {
    const m = (iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return { str: '0:00', sec: 0 };
    const h = +m[1] || 0, mn = +m[2] || 0, s = +m[3] || 0;
    const sec = h * 3600 + mn * 60 + s;
    const str = h > 0
      ? `${h}:${String(mn).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${mn}:${String(s).padStart(2, '0')}`;
    return { str: str || '0:00', sec };
  }

  function toAgo(dateStr) {
    if (!dateStr) return 'unknown';
    const d = Math.round((Date.now() - new Date(dateStr)) / 86400000);
    if (d < 1) return 'today';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.round(d / 7)}w ago`;
    if (d < 365) return `${Math.round(d / 30)}mo ago`;
    return `${Math.round(d / 365)}y ago`;
  }
  function agoDays(s) {
    if (!s) return 30;
    const m = s.match(/^(\d+)(d|w|mo|y)/);
    if (!m) return 30;
    return +m[1] * ({ d: 1, w: 7, mo: 30, y: 365 }[m[2]]);
  }

  // ─── Niche guesser ─────────────────────────────────────────────────────────
  const NICHE_KW = {
    'AI':          ['ai','chatgpt','claude','gemini','llm','gpt','openai','anthropic','artificial intelligence','machine learning'],
    'Tech':        ['tech','software','coding','programming','developer','app','laptop','phone','apple','google','microsoft','hardware'],
    'Gaming':      ['gaming','game','minecraft','roblox','fortnite','valorant','elden ring','playstation','xbox','nintendo','stream'],
    'Finance':     ['money','finance','invest','stock','budget','wealth','passive income','entrepreneur','business','income','profit','rich'],
    'Crypto':      ['crypto','bitcoin','ethereum','nft','defi','blockchain','web3','altcoin','solana','token'],
    'Fitness':     ['workout','gym','fitness','exercise','diet','nutrition','muscle','running','marathon','lifting','hiit','yoga','training'],
    'Cooking':     ['cook','recipe','food','meal','kitchen','bake','chef','restaurant','eat','vegan','cuisine'],
    'Vlog':        ['vlog','day in my life','routine','lifestyle','week with me','apartment','moving','living'],
    'Education':   ['explained','learn','study','school','university','history','math','physics','chemistry','biology','knowledge'],
    'Comedy':      ['funny','comedy','sketch','prank','reaction','challenge','try not to laugh','humor'],
    'Beauty':      ['makeup','beauty','skincare','hair','tutorial','get ready','grwm','haul','foundation','routine'],
    'Cars':        ['car','auto','drive','race','ford','tesla','bmw','mercedes','review','horsepower','motor','drift'],
    'DIY':         ['diy','build','make','craft','woodwork','home improvement','project','renovation','handmade'],
    'Horror':      ['horror','scary','haunted','ghost','paranormal','creepy','disturbing','slender','dark'],
    'Science':     ['science','experiment','nasa','space','physics','chemistry','biology','evolution','quantum'],
    'Productivity':['productivity','focus','habit','morning routine','system','organize','notion','obsidian','deep work'],
    'Travel':      ['travel','trip','tour','hotel','airport','flight','backpack','country','adventure','explore'],
    'Music':       ['music','song','album','concert','artist','singer','rap','pop','hip hop','cover','instrumental'],
    'Sports':      ['sport','soccer','football','basketball','nba','nfl','athlete','team','match','tournament'],
    'Photography': ['photo','camera','lens','lightroom','portrait','landscape','photography','shoot','exposure'],
  };
  function guessNiche(title, channelName) {
    const text = (title + ' ' + channelName).toLowerCase();
    for (const [niche, kws] of Object.entries(NICHE_KW)) {
      if (kws.some(kw => text.includes(kw))) return niche;
    }
    return 'General';
  }

  // ─── Build internal video object from API data ─────────────────────────────
  function buildVideo(searchItem, detailItem, channelAvgViews = 50000, niche = '') {
    const sn = searchItem.snippet || detailItem?.snippet || {};
    const st = detailItem?.statistics || {};
    const cd = detailItem?.contentDetails || {};
    const videoId = searchItem.id?.videoId || detailItem?.id || '';
    const chanId  = sn.channelId || '';
    const views   = parseInt(st.viewCount || 0);
    const avgV    = channelAvgViews > 100 ? channelAvgViews : 50000;
    const dur     = parseDuration(cd.duration);
    const mult    = Math.max(0.05, +(views / avgV).toFixed(2));
    const resolvedNiche = niche || guessNiche(sn.title || '', sn.channelTitle || '');

    return {
      id:          'yt:' + (videoId || Math.random().toString(36).slice(2)),
      ytId:        videoId,
      title:       sn.title || 'Untitled',
      channel:     sn.channelTitle?.replace(/\s+/g, '') || chanId,
      channelName: sn.channelTitle || 'Unknown',
      channelId:   chanId,
      niche:       resolvedNiche,
      subs:        0,  // filled in separately
      views,
      avgViews:    avgV,
      multiplier:  mult,
      length:      dur.str,
      lengthSec:   dur.sec,
      ago:         toAgo(sn.publishedAt),
      agoDays:     agoDays(toAgo(sn.publishedAt)),
      format:      'YouTube video',
      thumbStyle:  0,
      colors:      window.chanColor ? window.chanColor(chanId || videoId) : ['#3b82f6', '#1e3a8a'],
      thumbnail:   sn.thumbnails?.maxres?.url || sn.thumbnails?.high?.url || sn.thumbnails?.medium?.url || '',
      isReal:      true,
    };
  }

  // ─── High-level: fetch outlier feed ───────────────────────────────────────
  async function fetchOutlierFeed(query, { maxResults = 20 } = {}) {
    // 1. Search (100 units)
    const searchRes = await searchVideos(query, { maxResults, order: 'viewCount' });
    const items     = searchRes.items || [];
    if (!items.length) return [];

    // 2. Video details batch (1 unit per 50)
    const videoIds  = items.map(i => i.id?.videoId).filter(Boolean);
    const details   = await getVideoDetails(videoIds);
    const detailMap = {};
    details.forEach(d => { detailMap[d.id] = d; });

    // 3. Channel stats batch (1 unit per 50 channels)
    const chanIds  = [...new Set(items.map(i => i.snippet?.channelId).filter(Boolean))];
    const chanMap  = await getChannelsBatch(chanIds);

    // 4. Build internal objects
    return items.map(item => {
      const videoId = item.id?.videoId;
      const chanId  = item.snippet?.channelId;
      const ch      = chanMap[chanId];
      const detail  = detailMap[videoId];
      const subs    = parseInt(ch?.statistics?.subscriberCount || 0);
      const totV    = parseInt(ch?.statistics?.viewCount || 0);
      const vidCnt  = parseInt(ch?.statistics?.videoCount || 1);
      const avgViews = vidCnt > 0 ? Math.round(totV / vidCnt) : Math.max(1000, Math.round(subs * 0.05));
      const niche   = guessNiche(item.snippet?.title || '', item.snippet?.channelTitle || '');
      const v       = buildVideo(item, detail, avgViews, niche);
      v.subs        = subs;
      v.channel     = ch?.snippet?.customUrl?.replace('@', '') || item.snippet?.channelTitle?.replace(/\s+/g, '') || chanId;
      v.channelName = ch?.snippet?.title || item.snippet?.channelTitle || 'Unknown';
      return v;
    });
  }

  // ─── High-level: fetch channel + its videos ───────────────────────────────
  async function fetchChannelWithVideos(channelId, maxVideos = 20) {
    const [ch, searchRes] = await Promise.all([
      getChannel(channelId),
      getChannelVideos(channelId, maxVideos),
    ]);
    if (!ch) return null;

    const subs    = parseInt(ch.statistics?.subscriberCount || 0);
    const totV    = parseInt(ch.statistics?.viewCount || 0);
    const vidCnt  = parseInt(ch.statistics?.videoCount || 1);
    const avgViews = Math.round(totV / vidCnt) || Math.round(subs * 0.05);

    const items   = searchRes?.items || [];
    const videoIds = items.map(i => i.id?.videoId).filter(Boolean);
    const details  = await getVideoDetails(videoIds);
    const detailMap = {};
    details.forEach(d => { detailMap[d.id] = d; });

    const niche = guessNiche(ch.snippet?.title || '', ch.snippet?.description || '');
    const videos = items.map(item => {
      const v  = buildVideo(item, detailMap[item.id?.videoId], avgViews, niche);
      v.subs   = subs;
      v.channelName = ch.snippet?.title || 'Unknown';
      v.channel = ch.snippet?.customUrl?.replace('@', '') || ch.snippet?.title?.replace(/\s+/g, '') || channelId;
      return v;
    });

    return {
      handle:     ch.snippet?.customUrl?.replace('@', '') || channelId,
      channelId,
      name:       ch.snippet?.title || 'Unknown',
      subs,
      niche,
      avgViews,
      thumbnail:  ch.snippet?.thumbnails?.high?.url || '',
      description: ch.snippet?.description || '',
      colors:     window.chanColor ? window.chanColor(channelId) : ['#3b82f6', '#1e3a8a'],
      videos,
    };
  }

  // ─── Gemini: raw generate ──────────────────────────────────────────────────
  async function generate(prompt, { temperature = 0.85, maxTokens = 1024, json = false } = {}) {
    if (!Keys.hasGemini()) throw Object.assign(new Error('No Gemini API key'), { code: 'NO_KEY' });
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    };
    if (json) body.generationConfig.responseMimeType = 'application/json';
    const res = await fetch(`${GM_BASE}?key=${Keys.gemini}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${res.status}`;
      if (res.status === 400) throw Object.assign(new Error(msg), { code: 'BAD_KEY' });
      if (res.status === 429) throw Object.assign(new Error(msg), { code: 'QUOTA' });
      throw Object.assign(new Error(msg), { code: 'AI_ERR' });
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  // ─── Gemini: thumbnail analysis (text-based, image optional) ──────────────
  async function analyzeThumb({ title, niche, thumbUrl, channelName }) {
    const prompt = `You are an expert YouTube thumbnail analyst. Analyze the thumbnail for this video:

Title: "${title}"
Channel: ${channelName || 'Unknown'}
Niche: ${niche}
${thumbUrl ? `Thumbnail URL: ${thumbUrl}` : ''}

Provide a detailed analysis as JSON with this EXACT structure:
{
  "scores": {
    "face_emotion": <0-100>,
    "color_contrast": <0-100>,
    "hook_clarity": <0-100>,
    "curiosity_gap": <0-100>,
    "title_sync": <0-100>,
    "mobile_legibility": <0-100>,
    "ctr_estimate": <0-100>,
    "avg_view_duration": <0-100>
  },
  "overall": <0-100>,
  "why_it_works": "<2-3 specific sentences about what makes this work>",
  "risk": "<1-2 sentences about weaknesses or risks>",
  "try_next": "<1-2 actionable specific improvements>",
  "title_rewrites": [
    { "title": "<rewritten title 1>", "ctr_lift": "+XX%" },
    { "title": "<rewritten title 2>", "ctr_lift": "+XX%" },
    { "title": "<rewritten title 3>", "ctr_lift": "+XX%" }
  ],
  "annotations": [
    { "x": <0-90>, "y": <0-90>, "label": "<what this thumbnail element does>", "side": "r" },
    { "x": <0-90>, "y": <0-90>, "label": "<what this thumbnail element does>", "side": "l" }
  ]
}`;

    const text = await generate(prompt, { json: true, maxTokens: 1200 });
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  // ─── Gemini: generate video ideas ─────────────────────────────────────────
  async function generateIdeas({ niche, topic, count = 12, blend = 20, myVideos = [], competitorVideos = [] }) {
    const myTitles   = myVideos.slice(0, 6).map(v => `- ${v.title}`).join('\n');
    const compTitles = competitorVideos.slice(0, 6).map(v => `- ${v.title} (@${v.channel}, ${v.multiplier?.toFixed(1)}x)`).join('\n');
    const crossRatio = Math.round(blend);

    const prompt = `You are a YouTube content strategist for a ${niche} creator.

Their channel's recent videos:
${myTitles || '(not provided)'}

Competitor top performers:
${compTitles || '(not provided)'}

Topic focus: "${topic || niche}"
Generate ${count} video ideas — ${100 - crossRatio}% pure ${niche} niche, ${crossRatio}% borrowing formats from OTHER niches applied to ${niche}.

Each idea must be SPECIFIC and immediately actionable — not generic. Include exact numbers, specifics, angles.

Respond ONLY with a valid JSON array (no markdown):
[
  {
    "text": "<specific, clickable video title>",
    "tag": "from your niche",
    "tagColor": "#a3ff3b",
    "source": "<what pattern/channel inspired this>",
    "score": <65-96>
  }
]

For cross-niche ideas, use:
    "tag": "borrowed from <NicheName>",
    "tagColor": "#facc15"`;

    const text = await generate(prompt, { json: true, maxTokens: 2048, temperature: 0.95 });
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  // ─── Gemini: generate titles ───────────────────────────────────────────────
  async function generateTitles({ niche, topic, count = 8, blend = 20, myVideos = [], competitorVideos = [] }) {
    const myTitles   = myVideos.slice(0, 5).map(v => `- "${v.title}" (${v.multiplier?.toFixed(1)}x)`).join('\n');
    const compTitles = competitorVideos.slice(0, 5).map(v => `- "${v.title}" (@${v.channel})`).join('\n');

    const prompt = `You are a YouTube title specialist. The creator's niche is ${niche}.

Their best performing titles:
${myTitles || '(not provided)'}

Competitor titles:
${compTitles || '(not provided)'}

Topic: "${topic || niche}"

Write ${count} title variations for this topic. Each must:
- Be immediately clickable and specific
- Use proven patterns (numbers, curiosity gaps, emotional hooks)
- Vary the format — don't repeat the same structure

Respond ONLY with valid JSON (no markdown):
[
  {
    "text": "<specific title>",
    "tag": "your-channel pattern",
    "tagColor": "#a3ff3b",
    "source": "<what pattern this mirrors>",
    "score": <68-96>
  }
]

For cross-niche borrowed patterns, use tagColor "#facc15" and tag "borrowed pattern".`;

    const text = await generate(prompt, { json: true, maxTokens: 1024, temperature: 0.9 });
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  // ─── Gemini: generate thumbnail concepts ──────────────────────────────────
  async function generateThumbnailConcepts({ niche, topic, count = 6, blend = 20, competitorVideos = [], refs = [] }) {
    const compInfo = competitorVideos.slice(0, 4).map(v => `- "${v.title}" (${v.multiplier?.toFixed(1)}x)`).join('\n');
    const refInfo  = refs.map(r => `- ${r.kind}: ${r.name}`).join('\n');

    const prompt = `You are a YouTube thumbnail designer for a ${niche} creator.

Topic: "${topic || niche}"
Top competitors in this niche:
${compInfo || '(not provided)'}
${refs.length ? `\nReference images uploaded by creator:\n${refInfo}` : ''}

Design ${count} specific thumbnail concepts. Be VERY specific — describe exact colors, layout, text, expressions, props.

Respond ONLY with valid JSON (no markdown):
[
  {
    "text": "<Detailed thumbnail description: specific colors, layout, text placement, expressions, visual elements>",
    "tag": "your-niche recipe",
    "tagColor": "#a3ff3b",
    "source": "<what winning pattern this is based on>"
  }
]

For cross-niche ideas (${Math.round(blend)}% of results), use tagColor "#facc15" and tag "borrowed from <Niche>".`;

    const text = await generate(prompt, { json: true, maxTokens: 1024, temperature: 0.9 });
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  // ─── Gemini: discovery mashup ideas ───────────────────────────────────────
  async function generateDiscoveryIdeas({ niche, videoA, videoB }) {
    const prompt = `You are a YouTube strategist. Fuse these two hit video concepts into one new idea for a ${niche} creator.

Video A: "${videoA.title}" — ${videoA.multiplier?.toFixed(1)}x outlier in ${videoA.niche}
Video B: "${videoB.title}" — ${videoB.multiplier?.toFixed(1)}x outlier in ${videoB.niche}

Create 1 mashup video idea that:
- Combines the best hooks from both
- Works for a ${niche} audience
- Is immediately actionable

Respond with just the video title/concept as plain text (1-2 sentences max).`;

    return generate(prompt, { temperature: 0.95, maxTokens: 200 });
  }

  // ─── Test connections ──────────────────────────────────────────────────────
  async function testYouTube() {
    const data = await ytFetch('videos', { part: 'snippet', id: 'dQw4w9WgXcQ', maxResults: 1 });
    return !!(data.items?.length);
  }
  async function testGemini() {
    const text = await generate('Say "ok" and nothing else.', { maxTokens: 10 });
    return text.toLowerCase().includes('ok');
  }

  // ─── Expose ────────────────────────────────────────────────────────────────
  window.TubeAPI = {
    Keys,
    guessNiche,
    buildVideo,
    toAgo,
    agoDays,
    parseDuration,

    // YouTube
    searchVideos,
    getVideoDetails,
    getChannel,
    getChannelsBatch,
    getChannelVideos,
    searchChannels,
    fetchOutlierFeed,
    fetchChannelWithVideos,

    // Gemini
    generate,
    analyzeThumb,
    generateIdeas,
    generateTitles,
    generateThumbnailConcepts,
    generateDiscoveryIdeas,

    // Utils
    testYouTube,
    testGemini,
    clearCache() {
      Object.keys(localStorage)
        .filter(k => k.startsWith('ta$'))
        .forEach(k => localStorage.removeItem(k));
    },
  };
}());
