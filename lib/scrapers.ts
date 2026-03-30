import axios from 'axios';
import * as cheerio from 'cheerio';
import { fetchWithProxy, fetchWithScrapingBee, fetchWithScrapingAnt, defaultProxyConfig } from './proxy';
import { spawn } from 'child_process';
import path from 'path';

export interface ExchangeRate {
  currency: string;
  buyRate: number;
  sellRate: number;
  unit: string;
}

export interface BankRates {
  bankName: string;
  bankCode: string;
  updatedAt: string;
  rates: ExchangeRate[];
}

// Run Python scraper script
async function runPythonScraper(scriptName: string): Promise<BankRates | null> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    const child = spawn(pythonCmd, [scriptPath], {
      timeout: 60000,
    });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      console.log(data.toString().trim());
    });
    
    child.stderr.on('data', (data) => {
      console.log(`Python: ${data.toString().trim()}`);
    });
    
    child.on('close', (code) => {
      try {
        // Find JSON output file
        const resultPath = path.join(process.cwd(), 'scripts', 'aba_rates.json');
        const fs = require('fs');
        
        if (fs.existsSync(resultPath)) {
          const result = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
          // Clean up temp file
          fs.unlinkSync(resultPath);
          resolve(result);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error parsing Python scraper output:', error);
        resolve(null);
      }
    });
    
    child.on('error', (error) => {
      console.error('Failed to start Python scraper:', error);
      resolve(null);
    });
  });
}

// National Bank of Cambodia Official Rate
export async function fetchNBCRate(): Promise<BankRates> {
  try {
    // NBC publishes daily rate on their website and via data.mef.gov.kh API
    // On Vercel, we skip SSL verification due to CA certificate issues
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
    
    const response = await axios.get('https://data.mef.gov.kh/api/v1/public-datasets/pd_66a0cd503e0bd300012638fb4/json?page=1&size=1', {
      timeout: 10000,
      ...(isVercel && { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }),
    });
    
    const data = response.data.data?.[0];
    if (data) {
      return {
        bankName: 'National Bank of Cambodia',
        bankCode: 'NBC',
        updatedAt: data.Date || new Date().toISOString(),
        rates: [
          {
            currency: 'USD',
            buyRate: parseFloat(data.Purchase) || 4000,
            sellRate: parseFloat(data.Sale) || 4010,
            unit: 'KHR',
          },
        ],
      };
    }
  } catch (error) {
    console.error('NBC fetch error:', error);
  }
  
  // Fallback to GDT website scraping
  try {
    const response = await axios.get('https://www.tax.gov.kh/en/exchange-rate', {
      timeout: 10000,
    });
    const $ = cheerio.load(response.data);
    
    // Extract latest rate from the table/list
    const rateText = $('.exchange-rate-value, .rate-value').first().text() || '4000';
    const rate = parseFloat(rateText.replace(/,/g, '')) || 4000;
    
    return {
      bankName: 'National Bank of Cambodia',
      bankCode: 'NBC',
      updatedAt: new Date().toISOString(),
      rates: [{
        currency: 'USD',
        buyRate: rate,
        sellRate: rate + 10,
        unit: 'KHR',
      }],
    };
  } catch (error) {
    console.error('NBC fallback error:', error);
  }
  
  return {
    bankName: 'National Bank of Cambodia',
    bankCode: 'NBC',
    updatedAt: new Date().toISOString(),
    rates: [{
      currency: 'USD',
      buyRate: 4000,
      sellRate: 4010,
      unit: 'KHR',
    }],
  };
}

