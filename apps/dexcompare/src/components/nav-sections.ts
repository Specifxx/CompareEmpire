// The grouped site navigation, shared by the phone sheet (MobileNav) and the
// desktop "Menu" mega-dropdown (NavMenu) so the two menus are always the same
// organisation — edit links here once.
export interface NavLink {
  href: string;
  icon: string;
  label: string;
}

export interface NavSection {
  label: string;
  links: NavLink[];
}

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
      { href: "/market", icon: "📈", label: "DexCompare Index" },
      { href: "/tools/arbitrage", icon: "💱", label: "Arbitrage & eBay deals" },
      { href: "/blog/market-wrap", icon: "📰", label: "Daily Market Wrap" },
      { href: "/restock", icon: "📅", label: "Drops & restocks" },
    ],
  },
  {
    label: "My stuff",
    links: [
      { href: "/wishlist", icon: "❤️", label: "Wishlist" },
      { href: "/collection", icon: "📚", label: "Collection" },
      { href: "/trade", icon: "⚖️", label: "Trade calc" },
      { href: "/forum", icon: "💬", label: "Community" },
      { href: "/games", icon: "🕹️", label: "Minigames" },
    ],
  },
  {
    label: "Play & tools",
    links: [
      { href: "/deck", icon: "🛠️", label: "Deck builder" },
      { href: "/decks", icon: "🏆", label: "Meta decks" },
      { href: "/proxy", icon: "🖨️", label: "Proxy printer" },
    ],
  },
  {
    label: "Learn & help",
    links: [
      { href: "/guides", icon: "📖", label: "Buying guides" },
      { href: "/stores", icon: "🏪", label: "Stores we track" },
      { href: "/blog", icon: "✍️", label: "Blog" },
      { href: "/contact", icon: "✉️", label: "Contact" },
    ],
  },
];
