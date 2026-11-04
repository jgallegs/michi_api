import { useCallback, useEffect, useRef, useState } from 'react';
import { gitApi } from './api';

const LOCAL_REFRESH_MS = 15000;
const FETCH_REFRESH_MS = 180000;

// Keeps the git status of a folder fresh: local status often, a fetch from the remote now and then,
// and both again whenever the window regains focus.
const useGitStatus = (folder) => {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastFetch = useRef(0);

  const refresh = useCallback(async ({ fetch = false } = {}) => {
    if (!folder) return;
    setLoading(true);
    try {
      const next = await gitApi.status(folder, { fetch });
      if (fetch) lastFetch.current = Date.now();
      setStatus(next);
      setError(null);
    } catch (err) {
      setStatus(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    setStatus(null);
    setError(null);
    lastFetch.current = 0;
    if (!folder) return undefined;

    refresh({ fetch: true });
    const tick = () => refresh({ fetch: Date.now() - lastFetch.current > FETCH_REFRESH_MS });
    const timer = setInterval(tick, LOCAL_REFRESH_MS);
    const onFocus = () => refresh({ fetch: true });
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [folder, refresh]);

  return { status, error, loading, refresh };
};

export default useGitStatus;
