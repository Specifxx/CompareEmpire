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
      { href: "/sets", icon: "🗂️", label: "Browse by set" },
      { href: "/sealed", icon: "📦", label: "Sealed" },
      { href: "/deals", icon: "🔥", label: "Deals" },
      { href: "/card-value", icon: "💰", label: "Value checker" },
    ],
  },
  {
    label: "Market",
    links: [
      { href: "/trending", icon: "🔮", label: "Trending cards" },
      { href: "/most-valuable", icon: "💎", label: "Most valuable cards" },
      { href: "/tools/arbitrage", icon: "💱", label: "Arbitrage & eBay deals" },
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
    label: "Tools & play",
    links: [
      { href: "/tools", icon: "🧰", label: "All tools" },
      { href: "/tools/net-proceeds", icon: "💵", label: "Net proceeds (sell)" },
      { href: "/tools/grade-ev", icon: "🎯", label: "Should I grade it?" },
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
