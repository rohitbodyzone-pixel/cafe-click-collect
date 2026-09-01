import { ApplePassJson } from './types';

export function buildApplePassJson(params: {
  restaurantName: string;
  customerName: string;
  serialNumber: string;
  passType: 'loyalty_card' | 'prepaid_pass';
  stampsOrUnits: number;
  tier: string;
  barcodePayload: string;
}): ApplePassJson {
  const isPrepaid = params.passType === 'prepaid_pass';

  return {
    formatVersion: 1,
    passTypeIdentifier: 'pass.co.nz.cafeclickcollect.loyalty',
    serialNumber: params.serialNumber,
    teamIdentifier: 'NZ99TEAMID',
    organizationName: params.restaurantName,
    description: isPrepaid ? `${params.restaurantName} Prepaid Pass` : `${params.restaurantName} Loyalty Card`,
    foregroundColor: 'rgb(255, 255, 255)',
    backgroundColor: 'rgb(44, 24, 16)', // Espresso brown
    labelColor: 'rgb(212, 165, 116)', // Caramel gold
    logoText: params.restaurantName,
    storeCard: {
      headerFields: [
        {
          key: 'tier',
          label: 'MEMBERSHIP',
          value: params.tier.toUpperCase(),
        },
      ],
      primaryFields: [
        {
          key: 'balance',
          label: isPrepaid ? 'PREPAID COFFEES' : 'STAMPS COLLECTED',
          value: `${params.stampsOrUnits} ${isPrepaid ? 'Drinks' : '/ 8 Stamps'}`,
        },
      ],
      secondaryFields: [
        {
          key: 'holder',
          label: 'CARDHOLDER',
          value: params.customerName || 'Loyal Customer',
        },
      ],
      auxiliaryFields: [
        {
          key: 'reward',
          label: 'NEXT PERK',
          value: isPrepaid ? '1-Tap Scan' : 'Free Specialty Coffee',
        },
      ],
      backFields: [
        {
          key: 'terms',
          label: 'TERMS & CONDITIONS',
          value: 'Valid for in-store and Click & Collect orders at participating locations. Non-transferable.',
        },
        {
          key: 'support',
          label: 'SUPPORT & REORDERS',
          value: 'Order ahead anytime at https://rohitbodyzone-pixel.github.io/cafe-click-collect/',
        },
      ],
    },
    barcode: {
      message: params.barcodePayload,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
    },
  };
}
