/**
 * Privacy-friendly event tracking utility for CodeGo
 */

export function trackEvent(category: string, action: string, label?: string) {
  try {
    if (typeof window !== 'undefined' && (window as any).codegoAnalytics) {
      (window as any).codegoAnalytics.trackEvent(category, action, label);
    }
  } catch (err) {
    console.debug('Analytics event ignored:', err);
  }
}

export function trackPageView(path: string) {
  try {
    if (typeof window !== 'undefined' && (window as any).codegoAnalytics) {
      (window as any).codegoAnalytics.trackPageView(path);
    }
  } catch (err) {
    console.debug('Analytics page view ignored:', err);
  }
}
