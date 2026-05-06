// TubeAnalyzer — YouTube Analytics API (OAuth 2.0)
// Requires Google Identity Services (GIS) loaded via <script> in HTML.
// Access tokens are kept in memory only — not persisted to localStorage.
(function () {
  'use strict';

  const ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2';
  const YT_BASE        = 'https://www.googleapis.com/youtube/v3';

  // ─── Token state (in-memory only) ─────────────────────────────────────────
  let _accessToken    = null;
  let _tokenExpiry    = 0;
  let _grantedScopes  = '';

  const SCOPES = [
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.readonly',
  ];

  // ─── Auth object ───────────────────────────────────────────────────────────
  const AnalyticsAuth = {
    get clientId()    { return localStorage.getItem('ta_oauth_client_id') || ''; },
    setClientId(v)    { localStorage.setItem('ta_oauth_client_id', v.trim()); },

    get accessToken() { return _accessToken; },
    get grantedScopes(){ return _grantedScopes; },
    get isConnected() { return !!(_accessToken && Date.now() < _tokenExpiry); },

    /**
     * Connect via GIS popup. Always creates a fresh token client to avoid
     * stale callback closures. Uses prompt='consent' to force scope grants.
     * Returns { token, scope, expires_in } on success.
     */
    connect({ forceConsent = true } = {}) {
      return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
          reject(Object.assign(new Error('Google Identity Services not loaded. Refresh the page and try again.'), { code: 'GIS_NOT_READY' }));
          return;
        }
        const clientId = this.clientId;
        if (!clientId || clientId.length < 20) {
          reject(Object.assign(new Error('No OAuth Client ID configured.'), { code: 'NO_CLIENT_ID' }));
          return;
        }
        if (!clientId.endsWith('.apps.googleusercontent.com')) {
          reject(Object.assign(new Error('Client ID looks malformed — should end in .apps.googleusercontent.com'), { code: 'BAD_CLIENT_ID' }));
          return;
        }

        // Fresh client each call: GIS callbacks close over resolve/reject,
        // so a cached client would call the previous Promise's handlers.
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES.join(' '),
          callback: (response) => {
            if (response.error) {
              reject(Object.assign(
                new Error(response.error_description || response.error),
                { code: 'OAUTH_ERR', detail: response }
              ));
              return;
            }
            if (!response.access_token) {
              reject(Object.assign(new Error('Authorization succeeded but no access token was returned.'), { code: 'OAUTH_ERR' }));
              return;
            }
            _accessToken   = response.access_token;
            _tokenExpiry   = Date.now() + (Number(response.expires_in || 3600) * 1000);
            _grantedScopes = response.scope || '';
            resolve({
              token:      response.access_token,
              scope:      response.scope || '',
              expires_in: Number(response.expires_in || 0),
            });
          },
          error_callback: (err) => {
            reject(Object.assign(
              new Error(err.message || err.type || 'OAuth flow failed (popup closed or blocked).'),
              { code: 'OAUTH_ERR', detail: err }
            ));
          },
        });

        // 'select_account consent' forces both account picker + consent screen,
        // so the user can switch to a different Google account if their first
        // attempt was on a Google account that doesn't own the YouTube channel.
        client.requestAccessToken({ prompt: forceConsent ? 'select_account consent' : '' });
      });
    },

    disconnect() {
      if (_accessToken && window.google?.accounts?.oauth2) {
        try { window.google.accounts.oauth2.revoke(_accessToken, () => {}); } catch {}
      }
      _accessToken   = null;
      _tokenExpiry   = 0;
      _grantedScopes = '';
    },
  };

  // ─── Token diagnostic — calls Google's tokeninfo endpoint ─────────────────
  // Returns { ok, scopes, audience, expires_in, hasAnalyticsScope, hasYouTubeScope, reason? }
  async function diagnoseToken() {
    if (!_accessToken) return { ok: false, reason: 'No access token. Click Connect first.' };
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(_accessToken)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, reason: data.error_description || data.error || `tokeninfo HTTP ${res.status}`, raw: data };
      }
      const scopes = (data.scope || '').split(' ').filter(Boolean);
      return {
        ok: true,
        scopes,
        audience:           data.aud || data.azp,
        expires_in:         Number(data.expires_in || 0),
        hasAnalyticsScope:  scopes.includes('https://www.googleapis.com/auth/yt-analytics.readonly'),
        hasYouTubeScope:    scopes.includes('https://www.googleapis.com/auth/youtube.readonly'),
      };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  // ─── Analytics fetch helper ────────────────────────────────────────────────
  async function analyticsRequest(params) {
    if (!AnalyticsAuth.isConnected) {
      throw Object.assign(new Error('Not connected to YouTube Analytics.'), { code: 'NOT_CONNECTED' });
    }
    const url = new URL(`${ANALYTICS_BASE}/reports`);
    for (const [k, v] of Object.entries(params)) {
      if (v != null) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AnalyticsAuth.accessToken}` },
    });
    if (!res.ok) {
      const body   = await res.json().catch(() => ({}));
      const apiMsg = body.error?.message || `HTTP ${res.status}`;
      const reason = body.error?.errors?.[0]?.reason || '';
      if (res.status === 401) {
        throw Object.assign(new Error(apiMsg), { code: 'AUTH_EXPIRED', apiMsg, reason, status: 401 });
      }
      if (res.status === 403) {
        throw Object.assign(new Error(apiMsg), { code: 'ANALYTICS_QUOTA', apiMsg, reason, status: 403 });
      }
      throw Object.assign(new Error(apiMsg), { code: 'ANALYTICS_ERR', apiMsg, reason, status: res.status });
    }
    return res.json();
  }

  function dateStr(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  }

  // ─── Get authenticated user's channel ─────────────────────────────────────
  // Returns null on any error — not fatal, dashboard works without it.
  async function getMyChannel() {
    if (!AnalyticsAuth.isConnected) return null;
    try {
      const res = await fetch(
        `${YT_BASE}/channels?part=snippet,statistics,brandingSettings&mine=true`,
        { headers: { Authorization: `Bearer ${AnalyticsAuth.accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.items?.[0] || null;
    } catch {
      return null;
    }
  }

  // ─── Channel overview (daily breakdown) ───────────────────────────────────
  async function getChannelOverview(days = 28) {
    const endDate   = dateStr(1);
    const startDate = dateStr(days);

    let data;
    try {
      data = await analyticsRequest({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,averageViewDuration,estimatedRevenue',
        dimensions: 'day',
        sort: 'day',
      });
    } catch (e) {
      // estimatedRevenue may be forbidden if channel isn't monetized — retry without it
      if (e.code === 'ANALYTICS_ERR' || e.code === 'ANALYTICS_QUOTA') {
        data = await analyticsRequest({
          ids: 'channel==MINE',
          startDate,
          endDate,
          metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,averageViewDuration',
          dimensions: 'day',
          sort: 'day',
        });
      } else throw e;
    }

    const headers = data.columnHeaders?.map(h => h.name) || [];
    const rows    = data.rows || [];

    const result = {
      days: [],
      totals: { views: 0, watchMinutes: 0, subsGained: 0, subsLost: 0, revenue: null, avgDuration: 0 },
    };

    for (const row of rows) {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      const entry = {
        date:        obj.day,
        views:       +obj.views || 0,
        watchMinutes: +obj.estimatedMinutesWatched || 0,
        subsGained:  +obj.subscribersGained || 0,
        subsLost:    +obj.subscribersLost || 0,
        avgDuration: +obj.averageViewDuration || 0,
        revenue:     obj.estimatedRevenue != null ? +obj.estimatedRevenue : null,
      };
      result.days.push(entry);
      result.totals.views        += entry.views;
      result.totals.watchMinutes += entry.watchMinutes;
      result.totals.subsGained   += entry.subsGained;
      result.totals.subsLost     += entry.subsLost;
      if (entry.revenue != null) {
        result.totals.revenue = (result.totals.revenue || 0) + entry.revenue;
      }
    }

    if (rows.length > 0) {
      result.totals.avgDuration = result.days.reduce((s, d) => s + d.avgDuration, 0) / rows.length;
    }
    result.totals.netSubs = result.totals.subsGained - result.totals.subsLost;

    return result;
  }

  // ─── Top performing videos ─────────────────────────────────────────────────
  async function getTopVideos(days = 28) {
    const endDate   = dateStr(1);
    const startDate = dateStr(days);

    const data = await analyticsRequest({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage',
      dimensions: 'video',
      sort: '-views',
      maxResults: 10,
    });

    const headers = data.columnHeaders?.map(h => h.name) || [];
    return (data.rows || []).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return {
        videoId:      obj.video,
        views:        +obj.views || 0,
        watchMinutes: +obj.estimatedMinutesWatched || 0,
        avgDuration:  +obj.averageViewDuration || 0,
        retentionPct: +obj.averageViewPercentage || 0,
        title:        '',
        thumbnail:    '',
      };
    });
  }

  // ─── Traffic sources ───────────────────────────────────────────────────────
  const SOURCE_LABELS = {
    YT_SEARCH:         'YouTube Search',
    EXT_URL:           'External',
    NOTIFICATION:      'Notifications',
    NO_LINK_EMBEDDED:  'Embedded',
    SUBSCRIBER:        'Subscribers',
    YT_CHANNEL:        'Channel pages',
    RELATED_VIDEO:     'Suggested videos',
    PLAYLIST:          'Playlists',
    ANNOTATION:        'End screens',
    CAMPAIGN_CARD:     'Promoted',
    YT_OTHER_PAGE:     'Other YouTube',
    DIRECT_OR_UNKNOWN: 'Direct / unknown',
  };

  async function getTrafficSources(days = 28) {
    const endDate   = dateStr(1);
    const startDate = dateStr(days);

    const data = await analyticsRequest({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
    });

    const headers = data.columnHeaders?.map(h => h.name) || [];
    const total   = (data.rows || []).reduce((s, r) => s + (+r[1] || 0), 0) || 1;

    return (data.rows || []).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      const views = +obj.insightTrafficSourceType === obj.insightTrafficSourceType
        ? +obj.views : +row[1] || 0;
      const src   = row[0];
      return {
        source: src,
        label:  SOURCE_LABELS[src] || src,
        views:  +row[1] || 0,
        pct:    Math.round(((+row[1] || 0) / total) * 100),
      };
    });
  }

  // ─── Top countries ─────────────────────────────────────────────────────────
  async function getTopCountries(days = 28) {
    const endDate   = dateStr(1);
    const startDate = dateStr(days);

    const data = await analyticsRequest({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'country',
      sort: '-views',
      maxResults: 10,
    });

    const total = (data.rows || []).reduce((s, r) => s + (+r[1] || 0), 0) || 1;
    return (data.rows || []).map(row => ({
      country: row[0],
      views:   +row[1] || 0,
      pct:     Math.round(((+row[1] || 0) / total) * 100),
    }));
  }

  // ─── Expose ────────────────────────────────────────────────────────────────
  window.TubeAnalytics = {
    AnalyticsAuth,
    diagnoseToken,
    getMyChannel,
    getChannelOverview,
    getTopVideos,
    getTrafficSources,
    getTopCountries,
  };
}());
