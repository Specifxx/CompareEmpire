// The grouped site navigation, shared by the phone sheet (MobileNav) and the
// desktop "Menu" mega-dropdown (NavMenu).
export interface NavLink { href: string; icon: string; label: string; }
export interface NavSection { label: string; links: NavLink[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Shop prices",
    links: [
      { href: "/browse", icon: "🃏", label: "Card database" },
      { href: "/sets", icon: "🗂️", label: "Browse by set" },
      { href: "/sealed", icon: "📦", label: "Sealed" },
      { href: "/deals", icon: "🔥", label: "Deals" },
      { href: "/card-value", icon: "💰", label: "Value checker" },
    ],
  },
  {
    label: "Discover",
    links: [
      { href: "/cards", icon: "🧭", label: "By colour, type & rarity" },
      { href: "/characters", icon: "🏴‍☠️", label: "Character price guides" },
      { href: "/restock", icon: "📅", label: "Drops & restocks" },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/tools", icon: "🧰", label: "All tools" },
      { href: "/bulk-pricer", icon: "📋", label: "Bulk pricer" },
      { href: "/tools/best-basket", icon: "🧺", label: "Best basket" },
      { href: "/tools/arbitrage", icon: "💱", label: "Arbitrage" },
      { href: "/tools/net-proceeds", icon: "💵", label: "Net proceeds (sell)" },
      { href: "/proxy", icon: "🖨️", label: "Proxy printer" },
      { href: "/trade", icon: "⚖️", label: "Trade calculator" },
    ],
  },
  {
    label: "My stuff",
    links: [
      { href: "/wishlist", icon: "❤️", label: "Wishlist" },
      { href: "/collection", icon: "📚", label: "Collection" },
    ],
  },
  {
    label: "Learn & help",
    links: [
      { href: "/learn", icon: "🎓", label: "Learn collecting" },
      { href: "/guides", icon: "📖", label: "Buying guides" },
      { href: "/stores", icon: "🏪", label: "Stores we track" },
      { href: "/blog", icon: "✍️", label: "Blog" },
      { href: "/support", icon: "🛟", label: "Support" },
      { href: "/explore-features", icon: "🧭", label: "Explore all features" },
    ],
  },
];
