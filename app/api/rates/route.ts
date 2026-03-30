import { fetchAllRates } from '@/lib/scrapers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 300; // Revalidate every 5 minutes

export async function GET() {
  try {
    // Use demo data for static build, real scraping for production
    const useDemo = process.env.NODE_ENV === 'production' && process.env.USE_DEMO_DATA === 'true';
    const rates = await fetchAllRates(useDemo);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: rates,
      demoMode: useDemo,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch exchange rates',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
