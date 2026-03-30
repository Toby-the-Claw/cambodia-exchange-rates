import axios from 'axios';
import * as cheerio from 'cheerio';

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

// National Bank of Cambodia Official Rate
export async function fetchNBCRate(): Promise<BankRates> {
  try {
    // NBC publishes daily rate on their website and via data.mef.gov.kh API
    const response = await axios.get('https://data.mef.gov.kh/api/v1/public-datasets/pd_66a0cd503e0bd300012638fb4/json?page=1&size=1', {
      timeout: 10000,
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

// ABA Bank Scraper
export async function fetchABARates(): Promise<BankRates> {
  try {
    const response = await axios.get('https://www.ababank.com/en/forex-exchange/', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    const $ = cheerio.load(response.data);
    const rates: ExchangeRate[] = [];
    
    // Extract SWIFT Transfer rates from the first table
    $('table').first().find('tr').each((i, row) => {
      if (i === 0) return; // Skip header
      const cols = $(row).find('td');
      if (cols.length >= 3) {
        const currencyText = $(cols[0]).text().trim();
        const buyText = $(cols[1]).text().trim().replace(/,/g, '');
        const sellText = $(cols[2]).text().trim().replace(/,/g, '');
        
        // Parse currency pair (e.g., "USD / KHR")
        const match = currencyText.match(/([A-Z]{3})\s*\/\s*([A-Z]{3})/);
        if (match) {
          const [, base, quote] = match;
          const buyRate = parseFloat(buyText);
          const sellRate = parseFloat(sellText);
          
          if (!isNaN(buyRate) && !isNaN(sellRate)) {
            rates.push({
              currency: base,
              buyRate,
              sellRate,
              unit: quote,
            });
          }
        }
      }
    });
    
    // Extract update time
    const updateText = $('p:contains("Upload Date")').text();
    const dateMatch = updateText.match(/Upload Date\s*:\s*(.+)/);
    
    return {
      bankName: 'ABA Bank',
      bankCode: 'ABA',
      updatedAt: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
      rates,
    };
  } catch (error) {
    console.error('ABA fetch error:', error);
    return {
      bankName: 'ABA Bank',
      bankCode: 'ABA',
      updatedAt: new Date().toISOString(),
      rates: [],
    };
  }
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

// Wing Bank Scraper
export async function fetchWingRates(): Promise<BankRates> {
  try {
    const response = await axios.get('https://www.wingbank.com.kh/en/exchange-rate', {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      maxRedirects: 10,
    });
    
    const $ = cheerio.load(response.data);
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

  // Try multiple possible endpoints
  const urls = [
    'https://digital.canadiabank.com/cnbtool/exchange/',
    'https://www.canadiabank.com.kh/exchange-rates',
    'https://www.canadiabank.com.kh/api/exchange-rates',
  ];

  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers,
        maxRedirects: 5,
      });
      
      const $ = cheerio.load(response.data);
      const rates: ExchangeRate[] = [];
      
      // Try multiple selectors for rate tables
      const selectors = [
        'table.exchange-rate-table',
        'table.rates-table',
        '.exchange-rate table',
        '.rates table',
        'table',
      ];
      
      for (const selector of selectors) {
        $(selector).each((_, table) => {
          $(table).find('tr').each((i, row) => {
            if (i === 0) return;
            const cols = $(row).find('td');
            if (cols.length >= 3) {
              const pairText = $(cols[0]).text().trim();
              const buyText = $(cols[1]).text().trim().replace(/,/g, '');
              const sellText = $(cols[2]).text().trim().replace(/,/g, '');
              
              let base = 'USD';
              let quote = 'KHR';
              
              const match = pairText.match(/([A-Z]{3})[\/\s]*([A-Z]{3})/);
              if (match) {
                [, base, quote] = match;
              }
              
              const buyRate = parseFloat(buyText);
              const sellRate = parseFloat(sellText);
              
              if (!isNaN(buyRate) && !isNaN(sellRate) && buyRate > 0 && sellRate > 0) {
                rates.push({ currency: base, buyRate, sellRate, unit: quote });
              }
            }
          });
        });
        
        if (rates.length > 0) break;
      }
      
      if (rates.length > 0) {
        return {
          bankName: 'Canadia Bank',
          bankCode: 'CANAD',
          updatedAt: new Date().toISOString(),
          rates,
        };
      }
    } catch (error) {
      console.log(`Canadia fetch from ${url} failed:`, (error as Error).message);
      continue;
    }
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
    { currency: 'USD', buyRate: 3998, sellRate: 4010, unit: 'KHR' },
    { currency: 'EUR', buyRate: 4300, sellRate: 4440, unit: 'KHR' },
    { currency: 'THB', buyRate: 118.20, sellRate: 122.50, unit: 'KHR' },
  ],
};

// Fetch all rates with demo fallback
export async function fetchAllRates(useDemo = false): Promise<BankRates[]> {
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
    fetchABARates(),
    fetchACLEDARates(),
    fetchWingRates(),
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
