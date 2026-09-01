export type ForPage = {
  slug: string;
  title: string;
  heading: string;
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
    title: "For bakers, gardeners, and everyone with too many eggs",
    heading: "From the kitchen and the garden",
    intro:
      "Sourdough on Saturdays. Eggs when the hens are laying. Tomatoes in July, whether you want them or not. This is what Groveline was built for first.",
    image: "/illustrations/goods.jpg",
    imageAlt: "Bread, tomatoes, eggs, and a jar of preserves",
    groups: ["baked", "produce", "eggs-dairy", "pantry", "meat"],
    points: [
      { t: "Post from the kitchen", d: "Loaves are cooling, you take a photo, you post. Twelve loaves, nine dollars, Saturday at the market. A minute, done." },
      { t: "No more 'is this still available'", d: "The count updates by itself. When the twelfth loaf is claimed, the button turns into a waitlist." },
      { t: "Your regulars find you", d: "Every drop emails the folks who follow you. Miss a week and they still know where to look." },
      { t: "Cottage food rules are yours to know", d: "Every state has its own rules for selling food from home. We are the list, not the license. Look yours up before you post." },
    ],
    ctaSell: "Post your first batch",
  },
  {
    slug: "workshop",
    title: "For soap makers, woodworkers, and everyone who makes things by hand",
    heading: "From the workshop",
    intro:
      "You make twenty bars at a time, or six cutting boards, or a run of candles for the holidays. Batches. That is exactly what a drop is.",
    image: "/illustrations/handmade.jpg",
    imageAlt: "A woman arranging soap and candles at a market table",
    groups: ["handmade"],
    points: [
      { t: "Ten photos per drop", d: "Handmade sells on the details. Show the grain, the wrapper, the color options. Drag them in from your desktop or tap from your phone." },
      { t: "Shipping, if you want it", d: "Turn on card payments and you can offer shipping with a flat rate. Buyers order, you print a label, the card charges when you mark it shipped." },
      { t: "Your own page and link", d: "groveline.io/s/your-shop-name. Put it on your business card, your Etsy bio, your booth sign." },
      { t: "Pickup or market, either way", d: "Meet at the market, at your porch, or ship it across the state. Every drop picks its own." },
    ],
    ctaSell: "Set up your shop",
  },
  {
    slug: "greenhouse",
    title: "For plant sellers, flower growers, and seedling starters",
    heading: "From the greenhouse",
    intro:
      "Seedlings in April, cut flowers all summer, mums in the fall, wreaths and trees when it turns cold. Plant sellers have a season for everything, and every season is a drop.",
    image: "/illustrations/plants.jpg",
    imageAlt: "A plant stand with seedlings, houseplants, and cut flowers",
    groups: ["plants", "seasonal"],
    points: [
      { t: "Sell the flat, not the plant", d: "Post 40 tomato starts at $3 and let people claim what they need. You know before market day whether to bring the truck or the trunk." },
      { t: "Pre-orders for the big days", d: "Mother's Day bouquets, Christmas trees, Easter lilies. Take reservations two weeks out and cut exactly what sold." },
      { t: "A map to the greenhouse", d: "Put in your address and buyers get a map and a directions button. No more 'turn left at the church' texts." },
      { t: "Waitlists for the good stuff", d: "When the peonies sell out, the waitlist collects names. Next year you know to plant more." },
    ],
    ctaSell: "Post what is growing",
  },
  {
    slug: "fundraisers",
    title: "For fire departments, churches, boosters, and anyone cooking for a cause",
    heading: "From the fire hall",
    intro:
      "Plate sales, Boston butts, fish fries, bake sales. The hardest part was never the cooking. It was knowing how many to cook.",
    image: "/illustrations/plates.jpg",
    imageAlt: "A volunteer handing a plate of food across a table",
    groups: ["prepared"],
    points: [
      { t: "Know the count before you light the grill", d: "Post 150 plates at $12. Watch the reservations come in all week. Buy for what sold, not for what you hoped." },
      { t: "Everybody can reserve, nobody needs an account", d: "Grandma taps the link, puts in her name and number, done. Fifteen seconds on any phone." },
      { t: "Pickup day is a checklist", d: "Print the sheet or use your phone. Tap names as plates go out the window. Cash or card, it is all on the list." },
      { t: "One shop per organization", d: "The department gets its own page and followers. Post the spring fish fry and everyone who came to the fall BBQ gets the email." },
    ],
    ctaSell: "Set up your plate sale",
  },
];

export function forPage(slug: string) {
  return FOR_PAGES.find((p) => p.slug === slug);
}
