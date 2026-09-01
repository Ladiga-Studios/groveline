/*
  One place for the rules, so the terms page, the posting check, and the
  moderation prompt can never drift apart.

  Not legal advice, and not a substitute for a lawyer's review. This file
  encodes decisions, it doesn't make them.
*/

/* Bump this whenever the terms or privacy policy change in a way that
   matters. Every acceptance is stored with the version that was live at
   the time, so you can always show what a given person agreed to.
   Format: YYYY-MM-DD of the change. */
export const TERMS_VERSION = "2026-09-01";

/* Minimum age to hold an account or place a reservation. Contracts with
   minors are generally voidable by the minor, so the whole agreement is
   shaky without this. */
export const MIN_AGE = 18;

export type ProhibitedCategory = {
  /* Short label for the terms page. */
  label: string;
  /* Plain explanation of where the line is. */
  detail: string;
  /* Words that, in a title or description, are worth a second look. Kept
     deliberately narrow: this is a speed bump for the obvious cases, not
     a filter. Anything subtler is the moderation model's job. */
  terms: string[];
};

export const PROHIBITED: ProhibitedCategory[] = [
  {
    label: "Alcohol",
    detail:
      "Beer, wine, liquor, moonshine, and hard cider. Selling alcohol requires a license in every state and can't be arranged through Groveline. Non-alcoholic kombucha, vinegar, and extracts are fine.",
    terms: ["moonshine", "liquor", "whiskey", "bourbon", "vodka", "hard cider", "home brew", "homebrew", "wine by the bottle"],
  },
  {
    label: "Cannabis, THC, and vapes",
    detail:
      "Cannabis, THC or delta products in any form, kratom, nicotine, and vapes, regardless of what's legal where you are.",
    terms: ["thc", "delta-8", "delta 8", "delta-9", "delta 9", "cannabis", "marijuana", "weed gummies", "kratom", "vape", "nicotine"],
  },
  {
    label: "Raw milk and raw dairy",
    detail:
      "Raw milk and raw-milk cheese aged under 60 days, unless you hold the license your state requires for it and can produce it on request. Pasteurized dairy, butter, and aged cheeses are fine.",
    terms: ["raw milk", "unpasteurized"],
  },
  {
    label: "Home-canned low-acid foods",
    detail:
      "Pressure-canned green beans, corn, meats, soups, and other low-acid goods. These carry a botulism risk that cottage food laws almost universally exclude. High-acid canning — jams, jellies, pickles, salsa, fruit butters — is fine.",
    terms: ["canned green beans", "canned corn", "canned meat", "canned soup", "home canned green"],
  },
  {
    label: "Firearms, ammunition, and weapons",
    detail: "Guns, ammunition, gun parts, explosives, and fireworks.",
    terms: ["firearm", "handgun", "shotgun", "rifle", "ammo", "ammunition", "fireworks", "silencer", "suppressor"],
  },
  {
    label: "Drugs and supplements that make health claims",
    detail:
      "Prescription medication, controlled substances, and anything sold as curing, treating, or preventing a disease. Selling honey is fine. Selling honey that cures anything is not.",
    terms: ["prescription", "adderall", "oxycodone", "xanax", "antibiotic", "cures cancer", "cure cancer", "cures diabetes"],
  },
  {
    label: "Live animals",
    detail:
      "Chicks, poultry, livestock, and pets. Live animal sales carry their own state and federal rules, including NPIP requirements for poultry, and Groveline's reservation flow isn't built for them. Eggs, meat, hatching eggs, and animal feed are all fine.",
    terms: ["live chicks", "day old chicks", "started pullets", "puppies", "kittens", "live goat", "live rabbit"],
  },
  {
    label: "Wild game meat",
    detail:
      "Meat from animals you hunted. Selling wild game is illegal in most states even when processing it for others is not. Deer processing as a service is fine; selling the venison is not.",
    terms: ["venison for sale", "wild game meat", "bear meat", "elk meat for sale"],
  },
  {
    label: "Anything counterfeit, stolen, or recalled",
    detail: "Knockoffs, goods that aren't yours to sell, and products under an active recall.",
    terms: ["replica", "knockoff", "counterfeit"],
  },
];

/* A cheap first pass over listing text. Returns the matching category, or
   null. Deliberately conservative: it only catches phrasing that is hard
   to say innocently, and the seller can always word it differently, which
   is fine — the moderation model and human reports are the real net. This
   exists so the most obvious cases never reach a photo upload. */
export function findProhibited(text: string): ProhibitedCategory | null {
  const haystack = ` ${text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ")} `;
  for (const category of PROHIBITED) {
    for (const term of category.terms) {
      if (haystack.includes(` ${term} `)) return category;
    }
  }
  return null;
}

/* The prohibited list, formatted for the moderation model's prompt. */
export function prohibitedForPrompt(): string {
  return PROHIBITED.map((c) => `- ${c.label}: ${c.detail}`).join("\n");
}
