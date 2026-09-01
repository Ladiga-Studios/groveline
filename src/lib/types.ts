export type Profile = {
  id: string;
  name: string;
  farm_name: string | null;
  town: string;
  state: string;
  slug: string;
  is_seller: boolean;
  is_admin: boolean;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  notify_on_claim: boolean;
  notify_digest: boolean;
  payouts_enabled: boolean;
  contact_phone: string | null;
  social_url: string | null;
  created_at: string;
};

export type Shop = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  town: string;
  state: string;
  contact_phone: string | null;
  social_url: string | null;
  created_at: string;
  owner?: Partial<Profile>;
};

export type Drop = {
  id: string;
  slug: string;
  seller_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  photo_urls: string[];
  price_cents: number;
  quantity: number;
  claimed: number;
  max_per_buyer: number | null;
  category: string;
  pickup_place: string | null;
  fulfillment: "pickup" | "shipping" | "both";
  shipping_cents: number;
  pickup_address: string | null;
  pickup_city: string | null;
  pickup_state: string | null;
  pickup_zip: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_start: string;
  pickup_end: string;
  status: "active" | "closed" | "removed";
  views: number;
  created_at: string;
  shops?: Partial<Shop>;
};

export type Claim = {
  id: string;
  drop_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  buyer_user_id: string | null;
  quantity: number;
  method: "cash" | "card";
  paid: boolean;
  picked_up: boolean;
  payment_intent_id: string | null;
  payment_status: "none" | "pending" | "authorized" | "captured" | "cancelled";
  cancel_token: string;
  cancelled_at: string | null;
  delivery: "pickup" | "shipping";
  ship_address: string | null;
  created_at: string;
  drops?: Partial<Drop>;
};

export type Billing = {
  profile_id: string;
  stripe_customer_id: string | null;
  subscription_status: string;
  stripe_account_id: string | null;
};
