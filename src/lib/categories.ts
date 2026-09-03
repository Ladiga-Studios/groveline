export type Category = { value: string; label: string };
export type CategoryGroup = { id: string; label: string; items: Category[] };

const g = (id: string, label: string, items: [string, string][]): CategoryGroup => ({
  id,
  label,
  items: items.map(([value, l]) => ({ value, label: l })),
});

export const CATEGORY_GROUPS: CategoryGroup[] = [
  g("baked", "Baked goods", [
    ["bread", "Bread"], ["sourdough", "Sourdough"], ["cakes", "Cakes"], ["cupcakes", "Cupcakes"],
    ["cookies", "Cookies"], ["pies", "Pies"], ["pastries", "Pastries"], ["brownies-bars", "Brownies & bars"],
    ["muffins-scones", "Muffins & scones"], ["biscuits-rolls", "Biscuits & rolls"], ["donuts", "Donuts"],
    ["custom-cakes", "Custom cakes"], ["gluten-free-baked", "Gluten free baked goods"], ["other-baked", "Other baked goods"],
  ]),
  g("produce", "Produce", [
    ["vegetables", "Vegetables"], ["tomatoes", "Tomatoes"], ["greens", "Greens & lettuce"], ["corn", "Sweet corn"],
    ["peppers", "Peppers"], ["squash-gourds", "Squash & gourds"], ["root-vegetables", "Root vegetables"],
    ["fruit", "Fruit"], ["berries", "Berries"], ["melons", "Melons"], ["peaches", "Peaches"], ["apples", "Apples"],
    ["herbs", "Fresh herbs"], ["mushrooms", "Mushrooms"], ["microgreens", "Microgreens"], ["pumpkins", "Pumpkins"],
    ["other-produce", "Other produce"],
  ]),
  g("eggs-dairy", "Eggs & dairy", [
    ["chicken-eggs", "Chicken eggs"], ["duck-eggs", "Duck eggs"], ["quail-eggs", "Quail eggs"], ["milk", "Milk"],
    ["cheese", "Cheese"], ["butter", "Butter"], ["yogurt", "Yogurt"], ["other-dairy", "Other dairy"],
  ]),
  g("meat", "Meat & seafood", [
    ["beef", "Beef"], ["beef-shares", "Beef shares"], ["pork", "Pork"], ["pork-shares", "Pork shares"],
    ["chicken", "Chicken"], ["turkey", "Turkey"], ["lamb-goat", "Lamb & goat"], ["sausage", "Sausage"],
    ["bacon", "Bacon"], ["seafood-fish", "Seafood & fish"], ["venison-processing", "Deer processing"],
    ["other-meat", "Other meat"],
  ]),
  g("pantry", "Pantry & preserves", [
    ["jams-jellies", "Jams & jellies"], ["honey", "Honey"], ["pickles", "Pickles"], ["salsa", "Salsa"],
    ["sauces-bbq", "Sauces & BBQ sauce"], ["hot-sauce", "Hot sauce"], ["syrup", "Syrup"], ["canned-goods", "Canned goods"],
    ["dried-herbs-spices", "Dried herbs & spices"], ["flour-grains", "Flour & grains"], ["nuts", "Nuts & pecans"],
    ["coffee-tea", "Coffee & tea"], ["baking-mixes", "Baking mixes"], ["other-pantry", "Other pantry"],
  ]),
  g("prepared", "Prepared food & plate sales", [
    ["plate-sale", "Plate sale"], ["bbq", "BBQ"], ["fish-fry", "Fish fry"], ["boston-butts", "Boston butts"],
    ["tamales", "Tamales"], ["casseroles", "Casseroles"], ["soups", "Soups & stews"], ["meal-prep", "Meal prep"],
    ["catering", "Catering"], ["snacks", "Snacks"], ["fudge-candy", "Fudge & candy"], ["other-prepared", "Other prepared food"],
  ]),
  g("plants", "Plants & flowers", [
    ["seedlings", "Seedlings"], ["vegetable-starts", "Vegetable starts"], ["houseplants", "Houseplants"],
    ["succulents", "Succulents"], ["cut-flowers", "Cut flowers"], ["bouquets", "Bouquets"], ["wreaths", "Wreaths"],
    ["shrubs-trees", "Shrubs & trees"], ["perennials", "Perennials"], ["seeds", "Seeds"], ["bulbs", "Bulbs"],
    ["hanging-baskets", "Hanging baskets"], ["other-plants", "Other plants"],
  ]),
  g("handmade", "Handmade goods", [
    ["soap", "Soap"], ["candles", "Candles"], ["wax-melts", "Wax melts"], ["lotion-skincare", "Lotion & skincare"],
    ["pottery", "Pottery"], ["woodwork", "Woodwork"], ["cutting-boards", "Cutting boards"], ["knit-crochet", "Knit & crochet"],
    ["quilts", "Quilts"], ["sewing", "Sewing"], ["jewelry", "Jewelry"], ["leather", "Leather goods"],
    ["art-prints", "Art & prints"], ["signs-decor", "Signs & decor"], ["tumblers", "Tumblers & cups"],
    ["tshirts-apparel", "T-shirts & apparel"], ["vinyl-sublimation", "Vinyl & sublimation"], ["embroidery", "Embroidery"],
    ["other-handmade", "Other handmade"],
  ]),
  /* No live animals: see PROHIBITED in src/lib/policy.ts. Poultry and
     livestock sales carry their own state and federal rules, and the
     reservation flow isn't built for them. Everything else a farm sells
     stays. */
  g("farm", "Farm & supplies", [
    ["hay-straw", "Hay & straw"], ["feed", "Feed"], ["compost-manure", "Compost & manure"],
    ["firewood", "Firewood"], ["farm-equipment", "Farm equipment"], ["hatching-eggs", "Hatching eggs"],
    ["other-farm", "Other farm"],
  ]),
  g("seasonal", "Seasonal & holiday", [
    ["christmas-trees", "Christmas trees"], ["holiday-baskets", "Holiday baskets"], ["fall-decor", "Fall decor"],
    ["easter", "Easter"], ["valentines", "Valentine's"], ["mothers-day", "Mother's Day"], ["gift-boxes", "Gift boxes"],
    ["other-seasonal", "Other seasonal"],
  ]),
  g("beverages", "Beverages", [
    ["lemonade", "Lemonade"], ["cider", "Cider"], ["kombucha", "Kombucha"], ["cold-brew", "Cold brew"],
    ["other-beverages", "Other beverages"],
  ]),
  g("pet", "Pet goods", [
    ["dog-treats", "Dog treats"], ["pet-accessories", "Pet accessories"], ["other-pet", "Other pet"],
  ]),
  g("other", "Everything else", [["other", "Other"]]),
];

