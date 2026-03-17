'use client';
import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

const issueTypes = ['Bug', 'Feature Request', 'Data Issue', 'Other'];

export default function ReportToAlfred() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('Bug');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const report = {
      type,
      description,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    // Save to localStorage for Alfred to check
    const existingReports = JSON.parse(localStorage.getItem('alfredReports') || '[]');
    existingReports.push(report);
    localStorage.setItem('alfredReports', JSON.stringify(existingReports));

    // Also try to send to a webhook endpoint if available
    try {
      await fetch('/api/alfred-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch (error) {
      // Fallback: save to localStorage
      console.log('[Report to Alfred] Saved locally:', report);
    }

    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setSubmitted(false);
      setDescription('');
      setType('Bug');
    }, 2000);
  };

  return (
    <>
      {/* Fixed button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 bg-warm-gold text-bg-primary px-3 py-2 md:px-4 md:py-2.5 rounded-full shadow-lg hover:bg-warm-gold-light transition-colors text-xs md:text-sm font-semibold"
        style={{ marginLeft: '0' }}
      >
        <MessageCircle size={16} />
        <span className="hidden sm:inline">Report to Alfred 🎩</span>
        <span className="sm:hidden">🎩</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-bg-surface border border-border rounded-xl w-[calc(100vw-2rem)] max-w-[420px] mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">Report to Alfred 🎩</h3>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-text-secondary">
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-sm text-text-primary font-medium">Report submitted</div>
                <div className="text-xs text-text-secondary mt-1">Alfred will review this shortly.</div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs text-text-secondary font-medium mb-1.5">Issue Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:border-warm-gold transition-colors"
                  >
                    {issueTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-text-secondary font-medium mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue or request..."
                    rows={4}
                    className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm text-text-primary outline-none focus:border-warm-gold transition-colors resize-none placeholder:text-text-tertiary"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!description.trim()}
                  className="w-full bg-warm-gold text-bg-primary py-2.5 rounded-md text-sm font-semibold hover:bg-warm-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
