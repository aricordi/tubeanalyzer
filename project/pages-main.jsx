// Pages: Home, Trackers, Channel deep-dive, Video deep-dive, Trending Formats, Thumbnail Winners, Generators, Bookmarks
const { Avatar, Outlier, Thumb, Icons, Sparkline, FilterBar, VideoGrid, applyFilters, fmtNum, classNames } = window;

/* ======================= HOME ======================= */
function HomePage({ filters, setFilters, search, onOpenVideo, onOpenChannel, bookmarks, toggleBookmark, niches, myChannel, trackers }) {
  const [scope, setScope] = useState("all"); // "all" | "niche"
  const myCh = window.CHANNELS.find(c=>c.handle===myChannel);
  const myNiche = myCh?.niche;
  const trackedSet = new Set(trackers.flatMap(t=>t.channels));

  const filtered = useMemo(()=>{
    let list = window.VIDEOS;
    if (scope === "niche") {
      list = list.filter(v => v.niche === myNiche || trackedSet.has(v.channel));
    }
    return applyFilters(list, filters, search);
  }, [filters, search, scope, myNiche]);
  const total = scope==="niche" ? window.VIDEOS.filter(v=>v.niche===myNiche || trackedSet.has(v.channel)).length : window.VIDEOS.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Outlier feed</h1>
          <p className="page-sub">Every video on YouTube ranked by how badly it beat its channel's baseline. Filter, sort, drill in — then copy what works.</p>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn"><Icons.Refresh size={14}/> Refresh</button>
          <button className="btn btn-primary"><Icons.Sparkle size={14}/> Random outlier</button>
        </div>
      </div>
      <div style={{display:"flex", gap:6, marginBottom: 14}}>
        <button className={classNames("chip", scope==="all" && "chip-accent active")} onClick={()=>setScope("all")}>All YouTube</button>
        <button className={classNames("chip", scope==="niche" && "chip-accent active")} onClick={()=>setScope("niche")}>Your niche · {myNiche}</button>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} niches={niches}/>
      <div className="section-head">
        <div className="section-title mono" style={{color:"var(--fg-mute)"}}>{filtered.length} of {total} videos</div>
        <div className="section-link mono">{filters.sort==="multiplier"?"sorted by outlier":filters.sort==="views"?"sorted by views":filters.sort==="subsAsc"?"smallest channels first":"newest first"}</div>
      </div>
      <VideoGrid videos={filtered} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
    </div>
  );
}
window.HomePage = HomePage;

