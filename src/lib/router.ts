import { useEffect, useState } from 'react';

const getCurrentRoute = () => {
  if (window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1);
    window.history.replaceState(null, '', hashPath);
    // Return just pathname, not search params
    const questionIndex = hashPath.indexOf('?');
    return questionIndex >= 0 ? hashPath.slice(0, questionIndex) : hashPath;
  }

  return window.location.pathname || '/';
};

export function useRouter() {
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Extract pathname (without query params) for comparison and state
    const questionIndex = normalizedPath.indexOf('?');
    const pathname = questionIndex >= 0 ? normalizedPath.slice(0, questionIndex) : normalizedPath;
    
    // Push the full path (with query params) to history
    window.history.pushState(null, '', normalizedPath);
    
    // Store only the pathname in route state (query params are in window.location.search)
    setRoute(pathname);
  };

  return { route, navigate };
}

export function getRouteParams(route: string, pattern: string): Record<string, string> | null {
  const routeParts = route.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);

  if (routeParts.length !== patternParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].slice(1);
      params[paramName] = routeParts[i];
    } else if (patternParts[i] !== routeParts[i]) {
      return null;
    }
  }

  return params;
}
