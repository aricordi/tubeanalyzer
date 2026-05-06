// New features: Tracker Pattern Lab, Video Compare, Thumbnail Mockup
const { Avatar, Outlier, Thumb, Icons, Sparkline, fmtNum, classNames } = window;

/* ============================================================
   TRACKER PATTERN LAB
   A drop-in component appended to TrackerDetail.
   Shows what's actually working across the tracker: formats,
   characters/hooks, posting cadence, multiplier trend.
   ============================================================ */

// Lightweight character/hook classifier from titles
const HOOK_PATTERNS = [
  { id:"pov",      label:"POV / first-person",     test:/\bpov\b|\bi (tried|spent|built|lived|survived|ate)\b/i, color:"#ff8a3b" },
  { id:"vs",       label:"Versus / comparison",    test:/\bvs\b|\bvs\.\b|\$\d+\s*vs|cheap vs|worst.+best|tier list/i, color:"#5b8cff" },
  { id:"howmuch",  label:"Money hook",             test:/\$\d|how much|made \$|earned|profit|salary|cost/i, color:"#a3ff3b" },
  { id:"howto",    label:"How-to / tutorial",      test:/^how to|step-by-step|guide to|the right way/i, color:"#22d3ee" },
  { id:"warning",  label:"Warning / fear",         test:/don't|warning|stop|never|mistake|killed|destroyed|disaster/i, color:"#ef4444" },
  { id:"reveal",   label:"Reveal / secret",        test:/secret|nobody|the truth|exposed|finally|revealed|why/i, color:"#facc15" },
  { id:"rank",     label:"Ranking / list",         test:/\b\d+\s+(best|worst|things|ways|reasons)|ranked|top \d+/i, color:"#ec4899" },
  { id:"challenge",label:"Challenge / time-bound", test:/\b\d+\s*(hour|hr|day|min|week)|challenge|in 24|in 1/i, color:"#22c55e" },
];

function classifyHook(title) {
  for (const p of HOOK_PATTERNS) if (p.test.test(title)) return p;
  return { id:"other", label:"Other / narrative", color:"#94a3b8" };
}

function TrackerPatternLab({ tracker, onOpenVideo, onOpenChannel }) {
  const videos = useMemo(()=> window.VIDEOS.filter(v=>tracker.channels.includes(v.channel)), [tracker.channels]);

  // Format breakdown — count + avg multiplier per format
  const formatStats = useMemo(()=>{
    const m = {};
    videos.forEach(v=>{
      const f = v.format;
      if (!m[f]) m[f] = { name:f, count:0, totalMult:0, totalViews:0, hot:0, examples:[] };
      m[f].count++;
      m[f].totalMult += v.multiplier;
      m[f].totalViews += v.views;
      if (v.multiplier >= 2.5) m[f].hot++;
      if (m[f].examples.length < 3) m[f].examples.push(v);
    });
    return Object.values(m).map(x=>({...x, avgMult: x.totalMult/x.count})).sort((a,b)=>b.avgMult-a.avgMult);
  }, [videos]);

  // Hook archetype breakdown
  const hookStats = useMemo(()=>{
    const m = {};
    videos.forEach(v=>{
      const h = classifyHook(v.title);
      if (!m[h.id]) m[h.id] = { ...h, count:0, totalMult:0, examples:[] };
      m[h.id].count++;
      m[h.id].totalMult += v.multiplier;
      if (m[h.id].examples.length < 2) m[h.id].examples.push(v);
    });
    return Object.values(m).map(x=>({...x, avgMult: x.totalMult/x.count})).sort((a,b)=>b.count-a.count);
  }, [videos]);

  // Trend: bucket multipliers by week
  const trend = useMemo(()=>{
    const buckets = Array(12).fill(0).map(()=>({ count:0, totalMult:0, totalViews:0 }));
    videos.forEach(v=>{
      const d = window.agoDays(v.ago);
      const wk = Math.min(11, Math.floor(d/7));
      buckets[wk].count++;
      buckets[wk].totalMult += v.multiplier;
      buckets[wk].totalViews += v.views;
    });
    return buckets.reverse(); // oldest first
  }, [videos]);

  // Length cohort: short < 4min, mid 4-12, long > 12
  const lengthStats = useMemo(()=>{
    const cohorts = { short:{label:"Under 4 min", count:0, totalMult:0}, mid:{label:"4–12 min", count:0, totalMult:0}, long:{label:"Over 12 min", count:0, totalMult:0} };
    videos.forEach(v=>{
      const sec = window.lengthSec(v.length);
      const k = sec<240 ? "short" : sec<720 ? "mid" : "long";
      cohorts[k].count++;
      cohorts[k].totalMult += v.multiplier;
    });
    return Object.values(cohorts).map(c=>({...c, avgMult: c.count? c.totalMult/c.count : 0}));
  }, [videos]);

  // Posting cadence per channel
  const cadence = useMemo(()=>{
    return tracker.channels.map(handle=>{
      const ch = window.CHANNELS.find(c=>c.handle===handle);
      const chVids = videos.filter(v=>v.channel===handle);
      const count = chVids.length;
      const avgMult = count ? chVids.reduce((a,v)=>a+v.multiplier,0)/count : 0;
      const recent = chVids.filter(v=>window.agoDays(v.ago)<=30).length;
      // Spacing: avg days between videos (rough)
      const ages = chVids.map(v=>window.agoDays(v.ago)).sort((a,b)=>a-b);
      let avgGap = 0;
      if (ages.length>1) {
        let sum = 0; for (let i=1;i<ages.length;i++) sum += ages[i]-ages[i-1];
        avgGap = sum/(ages.length-1);
      }
      return { handle, ch, count, avgMult, recent, avgGap };
    }).sort((a,b)=>b.avgMult - a.avgMult);
  }, [tracker.channels, videos]);

  // Top winners — global top-3 from this tracker
  const topWinners = useMemo(()=> videos.slice().sort((a,b)=>b.multiplier-a.multiplier).slice(0,3), [videos]);

  if (videos.length === 0) return null;
  const maxFmtCount = Math.max(...formatStats.map(s=>s.count), 1);
  const maxHookCount = Math.max(...hookStats.map(s=>s.count), 1);
  const maxTrendMult = Math.max(...trend.map(b=>b.count? b.totalMult/b.count : 0), 1);

  return (
    <div className="pattern-lab">
      <div className="section-head" style={{marginTop: 28}}>
        <div>
          <div className="section-title">Pattern lab</div>
          <div style={{fontSize:13, color:"var(--fg-mute)", marginTop:4}}>What's actually working across these channels — sorted by avg outlier multiplier.</div>
        </div>
        <div className="section-link mono">{videos.length} videos analyzed</div>
      </div>

      {/* Top of stack */}
      <div className="pl-grid">
        {/* Formats */}
        <div className="pl-card">
          <div className="pl-card-head">
            <div className="pl-card-title">Top performing formats</div>
            <div className="pl-card-sub">avg multiplier · count</div>
          </div>
          <div className="pl-bars">
            {formatStats.slice(0,7).map(s=>{
              const heat = window.outlierHeat(s.avgMult);
              return (
                <div key={s.name} className="pl-bar-row">
                  <div className="pl-bar-label" title={s.name}>{s.name}</div>
                  <div className="pl-bar-track">
                    <div className="pl-bar-fill" style={{ width: (s.count/maxFmtCount*100)+"%", background: heat.ring }}></div>
                  </div>
                  <div className="pl-bar-val mono" style={{color: heat.fg}}>{s.avgMult.toFixed(1)}x</div>
                  <div className="pl-bar-count mono">{s.count}</div>
                </div>
              );
            })}
          </div>
          {formatStats[0] && (
            <div className="pl-insight">
              <Icons.Sparkle size={14} style={{color:"var(--accent)"}}/>
              <span><strong>{formatStats[0].name}</strong> is the highest-leverage format — averaging <strong>{formatStats[0].avgMult.toFixed(1)}x</strong> across {formatStats[0].count} videos.</span>
            </div>
          )}
        </div>

        {/* Hook archetypes */}
        <div className="pl-card">
          <div className="pl-card-head">
            <div className="pl-card-title">Hook archetypes</div>
            <div className="pl-card-sub">classified from titles</div>
          </div>
          <div className="pl-hooks">
            {hookStats.map(s=>(
              <div key={s.id} className="pl-hook">
                <div className="pl-hook-head">
                  <span className="pl-hook-dot" style={{background: s.color}}></span>
                  <span className="pl-hook-label">{s.label}</span>
                  <span className="mono" style={{color:"var(--fg-dim)", fontSize:12}}>{s.count}</span>
                </div>
                <div className="pl-hook-track">
                  <div style={{ width: (s.count/maxHookCount*100)+"%", background: s.color, opacity:.4 }}></div>
                </div>
                <div className="pl-hook-meta">
                  <span className="mono" style={{color: window.outlierHeat(s.avgMult).fg}}>{s.avgMult.toFixed(1)}x avg</span>
                  {s.examples?.[0] && (
                    <button className="pl-hook-ex" onClick={()=>onOpenVideo(s.examples[0])} title={s.examples[0].title}>
                      "{s.examples[0].title.slice(0,38)}{s.examples[0].title.length>38?"…":""}"
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend chart + length cohort */}
      <div className="pl-grid">
        <div className="pl-card">
          <div className="pl-card-head">
            <div className="pl-card-title">Multiplier trend · 12 weeks</div>
            <div className="pl-card-sub">avg outlier per week</div>
          </div>
          <div className="pl-trend">
            {trend.map((b, i)=>{
              const m = b.count ? b.totalMult/b.count : 0;
              const h = (m/maxTrendMult)*100;
              const heat = window.outlierHeat(m);
              return (
                <div key={i} className="pl-trend-col" title={`Week ${12-i}: ${m.toFixed(2)}x avg, ${b.count} videos`}>
                  <div className="pl-trend-bar" style={{ height: Math.max(2, h)+"%", background: heat.ring }}></div>
                </div>
              );
            })}
          </div>
          <div className="pl-trend-x mono">
            <span>12w ago</span><span>now</span>
          </div>
        </div>

        <div className="pl-card">
          <div className="pl-card-head">
            <div className="pl-card-title">Length cohort</div>
            <div className="pl-card-sub">where the multipliers concentrate</div>
          </div>
          <div className="pl-length">
            {lengthStats.map(c=>{
              const heat = window.outlierHeat(c.avgMult);
              const max = Math.max(...lengthStats.map(x=>x.avgMult), 1);
              return (
                <div key={c.label} className="pl-len-row">
                  <div className="pl-len-label">{c.label}</div>
                  <div className="pl-len-track">
                    <div style={{ width: (c.avgMult/max*100)+"%", background: heat.ring }}></div>
                  </div>
                  <div className="mono" style={{color: heat.fg, minWidth:48, textAlign:"right"}}>{c.avgMult.toFixed(1)}x</div>
                  <div className="mono" style={{color:"var(--fg-dim)", minWidth:32, textAlign:"right"}}>{c.count}</div>
                </div>
              );
            })}
          </div>
          <div className="pl-insight">
            <Icons.Clock size={14} style={{color:"var(--accent)"}}/>
            <span>{(()=>{
              const winner = lengthStats.slice().sort((a,b)=>b.avgMult-a.avgMult)[0];
              return <span><strong>{winner.label}</strong> wins on avg multiplier. Match this length when copying these creators.</span>;
            })()}</span>
          </div>
        </div>
      </div>

      {/* Channel cadence table */}
      <div className="pl-card" style={{marginTop: 14}}>
        <div className="pl-card-head">
          <div className="pl-card-title">Channel breakdown</div>
          <div className="pl-card-sub">sorted by avg outlier</div>
        </div>
        <div className="pl-table">
          <div className="pl-tr pl-th">
            <div>Channel</div>
            <div>Subs</div>
            <div>Videos</div>
            <div>Last 30d</div>
            <div>Avg gap</div>
            <div>Avg outlier</div>
          </div>
          {cadence.map(c=>{
            const heat = window.outlierHeat(c.avgMult);
            return (
              <div key={c.handle} className="pl-tr" onClick={()=>onOpenChannel(c.handle)}>
                <div style={{display:"flex", alignItems:"center", gap:10, minWidth:0}}>
                  <Avatar handle={c.handle}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>@{c.handle}</div>
                    <div style={{fontSize:11, color:"var(--fg-dim)"}}>{c.ch?.niche}</div>
                  </div>
                </div>
                <div className="mono">{fmtNum(c.ch?.subs||0)}</div>
                <div className="mono">{c.count}</div>
                <div className="mono">{c.recent}</div>
                <div className="mono">{c.avgGap ? `${Math.round(c.avgGap)}d` : "—"}</div>
                <div><span className="outlier" style={{background: heat.bg, color: heat.fg, padding:"3px 8px"}}>
                  <span className="outlier-dot" style={{background: heat.ring}}></span>{c.avgMult.toFixed(1)}x
                </span></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top winners — explicit "copy this" */}
      <div className="section-head" style={{marginTop: 22}}>
        <div className="section-title">Top winners — copy these first</div>
        <div className="section-link">highest multipliers in tracker</div>
      </div>
      <div className="pl-winners">
        {topWinners.map((v, i)=>(
          <button key={v.id} className="pl-winner" onClick={()=>onOpenVideo(v)}>
            <div className="pl-winner-rank mono">#{i+1}</div>
            <div className="pl-winner-thumb"><Thumb video={v}/></div>
            <div className="pl-winner-body">
              <div className="pl-winner-title">{v.title}</div>
              <div className="pl-winner-meta">
                <Avatar handle={v.channel}/>
                <span style={{fontSize:12, color:"var(--fg-mute)"}}>@{v.channel} · {fmtNum(v.views)} views</span>
              </div>
              <div style={{display:"flex", gap:8, alignItems:"center", marginTop:8}}>
                <Outlier m={v.multiplier}/>
                <span className="chip" style={{padding:"4px 10px", fontSize:11}}>{v.format}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
window.TrackerPatternLab = TrackerPatternLab;


/* ============================================================
   VIDEO COMPARE
   Pick 2-4 videos, see retention curves, packaging side-by-side,
   score breakdown overlay, and a structured diff.
   ============================================================ */

// Generate deterministic retention curve: starts at 100%, drops in interesting ways
function retentionCurve(video) {
  const seed = video.id;
  let h=0; for (let i=0;i<seed.length;i++) h=(h*31+seed.charCodeAt(i))|0;
  const ax = Math.abs(h);
  const points = 40;
  const data = [];
  // Hook strength: how steep first drop is (higher mult => better hook)
  const hookDrop = Math.max(8, 35 - video.multiplier*4);
  // Avg view duration determined by multiplier
  const target = Math.max(28, 30 + video.multiplier*8);
  let cur = 100;
  for (let i=0;i<points;i++) {
    const t = i/(points-1);
    if (i===0) { data.push(100); continue; }
    // Initial hook drop
    if (t < 0.08) cur -= (hookDrop/3) * (1 - (ax%5)/20);
    // Mid drop with re-engagement bumps
    else if (t < 0.5) cur -= (1.2 - (((ax>>i)%3))*0.4);
    else if (t < 0.85) cur -= 1.6;
    else cur -= 0.6;
    // small bumps for re-hook moments
    if (i % (5 + (ax%4)) === 0) cur += 1.5;
    cur = Math.max(target * 0.85, Math.min(100, cur));
    // gravitate toward target by end
    if (t > 0.9) cur = cur*0.7 + target*0.3;
    data.push(+cur.toFixed(1));
  }
  return data;
}

// Score axes (deterministic per video)
function videoScores(video) {
  const seed = video.id;
  let h=0; for (let i=0;i<seed.length;i++) h=(h*37+seed.charCodeAt(i))|0;
  const ax = Math.abs(h);
  const m = video.multiplier;
  function pick(idx, base) { return Math.max(20, Math.min(98, Math.round(base*15 + ((ax>>idx)%30) - 8))); }
  return {
    hook:       pick(0, m),
    thumbnail:  pick(2, m+0.3),
    title:      pick(4, m),
    pacing:     pick(6, m-0.2),
    payoff:     pick(8, m-0.1),
    rewatch:    pick(10, m-0.4),
    ctr:        pick(12, m+0.1),
    avd:        pick(14, m-0.3),
  };
}

// Notable moments per retention curve — auto-detect drops + spikes
function retentionMoments(data) {
  const moments = [];
  // first big drop in opening 12%
  let earlyMin = 0, earlyMinV = 100;
  for (let i=1; i<Math.floor(data.length*0.12); i++) {
    if (data[i] < earlyMinV) { earlyMin = i; earlyMinV = data[i]; }
  }
  if (earlyMinV < 80) moments.push({ idx: earlyMin, type: "drop", label: "Hook dropoff", val: earlyMinV });
  // largest drop anywhere
  let maxDrop = 0, maxDropI = 0;
  for (let i=2; i<data.length; i++) {
    const d = data[i-2] - data[i];
    if (d > maxDrop) { maxDrop = d; maxDropI = i; }
  }
  if (maxDrop > 4 && maxDropI > data.length*0.15) moments.push({ idx: maxDropI, type: "drop", label: "Mid drop", val: data[maxDropI] });
  // any re-engagement spike
  let maxSpike = 0, maxSpikeI = 0;
  for (let i=2; i<data.length-2; i++) {
    const d = data[i] - data[i-2];
    if (d > maxSpike) { maxSpike = d; maxSpikeI = i; }
  }
  if (maxSpike > 1) moments.push({ idx: maxSpikeI, type: "spike", label: "Re-hook", val: data[maxSpikeI] });
  return moments;
}
window.retentionMoments = retentionMoments;

const COMPARE_COLORS = ["#a3ff3b","#5b8cff","#ff8a3b","#ec4899"];

function CompareVideosPage({ onOpenVideo, onOpenChannel, bookmarks, toggleBookmark, trackers }) {
  const [picks, setPicks] = useState([]); // array of video ids
  const [picker, setPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState("all"); // all|tracker|bookmark
  const [hoverPct, setHoverPct] = useState(null);

  function add(v) {
    if (picks.length >= 4) return;
    if (picks.includes(v.id)) return;
    setPicks([...picks, v.id]);
  }
  function remove(id) { setPicks(picks.filter(x=>x!==id)); }
  function clear() { setPicks([]); }

  const videos = picks.map(id => window.VIDEOS.find(v=>v.id===id)).filter(Boolean);

  // Picker dataset
  const trackerHandles = new Set(trackers.flatMap(t=>t.channels));
  const pickerVideos = useMemo(()=>{
    let list = window.VIDEOS;
    if (pickerFilter === "tracker") list = list.filter(v=>trackerHandles.has(v.channel));
    if (pickerFilter === "bookmark") list = list.filter(v=>bookmarks.includes(v.id));
    if (pickerSearch) {
      const s = pickerSearch.toLowerCase();
      list = list.filter(v=>v.title.toLowerCase().includes(s) || v.channel.toLowerCase().includes(s));
    }
    return list.slice().sort((a,b)=>b.multiplier-a.multiplier).slice(0,40);
  }, [pickerSearch, pickerFilter, bookmarks, trackerHandles]);

  // Suggested winners
  const suggested = useMemo(()=> window.VIDEOS.slice().sort((a,b)=>b.multiplier-a.multiplier).slice(0,4), []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Compare videos</h1>
          <p className="page-sub">Stack up to 4 videos side-by-side. See retention curves overlaid, packaging diffed, and what each one did differently.</p>
        </div>
        <div style={{display:"flex", gap:8}}>
          {picks.length > 0 && <button className="btn" onClick={clear}><Icons.Trash size={14}/> Clear all</button>}
          <button className="btn btn-primary" onClick={()=>setPicker(true)} disabled={picks.length>=4}>
            <Icons.Plus size={14}/> Add video
          </button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="cmp-empty">
          <div style={{textAlign:"center", maxWidth: 540}}>
            <div className="cmp-empty-icon"><Icons.Eye size={28}/></div>
            <div style={{fontSize:18, fontWeight:600, marginBottom: 8}}>Compare what's working</div>
            <div style={{color:"var(--fg-mute)", fontSize: 14, marginBottom: 22}}>
              Pick 2–4 videos — yours, a competitor's, an outlier — and see retention, packaging, and structure side by side.
            </div>
            <button className="btn btn-primary" onClick={()=>setPicker(true)}><Icons.Plus size={14}/> Pick first video</button>
            <div style={{marginTop: 28}}>
              <div className="section-title" style={{fontSize:13, color:"var(--fg-dim)", marginBottom: 12, textTransform:"uppercase", letterSpacing:".08em"}}>Or start from a suggested winner</div>
              <div className="cmp-suggest">
                {suggested.map(v=>(
                  <button key={v.id} className="cmp-suggest-card" onClick={()=>add(v)}>
                    <div className="cmp-suggest-thumb"><Thumb video={v}/></div>
                    <div style={{minWidth:0, flex:1}}>
                      <div style={{fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{v.title}</div>
                      <div style={{fontSize:12, color:"var(--fg-dim)"}}>@{v.channel}</div>
                    </div>
                    <Outlier m={v.multiplier}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CompareSurface videos={videos} onRemove={remove} onAdd={()=>setPicker(true)} hoverPct={hoverPct} setHoverPct={setHoverPct} onOpenVideo={onOpenVideo} onOpenChannel={onOpenChannel}/>
      )}

      {picker && (
        <div className="cmp-picker-wrap" onClick={()=>setPicker(false)}>
          <div className="cmp-picker" onClick={e=>e.stopPropagation()}>
            <div className="cmp-picker-head">
              <div style={{fontSize:14, fontWeight:600}}>Pick a video to compare</div>
              <button className="btn-icon" onClick={()=>setPicker(false)}><Icons.X size={14}/></button>
            </div>
            <div className="cmp-picker-tools">
              <div className="cmp-picker-tabs">
                {["all","tracker","bookmark"].map(k=>(
                  <button key={k} className={classNames("chip", pickerFilter===k && "chip-accent active")} onClick={()=>setPickerFilter(k)}>
                    {k==="all"?"All YouTube":k==="tracker"?"From trackers":"Bookmarked"}
                  </button>
                ))}
              </div>
              <div className="cmp-picker-search">
                <Icons.Search size={14} style={{color:"var(--fg-dim)"}}/>
                <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="Search title or @channel"/>
              </div>
            </div>
            <div className="cmp-picker-list">
              {pickerVideos.map(v=>{
                const chosen = picks.includes(v.id);
                return (
                  <button key={v.id} className={classNames("cmp-picker-row", chosen && "chosen")} disabled={chosen || picks.length>=4} onClick={()=>{ add(v); }}>
                    <div className="cmp-picker-thumb"><Thumb video={v}/></div>
                    <div style={{minWidth:0, flex:1, textAlign:"left"}}>
                      <div style={{fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{v.title}</div>
                      <div style={{fontSize:12, color:"var(--fg-dim)"}}>@{v.channel} · {fmtNum(v.views)} views</div>
                    </div>
                    <Outlier m={v.multiplier}/>
                    {chosen ? <Icons.Check size={16} style={{color:"var(--accent)"}}/> : <Icons.Plus size={16} style={{color:"var(--fg-dim)"}}/>}
                  </button>
                );
              })}
              {pickerVideos.length===0 && <div className="empty">No matches.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.CompareVideosPage = CompareVideosPage;

function CompareSurface({ videos, onRemove, onAdd, hoverPct, setHoverPct, onOpenVideo, onOpenChannel }) {
  // Retention curves
  const curves = videos.map(v => ({ video: v, data: retentionCurve(v) }));
  // Score map
  const scores = videos.map(v => ({ video: v, scores: videoScores(v) }));

  // Hover index
  const W = 800, H = 280;
  function onSvgMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left)/r.width));
    setHoverPct(t);
  }
  const hoverIdx = hoverPct == null ? null : Math.round(hoverPct * (curves[0].data.length-1));

  // Scoring axes
  const AXES = [
    { id:"hook",      label:"Hook strength",      desc:"first 30s retention" },
    { id:"thumbnail", label:"Thumbnail clarity",  desc:"reads at 1in tall" },
    { id:"title",     label:"Title curiosity",    desc:"open-loop strength" },
    { id:"pacing",    label:"Pacing",             desc:"cuts per minute" },
    { id:"payoff",    label:"Payoff",             desc:"end-of-video satisfaction" },
    { id:"rewatch",   label:"Rewatch potential",  desc:"30-day return rate" },
    { id:"ctr",       label:"CTR",                desc:"impressions click rate" },
    { id:"avd",       label:"Avg view duration",  desc:"% of length watched" },
  ];

  // Diff
  const diff = useMemo(()=>{
    if (videos.length < 2) return null;
    const a = videos[0], b = videos[1];
    const sa = scores[0].scores, sb = scores[1].scores;
    const items = [
      { k:"Length", a: a.length, b: b.length },
      { k:"Format", a: a.format, b: b.format },
      { k:"Posted", a: a.ago, b: b.ago },
      { k:"Niche",  a: a.niche, b: b.niche },
      { k:"Channel size", a: fmtNum(a.subs), b: fmtNum(b.subs) },
      { k:"Outlier", a: a.multiplier.toFixed(1)+"x", b: b.multiplier.toFixed(1)+"x" },
      { k:"Views", a: fmtNum(a.views), b: fmtNum(b.views) },
    ];
    const biggestGap = AXES.map(ax => ({ ax, gap: Math.abs(sa[ax.id]-sb[ax.id]), winner: sa[ax.id]>sb[ax.id]?"a":"b", a:sa[ax.id], b:sb[ax.id] }))
      .sort((x,y)=>y.gap-x.gap)[0];
    return { items, biggestGap };
  }, [videos]);

  return (
    <>
      {/* Header strip — picked videos */}
      <div className="cmp-strip" style={{gridTemplateColumns: `repeat(${videos.length}, 1fr)${videos.length<4?" 220px":""}`}}>
        {videos.map((v,i)=>(
          <div key={v.id} className="cmp-card">
            <div className="cmp-color-bar" style={{background: COMPARE_COLORS[i]}}></div>
            <button className="cmp-remove" onClick={()=>onRemove(v.id)}><Icons.X size={12}/></button>
            <div className="cmp-card-thumb" onClick={()=>onOpenVideo(v)}><Thumb video={v}/></div>
            <div className="cmp-card-title">{v.title}</div>
            <div className="cmp-card-meta" onClick={()=>onOpenChannel(v.channel)} style={{cursor:"pointer"}}>
              <Avatar handle={v.channel}/>
              <span style={{fontSize:12, color:"var(--fg-mute)"}}>@{v.channel}</span>
            </div>
            <div className="cmp-card-stats">
              <div className="cmp-stat"><div className="cmp-stat-l">Views</div><div className="cmp-stat-v mono">{fmtNum(v.views)}</div></div>
              <div className="cmp-stat"><div className="cmp-stat-l">Outlier</div><div className="cmp-stat-v mono" style={{color: window.outlierHeat(v.multiplier).fg}}>{v.multiplier.toFixed(1)}x</div></div>
              <div className="cmp-stat"><div className="cmp-stat-l">Length</div><div className="cmp-stat-v mono">{v.length}</div></div>
            </div>
          </div>
        ))}
        {videos.length < 4 && (
          <button className="cmp-add" onClick={onAdd}>
            <Icons.Plus size={20}/>
            <div style={{fontSize:13, fontWeight:600, marginTop:8}}>Add video</div>
            <div style={{fontSize:11, color:"var(--fg-dim)"}}>{4-videos.length} slot{4-videos.length===1?"":"s"} left</div>
          </button>
        )}
      </div>

      {/* Retention summary stats */}
      <div className="cmp-stats-strip">
        {curves.map(({video, data}, i)=>{
          const avd = data.reduce((a,b)=>a+b,0)/data.length;
          const drop30 = 100 - data[Math.round(data.length*0.3)];
          const finish = data[data.length-1];
          return (
            <div key={video.id} className="cmp-stat-block">
              <div className="cmp-stat-pin" style={{background: COMPARE_COLORS[i]}}></div>
              <div className="cmp-stat-grid">
                <div><div className="cmp-stat-l">Avg watched</div><div className="cmp-stat-v mono">{avd.toFixed(0)}%</div></div>
                <div><div className="cmp-stat-l">30% drop</div><div className="cmp-stat-v mono">−{drop30.toFixed(0)}pp</div></div>
                <div><div className="cmp-stat-l">Finished</div><div className="cmp-stat-v mono">{finish.toFixed(0)}%</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retention chart */}
      <div className="cmp-block">
        <div className="cmp-block-head">
          <div>
            <div className="cmp-block-title">Audience retention</div>
            <div className="cmp-block-sub">% of viewers still watching at each point. Markers flag hook drops, mid-video losses, and re-engagement spikes.</div>
          </div>
          <div className="cmp-legend">
            {videos.map((v,i)=>(<div key={v.id} className="cmp-legend-item"><span className="cmp-dot" style={{background:COMPARE_COLORS[i]}}></span>{v.title.slice(0,28)}{v.title.length>28?"…":""}</div>))}
          </div>
        </div>
        <div className="cmp-chart" onMouseMove={onSvgMove} onMouseLeave={()=>setHoverPct(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H}>
            {/* grid */}
            {[0,25,50,75,100].map(p=>{
              const y = H - (p/100)*(H-30) - 20;
              return <g key={p}>
                <line x1="40" x2={W} y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 3"/>
                <text x="6" y={y+4} fill="var(--fg-dim)" fontSize="11" fontFamily="JetBrains Mono, monospace">{p}%</text>
              </g>;
            })}
            {/* x ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((p,i)=>{
              const x = 40 + p*(W-50);
              return <g key={i}>
                <line x1={x} x2={x} y1={H-20} y2={H-16} stroke="var(--fg-dim)"/>
                <text x={x} y={H-4} fill="var(--fg-dim)" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{Math.round(p*100)}%</text>
              </g>;
            })}
            {/* moment markers */}
            {curves.map(({video, data}, i)=>{
              const color = COMPARE_COLORS[i];
              const moments = retentionMoments(data);
              return moments.map((mo, mi)=>{
                const x = 40 + (mo.idx/(data.length-1))*(W-50);
                const y = H - (mo.val/100)*(H-30) - 20;
                return (
                  <g key={video.id+"_m_"+mi} opacity={hoverIdx==null ? 1 : 0.35}>
                    <circle cx={x} cy={y} r="4" fill={color} stroke="var(--bg-0)" strokeWidth="2"/>
                    <line x1={x} x2={x} y1={y-6} y2={y-14} stroke={color} strokeWidth="1.4"/>
                  </g>
                );
              });
            })}
            {/* lines */}
            {curves.map(({video, data}, i)=>{
              const color = COMPARE_COLORS[i];
              const pts = data.map((d, idx)=>{
                const x = 40 + (idx/(data.length-1))*(W-50);
                const y = H - (d/100)*(H-30) - 20;
                return [x,y];
              });
              const lineD = pts.map(([x,y],j)=> j===0?`M${x},${y}`:`L${x},${y}`).join(" ");
              const areaD = lineD + ` L${pts[pts.length-1][0]},${H-20} L${pts[0][0]},${H-20} Z`;
              return <g key={video.id}>
                <path d={areaD} fill={color} fillOpacity=".07"/>
                <path d={lineD} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </g>;
            })}
            {/* hover */}
            {hoverIdx != null && (()=>{
              const x = 40 + (hoverIdx/(curves[0].data.length-1))*(W-50);
              return <g>
                <line x1={x} x2={x} y1="10" y2={H-20} stroke="var(--fg-mute)" strokeDasharray="3 3"/>
                {curves.map(({video, data}, i)=>{
                  const y = H - (data[hoverIdx]/100)*(H-30) - 20;
                  return <circle key={video.id} cx={x} cy={y} r="5" fill={COMPARE_COLORS[i]} stroke="var(--bg-0)" strokeWidth="2"/>;
                })}
              </g>;
            })()}
          </svg>
          {hoverIdx != null && (
            <div className="cmp-tooltip" style={{ left: `calc(40px + ${(hoverIdx/(curves[0].data.length-1))*100}% - ${(hoverIdx/(curves[0].data.length-1))*50}px)` }}>
              <div className="cmp-tooltip-head mono">at {Math.round((hoverIdx/(curves[0].data.length-1))*100)}% mark</div>
              {curves.map(({video, data}, i)=>(
                <div key={video.id} className="cmp-tooltip-row">
                  <span className="cmp-dot" style={{background: COMPARE_COLORS[i]}}></span>
                  <span style={{flex:1, fontSize:12}}>@{video.channel}</span>
                  <span className="mono" style={{fontSize:12, fontWeight:600}}>{data[hoverIdx].toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="cmp-block">
        <div className="cmp-block-head">
          <div>
            <div className="cmp-block-title">Score breakdown</div>
            <div className="cmp-block-sub">AI-rated dimensions, 0–100. Look for axes where one video dominates.</div>
          </div>
        </div>
        <div className="cmp-axes">
          {AXES.map(ax=>{
            const max = Math.max(...scores.map(s=>s.scores[ax.id]));
            return (
              <div key={ax.id} className="cmp-axis">
                <div className="cmp-axis-label">
                  <span>{ax.label}</span>
                  <span className="cmp-axis-desc">{ax.desc}</span>
                </div>
                <div className="cmp-axis-rows">
                  {scores.map((s,i)=>{
                    const v = s.scores[ax.id];
                    const isWinner = v === max;
                    return (
                      <div key={s.video.id} className="cmp-axis-row">
                        <div className="cmp-axis-track">
                          <div style={{width: v+"%", background: COMPARE_COLORS[i], opacity: isWinner?1:0.5}}></div>
                        </div>
                        <div className="mono cmp-axis-val">{v}{isWinner && <span className="cmp-axis-trophy"> ★</span>}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick diff (only when exactly 2 videos) */}
      {videos.length === 2 && diff && (
        <div className="cmp-block">
          <div className="cmp-block-head">
            <div>
              <div className="cmp-block-title">Head-to-head</div>
              <div className="cmp-block-sub">What's actually different between these two.</div>
            </div>
          </div>
          <div className="cmp-h2h">
            <div className="cmp-h2h-side">
              <div className="cmp-h2h-name"><span className="cmp-dot" style={{background:COMPARE_COLORS[0]}}></span>@{videos[0].channel}</div>
            </div>
            <div className="cmp-h2h-mid mono" style={{fontSize:12, color:"var(--fg-dim)"}}>vs</div>
            <div className="cmp-h2h-side" style={{textAlign:"right"}}>
              <div className="cmp-h2h-name" style={{justifyContent:"flex-end"}}>@{videos[1].channel} <span className="cmp-dot" style={{background:COMPARE_COLORS[1]}}></span></div>
            </div>
          </div>
          <div className="cmp-h2h-table">
            {diff.items.map(it=>(
              <div key={it.k} className="cmp-h2h-row">
                <div className="cmp-h2h-cell" style={{textAlign:"left"}}>{it.a}</div>
                <div className="cmp-h2h-key">{it.k}</div>
                <div className="cmp-h2h-cell" style={{textAlign:"right"}}>{it.b}</div>
              </div>
            ))}
          </div>
          <div className="cmp-takeaway">
            <Icons.Sparkle size={14} style={{color:"var(--accent)"}}/>
            <span>Biggest gap: <strong>{diff.biggestGap.ax.label}</strong> — @{(diff.biggestGap.winner==="a"?videos[0]:videos[1]).channel} wins {diff.biggestGap.gap} points. Steal that lever first.</span>
          </div>
        </div>
      )}
    </>
  );
}


/* ============================================================
   THUMBNAIL MOCKUP TOOL
   Place a chosen thumbnail (yours, bookmarked, or any video's) into
   YouTube-style chrome on desktop home, mobile home, and search results.
   ============================================================ */

function ThumbMockupPage({ onOpenVideo, bookmarks, trackers, myChannel }) {
  const [pickedId, setPickedId] = useState(()=> window.VIDEOS[0]?.id);
  const [device, setDevice] = useState("desktop"); // desktop | mobile
  const [context, setContext] = useState("home"); // home | search | sidebar
  const [picker, setPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState("trending");
  const [pickerSearch, setPickerSearch] = useState("");
  const [titleOverride, setTitleOverride] = useState("");
  const [showCompetition, setShowCompetition] = useState(true);

  const picked = window.VIDEOS.find(v=>v.id===pickedId);
  const trackerHandles = new Set(trackers.flatMap(t=>t.channels));

  // Pool of videos to render around the user's pick (sibling thumbnails)
  const competition = useMemo(()=>{
    if (!picked) return [];
    return window.VIDEOS.filter(v=>v.id!==picked.id && (v.niche===picked.niche || trackerHandles.has(v.channel)))
      .sort((a,b)=>b.multiplier-a.multiplier).slice(0, 12);
  }, [picked, trackerHandles]);

  const pickerVideos = useMemo(()=>{
    let list = window.VIDEOS;
    if (pickerFilter === "tracker") list = list.filter(v=>trackerHandles.has(v.channel));
    if (pickerFilter === "bookmark") list = list.filter(v=>bookmarks.includes(v.id));
    if (pickerFilter === "trending") list = list.slice().sort((a,b)=>b.multiplier-a.multiplier);
    if (pickerSearch) {
      const s = pickerSearch.toLowerCase();
      list = list.filter(v=>v.title.toLowerCase().includes(s) || v.channel.toLowerCase().includes(s));
    }
    return list.slice(0, 36);
  }, [pickerFilter, pickerSearch, bookmarks, trackerHandles]);

  if (!picked) return <div className="page"><div className="empty">No videos available.</div></div>;
  const displayed = titleOverride ? { ...picked, title: titleOverride } : picked;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Thumbnail mockup</h1>
          <p className="page-sub">See your thumbnail in real YouTube chrome — desktop home, mobile feed, search results — surrounded by competing videos.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mockup-toolbar">
        <div className="mockup-toolbar-block">
          <div className="mockup-toolbar-label">Thumbnail</div>
          <button className="mockup-pick-btn" onClick={()=>setPicker(true)}>
            <div className="mockup-pick-thumb"><Thumb video={picked}/></div>
            <div style={{minWidth:0, textAlign:"left", flex:1}}>
              <div style={{fontSize:12, color:"var(--fg-dim)"}}>Currently showing</div>
              <div style={{fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{picked.title}</div>
            </div>
            <Icons.Edit size={14} style={{color:"var(--fg-dim)"}}/>
          </button>
        </div>

        <div className="mockup-toolbar-block">
          <div className="mockup-toolbar-label">Device</div>
          <div style={{display:"flex", gap:6}}>
            {[{k:"desktop", l:"Desktop"},{k:"mobile", l:"Mobile"}].map(o=>(
              <button key={o.k} className={classNames("chip", device===o.k && "chip-accent active")} onClick={()=>setDevice(o.k)}>{o.l}</button>
            ))}
          </div>
        </div>

        <div className="mockup-toolbar-block">
          <div className="mockup-toolbar-label">Context</div>
          <div style={{display:"flex", gap:6}}>
            {[{k:"home", l:"Home feed"},{k:"search", l:"Search results"},{k:"sidebar", l:"Watch sidebar"}].map(o=>(
              <button key={o.k} className={classNames("chip", context===o.k && "chip-accent active")} onClick={()=>setContext(o.k)} disabled={device==="mobile" && o.k==="sidebar"}>{o.l}</button>
            ))}
          </div>
        </div>

        <div className="mockup-toolbar-block">
          <div className="mockup-toolbar-label">Override title</div>
          <input value={titleOverride} onChange={e=>setTitleOverride(e.target.value)} placeholder={picked.title}
            style={{background:"var(--bg-2)", border:"1px solid var(--line)", borderRadius:8, padding:"8px 10px", outline:0, fontSize:13, minWidth: 240, width: 240}}/>
        </div>

        <div className="mockup-toolbar-block" style={{marginLeft:"auto"}}>
          <div className="mockup-toolbar-label">&nbsp;</div>
          <button className="chip" onClick={()=>setShowCompetition(s=>!s)} style={{opacity: showCompetition?1:0.5}}>
            <Icons.Eye size={12}/> {showCompetition ? "Hide" : "Show"} competition
          </button>
        </div>
      </div>

      {/* Mockup stage */}
      <div className="mockup-stage">
        {device === "desktop" ? (
          <YTDesktop context={context} picked={displayed} competition={showCompetition?competition:[]} myChannel={myChannel}/>
        ) : (
          <YTMobile context={context} picked={displayed} competition={showCompetition?competition:[]} myChannel={myChannel}/>
        )}
      </div>

      {/* Insight strip */}
      <div className="mockup-insights">
        <div className="mockup-insight-card">
          <Icons.Eye size={14} style={{color:"var(--accent)"}}/>
          <div>
            <div className="mockup-insight-l">Visual contrast</div>
            <div className="mockup-insight-v">High</div>
          </div>
        </div>
        <div className="mockup-insight-card">
          <Icons.Type size={14} style={{color:"var(--accent)"}}/>
          <div>
            <div className="mockup-insight-l">Title length</div>
            <div className="mockup-insight-v">{displayed.title.length} chars · {displayed.title.length>60?"may truncate":"fits"}</div>
          </div>
        </div>
        <div className="mockup-insight-card">
          <Icons.Star size={14} style={{color:"var(--accent)"}}/>
          <div>
            <div className="mockup-insight-l">Predicted CTR uplift</div>
            <div className="mockup-insight-v">+{Math.round(picked.multiplier*4 + 8)}% vs niche avg</div>
          </div>
        </div>
        <div className="mockup-insight-card">
          <Icons.Compass size={14} style={{color:"var(--accent)"}}/>
          <div>
            <div className="mockup-insight-l">Context sample</div>
            <div className="mockup-insight-v">{competition.length} competing thumbs · {picked.niche} niche</div>
          </div>
        </div>
      </div>

      {picker && (
        <div className="cmp-picker-wrap" onClick={()=>setPicker(false)}>
          <div className="cmp-picker" onClick={e=>e.stopPropagation()}>
            <div className="cmp-picker-head">
              <div style={{fontSize:14, fontWeight:600}}>Pick a thumbnail</div>
              <button className="btn-icon" onClick={()=>setPicker(false)}><Icons.X size={14}/></button>
            </div>
            <div className="cmp-picker-tools">
              <div className="cmp-picker-tabs">
                {[["trending","Trending outliers"],["tracker","From trackers"],["bookmark","Bookmarked"],["all","All"]].map(([k,l])=>(
                  <button key={k} className={classNames("chip", pickerFilter===k && "chip-accent active")} onClick={()=>setPickerFilter(k)}>{l}</button>
                ))}
              </div>
              <div className="cmp-picker-search">
                <Icons.Search size={14} style={{color:"var(--fg-dim)"}}/>
                <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} placeholder="Search title or @channel"/>
              </div>
            </div>
            <div className="mockup-picker-grid">
              {pickerVideos.map(v=>(
                <button key={v.id} className={classNames("mockup-picker-card", v.id===pickedId && "chosen")} onClick={()=>{ setPickedId(v.id); setTitleOverride(""); setPicker(false); }}>
                  <div className="mockup-picker-thumb"><Thumb video={v}/></div>
                  <div style={{padding:"8px 10px", textAlign:"left"}}>
                    <div style={{fontSize:12, fontWeight:600, lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"}}>{v.title}</div>
                    <div style={{fontSize:11, color:"var(--fg-dim)", marginTop: 4, display:"flex", alignItems:"center", gap:6}}>
                      <span>@{v.channel}</span>
                      <span style={{color: window.outlierHeat(v.multiplier).fg, fontWeight:600}}>{v.multiplier.toFixed(1)}x</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.ThumbMockupPage = ThumbMockupPage;

// ---- YT chrome components ----
function YTDesktop({ context, picked, competition, myChannel }) {
  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myInitials = (myCh?.handle||"YO").replace(/[^A-Za-z]/g,"").slice(0,1).toUpperCase();

  if (context === "home") {
    // 4-column grid; user's video is highlighted, slot 4 (top row, last)
    const grid = competition.slice(0, 11);
    grid.splice(3, 0, picked);
    while (grid.length < 12) grid.push(competition[grid.length % competition.length]);

    return (
      <div className="yt-frame yt-desktop">
        <YTHeader/>
        <div className="yt-body">
          <YTSidebar/>
          <div className="yt-feed">
            <div className="yt-chips">
              {["All","Recently uploaded","Watched","New to you","Music","Mixes","Comedy","Outlier research"].map((c,i)=>(
                <span key={c} className={classNames("yt-chip", i===0 && "yt-chip-active")}>{c}</span>
              ))}
            </div>
            <div className="yt-grid yt-grid-4">
              {grid.slice(0, 12).map((v, i)=>(
                <YTGridCard key={v.id+"_"+i} video={v} highlight={v.id===picked.id}/>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (context === "search") {
    const list = [picked, ...competition.slice(0, 5)];
    return (
      <div className="yt-frame yt-desktop">
        <YTHeader showSearch={picked.title.split(" ").slice(0,3).join(" ")}/>
        <div className="yt-body">
          <YTSidebar collapsed/>
          <div className="yt-search">
            <div className="yt-filters">
              <span className="yt-filter">Filters</span>
              <span className="yt-filter">Upload date</span>
              <span className="yt-filter">Type</span>
              <span className="yt-filter">Duration</span>
              <span className="yt-filter">Sort by</span>
            </div>
            {list.map((v,i)=>(
              <div key={v.id+"_"+i} className={classNames("yt-search-row", v.id===picked.id && "highlight")}>
                <div className="yt-search-thumb"><Thumb video={v}/><div className="yt-thumb-len">{v.length}</div></div>
                <div className="yt-search-body">
                  <div className="yt-search-title">{v.title}</div>
                  <div className="yt-search-meta">{fmtNum(v.views)} views · {v.ago} ago</div>
                  <div className="yt-search-channel">
                    <Avatar handle={v.channel}/>
                    <span>@{v.channel}</span>
                  </div>
                  <div className="yt-search-desc">A {v.format.toLowerCase()} on {v.niche.toLowerCase()} — practical breakdown with examples.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // sidebar (watch page)
  const featured = competition[0] || picked;
  const sidebar = [picked, ...competition.slice(1, 8)];
  return (
    <div className="yt-frame yt-desktop">
      <YTHeader/>
      <div className="yt-body">
        <YTSidebar collapsed/>
        <div className="yt-watch">
          <div className="yt-watch-main">
            <div className="yt-player">
              <Thumb video={featured}/>
              <div className="yt-player-controls">
                <div className="yt-play"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg></div>
              </div>
            </div>
            <div className="yt-watch-title">{featured.title}</div>
            <div className="yt-watch-row">
              <Avatar handle={featured.channel} size="lg"/>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontWeight:600}}>@{featured.channel}</div>
                <div style={{fontSize:12, color:"var(--fg-mute)"}}>{fmtNum(featured.subs)} subscribers</div>
              </div>
              <div className="yt-sub-btn">Subscribe</div>
              <div className="yt-engage">
                <span className="yt-engage-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M7 10v12M15 22h6.5a2 2 0 0 0 2-1.5l1.5-7a2 2 0 0 0-2-2.5H17l1-4a2 2 0 0 0-2-2.5l-5 9z"/></svg>{fmtNum(Math.round(featured.views*0.04))}</span>
                <span className="yt-engage-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M17 14V2L7 22v-8H1l10-12"/></svg></span>
                <span className="yt-engage-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>Share</span>
                <span className="yt-engage-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5" fill="white"/><circle cx="6" cy="12" r="1.5" fill="white"/><circle cx="18" cy="12" r="1.5" fill="white"/></svg></span>
              </div>
            </div>
            <div className="yt-watch-desc">
              <div className="yt-watch-desc-row mono">{fmtNum(featured.views)} views · {featured.ago} ago</div>
              <div className="yt-watch-desc-tags">
                {(featured.tags||["#"+featured.niche.toLowerCase().replace(/\s/g,""), "#viral", "#"+featured.format.toLowerCase().split(" ")[0]]).slice(0,3).map((t,i)=>(<span key={i} className="yt-tag">{t.startsWith("#")?t:"#"+t}</span>))}
              </div>
              <div className="yt-watch-desc-body">In this video we break down exactly how this strategy played out — what worked, what didn't, and the receipts to prove it. Timestamps below ↓</div>
            </div>
            <div className="yt-comments">
              <div className="yt-comments-head"><span style={{fontWeight:600, fontSize:13}}>{fmtNum(Math.round(featured.views*0.005))} Comments</span><span style={{fontSize:12, color:"var(--fg-mute)"}}>Sort by</span></div>
              {[
                {n:"alex_p",  t:"That hook hit different — instant subscribe", l: 2400},
                {n:"mira.codes",  t:"Came for the thumbnail, stayed for the breakdown at 4:20", l: 1100},
                {n:"jonny", t:"How did this only have 200k yesterday lol", l: 480},
              ].map((c,i)=>(
                <div key={i} className="yt-comment">
                  <div className="yt-comment-av" style={{background:`hsl(${i*97},45%,42%)`}}>{c.n[0].toUpperCase()}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12}}><span style={{fontWeight:600}}>@{c.n}</span> <span style={{color:"var(--fg-mute)"}}>· {2+i}d ago</span></div>
                    <div style={{fontSize:13, marginTop:2, lineHeight:1.35}}>{c.t}</div>
                    <div className="yt-comment-actions">
                      <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10v12M15 22h6.5a2 2 0 0 0 2-1.5l1.5-7a2 2 0 0 0-2-2.5H17l1-4a2 2 0 0 0-2-2.5l-5 9z"/></svg>{fmtNum(c.l)}</span>
                      <span>Reply</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="yt-watch-side">
            <div style={{fontSize:13, fontWeight:600, marginBottom:10}}>Up next</div>
            {sidebar.map((v,i)=>(
              <div key={v.id+"_"+i} className={classNames("yt-side-row", v.id===picked.id && "highlight")}>
                <div className="yt-side-thumb"><Thumb video={v}/><div className="yt-thumb-len">{v.length}</div></div>
                <div className="yt-side-body">
                  <div className="yt-side-title">{v.title}</div>
                  <div className="yt-side-meta">@{v.channel}</div>
                  <div className="yt-side-meta">{fmtNum(v.views)} views · {v.ago}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function YTHeader({ showSearch }) {
  return (
    <div className="yt-header">
      <div className="yt-header-left">
        <div className="yt-burger"><svg width="20" height="20" viewBox="0 0 24 24" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg></div>
        <div className="yt-logo">
          <svg width="90" height="20" viewBox="0 0 90 20"><rect x="0" y="2" width="26" height="16" rx="4" fill="#FF0033"/><polygon points="10,6 18,10 10,14" fill="white"/><text x="32" y="15" fill="white" fontSize="14" fontFamily="system-ui" fontWeight="600">YouTube</text></svg>
        </div>
      </div>
      <div className="yt-search-bar">
        <input placeholder="Search" defaultValue={showSearch||""}/>
        <div className="yt-search-btn"><svg width="16" height="16" viewBox="0 0 24 24" stroke="white" strokeWidth="2" fill="none"><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></svg></div>
      </div>
      <div className="yt-header-right">
        <div className="yt-header-icon"><svg width="18" height="18" viewBox="0 0 24 24" stroke="white" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="3"/><path d="M21 12a9 9 0 0 1-9 9"/><path d="M3 12a9 9 0 0 1 9-9"/></svg></div>
        <div className="yt-header-icon"><svg width="18" height="18" viewBox="0 0 24 24" stroke="white" strokeWidth="2" fill="none"><path d="M6 8a6 6 0 1 1 12 0v6l2 3H4l2-3z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg></div>
        <div className="yt-avatar">A</div>
      </div>
    </div>
  );
}
function YTSidebar({ collapsed }) {
  const items = collapsed
    ? [["Home","🏠"],["Shorts","▶"],["Subs","≡"],["You","👤"]]
    : [["Home","🏠"],["Shorts","▶"],["Subscriptions","≡"],["—","sep"],["You","👤"],["History","🕓"],["Playlists","≡"],["Watch later","⏱"],["Liked","♥"]];
  return (
    <div className={classNames("yt-side-nav", collapsed && "collapsed")}>
      {items.map(([l,i],idx)=>(
        l==="—" ? <div key={idx} className="yt-side-sep"/> :
        <div key={idx} className="yt-side-item">
          <span className="yt-side-icon">{i}</span>
          {!collapsed && <span className="yt-side-l">{l}</span>}
        </div>
      ))}
    </div>
  );
}
function YTGridCard({ video, highlight }) {
  return (
    <div className={classNames("yt-grid-card", highlight && "highlight")}>
      <div className="yt-grid-thumb">
        <Thumb video={video}/>
        <div className="yt-thumb-len">{video.length}</div>
      </div>
      <div className="yt-grid-body">
        <div className="yt-grid-avatar"><Avatar handle={video.channel}/></div>
        <div style={{minWidth:0}}>
          <div className="yt-grid-title">{video.title}</div>
          <div className="yt-grid-meta">@{video.channel}</div>
          <div className="yt-grid-meta">{fmtNum(video.views)} views · {video.ago} ago</div>
        </div>
      </div>
    </div>
  );
}

// Mobile chrome
function YTMobile({ context, picked, competition }) {
  if (context === "search") {
    const list = [picked, ...competition.slice(0, 4)];
    return (
      <div className="yt-mobile-frame">
        <div className="yt-mobile-status">
          <span className="mono">9:41</span>
          <span style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:9}}>●●●●</span>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="white"><path d="M0 5l3-3v6zM4 4l3-3v6zM8 3l3-3v6zM12 2h2v6h-2z"/></svg>
            <svg width="20" height="10" viewBox="0 0 20 10"><rect x="0" y="1" width="17" height="8" rx="2" fill="none" stroke="white"/><rect x="2" y="3" width="13" height="4" fill="white"/></svg>
          </span>
        </div>
        <div className="yt-mobile-search-bar">
          <span style={{fontSize:18}}>←</span>
          <span style={{flex:1, fontSize:14}}>{picked.title.split(" ").slice(0,4).join(" ")}</span>
        </div>
        <div className="yt-mobile-feed">
          {list.map((v,i)=>(
            <div key={v.id+"_"+i} className={classNames("yt-mobile-card", v.id===picked.id && "highlight")}>
              <div className="yt-mobile-thumb"><Thumb video={v}/><div className="yt-thumb-len">{v.length}</div></div>
              <div className="yt-mobile-body">
                <div style={{display:"flex", gap:8, alignItems:"flex-start"}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div className="yt-mobile-title">{v.title}</div>
                    <div className="yt-mobile-meta">@{v.channel} · {fmtNum(v.views)} views · {v.ago}</div>
                  </div>
                  <span style={{fontSize:18, color:"#ccc"}}>⋮</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {YTMobileTabs()}
      </div>
    );
  }

  // home
  const list = competition.slice(0, 4);
  list.splice(1, 0, picked);
  return (
    <div className="yt-mobile-frame">
      <div className="yt-mobile-status">
        <span className="mono">9:41</span>
        <span style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:9}}>●●●●</span>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="white"><path d="M0 5l3-3v6zM4 4l3-3v6zM8 3l3-3v6zM12 2h2v6h-2z"/></svg>
          <svg width="20" height="10" viewBox="0 0 20 10"><rect x="0" y="1" width="17" height="8" rx="2" fill="none" stroke="white"/><rect x="2" y="3" width="13" height="4" fill="white"/></svg>
        </span>
      </div>
      <div className="yt-mobile-header">
        <svg width="80" height="18" viewBox="0 0 90 20"><rect x="0" y="2" width="26" height="16" rx="4" fill="#FF0033"/><polygon points="10,6 18,10 10,14" fill="white"/><text x="32" y="15" fill="white" fontSize="13" fontFamily="system-ui" fontWeight="600">YouTube</text></svg>
        <div style={{display:"flex", gap:14, alignItems:"center", color:"#ccc"}}>
          <span>📺</span><span>🔔</span><span>🔍</span><span style={{width:24,height:24,borderRadius:"50%",background:"#a3ff3b",color:"#000",fontSize:11,fontWeight:600,display:"grid",placeItems:"center"}}>A</span>
        </div>
      </div>
      <div className="yt-mobile-chips">
        {["All","Music","Gaming","News","Live","Mixes"].map((c,i)=>(
          <span key={c} className={classNames("yt-chip", i===0 && "yt-chip-active")}>{c}</span>
        ))}
      </div>
      <div className="yt-mobile-feed">
        {list.map((v,i)=>(
          <div key={v.id+"_"+i} className={classNames("yt-mobile-card", v.id===picked.id && "highlight")}>
            <div className="yt-mobile-thumb-big"><Thumb video={v}/><div className="yt-thumb-len">{v.length}</div></div>
            <div className="yt-mobile-body">
              <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
                <Avatar handle={v.channel}/>
                <div style={{flex:1, minWidth:0}}>
                  <div className="yt-mobile-title">{v.title}</div>
                  <div className="yt-mobile-meta">@{v.channel} · {fmtNum(v.views)} views · {v.ago}</div>
                </div>
                <span style={{fontSize:18, color:"#ccc"}}>⋮</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {YTMobileTabs()}
    </div>
  );
}
function YTMobileTabs() {
  return (
    <div className="yt-mobile-tabs">
      {[["Home","🏠"],["Shorts","▶"],["+",""],["Subs","≡"],["You","👤"]].map(([l,i],idx)=>(
        <div key={idx} className={classNames("yt-mobile-tab", l==="+" && "yt-mobile-plus")}>
          {l==="+" ? <span style={{fontSize:24}}>+</span> : <><span style={{fontSize:16}}>{i}</span><span>{l}</span></>}
        </div>
      ))}
    </div>
  );
}
