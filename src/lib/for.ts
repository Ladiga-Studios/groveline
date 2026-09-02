export type ForPage = {
  slug: string;
  title: string;
  heading: string;
  /* One line for the nav dropdown: who this page is for. */
  tagline: string;
  intro: string;
  image: string;
  imageAlt: string;
  groups: string[];
  points: { t: string; d: string }[];
  ctaSell: string;
};

export const FOR_PAGES: ForPage[] = [
  {
    slug: "kitchen",
    title: "For bakers, gardeners, and home food sellers",
    heading: "From the kitchen and the garden",
    tagline: "Bakers, gardeners, and egg sellers",
    intro:
      "Sourdough on Saturdays, eggs when the hens are laying, tomatoes through the summer. This is the kind of selling Groveline was built around first.",
    image: "/illustrations/goods.jpg",
    imageAlt: "Bread, tomatoes, eggs, and a jar of preserves",
    groups: ["baked", "produce", "eggs-dairy", "pantry", "meat"],
    points: [
      { t: "Post from the kitchen", d: "Take a photo when the batch is ready and post it. Twelve loaves at nine dollars, pickup Saturday at the market, done in about a minute." },
      { t: "No more \u2018is this still available\u2019", d: "The count updates automatically. Once the twelfth loaf is claimed, the listing switches to a waitlist." },
      { t: "Your regulars find out automatically", d: "Every new drop emails everyone who follows your shop, so you never have to remind them yourself." },
      { t: "Cottage food rules are yours to confirm", d: "Every state sets its own rules for selling food from home, and they vary widely. Groveline is a marketplace, not a license, so confirm your state's requirements before you post." },
    ],
    ctaSell: "Post your first batch",
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
    groups: ["handmade"],
    points: [
      { t: "Up to ten photos per drop", d: "Handmade sells on detail. Show the grain, the packaging, and the color options, uploaded from a desktop or a phone." },
      { t: "Shipping, if you want it", d: "Turn on card payments to offer shipping at a flat rate. Buyers pay at checkout, and the charge goes through once you mark the order shipped." },
      { t: "Your own page and link", d: "groveline.io/s/your-shop-name. Add it to a business card, an Etsy bio, or a booth sign." },
      { t: "Pickup or shipping, your choice", d: "Meet buyers at a market, at your door, or ship anywhere in the country. Every drop sets its own option." },
    ],
    ctaSell: "Set up your shop",
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
    groups: ["plants", "seasonal"],
    points: [
      { t: "Sell by the flat, not the plant", d: "Post 40 tomato starts at $3 each and let buyers claim what they need. You'll know before market day whether to load the truck or the trunk." },
      { t: "Pre-orders for peak days", d: "Take reservations two weeks ahead of Mother's Day, Christmas trees, or Easter lilies, and cut exactly what already sold." },
      { t: "A map to your location", d: "Add your address and buyers get a map with directions built in, or leave it off and simply name the pickup spot." },
      { t: "Waitlists for what sells out", d: "When the peonies sell out, the waitlist keeps a record of who wanted them, so you know how much to plant next season." },
    ],
    ctaSell: "Post what's ready to sell",
  },
  {
    slug: "fundraisers",
    title: "For fire departments, churches, and community groups",
    heading: "From the fire hall",
    tagline: "Plate sales, fish fries, bake sales",
    intro:
      "Plate sales, fish fries, and bake sales all come down to the same challenge: knowing how many to cook.",
    image: "/illustrations/plates.jpg",
    imageAlt: "A volunteer handing a plate of food across a table",
    groups: ["prepared"],
    points: [
      { t: "Know your count before you cook", d: "Post 150 plates at $12 and watch reservations come in over the week. Buy for what's actually sold, not what you're hoping for." },
      { t: "No account required to reserve", d: "Buyers enter a name and phone number to reserve, about fifteen seconds on any phone." },
      { t: "Pickup day runs off a checklist", d: "Use the printed sheet or a phone to check names off as plates go out. Cash and card payments both show up on the same list." },
      { t: "One page per organization", d: "Your group gets a single shop page and follower list. Post the spring fish fry, and everyone who came to the fall barbecue is notified." },
    ],
    ctaSell: "Set up your plate sale",
  },
];

export function forPage(slug: string) {
  return FOR_PAGES.find((p) => p.slug === slug);
}
