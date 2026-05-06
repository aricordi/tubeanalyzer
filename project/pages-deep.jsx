// Video deep-dive, Trending Formats, Thumbnail Winners, Generators, Bookmarks
const { Avatar, Outlier, Thumb, Icons, Sparkline, fmtNum, classNames, VideoGrid, VideoSkeletons, Spinner } = window;
const { useState, useEffect, useMemo, useRef } = React;

/* ── helpers ── */
function scoreHash(v, k) {
  let h = 0;
  const id = v.id || '';
  for (let i = 0; i < id.length; i++) h = (h * 23 + id.charCodeAt(i)) | 0;
  h = (h + (k.charCodeAt(0) || 0) * 7) | 0;
  return 50 + Math.abs(h) % 50;
}

/* ======================= VIDEO DEEP DIVE ======================= */
function VideoPage({ video, onBack, onOpenChannel, onOpenVideo, bookmarks, toggleBookmark }) {
  const [variant, setVariant] = useState(0);
  const variants = [video, ...window.VIDEOS.filter(v => v.channel === video.channel && v.id !== video.id).slice(0, 2)];
  const cur = variants[variant];

  // AI analysis state
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisErr, setAnalysisErr] = useState('');

  useEffect(() => {
    setAnalysis(null); setAnalysisErr('');
    if (!window.TubeAPI?.Keys?.hasGemini()) return;
    let active = true;
    setAnalyzing(true);
    window.TubeAPI.analyzeThumb({
      title: cur.title,
      niche: cur.niche,
      thumbUrl: cur.thumbnail || '',
      channelName: cur.channelName || cur.channel,
    }).then(r => {
      if (active) { setAnalysis(r); setAnalyzing(false); }
    }).catch(e => {
      if (active) { setAnalysisErr(e.message); setAnalyzing(false); }
    });
    return () => { active = false; };
  }, [cur.id]);

  // Score rows — real or fallback
  const scoreKeys = [
    ['face_emotion', 'Face / emotion'],
    ['color_contrast', 'Color contrast'],
    ['hook_clarity', 'Hook clarity'],
    ['curiosity_gap', 'Curiosity gap'],
    ['title_sync', 'Title sync'],
    ['mobile_legibility', 'Mobile legibility'],
  ];
  const scores = scoreKeys.map(([key, label]) => ({
    label,
    val: analysis?.scores?.[key] ?? scoreHash(cur, key[0]),
  }));
  const avgScore = analysis?.overall ?? Math.round(scores.reduce((a, s) => a + s.val, 0) / scores.length);

  // Annotations — real or fallback
  const annotations = analysis?.annotations || [
    { x: 18, y: 22, label: 'Big yellow text creates focal point', side: 'r' },
    { x: 78, y: 70, label: 'Reaction circle anchors emotion', side: 'l' },
    { x: 50, y: 55, label: 'Negative space draws eye through', side: 'r' },
  ];

  // Insights — real or fallback
  const insights = analysis
    ? [
        { kind: 'Why it works', color: 'var(--accent)', body: analysis.why_it_works },
        { kind: 'Risk', color: 'var(--hot-4)', body: analysis.risk },
        { kind: 'Try next', color: 'var(--accent)', body: analysis.try_next },
      ].filter(i => i.body)
    : [
        { kind: 'Why it works', color: 'var(--accent)', body: `Aggressive composition typical of high-performing ${cur.niche} videos. Title and image agree on the curiosity gap.` },
        { kind: 'Risk', color: 'var(--hot-4)', body: 'Mobile crop may hide edge elements. Check how it looks at thumbnail size on a phone.' },
        { kind: 'Try next', color: 'var(--accent)', body: `Swap the text tag for a single number to test whether specificity outperforms imperative hooks in ${cur.niche}.` },
      ];

  // Title rewrites — real or fallback
  const titleRewrites = analysis?.title_rewrites?.length
    ? [{ title: cur.title, ctr_lift: 'original' }, ...analysis.title_rewrites.slice(0, 2)]
    : [
        { title: cur.title, ctr_lift: 'original' },
        { title: `I Tried ${cur.title.split(' ').slice(0, 4).join(' ')} for 30 Days`, ctr_lift: '+18% predicted CTR' },
        { title: `The Truth About ${cur.title.split(' ').slice(-3).join(' ')}`, ctr_lift: '+9% predicted CTR' },
      ];

  const comparable = useMemo(() => window.VIDEOS.filter(v => v.format === cur.format && v.id !== cur.id).slice(0, 4), [cur]);

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 18 }}><Icons.Back size={14}/> Back</button>
      <div className="deep-grid">
        <div>
          <div className="deep-thumb-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, color: "var(--fg-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>Thumbnail · AI annotated</div>
                {analyzing && <Spinner size={14}/>}
                {analysis && !analyzing && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>✦ Gemini</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {variants.map((v, i) => (
                  <button key={v.id} onClick={() => setVariant(i)}
                    className={classNames("chip", i === variant && "chip-accent active")} style={{ fontSize: 11 }}>
                    {i === 0 ? "This video" : `Variant ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="deep-thumb-frame">
              <Thumb video={cur}/>
              {annotations.map((a, i) => (
                <React.Fragment key={i}>
                  <div className="thumb-marker" style={{ left: `calc(${a.x}% - 12px)`, top: `calc(${a.y}% - 12px)` }}></div>
                  <div className="thumb-anno" style={{
                    left: a.side === "r" ? `calc(${a.x}% + 18px)` : "auto",
                    right: a.side === "l" ? `calc(${100 - a.x}% + 18px)` : "auto",
                    top: `calc(${a.y}% - 10px)`, maxWidth: 220,
                  }}>{a.label}</div>
                </React.Fragment>
              ))}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "18px 0 0", lineHeight: 1.25, letterSpacing: "-.015em" }}>{cur.title}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, color: "var(--fg-mute)", fontSize: 13 }}>
              <Avatar handle={cur.channel}/>
              <span style={{ cursor: "pointer" }} onClick={() => onOpenChannel(cur.channelId || cur.channel)}>@{cur.channel}</span>
              <span>·</span><span>{fmtNum(cur.subs || 0)} subs</span>
              <span>·</span><span>{cur.ago}</span>
              <span>·</span><span className="mono">{cur.length}</span>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
              <Outlier m={cur.multiplier} size="lg"/>
              <div className="mono" style={{ color: "var(--fg-mute)", fontSize: 13, alignSelf: "center" }}>
                {fmtNum(cur.views)} views vs {fmtNum(cur.avgViews)} channel avg
              </div>
            </div>
          </div>

          <div className="score-card" style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="section-title">Title rewrites</div>
              {analyzing && <Spinner size={14}/>}
            </div>
            {titleRewrites.map((r, i) => (
              <div key={i} className="gen-out" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>{r.title}</div>
                <div className="mono" style={{ fontSize: 11, color: i === 0 ? "var(--fg-dim)" : "var(--accent)" }}>
                  {r.ctr_lift}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="score-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="section-title">AI thumbnail breakdown</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {analyzing && <Spinner size={16}/>}
                <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--accent)" }}>
                  {avgScore}<span style={{ fontSize: 14, color: "var(--fg-mute)" }}>/100</span>
                </div>
              </div>
            </div>
            {!window.TubeAPI?.Keys?.hasGemini() && (
              <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 6 }}>
                Add a Gemini API key in Settings for real AI analysis.
              </div>
            )}
            {analysisErr && (
              <div style={{ fontSize: 12, color: 'var(--hot-3)', marginTop: 6 }}>
                AI error: {analysisErr}
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              {scores.map(s => (
                <div key={s.label} className="score-row">
                  <div style={{ flex: "0 0 160px", fontSize: 13, color: "var(--fg-mute)" }}>{s.label}</div>
                  <div className="score-bar"><div style={{ width: s.val + "%" }}></div></div>
                  <div className="score-val">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="score-card" style={{ marginTop: 22 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>Insights</div>
            {insights.map((ins, i) => (
              <div key={i} style={{ padding: "14px 0", borderBottom: i < insights.length - 1 ? "1px dashed var(--line)" : "0" }}>
                <div className="mono" style={{ fontSize: 11, color: ins.color, textTransform: "uppercase", letterSpacing: ".1em" }}>{ins.kind}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5, marginTop: 4, color: "var(--fg)" }}>{ins.body}</div>
              </div>
            ))}
          </div>

          <div className="score-card" style={{ marginTop: 22 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>Detected format</div>
            <div className="chip chip-accent active mono" style={{ display: "inline-flex" }}>{cur.format || 'YouTube video'}</div>
            <div style={{ fontSize: 13, color: "var(--fg-mute)", marginTop: 12 }}>
              This format averages <strong style={{ color: "var(--fg)" }}>2.4x</strong> across {comparable.length + 12} other videos in {cur.niche}. Trending up over 30 days.
            </div>
          </div>
        </div>
      </div>

      {comparable.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 32 }}>
            <div className="section-title">Same format, ranked</div>
            <div className="section-link mono">{comparable.length} compared</div>
          </div>
          <VideoGrid videos={comparable} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
        </>
      )}
    </div>
  );
}
window.VideoPage = VideoPage;

/* ======================= TRENDING FORMATS ======================= */
function TrendingFormatsPage({ onOpenVideo, onOpenChannel, bookmarks, toggleBookmark, myChannel, trackers }) {
  const [activeFmt, setActiveFmt] = useState(window.TRENDING_FORMATS[0].id);
  const [nicheFilter, setNicheFilter] = useState("All");
  const [sortBy, setSortBy] = useState("growth");
  const [fitOnly, setFitOnly] = useState(false);

  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myNiche = myCh?.niche;
  const myFormats = useMemo(()=>{
    const used = new Set(window.VIDEOS.filter(v=>v.channel===myChannel).map(v=>v.format));
    return Array.from(used);
  }, [myChannel]);

  const formatsWithFit = useMemo(()=>{
    return window.TRENDING_FORMATS.map(f => ({
      ...f,
      fit: window.formatFit(f.id, myNiche, myFormats),
      growthN: parseInt(f.growth)
    }));
  }, [myNiche, myFormats]);

  const filtered = useMemo(()=>{
    let list = formatsWithFit.slice();
    if (nicheFilter !== "All") list = list.filter(f => f.niches.includes(nicheFilter));
    if (fitOnly) list = list.filter(f => f.fit >= 50);
    if (sortBy === "growth") list.sort((a,b)=>b.growthN-a.growthN);
    else if (sortBy === "videos") list.sort((a,b)=>b.videos-a.videos);
    else if (sortBy === "fit") list.sort((a,b)=>b.fit-a.fit);
    return list;
  }, [formatsWithFit, nicheFilter, sortBy, fitOnly]);

  const recommended = useMemo(()=> formatsWithFit.slice().sort((a,b)=>b.fit-a.fit).slice(0,3), [formatsWithFit]);

  const fmt = window.TRENDING_FORMATS.find(f=>f.id===activeFmt);

  // Fetch real YouTube videos matching the selected format's name as a search query
  const [apiMatching, setApiMatching] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchingErr, setMatchingErr] = useState('');
  const matchingFetchRef = useRef(0);

  useEffect(() => {
    if (!window.TubeAPI?.Keys?.hasYt() || !fmt) {
      setApiMatching(null);
      return;
    }
    const fetchId = ++matchingFetchRef.current;
    setMatchingLoading(true);
    setMatchingErr('');
    // Strip placeholder parts in brackets/parens for a cleaner search query
    const query = fmt.name.replace(/\[.*?\]|\(.*?\)/g, '').trim();
    window.TubeAPI.fetchOutlierFeed(query, { maxResults: 20 })
      .then(videos => {
        if (matchingFetchRef.current !== fetchId) return;
        setApiMatching(videos);
        setMatchingLoading(false);
      })
      .catch(err => {
        if (matchingFetchRef.current !== fetchId) return;
        setMatchingErr(err.message);
        setMatchingLoading(false);
      });
  }, [activeFmt, fmt]);

  const matching = useMemo(()=>{
    if (apiMatching && apiMatching.length) {
      return apiMatching.slice().sort((a,b)=>b.multiplier-a.multiplier).slice(0,12);
    }
    return window.VIDEOS.filter(v=> fmt.niches.includes(v.niche)).sort((a,b)=>b.multiplier-a.multiplier).slice(0,8);
  }, [apiMatching, activeFmt]);

  function fitColor(s) {
    if (s>=70) return "var(--accent)";
    if (s>=50) return "#facc15";
    if (s>=30) return "#f97316";
    return "var(--fg-dim)";
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trending formats</h1>
          <p className="page-sub">Format = the structural pattern of a video. When it pops in one niche it usually pops in adjacent ones first. We score every format against <strong style={{color:"var(--fg)"}}>@{myChannel}</strong> based on niche overlap and what you already do.</p>
        </div>
        <div className="chip chip-accent active mono">Updated {window.NOW}</div>
      </div>

      {/* Recommended for you */}
      <div className="score-card" style={{marginBottom: 24, background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 8%, var(--bg-1)), var(--bg-1))"}}>
        <div style={{display:"flex", alignItems:"center", gap:10, marginBottom: 14}}>
          <Icons.Sparkle size={16} style={{color:"var(--accent)"}}/>
          <div className="section-title">Recommended for your style</div>
          <div className="mono" style={{fontSize:11, color:"var(--fg-dim)", marginLeft:"auto"}}>based on @{myChannel} · {myNiche}</div>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap: 12}}>
          {recommended.map(f => (
            <button key={f.id} className="format-card" onClick={()=>setActiveFmt(f.id)} style={{padding: 16, textAlign:"left", cursor:"pointer", borderColor: f.id===activeFmt?"var(--accent)":"var(--line)"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8}}>
                <div style={{fontSize:14, fontWeight:600, lineHeight: 1.3}}>{f.name}</div>
                <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end"}}>
                  <div className="mono" style={{fontSize:18, fontWeight:700, color: fitColor(f.fit)}}>{f.fit}</div>
                  <div className="mono" style={{fontSize:10, color:"var(--fg-dim)"}}>fit</div>
                </div>
              </div>
              <div style={{fontSize:12, color:"var(--fg-mute)", marginTop: 8}}>{f.growth} this week</div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="filterbar" style={{marginBottom: 18}}>
        <select value={nicheFilter} onChange={(e)=>setNicheFilter(e.target.value)} className="chip" style={{appearance:"none", cursor:"pointer", paddingRight: 24}}>
          {["All", ...window.NICHES].map(n=> <option key={n} value={n}>{n==="All"?"All niches":n}</option>)}
        </select>
        <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="chip" style={{appearance:"none", cursor:"pointer", paddingRight: 24}}>
          <option value="growth">Sort: Growth</option>
          <option value="videos">Sort: Video count</option>
          <option value="fit">Sort: Fit for you</option>
        </select>
        <button className={classNames("chip", fitOnly && "chip-accent active")} onClick={()=>setFitOnly(s=>!s)}>
          ✨ Fit ≥ 50
        </button>
        <div style={{flex:1}}></div>
        <div className="mono" style={{fontSize:12, color:"var(--fg-dim)"}}>{filtered.length} formats</div>
      </div>

      <div style={{display:"grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28}}>
        {filtered.map(f => {
          const isActive = f.id===activeFmt;
          const spark = Array.from({length:12}, (_,i)=> Math.sin(i/2 + f.id.charCodeAt(1))*8 + 20 + i*1.4);
          return (
            <button key={f.id} className="format-card" onClick={()=>setActiveFmt(f.id)} style={{
              borderColor: isActive ? "var(--accent)" : "var(--line)",
              background: isActive ? "color-mix(in oklch, var(--accent) 6%, var(--bg-1))" : "var(--bg-1)",
              textAlign: "left", cursor:"pointer", width:"100%"
            }}>
              <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12}}>
                <div>
                  <div className="mono" style={{fontSize:11, color:"var(--fg-dim)", textTransform:"uppercase", letterSpacing:".1em"}}>Format</div>
                  <div style={{fontSize: 17, fontWeight: 600, marginTop: 4, lineHeight: 1.3}}>{f.name}</div>
                </div>
                <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4}}>
                  <div className="format-growth">{f.growth}</div>
                  <div className="mono" style={{fontSize:10, color: fitColor(f.fit), fontWeight:700}}>FIT {f.fit}</div>
                </div>
              </div>
              <div style={{marginTop: 10, fontSize: 12.5, color:"var(--fg-mute)"}}>{f.example}</div>
              <div style={{marginTop: 14, display:"flex", gap: 6, flexWrap:"wrap"}}>
                {f.niches.map(n=> <span key={n} className="chip" style={{fontSize:11, padding:"3px 8px", background: n===myNiche?"color-mix(in oklch, var(--accent) 15%, var(--bg-2))":"var(--bg-2)"}}>{n}</span>)}
              </div>
              <div style={{marginTop: 14}}>
                <Sparkline data={spark} h={36}/>
              </div>
              <div style={{display:"flex", justifyContent:"space-between", marginTop: 8, fontSize:12, color:"var(--fg-dim)"}}>
                <span className="mono">{f.videos} videos this week</span>
                <span style={{color: "var(--accent)"}}>{isActive?"selected":"see examples →"}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="section-head">
        <div className="section-title">
          Top videos using "{fmt.name}"
          {apiMatching && !matchingLoading && (
            <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 11 }}>● LIVE</span>
          )}
        </div>
        <div className="section-link mono">
          {matchingLoading ? 'fetching from YouTube…' : `${matching.length} examples`}
        </div>
      </div>
      {matchingErr && (
        <div style={{ background: 'var(--hot-3)22', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--hot-3)' }}>
          ⚠ YouTube API: {matchingErr} — showing sample data instead.
        </div>
      )}
      {matchingLoading && !apiMatching ? <VideoSkeletons count={6}/> :
        <VideoGrid videos={matching} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
      }
    </div>
  );
}
window.TrendingFormatsPage = TrendingFormatsPage;

/* ======================= THUMBNAIL WINNERS ======================= */
function ThumbnailWinnersPage({ onOpenVideo, onOpenChannel, bookmarks, toggleBookmark }) {
  const [niche, setNiche] = useState("All");
  const winners = useMemo(()=>{
    let v = window.VIDEOS.filter(v=>v.multiplier >= 2);
    if (niche !== "All") v = v.filter(x=>x.niche===niche);
    return v.sort((a,b)=>b.multiplier-a.multiplier).slice(0,12);
  }, [niche]);
  const recipes = [
    { title: "The Yellow-tag formula", body: "Single bold yellow tag + reaction circle in lower-right + face on left. Used by 6 of the top 10 horror outliers this week." },
    { title: "Negative-space VS", body: "Centered VS, two contrasting subjects. Performs especially well when paired with a numerical comparison in the title." },
    { title: "Cropped-face curiosity", body: "Zoom past the eyes, full mouth, 60% of frame. Triggers identity ambiguity; converts on titles starting with 'who'." },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thumbnail winners</h1>
          <p className="page-sub">The thumbnail recipes actually winning per niche, broken down by what's doing the work — and which patterns to steal next.</p>
        </div>
        <select value={niche} onChange={(e)=>setNiche(e.target.value)} className="chip" style={{padding:"7px 14px", fontSize:13, appearance:"none", cursor:"pointer"}}>
          {["All", ...window.NICHES].map(n => <option key={n} value={n}>{n==="All"?"All niches":n}</option>)}
        </select>
      </div>
      <div className="section-head"><div className="section-title">Winning recipes</div></div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 28}}>
        {recipes.map((r,i)=>(
          <div key={i} className="metric">
            <div className="mono" style={{fontSize:11, color:"var(--fg-dim)", letterSpacing:".1em", textTransform:"uppercase"}}>Recipe #{i+1}</div>
            <div style={{fontSize: 17, fontWeight: 600, marginTop: 4}}>{r.title}</div>
            <div style={{fontSize: 13, color:"var(--fg-mute)", marginTop: 10, lineHeight: 1.5}}>{r.body}</div>
          </div>
        ))}
      </div>
      <div className="section-head"><div className="section-title">Top thumbnails</div><div className="section-link mono">multiplier ≥ 2.0x</div></div>
      <VideoGrid videos={winners} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
    </div>
  );
}
window.ThumbnailWinnersPage = ThumbnailWinnersPage;

/* GeneratorPage moved to generators.jsx */


/* ======================= BOOKMARKS ======================= */
function BookmarksPage({ bookmarks, toggleBookmark, onOpenVideo, onOpenChannel, videoCache }) {
  const bookmarkSet = new Set(bookmarks);
  const videos = useMemo(() => {
    const fromMock  = window.VIDEOS.filter(v => bookmarkSet.has(v.id));
    const fromCache = (videoCache || []).filter(v => bookmarkSet.has(v.id) && !fromMock.some(m => m.id === v.id));
    return [...fromMock, ...fromCache];
  }, [bookmarks, videoCache]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookmarks</h1>
          <p className="page-sub">Your saved outliers, ready for the next deep dive.</p>
        </div>
        {videos.length > 0 && (
          <div className="chip mono">{videos.length} saved</div>
        )}
      </div>
      {videos.length === 0 ? (
        <div className="empty">No bookmarks yet. Hover any video card and click the bookmark icon to save it here.</div>
      ) : (
        <VideoGrid videos={videos} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
      )}
    </div>
  );
}
window.BookmarksPage = BookmarksPage;
