export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  emoji: string;
  imagePath?: string;
  imageUrl?: string;
  category: 'Coffee' | 'Drinks' | 'Food' | string;
  soldOut: boolean;
  customisationGroupIds: string[];
};

export const money = (value: number) => `$${value.toFixed(2)}`;

export const paymentMethodLabel = (method: string, orderType: 'pickup' | 'table') =>
  method === 'pay_at_counter'
    ? orderType === 'pickup' ? 'PAY AT PICKUP' : 'PAY AT COUNTER'
    : method.replaceAll('_', ' ').toUpperCase();
