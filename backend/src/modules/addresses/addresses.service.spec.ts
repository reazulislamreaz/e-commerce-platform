import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressType } from '@/generated/prisma/client';
import { AddressesRepository, type AddressRecord } from './addresses.repository';
import { AddressesService } from './addresses.service';

const userId = '11111111-1111-4111-8111-111111111111';
const addressId = '22222222-2222-4222-8222-222222222222';

function record(overrides: Partial<AddressRecord> = {}): AddressRecord {
  return {
    id: addressId,
    userId,
    label: 'Home',
    fullName: 'Rahim Khan',
    phone: '+8801712345678',
    line1: 'House 12',
    line2: null,
    city: 'Dhaka',
    district: 'Dhaka',
    postalCode: '1207',
    country: 'Bangladesh',
    type: AddressType.SHIPPING,
    isDefault: true,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('AddressesService', () => {
  let service: AddressesService;
  const repository = {
    findManyByUserId: jest.fn(),
    findOwnedById: jest.fn(),
    countByUserAndType: jest.fn(),
    clearDefaults: jest.fn(),
    findFirstByUserAndType: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    runTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.runTransaction.mockImplementation(
      async <T>(fn: (tx: unknown) => Promise<T>) => fn({}),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        AddressesService,
        { provide: AddressesRepository, useValue: repository },
      ],
    }).compile();
    service = moduleRef.get(AddressesService);
  });

  it('lists mapped addresses for the user', async () => {
    repository.findManyByUserId.mockResolvedValue([record()]);

    await expect(service.list(userId)).resolves.toEqual([
      {
        id: addressId,
        label: 'Home',
        fullName: 'Rahim Khan',
        phone: '+8801712345678',
        line1: 'House 12',
        city: 'Dhaka',
        district: 'Dhaka',
        postalCode: '1207',
        country: 'Bangladesh',
        isDefault: true,
        type: 'shipping',
      },
    ]);
  });

  it('throws 404 when an owned address is missing', async () => {
    repository.findOwnedById.mockResolvedValue(null);
    await expect(service.getById(userId, addressId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates the first address as default with Bangladesh country', async () => {
    repository.countByUserAndType.mockResolvedValue(0);
    repository.create.mockResolvedValue(record({ isDefault: true }));

    await service.create(userId, {
      label: 'Home',
      fullName: 'Rahim Khan',
      phone: '01712345678',
      line1: 'House 12',
      city: 'Dhaka',
      district: 'Dhaka',
      postalCode: '1207',
    });

    expect(repository.clearDefaults).toHaveBeenCalledWith(
      userId,
      AddressType.SHIPPING,
      expect.anything(),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        country: 'Bangladesh',
        type: AddressType.SHIPPING,
        isDefault: true,
        phone: '+8801712345678',
      }),
      expect.anything(),
    );
  });

  it('stores trimmed phone when normalization fails', async () => {
    repository.countByUserAndType.mockResolvedValue(1);
    repository.create.mockResolvedValue(record({ phone: '01234567890', isDefault: false }));

    await service.create(userId, {
      label: 'Office',
      fullName: 'Rahim Khan',
      phone: ' 01234567890 ',
      line1: 'Road 4',
      city: 'Dhaka',
      district: 'Dhaka',
      postalCode: '1207',
      isDefault: false,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '01234567890', isDefault: false }),
      expect.anything(),
    );
    expect(repository.clearDefaults).not.toHaveBeenCalled();
  });

  it('promotes another address when deleting the default', async () => {
    const replacementId = '33333333-3333-4333-8333-333333333333';
    repository.findOwnedById.mockResolvedValue(record({ isDefault: true }));
    repository.findFirstByUserAndType.mockResolvedValue(
      record({ id: replacementId, isDefault: false }),
    );

    await service.softDelete(userId, addressId);

    expect(repository.softDelete).toHaveBeenCalledWith(addressId, expect.anything());
    expect(repository.update).toHaveBeenCalledWith(
      replacementId,
      { isDefault: true },
      expect.anything(),
    );
  });

  it('clears sibling defaults when setting default', async () => {
    repository.findOwnedById.mockResolvedValue(record());
    repository.update.mockResolvedValue(record());

    await service.setDefault(userId, addressId);

    expect(repository.clearDefaults).toHaveBeenCalledWith(
      userId,
      AddressType.SHIPPING,
      expect.anything(),
    );
    expect(repository.update).toHaveBeenCalledWith(
      addressId,
      { isDefault: true },
      expect.anything(),
    );
  });

  it('clears sibling defaults when updating address to default', async () => {
    repository.findOwnedById.mockResolvedValue(record({ isDefault: false }));
    repository.update.mockResolvedValue(record({ isDefault: true }));

    await service.update(userId, addressId, { isDefault: true });

    expect(repository.clearDefaults).toHaveBeenCalledWith(
      userId,
      AddressType.SHIPPING,
      expect.anything(),
    );
    expect(repository.update).toHaveBeenCalledWith(
      addressId,
      expect.objectContaining({ isDefault: true }),
      expect.anything(),
    );
  });
});
