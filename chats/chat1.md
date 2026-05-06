# YouTube Competitor Research Platform

_Started 2026-05-06 03:29 UTC_

---

## User

Create a webapp where youtubers can come to do all the competitor research they need to generate viral videos. the main feature on the home page essentially lets you filter all youtube video based on a couple of things (total view count, total subscribers, length of video, time since it was posted, niche/topic, and outlier score). this website should alsohave a tool where you can track your competitors and it will give you a deep breakdown of those competitors latest videos, and will rank them, and be able to analyze them. it will give you information on their niche and also what other channels are similar to those. it will also use ai to analyze why thumbnails do well, or how they can improve, and what thumbail designs are winners in each niche, and also compare videos based on format and surface new trending formats for the youtuber to try. as well as ano other features you see on the left side of the screenshot

## Assistant

I'll create an original YouTube competitor research webapp. Looking at the screenshots, I can see the general layout pattern (left sidebar nav, main content area, dark theme), but I'll design my own brand identity, color palette, naming, and visual treatment so it's distinct from the reference product.

Let me ask a few quick questions to make this great.

_[tool: questions_v2]_

## User

Questions answered:
- brand_name: TubeAnalyzer
- aesthetic: Explore a few options
- accent_color: 2
- primary_focus: Competitor tracker detail page, Trending Formats, Home / outlier discovery feed with filters, Idea generator
- outlier_explanation: Multiplier + color-coded heat (red=hot)
- filters: Compact filter bar with expandable advanced panel
- ai_personality: A mix — annotated image + structured breakdown
- data_density: Spacious — big cards, lots of breathing room
- interactivity: Add/remove competitors from a tracker, Search bar with live results, Open a video card to a deep-dive view, Sidebar navigation between pages, Filter controls actually filter the feed, Open a channel card to channel deep-dive, Toggle between thumbnail variants in analysis
- tweaks: Accent color, Card density (compact / cozy / spacious), Light/dark mode, Sidebar width, Thumbnail aspect ratio in grid
- anything_else: try to get is a workable as possible, and remember we're gong to need lots of deep down views that really empower decision making and make it easy to discover whats working on youtube so you can copy

## Assistant

Great, let me get to work. I'll build **TubeAnalyzer** as a fully interactive React prototype with deep, decision-empowering views. The aesthetic will be dark with a lime-green (#a3ff3b family) primary accent — sharp, modern, "data terminal for creators" energy.

Plan:
- Single HTML file → splits into JSX modules for each screen
- Real navigation, real filtering, real tracker add/remove, real search, drill-downs
- Screens: Home (outlier feed) · Trackers (list + detail) · Channel deep-dive · Video deep-dive · Trending Formats · Thumbnail Winners · Idea/Title/Thumbnail generators · Bookmarks
- Outlier score: multiplier + heat color (cool blue → red as score climbs)
- Tweaks panel for accent, density, light/dark, sidebar width, thumbnail aspect

_[tool: update_todos]_

_[tool: set_project_title]_

_[tool: copy_starter_component]_

Now let me build the data layer and the main app file.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

Now let me build the components. I'll split them across files for manageability.

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

Now the page components:

_[tool: write_file]_

_[tool: snip]_

Now the deep-dive video page (with thumbnail AI analysis), trending formats, thumbnail winners, and generators:

_[tool: write_file]_

_[tool: snip]_

Now the main app shell with sidebar navigation, search, and routing:

_[tool: write_file]_

_[tool: snip]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

Good — `useTweaks` returns `[values, setTweak]` (array), not `{tweaks, setTweak}`. I need to fix `app.jsx`.

_[tool: snip]_

_[tool: read_file]_

I'll fix the tweaks API usage and finish the HTML.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: write_file]_

_[tool: done]_

_[tool: fork_verifier_agent]_

**TubeAnalyzer** is live — a fully interactive YouTube competitor research tool.

