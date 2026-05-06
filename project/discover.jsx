// Discovery Lab — crawls smaller channels, lifts unrelated formats into your niche,
// suggests mashups + 10x rewrites of existing big videos.
const { Avatar, Outlier, Thumb, Icons, Sparkline, fmtNum, classNames, VideoGrid } = window;

function DiscoverPage({ onOpenVideo, onOpenChannel, bookmarks, toggleBookmark, myChannel, trackers }) {
  const [tab, setTab] = useState("breakouts");
  const [crawling, setCrawling] = useState(false);
  const [crawlStep, setCrawlStep] = useState(0);

  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myNiche = myCh?.niche;
  const myFormats = useMemo(()=> Array.from(new Set(window.VIDEOS.filter(v=>v.channel===myChannel).map(v=>v.format))), [myChannel]);
  const trackedSet = useMemo(()=> new Set(trackers.flatMap(t=>t.channels)), [trackers]);

  // Adjacency for "related but unexplored"
  const adjacency = {
    "Tech":["AI","Crypto","Productivity","Finance"],
    "AI":["Tech","Productivity","Education"],
    "Crypto":["Tech","Finance"],
    "Finance":["Productivity","Crypto","Education"],
    "Cooking":["DIY","Vlog"],
    "DIY":["Cooking","Cars","Tech"],
    "Horror":["Comedy","Vlog"],
    "Vlog":["Comedy","Travel","Horror","Cooking"],
    "Education":["Science","Productivity","Finance"],
    "Gaming":["Tech","Comedy"],
    "Cars":["DIY","Tech"],
    "Beauty":["Vlog","DIY"],
    "Comedy":["Horror","Vlog"],
    "Productivity":["AI","Tech","Education","Finance"],
    "Travel":["Vlog","Cooking"],
    "Science":["Education","Tech"],
  };
  const adjNiches = adjacency[myNiche] || [];

  // ---------- BREAKOUTS: small channels with high outliers, in niche or adjacent
  const breakouts = useMemo(()=>{
    const byChannel = new Map();
    window.VIDEOS.forEach(v=>{
      if (v.channel === myChannel) return;
      if (trackedSet.has(v.channel)) return; // already tracking
      const ch = window.CHANNELS.find(c=>c.handle===v.channel);
      if (!ch) return;
      if (ch.subs > 250000) return; // smaller channels only
      const isRelated = ch.niche === myNiche || adjNiches.includes(ch.niche);
      if (!isRelated) return;
      if (v.multiplier < 2.5) return;
      const cur = byChannel.get(v.channel) || { ch, videos: [], topMult: 0 };
      cur.videos.push(v);
      cur.topMult = Math.max(cur.topMult, v.multiplier);
      byChannel.set(v.channel, cur);
    });
    return Array.from(byChannel.values()).sort((a,b)=>b.topMult-a.topMult).slice(0, 8);
  }, [myChannel, myNiche, trackedSet]);

  // ---------- TRANSPLANTS: high-performing formats from OUTSIDE your niche
  const transplants = useMemo(()=>{
    return window.TRENDING_FORMATS
      .filter(f => !f.niches.includes(myNiche)) // outside your niche
      .map(f => {
        // best video example of this format
        const examples = window.VIDEOS.filter(v=> f.niches.includes(v.niche) && v.multiplier >= 2).sort((a,b)=>b.multiplier-a.multiplier);
        const top = examples[0];
        // build a transplant idea
        const transplantIdea = transplantTitle(f, myNiche, top);
        const why = `Format averages ${f.growth} growth in ${f.niches.join("/")}. No major ${myNiche} channel has tried it yet — first-mover window estimated 4–6 weeks.`;
        const projected = top ? Math.round(top.multiplier * (0.5 + Math.random()*0.4)*10)/10 : 2.4;
        return { format: f, top, transplantIdea, why, projected };
      })
      .sort((a,b)=>parseInt(b.format.growth)-parseInt(a.format.growth))
      .slice(0, 6);
  }, [myNiche]);

  // ---------- MASHUPS: combine 2 high-performing ideas
  const mashups = useMemo(()=>{
    // pick top videos: one from your niche, one from adjacent niche
    const inNiche = window.VIDEOS.filter(v=>v.niche===myNiche).sort((a,b)=>b.multiplier-a.multiplier).slice(0,8);
    const adjacent = window.VIDEOS.filter(v=>adjNiches.includes(v.niche)).sort((a,b)=>b.multiplier-a.multiplier).slice(0,8);
    const out = [];
    for (let i=0; i<6 && i<inNiche.length && i<adjacent.length; i++) {
      const a = inNiche[i];
      const b = adjacent[(i*3)%adjacent.length];
      out.push({
        a, b,
        idea: mashupIdea(a, b, myNiche),
        confidence: Math.round((a.multiplier + b.multiplier) * 12),
      });
    }
    return out;
  }, [myNiche]);

  // ---------- 10x REWRITES: take an existing big-channel hit and propose a sized-up version
  const rewrites = useMemo(()=>{
    const candidates = window.VIDEOS.filter(v => (v.niche===myNiche || adjNiches.includes(v.niche)) && v.multiplier >= 2 && v.channel !== myChannel)
      .sort((a,b)=>b.views-a.views).slice(0, 6);
    return candidates.map(v => ({
      original: v,
      tenx: tenxTitle(v.title),
      angle: tenxAngle(v.title),
      lift: Math.round((1.5 + Math.random()*1.2)*10)/10,
    }));
  }, [myNiche]);

  function startCrawl() {
    setCrawling(true); setCrawlStep(0);
    const steps = ["Seeding from your channel…", "Walking comment graph…", "Scraping recommended sidebars…", "Filtering for outlier signal…", "Cross-referencing format library…", "Done."];
    let i = 0;
    const tick = ()=>{
      i++; setCrawlStep(i);
      if (i < steps.length) setTimeout(tick, 420);
      else setTimeout(()=>setCrawling(false), 600);
    };
    setTimeout(tick, 420);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Discovery Lab</h1>
          <p className="page-sub">A crawler that walks outward from your channel — comment graphs, recommended sidebars, related searches — looking for breakout signal you haven't caught yet. Then it remixes what it finds into ideas built for <strong style={{color:"var(--fg)"}}>@{myChannel}</strong>.</p>
        </div>
        <button className="btn btn-primary" onClick={startCrawl} disabled={crawling}>
          <Icons.Sparkle size={14}/> {crawling ? "Crawling…" : "Run new crawl"}
        </button>
      </div>

      {crawling && (
        <div className="score-card" style={{marginBottom: 22, background: "color-mix(in oklch, var(--accent) 6%, var(--bg-1))"}}>
          <div style={{display:"flex", alignItems:"center", gap: 10}}>
            <div className="crawl-spinner"></div>
            <div>
              <div className="mono" style={{fontSize:11, color:"var(--accent)", textTransform:"uppercase", letterSpacing:".1em"}}>Crawler running</div>
              <div style={{fontSize:14, marginTop:2}}>
                {["Seeding from your channel…","Walking comment graph…","Scraping recommended sidebars…","Filtering for outlier signal…","Cross-referencing format library…","Done."][Math.min(crawlStep,5)]}
              </div>
            </div>
            <div style={{flex:1}}></div>
            <div className="mono" style={{fontSize:12, color:"var(--fg-mute)"}}>{Math.min(crawlStep,5)}/5</div>
          </div>
          <div className="crawl-progress"><div style={{width: `${(crawlStep/5)*100}%`}}></div></div>
        </div>
      )}

      <div style={{display:"flex", gap:6, marginBottom: 18, flexWrap:"wrap"}}>
        <button className={classNames("chip", tab==="breakouts" && "chip-accent active")} onClick={()=>setTab("breakouts")}>
          <Icons.Compass size={12}/> Breakout creators · {breakouts.length}
        </button>
        <button className={classNames("chip", tab==="transplants" && "chip-accent active")} onClick={()=>setTab("transplants")}>
          ✦ Format transplants · {transplants.length}
        </button>
        <button className={classNames("chip", tab==="mashups" && "chip-accent active")} onClick={()=>setTab("mashups")}>
          ⚡ Idea mashups · {mashups.length}
        </button>
        <button className={classNames("chip", tab==="10x" && "chip-accent active")} onClick={()=>setTab("10x")}>
          ↑ 10x rewrites · {rewrites.length}
        </button>
      </div>

      {tab === "breakouts" && <BreakoutsTab breakouts={breakouts} onOpenChannel={onOpenChannel} onOpenVideo={onOpenVideo} bookmarks={bookmarks} toggleBookmark={toggleBookmark}/>}
      {tab === "transplants" && <TransplantsTab transplants={transplants} myNiche={myNiche} onOpenVideo={onOpenVideo}/>}
      {tab === "mashups" && <MashupsTab mashups={mashups} onOpenVideo={onOpenVideo}/>}
      {tab === "10x" && <RewritesTab rewrites={rewrites} onOpenVideo={onOpenVideo}/>}
    </div>
  );
}
window.DiscoverPage = DiscoverPage;

