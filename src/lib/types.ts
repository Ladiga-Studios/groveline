export type Profile = {
  id: string;
  name: string;
  farm_name: string | null;
  town: string;
  slug: string;
  is_seller: boolean;
  bio: string | null;
};

export type Drop = {
  id: string;
  slug: string;
  seller_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  price_cents: number;
  quantity: number;
  claimed: number;
  max_per_buyer: number | null;
  pickup_place: string;
  pickup_start: string;
  pickup_end: string;
  status: "active" | "closed";
  created_at: string;
  profiles?: Profile;
};

export type Claim = {
  id: string;
  drop_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  quantity: number;
  method: "cash" | "card";
  paid: boolean;
  picked_up: boolean;
  created_at: string;
};