**What's built:**
- **Home (Outlier feed)** — filter by niche, outlier multiplier, channel size, video length, age; live search; sort by recent/outlier/views/smallest channel
- **Trackers** — create/delete trackers, add/remove channels, view ranked videos, similar channels by niche, aggregate stats; persists to localStorage
- **Channel deep-dive** — hero, metrics, sparkline trajectory, top formats used, similar channels, full video grid; "Add to tracker" menu
- **Video deep-dive** — annotated thumbnail with AI callouts, 6-axis scoring breakdown, why-it-works/risk/try-next insights, title rewrites with predicted CTR, format-match comparable videos, variant toggle
- **Trending Formats** — selectable cards with growth %, sparkline, niches; click to see top examples
- **Thumbnail Winners** — winning recipes per niche + ranked top thumbnails
- **Idea / Title / Thumbnail generators** — with niche selector and live results
- **Bookmarks** — saves to localStorage, hover any card to bookmark
- **Tweaks panel** — accent color (5 swatches), light/dark, density, sidebar width, thumbnail aspect ratio

Color-coded outlier heat (blue → cyan → yellow → orange → red) makes hot videos visually pop. Original brand identity (lime accent, "data terminal" feel) — distinct from the reference.

## User

the idea generator, title generator, and thunbnail generator should be able to be trained on your channel and your competitors. that way it gives ideas within the niche, but can also surface new ideas from other niches, applying their formats to the creators niche. the trending formats should be able to be filtered, and also should recommend which might work best for the creators stye of content. all in all, make it more full featured to make it the most useful possible for its designed purpose

## Assistant

_[tool: snip]_

_[tool: update_todos]_

I'll plan the upgrades:

