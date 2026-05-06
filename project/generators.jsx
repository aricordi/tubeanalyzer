// Generators — Idea (infinite scroll + optional thumb visualizations) + Title + Thumbnail (image upload)
const { Avatar, Icons, fmtNum, classNames } = window;

/* ============ FAKE THUMB RENDERER (for idea visualization) ============ */
function ConceptThumb({ concept, idx }) {
  // Deterministic colors from concept hash
  const seed = (concept || "").split("").reduce((a,c)=>(a*31+c.charCodeAt(0))|0, idx);
  const palettes = [
    ["#1a1a1a", "#fbbf24", "#ef4444"],   // black/yellow/red
    ["#0c1f33", "#f97316", "#fef3c7"],   // navy/orange
    ["#1f1147", "#a78bfa", "#fbbf24"],   // purple/yellow
    ["#0f172a", "#22d3ee", "#f43f5e"],   // dark/cyan
    ["#3a0a0a", "#ef4444", "#fff"],      // red/white
    ["#052e16", "#bef264", "#fef9c3"],   // green/lime
  ];
  const p = palettes[Math.abs(seed) % palettes.length];
  const big = (concept.match(/\b(\d+|\$\w+|10x|VS|TRIED|TRUTH|WHY|HOW|EVERY|NEVER|FIRST|LAST|FREE|BEST|WORST|KILL|BROKE|SECRET|HACK|NEW|24|30|100)\b/i) || [concept.split(" ")[0]])[0].toUpperCase().slice(0, 9);
  const small = concept.split(" ").slice(0,4).join(" ").toUpperCase();
  const variant = Math.abs(seed) % 4;

  return (
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" style={{width:"100%", height:"100%", display:"block"}}>
      <defs>
        <linearGradient id={`g${idx}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p[0]}/>
          <stop offset="1" stopColor={p[1]} stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#g${idx})`}/>

      {variant === 0 && (
        <>
          <circle cx="240" cy="100" r="58" fill={p[1]} opacity="0.85"/>
          <circle cx="80" cy="80" r="36" fill={p[2]} opacity="0.6"/>
          <text x="20" y="48" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="46" fill={p[1]}>{big}</text>
          <text x="20" y="160" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="14" fill="#fff" opacity="0.85">{small}</text>
        </>
      )}
      {variant === 1 && (
        <>
          <rect x="0" y="60" width="160" height="60" fill={p[1]} opacity="0.88"/>
          <text x="14" y="105" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="40" fill={p[0]}>{big}</text>
          <circle cx="240" cy="120" r="42" fill={p[2]} opacity="0.7"/>
          <text x="14" y="150" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="13" fill="#fff" opacity="0.85">{small}</text>
        </>
      )}
      {variant === 2 && (
        <>
          <text x="160" y="100" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="64" fill={p[1]}>{big}</text>
          <line x1="20" y1="135" x2="300" y2="135" stroke={p[2]} strokeWidth="3"/>
          <text x="160" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="13" fill="#fff" opacity="0.85">{small}</text>
        </>
      )}
      {variant === 3 && (
        <>
          <rect x="0" y="0" width="160" height="180" fill={p[1]} opacity="0.18"/>
          <rect x="160" y="0" width="160" height="180" fill={p[2]} opacity="0.18"/>
          <text x="160" y="90" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="900" fontSize="36" fill={p[1]}>VS</text>
          <text x="80" y="50" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="22" fill="#fff">{big}</text>
          <text x="160" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="11" fill="#fff" opacity="0.8">{small}</text>
        </>
      )}
    </svg>
  );
}
window.ConceptThumb = ConceptThumb;