export const ALL_CATEGORIES: Category[] = CATEGORY_GROUPS.flatMap((grp) => grp.items);
const LABELS = new Map(ALL_CATEGORIES.map((c) => [c.value, c.label]));
export const CATEGORY_VALUES = new Set(ALL_CATEGORIES.map((c) => c.value));

export function categoryLabel(value: string) {
  return LABELS.get(value) ?? "Other";
}

export function isValidCategory(value: string) {
  return CATEGORY_VALUES.has(value);
}

/* Headline groups, used for the homepage chips. Link to browse by group. */
export const CATEGORIES = CATEGORY_GROUPS.filter((grp) => grp.id !== "other").map((grp) => ({
  value: grp.id,
  label: grp.label,
}));

export function groupOf(value: string) {
  return CATEGORY_GROUPS.find((grp) => grp.items.some((i) => i.value === value));
}

/* Plain words sellers actually type, mapped to category values. Used by the
   picker to search and to suggest a category from the drop title. Keep these
   lowercase and singular where it matters; matching strips a trailing "s". */
const KEYWORDS: Record<string, string[]> = {
  bread: ["loaf", "loaves", "rolls", "baguette", "focaccia"],
  sourdough: ["loaf", "loaves", "boule", "starter"],
  cakes: ["cake", "layer cake", "sheet cake"],
  cupcakes: ["cupcake"],
  cookies: ["cookie"],
  pies: ["pie"],
  pastries: ["pastry", "croissant", "danish"],
  "brownies-bars": ["brownie", "bar", "blondie"],
  "muffins-scones": ["muffin", "scone"],
  "biscuits-rolls": ["biscuit", "roll", "yeast roll"],
  donuts: ["donut", "doughnut"],
  "custom-cakes": ["birthday cake", "wedding cake"],
  "chicken-eggs": ["egg", "dozen", "farm egg"],
  "duck-eggs": ["duck"],
  "jams-jellies": ["jam", "jelly", "preserve"],
  honey: ["raw honey", "honeycomb", "bee"],
  pickles: ["pickle", "pickled"],
  "hot-sauce": ["pepper sauce"],
  "sauces-bbq": ["sauce", "bbq sauce", "marinade"],
  "plate-sale": ["plate", "lunch", "dinner", "fundraiser", "benefit"],
  bbq: ["barbecue", "rib", "brisket", "smoked"],
  "boston-butts": ["butt", "pork butt", "shoulder"],
  "fish-fry": ["fish", "catfish"],
  tamales: ["tamale"],
  soups: ["soup", "stew", "chili", "gumbo"],
  "fudge-candy": ["fudge", "candy", "praline", "brittle"],
  seedlings: ["seedling", "start", "plug"],
  "vegetable-starts": ["tomato plant", "pepper plant", "start"],
  "cut-flowers": ["flower", "zinnia", "sunflower", "dahlia"],
  bouquets: ["bouquet", "arrangement"],
  wreaths: ["wreath"],
  houseplants: ["plant", "pothos", "monstera"],
  succulents: ["succulent", "cactus"],
  soap: ["bar soap", "goat milk"],
  candles: ["candle", "soy"],
  "wax-melts": ["melt", "wax"],
  "lotion-skincare": ["lotion", "balm", "scrub", "lip balm", "salve"],
  pottery: ["mug", "ceramic", "bowl", "clay"],
  woodwork: ["wood", "wooden", "turned"],
  "cutting-boards": ["board", "charcuterie"],
  "knit-crochet": ["crochet", "knit", "amigurumi", "plush", "beanie", "blanket", "yarn"],
  quilts: ["quilt"],
  sewing: ["sewn", "bag", "tote", "bow", "scrunchie", "bib"],
  jewelry: ["earring", "necklace", "bracelet", "ring", "bead"],
  leather: ["wallet", "belt", "keychain"],
  "art-prints": ["print", "painting", "art", "sticker", "drawing"],
  "signs-decor": ["sign", "decor", "door hanger", "wall"],
  tumblers: ["tumbler", "cup", "mug", "koozie", "can cooler"],
  "tshirts-apparel": ["shirt", "tee", "t-shirt", "hoodie", "sweatshirt", "apparel", "onesie", "hat", "cap"],
  "vinyl-sublimation": ["vinyl", "sublimation", "decal", "htv"],
  embroidery: ["embroidered", "monogram", "stitched"],
  "gift-boxes": ["gift", "box", "basket"],
  "christmas-trees": ["christmas", "tree", "fraser"],
  "dog-treats": ["dog", "treat", "pup"],
  firewood: ["wood", "cord"],
  "hay-straw": ["hay", "straw", "bale"],
  "venison-processing": ["deer", "venison"],
  "beef-shares": ["quarter", "half", "share", "freezer beef"],
  "pork-shares": ["half hog", "whole hog", "share"],
  "coffee-tea": ["coffee", "tea", "roast"],
  "cold-brew": ["coffee"],
  tomatoes: ["tomato", "heirloom"],
  corn: ["sweet corn", "ear"],
  peaches: ["peach"],
  berries: ["strawberry", "blueberry", "blackberry"],
  pumpkins: ["pumpkin"],
  microgreens: ["microgreen", "sprout"],
};