// ABA Bank Scraper with Python Fallback (No external API required)
export async function fetchABARates(useProxy = false): Promise<BankRates> {
  // Check if running on Vercel - Selenium won't work there
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  if (isVercel) {
    console.log('Running on Vercel - using demo data for ABA (Selenium not available)');
    return {
      bankName: 'ABA Bank',
      bankCode: 'ABA',
      updatedAt: new Date().toISOString(),
      rates: [
        { currency: 'USD', buyRate: 4000, sellRate: 4015, unit: 'KHR' },
        { currency: 'EUR', buyRate: 4320, sellRate: 4460, unit: 'KHR' },
        { currency: 'THB', buyRate: 118.50, sellRate: 122.80, unit: 'KHR' },
        { currency: 'CNY', buyRate: 548, sellRate: 565, unit: 'KHR' },
        { currency: 'GBP', buyRate: 5180, sellRate: 5350, unit: 'KHR' },
      ],
    };
  }
  
  // Try Python scraper first (uses curl_cffi or cloudscraper)
  console.log('Trying Python scraper for ABA...');
  const pythonResult = await runPythonScraper('scrape_aba.py');
  if (pythonResult && pythonResult.rates.length > 0) {
    console.log('✓ Python scraper succeeded');
    return pythonResult;
  }
  console.log('Python scraper failed, using demo data...');
  
  // Return demo data if scraping fails
  return {
    bankName: 'ABA Bank',
    bankCode: 'ABA',
    updatedAt: new Date().toISOString(),
    rates: [
      { currency: 'USD', buyRate: 4000, sellRate: 4015, unit: 'KHR' },
      { currency: 'EUR', buyRate: 4320, sellRate: 4460, unit: 'KHR' },
      { currency: 'THB', buyRate: 118.50, sellRate: 122.80, unit: 'KHR' },
      { currency: 'CNY', buyRate: 548, sellRate: 565, unit: 'KHR' },
      { currency: 'GBP', buyRate: 5180, sellRate: 5350, unit: 'KHR' },
    ],
  };
}

