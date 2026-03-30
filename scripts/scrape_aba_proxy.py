#!/usr/bin/env python3
"""
Cambodia Exchange Rates Scraper using proxy services
Fetches rates from ABA Bank using ScrapingAnt or ScrapingBee
"""

import os
import sys
import json
import requests
from datetime import datetime
from typing import Dict, List, Optional


def scrape_with_scrapingant(url: str, api_key: str) -> Optional[str]:
    """Scrape using ScrapingAnt API"""
    scrapingant_url = f"https://api.scrapingant.com/v2/general"
    
    params = {
        'url': url,
        'x-api-key': api_key,
        'browser': 'true',
        'proxy_country': 'KH',
    }
    
    try:
        response = requests.get(scrapingant_url, params=params, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"ScrapingAnt error: {e}")
        return None


def scrape_with_scrapingbee(url: str, api_key: str) -> Optional[str]:
    """Scrape using ScrapingBee API"""
    scrapingbee_url = f"https://app.scrapingbee.com/api/v1/"
    
    params = {
        'api_key': api_key,
        'url': url,
        'render_js': 'true',
        'premium_proxy': 'true',
        'country_code': 'kh',
    }
    
    try:
        response = requests.get(scrapingbee_url, params=params, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"ScrapingBee error: {e}")
        return None


def parse_aba_rates(html: str) -> Dict:
    """Parse ABA Bank HTML to extract exchange rates"""
    from bs4 import BeautifulSoup
    import re
    
    soup = BeautifulSoup(html, 'html.parser')
    rates = []
    
    # Find all tables
    tables = soup.find_all('table')
    
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


def scrape_aba_bank(api_key: str, service: str = 'scrapingant') -> Dict:
    """
    Scrape ABA Bank exchange rates
    
    Args:
        api_key: API key for the scraping service
        service: 'scrapingant' or 'scrapingbee'
    
    Returns:
        Dict with bank info and rates
    """
    url = 'https://www.ababank.com/en/forex-exchange/'
    
    print(f"Fetching ABA Bank rates via {service}...")
    
    if service == 'scrapingant':
        html = scrape_with_scrapingant(url, api_key)
    elif service == 'scrapingbee':
        html = scrape_with_scrapingbee(url, api_key)
    else:
        print(f"Unknown service: {service}")
        return {'bankName': 'ABA Bank', 'bankCode': 'ABA', 'rates': []}
    
    if html:
        result = parse_aba_rates(html)
        print(f"✓ Found {len(result['rates'])} currency pairs")
        return result
    else:
        print("✗ Failed to fetch")
        return {
            'bankName': 'ABA Bank',
            'bankCode': 'ABA',
            'updatedAt': datetime.now().isoformat(),
            'rates': []
        }


def main():
    """Main entry point"""
    # Check for API keys
    scrapingant_key = os.getenv('SCRAPINGANT_API_KEY')
    scrapingbee_key = os.getenv('SCRAPINGBEE_API_KEY')
    
    print("=" * 60)
    print("ABA Bank Exchange Rate Scraper (Python)")
    print("=" * 60)
    print()
    
    # Determine which service to use
    if scrapingant_key:
        print("Using ScrapingAnt API")
        result = scrape_aba_bank(scrapingant_key, 'scrapingant')
    elif scrapingbee_key:
        print("Using ScrapingBee API")
        result = scrape_aba_bank(scrapingbee_key, 'scrapingbee')
    else:
        print("Error: No API key found!")
        print("Set SCRAPINGANT_API_KEY or SCRAPINGBEE_API_KEY environment variable")
        print()
        print("Example:")
        print("  export SCRAPINGANT_API_KEY=your_key_here")
        print("  python3 scrape_aba_proxy.py")
        sys.exit(1)
    
    # Display results
    print()
    print("=" * 60)
    print(f"Results for {result['bankName']}")
    print(f"Updated: {result['updatedAt']}")
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


if __name__ == '__main__':
    main()
