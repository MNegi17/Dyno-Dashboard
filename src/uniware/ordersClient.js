import { getAccessToken, invalidateToken } from './authClient.js';

const getBaseUrl = () => typeof window !== 'undefined' ? '/api/uniware' : 'https://purpleunited.unicommerce.com';

/**
 * Search Sale Orders in Uniware within a specified time window with automatic pagination and retry
 */
export async function searchSaleOrders({ fromDate, toDate, dateType = 'CREATED' }) {
  let token = await getAccessToken();
  const url = `${getBaseUrl()}/services/rest/v1/oms/saleOrder/search`;

  let allElements = [];
  let displayStart = 0;
  const displayLength = 500;
  let hasMore = true;

  while (hasMore) {
    const body = JSON.stringify({
      fromDate,
      toDate,
      dateType,
      searchOptions: {
        displayStart,
        displayLength
      }
    });

    let success = false;
    let attempts = 0;

    while (!success && attempts < 3) {
      attempts++;
      try {
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
          throw new Error(`Uniware searchSaleOrders HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const elements = data.elements || [];
        allElements.push(...elements);

        if (elements.length < displayLength || allElements.length >= (data.totalRecords || 0)) {
          hasMore = false;
        } else {
          displayStart += displayLength;
        }
        success = true;
      } catch (err) {
        if (attempts >= 3) {
          console.error(`[Uniware Search] Failed page at ${displayStart} after 3 attempts:`, err.message);
          hasMore = false;
        } else {
          invalidateToken();
          token = await getAccessToken(true);
          await new Promise(r => setTimeout(r, 600 * attempts));
        }
      }
    }
  }

  const orderCodes = allElements.map(el => el.code);

  return {
    orderCodes,
    elements: allElements
  };
}

/**
 * Fetch full details for a single Sale Order by code with automatic retry
 */
export async function getSaleOrder(code, retryCount = 2) {
  let attempts = 0;
  while (attempts <= retryCount) {
    attempts++;
    try {
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
        throw new Error(`Uniware getSaleOrder HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.successful || !data.saleOrderDTO) {
        throw new Error(`Uniware getSaleOrder unsuccessful: ${data.message || 'No saleOrderDTO'}`);
      }

      return data.saleOrderDTO;
    } catch (err) {
      if (attempts > retryCount) {
        throw err;
      }
      invalidateToken();
      await new Promise(r => setTimeout(r, 400 * attempts));
    }
  }
}

/**
 * Fetch multiple Sale Orders with controlled concurrency and resilient retry
 */
export async function fetchSaleOrdersWithConcurrency(orderCodes, concurrency = 6) {
  const results = [];
  const failures = [];
  const queue = [...orderCodes];

  async function worker() {
    while (queue.length > 0) {
      const code = queue.shift();
      if (!code) break;

      try {
        const order = await getSaleOrder(code, 2);
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
