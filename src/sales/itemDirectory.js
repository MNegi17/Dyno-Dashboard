import itemDirectoryJson from '../data/item_directory.json' with { type: 'json' };

let isLoaded = false;
let itemDirectory = { by_sku: {}, by_color: {} };

/**
 * Load the Master Item Directory into fast in-memory Hash Maps
 */
export function loadItemDirectory() {
  if (isLoaded) return itemDirectory;

  try {
    itemDirectory = itemDirectoryJson;
    isLoaded = true;
  } catch (err) {
    console.error('Failed to load item_directory.json:', err);
    itemDirectory = { by_sku: {}, by_color: {} };
  }

  return itemDirectory;
}

/**
 * Normalize category naming conventions to exact Dyno standards
 */
export function normalizeCategory(rawCategory, rawSubCategory, code) {
  if (!rawCategory || rawCategory.trim() === '' || rawCategory.trim() === 'Unknown') {
    return 'Unknown';
  }

  let cat = rawCategory.trim().toUpperCase();
  const sub = rawSubCategory ? rawSubCategory.trim().toUpperCase() : '';
  const codeStr = (code || '').toUpperCase();

  // 1. Denim transformation
  if (cat === 'DENIM') {
    if (sub && sub !== 'DENIM') {
      cat = sub;
    } else {
      if (codeStr.includes('DR') || codeStr.includes('DRESS')) cat = 'DRESS';
      else if (codeStr.includes('SK') || codeStr.includes('SKIRT')) cat = 'SKIRT';
      else if (codeStr.includes('DU') || codeStr.includes('DUNGAREE')) cat = 'DUNGAREE';
      else if (codeStr.includes('JK') || codeStr.includes('JACKET')) cat = 'JACKET';
      else if (codeStr.includes('SH') || codeStr.includes('SHIRT')) cat = 'SHIRT';
      else if (codeStr.includes('ST') || codeStr.includes('SHORTS')) cat = 'SHORTS';
      else cat = 'JEANS';
    }
  }

  // 2. Casual Shoes transformation
  if (cat === 'CASUAL SHOES') {
    if (sub && sub !== 'CASUAL SHOES' && sub !== 'CASUAL') {
      cat = sub;
    } else {
      cat = 'CASUAL SHOES';
    }
  }

  // 3. Sandals transformation
  if (cat === 'SANDALS' || cat === 'SANDAL') {
    if (sub && sub !== 'SANDALS' && sub !== 'SANDAL') {
      cat = sub;
    }
    if (cat === 'SANDALS' || cat === 'SANDAL') {
      cat = 'FASHION SANDALS';
    }
  }

  // 4. Do not allow division names as categories
  if (cat === 'APPAREL' || cat === 'FOOTWEAR' || cat === 'ACCESSORIES') {
    return 'Unknown';
  }

  return cat || 'Unknown';
}

/**
 * Intelligent Rule-Based Prefix Deduction
 * Extracts Division & Category directly from Purple United Style Code conventions (isolated before color)
 */
