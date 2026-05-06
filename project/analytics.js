// TubeAnalyzer — YouTube Analytics API (OAuth 2.0)
// Requires Google Identity Services (GIS) loaded via <script> in HTML.
// Access tokens are kept in memory only — not persisted to localStorage.
(function () {
  'use strict';

  const ANALYTICS_BASE = 'https://youtubeanalytics.googleapis.com/v2';
  const YT_BASE        = 'https://www.googleapis.com/youtube/v3';

  // ─── Token state (in-memory only) ─────────────────────────────────────────
  let _accessToken = null;
  let _tokenExpiry = 0;
  let _tokenClient = null;

  // ─── Auth object ───────────────────────────────────────────────────────────
  const AnalyticsAuth = {
    get clientId()    { return localStorage.getItem('ta_oauth_client_id') || ''; },
    setClientId(v)    { localStorage.setItem('ta_oauth_client_id', v.trim()); _tokenClient = null; },

    get accessToken() { return _accessToken; },
    get isConnected() { return !!(this.accessToken && Date.now() < _tokenExpiry); },

    connect() {
      return new Promise((resolve, reject) => {
        if (!window.google?.accounts?.oauth2) {
          reject(Object.assign(new Error('Google Identity Services not loaded yet. Wait a moment and try again.'), { code: 'GIS_NOT_READY' }));
          return;
        }
        const clientId = this.clientId;
        if (!clientId || clientId.length < 20) {
          reject(Object.assign(new Error('No OAuth Client ID configured.'), { code: 'NO_CLIENT_ID' }));
          return;
        }

        // Re-create client if clientId changed
        if (!_tokenClient) {
          _tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: [
              'https://www.googleapis.com/auth/yt-analytics.readonly',
              'https://www.googleapis.com/auth/youtube.readonly',
            ].join(' '),
            callback: (response) => {
              if (response.error) {
                reject(Object.assign(new Error(response.error_description || response.error), { code: 'OAUTH_ERR' }));
                return;
              }
              _accessToken = response.access_token;
              _tokenExpiry = Date.now() + (+response.expires_in * 1000);
              resolve(response.access_token);
            },
            error_callback: (err) => {
              reject(Object.assign(new Error(err.message || 'OAuth flow failed'), { code: 'OAUTH_ERR' }));
            },
          });
        }

        // prompt: '' means no prompt if already authorized; 'consent' forces re-consent
        _tokenClient.requestAccessToken({ prompt: '' });
      });
    },

    disconnect() {
      if (_accessToken && window.google?.accounts?.oauth2) {
        window.google.accounts.oauth2.revoke(_accessToken, () => {});
      }
      _accessToken = null;
      _tokenExpiry = 0;
    },
  };

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
      const body = await res.json().catch(() => ({}));
      const msg  = body.error?.message || `HTTP ${res.status}`;
      if (res.status === 401) throw Object.assign(new Error('Session expired — reconnect Analytics.'), { code: 'AUTH_EXPIRED' });
      if (res.status === 403) throw Object.assign(new Error(msg), { code: 'ANALYTICS_QUOTA' });
      throw Object.assign(new Error(msg), { code: 'ANALYTICS_ERR' });
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
    getMyChannel,
    getChannelOverview,
    getTopVideos,
    getTrafficSources,
    getTopCountries,
  };
}());
