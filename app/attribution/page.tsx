'use client';
import { useState } from 'react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { attributionSurvey, trackingHealth, adScatterData, attributionAISuggestions } from '@/lib/sample-data';
import AISuggestionsPanel from '@/components/ui/AISuggestionsPanel';
import { Star, GitBranch, Activity, Database, Layers, Sparkles, ChevronDown } from 'lucide-react';
import {
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
} from 'recharts';

const COLORS = ['#334FB4', '#4A6BD6', '#EDBF63', '#34D399', '#EF4444', '#94A3B8'];

const cohortAttributionModels = ['First Click', 'Last Click', 'Linear All', 'Linear Paid'];
const cohortAttributionWindows = ['1-day click', '7-day click / 1-day view', '28-day click / 1-day view', '28-day click / 28-day view'];

const treeLayers = [
  { id: 'star', label: 'MER / nCAC', icon: Star, description: 'Top-level efficiency metrics, your north star for marketing health', color: '#EDBF63' },
  { id: 'upper', label: 'Surveys & MMM', icon: GitBranch, description: 'Directional measurement, budget allocation layer using survey data and modeling', color: '#4A6BD6' },
  { id: 'lower', label: 'MTA & Platform', icon: Activity, description: 'Ad-level optimization, tactical decisions based on multi-touch and platform data', color: '#334FB4' },
  { id: 'trunk', label: 'Tracking Infra', icon: Database, description: 'The foundation , GA4, CAPI, and server-side tracking health', color: '#34D399' },
  { id: 'roots', label: 'Cohort LTV', icon: Layers, description: 'Long-term value , measuring customer quality by acquisition source', color: '#A855F7' },
];

interface LayerInsights {
  working: string[];
  notWorking: string[];
  doNext: string[];
  stopDoing: string[];
}

const layerInsights: Record<string, LayerInsights> = {
  star: {
    working: ['MER at 3.67x is above the 3.5x healthy threshold , marketing is generating strong returns', 'nCAC trending down 2.6% MoM from ₱808 to ₱787 , acquisition getting more efficient'],
    notWorking: ['nMER at 1.92x means new customer revenue alone doesn\'t cover spend , reliant on repeats', 'MER variance across channels is high (Meta 3.91x vs Referral 0.40x)'],
    doNext: ['Set a max CPA ceiling by channel based on LTV:CAC ratios', 'Build an automated alert when MER drops below 3.0x'],
    stopDoing: ['Don\'t optimize purely on blended MER , it hides channel-level inefficiencies'],
  },
  upper: {
    working: ['Post-purchase survey captures 1,240 responses/month , statistically significant sample', 'TikTok shows 22% survey attribution, validating its top-of-funnel role beyond click tracking'],
    notWorking: ['No MMM model built yet , relying solely on survey data for channel allocation', 'No geo-lift tests run to validate incrementality of any channel'],
    doNext: ['Commission an MMM study , even a simple one using 6 months of data', 'Run a geo-lift test on TikTok to prove incremental value vs. organic discovery'],
    stopDoing: ['Stop treating survey data as ground truth for budget decisions without cross-validation'],
  },
  lower: {
    working: ['Brand Search at ₱420 CPA and 4.76x ROAS , the most efficient channel by far', 'Hair Before/After creative achieves ₱577 CPA , well below target'],
    notWorking: ['Competitor Keywords at ₱880 CPA is 12% above target and losing money', 'Platform reporting overlap inflates total attributed conversions by ~30%'],
    doNext: ['Deduplicate conversions across platforms before making budget decisions', 'Test moving top Meta creatives to TikTok format for potentially lower CPCs'],
    stopDoing: ['Stop trusting individual platform ROAS numbers at face value , always cross-reference with MER'],
  },
  trunk: {
    working: ['Meta Pixel + CAPI dual setup achieving 89-92% match rates', 'GA4 processing 22,400 events/day with stable tracking'],
    notWorking: ['Server-side GTM is completely down (0 events/day) , losing ~15% of conversion data', 'TikTok Pixel match rate at 71% , significant data loss'],
    doNext: ['Fix Server-side GTM immediately , this is the #1 priority before any budget decisions', 'Improve TikTok tracking with enhanced match keys (email, phone hashing)'],
    stopDoing: ['Stop making budget allocation decisions while server-side GTM is broken'],
  },
  roots: {
    working: ['Google Brand customers have 3.8x LTV:CAC , excellent unit economics', 'GLP-1 product has highest LTV (₱9,200 at 365d) driving overall retention'],
    notWorking: ['TikTok LTV:CAC at 1.4x is below the 2.0x minimum threshold', 'TikTok payback period of 6.8 months creates cash flow pressure'],
    doNext: ['Cap TikTok CPA at ₱600 until LTV:CAC improves above 2.0x', 'Segment TikTok cohorts by product to see if specific products have better TikTok LTV'],
    stopDoing: ['Stop scaling TikTok spend without addressing the LTV:CAC gap first'],
  },
};

