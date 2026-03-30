import { fetchACLEDARates, fetchCanadiaRates, fetchWingRates, fetchABARates, fetchNBCRate } from '@/lib/scrapers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const results: Record<string, { success: boolean; rates: number; error?: string; usdKhr?: string }> = {};
  
  const banks = [
    { name: 'NBC', fn: fetchNBCRate },
    { name: 'ABA Bank', fn: fetchABARates },
    { name: 'ACLEDA Bank', fn: fetchACLEDARates },
    { name: 'Wing Bank', fn: fetchWingRates },
    { name: 'Canadia Bank', fn: fetchCanadiaRates },
  ];
  
  for (const bank of banks) {
    try {
      const result = await bank.fn();
      const usdRate = result.rates.find(r => r.currency === 'USD' && r.unit === 'KHR');
      
      results[bank.name] = {
        success: result.rates.length > 0,
        rates: result.rates.length,
        usdKhr: usdRate ? `${usdRate.buyRate.toLocaleString()} / ${usdRate.sellRate.toLocaleString()}` : undefined,
      };
    } catch (error) {
      results[bank.name] = {
        success: false,
        rates: 0,
        error: (error as Error).message,
      };
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
  });
}
