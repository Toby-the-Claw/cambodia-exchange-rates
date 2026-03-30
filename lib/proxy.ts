import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Free proxy list (rotates - these are public proxies that may work)
// For production, use paid services like: ScrapingBee, Bright Data, Oxylabs, Smartproxy
const FREE_PROXIES: string[] = [
  // Format: 'http://ip:port' or 'http://user:pass@ip:port'
  // These are example placeholders - actual free proxies change frequently
  // Get fresh ones from: https://free-proxy-list.net/
];

// Proxy configuration
export interface ProxyConfig {
  enabled: boolean;
  url?: string;
  rotationStrategy: 'none' | 'random' | 'round-robin';
  currentIndex: number;
  retryWithProxy: boolean;
  maxRetries: number;
}

// Default config - disabled by default
export const defaultProxyConfig: ProxyConfig = {
  enabled: process.env.USE_PROXY === 'true',
  url: process.env.PROXY_URL,
  rotationStrategy: 'random',
  currentIndex: 0,
  retryWithProxy: true,
  maxRetries: 3,
};

// Get proxy agent
export function getProxyAgent(proxyUrl?: string) {
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}

// Rotate proxy
export function rotateProxy(config: ProxyConfig): string | undefined {
  if (!config.enabled) return undefined;
  if (config.url) return config.url;
  
  if (FREE_PROXIES.length === 0) {
    console.warn('No proxies configured. Set PROXY_URL env var or add proxies to FREE_PROXIES list.');
    return undefined;
  }
  
  let proxy: string;
  
  switch (config.rotationStrategy) {
    case 'round-robin':
      proxy = FREE_PROXIES[config.currentIndex % FREE_PROXIES.length];
      config.currentIndex++;
      break;
    case 'random':
    default:
      proxy = FREE_PROXIES[Math.floor(Math.random() * FREE_PROXIES.length)];
      break;
  }
  
  return proxy;
}

// Fetch with proxy retry
export async function fetchWithProxy(
  url: string,
  options: AxiosRequestConfig = {},
  proxyConfig: ProxyConfig = defaultProxyConfig
): Promise<{ data: string; proxyUsed?: string }> {
  let lastError: Error | null = null;
  
  // Try without proxy first if not explicitly enabled
  if (!proxyConfig.enabled) {
    try {
      const response = await axios.get(url, {
        ...options,
        timeout: 15000,
      });
      return { data: response.data };
    } catch (error) {
      if (!proxyConfig.retryWithProxy) throw error;
      lastError = error as Error;
    }
  }
  
  // Try with proxy
  for (let i = 0; i < proxyConfig.maxRetries; i++) {
    const proxyUrl = rotateProxy(proxyConfig);
    if (!proxyUrl) break;
    
    try {
      const agent = getProxyAgent(proxyUrl);
      const response = await axios.get(url, {
        ...options,
        httpsAgent: agent,
        proxy: false, // Disable axios proxy handling when using agent
        timeout: 20000,
      });
      
      console.log(`✅ Successfully fetched via proxy: ${proxyUrl.split('@')[1] || proxyUrl}`);
      return { data: response.data, proxyUsed: proxyUrl };
    } catch (error) {
      console.log(`❌ Proxy failed (${i + 1}/${proxyConfig.maxRetries}): ${proxyUrl.split('@')[1] || proxyUrl}`);
      lastError = error as Error;
    }
  }
  
  throw lastError || new Error('All proxy attempts failed');
}

// ScrapingBee integration (recommended paid service)
export async function fetchWithScrapingBee(
  url: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.SCRAPINGBEE_API_KEY;
  if (!key) {
    throw new Error('ScrapingBee API key not configured');
  }
  
  const scrapingBeeUrl = `https://app.scrapingbee.com/api/v1/?api_key=${key}&url=${encodeURIComponent(url)}&render_js=true&premium_proxy=true&country_code=kh`;
  
  const response = await axios.get(scrapingBeeUrl, {
    timeout: 30000,
  });
  
  return response.data;
}

// ScrapingAnt integration (alternative paid service)
export async function fetchWithScrapingAnt(
  url: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.SCRAPINGANT_API_KEY;
  if (!key) {
    throw new Error('ScrapingAnt API key not configured');
  }
  
  const scrapingAntUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${key}&browser=true&proxy_country=KH`;
  
  const response = await axios.get(scrapingAntUrl, {
    timeout: 30000,
  });
  
  return response.data;
}

// Browserless integration (for JavaScript-heavy sites)
export async function fetchWithBrowserless(
  url: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.BROWSERLESS_API_KEY;
  if (!key) {
    throw new Error('Browserless API key not configured');
  }
  
  const response = await axios.post(
    `https://chrome.browserless.io/content?token=${key}`,
    {
      url,
      gotoOptions: { waitUntil: 'networkidle0' },
    },
    {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  return response.data;
}
