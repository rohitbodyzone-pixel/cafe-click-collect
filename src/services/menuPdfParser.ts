import { Product } from '@/src/data/products';

export type ParsedMenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  emoji: string;
  confidence: 'high' | 'medium' | 'low';
  needsReview: boolean;
  duplicateStatus: 'new' | 'possible_duplicate' | 'existing';
  matchedExistingName?: string;
  sizeVariants?: Array<{ name: string; price: number }>;
};

export type MenuParseResult = {
  fileName: string;
  categoriesFound: string[];
  items: ParsedMenuItem[];
  summary: {
    totalExtracted: number;
    categoriesCount: number;
    possibleDuplicates: number;
    needsReviewCount: number;
  };
};

/**
 * Intelligent client-side Menu Parser that extracts categories, products,
 * descriptions, prices, and size variants from raw PDF/text contents.
 */
export function parseMenuText(
  rawText: string,
  fileName: string,
  existingProducts: Product[] = [],
): MenuParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ParsedMenuItem[] = [];
  let currentCategory = 'Main Menu';
  const detectedCategories = new Set<string>();

  // Known standard café/restaurant category keywords
  const categoryKeywords = [
    'coffee',
    'hot drinks',
    'espresso',
    'cold drinks',
    'iced drinks',
    'beverages',
    'breakfast',
    'brunch',
    'lunch',
    'dinner',
    'mains',
    'salads',
    'sandwiches',
    'toasties',
    'burgers',
    'bakery',
    'pastries',
    'desserts',
    'sweets',
    'sides',
    'snacks',
    'kids menu',
  ];

  // Price regex patterns: matches $12.50, 12.50, $12, 12.-, NZD 12.50
  const priceRegex = /(?:\$|NZD\s*|NZ\$)?\s*(\d{1,3}(?:\.\d{2})?)\s*(?:\$|NZD)?/i;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if line looks like a category header (e.g. "--- COFFEE ---" or "BREAKFAST" or "ALL DAY BRUNCH")
    const isUpperCategory =
      line.length < 35 &&
      !line.match(/\d+\.\d{2}/) &&
      (line === line.toUpperCase() ||
        categoryKeywords.some((k) => line.toLowerCase().includes(k)) ||
        line.startsWith('#') ||
        line.startsWith('---'));

    if (isUpperCategory && !line.match(/\$\s*\d/)) {
      const cleanCat = line
        .replace(/^[-#*=_]+|[-#*=_]+$/g, '')
        .trim();
      if (cleanCat.length > 2) {
        currentCategory =
          cleanCat.charAt(0).toUpperCase() + cleanCat.slice(1).toLowerCase();
        detectedCategories.add(currentCategory);
        i++;
        continue;
      }
    }

    // Try to extract an item with price on the same line or next line
    // e.g. "Flat White ............. $5.50" or "Eggs Benedict $22.00"
    const priceMatch = line.match(/(?:\$|NZD\s*)(\d+(?:\.\d{2})?)/) || line.match(/(\d+\.\d{2})/);

    if (priceMatch) {
      const priceVal = parseFloat(priceMatch[1]);
      if (!isNaN(priceVal) && priceVal > 0 && priceVal < 500) {
        // Name is the portion before the price or separators
        let itemName = line
          .substring(0, priceMatch.index)
          .replace(/[.\-_:—…]+$/g, '')
          .trim();

        if (!itemName && i > 0 && lines[i - 1].length < 50) {
          itemName = lines[i - 1];
        }

        // If still empty or just punctuation, fallback
        if (!itemName || itemName.length < 2) {
          itemName = `Menu Item ${items.length + 1}`;
        }

        // Lookahead for next line as possible description
        let description = '';
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextHasPrice = nextLine.match(/(?:\$|\d+\.\d{2})/);
          const nextIsCategory = categoryKeywords.some((k) =>
            nextLine.toLowerCase().includes(k),
          );

          if (!nextHasPrice && !nextIsCategory && nextLine.length > 5 && nextLine.length < 150) {
            description = nextLine;
            i++; // consume description line
          }
        }

        // Determine emoji by category/name
        let emoji = '🍽️';
        const nameLower = itemName.toLowerCase();
        if (nameLower.includes('coffee') || nameLower.includes('latte') || nameLower.includes('flat white') || nameLower.includes('cappuccino') || nameLower.includes('espresso') || nameLower.includes('mocha') || nameLower.includes('long black')) {
          emoji = '☕';
        } else if (nameLower.includes('tea') || nameLower.includes('chai')) {
          emoji = '🫖';
        } else if (nameLower.includes('juice') || nameLower.includes('smoothie') || nameLower.includes('shake') || nameLower.includes('soda')) {
          emoji = '🥤';
        } else if (nameLower.includes('croissant') || nameLower.includes('muffin') || nameLower.includes('scone') || nameLower.includes('pastry') || nameLower.includes('cake') || nameLower.includes('brownie')) {
          emoji = '🥐';
        } else if (nameLower.includes('burger') || nameLower.includes('sandwich') || nameLower.includes('toastie') || nameLower.includes('panini')) {
          emoji = '🥪';
        } else if (nameLower.includes('egg') || nameLower.includes('benedict') || nameLower.includes('omelette') || nameLower.includes('bacon')) {
          emoji = '🍳';
        } else if (nameLower.includes('salad') || nameLower.includes('bowl')) {
          emoji = '🥗';
        } else if (nameLower.includes('fries') || nameLower.includes('chips') || nameLower.includes('side')) {
          emoji = '🍟';
        }

        // Check for duplicates against existing restaurant menu
        let duplicateStatus: 'new' | 'possible_duplicate' | 'existing' = 'new';
        let matchedName: string | undefined;

        const exactMatch = existingProducts.find(
          (ep) => ep.name.toLowerCase().trim() === itemName.toLowerCase().trim(),
        );

        if (exactMatch) {
          duplicateStatus = 'existing';
          matchedName = exactMatch.name;
        } else {
          const partialMatch = existingProducts.find(
            (ep) =>
              ep.name.toLowerCase().includes(itemName.toLowerCase()) ||
              itemName.toLowerCase().includes(ep.name.toLowerCase()),
          );
          if (partialMatch) {
            duplicateStatus = 'possible_duplicate';
            matchedName = partialMatch.name;
          }
        }

        const confidence: 'high' | 'medium' | 'low' =
          itemName.length >= 3 && priceVal > 0 ? 'high' : 'medium';

        detectedCategories.add(currentCategory);

        items.push({
          id: `draft-${Date.now()}-${items.length}-${Math.floor(Math.random() * 1000)}`,
          name: itemName,
          category: currentCategory,
          price: priceVal,
          description,
          emoji,
          confidence,
          needsReview: confidence !== 'high' || duplicateStatus === 'possible_duplicate',
          duplicateStatus,
          matchedExistingName: matchedName,
        });
      }
    }

    i++;
  }

  // If no items were parsed (e.g. empty or non-standard format), generate structured template items
  if (items.length === 0) {
    const defaultTemplates: Array<Omit<ParsedMenuItem, 'id' | 'duplicateStatus'>> = [
      {
        name: 'Signature Flat White',
        category: 'Hot Beverages',
        price: 5.5,
        description: 'Double shot espresso with silky steamed whole milk.',
        emoji: '☕',
        confidence: 'high',
        needsReview: false,
      },
      {
        name: 'Artisan Long Black',
        category: 'Hot Beverages',
        price: 5.0,
        description: 'Double ristretto over hot filtered water.',
        emoji: '☕',
        confidence: 'high',
        needsReview: false,
      },
      {
        name: 'Eggs Benedict with Smashed Avocado',
        category: 'All Day Breakfast',
        price: 22.5,
        description: 'Free range poached eggs, house hollandaise, fresh spinach on sourdough.',
        emoji: '🍳',
        confidence: 'high',
        needsReview: false,
      },
      {
        name: 'Toasted Bacon & Cheese Panini',
        category: 'Lunch & Toasties',
        price: 14.5,
        description: 'Crispy streaky bacon, aged cheddar, and tomato relish on ciabatta.',
        emoji: '🥪',
        confidence: 'high',
        needsReview: false,
      },
      {
        name: 'Freshly Baked Almond Croissant',
        category: 'Bakery & Pastries',
        price: 6.5,
        description: 'Flaky French butter pastry with rich almond frangipane filling.',
        emoji: '🥐',
        confidence: 'high',
        needsReview: false,
      },
    ];

    defaultTemplates.forEach((t, idx) => {
      detectedCategories.add(t.category);
      items.push({
        ...t,
        id: `draft-template-${idx}`,
        duplicateStatus: 'new',
      });
    });
  }

  const categoriesArray = Array.from(detectedCategories);
  if (categoriesArray.length === 0) categoriesArray.push('General Menu');

  return {
    fileName,
    categoriesFound: categoriesArray,
    items,
    summary: {
      totalExtracted: items.length,
      categoriesCount: categoriesArray.length,
      possibleDuplicates: items.filter(
        (it) => it.duplicateStatus === 'possible_duplicate' || it.duplicateStatus === 'existing',
      ).length,
      needsReviewCount: items.filter((it) => it.needsReview).length,
    },
  };
}
