const qs = (params) => {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => v !== '' && v != null && s.set(k, v));
  const t = s.toString();
  return t ? `?${t}` : '';
};

export const getToken = () => localStorage.getItem('crm_token') || '';

async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data?.details?.map((d) => `${d.path}: ${d.message}`).join('; ');
    const err = new Error([data?.error || `Request failed (${res.status})`, detail].filter(Boolean).join(' - '));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path, params) => request('GET', path + qs(params)),
  post: (path, body) => request('POST', path, body || {}),
  patch: (path, body) => request('PATCH', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
};
