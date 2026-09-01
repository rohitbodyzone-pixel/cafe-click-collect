import {
  DemandForecast,
  CustomerCLV,
  MenuItemMatrix,
  RestaurantHealthScore,
  CopilotDailyBriefing,
} from './types';

export class AIAnalyticsEngine {
  /**
   * Generates 24-hour demand prediction and revenue curves based on cafe ordering profiles
   */
  static generateHourlyDemandForecast(): DemandForecast[] {
    const hourlyDistribution: Array<{ hour: string; weight: number; rush: 'normal' | 'moderate' | 'peak' }> = [
      { hour: '07:00', weight: 0.08, rush: 'moderate' },
      { hour: '08:00', weight: 0.22, rush: 'peak' },
      { hour: '09:00', weight: 0.18, rush: 'peak' },
      { hour: '10:00', weight: 0.10, rush: 'moderate' },
      { hour: '11:00', weight: 0.07, rush: 'normal' },
      { hour: '12:00', weight: 0.15, rush: 'peak' },
      { hour: '13:00', weight: 0.11, rush: 'moderate' },
      { hour: '14:00', weight: 0.05, rush: 'normal' },
      { hour: '15:00', weight: 0.04, rush: 'normal' },
    ];

    const baseDailyOrders = 48;
    const avgTicketValue = 6.2;

    return hourlyDistribution.map((slot) => {
      const orders = Math.round(baseDailyOrders * slot.weight);
      const revenue = Math.round(orders * avgTicketValue * 100) / 100;
      const staff = slot.rush === 'peak' ? 3 : slot.rush === 'moderate' ? 2 : 1;
      return {
        hour: slot.hour,
        projectedOrders: orders,
        projectedRevenueDollars: revenue,
        recommendedStaff: staff,
        rushLevel: slot.rush,
      };
    });
  }

  /**
   * Calculates RFM (Recency, Frequency, Monetary) Customer Lifetime Value & VIP Score
   */
  static calculateCustomerCLV(
    recencyDays: number,
    totalOrders: number,
    lifetimeSpendDollars: number,
    customerName?: string,
  ): CustomerCLV {
    // RFM Score (0 - 100)
    const recencyScore = Math.max(0, 100 - recencyDays * 3.5);
    const frequencyScore = Math.min(100, totalOrders * 8);
    const monetaryScore = Math.min(100, (lifetimeSpendDollars / 200) * 100);

    const vipScore = Math.round(recencyScore * 0.3 + frequencyScore * 0.35 + monetaryScore * 0.35);

    // 12-Month Projected Value
    const orderFrequencyPerMonth = totalOrders / Math.max(1, recencyDays / 30);
    const avgSpendPerOrder = totalOrders > 0 ? lifetimeSpendDollars / totalOrders : 5.5;
    const projected12MoValue = Math.round(Math.min(1500, orderFrequencyPerMonth * avgSpendPerOrder * 12));

    let segment: CustomerCLV['segment'] = 'Promising';
    if (vipScore >= 80) segment = 'Top VIP';
    else if (vipScore >= 60) segment = 'Loyal Regular';
    else if (recencyDays >= 21) segment = 'Dormant';
    else if (recencyDays >= 10) segment = 'At-Risk';

    return {
      customerId: 'cust-' + Math.random().toString(36).substring(2, 7),
      customerName: customerName || 'Valued Regular',
      recencyDays,
      frequencyOrders: totalOrders,
      monetarySpendDollars: lifetimeSpendDollars,
      predicted12MoValueDollars: projected12MoValue,
      vipScore,
      segment,
    };
  }

  /**
   * BCG Menu Optimizer Matrix (Stars, Plowhorses, Puzzles, Dogs)
   */
  static generateMenuMatrix(): MenuItemMatrix[] {
    return [
      {
        id: 'm1',
        name: 'Flat White (Large)',
        category: 'Coffee',
        price: 5.5,
        marginPct: 78,
        volume: 'High',
        matrixCategory: 'star',
        recommendation: 'Star Item: High profit, high volume. Keep preparation fast and consistent.',
      },
      {
        id: 'm2',
        name: 'Warm Blueberry Muffin',
        category: 'Bakery',
        price: 4.5,
        marginPct: 74,
        volume: 'Moderate',
        matrixCategory: 'puzzle',
        recommendation: 'Puzzle Item: High profit, medium volume. Recommend pairing in 15% breakfast combo.',
      },
      {
        id: 'm3',
        name: 'Iced Long Black',
        category: 'Coffee',
        price: 5.0,
        marginPct: 62,
        volume: 'High',
        matrixCategory: 'plowhorse',
        recommendation: 'Plowhorse: High volume, moderate margin. Opportunity to introduce single-origin upsell.',
      },
      {
        id: 'm4',
        name: 'Decaf Filter Roast',
        category: 'Coffee',
        price: 4.0,
        marginPct: 45,
        volume: 'Low',
        matrixCategory: 'dog',
        recommendation: 'Slow Mover: Low volume, low margin. Consider batch brewing or rotating bean selection.',
      },
    ];
  }
}
