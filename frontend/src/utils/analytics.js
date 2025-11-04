// Minimal analytics utility with platform-aware metadata

const getPlatform = () => {
  if (typeof window === 'undefined') return 'Server';
  if (typeof window !== 'undefined' && window.__VERCEL) return 'Vercel';
  if (import.meta && import.meta.env && import.meta.env.VITE_APP_PLATFORM) return import.meta.env.VITE_APP_PLATFORM;
  return 'Web';
};

export function trackEvent(eventName, properties = {}) {
  try {
    const payload = {
      event: eventName,
      properties: {
        ...properties,
        platform: getPlatform(),
        env: import.meta.env.MODE,
        app: import.meta.env.VITE_APP_NAME || 'CRMS',
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
      },
      ts: Date.now(),
    };
    // Placeholder: replace with real analytics provider or backend endpoint
    // eslint-disable-next-line no-console
    console.log('[AnalyticsEvent]', payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[AnalyticsEvent] Failed', err);
  }
}
