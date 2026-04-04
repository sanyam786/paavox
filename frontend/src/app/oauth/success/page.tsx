'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function OAuthSuccess() {
  const searchParams = useSearchParams();
  const platform = searchParams.get('platform') ?? '';

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform }, window.location.origin);
      window.close();
    } else {
      // Fallback if opened without opener (e.g. direct navigation)
      window.location.href = '/settings?tab=accounts';
    }
  }, [platform]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="font-medium text-gray-800 capitalize">{platform} connected!</p>
        <p className="text-sm text-gray-400 mt-1">You can close this tab.</p>
      </div>
    </div>
  );
}
