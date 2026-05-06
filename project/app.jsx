// Main app shell — sidebar, top search, routing
const { Icons, Avatar, Outlier, fmtNum, classNames, Thumb } = window;
const { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#a3ff3b",
  "density": "cozy",
  "theme": "dark",
  "sidebarWidth": 244,
  "thumbAspect": "16/9"
}/*EDITMODE-END*/;

const NAV = [
  { section: "Outliers", items: [
    { id: "home",     label: "Home",           icon: "Home" },
    { id: "discover", label: "Discovery Lab",   icon: "Compass", pill: "AI" },
    { id: "trackers", label: "Trackers",        icon: "Folder" },
    { id: "bookmarks",label: "Bookmarks",       icon: "Bookmark" },
  ]},
  { section: "Create", items: [
    { id: "idea",  label: "Idea generator",      icon: "Bulb" },
    { id: "title", label: "Title generator",     icon: "Type" },
    { id: "thumb", label: "Thumbnail generator", icon: "Image" },
  ]},
  { section: "Analyze", items: [
    { id: "thumbnail-winners", label: "Thumbnail Winners", icon: "Trophy" },
    { id: "trending-formats",  label: "Trending Formats",  icon: "Trend", pill: "New" },
    { id: "compare",           label: "Compare videos",    icon: "Eye" },
    { id: "thumb-mockup",      label: "Thumbnail mockup",  icon: "Image" },
  ]},
];

/* ── Sidebar ── */
function Sidebar({ route, navigate, myChannel, hasKeys }) {
  const myCh = window.CHANNELS.find(c => c.handle === myChannel);
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">T</div>
        <div>
          <div className="brand-name">TubeAnalyzer</div>
          <div className="brand-sub">Outlier engine</div>
        </div>
      </div>

      {NAV.map(group => (
        <div key={group.section}>
          <div className="nav-section">{group.section}</div>
          {group.items.map(item => {
            const I = Icons[item.icon];
            const active = route.page === item.id;
            return (
              <button key={item.id} className={classNames("nav-item", active && "active")} onClick={() => navigate({ page: item.id })}>
                <span className="nav-icon"><I size={16}/></span>
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                {item.pill && <span className="nav-pill">{item.pill}</span>}
              </button>
            );
          })}
        </div>
      ))}

      <div className="sidebar-foot">
        {/* API status indicator */}
        <div style={{ padding: "8px 14px", marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
              background: hasKeys.yt ? 'var(--accent)22' : 'var(--bg-3)',
              color: hasKeys.yt ? 'var(--accent)' : 'var(--fg-dim)' }}>
              {hasKeys.yt ? '● YouTube' : '○ YouTube'}
            </span>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
              background: hasKeys.gemini ? 'var(--accent)22' : 'var(--bg-3)',
              color: hasKeys.gemini ? 'var(--accent)' : 'var(--fg-dim)' }}>
              {hasKeys.gemini ? '● Gemini' : '○ Gemini AI'}
            </span>
          </div>
        </div>

        <button className={classNames("nav-item", route.page === "settings" && "active")}
          onClick={() => navigate({ page: "settings" })}>
          <span className="nav-icon"><Icons.Edit size={16}/></span>
          <span style={{ flex: 1, textAlign: "left" }}>Settings & API keys</span>
        </button>

        <button className="nav-item">
          <Avatar handle={myChannel || "TechSlate"}/>
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              @{myCh?.handle || myChannel || 'My Channel'}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
              {myCh ? fmtNum(myCh.subs) + ' subs' : 'Your channel'}
            </div>
          </div>
          <Icons.ChevronD size={14} style={{ color: "var(--fg-dim)" }}/>
        </button>
      </div>
    </aside>
  );
}

