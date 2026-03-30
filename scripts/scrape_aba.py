#!/usr/bin/env python3
"""
ABA Bank Exchange Rates Scraper
Uses curl_cffi to mimic browser TLS fingerprint (bypasses Cloudflare)
No external API required
"""

import json
import re
import sys
from datetime import datetime
from typing import Dict, List

# Try curl_cffi (best for bypassing Cloudflare)
try:
    from curl_cffi import requests
    CURL_CFFI_AVAILABLE = True
except ImportError:
    CURL_CFFI_AVAILABLE = False


def scrape_aba_curl_cffi() -> Dict:
    """
    Scrape ABA using curl_cffi (impersonates browser TLS/JA3 fingerprint)
    This bypasses Cloudflare without external APIs
    """
    if not CURL_CFFI_AVAILABLE:
        print("❌ curl_cffi not available")
        return None
        
    url = 'https://www.ababank.com/en/forex-exchange/'
    
    print("Using curl_cffi (impersonates Chrome browser)...")
    
    try:
        # Use impersonate to mimic real Chrome browser
        response = requests.get(
            url,
            impersonate="chrome120",
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            # Check if we got actual content or challenge page
            if len(response.text) > 10000 and 'USD' in response.text:
                print("✓ Successfully fetched page content")
                return parse_aba_html(response.text)
            else:
                print("⚠️  Got challenge page or insufficient content")
                return None
        else:
            print(f"❌ HTTP {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def scrape_aba_cloudscraper() -> Dict:
    """Fallback to cloudscraper"""
    try:
        import cloudscraper
        
        url = 'https://www.ababank.com/en/forex-exchange/'
        
        print("Using cloudscraper...")
        
        scraper = cloudscraper.create_scraper(
            browser={
                'browser': 'chrome',
                'platform': 'windows',
                'desktop': True
            },
            delay=10
        )
        
        headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }
        
        response = scraper.get(url, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200 and 'USD' in response.text:
            return parse_aba_html(response.text)
        return None
        
    except Exception as e:
        print(f"Cloudscraper error: {e}")
        return None


def parse_aba_html(html: str) -> Dict:
    """Parse ABA Bank HTML to extract exchange rates"""
    from bs4 import BeautifulSoup
    
    soup = BeautifulSoup(html, 'html.parser')
    rates = []
    
    # Find all tables
    tables = soup.find_all('table')
    
    for table in tables:
        rows = table.find_all('tr')
        for i, row in enumerate(rows):
            if i == 0:
                continue
                
            cols = row.find_all(['td', 'th'])
            if len(cols) >= 3:
                currency_text = cols[0].get_text(strip=True)
                buy_text = cols[1].get_text(strip=True).replace(',', '').replace(' ', '')
                sell_text = cols[2].get_text(strip=True).replace(',', '').replace(' ', '')
                
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
    updated_at = datetime.now().isoformat()
    page_text = soup.get_text()
    
    date_match = re.search(r'Upload Date\s*:\s*([^\n]+)', page_text, re.IGNORECASE)
    if date_match:
        try:
            date_str = date_match.group(1).strip()
            parsed_date = datetime.strptime(date_str, '%B %d, %Y %H:%M')
            updated_at = parsed_date.isoformat()
        except:
            pass
    
    return {
        'bankName': 'ABA Bank',
        'bankCode': 'ABA',
        'updatedAt': updated_at,
        'rates': rates
    }


def main():
    """Main entry point"""
    print("=" * 60)
    print("ABA Bank Exchange Rate Scraper")
    print("No external API required")
    print("=" * 60)
    print()
    
    # Try curl_cffi first (best option)
    result = None
    
    if CURL_CFFI_AVAILABLE:
        result = scrape_aba_curl_cffi()
    else:
        print("curl_cffi not installed. Install with:")
        print("  pip3 install curl_cffi")
        print()
    
    # Fallback to cloudscraper
    if not result or not result.get('rates'):
        result = scrape_aba_cloudscraper()
    
    # If all failed, return empty
    if not result:
        result = {
            'bankName': 'ABA Bank',
            'bankCode': 'ABA',
            'updatedAt': datetime.now().isoformat(),
            'rates': []
        }
    
    # Display results
    print()
    print("=" * 60)
    print(f"Results: {result['bankName']}")
    print(f"Updated: {result['updatedAt']}")
    print(f"Rates found: {len(result['rates'])}")
    print("=" * 60)
    
    if result['rates']:
        for rate in result['rates']:
            print(f"  {rate['currency']}/{rate['unit']:<3}  Buy: {rate['buyRate']:<10}  Sell: {rate['sellRate']}")
    else:
        print("  No rates found")
        print()
        print("Note: ABA Bank has strong anti-bot protection.")
        print("Recommendations:")
        print("  1. Install curl_cffi: pip3 install curl_cffi")
        print("  2. Use a residential proxy")
        print("  3. Use ScrapingAnt/ScrapingBee API")
    
    # Save to JSON
    output_file = 'aba_rates.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    print()
    print(f"Saved to: {output_file}")
    
    return result


if __name__ == '__main__':
    result = main()
    sys.exit(0 if result['rates'] else 1)
