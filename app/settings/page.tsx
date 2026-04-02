'use client';
import { useState, useEffect } from 'react';
import { Settings, RefreshCw, Trash2, Save, Clock } from 'lucide-react';

interface CacheConfig {
  ttls: Record<string, number>;
  lastCleared?: number;
}

const DATA_SOURCES = [
  { key: 'triple-whale', label: 'Triple Whale', description: 'Dashboard KPIs, channel attribution, creative data' },
  { key: 'ga4', label: 'Google Analytics (GA4)', description: 'Sessions, users, engagement metrics' },
  { key: 'meta', label: 'Meta Ads', description: 'Ad performance, creative assets' },
  { key: 'google-sheets', label: 'Google Sheets (P&L)', description: 'Profit & Loss financial data' },
  { key: 'google-ads', label: 'Google Ads', description: 'Search spend and conversion data' },
  { key: 'tiktok', label: 'TikTok Ads', description: 'TikTok ad performance data' },
  { key: 'reddit', label: 'Reddit Ads', description: 'Reddit ad performance data' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<CacheConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editTtls, setEditTtls] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/cache-config')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setConfig(json.config);
          setEditTtls(json.config.ttls || {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/cache-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttls: editTtls }),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached data? Next page load will fetch fresh data from all sources.')) return;
    setClearing(true);
    try {
      await fetch('/api/cache-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });
      setConfig(prev => prev ? { ...prev, lastCleared: Date.now() } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  const formatTtl = (minutes: number): string => {
    if (minutes >= 1440) return `${(minutes / 1440).toFixed(0)} day${minutes >= 2880 ? 's' : ''}`;
    if (minutes >= 60) return `${(minutes / 60).toFixed(0)} hour${minutes >= 120 ? 's' : ''}`;
    return `${minutes} min`;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings size={24} />
          Settings
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Configure data caching and refresh behavior.
        </p>
      </div>

      {/* Cache Overview */}
      <div className="bg-bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Clock size={16} />
            Data Cache Configuration
          </h3>
          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-md text-xs font-medium hover:bg-danger/20 disabled:opacity-50 transition-colors"
          >
            {clearing ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {clearing ? 'Clearing...' : 'Clear All Cache'}
          </button>
        </div>

        <p className="text-xs text-text-secondary mb-4">
          Cached data is served instantly on page load. When the cache expires, fresh data is fetched from the source API.
          Use "Clear All Cache" to force a fresh fetch on the next page load.
        </p>

        {config?.lastCleared && (
          <p className="text-xs text-text-tertiary mb-4">
            Last cleared: {new Date(config.lastCleared).toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}
          </p>
        )}

        {loading ? (
          <div className="text-sm text-text-secondary text-center py-8">Loading configuration...</div>
        ) : (
          <div className="space-y-3">
            {DATA_SOURCES.map(source => (
              <div key={source.key} className="flex items-center gap-4 p-3 bg-bg-elevated rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{source.label}</div>
                  <div className="text-xs text-text-tertiary">{source.description}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={editTtls[source.key] || 1440}
                    onChange={(e) => setEditTtls(prev => ({ ...prev, [source.key]: parseInt(e.target.value) }))}
                    className="bg-bg-surface border border-border rounded-md px-2 py-1.5 text-xs text-text-primary outline-none"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={360}>6 hours</option>
                    <option value={720}>12 hours</option>
                    <option value={1440}>24 hours</option>
                    <option value={2880}>48 hours</option>
                    <option value={10080}>7 days</option>
                  </select>
                  <span className="text-xs text-text-tertiary w-16 text-right">
                    {formatTtl(editTtls[source.key] || 1440)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white text-sm rounded-md hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