export type CategoryHit = Category & { group: CategoryGroup };

const HITS: CategoryHit[] = CATEGORY_GROUPS.flatMap((group) => group.items.map((c) => ({ ...c, group })));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
const singular = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

/* Search categories by what the seller typed. Ranks label matches above
   keyword matches above group matches. Empty query returns everything. */
export function searchCategories(query: string): CategoryHit[] {
  const q = norm(query);
  if (!q) return HITS;
  const qs = singular(q);
  const scored = HITS.map((h, i) => {
    const label = norm(h.label);
    const words = label.split(" ");
    let score = 0;
    if (label.startsWith(q)) score = 5;
    else if (words.some((w) => w.startsWith(q) || singular(w) === qs)) score = 4;
    else if (label.includes(q)) score = 3;
    else if ((KEYWORDS[h.value] ?? []).some((k) => k.startsWith(q) || singular(k) === qs || k.includes(q))) score = 2;
    else if (norm(h.group.label).includes(q)) score = 1;
    return { h, i, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.h);
}

/* Guess categories from a drop title like "Fall leaf tumblers, 20oz".
   Returns up to `max` hits, best first. Only whole-word matches count, so a
   title has to actually contain the thing. */
/* Words that show up in titles but say nothing about the category. */
const STOP = new Set(["custom", "fresh", "farm", "homemade", "handmade", "local", "small", "large", "batch", "saturday", "sunday", "weekend", "the", "and", "for", "with", "from", "your", "our", "new", "big", "little", "mini", "set", "pack", "order", "orders", "sale", "special", "limited", "made", "make", "free", "premium", "best"]);

export function suggestCategories(text: string, max = 3): CategoryHit[] {
  const tokens = norm(text).split(" ").filter((t) => t.length >= 3).map(singular).filter((t) => !STOP.has(t));
  if (!tokens.length) return [];
  const scored = HITS.map((h, i) => {
    const labelWords = norm(h.label).split(" ").map(singular);
    const keys = (KEYWORDS[h.value] ?? []).map((k) => singular(norm(k)));
    let score = 0;
    for (const t of tokens) {
      if (labelWords.includes(t)) score += 3;
      else if (keys.includes(t)) score += 2;
      else if (keys.some((k) => k.includes(" ") && norm(text).includes(k))) score += 2;
    }
    return { h, i, score };
  });
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score || a.i - b.i).slice(0, max).map((x) => x.h);
}
