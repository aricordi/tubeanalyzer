/* ── Setup / Settings Page ─────────────────────────────────────────────── */
// Exposed: SetupPage, SettingsPage, OnboardingBanner
// Requires: window.TubeAPI

(function () {
  'use strict';
  const { useState, useEffect, useCallback } = React;

  /* ── small helpers ── */
  function Step({ num, title, children, done }) {
    return (
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: done ? 'var(--accent)' : 'var(--bg-2)',
          border: done ? 'none' : '2px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: done ? 'var(--accent-ink)' : 'var(--fg-mute)',
          fontWeight: 700, fontSize: 13, marginTop: 2,
        }}>
          {done ? '✓' : num}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
          <div style={{ color: 'var(--fg-mute)', fontSize: 14, lineHeight: 1.6 }}>{children}</div>
        </div>
      </div>
    );
  }

  function StatusBadge({ status }) {
    const map = {
      idle:    { color: 'var(--fg-dim)', label: 'Not tested' },
      testing: { color: 'var(--accent)', label: 'Testing…' },
      ok:      { color: '#4ade80', label: 'Connected ✓' },
      err:     { color: 'var(--hot-3)', label: 'Failed ✗' },
    };
    const { color, label } = map[status] || map.idle;
    return (
      <span style={{
        fontSize: 12, fontWeight: 600, color,
        background: color + '22', padding: '3px 10px', borderRadius: 20,
      }}>
        {label}
      </span>
    );
  }

  function ApiKeyCard({
    title, icon, keyName, placeholder, status, errMsg,
    value, onChange, onTest, instructions, docsUrl, learnMoreText,
    optional = false,
  }) {
    const [show, setShow] = useState(false);
    return (
      <div style={{
        background: 'var(--bg-1)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 24, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
            {optional && (
              <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 1 }}>
                Optional — enables AI features
              </div>
            )}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* instructions */}
        <div style={{
          background: 'var(--bg-2)', borderRadius: 8, padding: 16,
          marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: 'var(--fg-mute)',
        }}>
          {instructions}
          {docsUrl && (
            <div style={{ marginTop: 10 }}>
              <a href={docsUrl} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                {learnMoreText || 'Open instructions →'}
              </a>
            </div>
          )}
        </div>

        {/* input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg)', border: '1px solid var(--line)',
                borderRadius: 8, padding: '10px 40px 10px 14px',
                color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setShow(s => !s)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--fg-mute)', fontSize: 16, padding: 0,
              }}
              title={show ? 'Hide' : 'Show'}
            >
              {show ? '🙈' : '👁️'}
            </button>
          </div>
          <button
            onClick={onTest}
            disabled={!value || status === 'testing'}
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: value ? 'var(--accent)' : 'var(--bg-2)',
              color: value ? 'var(--accent-ink)' : 'var(--fg-dim)',
              fontWeight: 600, fontSize: 13, cursor: value ? 'pointer' : 'default',
              whiteSpace: 'nowrap', transition: 'all .15s',
            }}
          >
            {status === 'testing' ? '…' : 'Test'}
          </button>
        </div>

        {errMsg && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6,
            background: 'var(--hot-3)22', color: 'var(--hot-3)',
            fontSize: 12, lineHeight: 1.5,
          }}>
            {errMsg}
          </div>
        )}
      </div>
    );
  }

  /* ── Setup Page (first-run wizard) ─────────────────────────────── */
  function SetupPage({ onDone }) {
    const [ytKey, setYtKey] = useState('');
    const [gemKey, setGemKey] = useState('');
    const [ytStatus, setYtStatus] = useState('idle');
    const [gemStatus, setGemStatus] = useState('idle');
    const [ytErr, setYtErr] = useState('');
    const [gemErr, setGemErr] = useState('');
    const [saving, setSaving] = useState(false);

    const testYt = useCallback(async () => {
      setYtStatus('testing'); setYtErr('');
      window.TubeAPI.Keys.setYt(ytKey);
      try {
        await window.TubeAPI.testYouTube();
        setYtStatus('ok');
      } catch (e) {
        setYtStatus('err');
        setYtErr(friendlyError(e));
      }
    }, [ytKey]);

    const testGem = useCallback(async () => {
      setGemStatus('testing'); setGemErr('');
      window.TubeAPI.Keys.setGemini(gemKey);
      try {
        await window.TubeAPI.testGemini();
        setGemStatus('ok');
      } catch (e) {
        setGemStatus('err');
        setGemErr(friendlyError(e));
      }
    }, [gemKey]);

    const handleSave = useCallback(async () => {
      setSaving(true);
      if (ytKey) window.TubeAPI.Keys.setYt(ytKey);
      if (gemKey) window.TubeAPI.Keys.setGemini(gemKey);
      await new Promise(r => setTimeout(r, 400));
      onDone('live');
    }, [ytKey, gemKey, onDone]);

    const handleDemo = useCallback(() => onDone('demo'), [onDone]);

    const canSave = ytStatus === 'ok' || gemStatus === 'ok';

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'var(--bg)',
      }}>
        <div style={{ maxWidth: 640, width: '100%' }}>
          {/* hero */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
              Welcome to TubeAnalyzer
            </h1>
            <p style={{ color: 'var(--fg-mute)', marginTop: 10, fontSize: 15 }}>
              Connect your free API keys to unlock real YouTube data and AI-powered features.
              It takes about 5 minutes and costs nothing — you already have access.
            </p>
          </div>

          {/* what you get */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 36,
          }}>
            {[
              { icon: '📊', label: 'Live YouTube data', sub: 'Real views, outlier scores' },
              { icon: '🤖', label: 'AI idea generator', sub: 'Powered by Gemini 1.5 Flash' },
              { icon: '🎯', label: 'Thumbnail analysis', sub: 'AI score your thumbnails' },
              { icon: '🔍', label: 'Competitor tracker', sub: 'Watch any channel live' },
            ].map(({ icon, label, sub }) => (
              <div key={label} style={{
                background: 'var(--bg-1)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                  <div style={{ color: 'var(--fg-mute)', fontSize: 12 }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* YouTube API key */}
          <ApiKeyCard
            title="YouTube Data API Key"
            icon="▶️"
            value={ytKey}
            onChange={setYtKey}
            status={ytStatus}
            errMsg={ytErr}
            onTest={testYt}
            placeholder="AIzaSy…"
            instructions={
              <div>
                <Step num={1} done={false} title="Go to Google Cloud Console">
                  Visit <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}>console.cloud.google.com</a> and sign in
                  with your Google account (same one as your YouTube channel).
                </Step>
                <Step num={2} done={false} title="Create a project">
                  Click <strong>Select a project</strong> → <strong>New Project</strong>.
                  Name it "TubeAnalyzer" and click Create.
                </Step>
                <Step num={3} done={false} title="Enable YouTube Data API v3">
                  Go to <strong>APIs & Services → Library</strong>, search for
                  "YouTube Data API v3", click it, then click <strong>Enable</strong>.
                </Step>
                <Step num={4} done={false} title="Create credentials">
                  Go to <strong>APIs & Services → Credentials</strong> →
                  <strong> + Create Credentials → API Key</strong>.
                  Copy the key and paste it below. (Free tier: 10,000 requests/day — plenty for personal use.)
                </Step>
              </div>
            }
            docsUrl="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            learnMoreText="Open YouTube API console →"
          />

          {/* Gemini API key */}
          <ApiKeyCard
            title="Gemini AI Key"
            icon="✨"
            value={gemKey}
            onChange={setGemKey}
            status={gemStatus}
            errMsg={gemErr}
            onTest={testGem}
            placeholder="AIzaSy…"
            optional
            instructions={
              <div>
                <Step num={1} done={false} title="Go to Google AI Studio">
                  Visit <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)' }}>aistudio.google.com</a> — sign in with your
                  Google account (you already have Google AI Pro so you're all set).
                </Step>
                <Step num={2} done={false} title="Get your API key">
                  Click <strong>Get API key</strong> in the top-left corner, then
                  <strong> Create API key</strong>. Copy it and paste it below.
                </Step>
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--accent)22',
                  borderRadius: 6, fontSize: 12, color: 'var(--accent)' }}>
                  ✓ Free tier: 1,500 AI requests/day — this is your Google AI Pro access.
                </div>
              </div>
            }
            docsUrl="https://aistudio.google.com/app/apikey"
            learnMoreText="Open Google AI Studio →"
          />

          {/* actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={handleSave}
              disabled={!canSave || saving}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 10, border: 'none',
                background: canSave ? 'var(--accent)' : 'var(--bg-2)',
                color: canSave ? 'var(--accent-ink)' : 'var(--fg-dim)',
                fontWeight: 700, fontSize: 15, cursor: canSave ? 'pointer' : 'default',
                transition: 'all .15s',
              }}
            >
              {saving ? 'Saving…' : canSave ? 'Save & Open TubeAnalyzer →' : 'Test a key above to continue'}
            </button>
            <button
              onClick={handleDemo}
              style={{
                padding: '14px 20px', borderRadius: 10,
                border: '1px solid var(--line)', background: 'transparent',
                color: 'var(--fg-mute)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}
            >
              Demo mode
            </button>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--fg-dim)', fontSize: 12, marginTop: 12 }}>
            Keys are stored only on your computer — never sent anywhere except Google's servers.
          </p>
        </div>
      </div>
    );
  }

  /* ── Settings Page (accessed via sidebar) ──────────────────────── */
  function SettingsPage() {
    const [ytKey, setYtKey] = useState(window.TubeAPI.Keys.yt || '');
    const [gemKey, setGemKey] = useState(window.TubeAPI.Keys.gemini || '');
    const [oauthClientId, setOauthClientId] = useState(window.TubeAnalytics?.AnalyticsAuth.clientId || '');
    const [ytStatus, setYtStatus] = useState(window.TubeAPI.Keys.hasYt() ? 'ok' : 'idle');
    const [gemStatus, setGemStatus] = useState(window.TubeAPI.Keys.hasGemini() ? 'ok' : 'idle');
    const [ytErr, setYtErr] = useState('');
    const [gemErr, setGemErr] = useState('');
    const [saved, setSaved] = useState(false);
    const [cacheCleared, setCacheCleared] = useState(false);
    const [quota, setQuota] = useState(null);

    useEffect(() => {
      // estimate quota usage from cache keys
      try {
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
          if (localStorage.key(i).startsWith('ta$')) count++;
        }
        setQuota(count);
      } catch { /* ignore */ }
    }, []);

    const testYt = useCallback(async () => {
      setYtStatus('testing'); setYtErr('');
      window.TubeAPI.Keys.setYt(ytKey);
      try { await window.TubeAPI.testYouTube(); setYtStatus('ok'); }
      catch (e) { setYtStatus('err'); setYtErr(friendlyError(e)); }
    }, [ytKey]);

    const testGem = useCallback(async () => {
      setGemStatus('testing'); setGemErr('');
      window.TubeAPI.Keys.setGemini(gemKey);
      try { await window.TubeAPI.testGemini(); setGemStatus('ok'); }
      catch (e) { setGemStatus('err'); setGemErr(friendlyError(e)); }
    }, [gemKey]);

    const saveAll = useCallback(() => {
      if (ytKey) window.TubeAPI.Keys.setYt(ytKey);
      else localStorage.removeItem('ta_yt_key');
      if (gemKey) window.TubeAPI.Keys.setGemini(gemKey);
      else localStorage.removeItem('ta_gem_key');
      if (oauthClientId && window.TubeAnalytics) window.TubeAnalytics.AnalyticsAuth.setClientId(oauthClientId);
      else if (!oauthClientId) localStorage.removeItem('ta_oauth_client_id');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, [ytKey, gemKey, oauthClientId]);

    const clearCache = useCallback(() => {
      window.TubeAPI.clearCache();
      setCacheCleared(true);
      setQuota(0);
      setTimeout(() => setCacheCleared(false), 2000);
    }, []);

    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Settings</h2>
        <p style={{ color: 'var(--fg-mute)', marginBottom: 32, fontSize: 14 }}>
          Manage your API keys and app preferences.
        </p>

        <ApiKeyCard
          title="YouTube Data API Key"
          icon="▶️"
          value={ytKey}
          onChange={v => { setYtKey(v); setYtStatus('idle'); }}
          status={ytStatus}
          errMsg={ytErr}
          onTest={testYt}
          placeholder="AIzaSy…"
          instructions={
            <span>
              Get your free key from{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>Google Cloud Console</a>.
              Enable the YouTube Data API v3, then create an API key under Credentials.
              Free quota: 10,000 requests/day.
            </span>
          }
          docsUrl="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
          learnMoreText="Open Google Cloud Console →"
        />

        <ApiKeyCard
          title="Gemini AI Key"
          icon="✨"
          value={gemKey}
          onChange={v => { setGemKey(v); setGemStatus('idle'); }}
          status={gemStatus}
          errMsg={gemErr}
          onTest={testGem}
          placeholder="AIzaSy…"
          optional
          instructions={
            <span>
              Get your free key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--accent)' }}>Google AI Studio</a>.
              Click "Get API key" → "Create API key". Free tier: 1,500 requests/day.
              {gemKey && gemKey.length > 10 && (
                <span> · <a
                  href={`https://generativelanguage.googleapis.com/v1beta/models?key=${gemKey}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}>
                  Diagnose key →
                </a> (opens raw API response in browser)</span>
              )}
            </span>
          }
          docsUrl="https://aistudio.google.com/app/apikey"
          learnMoreText="Open Google AI Studio →"
        />

        {/* YouTube Analytics OAuth Client ID */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 24, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>📊</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>YouTube Analytics (OAuth)</div>
              <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 1 }}>
                Optional — enables "My Analytics" dashboard with personal channel data
              </div>
            </div>
          </div>
          <div style={{
            background: 'var(--bg-2)', borderRadius: 8, padding: 14,
            marginBottom: 14, fontSize: 13, lineHeight: 1.6, color: 'var(--fg-mute)',
          }}>
            Requires an OAuth 2.0 Client ID from Google Cloud Console (same project as your YouTube API key).
            Go to <strong>Credentials → Create → OAuth 2.0 Client ID</strong>, type "Web application",
            add <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>http://localhost:8765</code> as
            an authorized JavaScript origin. Full setup guide is on the Analytics page.
          </div>
          <input
            type="password"
            value={oauthClientId}
            onChange={e => setOauthClientId(e.target.value)}
            placeholder="123456789-abc….apps.googleusercontent.com"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '10px 14px',
              color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
        </div>

        {/* save button */}
        <button
          onClick={saveAll}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 32,
          }}
        >
          {saved ? '✓ Saved!' : 'Save Keys'}
        </button>

        {/* cache management */}
        <div style={{
          background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Data Cache</div>
          <p style={{ color: 'var(--fg-mute)', fontSize: 13, margin: '0 0 14px' }}>
            TubeAnalyzer caches YouTube data for 24 hours to save your daily quota.
            {quota !== null && ` Currently storing ${quota} cached item${quota !== 1 ? 's' : ''}.`}
          </p>
          <button
            onClick={clearCache}
            style={{
              padding: '9px 18px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'transparent', color: 'var(--fg-mute)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            {cacheCleared ? '✓ Cache cleared!' : 'Clear cache & refresh data'}
          </button>
        </div>

        {/* quota info */}
        <div style={{
          marginTop: 20, background: 'var(--bg-1)', border: '1px solid var(--line)',
          borderRadius: 12, padding: 20,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>API Quota Guide</div>
          <div style={{ fontSize: 13, color: 'var(--fg-mute)', lineHeight: 1.8 }}>
            <div>• Search for videos = <strong>100 units</strong> (cached 24h)</div>
            <div>• Video details = <strong>1 unit</strong> per 50 videos (cached 1h)</div>
            <div>• Channel info = <strong>1 unit</strong> (cached 24h)</div>
            <div>• Daily free limit = <strong>10,000 units</strong> (~100 searches/day)</div>
            <div style={{ marginTop: 8, color: 'var(--fg-dim)', fontSize: 12 }}>
              Tip: The cache means repeated lookups are free. You'll comfortably stay
              under quota for personal research use.
            </div>
          </div>
        </div>

        {/* privacy note */}
        <p style={{ textAlign: 'center', color: 'var(--fg-dim)', fontSize: 12, marginTop: 20 }}>
          🔒 API keys are stored locally in your browser. They're never sent to anyone except Google's servers.
        </p>
      </div>
    );
  }

  /* ── Onboarding Banner ──────────────────────────────────────────── */
  function OnboardingBanner({ onSetup, onDismiss }) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, var(--accent)22, var(--accent)08)',
        border: '1px solid var(--accent)55',
        borderRadius: 12, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        margin: '0 0 20px',
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🔑</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            You're in demo mode — add free API keys to unlock real YouTube data
          </div>
          <div style={{ color: 'var(--fg-mute)', fontSize: 12, marginTop: 2 }}>
            Takes 5 minutes. Uses your existing Google account.
          </div>
        </div>
        <button
          onClick={onSetup}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: 'var(--accent-ink)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
          }}
        >
          Set up keys
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--fg-dim)', fontSize: 18, padding: 0, flexShrink: 0,
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    );
  }

  /* ── error formatter ── */
  function friendlyError(e) {
    const code = e?.code || '';
    const msg  = (e?.message || String(e)).toLowerCase();
    if (code === 'NO_KEY'  || msg.includes('no key'))       return 'No key provided. Paste your API key above.';
    if (code === 'BAD_KEY' || msg.includes('api_key_invalid') || msg.includes('invalid api key'))
      return 'Invalid key — check it was copied completely.';
    if (code === 'NOT_ENABLED')
      return 'Gemini API not enabled. In AI Studio, make sure the project has "Gemini API" enabled.';
    if (code === 'QUOTA' || msg.includes('quota') || msg.includes('resource_exhausted'))
      return 'Quota exceeded. If this is a new key: in Google AI Studio go to Settings → Billing and confirm your free tier is active. Otherwise wait a minute and retry (free limit: 15 requests/min).';
    if (msg.includes('networkerror') || msg.includes('failed to fetch'))
      return 'Network error — check your internet connection.';
    return (e?.message || String(e)).slice(0, 160);
  }

  /* ── exports ── */
  window.SetupPage = SetupPage;
  window.SettingsPage = SettingsPage;
  window.OnboardingBanner = OnboardingBanner;
}());
