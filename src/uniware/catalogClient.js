import { getAccessToken, invalidateToken } from './authClient.js';

const getBaseUrl = () => typeof window !== 'undefined' ? '/api/uniware' : 'https://purpleunited.unicommerce.com';

/**
 * Fetch Item Details directly from Uniware Catalog by SKU code
 */
export async function getItemType(skuCode) {
  if (!skuCode) return null;

  let token = await getAccessToken();
  const url = `${getBaseUrl()}/services/rest/v1/catalog/itemType/get`;
  const body = JSON.stringify({ skuCode: String(skuCode).trim() });

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

  if (!response.ok) return null;

  const data = await response.json();
  if (data && data.successful && data.itemTypeDTO) {
    return data.itemTypeDTO;
  }

  return null;
}
