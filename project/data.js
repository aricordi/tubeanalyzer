// Mock data for TubeAnalyzer
window.NICHES = [
  "Tech", "Gaming", "Finance", "Fitness", "Cooking", "Vlog", "Education",
  "Comedy", "Music", "Beauty", "Cars", "DIY", "Sports", "Science", "Horror",
  "Productivity", "AI", "Crypto", "Travel", "Photography"
];

window.FORMAT_TAGS = [
  "Reaction face", "POV title", "Big yellow text", "Red circle highlight",
  "Before/after split", "Object hero", "Number hook", "Question hook",
  "Microphone podcast", "Whiteboard", "Tier list", "Iceberg explainer",
  "Day in the life", "I tried for X days", "Ranked worst-to-best", "vs.",
  "We bought every", "$1 vs $1000", "Speed run", "Mini documentary"
];

// Curated channel handles + brand colors so avatars are deterministic placeholders
function chanColor(seed) {
  const palettes = [
    ["#3b82f6","#1e3a8a"], ["#a3ff3b","#365314"], ["#ff8a3b","#7c2d12"],
    ["#ec4899","#831843"], ["#06b6d4","#164e63"], ["#facc15","#713f12"],
    ["#a855f7","#3b0764"], ["#10b981","#064e3b"], ["#ef4444","#7f1d1d"],
    ["#f97316","#7c2d12"]
  ];
  let h = 0; for (let i=0;i<seed.length;i++) h = (h*31 + seed.charCodeAt(i))|0;
  return palettes[Math.abs(h) % palettes.length];
}
window.chanColor = chanColor;

const RAW_CHANNELS = [
  { handle: "MrBeastLabs", name: "Beast Labs", subs: 4_200_000, niche: "Vlog" },
  { handle: "AlexHormoziCuts", name: "Hormozi Cuts", subs: 1_800_000, niche: "Finance" },
  { handle: "TechSlate", name: "TechSlate", subs: 642_000, niche: "Tech" },
  { handle: "PrimeTimePodcast", name: "Prime Time Podcast", subs: 920_000, niche: "Productivity" },
  { handle: "KitchenLabRyo", name: "Kitchen Lab", subs: 318_000, niche: "Cooking" },
  { handle: "QuietMornings", name: "Quiet Mornings", subs: 89_000, niche: "Vlog" },
  { handle: "DriftDeck", name: "Drift Deck", subs: 1_240_000, niche: "Cars" },
  { handle: "NeonNotes", name: "Neon Notes", subs: 211_000, niche: "Education" },
  { handle: "CryptoFloor", name: "Crypto Floor", subs: 540_000, niche: "Crypto" },
  { handle: "OutdoorOps", name: "Outdoor Ops", subs: 1_900_000, niche: "DIY" },
  { handle: "PixelWardenAI", name: "Pixel Warden", subs: 78_000, niche: "AI" },
  { handle: "HighScoreHQ", name: "High Score HQ", subs: 2_300_000, niche: "Gaming" },
  { handle: "LedgerLine", name: "Ledger Line", subs: 410_000, niche: "Finance" },
  { handle: "SoftBuiltStudio", name: "Soft Built Studio", subs: 156_000, niche: "DIY" },
  { handle: "MarathonMode", name: "Marathon Mode", subs: 720_000, niche: "Fitness" },
  { handle: "GhostStreetCo", name: "Ghost Street", subs: 1_100_000, niche: "Horror" },
  { handle: "LensWatch", name: "Lens Watch", subs: 295_000, niche: "Photography" },
  { handle: "Sciencery", name: "Sciencery", subs: 880_000, niche: "Science" },
  { handle: "RoadlineTravel", name: "Roadline", subs: 230_000, niche: "Travel" },
  { handle: "JustDeniseLol", name: "Just Denise", subs: 540_000, niche: "Comedy" },
];

window.CHANNELS = RAW_CHANNELS.map(c => ({
  ...c,
  colors: chanColor(c.handle),
  avgViews: Math.round(c.subs * (0.15 + (Math.abs(c.handle.charCodeAt(0)-65)%9)*0.04))
}));

const TITLES = [
  "I Spent 100 Hours Inside a Locked Cube",
  "Why Every Founder Is Wrong About Pricing",
  "The $4 Tool That Replaces $400 of Software",
  "I Tried Every Productivity App for 30 Days",
  "Building a Restaurant From a Single Onion",
  "The Quiet Cost of Working From Home",
  "We Drove a Civic Until the Wheels Fell Off",
  "How I Memorized a 700-Page Textbook in a Weekend",
  "Bitcoin Just Did Something It's Never Done",
  "I Built a Cabin With No Power Tools",
  "Claude Just Quietly Killed Three Startups",
  "The Last Boss in Elden Ring Made Me Cry",
  "Reading Buffett's 1962 Letter Changed Everything",
  "I Lived in a Dumpster for One Week",
  "Running a Marathon on 2 Hours of Sleep",
  "What's Hiding in This Abandoned Mall",
  "The Only Lens You'll Ever Need",
  "Why Your Brain Loves Scrolling (And How to Stop)",
  "32 Hours on the World's Slowest Train",
  "Stand-Up Bombed for 22 Minutes Straight",
  "The Format Every Top Channel Just Started Stealing",
  "This Editing Trick Doubled Our Retention",
  "How I Got 1M Subs Without Showing My Face",
  "We Tested Every AI Coding Assistant in One Day",
  "I Quit My Job to Make Soup",
];

