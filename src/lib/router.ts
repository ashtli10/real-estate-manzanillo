import { useEffect, useState } from 'react';

const getCurrentRoute = () => {
  if (window.location.hash.startsWith('#/')) {
    const hashPath = window.location.hash.slice(1);
    window.history.replaceState(null, '', hashPath);
    return hashPath;
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
    if (normalizedPath === window.location.pathname) {
      setRoute(normalizedPath);
      return;
    }

    window.history.pushState(null, '', normalizedPath);
    setRoute(normalizedPath);
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
