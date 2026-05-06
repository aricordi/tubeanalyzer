/* ── YouTube Analytics Dashboard ─────────────────────────────────────────── */
// Requires: window.TubeAnalytics, window.TubeAPI (optional, for video titles)
(function () {
  'use strict';
  const { useState, useEffect, useCallback, useRef } = React;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function fmtN(n) {
    if (n == null) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(Math.round(n));
  }
  function fmtTime(seconds) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function fmtHours(minutes) {
    if (!minutes) return '0h';
    const h = Math.round(minutes / 60);
    if (h >= 1000) return fmtN(h) + 'h';
    return h + 'h';
  }

  function analyticsError(e) {
    const code   = e?.code || '';
    const reason = e?.reason || '';
    const apiMsg = e?.apiMsg || e?.message || String(e);
    const lower  = apiMsg.toLowerCase();

    if (code === 'NO_CLIENT_ID')       return 'No OAuth Client ID — enter your Client ID below.';
    if (code === 'BAD_CLIENT_ID')      return e.message;
    if (code === 'GIS_NOT_READY')      return 'Google sign-in is still loading. Refresh the page and try again.';
    if (code === 'OAUTH_ERR')          return `OAuth failed: ${apiMsg}. Verify your Client ID is "Web application" type and http://localhost:8765 is an authorized JavaScript origin.`;
    if (code === 'NOT_CONNECTED')      return 'Not connected. Click Connect to authorize.';

    // 401 / 403 / 4xx from analytics API — surface the real message
    if (code === 'AUTH_EXPIRED' || code === 'ANALYTICS_QUOTA' || code === 'ANALYTICS_ERR') {
      // Most specific match first
      if (lower.includes('insufficient permission to access this report')) {
        return 'Your authenticated Google account doesn\'t have access to YouTube Analytics for any channel.\n\nMost common cause: your YouTube channel is on a Brand Account, but during the popup you signed in with a different Google account.\n\nFix: Click "Reconnect" below. In the Google popup, click "Use another account" and select the Google account you use to manage your YouTube channel (the same one that gives you access to studio.youtube.com). If your channel is a Brand Account, you may need to log into youtube.com first as that brand account in this browser.';
      }
      if (lower.includes('api has not been used') || lower.includes('api is not enabled') || reason === 'accessNotConfigured') {
        return `YouTube Analytics API is not enabled in your Google Cloud project. Go to console.cloud.google.com → APIs & Services → Library → search "YouTube Analytics API" → Enable. Then disconnect and reconnect here. (${apiMsg})`;
      }
      if (lower.includes('forbidden') || reason === 'forbidden') {
        return `Access denied: ${apiMsg}. This usually means your channel has no analytics data yet (need at least a few views), or the wrong Google account was selected. Click Reconnect to try a different account.`;
      }
      if (lower.includes('insufficient') && lower.includes('scope')) {
        return `Insufficient OAuth scope: ${apiMsg}. Click Reconnect and make sure you check the YouTube Analytics permission in the consent screen.`;
      }
      if (code === 'AUTH_EXPIRED') {
        return `Authorization rejected (HTTP 401): "${apiMsg}". Possible causes: 1) Your OAuth Client ID's Google Cloud project doesn't match where YouTube Analytics API is enabled, 2) The Client ID type isn't "Web application", 3) The Google account you signed in with doesn't manage a YouTube channel. Click Reconnect to retry.`;
      }
      return `Analytics API error: ${apiMsg}`;
    }

    if (lower.includes('popup'))         return 'Pop-up blocked — allow pop-ups for localhost:8765, then retry.';
    if (lower.includes('access_denied')) return 'Access denied — you cancelled, or this Google account has no YouTube channel.';
    return apiMsg;
  }

  // ─── Tiny SVG line chart ───────────────────────────────────────────────────
  function LineChart({ data, color = 'var(--accent)', height = 64, label }) {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const W = 300, H = height;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - 4 - ((v - min) / range) * (H - 8);
      return [x, y];
    });
    const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
    const fill     = `0,${H} ` + pts.map(([x, y]) => `${x},${y}`).join(' ') + ` ${W},${H}`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        <polygon points={fill} fill={color} fillOpacity="0.12"/>
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // ─── Stat card ─────────────────────────────────────────────────────────────
  function StatCard({ label, value, sub, trend, chartData, color = 'var(--accent)', icon }) {
    return (
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 160,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--fg-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {icon} {label}
          </div>
          {trend != null && (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
              background: trend >= 0 ? '#4ade8022' : 'var(--hot-3)22',
              color: trend >= 0 ? '#4ade80' : 'var(--hot-3)',
            }}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>{sub}</div>}
        {chartData && chartData.length > 1 && (
          <div style={{ marginTop: 12 }}>
            <LineChart data={chartData} color={color} height={48}/>
          </div>
        )}
      </div>
    );
  }

  // ─── Traffic sources bar chart ─────────────────────────────────────────────
  function TrafficBar({ sources }) {
    const top = sources.slice(0, 7);
    const accent = 'var(--accent)';
    const colors = ['#a3ff3b', '#5b8cff', '#ff8a3b', '#ec4899', '#facc15', '#34d399', '#a78bfa'];
    return (
      <div>
        {top.map((s, i) => (
          <div key={s.source} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--fg-mute)' }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{s.pct}% <span style={{ color: 'var(--fg-dim)', fontWeight: 400 }}>({fmtN(s.views)} views)</span></span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: colors[i % colors.length],
                width: `${s.pct}%`,
                transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
              }}/>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Setup / connect section ───────────────────────────────────────────────
  function ConnectSection({ onConnected }) {
    const [clientId, setClientId] = useState(window.TubeAnalytics?.AnalyticsAuth.clientId || '');
    const [connecting, setConnecting] = useState(false);
    const [err, setErr] = useState('');
    const [showKey, setShowKey] = useState(false);

    const connect = useCallback(async () => {
      setConnecting(true);
      setErr('');
      try {
        if (clientId) window.TubeAnalytics.AnalyticsAuth.setClientId(clientId);
        await window.TubeAnalytics.AnalyticsAuth.connect();

        // Verify the token actually got the scopes we need before proceeding
        const diag = await window.TubeAnalytics.diagnoseToken();
        if (!diag.ok) {
          setErr(`Token verification failed: ${diag.reason}. Check that your Client ID is correct and is "Web application" type.`);
          window.TubeAnalytics.AnalyticsAuth.disconnect();
          return;
        }
        if (!diag.hasAnalyticsScope) {
          setErr(`Connected, but YouTube Analytics scope was NOT granted. Granted scopes: ${diag.scopes.join(', ') || '(none)'}. Click Connect again and make sure to check the YouTube Analytics permission.`);
          window.TubeAnalytics.AnalyticsAuth.disconnect();
          return;
        }
        onConnected();
      } catch (e) {
        setErr(analyticsError(e));
      } finally {
        setConnecting(false);
      }
    }, [clientId, onConnected]);

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>My YouTube Analytics</h2>
          <p style={{ color: 'var(--fg-mute)', marginTop: 10, fontSize: 14, lineHeight: 1.7 }}>
            Connect your YouTube channel to see real analytics: views, watch time,
            subscriber growth, traffic sources, and your top performing videos.
          </p>
        </div>

        {/* Step-by-step instructions */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 24, marginBottom: 24,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>One-time setup (5 min)</div>
          {[
            {
              n: 1,
              title: 'Open Google Cloud Console',
              body: <>
                Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}>console.cloud.google.com</a>.
                Use the same project you used for the YouTube Data API key
                (or create a new one called "TubeAnalyzer").
              </>,
            },
            {
              n: 2,
              title: 'Enable YouTube Analytics API',
              body: <>
                Go to <strong>APIs & Services → Library</strong>, search
                "<strong>YouTube Analytics API</strong>", click it, then
                click <strong>Enable</strong>.
              </>,
            },
            {
              n: 3,
              title: 'Set up OAuth consent screen',
              body: <>
                Go to <strong>APIs & Services → OAuth consent screen</strong>.
                Choose <strong>External</strong>, fill in App name (e.g. "TubeAnalyzer"),
                your email, and save. Under <strong>Test users</strong>, add your own
                Google email. You don't need to publish the app.
              </>,
            },
            {
              n: 4,
              title: 'Create an OAuth 2.0 Client ID',
              body: <>
                Go to <strong>APIs & Services → Credentials → + Create Credentials →
                OAuth client ID</strong>. Choose <strong>Web application</strong>.
                Under <strong>Authorized JavaScript origins</strong> add{' '}
                <code style={{ background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>
                  http://localhost:8765
                </code>.
                Click Create. Copy the <strong>Client ID</strong> (ends in .apps.googleusercontent.com).
              </>,
            },
            {
              n: 5,
              title: 'Paste your Client ID below and connect',
              body: 'Paste the Client ID, click Connect, and authorize in the popup.',
            },
          ].map(({ n, title, body }) => (
            <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bg-2)', border: '2px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--fg-mute)', fontWeight: 700, fontSize: 12,
              }}>
                {n}
              </div>
              <div style={{ flex: 1, paddingTop: 3 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-mute)', lineHeight: 1.6 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Client ID input */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 20, marginBottom: 16,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>OAuth Client ID</div>
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="123456789-abc…apps.googleusercontent.com"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: 8, padding: '10px 40px 10px 14px',
                color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
            <button onClick={() => setShowKey(s => !s)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--fg-mute)', fontSize: 16, padding: 0,
            }}>
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {err && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 14,
            background: 'var(--hot-3)22', color: 'var(--hot-3)', fontSize: 13,
          }}>
            {err}
          </div>
        )}

        <button
          onClick={connect}
          disabled={connecting}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            fontWeight: 700, fontSize: 15, cursor: connecting ? 'default' : 'pointer',
            opacity: connecting ? 0.7 : 1,
          }}
        >
          {connecting ? 'Opening authorization popup…' : '🔗 Connect YouTube Analytics'}
        </button>

        <p style={{ textAlign: 'center', color: 'var(--fg-dim)', fontSize: 12, marginTop: 12 }}>
          Your data is fetched directly from Google's servers — never sent anywhere else.
        </p>
      </div>
    );
  }

  // ─── Main dashboard ────────────────────────────────────────────────────────
  function Dashboard({ channel, overview, topVideos, trafficSources, countries, days, onDaysChange, onDisconnect, onRefresh, loading }) {
    const subs = channel?.statistics?.subscriberCount;
    const totalViews = channel?.statistics?.viewCount;

    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
          {channel?.snippet?.thumbnails?.default?.url && (
            <img src={channel.snippet.thumbnails.default.url} alt=""
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}/>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
              {channel?.snippet?.title || 'My Channel'}
            </h2>
            <div style={{ color: 'var(--fg-mute)', fontSize: 13 }}>
              {fmtN(+subs)} subscribers · {fmtN(+totalViews)} total views
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Time range selector */}
            {[7, 28, 90].map(d => (
              <button key={d} onClick={() => onDaysChange(d)} style={{
                padding: '6px 12px', borderRadius: 8,
                border: `1px solid ${days === d ? 'var(--accent)' : 'var(--line)'}`,
                background: days === d ? 'var(--accent)22' : 'transparent',
                color: days === d ? 'var(--accent)' : 'var(--fg-mute)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>
                {d === 7 ? '7d' : d === 28 ? '28d' : '90d'}
              </button>
            ))}
            <button onClick={onRefresh} disabled={loading} style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--fg-mute)', fontSize: 12, cursor: loading ? 'default' : 'pointer',
            }}>
              {loading ? '…' : '↻'}
            </button>
            <button onClick={onDisconnect} style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--fg-dim)', fontSize: 12, cursor: 'pointer',
            }}>
              Disconnect
            </button>
          </div>
        </div>

        {loading && !overview && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--fg-mute)', fontSize: 14 }}>
            Loading your analytics…
          </div>
        )}

        {overview && (
          <>
            {/* Overview stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
              <StatCard
                label="Views"
                value={fmtN(overview.totals.views)}
                sub={`last ${days} days`}
                chartData={overview.days.map(d => d.views)}
                color="var(--accent)"
                icon="👁"
              />
              <StatCard
                label="Watch Time"
                value={fmtHours(overview.totals.watchMinutes)}
                sub={`${fmtN(Math.round(overview.totals.watchMinutes / 60))} hours total`}
                chartData={overview.days.map(d => d.watchMinutes)}
                color="#5b8cff"
                icon="⏱"
              />
              <StatCard
                label="Subscribers"
                value={overview.totals.netSubs >= 0 ? `+${fmtN(overview.totals.netSubs)}` : fmtN(overview.totals.netSubs)}
                sub={`${fmtN(overview.totals.subsGained)} gained · ${fmtN(overview.totals.subsLost)} lost`}
                chartData={overview.days.map(d => d.subsGained - d.subsLost)}
                color="#4ade80"
                icon="👤"
              />
              <StatCard
                label="Avg View Duration"
                value={fmtTime(overview.totals.avgDuration)}
                sub="per view"
                chartData={overview.days.map(d => d.avgDuration)}
                color="#facc15"
                icon="🎬"
              />
              {overview.totals.revenue != null && (
                <StatCard
                  label="Est. Revenue"
                  value={`$${overview.totals.revenue.toFixed(2)}`}
                  sub="estimated"
                  chartData={overview.days.map(d => d.revenue || 0)}
                  color="#34d399"
                  icon="💰"
                />
              )}
            </div>

            {/* Views chart full width */}
            <div style={{
              background: 'var(--bg-1)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '20px 20px 12px', marginBottom: 24,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 16 }}>Views over time</div>
              <LineChart data={overview.days.map(d => d.views)} color="var(--accent)" height={100}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}>{overview.days[0]?.date || ''}</span>
                <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}>{overview.days[overview.days.length - 1]?.date || ''}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {/* Traffic sources */}
              {trafficSources?.length > 0 && (
                <div style={{
                  background: 'var(--bg-1)', border: '1px solid var(--line)',
                  borderRadius: 12, padding: 20,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Traffic Sources</div>
                  <TrafficBar sources={trafficSources}/>
                </div>
              )}

              {/* Top countries */}
              {countries?.length > 0 && (
                <div style={{
                  background: 'var(--bg-1)', border: '1px solid var(--line)',
                  borderRadius: 12, padding: 20,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 16 }}>Top Countries</div>
                  {countries.slice(0, 7).map((c, i) => (
                    <div key={c.country} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--fg-mute)' }}>{c.country}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{c.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: 'var(--accent)', opacity: 1 - i * 0.1,
                          width: `${c.pct}%`, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                        }}/>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Top Videos */}
        {topVideos?.length > 0 && (
          <div style={{
            background: 'var(--bg-1)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Top Videos (last {days} days)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topVideos.map((v, i) => (
                <div key={v.videoId} style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < topVideos.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--bg-2)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, fontSize: 13,
                    color: i === 0 ? 'var(--accent)' : 'var(--fg-dim)',
                  }}>
                    {i + 1}
                  </div>
                  {v.thumbnail && (
                    <img src={v.thumbnail} alt="" style={{
                      width: 64, height: 36, objectFit: 'cover',
                      borderRadius: 4, flexShrink: 0, background: 'var(--bg-2)',
                    }}/>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {v.title || v.videoId}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-mute)', marginTop: 2 }}>
                      {fmtTime(v.avgDuration)} avg · {Math.round(v.retentionPct)}% retained
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtN(v.views)}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-mute)' }}>{fmtHours(v.watchMinutes)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── AnalyticsPage root ────────────────────────────────────────────────────
  function AnalyticsPage() {
    const [connected, setConnected] = useState(
      () => !!(window.TubeAnalytics?.AnalyticsAuth.isConnected)
    );
    const [loading, setLoading] = useState(false);
    const [err, setErr]         = useState('');
    const [channel, setChannel] = useState(null);
    const [overview, setOverview]     = useState(null);
    const [topVideos, setTopVideos]   = useState([]);
    const [traffic, setTraffic]       = useState([]);
    const [countries, setCountries]   = useState([]);
    const [days, setDays]             = useState(28);

    const loadData = useCallback(async (d) => {
      setLoading(true);
      setErr('');
      console.log('[TubeAnalyzer] Loading analytics data for', d, 'days');
      try {
        // Core analytics — these are the real data calls
        const [ov, tv, tf, co] = await Promise.all([
          window.TubeAnalytics.getChannelOverview(d),
          window.TubeAnalytics.getTopVideos(d),
          window.TubeAnalytics.getTrafficSources(d),
          window.TubeAnalytics.getTopCountries(d),
        ]);
        console.log('[TubeAnalyzer] Analytics loaded:', { days: ov?.days?.length, totals: ov?.totals });

        setOverview(ov);
        setTraffic(tf);
        setCountries(co);

        // Channel info — non-fatal, works if youtube.readonly scope was granted
        const ch = await window.TubeAnalytics.getMyChannel();
        setChannel(ch);

        // Enrich top video titles if we have a YT Data API key
        if (tv.length && window.TubeAPI?.Keys.hasYt()) {
          try {
            const details = await window.TubeAPI.getVideoDetails(tv.map(v => v.videoId));
            const dm = {};
            details.forEach(d => { dm[d.id] = d; });
            setTopVideos(tv.map(v => ({
              ...v,
              title:     dm[v.videoId]?.snippet?.title || v.videoId,
              thumbnail: dm[v.videoId]?.snippet?.thumbnails?.medium?.url || '',
            })));
          } catch {
            setTopVideos(tv);
          }
        } else {
          setTopVideos(tv);
        }
      } catch (e) {
        console.error('[TubeAnalyzer] Analytics load failed:', e, 'apiMsg:', e?.apiMsg, 'reason:', e?.reason, 'status:', e?.status);
        setErr(analyticsError(e));
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      if (connected) loadData(days);
    }, [connected]);

    function handleDaysChange(d) {
      setDays(d);
      loadData(d);
    }

    function handleDisconnect() {
      window.TubeAnalytics.AnalyticsAuth.disconnect();
      setConnected(false);
      setOverview(null);
      setTopVideos([]);
      setTraffic([]);
      setCountries([]);
      setChannel(null);
    }

    if (!connected) {
      return (
        <div className="page">
          {err && (
            <div style={{
              maxWidth: 640, margin: '16px auto 0', padding: '10px 16px',
              borderRadius: 8, background: 'var(--hot-3)22', color: 'var(--hot-3)',
              fontSize: 13,
            }}>
              {err}
            </div>
          )}
          <ConnectSection onConnected={() => { setErr(''); setConnected(true); }}/>
        </div>
      );
    }

    return (
      <div className="page" style={{ overflowY: 'auto' }}>
        {err && (
          <div style={{
            maxWidth: 900, margin: '12px auto', padding: '14px 18px',
            background: 'var(--hot-3)22', color: 'var(--hot-3)', fontSize: 13,
            display: 'flex', alignItems: 'flex-start', gap: 12, borderRadius: 8,
            border: '1px solid var(--hot-3)44',
          }}>
            <span style={{ flex: 1, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{err}</span>
            <button onClick={() => { handleDisconnect(); }}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--hot-3)66',
                background: 'var(--hot-3)11', color: 'var(--hot-3)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Reconnect
            </button>
          </div>
        )}
        <Dashboard
          channel={channel}
          overview={overview}
          topVideos={topVideos}
          trafficSources={traffic}
          countries={countries}
          days={days}
          onDaysChange={handleDaysChange}
          onDisconnect={handleDisconnect}
          onRefresh={() => loadData(days)}
          loading={loading}
        />
      </div>
    );
  }

  window.AnalyticsPage = AnalyticsPage;
}());
