import { seedUuid } from '../utils/ids';
import type { SeedContext } from '../types';
import { seedLog } from '../utils/logger';

/**
 * Active carts and wishlists for demo customers. Idempotent via userId uniques.
 */
export async function seedCartsAndWishlists(ctx: SeedContext): Promise<void> {
  const { prisma, users } = ctx;
  const products = await prisma.product.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    select: {
      id: true,
      slug: true,
      variants: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, size: true, color: true },
        orderBy: { position: 'asc' },
        take: 3,
      },
    },
    orderBy: { featuredPosition: 'asc' },
    take: 8,
  });

  if (products.length === 0) {
    seedLog('No products for carts/wishlists; skipping.');
    return;
  }

  let cartCount = 0;
  let wishlistCount = 0;

  for (const [index, customer] of users.customers.entries()) {
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: customer.id },
      create: { id: seedUuid(`wishlist:${customer.email}`), userId: customer.id },
      update: { deletedAt: null },
    });

    const wishProducts = products.slice(index % 3, (index % 3) + 3);
    for (const product of wishProducts) {
      await prisma.wishlistItem.upsert({
        where: {
          wishlistId_productId: { wishlistId: wishlist.id, productId: product.id },
        },
        create: { wishlistId: wishlist.id, productId: product.id },
        update: {},
      });
    }
    wishlistCount += 1;

    // Leave two customers with empty carts for CRM variety; seed the rest.
    if (index >= users.customers.length - 2) continue;

    const cart = await prisma.cart.upsert({
      where: { userId: customer.id },
      create: {
        id: seedUuid(`cart:${customer.email}`),
        userId: customer.id,
        currencyCode: 'BDT',
      },
      update: {},
    });

    const cartProduct = products[index % products.length]!;
    const variant = cartProduct.variants[0];
    if (!variant) continue;

    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: {
        cartId: cart.id,
        productId: cartProduct.id,
        variantId: variant.id,
        quantity: 1 + (index % 2),
        size: variant.size,
        color: variant.color,
      },
      update: {
        quantity: 1 + (index % 2),
        size: variant.size,
        color: variant.color,
        productId: cartProduct.id,
      },
    });
    cartCount += 1;
  }

  seedLog(`Seeded ${cartCount} carts and ${wishlistCount} wishlists.`);
}
