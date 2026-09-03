export type ForPage = {
  slug: string;
  title: string;
  heading: string;
  /* One line for the nav dropdown: who this page is for. */
  tagline: string;
  intro: string;
  image: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
  groups: string[];
  /* Label for the browse button, e.g. "Browse handmade goods". */
  browseLabel: string;
  points: { t: string; d: string }[];
};

/* These pages are short on purpose. Each one shows a seller what Groveline
   looks like for their kind of goods, then sends them to /sell for pricing,
   payments, and the full walkthrough. */
export const FOR_PAGES: ForPage[] = [
  {
    slug: "kitchen",
    title: "For bakers, gardeners, and home food sellers",
    heading: "From the kitchen and the garden",
    tagline: "Bakers, gardeners, and egg sellers",
    intro:
      "Sourdough on Saturdays, eggs when the hens are laying, tomatoes through the summer. Post the batch once and let buyers reserve their share before it's gone.",
    image: "/illustrations/goods.jpg",
    imageAlt: "Bread, tomatoes, eggs, and a jar of preserves",
    imageWidth: 1254,
    imageHeight: 1254,
    groups: ["baked", "produce", "eggs-dairy", "pantry", "meat"],
    browseLabel: "Browse food and produce",
    points: [
      { t: "Post from the kitchen", d: "Take a photo when the batch is ready and post it. Twelve loaves at nine dollars, pickup Saturday at the market, done in about a minute." },
      { t: "The count keeps itself", d: "Once the twelfth loaf is claimed, the listing switches to a waitlist, so nobody has to ask what's left." },
      { t: "Cottage food rules are yours to confirm", d: "Every state sets its own rules for selling food from home. Groveline is a marketplace, not a license, so check your state's requirements before you post." },
    ],
  },
  {
    slug: "craft",
    title: "For shirt makers, tumbler crafters, jewelers, and every craft fair table",
    heading: "From the craft table",
    tagline: "Shirts, tumblers, jewelry, crochet",
    intro:
      "A dozen shirts pressed for the fall festival, a run of tumblers, a tray of earrings, a shelf of crochet. Post the batch once, share the link, and let buyers claim what they want before the fair even opens.",
    image: "/illustrations/shirts.jpg",
    imageAlt: "A woman lifting a freshly pressed t-shirt from a heat press, folded shirts stacked beside her",
    imageWidth: 1448,
    imageHeight: 1086,
    groups: ["handmade"],
    browseLabel: "Browse handmade goods",
    points: [
      { t: "Made for limited runs", d: "Post exactly what you made, whether that's eight shirts or twenty tumblers. When they're all claimed, the listing switches to a waitlist, so you know what to make next." },
      { t: "Photos that do the selling", d: "Up to ten per drop. Show the colors, the finish, and the details that make it yours." },
      { t: "Ship it or hand it over", d: "Turn on shipping and buyers pay by card at checkout, with a flat rate you set. Or meet at the market, the fair, or wherever you already sell." },
    ],
  },
  {
    slug: "workshop",
    title: "For makers selling soap, woodwork, and handmade goods",
    heading: "From the workshop",
    tagline: "Soap, candles, woodwork, crafts",
    intro:
      "Whether you make twenty bars of soap, six cutting boards, or a season's run of candles, a batch is exactly what a Groveline drop is built for.",
    image: "/illustrations/workshop.jpg",
    imageAlt: "A woodworker sanding a cutting board, finished boards stacked beside him",
    imageWidth: 1254,
    imageHeight: 1254,
    groups: ["handmade"],
    browseLabel: "Browse handmade goods",
    points: [
      { t: "Up to ten photos per drop", d: "Handmade sells on detail. Show the grain, the packaging, and the color options, uploaded from a desktop or a phone." },
      { t: "Shipping, if you want it", d: "Turn on card payments to offer shipping at a flat rate. Buyers pay at checkout, and the charge goes through once you mark the order shipped." },
      { t: "Your own page and link", d: "groveline.io/s/your-shop-name. Add it to a business card, an Etsy bio, or a booth sign." },
    ],
  },
  {
    slug: "greenhouse",
    title: "For plant sellers, growers, and florists",
    heading: "From the greenhouse",
    tagline: "Seedlings, cut flowers, wreaths",
    intro:
      "Seedlings in spring, cut flowers through summer, wreaths and trees once it turns cold. Plant sellers have a season for everything, and every season fits a drop.",
    image: "/illustrations/plants.jpg",
    imageAlt: "A plant stand with seedlings, houseplants, and cut flowers",
    imageWidth: 1254,
    imageHeight: 1254,
    groups: ["plants", "seasonal"],
    browseLabel: "Browse plants and flowers",
    points: [
      { t: "Sell by the flat, not the plant", d: "Post 40 tomato starts at $3 each and let buyers claim what they need. You'll know before market day whether to load the truck or the trunk." },
      { t: "Pre-orders for peak days", d: "Take reservations two weeks ahead of Mother's Day, Christmas trees, or Easter lilies, and cut exactly what already sold." },
      { t: "Waitlists for what sells out", d: "When the peonies sell out, the waitlist keeps a record of who wanted them, so you know how much to plant next season." },
    ],
  },
  {
    slug: "fundraisers",
    title: "For fire departments, churches, schools, and community groups",
    heading: "Community fundraisers",
    tagline: "Plate sales, fish fries, bake sales",
    intro:
      "Plate sales, fish fries, and bake sales all come down to the same question: how many to cook. Take reservations ahead of time and cook for what actually sold.",
    image: "/illustrations/plates.jpg",
    imageAlt: "A volunteer handing a plate of food across a table",
    imageWidth: 1254,
    imageHeight: 1254,
    groups: ["prepared"],
    browseLabel: "Browse plate sales",
    points: [
      { t: "Know your count before you cook", d: "Post 150 plates at $12 and watch reservations come in over the week. Buy for what's sold, not what you're hoping for." },
      { t: "No account required to reserve", d: "Buyers enter a name and phone number to reserve, about fifteen seconds on any phone." },
      { t: "Pickup day runs off a checklist", d: "Use the printed sheet or a phone to check names off as plates go out. Cash and card payments both show up on the same list." },
    ],
  },
];

export function forPage(slug: string) {
  return FOR_PAGES.find((p) => p.slug === slug);
}
