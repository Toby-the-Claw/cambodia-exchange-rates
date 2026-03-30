# Cambodia Exchange Rate Sources - Research Summary

## Successfully Identified Sources

### 1. National Bank of Cambodia (Official Reference Rate)
- **Website**: https://data.mef.gov.kh
- **API Endpoint**: https://data.mef.gov.kh/api/v1/public-datasets/pd_66a0cd503e0bd300012638fb4/json
- **Status**: ✅ Public API available
- **Update Frequency**: Daily (~16:30 Phnom Penh time)
- **Coverage**: Official USD/KHR reference rate
- **Method**: REST API + fallback to GDT website scraping

### 2. ABA Bank
- **Website**: https://www.ababank.com/en/forex-exchange/
- **Status**: ✅ Scrapable (HTML table format)
- **Currencies**: USD, EUR, THB, SGD, CNY, GBP, JPY, AUD, CAD, and more
- **Rates Provided**: Both SWIFT Transfer and Note (Cash) rates
- **Update Frequency**: Daily
- **Method**: Cheerio HTML scraping

### 3. ACLEDA Bank
- **Website**: https://www.acledabank.com.kh/kh/eng/ps_cmforeignexchange
- **Status**: ⚠️ Scrapable (may require adjustments)
- **Method**: HTML table scraping

### 4. Wing Bank
- **Website**: https://www.wingbank.com.kh/en/exchange-rate
- **Status**: ⚠️ Has redirect protection (anti-scraping)
- **Method**: May need proxy or different approach

### 5. Canadia Bank
- **Website**: https://www.canadiabank.com.kh/exchange-rates
- **Status**: ✅ Scrapable
- **Method**: HTML scraping

## Data Points Available Per Bank

| Bank | USD/KHR | Other Currencies | Buy/Sell | Last Updated |
|------|---------|------------------|----------|--------------|
| NBC | ✅ | Limited | Official only | ✅ |
| ABA | ✅ | ✅ 15+ pairs | ✅ Both | ✅ |
| ACLEDA | ✅ | ✅ | ✅ Both | ⚠️ |
| Wing | ✅ | ✅ | ✅ Both | ✅ |
| Canadia | ✅ | ✅ | ✅ Both | ⚠️ |

## Scraping Implementation

The scrapers (`lib/scrapers.ts`) include:

1. **fetchNBCRate()** - Uses official API with HTML fallback
2. **fetchABARates()** - Scrapes HTML table from ababank.com
3. **fetchACLEDARates()** - Scrapes ACLEDA exchange rate page
4. **fetchWingRates()** - Scrapes Wing Bank (may need proxy)
5. **fetchCanadiaRates()** - Scrapes Canadia Bank rates

## Rate Comparison Logic

The website highlights:
- **Best Buy Rate** (highest = best for selling USD)
- **Best Sell Rate** (lowest = best for buying USD)
- **Spread** (difference between buy/sell)

## Build Output

Static site generated in `/dist/` folder ready for deployment to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting

## Known Limitations

1. **Wing Bank**: Has redirect loop protection - may need rotating proxies
2. **Dynamic Updates**: With static export, rates are cached for 5 minutes
3. **Rate Freshness**: Banks update at different times during the day

## Next Steps for Production

1. Add proxy rotation for Wing Bank scraping
2. Implement server-side caching (Redis)
3. Add rate history/charting
4. Mobile app push notifications for rate alerts
5. Add more banks: KB Prasac, Woori, Sathapana, etc.
