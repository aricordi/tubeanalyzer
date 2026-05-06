// Pages: Home, Trackers, Channel deep-dive
const { Avatar, Outlier, Thumb, Icons, Sparkline, FilterBar, VideoGrid, applyFilters,
        fmtNum, classNames, Spinner, Skeleton } = window;
const { useState, useEffect, useMemo, useCallback, useRef } = React;

/* ── useDebounce ── */
function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

/* ── DemoNotice ── */
function DemoNotice({ onGoToSettings }) {
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem('demoNoticeDismissed'));
  if (dismissed || window.TubeAPI?.Keys?.hasYt()) return null;
  return (
    <div style={{
      background: 'var(--accent)11', border: '1px solid var(--accent)33',
      borderRadius: 8, padding: '10px 14px', marginBottom: 14,
      display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
    }}>
      <span>📡</span>
      <span style={{ flex: 1, color: 'var(--fg-mute)' }}>
        Demo mode — showing sample data.{' '}
        <button onClick={onGoToSettings} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
          Add a free YouTube API key
        </button>{' '}
        to see real videos.
      </span>
      <button onClick={() => { sessionStorage.setItem('demoNoticeDismissed', '1'); setDismissed(true); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-dim)', fontSize: 16, padding: 0 }}>×</button>
    </div>
  );
}

