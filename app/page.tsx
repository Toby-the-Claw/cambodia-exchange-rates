'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

interface ExchangeRate {
  currency: string;
  buyRate: number;
  sellRate: number;
  unit: string;
}

interface BankRates {
  bankName: string;
  bankCode: string;
  updatedAt: string;
  rates: ExchangeRate[];
}

export default function Home() {
  const [rates, setRates] = useState<BankRates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rates');
      const data = await response.json();
      
      if (data.success) {
        setRates(data.data);
        setLastUpdated(new Date(data.timestamp));
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch rates');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRates, 300000);
    return () => clearInterval(interval);
  }, []);

  // Get USD/KHR rates for comparison
  const getUSDKHRRates = () => {
    const usdRates = rates
      .map(bank => {
        const usdRate = bank.rates.find(r => r.currency === 'USD' && r.unit === 'KHR');
        if (usdRate) {
          return {
            bankName: bank.bankName,
            bankCode: bank.bankCode,
            buyRate: usdRate.buyRate,
            sellRate: usdRate.sellRate,
            spread: usdRate.sellRate - usdRate.buyRate,
            updatedAt: bank.updatedAt,
          };
        }
        return null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.buyRate - b.buyRate);
    
    return usdRates;
  };

  // Get all unique currencies
  const getAllCurrencies = () => {
    const currencies = new Set<string>();
    rates.forEach(bank => {
      bank.rates.forEach(rate => {
        currencies.add(`${rate.currency}/${rate.unit}`);
      });
    });
    return Array.from(currencies).sort();
  };

  const usdRates = getUSDKHRRates();
  const currencies = getAllCurrencies();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Cambodia Exchange Rates
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Compare rates from major Cambodian banks
          </p>
          {lastUpdated && (
            <p className="text-sm text-slate-500 mt-2">
              Last updated: {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              <button
                onClick={fetchRates}
                className="ml-4 text-blue-600 hover:text-blue-800 underline"
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* USD/KHR Comparison Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>USD/KHR Comparison</span>
              <Badge variant="secondary">Most Popular</Badge>
            </CardTitle>
            <CardDescription>
              Compare buy and sell rates across all banks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : usdRates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank</TableHead>
                    <TableHead className="text-right">We Buy (KHR)</TableHead>
                    <TableHead className="text-right">We Sell (KHR)</TableHead>
                    <TableHead className="text-right">Spread</TableHead>
                    <TableHead className="text-right">Best For</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usdRates.map((rate) => {
                    const bestBuy = Math.max(...usdRates.map(r => r.buyRate));
                    const bestSell = Math.min(...usdRates.map(r => r.sellRate));
                    const isBestBuy = rate.buyRate === bestBuy;
                    const isBestSell = rate.sellRate === bestSell;
                    
                    return (
                      <TableRow key={rate.bankCode}>
                        <TableCell className="font-medium">{rate.bankName}</TableCell>
                        <TableCell className={`text-right ${isBestBuy ? 'text-green-600 font-bold' : ''}`}>
                          {rate.buyRate.toLocaleString()}
                          {isBestBuy && <span className="ml-1 text-xs">★</span>}
                        </TableCell>
                        <TableCell className={`text-right ${isBestSell ? 'text-green-600 font-bold' : ''}`}>
                          {rate.sellRate.toLocaleString()}
                          {isBestSell && <span className="ml-1 text-xs">★</span>}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {rate.spread.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {isBestBuy && <Badge className="mr-1">Selling USD</Badge>}
                          {isBestSell && <Badge variant="secondary">Buying USD</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-slate-500 text-center py-8">No USD/KHR rates available</p>
            )}
          </CardContent>
        </Card>

        {/* All Currencies Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 flex flex-wrap justify-center">
            <TabsTrigger value="all">All Currencies</TabsTrigger>
            {currencies.slice(0, 8).map(curr => (
              <TabsTrigger key={curr} value={curr}>{curr}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="shadow">
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : rates.length > 0 ? (
                rates.map((bank) => (
                  <Card key={bank.bankCode} className="shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{bank.bankName}</CardTitle>
                      <CardDescription>
                        Updated: {formatDistanceToNow(new Date(bank.updatedAt), { addSuffix: true })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Currency</TableHead>
                            <TableHead className="text-right">Buy</TableHead>
                            <TableHead className="text-right">Sell</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bank.rates.slice(0, 10).map((rate, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {rate.currency}/{rate.unit}
                              </TableCell>
                              <TableCell className="text-right">
                                {rate.buyRate.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {rate.sellRate.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {bank.rates.length > 10 && (
                        <p className="text-xs text-slate-500 text-center mt-2">
                          +{bank.rates.length - 10} more currencies
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-slate-500 text-center col-span-2 py-8">
                  No exchange rates available. Please try refreshing.
                </p>
              )}
            </div>
          </TabsContent>

          {currencies.map((currency) => (
            <TabsContent key={currency} value={currency}>
              <Card className="shadow">
                <CardHeader>
                  <CardTitle>{currency} Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank</TableHead>
                        <TableHead className="text-right">Buy</TableHead>
                        <TableHead className="text-right">Sell</TableHead>
                        <TableHead className="text-right">Spread</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates
                        .map((bank) => {
                          const rate = bank.rates.find(
                            (r) => `${r.currency}/${r.unit}` === currency
                          );
                          if (!rate) return null;
                          return {
                            bankName: bank.bankName,
                            buyRate: rate.buyRate,
                            sellRate: rate.sellRate,
                            spread: rate.sellRate - rate.buyRate,
                          };
                        })
                        .filter((r): r is NonNullable<typeof r> => r !== null)
                        .sort((a, b) => a.buyRate - b.buyRate)
                        .map((rate, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{rate.bankName}</TableCell>
                            <TableCell className="text-right">{rate.buyRate.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{rate.sellRate.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-slate-500">
                              {rate.spread.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-500">
          <p>Data sourced from official bank websites</p>
          <p className="mt-1">
            Banks: National Bank of Cambodia, ABA Bank, ACLEDA Bank, Wing Bank, Canadia Bank
          </p>
          <p className="mt-2 text-xs">
            Disclaimer: Rates are for informational purposes only. Actual rates may vary.
          </p>
        </footer>
      </div>
    </main>
  );
}
