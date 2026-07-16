export const MAIN_NAV = [
  ['HOME', '/'],
  ['SHOP', '/shop'],
  ['MEN', '/category/men'],
  ['WOMEN', '/category/women'],
  ['NEW ARRIVALS', '/new-arrivals'],
  ['SALE', '/sale'],
  ['ABOUT US', '/about'],
  ['CONTACT US', '/contact'],
] as const;

export function isActiveNav(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