/* ── VideoSkeletons ── */
function VideoSkeletons({ count = 12 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <Skeleton h={158} radius={0}/>
          <div style={{ padding: 14 }}>
            <Skeleton h={14} style={{ marginBottom: 8 }}/>
            <Skeleton h={12} w="70%" style={{ marginBottom: 6 }}/>
            <Skeleton h={11} w="45%"/>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ======================= HOME ======================= */
function HomePage({ filters, setFilters, search, onOpenVideo, onOpenChannel, bookmarks, toggleBookmark, niches, myChannel, trackers, onGoToSettings }) {
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(false);
  const [apiVideos, setApiVideos] = useState(null);
  const [apiError, setApiError] = useState('');
  const fetchRef = useRef(0);

  const myCh = window.CHANNELS.find(c => c.handle === myChannel);
  const myNiche = myCh?.niche;
  const trackedSet = new Set(trackers.flatMap(t => t.channels));
  const debouncedSearch = useDebounce(search, 600);

  const doFetch = useCallback((q) => {
    if (!window.TubeAPI?.Keys?.hasYt()) return;
    const id = ++fetchRef.current;
    setLoading(true); setApiError('');
    window.TubeAPI.fetchOutlierFeed(q || 'youtube viral tutorial', { maxResults: 50 })
      .then(videos => { if (fetchRef.current === id) { setApiVideos(videos); setLoading(false); } })
      .catch(err => { if (fetchRef.current === id) { setApiError(err.message); setLoading(false); } });
  }, []);

  useEffect(() => {
    const q = debouncedSearch || (scope === 'niche' && myNiche ? myNiche + ' tips' : '');
    doFetch(q);
  }, [debouncedSearch, scope, myNiche, doFetch]);

  const allVideos = apiVideos || window.VIDEOS;

  const filtered = useMemo(() => {
    let list = allVideos;
    if (scope === 'niche' && !apiVideos) {
      list = list.filter(v => v.niche === myNiche || trackedSet.has(v.channel));
    }
    return applyFilters(list, filters, search);
  }, [allVideos, filters, search, scope, myNiche, apiVideos]);

  const total = apiVideos ? apiVideos.length :
    (scope === 'niche' ? window.VIDEOS.filter(v => v.niche === myNiche || trackedSet.has(v.channel)).length : window.VIDEOS.length);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Outlier feed</h1>
          <p className="page-sub">Videos ranked by how badly they beat their channel's baseline. Filter, sort, drill in — then copy what works.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => doFetch(search)} disabled={loading}>
            {loading ? <Spinner size={14}/> : <Icons.Refresh size={14}/>} Refresh
          </button>
          <button className="btn btn-primary" onClick={() => {
            const v = filtered[Math.floor(Math.random() * filtered.length)];
            if (v) onOpenVideo(v);
          }}>
            <Icons.Sparkle size={14}/> Random outlier
          </button>
        </div>
      </div>

      <DemoNotice onGoToSettings={onGoToSettings}/>

      {apiError && (
        <div style={{ background: 'var(--hot-3)22', border: '1px solid var(--hot-3)44', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--hot-3)' }}>
          ⚠ YouTube API: {apiError} — showing sample data instead.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button className={classNames("chip", scope === "all" && "chip-accent active")} onClick={() => setScope("all")}>All YouTube</button>
        <button className={classNames("chip", scope === "niche" && "chip-accent active")} onClick={() => setScope("niche")}>Your niche · {myNiche}</button>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} niches={niches}/>

      <div className="section-head">
        <div className="section-title mono" style={{ color: "var(--fg-mute)" }}>
          {loading ? 'Fetching…' : `${filtered.length} of ${total} videos`}
          {apiVideos && !loading && <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 11 }}>● LIVE</span>}
        </div>
        <div className="section-link mono">
          {filters.sort === "multiplier" ? "sorted by outlier" : filters.sort === "views" ? "sorted by views" : filters.sort === "subsAsc" ? "smallest channels first" : "newest first"}
        </div>
      </div>

      {loading ? <VideoSkeletons/> :
        <VideoGrid videos={filtered} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
      }
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
    const next = [...trackers, { id, name: newTrackerName.trim(), channels: [], channelMeta: {} }];
    setTrackers(next);
    setActiveTracker(id);
    setNewTrackerName(""); setCreating(false);
  }
  function deleteTracker(id) {
    const next = trackers.filter(t => t.id !== id);
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
            <div key={t.id} className={classNames("tracker-row", t.id === activeTracker && "active")} onClick={() => setActiveTracker(t.id)}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-3)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                <Icons.Folder size={16}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tracker-row-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div className="tracker-row-meta">{t.channels.length} channel{t.channels.length === 1 ? "" : "s"}</div>
              </div>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); deleteTracker(t.id); }} title="Delete tracker" style={{ color: "var(--fg-dim)" }}>
                <Icons.Trash size={14}/>
              </button>
            </div>
          ))}
          {creating ? (
            <div style={{ display: "flex", gap: 6, padding: 8 }}>
              <input autoFocus value={newTrackerName} onChange={e => setNewTrackerName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createTracker()}
                placeholder="Tracker name…"
                style={{ flex: 1, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", outline: 0, fontSize: 13 }}/>
              <button className="btn btn-primary" onClick={createTracker}>Add</button>
            </div>
          ) : (
            <button className="tracker-row" onClick={() => setCreating(true)} style={{ color: "var(--fg-mute)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-2)", display: "grid", placeItems: "center" }}>
                <Icons.Plus size={16}/>
              </div>
              <span>New tracker</span>
            </button>
          )}
        </div>
        <div>
          {activeTracker
            ? <TrackerDetail tracker={trackers.find(t => t.id === activeTracker)} setTrackers={setTrackers} trackers={trackers} onOpenVideo={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} toggleBookmark={toggleBookmark}/>
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
  const [apiResults, setApiResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [realVideos, setRealVideos] = useState(null);
  const [loadingVideos, setLoadingVideos] = useState(false);

  const debouncedSearch = useDebounce(search, 450);

  // Channel search via YouTube API
  useEffect(() => {
    if (!adding || !debouncedSearch || !window.TubeAPI?.Keys?.hasYt()) {
      setApiResults(null); return;
    }
    let active = true;
    setSearching(true);
    window.TubeAPI.searchChannels(debouncedSearch, 8)
      .then(r => { if (active) { setApiResults(r); setSearching(false); } })
      .catch(() => { if (active) { setApiResults(null); setSearching(false); } });
    return () => { active = false; };
  }, [debouncedSearch, adding]);

  // Fetch real videos for real channel IDs in the tracker
  useEffect(() => {
    const realIds = (tracker.channels || []).filter(id => id.startsWith('UC'));
    if (!realIds.length || !window.TubeAPI?.Keys?.hasYt()) return;
    let active = true;
    setLoadingVideos(true);
    Promise.all(realIds.map(id =>
      window.TubeAPI.fetchChannelWithVideos(id, 20)
        .then(data => data?.videos || [])
        .catch(() => [])
    )).then(all => { if (active) { setRealVideos(all.flat()); setLoadingVideos(false); } });
    return () => { active = false; };
  }, [JSON.stringify(tracker.channels)]);

  function updateTracker(patch) {
    setTrackers(trackers.map(t => t.id === tracker.id ? { ...t, ...patch } : t));
  }
  function addMockChannel(handle) {
    if (tracker.channels.includes(handle)) return;
    updateTracker({ channels: [...tracker.channels, handle] });
  }
  function addRealChannel(ch) {
    const id = ch.id || ch.handle;
    if (tracker.channels.includes(id)) return;
    const meta = { ...(tracker.channelMeta || {}), [id]: ch };
    updateTracker({ channels: [...tracker.channels, id], channelMeta: meta });
  }
  function removeChannel(id) {
    const meta = { ...(tracker.channelMeta || {}) };
    delete meta[id];
    updateTracker({ channels: tracker.channels.filter(c => c !== id), channelMeta: meta });
  }
  function addToTrackerFromSimilar(handle) {
    addMockChannel(handle);
  }

  function getChannelMeta(id) {
    return window.CHANNELS.find(c => c.handle === id) || (tracker.channelMeta || {})[id] || { handle: id, name: id, subs: 0, niche: '' };
  }

  const similar = useMemo(() => {
    const niches = new Set((tracker.channels || []).map(id => getChannelMeta(id)?.niche).filter(Boolean));
    if (!niches.size) return window.CHANNELS.slice(0, 8);
    return window.CHANNELS.filter(c => niches.has(c.niche) && !tracker.channels.includes(c.handle)).slice(0, 10);
  }, [tracker.channels, tracker.channelMeta]);

  const mockVideos = useMemo(() => {
    const handles = (tracker.channels || []).filter(id => !id.startsWith('UC'));
    return window.VIDEOS.filter(v => handles.includes(v.channel)).sort((a, b) => b.multiplier - a.multiplier);
  }, [tracker.channels]);

  const videos = useMemo(() => {
    const combined = [...(realVideos || []), ...mockVideos];
    return combined.sort((a, b) => b.multiplier - a.multiplier);
  }, [realVideos, mockVideos]);

  const stats = useMemo(() => {
    if (!videos.length && !tracker.channels?.length) return null;
    const avgMult = videos.length ? videos.reduce((a, v) => a + v.multiplier, 0) / videos.length : 0;
    const totalSubs = (tracker.channels || []).reduce((a, id) => a + (getChannelMeta(id)?.subs || 0), 0);
    const hot = videos.filter(v => v.multiplier >= 2.5).length;
    const recent = videos.filter(v => (v.daysAgo || 0) <= 30).length;
    return { avgMult, totalSubs, hot, recent };
  }, [videos, tracker.channels, tracker.channelMeta]);

  // Display search results (real API results take priority, else filter mock channels)
  const displayResults = apiResults || window.CHANNELS.filter(c =>
    !tracker.channels?.includes(c.handle) &&
    (!search || c.handle.toLowerCase().includes(search.toLowerCase()) || (c.name || '').toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--fg-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>Tracker</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", margin: "4px 0 6px" }}>{tracker.name}</h2>
          <div style={{ color: "var(--fg-mute)", fontSize: 14 }}>{tracker.channels?.length || 0} channel{tracker.channels?.length === 1 ? "" : "s"} · {videos.length} videos tracked</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn"><Icons.Bell size={14}/> Alerts</button>
          <button className="btn"><Icons.Share size={14}/> Share</button>
          <button className="btn btn-primary" onClick={() => setAdding(s => !s)}><Icons.Plus size={14}/> Add channel</button>
        </div>
      </div>

      {adding && (
        <div className="advanced-panel" style={{ gridTemplateColumns: "1fr", marginBottom: 18 }}>
          <div>
            <div className="adv-label">
              Search a channel to add
              {window.TubeAPI?.Keys?.hasYt() && <span style={{ color: 'var(--accent)', marginLeft: 8, fontSize: 11 }}>● Live YouTube search</span>}
            </div>
            <div style={{ position: 'relative' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="@channel name or keyword…"
                style={{ width: "100%", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 40px 10px 14px", outline: 0, fontSize: 14, boxSizing: 'border-box' }}/>
              {searching && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <Spinner size={16}/>
                </div>
              )}
            </div>
            {!window.TubeAPI?.Keys?.hasYt() && (
              <div style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 6 }}>
                Showing sample channels. Add a YouTube API key in Settings to search any channel.
              </div>
            )}
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {displayResults.map(c => {
                const isReal = c.isReal === true;
                const id = c.id || c.handle;
                return (
                  <button key={id} className="chan-card"
                    onClick={() => isReal ? addRealChannel(c) : addMockChannel(c.handle || id)}
                    style={{ flex: "unset", padding: 10 }}>
                    <Avatar handle={c.handle || id}/>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        @{c.handle || c.name || id}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>{fmtNum(c.subs || 0)} · {c.niche || 'YouTube'}</div>
                    </div>
                    <div className="chan-card-add"><Icons.Plus size={14}/></div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!tracker.channels?.length ? (
        <div className="empty">No channels yet. Click <strong>Add channel</strong> to start tracking competitors.</div>
      ) : (
        <>
          <div className="section-head"><div className="section-title">Tracked channels</div></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {tracker.channels.map(id => {
              const c = getChannelMeta(id);
              return (
                <div key={id} className="chip" style={{ padding: "6px 6px 6px 8px", gap: 8 }}>
                  <span onClick={() => onOpenChannel(id)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <Avatar handle={c.handle || id}/>
                    <span>@{c.handle || id}</span>
                    <span style={{ color: "var(--fg-dim)" }}>{fmtNum(c.subs || 0)}</span>
                  </span>
                  <button onClick={() => removeChannel(id)} style={{ padding: 4, color: "var(--fg-dim)" }}><Icons.X size={12}/></button>
                </div>
              );
            })}
          </div>

          {stats && (
            <div className="metric-row">
              <div className="metric"><div className="metric-label">Avg outlier</div><div className="metric-value">{stats.avgMult.toFixed(2)}x</div><div className="metric-delta mono">across tracked videos</div></div>
              <div className="metric"><div className="metric-label">Combined reach</div><div className="metric-value">{fmtNum(stats.totalSubs)}</div><div className="metric-delta mono">total subscribers</div></div>
              <div className="metric"><div className="metric-label">Hot videos</div><div className="metric-value">{stats.hot}</div><div className="metric-delta mono">multiplier ≥ 2.5×</div></div>
              <div className="metric"><div className="metric-label">Posted (30d)</div><div className="metric-value">{stats.recent}</div><div className="metric-delta mono">last month</div></div>
            </div>
          )}

          <div className="section-head"><div className="section-title">Similar channels</div><div className="section-link">based on niche overlap</div></div>
          <div className="chan-row">
            {similar.map(c => (
              <div key={c.handle} className="chan-card">
                <Avatar handle={c.handle} size="lg"/>
                <div style={{ minWidth: 0, flex: 1 }} onClick={() => onOpenChannel(c.handle)}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{c.handle}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-dim)" }}>{fmtNum(c.subs)} subs · {c.niche}</div>
                </div>
                <button className="chan-card-add" onClick={e => { e.stopPropagation(); addToTrackerFromSimilar(c.handle); }} title="Add to tracker">
                  <Icons.Plus size={14}/>
                </button>
              </div>
            ))}
          </div>

          <div className="section-head">
            <div className="section-title">Ranked videos</div>
            <div className="section-link mono" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loadingVideos ? <><Spinner size={13}/> loading…</> : `${videos.length} total · sorted by outlier`}
              {realVideos && !loadingVideos && <span style={{ color: 'var(--accent)', fontSize: 11 }}>● LIVE</span>}
            </div>
          </div>
          {loadingVideos && !videos.length
            ? <VideoSkeletons count={6}/>
            : <VideoGrid videos={videos} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
          }

          {window.TrackerPatternLab && <window.TrackerPatternLab tracker={tracker} onOpenVideo={onOpenVideo} onOpenChannel={onOpenChannel}/>}
        </>
      )}
    </div>
  );
}

/* ======================= CHANNEL DEEP DIVE ======================= */
function ChannelPage({ handle, onOpenVideo, onOpenChannel, onBack, trackers, setTrackers, bookmarks, toggleBookmark }) {
  const [realData, setRealData] = useState(null);
  const [loading, setLoading] = useState(false);

  // If handle is a YouTube channel ID (starts with UC), always fetch real data.
  // If it's a mock handle, fetch real data as enrichment if API key present.
  const isRealId = handle?.startsWith('UC');

  useEffect(() => {
    if (!window.TubeAPI?.Keys?.hasYt()) return;
    let active = true;
    setLoading(true);
    window.TubeAPI.fetchChannelWithVideos(handle, 30)
      .then(data => { if (active) { setRealData(data); setLoading(false); } })
      .catch(() => { if (active) { setLoading(false); } });
    return () => { active = false; };
  }, [handle]);

  const channel = realData?.channel || window.CHANNELS.find(c => c.handle === handle) || { handle, name: handle, subs: 0, avgViews: 0, niche: '', colors: ['#5b8cff', '#1e3a8a'] };
  const videos = useMemo(() => {
    if (realData) return [...realData.videos].sort((a, b) => b.multiplier - a.multiplier);
    return window.VIDEOS.filter(v => v.channel === handle).sort((a, b) => window.agoDays(a.ago) - window.agoDays(b.ago));
  }, [handle, realData]);

  const similar = useMemo(() => window.CHANNELS.filter(c => c.niche === channel?.niche && c.handle !== handle).slice(0, 8), [handle, channel]);
  const sparkData = videos.slice(0, 12).map(v => v.views).reverse();
  const avgMult = videos.reduce((a, v) => a + v.multiplier, 0) / (videos.length || 1);
  const bestVideo = videos.slice().sort((a, b) => b.multiplier - a.multiplier)[0];

  const formatCount = {};
  videos.forEach(v => { formatCount[v.format || 'Other'] = (formatCount[v.format || 'Other'] || 0) + 1; });
  const topFormats = Object.entries(formatCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const [showTrackerMenu, setShowTrackerMenu] = useState(false);
  function addToTracker(trackerId) {
    setTrackers(trackers.map(t => t.id === trackerId && !t.channels.includes(handle) ? { ...t, channels: [...t.channels, handle] } : t));
  }

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: 18 }}><Icons.Back size={14}/> Back</button>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, color: 'var(--fg-mute)', fontSize: 13 }}>
          <Spinner size={16}/> Loading live channel data…
        </div>
      )}

      <div className="channel-hero">
        <Avatar handle={channel.handle || handle} size="xl"/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "var(--fg-dim)", letterSpacing: ".08em", textTransform: "uppercase" }}>{channel.niche || 'YouTube'} channel</div>
          <h1 className="page-title" style={{ marginTop: 4 }}>@{channel.handle || handle}</h1>
          <div style={{ color: "var(--fg-mute)", fontSize: 14, marginTop: 6 }}>
            {channel.name} · {fmtNum(channel.subs || 0)} subscribers · {videos.length} tracked videos
            {realData && <span style={{ color: 'var(--accent)', marginLeft: 10, fontSize: 12 }}>● LIVE</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, position: "relative" }}>
          <button className="btn"><Icons.Bell size={14}/> Watch</button>
          <button className="btn btn-primary" onClick={() => setShowTrackerMenu(s => !s)}><Icons.Plus size={14}/> Add to tracker</button>
          {showTrackerMenu && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, padding: 6, minWidth: 220, zIndex: 20, boxShadow: "0 8px 32px rgba(0,0,0,.45)" }}>
              {trackers.map(t => {
                const has = t.channels?.includes(handle);
                return (
                  <button key={t.id} onClick={() => { addToTracker(t.id); setShowTrackerMenu(false); }}
                    className="tracker-row" disabled={has} style={{ opacity: has ? 0.5 : 1 }}>
                    <Icons.Folder size={14} style={{ color: "var(--accent)" }}/>
                    <span style={{ flex: 1, textAlign: "left", fontSize: 13 }}>{t.name}</span>
                    {has && <Icons.Check size={14}/>}
                  </button>
                );
              })}
              {!trackers.length && <div style={{ padding: 14, fontSize: 12, color: "var(--fg-dim)" }}>No trackers yet.</div>}
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
          <div className="metric-value">{fmtNum(channel.avgViews || 0)}</div>
          <div className="metric-delta mono">per video</div>
        </div>
        <div className="metric">
          <div className="metric-label">Best multiplier</div>
          <div className="metric-value">{bestVideo?.multiplier.toFixed(1) || '—'}x</div>
          <div className="metric-delta mono">{bestVideo ? `"${bestVideo.title.slice(0, 30)}…"` : 'no videos'}</div>
        </div>
        <div className="metric" style={{ padding: 14 }}>
          <div className="metric-label">Recent trajectory</div>
          <div style={{ marginTop: 8, height: 56 }}>
            <Sparkline data={sparkData.length > 1 ? sparkData : [1, 2]} h={56}/>
          </div>
        </div>
      </div>

      {topFormats.length > 0 && (
        <>
          <div className="section-head"><div className="section-title">What works on this channel</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 22 }}>
            {topFormats.map(([fmt, count]) => (
              <div key={fmt} className="metric">
                <div className="metric-label">Format</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{fmt}</div>
                <div className="metric-delta mono">{count} video{count === 1 ? "" : "s"} · used repeatedly</div>
              </div>
            ))}
          </div>
        </>
      )}

      {similar.length > 0 && (
        <>
          <div className="section-head"><div className="section-title">Similar channels</div></div>
          <div className="chan-row">
            {similar.map(c => (
              <div key={c.handle} className="chan-card" onClick={() => onOpenChannel(c.handle)}>
                <Avatar handle={c.handle} size="lg"/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{c.handle}</div>
                  <div style={{ fontSize: 12, color: "var(--fg-dim)" }}>{fmtNum(c.subs)} · {c.niche}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-head"><div className="section-title">All videos</div></div>
      {loading && !videos.length ? <VideoSkeletons count={8}/> :
        <VideoGrid videos={videos} onOpen={onOpenVideo} onOpenChannel={onOpenChannel} bookmarks={bookmarks} onBookmark={toggleBookmark}/>
      }
    </div>
  );
}
window.ChannelPage = ChannelPage;
