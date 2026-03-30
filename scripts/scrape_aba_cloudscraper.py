#!/usr/bin/env python3
"""
ABA Bank Exchange Rates Scraper
Bypasses Cloudflare using cloudscraper (no external API needed)
"""

import json
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Try to import cloudscraper
try:
    import cloudscraper
    CLOUDSCRAPER_AVAILABLE = True
except ImportError:
    CLOUDSCRAPER_AVAILABLE = False
    print("Installing cloudscraper...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cloudscraper", "-q"])
    import cloudscraper
    CLOUDSCRAPER_AVAILABLE = True


def scrape_aba_bank() -> Dict:
    """
    Scrape ABA Bank exchange rates using cloudscraper
    Cloudscraper bypasses Cloudflare protection without external APIs
    """
    url = 'https://www.ababank.com/en/forex-exchange/'
    
    print("Creating cloudscraper instance...")
    
    # Create scraper with browser-like fingerprint
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True,
            'mobile': False
        },
        delay=10  # Wait for Cloudflare challenge
    )
    
    # Set realistic headers
    headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,km;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
    }
    
    print(f"Fetching {url}...")
    
    try:
        response = scraper.get(url, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        print(f"Content length: {len(response.text)} bytes")
        
        if response.status_code == 200:
            # Check if we got the actual page or a challenge
            if 'cloudflare' in response.text.lower() and 'challenge' in response.text.lower():
                print("⚠️  Still got Cloudflare challenge page")
                return {'bankName': 'ABA Bank', 'bankCode': 'ABA', 'rates': []}
            
            return parse_aba_html(response.text)
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return {'bankName': 'ABA Bank', 'bankCode': 'ABA', 'rates': []}
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return {'bankName': 'ABA Bank', 'bankCode': 'ABA', 'rates': []}


def parse_aba_html(html: str) -> Dict:
    """Parse ABA Bank HTML to extract exchange rates"""
    from bs4 import BeautifulSoup
    
    soup = BeautifulSoup(html, 'html.parser')
    rates = []
    
    # Find all tables
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables")
    
    for table in tables:
        rows = table.find_all('tr')
        for i, row in enumerate(rows):
            if i == 0:  # Skip header row
                continue
                
            cols = row.find_all(['td', 'th'])
            if len(cols) >= 3:
                currency_text = cols[0].get_text(strip=True)
                buy_text = cols[1].get_text(strip=True).replace(',', '').replace(' ', '')
                sell_text = cols[2].get_text(strip=True).replace(',', '').replace(' ', '')
                
                # Parse currency pair (e.g., "USD / KHR")
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
    
    # Try to find update time
    updated_at = datetime.now().isoformat()
    page_text = soup.get_text()
    
    # Look for upload date
    date_match = re.search(r'Upload Date\s*:\s*([^\n]+)', page_text, re.IGNORECASE)
    if date_match:
        try:
            date_str = date_match.group(1).strip()
            # Parse format like "March 30, 2026 07:45"
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
    print("ABA Bank Exchange Rate Scraper (No External API)")
    print("Using: cloudscraper (bypasses Cloudflare)")
    print("=" * 60)
    print()
    
    # Scrape ABA
    result = scrape_aba_bank()
    
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
    
    # Save to JSON
    output_file = 'aba_rates.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    print()
    print(f"Saved to: {output_file}")
    
    return result


if __name__ == '__main__':
    result = main()
    
    # Exit with error code if no rates found
    if not result['rates']:
        sys.exit(1)
