import { FoodPairingRecommendation, FranchisePlaybookTopic } from './types';

export class ConciergeEngine {
  /**
   * Generates artisanal, sensory menu item descriptions
   */
  static generateItemDescription(itemName: string, category: string): string {
    const descriptions: Record<string, string> = {
      'Flat White':
        'Expertly extracted double ristretto blend married with velvety, micro-textured steamed milk at 65°C. Notes of roasted hazelnut and dark cacao with a silky, balanced mouthfeel.',
      'Iced Long Black':
        'Chilled single-origin espresso extracted over crystal-clear ice and filtered cold water. Clean citrus acidity with a refreshing caramel finish.',
      'Warm Blueberry Muffin':
        'Freshly baked daily in our kitchen using plump organic blueberries and golden butter crumble. Served warm with whipped New Zealand butter.',
      'Italian Pasta':
        'Handmade egg pasta tossed in slow-simmered San Marzano tomato sugo, finished with creamy buffalo mozzarella and fresh sweet basil.',
    };

    return (
      descriptions[itemName] ||
      `Artisanal ${itemName} crafted freshly in-house with premium local ingredients, balanced textures, and seasonal culinary care.`
    );
  }

  /**
   * Generates brand-voice social media posts with hashtags
   */
  static generateSocialPost(theme: 'morning_coffee' | 'weekend_brunch' | 'bakery_fresh' | 'rainy_day'): {
    title: string;
    caption: string;
    hashtags: string[];
    callToAction: string;
  } {
    switch (theme) {
      case 'morning_coffee':
        return {
          title: 'Morning Routine & Peak Espresso',
          caption:
            'Start your morning with silky micro-foam and rich double shots. ☕ Order ahead on Click & Collect to skip the queue and grab your cup piping hot!',
          hashtags: ['#AucklandCafe', '#FlatWhiteLove', '#ClickAndCollect', '#SpecialtyCoffee', '#MorningRitual'],
          callToAction: 'Tap link in bio to order ahead in 10 seconds',
        };
      case 'weekend_brunch':
        return {
          title: 'Weekend Table & Brunch Energy',
          caption:
            'Slow down your weekend with fresh pastries, artisan coffee, and good vibes. Scan the QR code at your table for effortless ordering right to your seat! ✨🥐',
          hashtags: ['#WeekendVibes', '#BrunchAuckland', '#QROrdering', '#CafeLife'],
          callToAction: 'Dine in with us this Saturday & Sunday',
        };
      case 'bakery_fresh':
        return {
          title: 'Freshly Baked Daily Batch',
          caption:
            'Fresh out of the oven! 🫐 Warm Blueberry Muffins & flaky croissants are in the cabinet right now. Pair with your favorite brew for the ultimate morning lift.',
          hashtags: ['#FreshBakery', '#MuffinTime', '#AucklandEats', '#CafePastry'],
          callToAction: 'Available until sold out today',
        };
      case 'rainy_day':
        return {
          title: 'Cozy Rainy Day Comfort',
          caption:
            'Rainy day outside? 🌧️ Cozy up with an extra-hot Flat White and toasted sourdough. Order from your car with Curbside Pickup and we will bring it out to you!',
          hashtags: ['#CozyCafe', '#RainyDayCoffee', '#CurbsidePickup', '#ComfortFood'],
          callToAction: 'Order curbside pickup in our mobile web app',
        };
    }
  }

  /**
   * Generates personalized, professional review responses
   */
  static generateReviewResponse(rating: number, customerName: string, reviewText?: string): string {
    if (rating >= 4) {
      return `Hi ${customerName}, thank you so much for the glowing ${rating}-star feedback! Our team takes immense pride in dialing in every cup and baking fresh daily. We can’t wait to see you again soon! — Marcus & the Cafe Team`;
    }
    return `Hi ${customerName}, thank you for taking the time to share your feedback. We are truly sorry your experience didn’t meet our usual golden standard. We take every order seriously—please accept our sincere apologies and reach out directly at manager@commonground.co.nz so we can make it right on your next visit. — Management`;
  }

  /**
   * AI Barista & Sommelier Food-Pairing Engine
   */
  static getFoodPairings(): FoodPairingRecommendation[] {
    return [
      {
        baseItem: 'Flat White (Large)',
        pairedItem: 'Warm Blueberry Muffin',
        pairingReason: 'The creamy micro-foam cuts through the sweet berry acidity, elevating the butter crumble note.',
        estimatedAovBoostDollars: 4.5,
      },
      {
        baseItem: 'Iced Long Black',
        pairedItem: 'Almond Croissant',
        pairingReason: 'Citrus espresso notes pair harmoniously with the rich nutty frangipane sweetness.',
        estimatedAovBoostDollars: 5.2,
      },
      {
        baseItem: 'Handmade Pasta',
        pairedItem: 'Italian Tiramisu Portion',
        pairingReason: 'Authentic mascarpone and espresso soaked savoiardi provides the classic Italian dining finish.',
        estimatedAovBoostDollars: 8.5,
      },
    ];
  }

  /**
   * Parses simulated incoming voice phone orders into structured item tickets
   */
  static parseVoicePhoneTranscript(transcript: string): {
    customerName: string;
    items: Array<{ name: string; quantity: number; notes?: string }>;
    pickupTime: string;
  } {
    return {
      customerName: 'Marcus Phone Caller',
      items: [
        { name: 'Flat White (Large)', quantity: 2, notes: 'Oat milk, extra hot' },
        { name: 'Warm Blueberry Muffin', quantity: 1, notes: 'Toasted w/ butter' },
      ],
      pickupTime: '15 mins',
    };
  }

  /**
   * Franchise Playbook Standards
   */
  static getFranchiseStandards(): FranchisePlaybookTopic[] {
    return [
      {
        title: 'Espresso Golden Ratio Calibration',
        category: 'barista_standard',
        standards: [
          '20.0g dry espresso dose weighed within ±0.2g tolerance.',
          '40.0g liquid extraction yield in 27–30 seconds.',
          'Milk steamed to exactly 62–65°C for Whole Milk, 60°C for Oat Milk.',
          'Microfoam depth: 5mm silky texture with zero visible dry bubbles.',
        ],
      },
      {
        title: 'KDS Throughput & SLA Benchmarks',
        category: 'kds_throughput',
        standards: [
          'Average ticket acceptance within 30 seconds of chime.',
          'Click & Collect ready for pickup within target window (±2 mins).',
          'Table service calls acknowledged within 60 seconds.',
        ],
      },
      {
        title: 'Daily Hygiene & Machine Care',
        category: 'hygiene_audit',
        standards: [
          'Backflush all groupheads with Cafiza detergent at 16:00 close.',
          'Steam wands soaked and purged after every shift.',
          'Fridge temperature logged below 4.0°C twice daily.',
        ],
      },
    ];
  }
}
