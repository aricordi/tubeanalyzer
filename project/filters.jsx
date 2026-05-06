// Filter bar + video card + grid
const { Outlier, Thumb, Avatar, Icons, fmtNum, RangeSlider, classNames } = window;

function VideoCard({ video, onOpen, onOpenChannel, bookmarked, onBookmark }) {
  return (
    <div className="card" onClick={()=>onOpen(video)}>
      <div className="card-thumb">
        <Thumb video={video}/>
        <div className="card-outlier"><Outlier m={video.multiplier}/></div>
        <button className="card-bookmark" onClick={(e)=>{e.stopPropagation(); onBookmark(video.id);}}>
          <Icons.Bookmark size={14} fill={bookmarked?"currentColor":"none"}/>
        </button>
        <div className="card-duration mono">{video.length}</div>
      </div>
      <div className="card-body">
        <h3 className="card-title">{video.title}</h3>
        <div className="card-meta" onClick={(e)=>{e.stopPropagation(); onOpenChannel(video.channel);}}>
          <Avatar handle={video.channel}/>
          <span style={{cursor:"pointer"}}>@{video.channel}</span>
          <span style={{color:"var(--fg-dim)"}}>·</span>
          <span>{fmtNum(video.subs)} subs</span>
        </div>
        <div className="card-stats mono">
          <span>{fmtNum(video.views)} views vs {fmtNum(video.avgViews)} avg</span>
          <span>{video.ago}</span>
        </div>
      </div>
    </div>
  );
}
window.VideoCard = VideoCard;

function FilterBar({ filters, setFilters, niches }) {
  const [showAdv, setShowAdv] = useState(false);
  const f = filters;
  function set(k, v) { setFilters({ ...f, [k]: v }); }
  function clear() {
    setFilters({ niche:"All", multRange:[0,100], subsRange:[0,100_000_000], lengthRange:[0, 60*60], ageDays: 365, sort: "recent" });
  }
  const activeCount =
    (f.niche!=="All"?1:0) +
    (f.multRange[0]>0||f.multRange[1]<100?1:0) +
    (f.subsRange[0]>0||f.subsRange[1]<100_000_000?1:0) +
    (f.lengthRange[0]>0||f.lengthRange[1]<60*60?1:0) +
    (f.ageDays<365?1:0);
  return (
    <div>
      <div className="filterbar">
        <button className={classNames("chip","chip-accent", f.multRange[0]>=2.5 && "active")}
          onClick={()=>set("multRange", f.multRange[0]>=2.5?[0,100]:[2.5,100])}>
          🔥 Hot outliers
        </button>
        <button className={classNames("chip", f.ageDays<=7 && "active")} onClick={()=>set("ageDays", f.ageDays<=7?365:7)}>Last week</button>
        <button className={classNames("chip", f.ageDays<=30 && f.ageDays>7 && "active")} onClick={()=>set("ageDays", 30)}>Last month</button>
        <div className="filter-divider"></div>
        <select value={f.niche} onChange={(e)=>set("niche", e.target.value)}
          className="chip" style={{ paddingRight: 24, appearance:"none", cursor:"pointer" }}>
          {["All", ...niches].map(n => <option key={n} value={n}>{n==="All"?"All niches":n}</option>)}
        </select>
        <select value={f.sort} onChange={(e)=>set("sort", e.target.value)}
          className="chip" style={{ paddingRight: 24, appearance:"none", cursor:"pointer" }}>
          <option value="recent">Newest</option>
          <option value="multiplier">Highest outlier</option>
          <option value="views">Most viewed</option>
          <option value="subsAsc">Smallest channel</option>
        </select>
        <div style={{flex:1}}></div>
        <button className="chip" onClick={clear} style={{color: activeCount?"var(--fg)":"var(--fg-dim)"}}>
          Clear{activeCount?` (${activeCount})`:""}
        </button>
        <button className="btn btn-ghost" onClick={()=>setShowAdv(s=>!s)} style={{padding:"7px 12px"}}>
          <Icons.Filter size={14}/> Advanced
          <Icons.ChevronD size={14} style={{transform: showAdv?"rotate(180deg)":"none", transition:"transform .2s"}}/>
        </button>
      </div>
      {showAdv && (
        <div className="advanced-panel">
          <div>
            <div className="adv-label">Outlier multiplier</div>
            <RangeSlider min={0} max={100} step={0.5} value={f.multRange} onChange={(v)=>set("multRange",v)} format={(v)=>v.toFixed(1)+"x"}/>
          </div>
          <div>
            <div className="adv-label">Channel subscribers</div>
            <RangeSlider min={0} max={100_000_000} step={100_000} value={f.subsRange} onChange={(v)=>set("subsRange",v)} format={(v)=>fmtNum(v)}/>
          </div>
          <div>
            <div className="adv-label">Video length (sec)</div>
            <RangeSlider min={0} max={60*60} step={30} value={f.lengthRange} onChange={(v)=>set("lengthRange",v)} format={(v)=>{const m=Math.floor(v/60),s=v%60; return `${m}:${String(s).padStart(2,"0")}`;}}/>
          </div>
          <div style={{gridColumn:"1 / -1"}}>
            <div className="adv-label">Posted within</div>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              {[7,14,30,90,180,365].map(d=>(
                <button key={d} className={classNames("chip", f.ageDays===d && "active")} onClick={()=>set("ageDays", d)}>
                  {d===7?"1 week": d===14?"2 weeks": d===30?"1 month": d===90?"3 months": d===180?"6 months":"1 year"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
window.FilterBar = FilterBar;

function applyFilters(videos, f, search) {
  return videos.filter(v => {
    if (f.niche!=="All" && v.niche !== f.niche) return false;
    if (v.multiplier < f.multRange[0] || v.multiplier > f.multRange[1]) return false;
    if (v.subs < f.subsRange[0] || v.subs > f.subsRange[1]) return false;
    const ls = window.lengthSec(v.length);
    if (ls < f.lengthRange[0] || ls > f.lengthRange[1]) return false;
    if (window.agoDays(v.ago) > f.ageDays) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(v.title.toLowerCase().includes(s) || v.channel.toLowerCase().includes(s) || v.niche.toLowerCase().includes(s))) return false;
    }
    return true;
  }).sort((a,b)=>{
    if (f.sort==="multiplier") return b.multiplier - a.multiplier;
    if (f.sort==="views") return b.views - a.views;
    if (f.sort==="subsAsc") return a.subs - b.subs;
    return window.agoDays(a.ago) - window.agoDays(b.ago);
  });
}
window.applyFilters = applyFilters;

function VideoGrid({ videos, onOpen, onOpenChannel, bookmarks, onBookmark }) {
  if (!videos.length) return <div className="empty">No videos match these filters. Try widening your range.</div>;
  return (
    <div className="grid">
      {videos.map(v => (
        <VideoCard key={v.id} video={v} onOpen={onOpen} onOpenChannel={onOpenChannel}
          bookmarked={bookmarks.includes(v.id)} onBookmark={onBookmark}/>
      ))}
    </div>
  );
}
window.VideoGrid = VideoGrid;