const globalInsights = [
  '🔑 Overall, your attribution stack is functioning but incomplete. MER is healthy (3.67x), but you\'re flying partially blind with server-side GTM down and no MMM model.',
  '📊 Meta drives the lion\'s share of tracked conversions but survey data suggests TikTok is under-credited by platform reporting. Run a geo-lift test to validate.',
  '⚠️ Your nMER of 1.92x means you\'re relying heavily on repeat purchases to make the economics work. This is fine if retention holds, but risky if cohort quality drops.',
  '💰 Brand Search is your most efficient channel at ₱420 CPA. Ensure you\'re maxing out impression share before increasing spend elsewhere.',
  '🛠️ Fix server-side GTM before making any major budget reallocation. You\'re missing ~15% of conversion data, which skews all analysis.',
  '📈 Consider building a simple MMM model using the past 6 months of spend + revenue data. This will give you a second opinion on channel allocation beyond surveys.',
  '🎯 Set channel-specific CPA ceilings: Meta ₱850, Google ₱500, TikTok ₱600. Review weekly and pause anything consistently above ceiling.',
];

export default function AttributionPage() {
  const [activeLayer, setActiveLayer] = useState<string>('star');
  const [cohortAttrModel, setCohortAttrModel] = useState('First Click');
  const [cohortAttrWindow, setCohortAttrWindow] = useState('7-day click / 1-day view');

  const activeInfo = treeLayers.find(l => l.id === activeLayer)!;
  const insights = layerInsights[activeLayer];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-semibold">Attribution Framework</h2>

      {/* AI Suggestions */}
      <div>
        <AISuggestionsPanel 
          suggestions={attributionAISuggestions} 
          title="Cross-Layer AI Analysis"
        />
      </div>

      {/* Horizontal Tab Buttons */}
      <div className="flex gap-1.5 sm:gap-2 flex-wrap px-1">
        {treeLayers.map((layer) => {
          const isActive = activeLayer === layer.id;
          const Icon = layer.icon;
          return (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-medium transition-all border min-w-0 ${
                isActive
                  ? 'border-transparent shadow-md'
                  : 'border-border bg-bg-surface text-text-secondary hover:text-text-primary hover:border-text-tertiary'
              }`}
              style={isActive ? { backgroundColor: `${layer.color}20`, color: layer.color, borderBottom: `2px solid ${layer.color}` } : undefined}
            >
              <Icon size={14} className="shrink-0" style={{ color: isActive ? layer.color : undefined }} />
              <span className="truncate">{layer.label}</span>
            </button>
          );
        })}
      </div>

      {/* Layer Description */}
      <div className="text-sm text-text-secondary px-1">{activeInfo.description}</div>

      {/* Per-Layer AI Insights */}
      <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-warm-gold shrink-0" />
          <span className="truncate">{activeInfo.label} , AI Insights</span>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-success flex items-center gap-1.5">✅ What's Working</div>
            {insights.working.map((item, i) => (
              <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-danger flex items-center gap-1.5">⚠️ What's Not</div>
            {insights.notWorking.map((item, i) => (
              <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-brand-blue-light flex items-center gap-1.5">🎯 Do Next</div>
            {insights.doNext.map((item, i) => (
              <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-semibold text-warm-gold flex items-center gap-1.5">🛑 Stop Doing</div>
            {insights.stopDoing.map((item, i) => (
              <div key={i} className="text-sm text-text-secondary leading-relaxed pl-5">• {item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer Detail Section */}
      {activeLayer === 'star' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Star size={16} className="text-warm-gold shrink-0" />
            <span>MER / nCAC Overview</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>MER</span>
                <InfoTooltip metric="MER" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">3.67x</div>
              <div className="text-xs text-success mt-2">↑ 3.1% MoM</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <span>nCAC</span>
                <InfoTooltip metric="nCAC" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">₱787</div>
              <div className="text-xs text-success mt-2">↓ 2.6% MoM</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary">Max Mktg Spend</div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">₱680K</div>
              <div className="text-xs text-text-secondary mt-2">At 25% CM3 target</div>
            </div>
            <div className="bg-bg-elevated rounded-md p-4 min-h-[100px] flex flex-col justify-between">
              <div className="text-xs text-text-secondary">Target CPA</div>
              <div className="text-2xl sm:text-3xl font-bold text-text-primary mt-2">₱750</div>
              <div className="text-xs text-text-secondary mt-2">Based on 3.15x LTV:CAC</div>
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'upper' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <GitBranch size={16} className="text-brand-blue-light shrink-0" />
            <span className="truncate">Channel Allocation , Survey Results</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="min-h-[280px]">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={attributionSurvey} cx="50%" cy="50%" outerRadius={100} dataKey="pct" label={({ name, value }) => `${name}: ${value}%`}>
                    {attributionSurvey.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-text-secondary leading-relaxed">"How did you first hear about AndYou?" , Post-purchase survey results (last 30 days, n=1,240)</p>
              {attributionSurvey.map((s, i) => (
                <div key={s.source} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-sm text-text-primary flex-1 min-w-0 truncate">{s.source}</span>
                  <div className="w-20 sm:w-32 bg-bg-elevated rounded-full h-2 shrink-0">
                    <div className="h-2 rounded-full" style={{ width: `${s.pct}%`, background: COLORS[i] }} />
                  </div>
                  <span className="text-sm text-text-secondary w-8 sm:w-10 text-right shrink-0">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeLayer === 'lower' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Activity size={16} className="text-brand-blue shrink-0" />
            <span className="truncate">Account Control Chart , CPA vs Spend</span>
          </h3>
          <div className="min-h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="spend" name="Spend" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
                <YAxis dataKey="cpa" name="CPA" tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} tickFormatter={(v) => `₱${v}`} />
                <ZAxis dataKey="spend" range={[60, 400]} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any, name: any) => [name === 'Spend' ? `₱${(Number(value)/1000).toFixed(1)}K` : `₱${value}`, name || '']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                />
                <Scatter data={adScatterData.filter(d => d.platform === 'Meta')} fill="#4A6BD6" name="Meta" />
                <Scatter data={adScatterData.filter(d => d.platform === 'Google')} fill="#EDBF63" name="Google" />
                <Scatter data={adScatterData.filter(d => d.platform === 'TikTok')} fill="#34D399" name="TikTok" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeLayer === 'trunk' && (
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <Database size={16} className="text-success shrink-0" />
            <span className="truncate">Tracking Infrastructure Health</span>
          </h3>
          <div className="space-y-3">
            {trackingHealth.map((item) => (
              <div key={item.system} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-bg-elevated rounded-md p-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.status === 'healthy' ? 'bg-success' : item.status === 'warning' ? 'bg-warm-gold' : 'bg-danger'}`} />
                  <span className="text-sm font-medium text-text-primary truncate">{item.system}</span>
                  <InfoTooltip metric={item.system} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs text-text-secondary">
                  <span>Events: {item.events}</span>
                  <span>Match Rate: {item.matchRate}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium self-start sm:self-auto ${
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
        <div className="bg-bg-surface border border-border rounded-lg p-4 sm:p-5 mx-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
              <Layers size={16} className="text-purple-400 shrink-0" />
              <span className="truncate">Cohort-based LTV by Channel</span>
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">Model:</span>
                <div className="relative">
                  <select 
                    value={cohortAttrModel} 
                    onChange={(e) => setCohortAttrModel(e.target.value)} 
                    className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
                  >
                    {cohortAttributionModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary font-medium">Window:</span>
                <div className="relative">
                  <select 
                    value={cohortAttrWindow} 
                    onChange={(e) => setCohortAttrWindow(e.target.value)} 
                    className="appearance-none bg-bg-elevated border border-border rounded-md pl-3 pr-7 py-1.5 text-xs text-text-primary outline-none cursor-pointer hover:border-text-tertiary transition-colors"
                  >
                    {cohortAttributionWindows.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { channel: 'Meta', ltvCac: 2.1, ltv: '₱6,580', cac: '₱3,133', payback: '4.2 months' },
              { channel: 'Google (Brand)', ltvCac: 3.8, ltv: '₱7,220', cac: '₱1,900', payback: '2.1 months' },
              { channel: 'TikTok', ltvCac: 1.4, ltv: '₱4,200', cac: '₱3,000', payback: '6.8 months' },
            ].map((ch) => (
              <div key={ch.channel} className="bg-bg-elevated rounded-md p-4 space-y-3">
                <div className="text-sm font-medium text-text-primary">{ch.channel}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">LTV:CAC</span>
                  <span className={`text-xl font-bold ${ch.ltvCac >= 3 ? 'text-success' : ch.ltvCac >= 2 ? 'text-warm-gold' : 'text-danger'}`}>
                    {ch.ltvCac}x
                  </span>
                </div>
                <div className="text-xs text-text-secondary">LTV: {ch.ltv} • CAC: {ch.cac}</div>
                <div className="text-xs text-text-secondary">Payback: {ch.payback}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
