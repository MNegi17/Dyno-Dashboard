/**
 * Storage and management for channel-specific marketing, logistics, and margin rates.
 * Persisted in localStorage so customizations are retained across reloads.
 */

export const DEFAULT_CHANNEL_RATES = {
  'MYNTRA': { margin: 35, marketing: 12, logistics: 8 },
  'AMAZON': { margin: 30, marketing: 15, logistics: 10 },
  'AMAZON_COCOBLU': { margin: 30, marketing: 14, logistics: 9 },
  'AMAZON_FBA': { margin: 32, marketing: 14, logistics: 9 },
  'AJIO': { margin: 32, marketing: 10, logistics: 8.5 },
  'FIRSTCRY': { margin: 28, marketing: 8, logistics: 7 },
  'FLIPKART': { margin: 25, marketing: 15, logistics: 11 },
  'NYKAA': { margin: 35, marketing: 12, logistics: 8 },
  'D2C': { margin: 45, marketing: 25, logistics: 12 },
  'MYNTRA_SJIT': { margin: 34, marketing: 11, logistics: 8 },
  'All': { margin: 32, marketing: 14, logistics: 9 }
};

const STORAGE_KEY = 'dyno_marketing_channel_rates_v1';

/**
 * Load configured channel rates from localStorage or fall back to defaults
 */
export const loadMarketingRates = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults so newly introduced channels always have valid numbers
        return { ...DEFAULT_CHANNEL_RATES, ...parsed };
      }
    }
  } catch (err) {
    console.error('Failed to load marketing rates from localStorage:', err);
  }
  return { ...DEFAULT_CHANNEL_RATES };
};

/**
 * Save updated channel rates to localStorage
 */
export const saveMarketingRates = (rates) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rates));
    }
    return true;
  } catch (err) {
    console.error('Failed to save marketing rates to localStorage:', err);
    return false;
  }
};

/**
 * Reset rates to default configuration
 */
export const resetMarketingRates = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to reset marketing rates in localStorage:', err);
  }
  return { ...DEFAULT_CHANNEL_RATES };
};

/**
 * Resolve the rate object for a given channel or channel array
 */
export const resolveChannelRate = (channelInput, rates) => {
  if (!rates) return DEFAULT_CHANNEL_RATES['All'];

  let targetChannel = 'All';
  if (Array.isArray(channelInput)) {
    if (channelInput.length === 1) {
      targetChannel = channelInput[0];
    } else if (channelInput.length > 1) {
      targetChannel = 'All';
    }
  } else if (typeof channelInput === 'string' && channelInput !== 'All Channels') {
    targetChannel = channelInput;
  }

  const clean = targetChannel.toUpperCase().trim();
  if (rates[clean]) {
    return { channelName: clean, ...rates[clean] };
  }

  // Partial match check
  const foundKey = Object.keys(rates).find(k => k.toUpperCase() === clean || clean.includes(k.toUpperCase()));
  if (foundKey && rates[foundKey]) {
    return { channelName: foundKey, ...rates[foundKey] };
  }

  return { channelName: 'All Channels', ...(rates['All'] || DEFAULT_CHANNEL_RATES['All']) };
};
