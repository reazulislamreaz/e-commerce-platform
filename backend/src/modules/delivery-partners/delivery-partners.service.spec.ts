import { DeliveryPartnersService } from './delivery-partners.service';

describe('DeliveryPartnersService', () => {
  const repo = {
    count: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    listActive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const service = new DeliveryPartnersService(repo as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves tracking URL from template', () => {
    expect(
      service.resolveTrackingUrl('https://track.example/{trackingNumber}', 'TRK123', null),
    ).toBe('https://track.example/TRK123');
  });

  it('prefers explicit tracking URL over template', () => {
    expect(
      service.resolveTrackingUrl(
        'https://track.example/{trackingNumber}',
        'TRK123',
        'https://custom.example/TRK123',
      ),
    ).toBe('https://custom.example/TRK123');
  });

  it('deactivates instead of deleting when shipments exist', async () => {
    repo.findById.mockResolvedValue({
      id: 'p1',
      companyName: 'Pathao',
      contactPerson: null,
      phone: null,
      email: null,
      website: null,
      logoUrl: null,
      trackingUrlTemplate: null,
      isActive: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      _count: { shipments: 2 },
    });
    repo.update.mockImplementation(async (_id: string, data: { isActive: boolean }) => ({
      id: 'p1',
      companyName: 'Pathao',
      contactPerson: null,
      phone: null,
      email: null,
      website: null,
      logoUrl: null,
      trackingUrlTemplate: null,
      isActive: data.isActive,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      _count: { shipments: 2 },
    }));

    const result = await service.remove('p1');
    expect(repo.delete).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith('p1', { isActive: false });
    expect(result).toMatchObject({ id: 'p1', isActive: false });
  });
});
