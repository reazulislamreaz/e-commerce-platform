import { Test } from '@nestjs/testing';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { InventoryService } from '@/modules/inventory/inventory.service';

describe('CartService', () => {
  let service: CartService;

  const cartRepository = {
    findByUserId: jest.fn(),
    findByGuestTokenHash: jest.fn(),
    findById: jest.fn(),
    createUserCart: jest.fn(),
    createGuestCart: jest.fn(),
    touchCart: jest.fn(),
    upsertItem: jest.fn(),
    deleteItem: jest.fn(),
    deleteAllItems: jest.fn(),
    deleteCart: jest.fn(),
    findActiveVariant: jest.fn(),
  };

  const inventoryService = {
    getAvailableByVariantIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: CartRepository, useValue: cartRepository },
        { provide: InventoryService, useValue: inventoryService },
      ],
    }).compile();
    service = moduleRef.get(CartService);
  });

  describe('mergeLineQuantities', () => {
    it('sums guest and user quantities', () => {
      expect(service.mergeLineQuantities(2, 3, 10)).toBe(5);
    });

    it('caps merged quantity at available stock', () => {
      expect(service.mergeLineQuantities(4, 5, 6)).toBe(6);
    });

    it('returns zero when stock is zero even if the user already has quantity', () => {
      expect(service.mergeLineQuantities(2, 3, 0)).toBe(0);
    });

    it('returns zero when stock is zero and user has no line', () => {
      expect(service.mergeLineQuantities(0, 3, 0)).toBe(0);
    });
  });

  describe('mergeGuestIntoUser', () => {
    it('merges guest lines into the user cart with summed quantities capped by stock', async () => {
      const guestCart = {
        id: 'guest-cart',
        userId: null,
        guestTokenHash: 'hash',
        currencyCode: 'BDT',
        version: 1,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'line-1',
            cartId: 'guest-cart',
            productId: 'product-1',
            variantId: 'variant-1',
            quantity: 3,
            size: 'M',
            color: 'Black',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const userCart = {
        id: 'user-cart',
        userId: 'user-1',
        guestTokenHash: null,
        currencyCode: 'BDT',
        version: 2,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'line-2',
            cartId: 'user-cart',
            productId: 'product-1',
            variantId: 'variant-1',
            quantity: 2,
            size: 'M',
            color: 'Black',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      cartRepository.findByGuestTokenHash.mockResolvedValue(guestCart);
      cartRepository.findByUserId
        .mockResolvedValueOnce(userCart)
        .mockResolvedValueOnce({
          ...userCart,
          version: 3,
          items: [{ ...userCart.items[0], quantity: 5 }],
        });
      inventoryService.getAvailableByVariantIds.mockResolvedValue(new Map([['variant-1', 5]]));
      cartRepository.upsertItem.mockResolvedValue(undefined);
      cartRepository.deleteCart.mockResolvedValue(undefined);
      cartRepository.touchCart.mockResolvedValue({ version: 3 });
      cartRepository.findActiveVariant.mockResolvedValue({
        id: 'variant-1',
        productId: 'product-1',
        size: 'M',
        color: 'Black',
        product: {
          id: 'product-1',
          name: 'Test Product',
          currentPriceAmount: 500000n,
          media: [{ url: 'https://example.com/image.webp' }],
        },
      });

      const result = await service.mergeGuestIntoUser('user-1', 'guest-token');

      expect(cartRepository.upsertItem).toHaveBeenCalledWith('user-cart', {
        productId: 'product-1',
        variantId: 'variant-1',
        quantity: 5,
        size: 'M',
        color: 'Black',
      });
      expect(cartRepository.deleteCart).toHaveBeenCalledWith('guest-cart');
      expect(result.items[0]?.quantity).toBe(5);
    });
  });
});
