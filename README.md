# Cambodia Exchange Rates Aggregator

A web application that aggregates exchange rates from major Cambodian banks, providing real-time comparison of buy/sell rates.

## Features

- **Real-time Exchange Rates** - Fetches latest rates from major Cambodian banks
- **USD/KHR Comparison** - Compare rates across all banks to find the best deal
- **Multi-currency Support** - View rates for USD, EUR, THB, CNY, and more
- **Proxy Support** - Bypass anti-scraping protection for ABA and Wing Bank
- **Demo Fallback** - Shows sample rates when live scraping fails
- **Bank Coverage**:
  - National Bank of Cambodia (Official Rate)
  - ABA Bank (with proxy)
  - ACLEDA Bank
  - Wing Bank (with proxy)
  - Canadia Bank

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Cheerio (Web Scraping)
- Axios + https-proxy-agent

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
cd cambodia-exchange-rates

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Proxy Setup (Optional)

To scrape ABA Bank and Wing Bank (which have anti-scraping protection), set up a proxy service:

1. Sign up at [ScrapingBee](https://www.scrapingbee.com/) or [ScrapingAnt](https://scrapingant.com/)
2. Add your API key to `.env.local`:
```
SCRAPINGBEE_API_KEY=your_api_key
```
3. Use proxy mode: `GET /api/rates?proxy=true`

See [PROXY_SETUP.md](PROXY_SETUP.md) for detailed instructions.

### Build for Production

```bash
npm run build
```

The static export will be in the `dist` folder.

## Data Sources

Rates are scraped from official bank websites:

| Bank | Source URL | Protection |
|------|------------|------------|
| National Bank of Cambodia | https://data.mef.gov.kh | None |
| ABA Bank | https://www.ababank.com/en/forex-exchange/ | Cloudflare |
| ACLEDA Bank | https://www.acledabank.com.kh | None |
| Wing Bank | https://www.wingbank.com.kh | Redirect loop |
| Canadia Bank | https://www.canadiabank.com.kh | None |

## API Endpoints

### GET /api/rates

Returns exchange rates from all supported banks.

**Query Parameters:**
- `proxy` (boolean): Enable proxy mode for protected sites

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-03-30T10:00:00Z",
  "data": [
    {
      "bankName": "ABA Bank",
      "bankCode": "ABA",
      "updatedAt": "2026-03-30T09:45:00Z",
      "rates": [
        {
          "currency": "USD",
          "buyRate": 4000,
          "sellRate": 4015,
          "unit": "KHR"
        }
      ]
    }
  ]
}
```

## Documentation

- [PROXY_SETUP.md](PROXY_SETUP.md) - Proxy configuration guide
- [SCRAPER_STATUS.md](SCRAPER_STATUS.md) - Scraper status and troubleshooting
- [SOURCES.md](SOURCES.md) - Data source research

## Disclaimer

This application is for informational purposes only. Exchange rates shown are indicative and may not reflect the actual rate at the time of transaction. Always confirm rates directly with your bank before making currency exchanges.

## License

MIT License
