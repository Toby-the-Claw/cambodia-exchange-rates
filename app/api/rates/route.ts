import { fetchAllRates } from '@/lib/scrapers';
import { NextResponse } from 'next/server';

export const maxDuration = 30; // Allow up to 30 seconds for scraping (Vercel hobby limit)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const useProxy = searchParams.get('proxy') === 'true';
    
    // In production on Vercel, Selenium won't work - use demo fallback
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
    const useDemo = isVercel || process.env.USE_DEMO_DATA === 'true';
    
    console.log('API request:', { isVercel, useDemo, useProxy, env: process.env.VERCEL_ENV });
    
    const rates = await fetchAllRates(useDemo, useProxy);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: rates,
      demoMode: useDemo,
      proxyMode: useProxy,
      environment: isVercel ? 'vercel' : 'local',
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange rates',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