/* ============ TRAINING PANEL (shared) ============ */
function TrainingPanel({ myChannel, setMyChannel, trackers, selectedTrackers, setSelectedTrackers, blend, setBlend, myVideos, competitorVideos, trackedChannels, myNiche }) {
  return (
    <div className="gen-card" style={{maxWidth: "none", marginBottom: 22}}>
      <div className="adv-label" style={{marginBottom: 10}}>Training data</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 18}}>
        <div>
          <div style={{fontSize:12, color:"var(--fg-mute)", marginBottom: 8}}>Your channel</div>
          <select className="gen-input" value={myChannel} onChange={(e)=>setMyChannel(e.target.value)}>
            {window.CHANNELS.map(c=> <option key={c.handle} value={c.handle}>@{c.handle} · {c.niche} · {fmtNum(c.subs)}</option>)}
          </select>
          <div style={{fontSize:12, color:"var(--fg-dim)", marginTop:8}}>
            Trained on {myVideos.length} videos · top format: <span className="mono" style={{color:"var(--fg)"}}>{myVideos[0]?.format||"—"}</span>
          </div>
        </div>
        <div>
          <div style={{fontSize:12, color:"var(--fg-mute)", marginBottom: 8}}>Competitor trackers</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
            {trackers.map(t => (
              <button key={t.id} onClick={()=>setSelectedTrackers(s=> s.includes(t.id)?s.filter(x=>x!==t.id):[...s,t.id])}
                className={classNames("chip", selectedTrackers.includes(t.id) && "chip-accent active")}>
                <Icons.Folder size={12}/> {t.name} ({t.channels.length})
              </button>
            ))}
            {trackers.length===0 && <span style={{fontSize:12, color:"var(--fg-dim)"}}>No trackers — create some on the Trackers page.</span>}
          </div>
          <div style={{fontSize:12, color:"var(--fg-dim)", marginTop:8}}>
            Trained on {competitorVideos.length} competitor videos across {trackedChannels.length} channels
          </div>
        </div>
      </div>
      <div style={{marginTop: 18}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", gap: 12, flexWrap:"wrap"}}>
          <div style={{fontSize:12, color:"var(--fg-mute)", whiteSpace:"nowrap"}}>Niche blend</div>
          <div className="mono" style={{fontSize:12, color:"var(--fg)"}}>{blend===0?"100% your niche":blend===100?"100% cross-niche":`${100-blend}% your niche · ${blend}% cross-niche`}</div>
        </div>
        <input type="range" min="0" max="100" step="5" value={blend} onChange={(e)=>setBlend(+e.target.value)}
          style={{width:"100%", marginTop: 8, accentColor:"var(--accent)"}}/>
        <div style={{display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--fg-dim)", marginTop:4}}>
          <span>Pure {myNiche}</span>
          <span>Remix from outside</span>
        </div>
      </div>
    </div>
  );
}