function randAgo(seed) {
  const opts = ["2d ago","5d ago","1w ago","2w ago","3w ago","1mo ago","2mo ago","3mo ago","5mo ago","8mo ago","1y ago"];
  let h=0; for (let i=0;i<seed.length;i++) h=(h*17+seed.charCodeAt(i))|0;
  return opts[Math.abs(h)%opts.length];
}
function lengthFor(seed) {
  let h=0; for (let i=0;i<seed.length;i++) h=(h*13+seed.charCodeAt(i))|0;
  const totalSec = 60 + Math.abs(h)%(60*55);
  const m = Math.floor(totalSec/60), s = totalSec%60;
  return `${m}:${s.toString().padStart(2,"0")}`;
}
function lengthSec(s) { const [m,sc]=s.split(":").map(Number); return m*60+sc; }
function agoDays(s) {
  const m=s.match(/^(\d+)(d|w|mo|y)/); if (!m) return 30;
  const n=+m[1]; return n*({d:1,w:7,mo:30,y:365}[m[2]]);
}
window.lengthSec = lengthSec; window.agoDays = agoDays;

const VIDEOS = [];
let vid = 1;
window.CHANNELS.forEach(ch => {
  const count = 6 + (ch.handle.charCodeAt(0)%6);
  for (let i=0;i<count;i++) {
    const seed = ch.handle + "_" + i;
    let h=0; for (let j=0;j<seed.length;j++) h=(h*23+seed.charCodeAt(j))|0;
    const ax = Math.abs(h);
    const multiplier = +(0.4 + (ax%55)/10).toFixed(1);
    const views = Math.round(ch.avgViews * multiplier);
    const title = TITLES[ax % TITLES.length];
    const fmt = window.FORMAT_TAGS[ax % window.FORMAT_TAGS.length];
    VIDEOS.push({
      id: "v" + (vid++),
      title,
      channel: ch.handle,
      channelName: ch.name,
      niche: ch.niche,
      subs: ch.subs,
      views,
      avgViews: ch.avgViews,
      multiplier,
      length: lengthFor(seed),
      ago: randAgo(seed),
      format: fmt,
      thumbStyle: ax % 6, // 0..5 different placeholder treatments
      colors: ch.colors,
    });
  }
});
window.VIDEOS = VIDEOS;

window.TRENDING_FORMATS = [
  { id:"f1", name:"POV: You walked in on...", growth:"+318%", videos: 142, niches:["Horror","Comedy","Vlog"], example:"Big yellow text + reaction circle" },
  { id:"f2", name:"$1 vs $1,000 (object)", growth:"+212%", videos: 86, niches:["Vlog","Cooking","Tech"], example:"Side-by-side split, price tags" },
  { id:"f3", name:"I read every X so you don't have to", growth:"+187%", videos: 64, niches:["Education","Finance","Productivity"], example:"Stack of books + tired face" },
  { id:"f4", name:"This [tool] just killed [company]", growth:"+155%", videos: 58, niches:["Tech","AI","Crypto"], example:"Logo overlap with red X" },
  { id:"f5", name:"24 hours in a sealed room", growth:"+141%", videos: 41, niches:["Vlog","Comedy"], example:"Time counter overlay" },
  { id:"f6", name:"Ranked worst-to-best", growth:"+128%", videos: 91, niches:["Gaming","Tech","Cars"], example:"Tier list S A B C D" },
  { id:"f7", name:"Mini-documentary cold open", growth:"+96%", videos: 73, niches:["Education","Science"], example:"Letterboxed 2.39:1 + serif title" },
  { id:"f8", name:"Whisper voiceover hook", growth:"+74%", videos: 38, niches:["Horror","Vlog"], example:"Black thumb + red lips/text" },
];

window.NOW = "May 5, 2026";

// User's "own" channel (mock — they can change which one represents them)
window.MY_CHANNEL_DEFAULT = "TechSlate";

// Format → niches it pops in (for fit scoring)
window.FORMAT_NICHES = {
  "f1": ["Horror","Comedy","Vlog"],
  "f2": ["Vlog","Cooking","Tech","DIY"],
  "f3": ["Education","Finance","Productivity","AI"],
  "f4": ["Tech","AI","Crypto","Finance"],
  "f5": ["Vlog","Comedy","Horror"],
  "f6": ["Gaming","Tech","Cars","Beauty"],
  "f7": ["Education","Science","Finance"],
  "f8": ["Horror","Vlog","Comedy"],
};

// Helper: score a format's fit for a given niche
window.formatFit = function(formatId, niche, channelFormats) {
  const fmt = window.TRENDING_FORMATS.find(f=>f.id===formatId);
  if (!fmt) return 0;
  let score = 0;
  if (fmt.niches.includes(niche)) score += 60;
  // Adjacent niche bonus (cooking/diy share, tech/ai/crypto share, etc.)
  const adjacency = {
    "Tech": ["AI","Crypto","Productivity"],
    "AI": ["Tech","Productivity"],
    "Crypto": ["Tech","Finance"],
    "Finance": ["Productivity","Crypto","Education"],
    "Cooking": ["DIY","Vlog"],
    "DIY": ["Cooking","Cars"],
    "Horror": ["Comedy","Vlog"],
    "Vlog": ["Comedy","Travel","Horror"],
    "Education": ["Science","Productivity"],
  };
  if ((adjacency[niche]||[]).some(n => fmt.niches.includes(n))) score += 25;
  // Bonus if channel already uses one of the format's niche tags
  if (channelFormats?.some(f => fmt.niches.includes(f))) score += 10;
  // Trend strength
  score += Math.min(15, parseInt(fmt.growth)/30);
  return Math.round(Math.min(100, score));
};

