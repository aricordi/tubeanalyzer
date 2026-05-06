// Shared atoms / helpers / icons
const { useState, useEffect, useMemo, useRef, useLayoutEffect } = React;

function fmtNum(n) {
  if (n >= 1_000_000) return (n/1_000_000).toFixed(n>=10_000_000?0:1).replace(/\.0$/,"") + "M";
  if (n >= 1_000) return Math.round(n/1_000) + "K";
  return String(n);
}
function classNames(...x) { return x.filter(Boolean).join(" "); }

// Heat color for outlier multiplier
function outlierHeat(m) {
  if (m < 1) return { bg: "#1f3a8a22", fg: "#7aa2ff", ring: "#3b82f6" };
  if (m < 1.5) return { bg: "#0c4a6e33", fg: "#67e8f9", ring: "#22d3ee" };
  if (m < 2.5) return { bg: "#facc1522", fg: "#facc15", ring: "#facc15" };
  if (m < 4)   return { bg: "#f9731633", fg: "#fdba74", ring: "#f97316" };
  return                { bg: "#ef444433", fg: "#fca5a5", ring: "#ef4444" };
}

function Outlier({ m, size }) {
  const c = outlierHeat(m);
  return (
    <span className="outlier" style={{ background: c.bg, color: c.fg, fontSize: size==="lg"?14:12, padding: size==="lg"?"6px 12px":"4px 10px" }}>
      <span className="outlier-dot" style={{ background: c.ring }}></span>
      {m.toFixed(1)}x
    </span>
  );
}
window.Outlier = Outlier;
window.outlierHeat = outlierHeat;
window.fmtNum = fmtNum;
window.classNames = classNames;

// Icons (24x24 stroke=1.6, currentColor)
const Icon = ({ d, size=18, fill="none", stroke="currentColor", sw=1.6, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>{d}</svg>
);
window.Icons = {
  Home:    (p)=> <Icon {...p} d={<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/></>}/>,
  Folder:  (p)=> <Icon {...p} d={<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>}/>,
  Bookmark:(p)=> <Icon {...p} d={<path d="M6 4h12v17l-6-4-6 4z"/>}/>,
  Bulb:    (p)=> <Icon {...p} d={<><path d="M9 18h6"/><path d="M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5C9.5 16 9 15 8 14z"/></>}/>,
  Type:    (p)=> <Icon {...p} d={<><path d="M5 6h14"/><path d="M12 6v14"/></>}/>,
  Image:   (p)=> <Icon {...p} d={<><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/></>}/>,
  Trophy:  (p)=> <Icon {...p} d={<><path d="M8 5h8v4a4 4 0 1 1-8 0z"/><path d="M16 7h3v2a3 3 0 0 1-3 3"/><path d="M8 7H5v2a3 3 0 0 0 3 3"/><path d="M10 13v3h4v-3"/><path d="M8 19h8"/></>}/>,
  Trend:   (p)=> <Icon {...p} d={<><path d="m4 16 4-4 4 3 6-7"/><path d="M16 8h4v4"/></>}/>,
  Search:  (p)=> <Icon {...p} d={<><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></>}/>,
  Plus:    (p)=> <Icon {...p} d={<><path d="M12 5v14"/><path d="M5 12h14"/></>}/>,
  Filter:  (p)=> <Icon {...p} d={<path d="M4 5h16l-6 8v6l-4-2v-4z"/>}/>,
  Sort:    (p)=> <Icon {...p} d={<><path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m13 16 4 4 4-4"/></>}/>,
  Chevron: (p)=> <Icon {...p} d={<path d="m9 6 6 6-6 6"/>}/>,
  ChevronD:(p)=> <Icon {...p} d={<path d="m6 9 6 6 6-6"/>}/>,
  Bell:    (p)=> <Icon {...p} d={<><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></>}/>,
  Trash:   (p)=> <Icon {...p} d={<><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/></>}/>,
  Refresh: (p)=> <Icon {...p} d={<><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>}/>,
  Edit:    (p)=> <Icon {...p} d={<><path d="M4 20h4l11-11-4-4L4 16z"/><path d="m13 6 4 4"/></>}/>,
  Share:   (p)=> <Icon {...p} d={<><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8 11 8-4"/><path d="m8 13 8 4"/></>}/>,
  Eye:     (p)=> <Icon {...p} d={<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>}/>,
  Sparkle: (p)=> <Icon {...p} d={<><path d="M12 4v4"/><path d="M12 16v4"/><path d="M4 12h4"/><path d="M16 12h4"/><path d="m6 6 2 2"/><path d="m16 16 2 2"/><path d="m6 18 2-2"/><path d="m16 8 2-2"/></>}/>,
  Check:   (p)=> <Icon {...p} d={<path d="m4 12 5 5L20 6"/>}/>,
  X:       (p)=> <Icon {...p} d={<><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>}/>,
  Arrow:   (p)=> <Icon {...p} d={<><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>}/>,
  Back:    (p)=> <Icon {...p} d={<><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>}/>,
  Star:    (p)=> <Icon {...p} d={<path d="m12 4 2.5 5.5 6 .8-4.4 4.2 1.1 6L12 17.6 6.8 20.5l1.1-6L3.5 10.3l6-.8z"/>}/>,
  Users:   (p)=> <Icon {...p} d={<><circle cx="9" cy="9" r="3"/><path d="M3 19c1-3.5 4-5 6-5s5 1.5 6 5"/><circle cx="17" cy="8" r="2.5"/><path d="M16 13c2 .3 4 1.7 5 5"/></>}/>,
  Clock:   (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  Compass: (p)=> <Icon {...p} d={<><circle cx="12" cy="12" r="9"/><path d="m9 15 2-6 6-2-2 6z"/></>}/>,
};

// Avatar — initials + gradient by handle
function Avatar({ handle, size }) {
  const colors = (window.CHANNELS.find(c=>c.handle===handle)?.colors) || ["#5b8cff","#1e3a8a"];
  const initials = handle.replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase();
  const cls = size==="xl" ? "avatar avatar-xl" : size==="lg" ? "avatar avatar-lg" : "avatar";
  return (
    <div className={cls} style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}>
      {initials}
    </div>
  );
}
window.Avatar = Avatar;

// Loading spinner
function Spinner({ size = 24, color = "var(--accent)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray="28 57" strokeLinecap="round"/>
    </svg>
  );
}
window.Spinner = Spinner;

// Skeleton shimmer block
function Skeleton({ w = "100%", h = 16, radius = 6, style: extra }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      ...extra,
    }}/>
  );
}
window.Skeleton = Skeleton;