1. **Generators trained on channel + competitors** — add "My channel" picker (any of the existing channels acts as the user's channel) + tracker selector + a niche-blend slider (pure niche → mix from outside niches). Output is contextual: titles match the user's channel's typical formats; ideas can be flagged as "from your niche" vs "borrowed from {niche}". Add a saved/bookmarks list of generated outputs.

2. **Trending Formats filters + fit recs** — niche filter, growth/video-count sort, "fit for your channel" toggle that scores each format against the user's niche and existing formats and surfaces top recs.

Let me extend the data and rewrite the relevant pages.

_[tool: str_replace_edit]_

Now let me rewrite the generators and trending formats pages with the new features:

_[tool: write_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Generators are now trained on your channel + selected trackers with a niche-blend slider; results are tagged "from your niche" vs "borrowed from {niche}" with the source channel/format that inspired each. Trending Formats now has niche/sort/fit filters, a fit-score per format card, and a "Recommended for your style" section at the top.

## User

the home page should also have a niche that is the creators specific niche (trained on their videos and competitors). i also want to add a feature that is going to surface new ideas and creators doing well that we can copy even if theyre on the smaller size. i know the outlier score is meant to do this but the intention with this tool is for the app to actually look through like a crawler and find related channels and competitors who might have something nwe to copy or new trends that might be forming arounf that. it should specifically try to bring unrelated formats into the creators niche, and come up with ideas that would succeed by mixind 2 other ideas, or sizing up existing videos to maybe 10x the title, etc.

## Assistant

I'll add two new features:
1. **Home → "Your niche" tab** — a feed scoped to the user's niche + tracked competitors  
2. **Discovery / Remix Lab** — a new sidebar item that crawls smaller channels showing breakout signal, lifts unrelated formats into the user's niche, and suggests 2-idea mashups + "10x" title rewrites

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: str_replace_edit]_

Now let me build the Discovery Lab — the centerpiece of this request:

_[tool: read_file]_

_[tool: list_files]_

_[tool: update_todos]_

_[tool: grep]_

Now let me build the Discovery Lab:

_[tool: read_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

I need to add a few CSS styles for the new components and verify the Discover icon exists.

_[tool: snip]_

_[tool: grep]_

Compass and Arrow icons exist. Now I need to add CSS for the new components.

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

**Home** now has an "All YouTube" / "Your niche · {niche}" toggle that scopes the feed to your niche + tracked channels.

**Discovery Lab** (new sidebar item, AI-tagged) does what you asked:
- **Breakout creators** — sub-250K channels in your niche or adjacent niches that just posted a 2.5x+ outlier; shows their top 3 videos so you can copy before they blow up
- **Format transplants** — proven formats from *outside* your niche, with an arrow-flow visual (From X → To Your Niche), why-it-works rationale, and projected outlier
- **Idea mashups** — fuses one of your niche's hits + one adjacent-niche hit into a new idea with a confidence score
- **10x rewrites** — takes existing big-channel hits and proposes sized-up versions (numbers ×10, durations stretched, harder constraints) with a predicted lift multiplier
- A "Run new crawl" button with a fake but believable progress walk through the steps (seeding → comment graph → recommended sidebars → outlier filter → format library)

_[tool: snip]_

Nothing further to snip and no pending request.

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Fixed the thumb-positioning bug across all Discovery Lab card types.

## User

you should be able to upload references to the thunbnail generator to maybe just swap the face, or get inspired from another thubnail, or use images to give character references. the idea generator page should be more of an infinite scroll with suggestions, and should have the option to generate with thubnails or not so you can get a quick visualiation of the ideas as well.

## Assistant

_[tool: snip]_

_[tool: update_todos]_

_[tool: read_file]_

Let me read the rest of the generator and rewrite it. First, snip prior messages:

_[tool: snip]_

_[tool: read_file]_

I'll split the generators into a separate file and rewrite them with the new features. Let me write the new generators file and a fake-thumb-renderer.

_[tool: write_file]_

Now I need to remove the old generator from pages-deep, wire the new files into the html and app, and add CSS.

_[tool: snip]_

_[tool: grep]_

Now let me remove the old GeneratorPage from pages-deep and wire up the new generators:

_[tool: read_file]_

I'll find the GeneratorPage block bounds and replace it cleanly:

_[tool: grep]_

I'll use run_script to replace lines 329-535 in pages-deep.jsx with a small stub:

_[tool: run_script]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

_[tool: snip]_

**Idea generator** is now an infinite-scroll feed with a thumbnail toggle — concepts auto-render as colorful generated thumbs (4 visual variants seeded by content, with extracted big-word + tagline) when on; collapses to a compact list when off. IntersectionObserver loads more as you scroll, capped at 96 with a refresh button.

**Thumbnail generator** has a reference uploader with four typed slots — Face/self, Character, Inspiration, Object — that accept image uploads, persist as base64 previews, and surface in the generated cards as a circular overlay with a contextual treatment label ("face-swapped from your upload", "character ref applied", "color/style lifted from inspiration").

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

Fixed the label wrap and the niche-blend header alignment.

## User

build out the tracker tab to really track more indepth stuff from each channel. give a summary of the formats they're using, the most popular characters/trends for their channel and how recent it was trending. it should also have a comparison tool where it compares one of their videos to your video in terms of retention and packaing to see how you could improve and what youre dong better. i also want to be able to upload a thumbnail idea i had and have the app mock up the youtube homepage and put my video next to other search results, or competitors to see if my thubnail stands out compared to theirs. and should be able to visualize it on mobile as well.

## Assistant

_[tool: snip]_

_[tool: update_todos]_

_[tool: grep]_

I'll plan a focused build. Let me read the current TrackerDetail to understand what to extend, then add the new features.

_[tool: read_file]_

I'll build out the three new features: deeper tracker insights (formats/characters/trends), a video comparison tool with retention curves, and a thumbnail mockup tool that places your thumb in YouTube homepage/search contexts on desktop + mobile.

_[tool: snip]_

_[tool: read_file]_

I'll build all three features in one focused file. Let me also check sidebar nav and add new entries.

_[tool: grep]_

_[tool: grep]_

Let me check the app structure and existing components I'll need to reference.

_[tool: read_file]_

_[tool: list_files]_

_[tool: grep]_

_[tool: grep]_

_[tool: read_file]_

_[tool: snip]_

_[tool: read_file]_

_[tool: grep]_

Now I have enough context. Let me check the Icons list for what I have and check `pages-deep.jsx`/CSS for retention/score viz I can reuse.

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

I have enough context. Now I'll build all three new features as a single new file `new-features.jsx`, then wire them into the nav and routing.

_[tool: grep]_

_[tool: read_file]_

_[tool: snip]_

Now I'll write the new features file. I'll build:

1. **Tracker Insights** — adds a "Pattern lab" section to TrackerDetail with format breakdown, character/hook archetypes, trends over time
2. **Video Compare** — new sidebar entry; pick 2-4 videos, see retention curves overlay + packaging diff
3. **Thumbnail Mockup** — new sidebar entry; pick a thumbnail, see it in YouTube home/search/sidebar in desktop + mobile contexts

_[tool: write_file]_

Now wire the new file in: append to TrackerDetail, add nav entries, register routes, add CSS.

_[tool: read_file]_

_[tool: grep]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now I need to add CSS for all the new components.

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Three new features shipped:

- **Tracker Pattern Lab** (appended to each tracker detail) — top performing formats by avg multiplier, hook archetype classifier, 12-week multiplier trend, length cohort winner, channel cadence table, and ranked top winners to copy first.
- **Compare videos** — pick 2–4 videos, overlaid retention curves with hover scrubber, 6-axis score breakdown, packaging head-to-head with biggest-gap takeaway.
- **Thumbnail mockup** — drop any thumbnail into real YouTube chrome (desktop home/search/watch sidebar, mobile home/search) with surrounding competitor thumbs from the same niche, plus a title-override field and CTR uplift readout.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

Fixed all six thumbnail-wrapper rules with `position: relative` so the absolutely-positioned `.card-thumb-inner` stays contained.

## User

polish it more to just make it more beautiful and with richer data

## Assistant

_[tool: snip]_

_[tool: read_file]_

I'll polish the three new features with richer data and more beautiful presentation.

_[tool: read_file]_

I'll add richer data and visual polish — sample retention moments, real benchmarks, sparkline trends per channel row, more axes, and a richer mockup with comments/likes/save bar — through targeted CSS and a few JSX tweaks.

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me check what other CSS the new bits need and add them, plus enrich the mockup with realistic UI chrome.

_[tool: grep]_

_[tool: grep]_

_[tool: grep]_

Now let me add the missing CSS for the new compare elements:

_[tool: read_file]_

Good, I have a clear picture. Adding the new styles:

_[tool: str_replace_edit]_

Now let me enrich the YouTube mockup with realistic chrome (engagement bar, metadata row, comments preview):

_[tool: grep]_

_[tool: snip]_

Let me find the watch sidebar context to add a richer player view, plus see the desktop home structure:

_[tool: grep]_

Let me look at the watch sidebar implementation to find what to enrich:

_[tool: read_file]_

I'll enrich the watch-page sidebar context with realistic engagement bar, channel info, and comments preview:

_[tool: str_replace_edit]_

Now add CSS for the new YouTube watch-page elements:

_[tool: grep]_

I'll add new YouTube engagement-bar / comments / desc CSS right after the watch-row rule:

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Polished the analysis depth:

- **Compare** — added retention summary stats per video (avg watched / 30% drop / finish rate), notable-moment markers on the curves (hook drops, mid-video losses, re-engagement spikes), and two new score axes (CTR + AVD) with descriptions on each row.
- **Watch-page mockup** — full engagement bar (like/dislike/share/save), description card with hashtags, and a 3-comment preview with avatars, like counts, and reply actions — much closer to a real YouTube watch page so your thumbnail/title is judged in proper context.

## User

Verifier agent check completed

## Assistant