// ACLEDA Bank Scraper
export async function fetchACLEDARates(): Promise<BankRates> {
  try {
    const response = await axios.get('https://www.acledabank.com.kh/kh/eng/ps_cmforeignexchange', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    
    const $ = cheerio.load(response.data);
    const rates: ExchangeRate[] = [];
    
    // Try multiple selectors for the rate table
    const tableSelectors = [
      'table',
      '.exchange-rate-table',
      '.rate-table',
      '[class*="exchange"]',
      '[class*="rate"]'
    ];
    
    for (const selector of tableSelectors) {
      $(selector).each((_, table) => {
        $(table).find('tr').each((i, row) => {
          if (i === 0) return; // Skip header
          const cols = $(row).find('td');
          if (cols.length >= 3) {
            const pairText = $(cols[0]).text().trim();
            const buyText = $(cols[1]).text().trim().replace(/,/g, '').replace(/\s+KHR/g, '');
            const sellText = $(cols[2]).text().trim().replace(/,/g, '').replace(/\s+KHR/g, '');
            
            // Parse currency pair like "USD / KHR" or "USD/KHR"
            const match = pairText.match(/([A-Z]{3})\s*\/\s*([A-Z]{3})/);
            if (match) {
              const [, base, quote] = match;
              const buyRate = parseFloat(buyText);
              const sellRate = parseFloat(sellText);
              
              if (!isNaN(buyRate) && !isNaN(sellRate) && buyRate > 0 && sellRate > 0) {
                rates.push({ currency: base, buyRate, sellRate, unit: quote });
              }
            }
          }
        });
      });
      
      if (rates.length > 0) break; // Found rates, stop trying selectors
    }
    
    // Extract update time from the page
    let updatedAt = new Date().toISOString();
    const timeText = $('p:contains("as of"), .exchange-rate-date, [class*="date"]').text();
    const dateMatch = timeText.match(/as of\s+([A-Za-z]+ \d{1,2}, \d{4}[^\d]*\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (dateMatch) {
      updatedAt = new Date(dateMatch[1]).toISOString();
    }
    
    return {
      bankName: 'ACLEDA Bank',
      bankCode: 'ACLED',
      updatedAt,
      rates,
    };
  } catch (error) {
    console.error('ACLEDA fetch error:', error);
    return {
      bankName: 'ACLEDA Bank',
      bankCode: 'ACLED',
      updatedAt: new Date().toISOString(),
      rates: [],
    };
  }
}

// Wing Bank Scraper with Proxy Fallback
export async function fetchWingRates(useProxy = false): Promise<BankRates> {
  const url = 'https://www.wingbank.com.kh/en/exchange-rate';
  
  try {
    let html: string;
    
    if (useProxy && process.env.SCRAPINGBEE_API_KEY) {
      console.log('Fetching Wing via ScrapingBee...');
      html = await fetchWithScrapingBee(url);
    } else if (useProxy && process.env.SCRAPINGANT_API_KEY) {
      console.log('Fetching Wing via ScrapingAnt...');
      html = await fetchWithScrapingAnt(url);
    } else {
      try {
        const response = await axios.get(url, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
          },
          maxRedirects: 10,
        });
        html = response.data;
      } catch (error) {
        // Try with proxy if direct fails
        if (defaultProxyConfig.retryWithProxy) {
          console.log('Direct Wing fetch failed, trying with proxy...');
          const result = await fetchWithProxy(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          html = result.data;
        } else {
          throw error;
        }
      }
    }
    
    const $ = cheerio.load(html);
    const rates: ExchangeRate[] = [];
    
    // Try multiple selectors
    const selectors = [
      'table.exchange-rate-table',
      '.exchange-rate table',
      'table',
    ];
    
    for (const selector of selectors) {
      $(selector).first().find('tr').each((i, row) => {
        if (i === 0) return;
        const cols = $(row).find('td');
        if (cols.length >= 3) {
          const pairText = $(cols[0]).text().trim();
          const buyText = $(cols[1]).text().trim().replace(/,/g, '');
          const sellText = $(cols[2]).text().trim().replace(/,/g, '');
          
          const match = pairText.match(/([A-Z]{3})\/([A-Z]{3})/);
          if (match) {
            const [, base, quote] = match;
            const buyRate = parseFloat(buyText);
            const sellRate = parseFloat(sellText);
            
            if (!isNaN(buyRate) && !isNaN(sellRate) && buyRate > 0 && sellRate > 0) {
              rates.push({ currency: base, buyRate, sellRate, unit: quote });
            }
          }
        }
      });
      
      if (rates.length > 0) break;
    }
    
    // Extract update date
    let updatedAt = new Date().toISOString();
    const updateText = $('p:contains("Updated"), .update-time').text();
    const dateMatch = updateText.match(/Updated\s*(?:as of)?[:\s]*([^\n]+)/i);
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[1].trim());
      if (!isNaN(parsedDate.getTime())) {
        updatedAt = parsedDate.toISOString();
      }
    }
    
    return {
      bankName: 'Wing Bank',
      bankCode: 'WING',
      updatedAt,
      rates,
    };
  } catch (error) {
    console.error('Wing fetch error:', (error as Error).message);
    return {
      bankName: 'Wing Bank',
      bankCode: 'WING',
      updatedAt: new Date().toISOString(),
      rates: [],
    };
  }
}

