#!/usr/bin/env python3
"""
ABA Bank Exchange Rates Scraper using Selenium
Uses real Chrome browser to bypass Cloudflare protection
"""

import json
import re
import sys
from datetime import datetime
from typing import Dict

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup


def scrape_aba_selenium() -> Dict:
    """
    Scrape ABA Bank using Selenium with headless Chrome
    This uses a real browser to bypass Cloudflare
    """
    url = 'https://www.ababank.com/en/forex-exchange/'
    
    print("Setting up Selenium WebDriver...")
    
    # Configure Chrome options
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_argument('--window-size=1920,1080')
    
    # Set realistic user agent
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Disable automation flags
    chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    try:
        # Initialize driver
        driver = webdriver.Chrome(options=chrome_options)
        
        # Execute script to hide webdriver property
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        print(f"Navigating to {url}...")
        driver.get(url)
        
        # Wait for page to load (look for table or specific content)
        print("Waiting for page content...")
        wait = WebDriverWait(driver, 30)
        
        try:
            # Wait for either the table or the upload date text
            wait.until(lambda d: 
                'USD' in d.page_source or 
                'Upload Date' in d.page_source or
                'cloudflare' in d.page_source.lower()
            )
        except:
            print("Timeout waiting for content")
        
        # Check if we hit Cloudflare challenge
        if 'cloudflare' in driver.page_source.lower() and 'challenge' in driver.page_source.lower():
            print("⚠️  Hit Cloudflare challenge page, waiting longer...")
            # Wait additional time for challenge to complete
            import time
            time.sleep(10)
        
        # Get page source
        html = driver.page_source
        print(f"Page loaded: {len(html)} bytes")
        
        # Check if we got the actual page
        if 'USD' in html and 'KHR' in html:
            print("✓ Successfully loaded exchange rate page")
            result = parse_aba_html(html)
        else:
            print("⚠️  Page may not contain expected content")
            result = {'bankName': 'ABA Bank', 'bankCode': 'ABA', 'rates': []}
        
        driver.quit()
        return result
        
    except Exception as e:
        print(f"❌ Selenium error: {e}")
        return {'bankName': 'ABA Bank', 'bankCode': 'ABA', 'rates': []}


def parse_aba_html(html: str) -> Dict:
    """Parse ABA Bank HTML to extract exchange rates"""
    soup = BeautifulSoup(html, 'html.parser')
    rates = []
    
    # Find all tables
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables")
    
    for table in tables:
        rows = table.find_all('tr')
        for i, row in enumerate(rows):
            if i == 0:  # Skip header
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
    print("ABA Bank Exchange Rate Scraper (Selenium)")
    print("Uses headless Chrome browser")
    print("=" * 60)
    print()
    
    result = scrape_aba_selenium()
    
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
    sys.exit(0 if result['rates'] else 1)
