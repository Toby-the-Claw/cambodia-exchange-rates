# Proxy Setup Guide for Cambodia Exchange Rates

## Overview

Some Cambodian bank websites have anti-scraping protection:
- **ABA Bank**: Cloudflare challenge page
- **Wing Bank**: Redirect loop protection

This guide explains how to set up proxy rotation to bypass these protections.

## Quick Start (Recommended)

### Option 1: ScrapingBee (Easiest)

1. Sign up at https://www.scrapingbee.com/ (free trial available)
2. Get your API key from the dashboard
3. Add to `.env.local`:
```
SCRAPINGBEE_API_KEY=your_api_key_here
```
4. Enable proxy mode in API calls:
```
GET /api/rates?proxy=true
```

### Option 2: ScrapingAnt (Alternative)

1. Sign up at https://scrapingant.com/ (free tier: 10,000 requests/month)
2. Get your API key
3. Add to `.env.local`:
```
SCRAPINGANT_API_KEY=your_api_key_here
```

### Option 3: Your Own Proxy

If you have access to a proxy server:
```
USE_PROXY=true
PROXY_URL=http://user:pass@your-proxy:port
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SCRAPINGBEE_API_KEY` | ScrapingBee API key | No (Option 1) |
| `SCRAPINGANT_API_KEY` | ScrapingAnt API key | No (Option 2) |
| `USE_PROXY` | Enable basic proxy rotation | No |
| `PROXY_URL` | Single proxy URL | No |

## How It Works

### Without Proxy (Default)
```
Direct Request → Bank Website
```
- Works for: NBC, ACLEDA, Canadia
- Fails for: ABA (Cloudflare), Wing (Redirects)

### With ScrapingBee/ScrapingAnt
```
Request → Scraping Service → Premium Proxy → Bank Website
                ↓
        JavaScript Rendering
                ↓
        Clean HTML Response
```

### Fallback Behavior

If proxy fetching fails, the system automatically falls back to **demo data**:
- ABA: 5 currency pairs
- Wing: 3 currency pairs

## Testing

### Test endpoint (no proxy):
```bash
curl http://localhost:3000/api/rates
```

### Test with proxy:
```bash
curl "http://localhost:3000/api/rates?proxy=true"
```

### Check scraper status:
```bash
curl http://localhost:3000/api/test
```

## Free Proxy Sources (Advanced)

If you want to use free proxies (not recommended for production):

1. Get fresh proxies from: https://free-proxy-list.net/
2. Add them to `lib/proxy.ts`:
```typescript
const FREE_PROXIES: string[] = [
  'http://123.45.67.89:8080',
  'http://98.76.54.32:3128',
];
```

⚠️ **Warning**: Free proxies are unreliable, slow, and often blacklisted.

## Pricing Comparison

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| ScrapingBee | 1,000 requests | $49/100K | JavaScript-heavy sites |
| ScrapingAnt | 10,000 requests | $19/100K | Budget-conscious |
| Bright Data | None | $500+/month | Enterprise scale |
| Oxylabs | None | $300+/month | High volume |

## Production Deployment

### Vercel
```bash
vercel env add SCRAPINGBEE_API_KEY
vercel
```

### Netlify
Add environment variables in the dashboard:
- Key: `SCRAPINGBEE_API_KEY`
- Value: your API key

### Self-hosted
```bash
export SCRAPINGBEE_API_KEY=your_key
npm run build
npm start
```

## Troubleshooting

### "Cloudflare challenge" error
- Solution: Enable proxy mode with ScrapingBee/ScrapingAnt

### "Maximum redirects exceeded"
- Solution: Use proxy with JavaScript rendering enabled

### "All proxy attempts failed"
- Check API key is correct
- Verify service has available credits
- Try alternative service

### Slow response times
- Proxies add 2-5 seconds to requests
- Consider caching with Redis for production

## Security Notes

- Never commit API keys to git
- Use `.env.local` for local development
- Set environment variables in deployment platform
- Rotate API keys periodically
- Monitor usage to avoid unexpected charges
