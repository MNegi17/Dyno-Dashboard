const getBaseUrl = () => typeof window !== 'undefined' ? '/api/uniware' : 'https://purpleunited.unicommerce.com';

const UNIWARE_CONFIG = {
  username: 'ecommerce@purpleunited.in',
  password: 'Toothless@2024'
};

let tokenCache = null;

/**
 * Authenticate with Uniware OAuth 2.0 and obtain a bearer access token
 */
export async function authenticate() {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/oauth/token?grant_type=password&client_id=my-trusted-client&username=${encodeURIComponent(UNIWARE_CONFIG.username)}&password=${encodeURIComponent(UNIWARE_CONFIG.password)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Uniware authentication failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const tokenReceivedAt = Date.now();
  const expiresAt = tokenReceivedAt + (data.expires_in * 1000);

  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenReceivedAt,
    expiresAt
  };

  return tokenCache.accessToken;
}

/**
 * Get valid access token with auto-renewal guard (5-min buffer)
 */
export async function getAccessToken(forceRefresh = false) {
  const bufferMs = 5 * 60 * 1000;
  if (!forceRefresh && tokenCache && Date.now() < (tokenCache.expiresAt - bufferMs)) {
    return tokenCache.accessToken;
  }
  return await authenticate();
}

/**
 * Invalidate cached token
 */
export function invalidateToken() {
  tokenCache = null;
}