// Canadia Bank Scraper
export async function fetchCanadiaRates(): Promise<BankRates> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.canadiabank.com.kh/',
    'Connection': 'keep-alive',
  };

  try {
    const response = await axios.get('https://www.canadiabank.com.kh/exchange-rates', {
      timeout: 15000,
      headers,
      maxRedirects: 5,
    });
    
    const $ = cheerio.load(response.data);
    const rates: ExchangeRate[] = [];
    
    // Canadia has tables inside list items
    // Structure: list > listitem > table > tr > td (Currency, Cash Buy, Cash Sell, TT Buy, TT Sell)
    $('list listitem table, ul li table, [class*="list"] table').each((_, table) => {
      const row = $(table).find('tr').first();
      const cells = $(row).find('td');
      
      if (cells.length >= 3) {
        const pairText = $(cells[0]).text().trim();
        // For KHR pairs, use Telegraphic Transfer rates (index 3 and 4)
        // For other pairs, use Cash rates (index 1 and 2) or TT if available
        const isKHR = pairText.includes('KHR');
        
        const buyText = $(cells[isKHR && cells.length >= 4 ? 3 : 1]).text().trim().replace(/,/g, '');
        const sellText = $(cells[isKHR && cells.length >= 5 ? 4 : 2]).text().trim().replace(/,/g, '');
        
        const match = pairText.match(/([A-Z]{3})\/([A-Z]{3})/);
        if (match) {
          const [, base, quote] = match;
          const buyRate = parseFloat(buyText);
          const sellRate = parseFloat(sellText);
          
          if (!isNaN(buyRate) && !isNaN(sellRate) && buyRate > 0 && sellRate > 0) {
            rates.push({ currency: base, buyRate, sellRate, unit: quote });
          }
        }
      }
    });
    
    // Also try the header table structure
    if (rates.length === 0) {
      $('table').each((_, table) => {
        $(table).find('tr').each((i, row) => {
          if (i === 0) return; // Skip header
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            const pairText = $(cells[0]).text().trim();
            const buyText = $(cells[cells.length >= 4 ? 3 : 1]).text().trim().replace(/,/g, '');
            const sellText = $(cells[cells.length >= 5 ? 4 : 2]).text().trim().replace(/,/g, '');
            
            const match = pairText.match(/([A-Z]{3})\/([A-Z]{3})/);
            if (match) {
              const [, base, quote] = match;
              const buyRate = parseFloat(buyText);
              const sellRate = parseFloat(sellText);
              
              if (!isNaN(buyRate) && !isNaN(sellRate) && buyRate > 0 && sellRate > 0) {
                rates.push({ currency: base, buyRate, sellRate, unit: quote });
              }
            }
          }
        });
      });
    }
    
    // Extract update time
    let updatedAt = new Date().toISOString();
    const timeText = $('p:contains("Last updated"), [class*="update"], [class*="date"]').text();
    const dateMatch = timeText.match(/Last updated[:\s]*([^\n]+)/i);
    if (dateMatch) {
      const parsed = new Date(dateMatch[1].trim());
      if (!isNaN(parsed.getTime())) {
        updatedAt = parsed.toISOString();
      }
    }
    
    if (rates.length > 0) {
      return {
        bankName: 'Canadia Bank',
        bankCode: 'CANAD',
        updatedAt,
        rates,
      };
    }
  } catch (error) {
    console.log('Canadia fetch error:', (error as Error).message);
  }
  
  // Fallback: return empty but valid response
  return {
    bankName: 'Canadia Bank',
    bankCode: 'CANAD',
    updatedAt: new Date().toISOString(),
    rates: [],
  };
}

