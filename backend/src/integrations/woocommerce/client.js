import { config } from '../../config.js';

export class IntegrationError extends Error {}

const authHeader = () => 'Basic ' + Buffer.from(`${config.woo.key}:${config.woo.secret}`).toString('base64');

/** Async generator yielding each page of a WooCommerce REST API v3 collection. */
export async function* fetchAll(path, params = {}) {
  let page = 1;
  let totalPages = 1;
  do {
    const url = new URL(`${config.woo.url}/wp-json/wc/v3/${path}`);
    Object.entries({ per_page: 100, page, ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
    let res;
    try {
      res = await fetch(url, { headers: { Authorization: authHeader(), Accept: 'application/json' } });
    } catch {
      throw new IntegrationError('Could not reach the WooCommerce store. Check WOOCOMMERCE_URL and network access.');
    }
    if (res.status === 401 || res.status === 403) throw new IntegrationError('WooCommerce rejected the API credentials.');
    if (res.status === 429) throw new IntegrationError('WooCommerce rate limit reached. Try again later.');
    if (!res.ok) throw new IntegrationError(`WooCommerce returned HTTP ${res.status} for ${path}.`);
    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) throw new IntegrationError('WooCommerce returned an unexpected response.');
    totalPages = Number(res.headers.get('x-wp-totalpages') || 1);
    yield data;
    page += 1;
  } while (page <= totalPages);
}