// Synthetic thumbnail — varies by thumbStyle; shows real image if video.thumbnail exists
function Thumb({ video, big }) {
  const [imgErr, setImgErr] = useState(false);

  // Real YouTube thumbnail
  if (video.thumbnail && !imgErr) {
    return (
      <div className="card-thumb-inner" style={{ background: "#000", overflow: "hidden" }}>
        <img
          src={video.thumbnail}
          alt={video.title}
          onError={() => setImgErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  // Synthetic fallback
  const [c1, c2] = video.colors || ["#5b8cff", "#1e3a8a"];
  const titleShort = video.title.split(" ").slice(0,3).join(" ");
  const styles = {
    0: { bg: `linear-gradient(135deg, ${c1}, ${c2})`, content: <div className="thumb-bigtext">{video.title.match(/\d+/)?.[0] || "WHY"}</div> },
    1: { bg: `linear-gradient(135deg, ${c2}, ${c1})`, content: <div className="thumb-title">{titleShort}</div>, tag: "RUN!" },
    2: { bg: `radial-gradient(circle at 30% 50%, ${c1}, ${c2})`, content: null, circle: true, tag: "WAIT" },
    3: { bg: `linear-gradient(180deg, ${c1}, ${c2})`, content: <div className="thumb-title">{titleShort}</div> },
    4: { bg: `linear-gradient(45deg, ${c2}, ${c1})`, content: <div className="thumb-bigtext">VS</div>, circle: true },
    5: { bg: `linear-gradient(135deg, ${c1}, ${c2})`, content: <div className="thumb-title">{titleShort}</div>, tag: "NEW" },
  }[video.thumbStyle || 0];
  return (
    <div className="card-thumb-inner" style={{ background: styles.bg }}>
      <div className="thumb-stripes"></div>
      {styles.content}
      <div className="thumb-overlay"></div>
      {styles.tag && <div className="thumb-tag">{styles.tag}</div>}
      {styles.circle && <div className="thumb-circle"></div>}
    </div>
  );
}
window.Thumb = Thumb;

// Sparkline
function Sparkline({ data, color="var(--accent)", h=40, fill=true }) {
  const w = 200;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((d,i)=>{
    const x = (i/(data.length-1))*w;
    const y = h - ((d-min)/range)*(h-4) - 2;
    return [x,y];
  });
  const line = pts.map(([x,y],i)=> (i===0?`M${x},${y}`:`L${x},${y}`)).join(" ");
  const area = line + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {fill && <path d={area} fill={color} fillOpacity=".15"/>}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
window.Sparkline = Sparkline;

// Range slider (dual-thumb)
function RangeSlider({ min, max, step=1, value, onChange, format=(v)=>v }) {
  const [a,b] = value;
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  function onPointerDown(which, e) {
    dragRef.current = which;
    e.preventDefault();
  }
  useEffect(()=>{
    function move(e) {
      if (!dragRef.current || !trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (e.clientX - r.left)/r.width));
      const raw = min + t*(max-min);
      const v = Math.round(raw/step)*step;
      if (dragRef.current === "a") onChange([Math.min(v,b), b]);
      else onChange([a, Math.max(v,a)]);
    }
    function up() { dragRef.current = null; }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return ()=> { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [a,b,onChange,min,max,step]);
  const pa = ((a-min)/(max-min))*100;
  const pb = ((b-min)/(max-min))*100;
  return (
    <div className="range-row">
      <div className="range-track" ref={trackRef}>
        <div className="range-fill" style={{ left: pa+"%", width: (pb-pa)+"%" }}></div>
        <div className="range-thumb" style={{ left: pa+"%" }} onPointerDown={(e)=>onPointerDown("a",e)}></div>
        <div className="range-thumb" style={{ left: pb+"%" }} onPointerDown={(e)=>onPointerDown("b",e)}></div>
      </div>
      <div className="range-val mono">{format(a)} – {format(b)}</div>
    </div>
  );
}
window.RangeSlider = RangeSlider;