/* ── TopBar ── */
function TopBar({ search, setSearch, onSearchSelect, navigate, videoMap }) {
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => {
    if (!search) return null;
    const s = search.toLowerCase();
    const channels = window.CHANNELS.filter(c => c.handle.toLowerCase().includes(s) || (c.name || '').toLowerCase().includes(s)).slice(0, 3);
    // Search mock videos + cached real videos
    const allVids = [...window.VIDEOS, ...Array.from(videoMap.values()).filter(v => !window.VIDEOS.find(m => m.id === v.id))];
    const videos  = allVids.filter(v => (v.title || '').toLowerCase().includes(s)).slice(0, 5);
    const niches  = window.NICHES.filter(n => n.toLowerCase().includes(s)).slice(0, 3);
    return { channels, videos, niches };
  }, [search, videoMap]);

  const showResults = focused && search && results && (results.channels.length || results.videos.length || results.niches.length);

  return (
    <div className="topbar">
      <div className="search" style={{ position: "relative" }}>
        <Icons.Search size={16} style={{ color: "var(--fg-dim)" }}/>
        <input
          placeholder="Search videos, channels, niches…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
        />
        {search && <button onClick={() => setSearch("")} style={{ color: "var(--fg-dim)", padding: 4 }}><Icons.X size={14}/></button>}
        <span className="kbd mono">⌘K</span>
        {showResults && (
          <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", background: "var(--bg-1)", border: "1px solid var(--line)", borderRadius: 12, padding: 6, maxHeight: 420, overflowY: "auto", zIndex: 30, boxShadow: "0 12px 40px rgba(0,0,0,.5)" }}>
            {results.channels.length > 0 && <div className="nav-section" style={{ padding: "6px 10px" }}>Channels</div>}
            {results.channels.map(c => (
              <button key={c.handle} className="nav-item" onClick={() => onSearchSelect({ type: "channel", id: c.handle })}>
                <Avatar handle={c.handle}/>
                <span style={{ flex: 1, textAlign: "left" }}>@{c.handle} <span style={{ color: "var(--fg-dim)" }}>· {fmtNum(c.subs)}</span></span>
              </button>
            ))}
            {results.niches.length > 0 && <div className="nav-section" style={{ padding: "6px 10px" }}>Niches</div>}
            {results.niches.map(n => (
              <button key={n} className="nav-item" onClick={() => onSearchSelect({ type: "niche", id: n })}>
                <Icons.Compass size={14} style={{ color: "var(--accent)" }}/>
                <span style={{ flex: 1, textAlign: "left" }}>{n}</span>
              </button>
            ))}
            {results.videos.length > 0 && <div className="nav-section" style={{ padding: "6px 10px" }}>Videos</div>}
            {results.videos.map(v => (
              <button key={v.id} className="nav-item" onClick={() => onSearchSelect({ type: "video", v })}>
                <div style={{ width: 60, height: 34, borderRadius: 6, background: "var(--bg-2)", overflow: "hidden", position: "relative", flex: "0 0 60px" }}>
                  <Thumb video={v}/>
                </div>
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.title}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>@{v.channel} · {fmtNum(v.views)} views · {v.multiplier?.toFixed(1)}x</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <button className="btn" onClick={() => {
        const all = window.VIDEOS;
        const v = all[Math.floor(Math.random() * all.length)];
        if (v) onSearchSelect({ type: "video", v });
      }}>
        <Icons.Sparkle size={14}/> Random outlier
      </button>
      <button className="btn btn-icon" onClick={() => navigate({ page: "settings" })} title="Settings">
        <Icons.Edit size={16}/>
      </button>
    </div>
  );
}

/* ── App ── */
function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--sidebar-w", t.sidebarWidth + "px");
    root.style.setProperty("--thumb-ar", t.thumbAspect);
    root.setAttribute("data-density", t.density);
    root.setAttribute("data-theme", t.theme);
  }, [t]);

  // ── Setup state ──
  const [setupDone, setSetupDone] = useState(() => {
    return !!(localStorage.getItem('ta_setup_done') ||
              window.TubeAPI?.Keys?.hasYt() ||
              window.TubeAPI?.Keys?.hasGemini());
  });
  function handleSetupDone(mode) {
    localStorage.setItem('ta_setup_done', mode);
    setSetupDone(true);
    refreshKeyStatus();
  }

  // ── API key status ──
  const [hasKeys, setHasKeys] = useState({
    yt: !!window.TubeAPI?.Keys?.hasYt(),
    gemini: !!window.TubeAPI?.Keys?.hasGemini(),
  });
  function refreshKeyStatus() {
    setHasKeys({
      yt: !!window.TubeAPI?.Keys?.hasYt(),
      gemini: !!window.TubeAPI?.Keys?.hasGemini(),
    });
  }

  // ── Routing ──
  const [route, setRoute] = useState({ page: "home" });
  const [history, setHistory] = useState([]);
  function navigate(next) { setHistory(h => [...h, route]); setRoute(next); }
  function back() {
    setHistory(h => {
      if (!h.length) { setRoute({ page: "home" }); return h; }
      const last = h[h.length - 1]; setRoute(last); return h.slice(0, -1);
    });
  }
  function navRoot(page) { setHistory([]); setRoute({ page }); }

  // ── Filters ──
  const [filters, setFilters] = useState({
    niche: "All", multRange: [0.5, 6], subsRange: [0, 5_000_000],
    lengthRange: [0, 60 * 60], ageDays: 365, sort: "recent",
  });
  const [search, setSearch] = useState("");

  // ── Trackers (persisted) ──
  const [trackers, setTrackers] = useState(() => {
    try {
      const raw = localStorage.getItem("ta_trackers");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: "t_horror", name: "Horror creators",  channels: ["GhostStreetCo"], channelMeta: {} },
      { id: "t_money",  name: "Money & finance",   channels: ["AlexHormoziCuts", "LedgerLine", "CryptoFloor"], channelMeta: {} },
    ];
  });
  const [activeTracker, setActiveTracker] = useState(() => trackers[0]?.id || null);
  useEffect(() => { localStorage.setItem("ta_trackers", JSON.stringify(trackers)); }, [trackers]);

  // ── Bookmarks ──
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ta_bookmarks")) || []; } catch (e) { return []; }
  });
  function toggleBookmark(id) { setBookmarks(b => b.includes(id) ? b.filter(x => x !== id) : [...b, id]); }
  useEffect(() => { localStorage.setItem("ta_bookmarks", JSON.stringify(bookmarks)); }, [bookmarks]);

  // ── Video cache for real videos (for bookmarks + search) ──
  const [videoMap, setVideoMap] = useState(() => new Map());
  function cacheVideos(videos) {
    if (!videos?.length) return;
    setVideoMap(prev => {
      const next = new Map(prev);
      videos.forEach(v => { if (v?.id) next.set(v.id, v); });
      return next;
    });
  }

  // ── My channel ──
  const [myChannel, setMyChannel] = useState(() => localStorage.getItem("ta_my_channel") || window.MY_CHANNEL_DEFAULT);
  useEffect(() => { localStorage.setItem("ta_my_channel", myChannel); }, [myChannel]);

  // ── Navigation helpers ──
  function openVideo(v) {
    if (v?.id) cacheVideos([v]);
    navigate({ page: "video", id: v.id, video: v });
  }
  function openChannel(handle) { navigate({ page: "channel", id: handle }); }
  function goToSettings() { navigate({ page: "settings" }); }

  function onSearchSelect(sel) {
    setSearch("");
    if (sel.type === "channel") openChannel(sel.id);
    if (sel.type === "video") {
      if (sel.v) { openVideo(sel.v); return; }
      const v = window.VIDEOS.find(v => v.id === sel.id) || videoMap.get(sel.id);
      if (v) openVideo(v);
    }
    if (sel.type === "niche") {
      setFilters(f => ({ ...f, niche: sel.id }));
      navRoot("home");
    }
  }

  // Refresh key status when returning to settings page
  useEffect(() => {
    if (route.page === "settings") refreshKeyStatus();
  }, [route.page]);

  // ── Show setup page on first run ──
  if (!setupDone) {
    return (
      <div className="app" style={{ display: 'block' }}>
        <window.SetupPage onDone={handleSetupDone}/>
      </div>
    );
  }

  // ── Route → body ──
  const videoCache = Array.from(videoMap.values());
  let body;

  if (route.page === "home") {
    body = <window.HomePage
      filters={filters} setFilters={setFilters} search={search}
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
      niches={window.NICHES} myChannel={myChannel} trackers={trackers}
      onGoToSettings={goToSettings}
    />;
  } else if (route.page === "discover") {
    body = <window.DiscoverPage
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
      myChannel={myChannel} trackers={trackers}
    />;
  } else if (route.page === "trackers") {
    body = <window.TrackersPage
      trackers={trackers} setTrackers={setTrackers}
      activeTracker={activeTracker} setActiveTracker={setActiveTracker}
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
    />;
  } else if (route.page === "bookmarks") {
    body = <window.BookmarksPage
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      videoCache={videoCache}
    />;
  } else if (route.page === "channel") {
    body = <window.ChannelPage
      handle={route.id} onOpenVideo={openVideo} onOpenChannel={openChannel} onBack={back}
      trackers={trackers} setTrackers={setTrackers}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
    />;
  } else if (route.page === "video") {
    const v = route.video || videoMap.get(route.id) || window.VIDEOS.find(v => v.id === route.id);
    body = v
      ? <window.VideoPage video={v} onBack={back} onOpenChannel={openChannel} onOpenVideo={openVideo} bookmarks={bookmarks} toggleBookmark={toggleBookmark}/>
      : <div className="page"><div className="empty">Video not found.</div></div>;
  } else if (route.page === "trending-formats") {
    body = <window.TrendingFormatsPage
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
      myChannel={myChannel} trackers={trackers}
    />;
  } else if (route.page === "thumbnail-winners") {
    body = <window.ThumbnailWinnersPage
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark}
    />;
  } else if (route.page === "idea") {
    body = <window.IdeaGeneratorPage myChannel={myChannel} setMyChannel={setMyChannel} trackers={trackers}/>;
  } else if (route.page === "title") {
    body = <window.TitleGeneratorPage myChannel={myChannel} setMyChannel={setMyChannel} trackers={trackers}/>;
  } else if (route.page === "thumb") {
    body = <window.ThumbGeneratorPage myChannel={myChannel} setMyChannel={setMyChannel} trackers={trackers}/>;
  } else if (route.page === "compare") {
    body = <window.CompareVideosPage
      onOpenVideo={openVideo} onOpenChannel={openChannel}
      bookmarks={bookmarks} toggleBookmark={toggleBookmark} trackers={trackers}
    />;
  } else if (route.page === "thumb-mockup") {
    body = <window.ThumbMockupPage onOpenVideo={openVideo} bookmarks={bookmarks} trackers={trackers} myChannel={myChannel}/>;
  } else if (route.page === "settings") {
    body = <window.SettingsPage/>;
  } else {
    body = <div className="page"><div className="empty">Page not found.</div></div>;
  }

  return (
    <div className="app">
      <Sidebar route={route} navigate={navRoot} myChannel={myChannel} hasKeys={hasKeys}/>
      <div className="main">
        <TopBar search={search} setSearch={setSearch} onSearchSelect={onSearchSelect} navigate={navigate} videoMap={videoMap}/>
        {body}
      </div>
      <window.TweaksPanelHost t={t} setTweak={setTweak}/>
    </div>
  );
}
window.App = App;

