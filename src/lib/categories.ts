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
    ["other-handmade", "Other handmade"],
  ]),
  g("farm", "Farm & animals", [
    ["hay-straw", "Hay & straw"], ["feed", "Feed"], ["chicks-poultry", "Chicks & poultry"], ["livestock", "Livestock"],
    ["rabbits", "Rabbits"], ["compost-manure", "Compost & manure"], ["firewood", "Firewood"],
    ["farm-equipment", "Farm equipment"], ["other-farm", "Other farm"],
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
