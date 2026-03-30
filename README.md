# Cambodia Exchange Rates Aggregator

A web application that aggregates exchange rates from major Cambodian banks, providing real-time comparison of buy/sell rates.

## Features

- **Real-time Exchange Rates** - Fetches latest rates from major Cambodian banks
- **USD/KHR Comparison** - Compare rates across all banks to find the best deal
- **Multi-currency Support** - View rates for USD, EUR, THB, CNY, and more
- **Bank Coverage**:
  - National Bank of Cambodia (Official Rate)
  - ABA Bank
  - ACLEDA Bank
  - Wing Bank
  - Canadia Bank

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Cheerio (Web Scraping)
- Axios

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

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

The static export will be in the `dist` folder.

## Data Sources

Rates are scraped from official bank websites:

| Bank | Source URL |
|------|------------|
| National Bank of Cambodia | https://data.mef.gov.kh |
| ABA Bank | https://www.ababank.com/en/forex-exchange/ |
| ACLEDA Bank | https://www.acledabank.com.kh |
| Wing Bank | https://www.wingbank.com.kh |
| Canadia Bank | https://www.canadiabank.com.kh |

## API Endpoints

### GET /api/rates

Returns exchange rates from all supported banks.

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

## Disclaimer

This application is for informational purposes only. Exchange rates shown are indicative and may not reflect the actual rate at the time of transaction. Always confirm rates directly with your bank before making currency exchanges.

## License

MIT License
