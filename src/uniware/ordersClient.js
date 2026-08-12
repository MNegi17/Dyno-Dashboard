import { getAccessToken, invalidateToken } from './authClient.js';

const getBaseUrl = () => typeof window !== 'undefined' ? '/api/uniware' : 'https://purpleunited.unicommerce.com';

/**
 * Search Sale Orders in Uniware within a specified time window
 */
export async function searchSaleOrders({ fromDate, toDate, dateType = 'CREATED' }) {
  let token = await getAccessToken();
  const url = `${getBaseUrl()}/services/rest/v1/oms/saleOrder/search`;
  const body = JSON.stringify({
    fromDate,
    toDate,
    dateType,
    searchOptions: {
      displayStart: 0,
      displayLength: 500
    }
  });

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body
  });

  if (response.status === 401) {
    invalidateToken();
    token = await getAccessToken(true);
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Uniware searchSaleOrders failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const elements = data.elements || [];
  const orderCodes = elements.map(el => el.code);

  return {
    orderCodes,
    elements
  };
}

/**
 * Fetch full details for a single Sale Order by code
 */
export async function getSaleOrder(code) {
  let token = await getAccessToken();
  const url = `${getBaseUrl()}/services/rest/v1/oms/saleorder/get`;
  const body = JSON.stringify({ code: String(code).trim() });

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body
  });

  if (response.status === 401) {
    invalidateToken();
    token = await getAccessToken(true);
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Uniware getSaleOrder failed for ${code} (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.successful || !data.saleOrderDTO) {
    throw new Error(`Uniware getSaleOrder unsuccessful for ${code}: ${data.message || 'No saleOrderDTO'}`);
  }

  return data.saleOrderDTO;
}

/**
 * Fetch multiple Sale Orders with controlled concurrency (e.g. 5 parallel requests)
 */
export async function fetchSaleOrdersWithConcurrency(orderCodes, concurrency = 5) {
  const results = [];
  const failures = [];
  const queue = [...orderCodes];

  async function worker() {
    while (queue.length > 0) {
      const code = queue.shift();
      if (!code) break;

      try {
        const order = await getSaleOrder(code);
        results.push(order);
      } catch (err) {
        console.error(`Failed to fetch order ${code}:`, err.message);
        failures.push({ code, error: err.message });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, orderCodes.length) }, () => worker());
  await Promise.all(workers);

  return {
    orders: results,
    failures
  };
}
