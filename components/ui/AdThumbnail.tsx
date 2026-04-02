'use client';
import { useState, useEffect } from 'react';

interface AdThumbnailProps {
  adId?: string;
  platform?: string;
  size?: number;
}

export default function AdThumbnail({ adId, platform, size = 40 }: AdThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!adId || !platform || (platform !== 'Meta' && platform !== 'TikTok')) {
      return;
    }

    setLoading(true);
    setError(false);

    fetch(`/api/ad-creative?platform=${platform}&adId=${adId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setImageUrl(json.data.thumbnailUrl || json.data.imageUrl || null);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [adId, platform]);

  if (!adId || !platform || (platform !== 'Meta' && platform !== 'TikTok')) {
    return (
      <div
        className="rounded bg-bg-elevated border border-border flex items-center justify-center text-text-tertiary text-[8px]"
        style={{ width: size, height: size }}
      >
        N/A
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="rounded bg-bg-elevated border border-border animate-pulse"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!imageUrl || error) {
    return (
      <div
        className="rounded bg-bg-elevated border border-border flex items-center justify-center text-text-tertiary text-[8px]"
        style={{ width: size, height: size }}
      >
        —
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Ad"
      className="rounded border border-border object-cover"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
