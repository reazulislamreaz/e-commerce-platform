import {
  BarChart3,
  ImageIcon,
  Layers,
  LayoutDashboard,
  Mail,
  Newspaper,
  Package,
  RotateCcw,
  Shirt,
  Star,
  Tag,
  UserRoundSearch,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Extra terms matched by the quick search. */
  keywords?: string[];
};

export const adminNavGroups: { label: string; items: AdminNavItem[] }[] = [
  {
    label: 'Operations',
    items: [
      {
        href: '/admin',
        label: 'Overview',
        icon: LayoutDashboard,
        exact: true,
        keywords: ['dashboard', 'home'],
      },
      {
        href: '/admin/analytics',
        label: 'Analytics',
        icon: BarChart3,
        keywords: ['reports', 'revenue', 'exports', 'sales'],
      },
      {
        href: '/admin/orders',
        label: 'Orders',
        icon: Package,
        keywords: ['fulfillment', 'shipping'],
      },
      {
        href: '/admin/returns',
        label: 'Returns',
        icon: RotateCcw,
        keywords: ['exchange', 'refund'],
      },
      { href: '/admin/reviews', label: 'Reviews', icon: Star, keywords: ['moderation', 'ratings'] },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/products', label: 'Products', icon: Shirt, keywords: ['catalog', 'drafts'] },
      {
        href: '/admin/catalog',
        label: 'Taxonomy',
        icon: Layers,
        keywords: ['brands', 'categories', 'collections'],
      },
      {
        href: '/admin/inventory',
        label: 'Inventory',
        icon: Warehouse,
        keywords: ['stock', 'balances', 'adjustments', 'alerts'],
      },
      {
        href: '/admin/coupons',
        label: 'Coupons',
        icon: Tag,
        keywords: ['promotions', 'discounts'],
      },
      {
        href: '/admin/banners',
        label: 'Banners',
        icon: ImageIcon,
        keywords: ['marketing', 'hero', 'promo', 'cms'],
      },
    ],
  },
  {
    label: 'Customers',
    items: [
      {
        href: '/admin/customers',
        label: 'CRM',
        icon: UserRoundSearch,
        keywords: ['segments', 'ltv', 'lifecycle'],
      },
      {
        href: '/admin/users',
        label: 'Users',
        icon: Users,
        keywords: ['customers', 'accounts', 'admins'],
      },
      {
        href: '/admin/contact',
        label: 'Contact',
        icon: Mail,
        keywords: ['messages', 'inbox', 'support'],
      },
      {
        href: '/admin/newsletter',
        label: 'Newsletter',
        icon: Newspaper,
        keywords: ['subscribers', 'email'],
      },
    ],
  },
];

export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap((group) => group.items);