/* ============ IDEA GENERATOR — infinite scroll + thumb toggle ============ */
function IdeaGeneratorPage({ myChannel, setMyChannel, trackers }) {
  const [topic, setTopic] = useState("");
  const [withThumbs, setWithThumbs] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(0);
  const [selectedTrackers, setSelectedTrackers] = useState(()=> trackers.map(t=>t.id));
  const [blend, setBlend] = useState(20);
  const [savedGen, setSavedGen] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("ta_generated")) || []; } catch(e) { return []; }
  });
  useEffect(()=>{ localStorage.setItem("ta_generated", JSON.stringify(savedGen)); }, [savedGen]);

  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myNiche = myCh?.niche;
  const trackedChannels = useMemo(()=>{
    const set = new Set();
    trackers.filter(t=>selectedTrackers.includes(t.id)).forEach(t=>t.channels.forEach(c=>set.add(c)));
    return Array.from(set);
  }, [selectedTrackers, trackers]);
  const competitorVideos = useMemo(()=> window.VIDEOS.filter(v=>trackedChannels.includes(v.channel)), [trackedChannels]);
  const myVideos = useMemo(()=> window.VIDEOS.filter(v=>v.channel===myChannel), [myChannel]);

  function generateBatch(s) {
    const t = topic || myNiche;
    const inNicheVids = competitorVideos.filter(v=>v.niche===myNiche);
    const outFormats = window.TRENDING_FORMATS.filter(f=>!f.niches.includes(myNiche));
    const adjVids = window.VIDEOS.filter(v=>v.niche!==myNiche).sort((a,b)=>b.multiplier-a.multiplier);
    const out = [];
    const N = 12;
    for (let i=0; i<N; i++) {
      const idx = s + i;
      const cross = Math.random()*100 < blend;
      let item;
      if (cross) {
        const f = outFormats[(idx*7)%Math.max(1,outFormats.length)];
        const ref = adjVids[(idx*3)%Math.max(1,adjVids.length)];
        item = {
          id: `i_${idx}`,
          text: transplantTitle(f, myNiche, t),
          tag: `borrowed from ${f?.niches[0] || "other niches"}`,
          tagColor: "#facc15",
          source: f ? `${f.growth} growth · inspired by @${ref?.channel}` : "cross-niche transfer",
          score: 60 + (idx%30),
        };
      } else {
        const ref = inNicheVids[(idx*5)%Math.max(1,inNicheVids.length)] || myVideos[idx%Math.max(1,myVideos.length)];
        item = {
          id: `i_${idx}`,
          text: nativeIdea(t, myNiche, ref?.format || "ranked best to worst", idx),
          tag: "from your niche",
          tagColor: "var(--accent)",
          source: ref ? `inspired by @${ref.channel} · ${ref.multiplier?.toFixed(1)||"1.0"}x` : `pattern from @${myChannel}`,
          score: 70 + (idx%25),
        };
      }
      out.push(item);
    }
    return out;
  }

  function reset() {
    setLoading(true);
    setTimeout(()=>{
      const fresh = generateBatch(0);
      setItems(fresh);
      setSeed(fresh.length);
      setLoading(false);
    }, 500);
  }

  function loadMore() {
    setLoading(true);
    setTimeout(()=>{
      const more = generateBatch(seed);
      setItems(prev => [...prev, ...more]);
      setSeed(s => s + more.length);
      setLoading(false);
    }, 400);
  }

  // Auto-load first batch
  useEffect(()=>{
    if (items.length === 0) reset();
  }, []);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);
  useEffect(()=>{
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries)=>{
      if (entries[0].isIntersecting && !loading && items.length > 0 && items.length < 96) {
        loadMore();
      }
    }, { rootMargin: "400px" });
    obs.observe(sentinelRef.current);
    return ()=> obs.disconnect();
  }, [loading, items.length, seed, blend, topic, myChannel]);

  function save(item) { setSavedGen(s=>[{ kind:"idea", ...item, ts: Date.now() }, ...s].slice(0,50)); }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Idea generator</h1>
          <p className="page-sub">An endless feed of ideas, scored and tagged by source. Toggle thumbnails on for instant visualization.</p>
        </div>
        <div className="chip mono">5 credits / 12 ideas</div>
      </div>

      <TrainingPanel
        myChannel={myChannel} setMyChannel={setMyChannel} trackers={trackers}
        selectedTrackers={selectedTrackers} setSelectedTrackers={setSelectedTrackers}
        blend={blend} setBlend={setBlend} myVideos={myVideos} competitorVideos={competitorVideos}
        trackedChannels={trackedChannels} myNiche={myNiche}
      />

      <div className="gen-card" style={{maxWidth:"none"}}>
        <div style={{display:"grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems:"end"}}>
          <div>
            <div className="adv-label">Anchor topic (optional)</div>
            <input className="gen-input" value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder={`e.g. self-hosted AI tools — leave blank for pure ${myNiche}`}/>
          </div>
          <button className={classNames("chip", withThumbs && "chip-accent active")} onClick={()=>setWithThumbs(s=>!s)} style={{height: 44}}>
            <Icons.Image size={14}/> Thumbnails {withThumbs?"on":"off"}
          </button>
          <button className="btn btn-primary" onClick={reset} style={{height: 44}}>
            <Icons.Sparkle size={14}/> Refresh feed
          </button>
        </div>
      </div>

      {/* Infinite feed */}
      <div className="idea-feed" data-thumbs={withThumbs?"on":"off"}>
        {items.map((o, i)=> (
          <IdeaCard key={o.id} item={o} idx={i} withThumb={withThumbs} onSave={()=>save(o)}/>
        ))}
      </div>

      <div ref={sentinelRef} style={{height: 1}}></div>

      <div style={{textAlign:"center", padding: "24px 0"}}>
        {loading && <div className="mono" style={{fontSize:12, color:"var(--fg-dim)"}}>generating more ideas…</div>}
        {!loading && items.length >= 96 && <div className="mono" style={{fontSize:12, color:"var(--fg-dim)"}}>that's a lot of ideas. refresh for a new batch ↑</div>}
        {!loading && items.length > 0 && items.length < 96 && (
          <button className="btn" onClick={loadMore}>Load more ideas</button>
        )}
      </div>

      {savedGen.filter(s=>s.kind==="idea").length > 0 && (
        <>
          <div className="section-head" style={{marginTop: 24}}><div className="section-title">Saved ideas</div><div className="section-link mono">{savedGen.filter(s=>s.kind==="idea").length}</div></div>
          <div className="gen-card" style={{maxWidth:"none"}}>
            {savedGen.filter(s=>s.kind==="idea").map((o,i)=>(
              <div key={i} className="gen-out" style={{display:"flex", alignItems:"center", gap:12}}>
                <div style={{flex:1, fontSize:13}}>{o.text}</div>
                <button className="btn-icon" style={{color:"var(--fg-dim)"}} onClick={()=>setSavedGen(s=>s.filter(x=>x.ts!==o.ts))}><Icons.X size={14}/></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
window.IdeaGeneratorPage = IdeaGeneratorPage;

function IdeaCard({ item, idx, withThumb, onSave }) {
  const [saved, setSaved] = useState(false);
  function doSave() { onSave(); setSaved(true); setTimeout(()=>setSaved(false), 1200); }
  return (
    <div className="idea-card">
      {withThumb && (
        <div className="idea-thumb"><ConceptThumb concept={item.text} idx={idx}/></div>
      )}
      <div className="idea-body">
        <div className="idea-text">{item.text}</div>
        <div style={{display:"flex", gap:8, alignItems:"center", marginTop: 8, flexWrap:"wrap"}}>
          <span className="mono" style={{fontSize:10, padding:"2px 8px", borderRadius:999, background:"color-mix(in oklch, "+item.tagColor+" 15%, var(--bg-1))", color: item.tagColor, textTransform:"uppercase", letterSpacing:".08em", fontWeight:700}}>{item.tag}</span>
          <span style={{fontSize:11, color:"var(--fg-dim)"}}>{item.source}</span>
        </div>
        <div className="idea-foot">
          <div className="mono" style={{fontSize:11, color:"var(--fg-dim)"}}>predicted CTR <span style={{color: "var(--accent)", fontWeight:700}}>{item.score}</span></div>
          <button className="btn-icon" onClick={doSave} title="Save" style={{color: saved?"var(--accent)":"var(--fg-dim)"}}>
            <Icons.Bookmark size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ TITLE GENERATOR ============ */
function TitleGeneratorPage({ myChannel, setMyChannel, trackers }) {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrackers, setSelectedTrackers] = useState(()=> trackers.map(t=>t.id));
  const [blend, setBlend] = useState(20);
  const [savedGen, setSavedGen] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("ta_generated")) || []; } catch(e) { return []; }
  });
  useEffect(()=>{ localStorage.setItem("ta_generated", JSON.stringify(savedGen)); }, [savedGen]);

  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myNiche = myCh?.niche;
  const trackedChannels = useMemo(()=>{
    const set = new Set();
    trackers.filter(t=>selectedTrackers.includes(t.id)).forEach(t=>t.channels.forEach(c=>set.add(c)));
    return Array.from(set);
  }, [selectedTrackers, trackers]);
  const competitorVideos = useMemo(()=> window.VIDEOS.filter(v=>trackedChannels.includes(v.channel)), [trackedChannels]);
  const myVideos = useMemo(()=> window.VIDEOS.filter(v=>v.channel===myChannel), [myChannel]);

  function generate() {
    setLoading(true);
    setTimeout(()=>{
      const t = topic || "your topic";
      const samples = [];
      const numItems = 8;
      const numCross = Math.round((blend/100) * numItems);
      const numNative = numItems - numCross;
      const myTopTitles = myVideos.slice(0,3).map(v=>v.title);
      const compTitles = competitorVideos.slice(0,3).map(v=>v.title);
      const nativeTpl = [
        `I Tried ${t} for 30 Days — Here's What Broke`,
        `The Truth About ${t} (No One in ${myNiche} Will Tell You)`,
        `Why Everyone in ${myNiche} Is Wrong About ${t}`,
        `${t}: Ranked Worst to Best`,
        `I Spent 100 Hours on ${t} So You Don't Have To`,
      ];
      const crossTpl = [
        `${t} — But I Did It With $0 Budget`,
        `I Lived ${t} for 7 Days (And It Almost Broke Me)`,
        `The ${t} Method That's Killing It in 2026`,
        `Nobody Talks About This ${t} Loophole`,
        `The Hidden Side of ${t} They Don't Want You to See`,
      ];
      for (let i=0;i<numNative;i++) samples.push({ text: nativeTpl[i%nativeTpl.length], tag: "your-channel pattern", tagColor: "var(--accent)", source: `mirrors "${myTopTitles[i%Math.max(1,myTopTitles.length)]?.slice(0,40)||"your top video"}…"`, score: 72+(i%20) });
      for (let i=0;i<numCross;i++) samples.push({ text: crossTpl[i%crossTpl.length], tag: "borrowed pattern", tagColor: "#facc15", source: `from "${compTitles[i%Math.max(1,compTitles.length)]?.slice(0,40)||"competitor"}…"`, score: 65+(i%25) });
      setOut(samples);
      setLoading(false);
    }, 600);
  }

  function save(item) { setSavedGen(s=>[{ kind:"title", ...item, ts: Date.now() }, ...s].slice(0,50)); }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Title generator</h1>
          <p className="page-sub">Title patterns from your top-performing videos blended with what's working on your competitors.</p>
        </div>
        <div className="chip mono">5 credits per gen</div>
      </div>

      <TrainingPanel
        myChannel={myChannel} setMyChannel={setMyChannel} trackers={trackers}
        selectedTrackers={selectedTrackers} setSelectedTrackers={setSelectedTrackers}
        blend={blend} setBlend={setBlend} myVideos={myVideos} competitorVideos={competitorVideos}
        trackedChannels={trackedChannels} myNiche={myNiche}
      />

      <div className="gen-card" style={{maxWidth:"none"}}>
        <div className="adv-label">What's your video about?</div>
        <input className="gen-input" value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. setting up Ollama on a Pi"/>
        <button className="btn btn-primary" style={{marginTop: 14}} onClick={generate} disabled={loading}>
          <Icons.Sparkle size={14}/> {loading?"Training on your data…":"Generate titles"}
        </button>
        {out.length > 0 && (
          <div style={{marginTop: 22}}>
            <div className="adv-label" style={{marginBottom: 10}}>Results</div>
            {out.map((o,i)=>(
              <div key={i} className="gen-out" style={{display:"flex", alignItems:"flex-start", gap:12}}>
                <div className="mono" style={{color:"var(--fg-dim)", fontSize:11, minWidth: 24, paddingTop:2}}>{String(i+1).padStart(2,"0")}</div>
                <div style={{flex:1}}>
                  <div style={{lineHeight: 1.45, fontSize: 14, fontWeight: 500}}>{o.text}</div>
                  <div style={{display:"flex", gap:8, alignItems:"center", marginTop:6, flexWrap:"wrap"}}>
                    <span className="mono" style={{fontSize:10, padding:"2px 8px", borderRadius:999, background:"color-mix(in oklch, "+o.tagColor+" 15%, var(--bg-1))", color: o.tagColor, textTransform:"uppercase", letterSpacing:".08em", fontWeight:700}}>{o.tag}</span>
                    <span style={{fontSize:11, color:"var(--fg-dim)"}}>{o.source}</span>
                    <span className="mono" style={{fontSize:11, color:"var(--accent)", marginLeft:"auto", fontWeight:700}}>CTR {o.score}</span>
                  </div>
                </div>
                <button className="btn-icon" style={{color:"var(--fg-dim)"}} onClick={()=>save(o)}><Icons.Bookmark size={14}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {savedGen.filter(s=>s.kind==="title").length > 0 && (
        <>
          <div className="section-head" style={{marginTop: 24}}><div className="section-title">Saved titles</div></div>
          <div className="gen-card" style={{maxWidth:"none"}}>
            {savedGen.filter(s=>s.kind==="title").map((o,i)=>(
              <div key={i} className="gen-out" style={{display:"flex", alignItems:"center", gap:12}}>
                <div style={{flex:1, fontSize:13}}>{o.text}</div>
                <button className="btn-icon" style={{color:"var(--fg-dim)"}} onClick={()=>setSavedGen(s=>s.filter(x=>x.ts!==o.ts))}><Icons.X size={14}/></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
window.TitleGeneratorPage = TitleGeneratorPage;

/* ============ THUMBNAIL GENERATOR — image upload (face/inspiration/character refs) ============ */
function ThumbGeneratorPage({ myChannel, setMyChannel, trackers }) {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrackers, setSelectedTrackers] = useState(()=> trackers.map(t=>t.id));
  const [blend, setBlend] = useState(20);
  const [refs, setRefs] = useState([]); // {id, kind, url, name}
  const fileInputRef = useRef(null);
  const [savedGen, setSavedGen] = useState(()=>{
    try { return JSON.parse(localStorage.getItem("ta_generated")) || []; } catch(e) { return []; }
  });
  useEffect(()=>{ localStorage.setItem("ta_generated", JSON.stringify(savedGen)); }, [savedGen]);

  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myNiche = myCh?.niche;
  const trackedChannels = useMemo(()=>{
    const set = new Set();
    trackers.filter(t=>selectedTrackers.includes(t.id)).forEach(t=>t.channels.forEach(c=>set.add(c)));
    return Array.from(set);
  }, [selectedTrackers, trackers]);
  const competitorVideos = useMemo(()=> window.VIDEOS.filter(v=>trackedChannels.includes(v.channel)), [trackedChannels]);
  const myVideos = useMemo(()=> window.VIDEOS.filter(v=>v.channel===myChannel), [myChannel]);

  function onPick(e, kind) {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRefs(r => [...r, { id: Math.random().toString(36).slice(2,8), kind, url: ev.target.result, name: f.name }]);
      };
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  }

  function removeRef(id) { setRefs(r => r.filter(x=>x.id!==id)); }

  function generate() {
    setLoading(true);
    setTimeout(()=>{
      const t = topic || "your topic";
      const numItems = 6;
      const numCross = Math.round((blend/100) * numItems);
      const numNative = numItems - numCross;
      const refSummary = refs.length ? ` • Using ${refs.length} ref${refs.length>1?"s":""} (${[...new Set(refs.map(r=>r.kind))].join(", ")})` : "";
      const native = [
        { text: `Big yellow "${t.split(" ")[0]?.toUpperCase()||"WHY"}!" tag · shocked face · red circle on the result`, tag: "your-niche recipe", tagColor: "var(--accent)" },
        { text: `Split frame: before / after · arrow · price tag overlay`, tag: "your-niche recipe", tagColor: "var(--accent)" },
        { text: `Numeric overlay (count) · centered subject · darkened background`, tag: "your-niche recipe", tagColor: "var(--accent)" },
        { text: `Hand-drawn arrow + circled object · raw warm tones`, tag: "your-niche recipe", tagColor: "var(--accent)" },
      ];
      const cross = [
        { text: `Whisper format from Horror: black bg, lowercase italic title, single eye in frame — applied to "${t}"`, tag: "borrowed from Horror", tagColor: "#facc15" },
        { text: `Tier list from Gaming: S-A-B-C-D ranks with thumbnail subjects sorted — applied to ${t}`, tag: "borrowed from Gaming", tagColor: "#facc15" },
        { text: `Mini-doc cold open from Education: letterboxed 2.39:1, serif title — applied to ${t}`, tag: "borrowed from Education", tagColor: "#facc15" },
      ];
      const samples = [];
      for (let i=0;i<numNative;i++) {
        const useFace = refs.find(r=>r.kind==="face");
        const useChar = refs.find(r=>r.kind==="character");
        const useInsp = refs.find(r=>r.kind==="inspiration");
        samples.push({
          ...native[i%native.length],
          source: `seen in @${trackedChannels[i%Math.max(1,trackedChannels.length)] || myChannel}'s thumbnails${refSummary}`,
          refUsed: useFace || useChar || useInsp,
          refTreatment: useFace ? "face-swapped from your upload" : useChar ? "character ref applied" : useInsp ? "color/style lifted from inspiration" : null,
        });
      }
      for (let i=0;i<numCross;i++) samples.push({ ...cross[i%cross.length], source: "cross-niche transfer" + refSummary });
      setOut(samples);
      setLoading(false);
    }, 700);
  }

  function save(item) { setSavedGen(s=>[{ kind:"thumb", ...item, ts: Date.now() }, ...s].slice(0,50)); }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thumbnail generator</h1>
          <p className="page-sub">Concepts grounded in your niche's winning recipes. Upload your face, character refs, or inspiration thumbnails to steer the output.</p>
        </div>
        <div className="chip mono">5 credits per gen</div>
      </div>

      <TrainingPanel
        myChannel={myChannel} setMyChannel={setMyChannel} trackers={trackers}
        selectedTrackers={selectedTrackers} setSelectedTrackers={setSelectedTrackers}
        blend={blend} setBlend={setBlend} myVideos={myVideos} competitorVideos={competitorVideos}
        trackedChannels={trackedChannels} myNiche={myNiche}
      />

      {/* Reference uploader */}
      <div className="gen-card" style={{maxWidth:"none", marginBottom: 22}}>
        <div className="adv-label" style={{marginBottom: 10}}>Reference images</div>
        <div className="ref-upload-row">
          <RefUploadButton kind="face" label="Face / self" sub="Swap into thumbnails" onPick={onPick}/>
          <RefUploadButton kind="character" label="Character" sub="Mascot, pet, persona" onPick={onPick}/>
          <RefUploadButton kind="inspiration" label="Inspiration" sub="Steal style/colors" onPick={onPick}/>
          <RefUploadButton kind="object" label="Object" sub="Product / scene" onPick={onPick}/>
        </div>
        {refs.length > 0 && (
          <div className="ref-grid">
            {refs.map(r => (
              <div key={r.id} className="ref-item">
                <img src={r.url} alt={r.name}/>
                <div className="ref-tag">{r.kind}</div>
                <button className="ref-remove" onClick={()=>removeRef(r.id)}><Icons.X size={12}/></button>
              </div>
            ))}
          </div>
        )}
        {refs.length === 0 && (
          <div style={{fontSize:12, color:"var(--fg-dim)", marginTop: 12, padding: "10px 14px", background:"var(--bg-2)", borderRadius: 8}}>
            💡 No refs yet. Drop a clean photo of yourself for face-swaps, your channel mascot for consistent character appearances, or a thumbnail you love so we lift its color/composition language.
          </div>
        )}
      </div>

      <div className="gen-card" style={{maxWidth:"none"}}>
        <div className="adv-label">Describe your video</div>
        <input className="gen-input" value={topic} onChange={(e)=>setTopic(e.target.value)} placeholder="e.g. five budget cameras under $500"/>
        <button className="btn btn-primary" style={{marginTop: 14}} onClick={generate} disabled={loading}>
          <Icons.Sparkle size={14}/> {loading?"Generating…":"Generate thumbnails"}
        </button>
        {out.length > 0 && (
          <div className="thumb-gen-grid">
            {out.map((o,i)=>(
              <div key={i} className="thumb-gen-card">
                <div className="thumb-gen-preview">
                  {o.refUsed ? (
                    <div style={{position:"relative", width:"100%", height:"100%"}}>
                      <ConceptThumb concept={o.text} idx={i}/>
                      <div className="thumb-gen-ref"><img src={o.refUsed.url} alt=""/></div>
                    </div>
                  ) : (
                    <ConceptThumb concept={o.text} idx={i}/>
                  )}
                </div>
                <div className="thumb-gen-body">
                  <div style={{fontSize:13, lineHeight: 1.4}}>{o.text}</div>
                  {o.refTreatment && <div style={{fontSize:11, color:"var(--accent)", marginTop:6, fontWeight:600}}>✦ {o.refTreatment}</div>}
                  <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
                    <span className="mono" style={{fontSize:10, padding:"2px 8px", borderRadius:999, background:"color-mix(in oklch, "+o.tagColor+" 15%, var(--bg-1))", color: o.tagColor, textTransform:"uppercase", letterSpacing:".08em", fontWeight:700}}>{o.tag}</span>
                    <button className="btn-icon" style={{color:"var(--fg-dim)", marginLeft:"auto"}} onClick={()=>save(o)}><Icons.Bookmark size={14}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {savedGen.filter(s=>s.kind==="thumb").length > 0 && (
        <>
          <div className="section-head" style={{marginTop: 24}}><div className="section-title">Saved thumbnails</div></div>
          <div className="gen-card" style={{maxWidth:"none"}}>
            {savedGen.filter(s=>s.kind==="thumb").map((o,i)=>(
              <div key={i} className="gen-out" style={{display:"flex", alignItems:"center", gap:12}}>
                <div style={{flex:1, fontSize:13}}>{o.text}</div>
                <button className="btn-icon" style={{color:"var(--fg-dim)"}} onClick={()=>setSavedGen(s=>s.filter(x=>x.ts!==o.ts))}><Icons.X size={14}/></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
window.ThumbGeneratorPage = ThumbGeneratorPage;

function RefUploadButton({ kind, label, sub, onPick }) {
  const ref = useRef(null);
  return (
    <>
      <button className="ref-upload" onClick={()=>ref.current?.click()}>
        <div className="ref-upload-icon"><Icons.Image size={20}/></div>
        <div>
          <div style={{fontSize:13, fontWeight:600}}>{label}</div>
          <div style={{fontSize:11, color:"var(--fg-dim)", marginTop:2}}>{sub}</div>
        </div>
      </button>
      <input ref={ref} type="file" accept="image/*" multiple style={{display:"none"}} onChange={(e)=>onPick(e, kind)}/>
    </>
  );
}

/* ============ helpers ============ */
function transplantTitle(format, niche, topic) {
  const base = topic && topic !== niche ? topic : niche.toLowerCase();
  if (!format) return `Apply a viral format to ${base}`;
  const t = format.name;
  if (t.includes("POV:")) return `POV: You walked in on the ${base} disaster nobody talks about`;
  if (t.includes("$1 vs")) return `$1 ${base} setup vs $1,000 ${base} setup`;
  if (t.includes("read every")) return `I read every ${base} blog post for a year so you don't have to`;
  if (t.includes("just killed")) return `This new tool just killed every ${base} workflow`;
  if (t.includes("24 hours")) return `24 hours doing nothing but ${base} — what broke me`;
  if (t.includes("worst-to-best")) return `Every ${base} method ranked worst to best`;
  if (t.includes("documentary")) return `The mini-documentary about ${base} that YouTube wasn't ready for`;
  if (t.includes("Whisper")) return `(whispered) the ${base} secret nobody is saying out loud`;
  return `${t} — but for ${base}`;
}
function nativeIdea(topic, niche, format, idx) {
  const variants = [
    `${topic}: ${format} edition — what your competitors haven't tried yet`,
    `The ${topic} setup that broke ${niche} Twitter`,
    `I rebuilt ${topic} from scratch — here's what changed`,
    `Why nobody in ${niche} is talking about ${topic} (and why they should)`,
    `${topic}, ranked: my honest tier list after a month`,
    `The ${topic} trick I stole from outside ${niche}`,
    `${topic} is broken. Here's how to fix it.`,
    `Three ${topic} mistakes I made so you don't have to`,
  ];
  return variants[idx % variants.length];
}
