// pricing.mjs — list prices per module, per user per year, in EUR excl. VAT.
// Single source for JSON-LD offers, llms.txt/agents.md and a build check that
// src/pricing.html shows the same amounts. Volume tiers and bundles: on request.
// The ready-made learning platform (instead of the customer's own LMS) is an
// optional add-on at extra cost and is not part of these prices.
export const PRICES = {
  'modules/reanimatie-aed.html': 25,
  'modules/abcde.html': 100,
  'modules/ecg.html': 75,
  'modules/als.html': 50,
};

export const eur = (n) => `€${n}`;

export function offer(amount, url) {
  return {
    '@type': 'Offer',
    category: 'Subscription',
    price: amount.toFixed(2),
    priceCurrency: 'EUR',
    url,
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: amount.toFixed(2),
      priceCurrency: 'EUR',
      valueAddedTaxIncluded: false,
      billingDuration: 'P1Y',
      unitText: 'per user per year',
    },
  };
}
