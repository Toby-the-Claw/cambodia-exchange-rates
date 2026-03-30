#!/usr/bin/env python3
"""
Cambodia Exchange Rates Scraper
Handles Cloudflare-protected sites (ABA, Wing) using various techniques
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Try to import optional dependencies
try:
    import cloudscraper
    CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    CLOUDSCRAPER_AVAILABLE = False

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class CambodiaRateScraper:
    """Scraper for Cambodian bank exchange rates"""
    
    def __init__(self):
        self.results = {}
        
    def get_headers(self) -> Dict[str, str]:
        """Get realistic browser headers"""
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.google.com/',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
        }
    
    def scrape_aba_cloudscraper(self) -> Optional[Dict]:
        """Scrape ABA using cloudscraper (bypasses Cloudflare)"""
        if not CLOUDSCRAPER_AVAILABLE:
            return None
            
        try:
            scraper = cloudscraper.create_scraper(
                browser={
                    'browser': 'chrome',
                    'platform': 'windows',
                    'desktop': True
                }
            )
            
            response = scraper.get(
                'https://www.ababank.com/en/forex-exchange/',
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                return self.parse_aba_html(response.text)
            else:
                print(f"ABA cloudscraper failed: HTTP {response.status_code}")
                return None
                
        except Exception as e:
            print(f"ABA cloudscraper error: {e}")
            return None
    
    def scrape_aba_playwright(self) -> Optional[Dict]:
        """Scrape ABA using Playwright (headless browser)"""
        if not PLAYWRIGHT_AVAILABLE:
            return None
            
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-setuid-sandbox']
                )
                
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    viewport={'width': 1920, 'height': 1080},
                    locale='en-US',
                )
                
                page = context.new_page()
                
                # Set extra headers
                page.set_extra_http_headers({
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://www.google.com/',
                })
                
                # Navigate and wait for content
                page.goto('https://www.ababank.com/en/forex-exchange/', wait_until='networkidle')
                
                # Wait for rate table to load
                page.wait_for_selector('table', timeout=10000)
                
                # Get HTML content
                html = page.content()
                
                browser.close()
                
                return self.parse_aba_html(html)
                
        except Exception as e:
            print(f"ABA playwright error: {e}")
            return None
    
    def scrape_aba_requests(self) -> Optional[Dict]:
        """Scrape ABA using requests with session (basic attempt)"""
        try:
            session = requests.Session()
            session.headers.update(self.get_headers())
            
            response = session.get(
                'https://www.ababank.com/en/forex-exchange/',
                timeout=15
            )
            
            if response.status_code == 200 and 'cloudflare' not in response.text.lower():
                return self.parse_aba_html(response.text)
            else:
                print(f"ABA requests blocked or returned challenge page")
                return None
                
        except Exception as e:
            print(f"ABA requests error: {e}")
            return None
    
    def parse_aba_html(self, html: str) -> Dict:
        """Parse ABA HTML to extract rates"""
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        rates = []
        
        # Find rate tables
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            for i, row in enumerate(rows):
                if i == 0:  # Skip header
                    continue
                    
                cols = row.find_all('td')
                if len(cols) >= 3:
                    currency_text = cols[0].get_text(strip=True)
                    buy_text = cols[1].get_text(strip=True).replace(',', '')
                    sell_text = cols[2].get_text(strip=True).replace(',', '')
                    
                    # Parse currency pair
                    import re
                    match = re.search(r'([A-Z]{3})\s*/\s*([A-Z]{3})', currency_text)
                    if match:
                        base, quote = match.groups()
                        try:
                            buy_rate = float(buy_text)
                            sell_rate = float(sell_text)
                            
                            if buy_rate > 0 and sell_rate > 0:
                                rates.append({
                                    'currency': base,
                                    'buyRate': buy_rate,
                                    'sellRate': sell_rate,
                                    'unit': quote
                                })
                        except ValueError:
                            continue
        
        # Extract update time
        update_text = soup.get_text()
        updated_at = datetime.now().isoformat()
        
        return {
            'bankName': 'ABA Bank',
            'bankCode': 'ABA',
            'updatedAt': updated_at,
            'rates': rates
        }
    
    def scrape_aba(self) -> Dict:
        """Scrape ABA with fallback methods"""
        print("Attempting to scrape ABA Bank...")
        
        # Try cloudscraper first
        if CLOUDSCRAPER_AVAILABLE:
            print("  Trying cloudscraper...")
            result = self.scrape_aba_cloudscraper()
            if result and result['rates']:
                print(f"  ✓ Cloudscraper success: {len(result['rates'])} rates")
                return result
        
        # Try playwright second
        if PLAYWRIGHT_AVAILABLE:
            print("  Trying playwright...")
            result = self.scrape_aba_playwright()
            if result and result['rates']:
                print(f"  ✓ Playwright success: {len(result['rates'])} rates")
                return result
        
        # Try basic requests last
        print("  Trying basic requests...")
        result = self.scrape_aba_requests()
        if result and result['rates']:
            print(f"  ✓ Requests success: {len(result['rates'])} rates")
            return result
        
        # All methods failed - return empty
        print("  ✗ All methods failed, returning empty")
        return {
            'bankName': 'ABA Bank',
            'bankCode': 'ABA',
            'updatedAt': datetime.now().isoformat(),
            'rates': []
        }
    
    def scrape_all(self) -> List[Dict]:
        """Scrape all banks"""
        results = []
        
        # ABA Bank
        aba = self.scrape_aba()
        results.append(aba)
        
        # Add other banks here as needed
        
        return results


def main():
    """Main entry point"""
    scraper = CambodiaRateScraper()
    
    print("=" * 50)
    print("Cambodia Exchange Rates Scraper")
    print("=" * 50)
    print()
    
    # Check available methods
    print(f"Cloudscraper available: {CLOUDSCRAPER_AVAILABLE}")
    print(f"Playwright available: {PLAYWRIGHT_AVAILABLE}")
    print()
    
    # Scrape ABA
    result = scraper.scrape_aba()
    
    print()
    print("=" * 50)
    print(f"Bank: {result['bankName']}")
    print(f"Rates found: {len(result['rates'])}")
    print("=" * 50)
    
    if result['rates']:
        for rate in result['rates'][:5]:  # Show first 5
            print(f"  {rate['currency']}/{rate['unit']}: {rate['buyRate']} / {rate['sellRate']}")
    else:
        print("  No rates found - site may be blocking scrapers")
    
    # Save to file
    output_file = 'aba_rates.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    print(f"\nSaved to {output_file}")


if __name__ == '__main__':
    main()
