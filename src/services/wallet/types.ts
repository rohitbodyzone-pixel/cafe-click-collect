export interface CustomerWalletPass {
  id?: string;
  restaurantId: string;
  customerKey: string;
  passType: 'loyalty_card' | 'prepaid_pass';
  serialNumber: string;
  applePassUrl?: string;
  googleJwtUrl?: string;
  balanceUnits: number;
  points: number;
  tier: string;
  barcodePayload: string;
  updatedAt?: string;
}

export interface ApplePassJson {
  formatVersion: number;
  passTypeIdentifier: string;
  serialNumber: string;
  teamIdentifier: string;
  webServiceURL?: string;
  authenticationToken?: string;
  organizationName: string;
  description: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor: string;
  logoText: string;
  storeCard: {
    headerFields: Array<{ key: string; label: string; value: string }>;
    primaryFields: Array<{ key: string; label: string; value: string | number }>;
    secondaryFields: Array<{ key: string; label: string; value: string }>;
    auxiliaryFields: Array<{ key: string; label: string; value: string }>;
    backFields: Array<{ key: string; label: string; value: string }>;
  };
  barcode: {
    message: string;
    format: 'PKBarcodeFormatQR';
    messageEncoding: 'iso-8859-1';
  };
}

export interface GoogleWalletJwtPayload {
  iss: string;
  aud: string;
  typ: string;
  origins: string[];
  payload: {
    genericObjects: Array<{
      id: string;
      classId: string;
      logo: { sourceUri: { uri: string } };
      cardTitle: { defaultValue: { language: string; value: string } };
      header: { defaultValue: { language: string; value: string } };
      subheader: { defaultValue: { language: string; value: string } };
      barcode: { type: 'QR_CODE'; value: string };
      hexBackgroundColor: string;
    }>;
  };
}
