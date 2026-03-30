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

// Common pairs to display in the main comparison table
const COMMON_PAIRS = ['USD/KHR', 'EUR/KHR', 'THB/KHR', 'CNY/KHR', 'GBP/KHR'];

// Banks that have real data (not demo)
const REAL_DATA_BANKS = ['NBC', 'ABA', 'ACLED', 'CANAD'];

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

  // Get rates for a specific currency pair across all banks
  const getRatesForPair = (pair: string) => {
    const [base, quote] = pair.split('/');
    return rates
      .filter(bank => REAL_DATA_BANKS.includes(bank.bankCode))
      .map(bank => {
        const rate = bank.rates.find(r => r.currency === base && r.unit === quote);
        if (rate) {
          return {
            bankName: bank.bankName,
            bankCode: bank.bankCode,
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            spread: rate.sellRate - rate.buyRate,
          };
        }
        return null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
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

  // Get banks with real data only
  const getRealDataBanks = () => {
    return rates.filter(bank => REAL_DATA_BANKS.includes(bank.bankCode));
  };

  const currencies = getAllCurrencies();
  const realBanks = getRealDataBanks();

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

        {/* MAIN: Common Pairs Comparison Table */}
        <Card className="mb-8 shadow-lg border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between text-xl">
              <span>💱 Common Currency Pairs Comparison</span>
              <Badge variant="default" className="bg-blue-600">Live Data</Badge>
            </CardTitle>
            <CardDescription>
              Compare buy and sell rates across all banks side by side
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold">Currency Pair</TableHead>
                      {realBanks.map(bank => (
                        <TableHead key={bank.bankCode} className="text-center">
                          <div className="font-bold">{bank.bankName}</div>
                          <div className="text-xs font-normal text-slate-500">Buy / Sell</div>
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Best Buy</TableHead>
                      <TableHead className="text-right">Best Sell</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMMON_PAIRS.map((pair) => {
                      const pairRates = getRatesForPair(pair);
                      if (pairRates.length === 0) return null;
                      
                      const bestBuy = Math.max(...pairRates.map(r => r.buyRate));
                      const bestSell = Math.min(...pairRates.map(r => r.sellRate));
                      
                      return (
                        <TableRow key={pair} className="hover:bg-slate-50">
                          <TableCell className="font-bold text-lg">{pair}</TableCell>
                          {realBanks.map(bank => {
                            const rate = pairRates.find(r => r.bankCode === bank.bankCode);
                            const isBestBuy = rate && rate.buyRate === bestBuy;
                            const isBestSell = rate && rate.sellRate === bestSell;
                            
                            return (
                              <TableCell key={bank.bankCode} className="text-center">
                                {rate ? (
                                  <div className="space-y-1">
                                    <div className={`text-sm ${isBestBuy ? 'text-green-600 font-bold' : ''}`}>
                                      {rate.buyRate.toLocaleString()}
                                      {isBestBuy && <span className="ml-1">★</span>}
                                    </div>
                                    <div className="text-xs text-slate-400">/</div>
                                    <div className={`text-sm ${isBestSell ? 'text-green-600 font-bold' : ''}`}>
                                      {rate.sellRate.toLocaleString()}
                                      {isBestSell && <span className="ml-1">★</span>}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right">
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              {bestBuy.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                              {bestSell.toLocaleString()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="p-4 bg-slate-50 text-xs text-slate-500 flex items-center gap-4">
              <span>★ = Best rate</span>
              <span>•</span>
              <span>Best Buy = Highest price bank pays for your currency</span>
              <span>•</span>
              <span>Best Sell = Lowest price to buy currency from bank</span>
            </div>
          </CardContent>
        </Card>

        {/* USD/KHR Detailed Comparison */}
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>USD/KHR Detailed View</span>
              <Badge variant="secondary">Most Popular</Badge>
            </CardTitle>
            <CardDescription>
              Detailed comparison for Cambodia's primary currency pair
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
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
                  {(() => {
                    const usdRates = getRatesForPair('USD/KHR');
                    const bestBuy = Math.max(...usdRates.map(r => r.buyRate));
                    const bestSell = Math.min(...usdRates.map(r => r.sellRate));
                    
                    return usdRates
                      .sort((a, b) => b.buyRate - a.buyRate)
                      .map((rate) => {
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
                      });
                  })()}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* All Currencies Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4 flex flex-wrap justify-center">
            <TabsTrigger value="all">All Banks</TabsTrigger>
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
                      <CardTitle className="text-lg flex items-center justify-between">
                        {bank.bankName}
                        {!REAL_DATA_BANKS.includes(bank.bankCode) && (
                          <Badge variant="outline" className="text-xs">Demo Data</Badge>
                        )}
                      </CardTitle>
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
                            bankCode: bank.bankCode,
                            buyRate: rate.buyRate,
                            sellRate: rate.sellRate,
                            spread: rate.sellRate - rate.buyRate,
                          };
                        })
                        .filter((r): r is NonNullable<typeof r> => r !== null)
                        .sort((a, b) => b.buyRate - a.buyRate)
                        .map((rate, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {rate.bankName}
                              {!REAL_DATA_BANKS.includes(rate.bankCode) && (
                                <Badge variant="outline" className="ml-2 text-xs">Demo</Badge>
                              )}
                            </TableCell>
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