export function deduceCategoryAndDivisionFromCode(code) {
  if (!code) {
    return { categories: 'Unknown', division: 'Unknown', isDeduced: false };
  }

  // Isolate style code prefix before any color name or dash (e.g. "PBDNJA003398-BLACK" -> "PBDNJA003398")
  const rawStyle = code.split('-')[0].trim().toUpperCase();
  const clean = rawStyle.replace(/[^A-Z0-9]/g, '');

  let categories = 'Unknown';
  let division = 'Unknown';

  // 1. Check Accessories (CP = Cap, SO/SX = Socks, MU = Muffler)
  if (clean.includes('CP') || clean.startsWith('PUCP') || clean.startsWith('PBCP') || clean.startsWith('PGCP')) {
    return { categories: 'CAP', division: 'ACCESSORIES', isDeduced: true };
  }
  if (clean.includes('SO') || clean.includes('SX') || clean.startsWith('PUSO') || clean.startsWith('PBSO')) {
    return { categories: 'SOCKS', division: 'ACCESSORIES', isDeduced: true };
  }
  if (clean.includes('MU') || clean.startsWith('PUMU')) {
    return { categories: 'MUFFLER', division: 'ACCESSORIES', isDeduced: true };
  }

  // 2. Footwear Infixes (Moulds, Casual Shoes, Slides, Sandals, Sneakers, Canvas, Boots, Ballerinas, Flip Flops)
  if (clean.startsWith('T') || clean.startsWith('B') || clean.startsWith('MAPBMO') || clean.startsWith('M')) {
    division = 'FOOTWEAR';
    if (clean.includes('CA') || clean.includes('CASUAL')) categories = 'CASUAL SHOES';
    else if (clean.includes('MO') || clean.includes('MOULD')) categories = 'MOULDS';
    else if (clean.includes('SL') || clean.includes('SLIDE')) categories = 'SLIDES';
    else if (clean.includes('SA') || clean.includes('SANDAL')) categories = 'FASHION SANDALS';
    else if (clean.includes('SN') || clean.includes('SNEAKER')) categories = 'SNEAKERS';
    else if (clean.includes('CN') || clean.includes('CANVAS')) categories = 'CANVAS SHOES';
    else if (clean.includes('BT') || clean.includes('BO') || clean.includes('BOOT')) categories = 'BOOTS';
    else if (clean.includes('BA') || clean.includes('BALL')) categories = 'BALLERINAS';
    else if (clean.includes('FL') || clean.includes('FF') || clean.includes('FLIP')) categories = 'FLIP FLOPS';
    else if (clean.includes('SP') || clean.includes('SPORT')) categories = 'SPORTS SHOES';
    else if (clean.includes('LY') || clean.includes('LYCRA')) categories = 'LYCRA SHOES';
    else if (clean.includes('BK') || clean.includes('BOOTIE')) categories = 'BOOTIES';
    else categories = 'CASUAL SHOES'; // Default footwear
  }

  // 3. Apparel Infixes (Jeans/Denim, Sets, Dungaree, T-Shirts, Shirts, Sweats, Jackets, Tracks, Dresses, etc.)
  if (clean.startsWith('P') || division === 'Unknown') {
    if (clean.startsWith('P')) division = 'APPAREL';

    if (clean.includes('DN') || clean.includes('JEAN')) {
      categories = 'JEANS';
      division = 'APPAREL';
    } else if (clean.includes('CS') || clean.includes('SET')) {
      categories = 'CLOTHING SET';
      division = 'APPAREL';
    } else if (clean.includes('DU')) {
      categories = 'DUNGAREE';
      division = 'APPAREL';
    } else if (clean.includes('PL')) {
      categories = 'POLO T-SHIRT';
      division = 'APPAREL';
    } else if (clean.includes('TS')) {
      categories = 'T-SHIRT';
      division = 'APPAREL';
    } else if (clean.includes('SH')) {
      categories = 'SHIRT';
      division = 'APPAREL';
    } else if (clean.includes('SW')) {
      categories = 'SWEATSHIRT';
      division = 'APPAREL';
    } else if (clean.includes('JK')) {
      categories = 'JACKET';
      division = 'APPAREL';
    } else if (clean.includes('TR')) {
      categories = 'TRACKPANT';
      division = 'APPAREL';
    } else if (clean.includes('DR')) {
      categories = 'DRESS';
      division = 'APPAREL';
    } else if (clean.includes('SK')) {
      categories = 'SKIRT';
      division = 'APPAREL';
    } else if (clean.includes('LE')) {
      categories = 'LEGGINGS';
      division = 'APPAREL';
    } else if (clean.includes('JG')) {
      categories = 'JEGGING';
      division = 'APPAREL';
    } else if (clean.includes('NS')) {
      categories = 'NIGHTSUIT';
      division = 'APPAREL';
    } else if (clean.includes('RM')) {
      categories = 'ROMPER';
      division = 'APPAREL';
    } else if (clean.includes('JM')) {
      categories = 'JUMPSUIT';
      division = 'APPAREL';
    } else if (clean.includes('ST')) {
      categories = 'SHORTS';
      division = 'APPAREL';
    } else if (clean.includes('TP')) {
      categories = 'TOP';
      division = 'APPAREL';
    }
  }

  categories = normalizeCategory(categories, null, rawStyle);

  const isDeduced = division !== 'Unknown' || (categories !== 'Unknown' && categories !== 'APPAREL' && categories !== 'FOOTWEAR');
  return { categories, division, isDeduced };
}

