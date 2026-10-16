import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export function useFetch(path, params) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const key = path + JSON.stringify(params || {});
  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(path, params).then(
      (data) => setState({ data, error: null, loading: false }),
      (error) => setState({ data: null, error: error.message, loading: false }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}