/* ======================= TRACKERS ======================= */
function TrackersPage({ trackers, setTrackers, activeTracker, setActiveTracker, onOpenVideo, onOpenChannel, bookmarks, toggleBookmark }) {
  const [newTrackerName, setNewTrackerName] = useState("");
  const [creating, setCreating] = useState(false);
  function createTracker() {
    if (!newTrackerName.trim()) return;
    const id = "t_" + Date.now();
    const next = [...trackers, { id, name: newTrackerName.trim(), channels: [] }];
    setTrackers(next);
    setActiveTracker(id);
    setNewTrackerName("");
    setCreating(false);
  }
  function deleteTracker(id) {
    const next = trackers.filter(t=>t.id!==id);
    setTrackers(next);
    if (activeTracker === id) setActiveTracker(next[0]?.id || null);
  }
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Trackers</h1>
          <p className="page-sub">Group competitor channels into trackers and get a live, ranked feed of their newest videos with outlier signal, similar channels, and AI breakdowns.</p>
        </div>
      </div>
      <div className="tracker-list">
        <div className="tracker-side">
          {trackers.map(t => (
            <div key={t.id} className={classNames("tracker-row", t.id===activeTracker && "active")} onClick={()=>setActiveTracker(t.id)}>
              <div style={{ width:34, height:34, borderRadius:8, background:"var(--bg-3)", display:"grid", placeItems:"center", color:"var(--accent)" }}>
                <Icons.Folder size={16}/>
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div className="tracker-row-name" style={{whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{t.name}</div>
                <div className="tracker-row-meta">{t.channels.length} channel{t.channels.length===1?"":"s"}</div>
              </div>
              <button className="btn-icon" onClick={(e)=>{e.stopPropagation(); deleteTracker(t.id);}} title="Delete tracker" style={{color:"var(--fg-dim)"}}>
                <Icons.Trash size={14}/>
              </button>
            </div>
          ))}
          {creating ? (
            <div style={{display:"flex", gap:6, padding: 8}}>
              <input autoFocus value={newTrackerName} onChange={(e)=>setNewTrackerName(e.target.value)}
                onKeyDown={(e)=>e.key==="Enter" && createTracker()}
                placeholder="Tracker name…"
                style={{flex:1, background:"var(--bg-2)", border:"1px solid var(--line)", borderRadius:8, padding:"8px 10px", outline:0, fontSize:13}}/>
              <button className="btn btn-primary" onClick={createTracker}>Add</button>
            </div>
          ) : (
            <button className="tracker-row" onClick={()=>setCreating(true)} style={{color:"var(--fg-mute)"}}>
              <div style={{width:34, height:34, borderRadius:8, background:"var(--bg-2)", display:"grid", placeItems:"center"}}>
                <Icons.Plus size={16}/>
              </div>
              <span>New tracker</span>
            </button>
          )}
        </div>
        <div>
          {activeTracker
            ? <TrackerDetail tracker={trackers.find(t=>t.id===activeTracker)} setTrackers={setTrackers} trackers={trackers} onOpenVideo={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} toggleBookmark={toggleBookmark}/>
            : <div className="empty">Create a tracker to start following competitors.</div>}
        </div>
      </div>
    </div>
  );
}
window.TrackersPage = TrackersPage;

function TrackerDetail({ tracker, setTrackers, trackers, onOpenVideo, onOpenChannel, bookmarks, toggleBookmark }) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  function setChannels(channels) {
    setTrackers(trackers.map(t => t.id === tracker.id ? { ...t, channels } : t));
  }
  function addChannel(handle) {
    if (tracker.channels.includes(handle)) return;
    setChannels([...tracker.channels, handle]);
  }
  function removeChannel(handle) { setChannels(tracker.channels.filter(c=>c!==handle)); }

  // Similar channels: same niches as tracked channels, not yet in tracker
  const similar = useMemo(()=>{
    const niches = new Set(tracker.channels.map(h => window.CHANNELS.find(c=>c.handle===h)?.niche).filter(Boolean));
    if (niches.size === 0) return window.CHANNELS.slice(0,8);
    return window.CHANNELS.filter(c => niches.has(c.niche) && !tracker.channels.includes(c.handle)).slice(0,10);
  }, [tracker.channels]);

  // Videos from tracker channels, ranked
  const videos = useMemo(()=>{
    return window.VIDEOS.filter(v => tracker.channels.includes(v.channel))
      .sort((a,b)=> b.multiplier - a.multiplier);
  }, [tracker.channels]);

  // Aggregate stats
  const stats = useMemo(()=>{
    if (!videos.length) return null;
    const avgMult = videos.reduce((a,v)=>a+v.multiplier,0)/videos.length;
    const totalSubs = tracker.channels.reduce((a,h)=>a+(window.CHANNELS.find(c=>c.handle===h)?.subs||0),0);
    const hot = videos.filter(v=>v.multiplier>=2.5).length;
    const recent = videos.filter(v=>window.agoDays(v.ago)<=30).length;
    return { avgMult, totalSubs, hot, recent };
  }, [videos, tracker.channels]);

  return (
    <div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 18}}>
        <div>
          <div style={{fontSize: 12, color:"var(--fg-dim)", letterSpacing:".08em", textTransform:"uppercase"}}>Tracker</div>
          <h2 style={{fontSize: 28, fontWeight: 700, letterSpacing:"-.02em", margin: "4px 0 6px"}}>{tracker.name}</h2>
          <div style={{color:"var(--fg-mute)", fontSize:14}}>{tracker.channels.length} channel{tracker.channels.length===1?"":"s"} · {videos.length} videos tracked</div>
        </div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn"><Icons.Bell size={14}/> Alerts</button>
          <button className="btn"><Icons.Share size={14}/> Share</button>
          <button className="btn btn-primary" onClick={()=>setAdding(s=>!s)}><Icons.Plus size={14}/> Add channel</button>
        </div>
      </div>

      {adding && (
        <div className="advanced-panel" style={{gridTemplateColumns:"1fr", marginBottom:18}}>
          <div>
            <div className="adv-label">Search a channel to add</div>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="@channel"
              style={{width:"100%", background:"var(--bg-2)", border:"1px solid var(--line)", borderRadius:10, padding:"10px 14px", outline:0, fontSize:14}}/>
            <div style={{marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:8}}>
              {window.CHANNELS.filter(c=>!tracker.channels.includes(c.handle) && (!search || c.handle.toLowerCase().includes(search.toLowerCase()))).slice(0,8).map(c=>(
                <button key={c.handle} className="chan-card" onClick={()=>addChannel(c.handle)} style={{flex:"unset", padding:10}}>
                  <Avatar handle={c.handle}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>@{c.handle}</div>
                    <div style={{fontSize:11, color:"var(--fg-dim)"}}>{fmtNum(c.subs)} · {c.niche}</div>
                  </div>
                  <div className="chan-card-add"><Icons.Plus size={14}/></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tracker.channels.length === 0 ? (
        <div className="empty">No channels yet. Click <strong>Add channel</strong> to start tracking competitors.</div>
      ) : (
        <>
          {/* Tracked channel chips */}
          <div className="section-head"><div className="section-title">Tracked channels</div></div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom: 18}}>
            {tracker.channels.map(h => {
              const c = window.CHANNELS.find(c=>c.handle===h);
              return (
                <div key={h} className="chip" style={{padding:"6px 6px 6px 8px", gap:8}}>
                  <span onClick={()=>onOpenChannel(h)} style={{display:"flex", alignItems:"center", gap:8, cursor:"pointer"}}>
                    <Avatar handle={h}/>
                    <span>@{h}</span>
                    <span style={{color:"var(--fg-dim)"}}>{fmtNum(c?.subs||0)}</span>
                  </span>
                  <button onClick={()=>removeChannel(h)} style={{padding:4, color:"var(--fg-dim)"}}><Icons.X size={12}/></button>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          {stats && (
            <div className="metric-row">
              <div className="metric"><div className="metric-label">Avg outlier</div><div className="metric-value">{stats.avgMult.toFixed(2)}x</div><div className="metric-delta mono">across last videos</div></div>
              <div className="metric"><div className="metric-label">Combined reach</div><div className="metric-value">{fmtNum(stats.totalSubs)}</div><div className="metric-delta mono">total subscribers</div></div>
              <div className="metric"><div className="metric-label">Hot videos</div><div className="metric-value">{stats.hot}</div><div className="metric-delta mono">multiplier ≥ 2.5x</div></div>
              <div className="metric"><div className="metric-label">Posted (30d)</div><div className="metric-value">{stats.recent}</div><div className="metric-delta mono">last month</div></div>
            </div>
          )}

          {/* Similar channels */}
          <div className="section-head"><div className="section-title">Similar channels</div><div className="section-link">based on niche overlap</div></div>
          <div className="chan-row">
            {similar.map(c => (
              <div key={c.handle} className="chan-card">
                <Avatar handle={c.handle} size="lg"/>
                <div style={{minWidth:0, flex:1}} onClick={()=>onOpenChannel(c.handle)}>
                  <div style={{fontSize:14, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>@{c.handle}</div>
                  <div style={{fontSize:12, color:"var(--fg-dim)"}}>{fmtNum(c.subs)} subs · {c.niche}</div>
                </div>
                <button className="chan-card-add" onClick={(e)=>{e.stopPropagation(); addChannel(c.handle);}} title="Add to tracker">
                  <Icons.Plus size={14}/>
                </button>
              </div>
            ))}
          </div>

          {/* Ranked videos */}
          <div className="section-head"><div className="section-title">Ranked videos</div><div className="section-link mono">{videos.length} total · sorted by outlier</div></div>
          <VideoGrid videos={videos} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>

          {/* Pattern Lab */}
          {window.TrackerPatternLab && <window.TrackerPatternLab tracker={tracker} onOpenVideo={onOpenVideo} onOpenChannel={onOpenChannel}/>}
        </>
      )}
    </div>
  );
}

/* ======================= CHANNEL DEEP DIVE ======================= */
function ChannelPage({ handle, onOpenVideo, onOpenChannel, onBack, trackers, setTrackers, bookmarks, toggleBookmark }) {
  const channel = window.CHANNELS.find(c => c.handle === handle);
  const videos = useMemo(()=> window.VIDEOS.filter(v=>v.channel===handle).sort((a,b)=>window.agoDays(a.ago)-window.agoDays(b.ago)), [handle]);
  const similar = useMemo(()=> window.CHANNELS.filter(c=>c.niche===channel?.niche && c.handle!==handle).slice(0,8), [handle, channel]);
  // Spark of last 12 video views
  const sparkData = videos.slice(0,12).map(v=>v.views).reverse();
  const avgMult = videos.reduce((a,v)=>a+v.multiplier,0)/(videos.length||1);
  const bestVideo = videos.slice().sort((a,b)=>b.multiplier-a.multiplier)[0];

  // Format breakdown
  const formatCount = {};
  videos.forEach(v => { formatCount[v.format] = (formatCount[v.format]||0) + 1; });
  const topFormats = Object.entries(formatCount).sort((a,b)=>b[1]-a[1]).slice(0,5);

  function addToTracker(trackerId) {
    setTrackers(trackers.map(t => t.id===trackerId && !t.channels.includes(handle) ? { ...t, channels:[...t.channels, handle]} : t));
  }
  const [showTrackerMenu, setShowTrackerMenu] = useState(false);

  if (!channel) return <div className="page"><div className="empty">Channel not found.</div></div>;

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={onBack} style={{marginBottom: 18}}><Icons.Back size={14}/> Back</button>
      <div className="channel-hero">
        <Avatar handle={handle} size="xl"/>
        <div style={{flex:1}}>
          <div style={{fontSize: 12, color:"var(--fg-dim)", letterSpacing:".08em", textTransform:"uppercase"}}>{channel.niche} channel</div>
          <h1 className="page-title" style={{marginTop: 4}}>@{channel.handle}</h1>
          <div style={{color:"var(--fg-mute)", fontSize:14, marginTop: 6}}>{channel.name} · {fmtNum(channel.subs)} subscribers · {videos.length} tracked videos</div>
        </div>
        <div style={{display:"flex", gap: 8, position:"relative"}}>
          <button className="btn"><Icons.Bell size={14}/> Watch</button>
          <button className="btn btn-primary" onClick={()=>setShowTrackerMenu(s=>!s)}><Icons.Plus size={14}/> Add to tracker</button>
          {showTrackerMenu && (
            <div style={{position:"absolute", top:"calc(100% + 6px)", right:0, background:"var(--bg-1)", border:"1px solid var(--line)", borderRadius:12, padding:6, minWidth:220, zIndex:20, boxShadow:"0 8px 32px rgba(0,0,0,.45)"}}>
              {trackers.map(t => {
                const has = t.channels.includes(handle);
                return (
                  <button key={t.id} onClick={()=>{addToTracker(t.id); setShowTrackerMenu(false);}}
                    className="tracker-row" disabled={has} style={{opacity: has?0.5:1}}>
                    <Icons.Folder size={14} style={{color:"var(--accent)"}}/>
                    <span style={{flex:1, textAlign:"left", fontSize:13}}>{t.name}</span>
                    {has && <Icons.Check size={14}/>}
                  </button>
                );
              })}
              {trackers.length===0 && <div style={{padding:14, fontSize:12, color:"var(--fg-dim)"}}>No trackers yet.</div>}
            </div>
          )}
        </div>
      </div>

      <div className="metric-row">
        <div className="metric">
          <div className="metric-label">Avg outlier</div>
          <div className="metric-value">{avgMult.toFixed(2)}x</div>
          <div className="metric-delta mono">{avgMult >= 1.5 ? "above baseline" : "near baseline"}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Avg views</div>
          <div className="metric-value">{fmtNum(channel.avgViews)}</div>
          <div className="metric-delta mono">per video</div>
        </div>
        <div className="metric">
          <div className="metric-label">Best multiplier</div>
          <div className="metric-value">{bestVideo?.multiplier.toFixed(1)}x</div>
          <div className="metric-delta mono">"{bestVideo?.title.slice(0,30)}…"</div>
        </div>
        <div className="metric" style={{padding: 14}}>
          <div className="metric-label">Recent trajectory</div>
          <div style={{marginTop: 8, height: 56}}>
            <Sparkline data={sparkData.length>1 ? sparkData : [1,2]} h={56}/>
          </div>
        </div>
      </div>

      <div className="section-head"><div className="section-title">What works on this channel</div></div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 22}}>
        {topFormats.map(([fmt, count])=> (
          <div key={fmt} className="metric">
            <div className="metric-label">Format</div>
            <div style={{fontSize: 16, fontWeight: 600, marginTop: 6}}>{fmt}</div>
            <div className="metric-delta mono">{count} video{count===1?"":"s"} · used repeatedly</div>
          </div>
        ))}
      </div>

      <div className="section-head"><div className="section-title">Similar channels</div></div>
      <div className="chan-row">
        {similar.map(c => (
          <div key={c.handle} className="chan-card" onClick={()=>onOpenChannel(c.handle)}>
            <Avatar handle={c.handle} size="lg"/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:14, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>@{c.handle}</div>
              <div style={{fontSize:12, color:"var(--fg-dim)"}}>{fmtNum(c.subs)} · {c.niche}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-head"><div className="section-title">All videos</div></div>
      <VideoGrid videos={videos} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
    </div>
  );
}
window.ChannelPage = ChannelPage;
