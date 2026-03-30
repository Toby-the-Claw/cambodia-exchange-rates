const { fetchACLEDARates, fetchCanadiaRates, fetchWingRates, fetchABARates, fetchNBCRate } = require('./lib/scrapers');

async function testScrapers() {
  console.log('Testing Cambodia Exchange Rate Scrapers...\n');
  
  const banks = [
    { name: 'NBC', fn: fetchNBCRate },
    { name: 'ABA Bank', fn: fetchABARates },
    { name: 'ACLEDA Bank', fn: fetchACLEDARates },
    { name: 'Wing Bank', fn: fetchWingRates },
    { name: 'Canadia Bank', fn: fetchCanadiaRates },
  ];
  
  for (const bank of banks) {
    console.log(`\n--- ${bank.name} ---`);
    try {
      const result = await bank.fn();
      console.log(`Status: ${result.rates.length > 0 ? '✅ SUCCESS' : '⚠️ NO DATA'}`);
      console.log(`Rates found: ${result.rates.length}`);
      
      // Show USD/KHR if available
      const usdRate = result.rates.find(r => r.currency === 'USD' && r.unit === 'KHR');
      if (usdRate) {
        console.log(`USD/KHR: Buy ${usdRate.buyRate.toLocaleString()} / Sell ${usdRate.sellRate.toLocaleString()}`);
      }
      
      // Show first 3 rates
      if (result.rates.length > 0) {
        console.log('Sample rates:');
        result.rates.slice(0, 3).forEach(r => {
          console.log(`  ${r.currency}/${r.unit}: ${r.buyRate.toLocaleString()} / ${r.sellRate.toLocaleString()}`);
        });
      }
    } catch (error) {
      console.log(`Status: ❌ ERROR - ${error.message}`);
    }
  }
}

testScrapers();