/* ======================= TAB: BREAKOUTS ======================= */
function BreakoutsTab({ breakouts, onOpenChannel, onOpenVideo, bookmarks, toggleBookmark }) {
  return (
    <>
      <div style={{fontSize:13, color:"var(--fg-mute)", marginBottom: 14, padding:"12px 14px", border:"1px dashed var(--line)", borderRadius: 10}}>
        Smaller channels (under 250K subs) in your niche or adjacent niches that posted a 2.5x+ outlier in the last 30 days. <strong style={{color:"var(--fg)"}}>Copy them before they blow up.</strong>
      </div>
      {breakouts.length === 0 && <div className="empty">No breakouts surfaced yet — try expanding your trackers or running a new crawl.</div>}
      <div style={{display:"grid", gridTemplateColumns:"1fr", gap: 14}}>
        {breakouts.map(({ ch, videos, topMult }) => (
          <div key={ch.handle} className="breakout-card">
            <div className="breakout-head">
              <Avatar handle={ch.handle} size={48}/>
              <div style={{flex:1, minWidth: 0}}>
                <div style={{display:"flex", alignItems:"center", gap: 8}}>
                  <div style={{fontSize:16, fontWeight:600, cursor:"pointer"}} onClick={()=>onOpenChannel(ch.handle)}>@{ch.handle}</div>
                  <span className="chip" style={{fontSize:10, padding:"2px 8px"}}>{ch.niche}</span>
                  <span className="mono" style={{fontSize:11, color:"var(--fg-dim)"}}>{fmtNum(ch.subs)} subs</span>
                </div>
                <div style={{fontSize: 12.5, color:"var(--fg-mute)", marginTop: 4}}>
                  {ch.bio || `Breakout signal: posted ${videos.length} video${videos.length>1?"s":""} above 2.5x recently. Top performer hit ${topMult.toFixed(1)}x.`}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <Outlier m={topMult} size="lg"/>
                <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", marginTop: 4}}>peak outlier</div>
              </div>
              <button className="btn btn-primary" onClick={()=>onOpenChannel(ch.handle)}>View →</button>
            </div>
            <div className="breakout-vids">
              {videos.slice(0,3).map(v=>(
                <div key={v.id} className="breakout-vid" onClick={()=>onOpenVideo(v)}>
                  <div className="breakout-thumb"><Thumb video={v}/></div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:500, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>{v.title}</div>
                    <div style={{display:"flex", gap:8, alignItems:"center", marginTop: 6}}>
                      <Outlier m={v.multiplier}/>
                      <span className="mono" style={{fontSize:11, color:"var(--fg-dim)"}}>{fmtNum(v.views)} views · {v.ago}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ======================= TAB: TRANSPLANTS ======================= */
function TransplantsTab({ transplants, myNiche, onOpenVideo }) {
  return (
    <>
      <div style={{fontSize:13, color:"var(--fg-mute)", marginBottom: 14, padding:"12px 14px", border:"1px dashed var(--line)", borderRadius: 10}}>
        High-performing formats from <strong style={{color:"var(--fg)"}}>outside</strong> {myNiche} that nobody in your niche has tried yet. Be first.
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(420px, 1fr))", gap: 16}}>
        {transplants.map(({ format, top, transplantIdea, why, projected }) => (
          <div key={format.id} className="transplant-card">
            <div className="transplant-flow">
              <div className="transplant-from">
                <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", letterSpacing:".1em", textTransform:"uppercase"}}>From</div>
                <div style={{fontSize:13, fontWeight:600, marginTop: 2}}>{format.niches[0]}</div>
                <div style={{fontSize:11, color:"var(--fg-mute)", marginTop:4}}>"{format.name}"</div>
                {top && (
                  <div style={{display:"flex", alignItems:"center", gap:6, marginTop: 8, cursor:"pointer"}} onClick={()=>onOpenVideo(top)}>
                    <div style={{position:"relative", width: 36, height: 20, borderRadius: 3, overflow:"hidden", flexShrink:0}}><Thumb video={top}/></div>
                    <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>@{top.channel} · {top.multiplier.toFixed(1)}x</div>
                  </div>
                )}
              </div>
              <div className="transplant-arrow">
                <Icons.Arrow size={20}/>
                <div className="mono" style={{fontSize:9, color:"var(--accent)", marginTop:4, fontWeight:700, letterSpacing:".05em"}}>{format.growth}</div>
              </div>
              <div className="transplant-to">
                <div className="mono" style={{fontSize:10, color:"var(--accent)", letterSpacing:".1em", textTransform:"uppercase"}}>To {myNiche}</div>
                <div style={{fontSize:13, fontWeight:600, marginTop: 2, lineHeight: 1.3}}>{transplantIdea}</div>
              </div>
            </div>
            <div className="transplant-why">{why}</div>
            <div className="transplant-foot">
              <div>
                <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", textTransform:"uppercase", letterSpacing:".08em"}}>projected outlier</div>
                <div className="mono" style={{fontSize: 22, fontWeight: 700, color:"var(--accent)", marginTop: 2}}>{projected}x</div>
              </div>
              <button className="btn btn-primary"><Icons.Bookmark size={12}/> Save idea</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ======================= TAB: MASHUPS ======================= */
function MashupsTab({ mashups, onOpenVideo }) {
  return (
    <>
      <div style={{fontSize:13, color:"var(--fg-mute)", marginBottom: 14, padding:"12px 14px", border:"1px dashed var(--line)", borderRadius: 10}}>
        Two existing high-performers, fused into one new idea. The math: when both source videos hit hard, the combination usually inherits both audiences.
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr", gap: 16}}>
        {mashups.map((m, i) => (
          <div key={i} className="mashup-card">
            <div className="mashup-grid">
              <div className="mashup-source" onClick={()=>onOpenVideo(m.a)}>
                <div className="mashup-thumb"><Thumb video={m.a}/></div>
                <div style={{flex:1, minWidth:0}}>
                  <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", textTransform:"uppercase"}}>Idea A · {m.a.niche}</div>
                  <div style={{fontSize:13, fontWeight:500, marginTop:2, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>{m.a.title}</div>
                  <Outlier m={m.a.multiplier}/>
                </div>
              </div>
              <div className="mashup-plus">
                <div className="mashup-plus-circle">+</div>
              </div>
              <div className="mashup-source" onClick={()=>onOpenVideo(m.b)}>
                <div className="mashup-thumb"><Thumb video={m.b}/></div>
                <div style={{flex:1, minWidth:0}}>
                  <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", textTransform:"uppercase"}}>Idea B · {m.b.niche}</div>
                  <div style={{fontSize:13, fontWeight:500, marginTop:2, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>{m.b.title}</div>
                  <Outlier m={m.b.multiplier}/>
                </div>
              </div>
            </div>
            <div className="mashup-result">
              <div style={{flex:1}}>
                <div className="mono" style={{fontSize:10, color:"var(--accent)", letterSpacing:".1em", textTransform:"uppercase"}}>= Mashup</div>
                <div style={{fontSize:16, fontWeight:600, marginTop: 4, lineHeight: 1.35}}>{m.idea}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", textTransform:"uppercase"}}>confidence</div>
                <div className="mono" style={{fontSize:22, fontWeight:700, color:"var(--accent)"}}>{m.confidence}<span style={{fontSize:11, color:"var(--fg-mute)"}}>/100</span></div>
              </div>
              <button className="btn btn-primary"><Icons.Bookmark size={12}/> Save</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ======================= TAB: 10X REWRITES ======================= */
function RewritesTab({ rewrites, onOpenVideo }) {
  return (
    <>
      <div style={{fontSize:13, color:"var(--fg-mute)", marginBottom: 14, padding:"12px 14px", border:"1px dashed var(--line)", borderRadius: 10}}>
        Take a video that already won. Now imagine the version with the stakes turned up 10x — bigger number, longer duration, harder constraint. Same audience, fresh hook.
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr", gap: 14}}>
        {rewrites.map(({ original, tenx, angle, lift }, i) => (
          <div key={i} className="rewrite-card">
            <div className="rewrite-original" onClick={()=>onOpenVideo(original)}>
              <div className="rewrite-thumb"><Thumb video={original}/></div>
              <div style={{flex:1, minWidth: 0}}>
                <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", textTransform:"uppercase", letterSpacing:".08em"}}>Original · @{original.channel} · {fmtNum(original.views)} views</div>
                <div style={{fontSize:14, fontWeight:500, marginTop: 4, lineHeight:1.35}}>{original.title}</div>
                <Outlier m={original.multiplier}/>
              </div>
            </div>
            <div className="rewrite-arrow">
              <div className="rewrite-arrow-line"></div>
              <div className="rewrite-arrow-tag">10x →</div>
            </div>
            <div className="rewrite-new">
              <div style={{flex:1}}>
                <div className="mono" style={{fontSize:10, color:"var(--accent)", textTransform:"uppercase", letterSpacing:".08em"}}>Sized-up version</div>
                <div style={{fontSize:16, fontWeight:600, marginTop: 4, lineHeight:1.3}}>{tenx}</div>
                <div style={{fontSize:12, color:"var(--fg-mute)", marginTop: 8, lineHeight: 1.5}}><strong style={{color:"var(--fg)"}}>Angle:</strong> {angle}</div>
              </div>
              <div style={{textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8}}>
                <div>
                  <div className="mono" style={{fontSize:10, color:"var(--fg-dim)", textTransform:"uppercase"}}>predicted lift</div>
                  <div className="mono" style={{fontSize:22, fontWeight:700, color:"var(--accent)"}}>{lift}x<span style={{fontSize:11, color:"var(--fg-mute)"}}> orig.</span></div>
                </div>
                <button className="btn btn-primary"><Icons.Bookmark size={12}/> Save</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ======================= IDEA-GENERATION HELPERS ======================= */
function transplantTitle(format, niche, topVideo) {
  const t = format.name;
  if (t.includes("POV:")) return `POV: You walked in on the ${niche.toLowerCase()} disaster nobody talks about`;
  if (t.includes("$1 vs")) return `$1 ${niche} setup vs $1,000 ${niche} setup`;
  if (t.includes("read every")) return `I read every ${niche.toLowerCase()} blog post for a year so you don't have to`;
  if (t.includes("just killed")) return `This new tool just killed every ${niche.toLowerCase()} workflow`;
  if (t.includes("24 hours")) return `24 hours doing nothing but ${niche.toLowerCase()} — what broke me`;
  if (t.includes("worst-to-best")) return `Every ${niche.toLowerCase()} tool/method, ranked worst to best`;
  if (t.includes("documentary")) return `The mini-documentary about ${niche.toLowerCase()} that YouTube wasn't ready for`;
  if (t.includes("Whisper")) return `(whispered) the ${niche.toLowerCase()} secret nobody is saying out loud`;
  return `${t} — but for ${niche}`;
}
function mashupIdea(a, b, niche) {
  const tokA = pick(a.title);
  const tokB = pick(b.title);
  const templates = [
    `${tokA} meets ${tokB} — the ${niche.toLowerCase()} crossover nobody asked for (but everyone needs)`,
    `What if you took "${trim(a.title)}" and applied "${trim(b.title)}"? I tried it.`,
    `${tokA} × ${tokB}: the ${niche.toLowerCase()} experiment that shouldn't have worked`,
  ];
  return templates[(a.id.charCodeAt(0)+b.id.charCodeAt(0)) % templates.length];
}
function tenxTitle(orig) {
  // bump numbers, bump durations, harden constraints
  let t = orig;
  t = t.replace(/(\d+)\s*(days?|hours?|weeks?|months?)/i, (m, n, u) => `${parseInt(n)*10} ${u}`);
  t = t.replace(/(\d+)/, (m, n) => `${parseInt(n)*10}`);
  if (t === orig) t = `I Did "${trim(orig)}" — But For 10x Longer`;
  return t;
}
function tenxAngle(orig) {
  const angles = [
    "Same idea, longer duration. Endurance content compounds — viewers stay for the punishment.",
    "Bigger number in the title triggers a higher curiosity ceiling without changing the format.",
    "Same hook but with a harder constraint — converts the same audience plus the 'is this even possible' crowd.",
    "Sized-up version makes it shareable as a 'wait, what?' clip on Shorts/TikTok, doubling top-of-funnel.",
  ];
  return angles[orig.length % angles.length];
}
function pick(s) { const w = s.split(/\s+/); return w.slice(0, Math.min(3, w.length)).join(" "); }
function trim(s) { return s.length>40 ? s.slice(0,37)+"…" : s; }
