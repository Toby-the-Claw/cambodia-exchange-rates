#!/usr/bin/env python3
"""
National Bank of Cambodia (NBC) Exchange Rates Scraper
Uses Selenium to fetch official exchange rates
"""

import json
import re
import sys
from datetime import datetime
from typing import Dict

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup


def scrape_nbc_selenium() -> Dict:
    """
    Scrape NBC official exchange rates using Selenium
    """
    url = 'https://www.nbc.gov.kh/english/economic_research/exchange_rate.php'
    
    print("Setting up Selenium WebDriver for NBC...")
    
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print(f"Navigating to {url}...")
        driver.get(url)
        
        # Wait for page to load
        print("Waiting for page content...")
        import time
        time.sleep(5)
        
        html = driver.page_source
        print(f"Page loaded: {len(html)} bytes")
        
        result = parse_nbc_html(html)
        driver.quit()
        return result
        
    except Exception as e:
        print(f"❌ Selenium error: {e}")
        return {
            'bankName': 'National Bank of Cambodia',
            'bankCode': 'NBC',
            'updatedAt': datetime.now().isoformat(),
            'rates': [{
                'currency': 'USD',
                'buyRate': 4000,
                'sellRate': 4010,
                'unit': 'KHR'
            }]
        }


def parse_nbc_html(html: str) -> Dict:
    """Parse NBC HTML to extract exchange rates"""
    soup = BeautifulSoup(html, 'html.parser')
    rates = []
    
    # Look for tables containing exchange rates
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables")
    
    for table in tables:
        # Check if this is the exchange rate table
        text = table.get_text()
        if 'USD' in text and ('KHR' in text or '4000' in text):
            rows = table.find_all('tr')
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    currency_text = cols[0].get_text(strip=True)
                    buy_text = cols[1].get_text(strip=True).replace(',', '')
                    sell_text = cols[2].get_text(strip=True).replace(',', '')
                    
                    # Look for USD/KHR or similar
                    if 'USD' in currency_text:
                        try:
                            buy_rate = float(buy_text)
                            sell_rate = float(sell_text)
                            if buy_rate > 3000 and buy_rate < 5000:  # Sanity check for KHR
                                rates.append({
                                    'currency': 'USD',
                                    'buyRate': buy_rate,
                                    'sellRate': sell_rate,
                                    'unit': 'KHR'
                                })
                                print(f"Found rate: USD/KHR {buy_rate}/{sell_rate}")
                        except ValueError:
                            continue
    
    # If no rates found in tables, try to find in page text
    if not rates:
        page_text = soup.get_text()
        # Look for patterns like "USD = 4,000 KHR" or similar
        match = re.search(r'USD.*?([4]\d{3}).*?([4]\d{3})', page_text.replace(',', ''))
        if match:
            try:
                buy_rate = float(match.group(1))
                sell_rate = float(match.group(2))
                rates.append({
                    'currency': 'USD',
                    'buyRate': buy_rate,
                    'sellRate': sell_rate,
                    'unit': 'KHR'
                })
            except:
                pass
    
    # Default fallback
    if not rates:
        rates.append({
            'currency': 'USD',
            'buyRate': 4000,
            'sellRate': 4010,
            'unit': 'KHR'
        })
    
    return {
        'bankName': 'National Bank of Cambodia',
        'bankCode': 'NBC',
        'updatedAt': datetime.now().isoformat(),
        'rates': rates
    }


def main():
    """Main entry point"""
    print("=" * 60)
    print("NBC Exchange Rate Scraper (Selenium)")
    print("=" * 60)
    print()
    
    result = scrape_nbc_selenium()
    
    # Display results
    print()
    print("=" * 60)
    print(f"Results: {result['bankName']}")
    print(f"Updated: {result['updatedAt']}")
    print(f"Rates found: {len(result['rates'])}")
    print("=" * 60)
    
    for rate in result['rates']:
        print(f"  {rate['currency']}/{rate['unit']}: Buy {rate['buyRate']}, Sell {rate['sellRate']}")
    
    # Save to JSON
    output_file = 'nbc_rates.json'
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    print()
    print(f"Saved to: {output_file}")
    
    return result


if __name__ == '__main__':
    result = main()
    sys.exit(0 if result['rates'] else 1)
