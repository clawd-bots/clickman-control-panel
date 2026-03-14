'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { attributionSurvey, trackingHealth, adScatterData, attributionAISuggestions } from '@/lib/sample-data';
import { Star, GitBranch, Activity, Database, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import {
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
} from 'recharts';

const COLORS = ['#334FB4', '#4A6BD6', '#E8C872', '#34D399', '#EF4444', '#94A3B8'];

const treeLayers = [
  { id: 'star', label: 'MER / nCAC', icon: Star, description: 'Top-level efficiency metrics — the north star', color: '#E8C872' },
  { id: 'upper', label: 'Post-Purchase Surveys, MMM, Geo-Lift', icon: GitBranch, description: 'Directional measurement — budget allocation layer', color: '#4A6BD6' },
  { id: 'lower', label: 'MTA & Platform Reporting', icon: Activity, description: 'Ad-level optimization — tactical decisions', color: '#334FB4' },
  { id: 'trunk', label: 'GA4, CAPI, Server-side Tracking', icon: Database, description: 'Tracking infrastructure — the foundation', color: '#34D399' },
  { id: 'roots', label: 'Cohort-based LTV', icon: Layers, description: 'Long-term value — customer quality measurement', color: '#A855F7' },
];

export default function AttributionPage() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <h2 className="text-lg font-semibold">Attribution Tree</h2>

      {/* Visual Tree */}
      <div className="bg-bg-surface border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-text-secondary mb-6 text-center">The Christmas Tree Framework</h3>
        <div className="flex flex-col items-center gap-2 max-w-2xl mx-auto">
          {treeLayers.map((layer, i) => {
            const isActive = activeLayer === layer.id;
            const Icon = layer.icon;
            const widthPct = i === 0 ? 'w-48' : i === 1 ? 'w-72' : i === 2 ? 'w-96' : i === 3 ? 'w-56' : 'w-80';
            return (
              <button
                key={layer.id}
                onClick={() => setActiveLayer(isActive ? null : layer.id)}
                className={`${widthPct} flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                  isActive
                    ? 'border-brand-blue bg-brand-blue/15 shadow-lg shadow-brand-blue/10'
                    : 'border-border bg-bg-elevated hover:border-text-tertiary'
                }`}
                style={{ borderColor: isActive ? layer.color : undefined }}
              >
                <Icon size={16} style={{ color: layer.color }} />
                <span className="text-xs font-medium text-text-primary">{layer.label}</span>
                {isActive ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
              </button>
            );
          })}
          {/* Visual connector lines */}
          <div className="text-[10px] text-text-tertiary mt-2 text-center">
            Click any layer to expand details
          </div>
        </div>
      </div>

      {/* Layer Detail Section */}
      {activeLayer === 'star' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Star size={16} className="text-warm-gold" /> MER / nCAC Overview
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-bg-elevated rounded-md p-4">
              <div className="text-xs text-text-tertiary flex items-center">MER <InfoTooltip metric="MER" /></div>
              <div className="text-2xl font-bold text-text-primary mt-1">3.67x</div>
              <div className="text-xs text-success mt-1">↑ 3.1% MoM</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4">
              <div className="text-xs text-text-tertiary flex items-center">nCAC <InfoTooltip metric="nCAC" /></div>
              <div className="text-2xl font-bold text-text-primary mt-1">₱787</div>
              <div className="text-xs text-success mt-1">↓ 2.6% MoM</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4">
              <div className="text-xs text-text-tertiary">Max Mktg Spend</div>
              <div className="text-2xl font-bold text-text-primary mt-1">₱680K</div>
              <div className="text-xs text-text-secondary mt-1">At 25% CM3 target</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4">
              <div className="text-xs text-text-tertiary">Target CPA</div>
              <div className="text-2xl font-bold text-text-primary mt-1">₱750</div>
              <div className="text-xs text-text-secondary mt-1">Based on 3.15x LTV:CAC</div>
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'upper' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <GitBranch size={16} className="text-brand-blue-light" /> Channel Allocation — Survey Results
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={attributionSurvey} cx="50%" cy="50%" outerRadius={100} dataKey="pct" label={({ name, value }) => `${name}: ${value}%`}>
                    {attributionSurvey.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">&quot;How did you first hear about AndYou?&quot; — Post-purchase survey results (last 30 days, n=1,240)</p>
              {attributionSurvey.map((s, i) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-text-primary flex-1">{s.source}</span>
                  <div className="w-32 bg-bg-elevated rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${s.pct}%`, background: COLORS[i] }} />
                  </div>
                  <span className="text-sm text-text-secondary w-10 text-right">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'lower' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Activity size={16} className="text-brand-blue" /> Account Control Chart — CPA vs Spend
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="spend" name="Spend" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
              <YAxis dataKey="cpa" name="CPA" tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => `₱${v}`} />
              <ZAxis dataKey="spend" range={[60, 400]} />
              <Tooltip
                contentStyle={{ background: '#161927', border: '1px solid #1E293B', borderRadius: 8, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [name === 'Spend' ? `₱${(Number(value)/1000).toFixed(1)}K` : `₱${value}`, name || '']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
              />
              <Scatter data={adScatterData.filter(d => d.platform === 'Meta')} fill="#4A6BD6" name="Meta" />
              <Scatter data={adScatterData.filter(d => d.platform === 'Google')} fill="#E8C872" name="Google" />
              <Scatter data={adScatterData.filter(d => d.platform === 'TikTok')} fill="#34D399" name="TikTok" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeLayer === 'trunk' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Database size={16} className="text-success" /> Tracking Infrastructure Health
          </h3>
          <div className="space-y-3">
            {trackingHealth.map((item) => (
              <div key={item.system} className="flex items-center justify-between bg-bg-elevated rounded-md p-3">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.status === 'healthy' ? 'bg-success' : item.status === 'warning' ? 'bg-warm-gold' : 'bg-danger'}`} />
                  <span className="text-sm font-medium text-text-primary">{item.system}</span>
                  <InfoTooltip metric={item.system === 'Meta CAPI' ? 'CAPI' : item.system} />
                </div>
                <div className="flex items-center gap-6 text-xs text-text-secondary">
                  <span>Events: {item.events}</span>
                  <span>Match Rate: {item.matchRate}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'healthy' ? 'bg-success/15 text-success' :
                    item.status === 'warning' ? 'bg-warm-gold/15 text-warm-gold' :
                    'bg-danger/15 text-danger'
                  }`}>
                    {item.status === 'healthy' ? 'Healthy' : item.status === 'warning' ? 'Warning' : 'Error'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeLayer === 'roots' && (
        <div className="bg-bg-surface border border-border rounded-lg p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Layers size={16} className="text-purple-400" /> Cohort-based LTV by Channel
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { channel: 'Meta', ltvCac: 2.1, ltv: '₱6,580', cac: '₱3,133', payback: '4.2 months' },
              { channel: 'Google (Brand)', ltvCac: 3.8, ltv: '₱7,220', cac: '₱1,900', payback: '2.1 months' },
              { channel: 'TikTok', ltvCac: 1.4, ltv: '₱4,200', cac: '₱3,000', payback: '6.8 months' },
            ].map((ch) => (
              <div key={ch.channel} className="bg-bg-elevated rounded-md p-4 space-y-2">
                <div className="text-sm font-medium text-text-primary">{ch.channel}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary">LTV:CAC</span>
                  <span className={`text-lg font-bold ${ch.ltvCac >= 3 ? 'text-success' : ch.ltvCac >= 2 ? 'text-warm-gold' : 'text-danger'}`}>
                    {ch.ltvCac}x
                  </span>
                </div>
                <div className="text-xs text-text-secondary">LTV: {ch.ltv} · CAC: {ch.cac}</div>
                <div className="text-xs text-text-tertiary">Payback: {ch.payback}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      <AISuggestionsPanel suggestions={attributionAISuggestions} />
    </div>
  );
}
