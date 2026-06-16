// The grouped site navigation, shared by the phone sheet (MobileNav) and the
// desktop "Menu" mega-dropdown (NavMenu).
export interface NavLink { href: string; icon: string; label: string; }
export interface NavSection { label: string; links: NavLink[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Shop prices",
    links: [
      { href: "/browse", icon: "🃏", label: "Card database" },
      { href: "/sealed", icon: "📦", label: "Sealed" },
      { href: "/deals", icon: "🔥", label: "Deals" },
      { href: "/card-value", icon: "💰", label: "Value checker" },
    ],
  },
  {
    label: "Market",
    links: [
      { href: "/market", icon: "📈", label: "Market Index" },
      { href: "/blog/market-wrap", icon: "📰", label: "Daily Market Wrap" },
      { href: "/restock", icon: "📅", label: "Drops & restocks" },
    ],
  },
  {
    label: "Play & tools",
    links: [
      { href: "/games", icon: "🕹️", label: "Minigames" },
      { href: "/trade", icon: "⚖️", label: "Trade calculator" },
      { href: "/wishlist", icon: "❤️", label: "Wishlist" },
      { href: "/collection", icon: "📚", label: "Collection" },
      { href: "/forum", icon: "💬", label: "Community" },
    ],
  },
  {
    label: "Learn & help",
    links: [
      { href: "/guides", icon: "📖", label: "Buying guides" },
      { href: "/blog", icon: "✍️", label: "Blog" },
      { href: "/contact", icon: "✉️", label: "Contact" },
    ],
  },
];