/* ── Tweaks panel host ── */
function TweaksPanelHost({ t, setTweak }) {
  const { TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakColor, TweakSlider } = window;
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Theme">
        <TweakRadio label="Mode" value={t.theme} onChange={v => setTweak("theme", v)}
          options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]}/>
      </TweakSection>
      <TweakSection label="Accent">
        <TweakColor label="Color" value={t.accent} onChange={v => setTweak("accent", v)}
          options={["#a3ff3b", "#5b8cff", "#ff8a3b", "#ec4899", "#facc15"]}/>
      </TweakSection>
      <TweakSection label="Layout">
        <TweakRadio label="Density" value={t.density} onChange={v => setTweak("density", v)}
          options={[{ value: "compact", label: "Compact" }, { value: "cozy", label: "Cozy" }, { value: "spacious", label: "Spacious" }]}/>
        <TweakSlider label="Sidebar width" min={200} max={300} step={4} value={t.sidebarWidth} onChange={v => setTweak("sidebarWidth", v)} unit="px"/>
        <TweakSelect label="Thumbnail aspect" value={t.thumbAspect} onChange={v => setTweak("thumbAspect", v)} options={[
          { value: "16/9", label: "16:9 (YouTube)" },
          { value: "4/3",  label: "4:3" },
          { value: "1/1",  label: "1:1 square" },
          { value: "3/2",  label: "3:2" },
        ]}/>
      </TweakSection>
    </TweaksPanel>
  );
}
window.TweaksPanelHost = TweaksPanelHost;

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
