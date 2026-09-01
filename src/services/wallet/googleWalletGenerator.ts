import { GoogleWalletJwtPayload } from './types';

export function buildGoogleWalletPayload(params: {
  restaurantName: string;
  customerName: string;
  serialNumber: string;
  passType: 'loyalty_card' | 'prepaid_pass';
  stampsOrUnits: number;
  tier: string;
  barcodePayload: string;
}): GoogleWalletJwtPayload {
  const isPrepaid = params.passType === 'prepaid_pass';
  const objectId = `3388000000022316513.${params.serialNumber}`;
  const classId = `3388000000022316513.cafe_${params.passType}_tier1`;

  return {
    iss: 'cafe-wallet-service@cafe-click-collect.iam.gserviceaccount.com',
    aud: 'google',
    typ: 'savetowallet',
    origins: ['https://rohitbodyzone-pixel.github.io'],
    payload: {
      genericObjects: [
        {
          id: objectId,
          classId: classId,
          logo: {
            sourceUri: {
              uri: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=200&q=80',
            },
          },
          cardTitle: {
            defaultValue: {
              language: 'en',
              value: params.restaurantName,
            },
          },
          header: {
            defaultValue: {
              language: 'en',
              value: isPrepaid ? `${params.stampsOrUnits} Prepaid Coffees` : `${params.stampsOrUnits} Stamps Earned`,
            },
          },
          subheader: {
            defaultValue: {
              language: 'en',
              value: `${params.tier} Member · ${params.customerName || 'Loyal Guest'}`,
            },
          },
          barcode: {
            type: 'QR_CODE',
            value: params.barcodePayload,
          },
          hexBackgroundColor: '#2C1810',
        },
      ],
    },
  };
}
