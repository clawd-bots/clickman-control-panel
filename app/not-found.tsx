import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="text-6xl mb-4">🎯</div>
      <h2 className="text-2xl font-bold text-text-primary mb-2">Page Not Found</h2>
      <p className="text-sm text-text-secondary mb-6 max-w-md">
        This page doesn&apos;t exist in the Click-Man Control Panel. Let&apos;s get you back on track.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-warm-gold text-bg-primary rounded-lg text-sm font-semibold hover:bg-warm-gold-light transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