// Demo/Fallback data for when scraping fails
const demoRates: Record<string, ExchangeRate[]> = {
  'ABA': [
    { currency: 'USD', buyRate: 4000, sellRate: 4015, unit: 'KHR' },
    { currency: 'EUR', buyRate: 4320, sellRate: 4460, unit: 'KHR' },
    { currency: 'THB', buyRate: 118.50, sellRate: 122.80, unit: 'KHR' },
    { currency: 'CNY', buyRate: 548, sellRate: 565, unit: 'KHR' },
    { currency: 'GBP', buyRate: 5180, sellRate: 5350, unit: 'KHR' },
  ],
  'ACLED': [
    { currency: 'USD', buyRate: 4000, sellRate: 4012, unit: 'KHR' },
    { currency: 'THB', buyRate: 120.65, sellRate: 124.20, unit: 'KHR' },
    { currency: 'EUR', buyRate: 4483.60, sellRate: 4647.50, unit: 'KHR' },
    { currency: 'CNY', buyRate: 571.43, sellRate: 588.27, unit: 'KHR' },
    { currency: 'GBP', buyRate: 5182, sellRate: 5350, unit: 'KHR' },
    { currency: 'AUD', buyRate: 2622, sellRate: 2790.35, unit: 'KHR' },
    { currency: 'JPY', buyRate: 24.41, sellRate: 25.34, unit: 'KHR' },
    { currency: 'VND', buyRate: 0.1429, sellRate: 0.1485, unit: 'KHR' },
  ],
  'WING': [
    { currency: 'USD', buyRate: 4001, sellRate: 4007, unit: 'KHR' },
    { currency: 'EUR', buyRate: 4310, sellRate: 4450, unit: 'KHR' },
    { currency: 'THB', buyRate: 118.80, sellRate: 123.20, unit: 'KHR' },
  ],
  'CANAD': [
    { currency: 'USD', buyRate: 4000, sellRate: 4013, unit: 'KHR' },
    { currency: 'AUD', buyRate: 0.6728, sellRate: 0.6937, unit: 'USD' },
    { currency: 'EUR', buyRate: 1.1353, sellRate: 1.1595, unit: 'USD' },
    { currency: 'GBP', buyRate: 1.3122, sellRate: 1.3354, unit: 'USD' },
    { currency: 'NZD', buyRate: 0.5624, sellRate: 0.5799, unit: 'USD' },
    { currency: 'CAD', buyRate: 1.3769, sellRate: 1.4095, unit: 'USD' },
    { currency: 'CHF', buyRate: 0.7807, sellRate: 0.8544, unit: 'USD' },
    { currency: 'CNY', buyRate: 6.8661, sellRate: 7.0238, unit: 'USD' },
    { currency: 'HKD', buyRate: 7.7810, sellRate: 8.0763, unit: 'USD' },
    { currency: 'JPY', buyRate: 158.63, sellRate: 163.03, unit: 'USD' },
    { currency: 'MYR', buyRate: 3.7355, sellRate: 4.3180, unit: 'USD' },
    { currency: 'SGD', buyRate: 1.2787, sellRate: 1.2993, unit: 'USD' },
    { currency: 'THB', buyRate: 32.70, sellRate: 33.49, unit: 'USD' },
    { currency: 'TWD', buyRate: 29.49, sellRate: 34.99, unit: 'USD' },
    { currency: 'KRW', buyRate: 1360.26, sellRate: 1715.44, unit: 'USD' },
    { currency: 'VND', buyRate: 23070.66, sellRate: 29925.94, unit: 'USD' },
    { currency: 'IDR', buyRate: 14751.16, sellRate: 19255.40, unit: 'USD' },
  ],
};

// Fetch all rates with demo fallback and optional proxy
export async function fetchAllRates(useDemo = false, useProxy = false): Promise<BankRates[]> {
  if (useDemo) {
    return [
      {
        bankName: 'National Bank of Cambodia',
        bankCode: 'NBC',
        updatedAt: new Date().toISOString(),
        rates: [{ currency: 'USD', buyRate: 4000, sellRate: 4010, unit: 'KHR' }],
      },
      {
        bankName: 'ABA Bank',
        bankCode: 'ABA',
        updatedAt: new Date().toISOString(),
        rates: demoRates['ABA'],
      },
      {
        bankName: 'ACLEDA Bank',
        bankCode: 'ACLED',
        updatedAt: new Date().toISOString(),
        rates: demoRates['ACLED'],
      },
      {
        bankName: 'Wing Bank',
        bankCode: 'WING',
        updatedAt: new Date().toISOString(),
        rates: demoRates['WING'],
      },
      {
        bankName: 'Canadia Bank',
        bankCode: 'CANAD',
        updatedAt: new Date().toISOString(),
        rates: demoRates['CANAD'],
      },
    ];
  }

  const results = await Promise.allSettled([
    fetchNBCRate(),
    fetchABARates(useProxy),
    fetchACLEDARates(),
    fetchWingRates(useProxy),
    fetchCanadiaRates(),
  ]);
  
  const banks = results
    .filter((r): r is PromiseFulfilledResult<BankRates> => r.status === 'fulfilled')
    .map(r => r.value);
  
  // Fill in demo data for banks that failed to scrape
  return banks.map(bank => {
    if (bank.rates.length === 0 && demoRates[bank.bankCode]) {
      return {
        ...bank,
        rates: demoRates[bank.bankCode],
      };
    }
    return bank;
  });
}
