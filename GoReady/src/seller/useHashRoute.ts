import React from 'react';

/** Điều hướng bằng hash (#/tour-cua-toi), giống cách App khách đang làm — không dùng thư viện router. */
export function useHashRoute() {
  const read = () => window.location.hash.replace(/^#/, '') || '/';
  const [path, setPath] = React.useState(read);

  React.useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = React.useCallback((to: string, replace = false) => {
    if (replace) window.location.replace(`#${to}`);
    else window.location.hash = to;
  }, []);

  return { path, navigate };
}
