/*
  Lightweight analytics abstraction for Vite + React SPA.
  Providers supported via env:
    - GA4: VITE_GA_MEASUREMENT_ID
    - Plausible: VITE_PLAUSIBLE_DOMAIN, optional VITE_PLAUSIBLE_SRC
    - Umami: VITE_UMAMI_WEBSITE_ID, VITE_UMAMI_SRC
  Generic config:
    - VITE_ANALYTICS_PROVIDER: 'ga4' | 'plausible' | 'umami' (optional; auto-detect if unset)
    - VITE_HOSTING: 'vercel' | 'render' | 'railway' | 'other' (optional)
*/

const getEnv = (key, fallback = undefined) => {
  try {
    // Vite exposes import.meta.env at build time
    const value = import.meta?.env?.[key];
    return value !== undefined ? value : fallback;
  } catch (_) {
    return fallback;
  }
};

const detectHosting = () => {
  const explicit = getEnv('VITE_HOSTING');
  if (explicit) return explicit.toLowerCase();

  const host = window?.location?.hostname || '';
  if (host.includes('vercel.app')) return 'vercel';
  if (host.includes('onrender.com')) return 'render';
  if (host.includes('railway.app')) return 'railway';
  return 'other';
};

const state = {
  initialized: false,
  provider: null,
  hosting: detectHosting(),
  gaMeasurementId: null,
  plausibleDomain: null,
  umamiWebsiteId: null,
};

const injectScript = (src, attrs = {}) => {
  if (!src) return;
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      script.setAttribute(k, String(v));
    }
  });
  document.head.appendChild(script);
};

const initGA4 = (measurementId) => {
  state.provider = 'ga4';
  state.gaMeasurementId = measurementId;
  // gtag config
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  window.dataLayer = window.dataLayer || [];
  function gtag(){
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  }
  // expose globally
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);
};

const initPlausible = (domain, srcOverride) => {
  state.provider = 'plausible';
  state.plausibleDomain = domain;
  const src = srcOverride || 'https://plausible.io/js/script.js';
  injectScript(src, { defer: true, 'data-domain': domain });
};

const initUmami = (websiteId, src) => {
  state.provider = 'umami';
  state.umamiWebsiteId = websiteId;
  injectScript(src, { defer: true, 'data-website-id': websiteId });
};

export const initAnalytics = () => {
  if (state.initialized) return state;

  // prefer explicit provider
  const provider = (getEnv('VITE_ANALYTICS_PROVIDER', '') || '').toLowerCase();

  const gaId = getEnv('VITE_GA_MEASUREMENT_ID');
  const plausibleDomain = getEnv('VITE_PLAUSIBLE_DOMAIN');
  const plausibleSrc = getEnv('VITE_PLAUSIBLE_SRC');
  const umamiId = getEnv('VITE_UMAMI_WEBSITE_ID');
  const umamiSrc = getEnv('VITE_UMAMI_SRC');

  try {
    if (provider === 'ga4' && gaId) {
      initGA4(gaId);
    } else if (provider === 'plausible' && plausibleDomain) {
      initPlausible(plausibleDomain, plausibleSrc);
    } else if (provider === 'umami' && umamiId && umamiSrc) {
      initUmami(umamiId, umamiSrc);
    } else {
      // auto-detect by available envs
      if (gaId) {
        initGA4(gaId);
      } else if (plausibleDomain) {
        initPlausible(plausibleDomain, plausibleSrc);
      } else if (umamiId && umamiSrc) {
        initUmami(umamiId, umamiSrc);
      } else {
        state.provider = 'none';
      }
    }
  } catch (e) {
    // fail-safe to not break app
    state.provider = 'none';
  }

  state.initialized = true;
  return state;
};

export const getAnalyticsState = () => ({ ...state });

export const trackPageview = (path, props = {}) => {
  if (!state.initialized) initAnalytics();
  const pagePath = path || window.location.pathname + window.location.search;
  const baseProps = { hosting: state.hosting, ...props };

  if (state.provider === 'ga4' && window.gtag && state.gaMeasurementId) {
    window.gtag('event', 'page_view', { page_path: pagePath, ...baseProps });
  } else if (state.provider === 'plausible' && window.plausible) {
    window.plausible('pageview', { u: pagePath, props: baseProps });
  } else if (state.provider === 'umami' && window.umami) {
    window.umami.track('pageview', { url: pagePath, ...baseProps });
  }
};

export const trackEvent = (name, props = {}) => {
  if (!state.initialized) initAnalytics();
  const eventProps = { hosting: state.hosting, ...props };

  if (state.provider === 'ga4' && window.gtag) {
    window.gtag('event', name, eventProps);
  } else if (state.provider === 'plausible' && window.plausible) {
    window.plausible(name, { props: eventProps });
  } else if (state.provider === 'umami' && window.umami) {
    window.umami.track(name, eventProps);
  }
};

export const identifyUser = (user) => {
  if (!state.initialized) initAnalytics();
  if (!user) return;
  const userId = user.user_id || user.id || user.email;
  const role = user.role_name || user.role;
  const dept = user.department_id || user.department;

  // GA4 supports user_id and user_properties
  if (state.provider === 'ga4' && window.gtag) {
    if (userId) {
      window.gtag('set', { user_id: String(userId) });
    }
    window.gtag('event', 'set_user_properties', {
      role: role || '',
      department: dept || '',
    });
  }
  // Plausible/Umami do not support identify out of the box without self-hosting
};