/**
 * Lookup Category, Division, and Size for a SKU / item_color
 */
export function lookupItem(sku, itemColor) {
  if (!isLoaded) {
    loadItemDirectory();
  }

  const sanitize = (val) => {
    if (!val || val.startsWith('=')) return null;
    return val.trim();
  };

  const codeForFallback = itemColor || String(sku || '');

  // 1. Primary lookup: by SKU
  if (sku !== undefined && sku !== null) {
    const cleanSku = String(sku).trim();
    if (cleanSku && itemDirectory.by_sku && itemDirectory.by_sku[cleanSku]) {
      const entry = itemDirectory.by_sku[cleanSku];
      const cleanCat = sanitize(entry.categories);
      const cleanDiv = sanitize(entry.division);
      const entrySize = entry.size;

      if (cleanCat && cleanDiv && cleanCat !== 'Unknown' && cleanDiv !== 'Unknown') {
        const finalCat = normalizeCategory(cleanCat, entry.sub_category, codeForFallback);
        return {
          categories: finalCat,
          division: cleanDiv,
          size: entrySize,
          enrichmentStatus: 'ENRICHED'
        };
      } else if (entrySize) {
        const deduced = deduceCategoryAndDivisionFromCode(codeForFallback);
        return {
          categories: deduced.categories,
          division: deduced.division,
          size: entrySize,
          enrichmentStatus: deduced.isDeduced ? 'DEDUCED_PREFIX' : 'MISSING_ENRICHMENT'
        };
      }
    }
  }

  // 2. Secondary lookup: by exact item_color
  if (itemColor) {
    const cleanColor = itemColor.trim().toUpperCase();
    if (cleanColor && itemDirectory.by_color && itemDirectory.by_color[cleanColor]) {
      const entry = itemDirectory.by_color[cleanColor];
      const cleanCat = sanitize(entry.categories);
      const cleanDiv = sanitize(entry.division);
      const entrySize = entry.size;

      if (cleanCat && cleanDiv && cleanCat !== 'Unknown' && cleanDiv !== 'Unknown') {
        const finalCat = normalizeCategory(cleanCat, entry.sub_category, codeForFallback);
        return {
          categories: finalCat,
          division: cleanDiv,
          size: entrySize,
          enrichmentStatus: 'FALLBACK_COLOR'
        };
      }
    }
  }

  // 3. Fallback: Intelligent Prefix Deduction
  const deduced = deduceCategoryAndDivisionFromCode(codeForFallback);
  return {
    categories: deduced.categories,
    division: deduced.division,
    size: undefined,
    enrichmentStatus: deduced.isDeduced ? 'DEDUCED_PREFIX' : 'MISSING_ENRICHMENT'
  };
}

/**
 * Dynamically add or update an item directory entry
 */
export function updateItemDirectoryEntry({ sku, itemColor, categories, division, size, brand }) {
  if (!isLoaded) loadItemDirectory();

  const entry = {
    categories: categories || 'Unknown',
    sub_category: categories || 'Unknown',
    division: division || 'Unknown',
    item_color: itemColor || '',
    brand: brand || 'PURPLE UNITED KIDS',
    size: size || undefined
  };

  if (sku) {
    itemDirectory.by_sku[String(sku).trim()] = entry;
  }
  if (itemColor) {
    itemDirectory.by_color[itemColor.trim().toUpperCase()] = entry;
  }
}
