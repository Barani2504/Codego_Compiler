import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageMetaOptions {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
}

export function usePageMeta({ title, description, ogTitle, ogDescription }: PageMetaOptions) {
  const location = useLocation();

  useEffect(() => {
    // 1. Update Document Title
    const formattedTitle = title.includes('CodeGo') ? title : `${title} | CodeGo`;
    document.title = formattedTitle;

    // 2. Update or create Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    // 3. Update Open Graph Title & Description
    const ogTitleElem = document.querySelector('meta[property="og:title"]');
    if (ogTitleElem) {
      ogTitleElem.setAttribute('content', ogTitle || formattedTitle);
    }

    const ogDescElem = document.querySelector('meta[property="og:description"]');
    if (ogDescElem && description) {
      ogDescElem.setAttribute('content', ogDescription || description);
    }

    // 4. Dispatch Analytics PageView
    if (typeof window !== 'undefined' && (window as any).codegoAnalytics) {
      (window as any).codegoAnalytics.trackPageView(location.pathname + location.search + location.hash);
    }
  }, [title, description, ogTitle, ogDescription, location]);
}
