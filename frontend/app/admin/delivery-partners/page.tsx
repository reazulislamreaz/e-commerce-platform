'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Plus, Search, Truck } from 'lucide-react';
import { AdminModal } from '@/components/admin/admin-modal';
import { AdminPagination, type AdminPageSize } from '@/components/admin/admin-pagination';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { AdminTableSkeleton } from '@/components/common/skeleton';
import {
  AdminButton,
  AdminEmpty,
  AdminError,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminTable,
  AdminTd,
  AdminTh,
  StatusPill,
} from '@/components/admin/admin-ui';
import {
  adminApi,
  adminKeys,
  useAdminMutation,
  useDeliveryPartners,
  type DeliveryPartner,
  type DeliveryPartnerInput,
} from '@/features/admin';
import { getUserFacingErrorMessage } from '@/lib/user-facing-error';

const PARTNER_INVALIDATE = [
  adminKeys.deliveryPartnersRoot(),
  adminKeys.deliveryPartnersActive(),
] as const;

type PartnerModalState = { mode: 'create' } | { mode: 'edit'; partner: DeliveryPartner } | null;

type ConfirmDeleteState = {
  partner: DeliveryPartner;
} | null;

export default function DeliveryPartnersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(20);

  const [modalState, setModalState] = useState<PartnerModalState>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>(null);

  // Form fields state for modal
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [trackingUrlTemplate, setTrackingUrlTemplate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const queryParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(activeFilter === 'active' ? { active: true } : {}),
      ...(activeFilter === 'inactive' ? { active: false } : {}),
    }),
    [page, pageSize, search, activeFilter],
  );

  const partnersQuery = useDeliveryPartners(queryParams);
  const rows = useMemo(() => partnersQuery.data?.data ?? [], [partnersQuery.data?.data]);
  const meta = partnersQuery.data?.meta ?? {
    page,
    pageSize,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  const createMutation = useAdminMutation(
    (input: DeliveryPartnerInput) => adminApi.createDeliveryPartner(input),
    [...PARTNER_INVALIDATE],
    { successMessage: 'Delivery partner created successfully' },
  );

  const updateMutation = useAdminMutation(
    ({ id, input }: { id: string; input: Partial<DeliveryPartnerInput> }) =>
      adminApi.updateDeliveryPartner(id, input),
    [...PARTNER_INVALIDATE],
    { successMessage: 'Delivery partner updated successfully' },
  );

  const activateMutation = useAdminMutation(
    (id: string) => adminApi.activateDeliveryPartner(id),
    [...PARTNER_INVALIDATE],
    { successMessage: 'Delivery partner activated' },
  );

  const deactivateMutation = useAdminMutation(
    (id: string) => adminApi.deactivateDeliveryPartner(id),
    [...PARTNER_INVALIDATE],
    { successMessage: 'Delivery partner deactivated' },
  );

  const deleteMutation = useAdminMutation(
    (id: string) => adminApi.deleteDeliveryPartner(id),
    [...PARTNER_INVALIDATE],
    { successMessage: 'Delivery partner removed' },
  );

  const pending =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    deleteMutation.isPending;

  function resetPagination() {
    setPage(1);
  }

  function openCreateModal() {
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setLogoUrl('');
    setTrackingUrlTemplate('');
    setIsActive(true);
    setFormError('');
    setModalState({ mode: 'create' });
  }

  function openEditModal(partner: DeliveryPartner) {
    setCompanyName(partner.companyName);
    setContactPerson(partner.contactPerson ?? '');
    setPhone(partner.phone ?? '');
    setEmail(partner.email ?? '');
    setWebsite(partner.website ?? '');
    setLogoUrl(partner.logoUrl ?? '');
    setTrackingUrlTemplate(partner.trackingUrlTemplate ?? '');
    setIsActive(partner.isActive);
    setFormError('');
    setModalState({ mode: 'edit', partner });
  }

  function closeModal() {
    if (pending) return;
    setModalState(null);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) {
      setFormError('Company name is required');
      return;
    }
    setFormError('');

    const input: DeliveryPartnerInput = {
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      trackingUrlTemplate: trackingUrlTemplate.trim() || undefined,
      isActive,
    };

    try {
      if (modalState?.mode === 'create') {
        await createMutation.mutateAsync(input);
      } else if (modalState?.mode === 'edit') {
        await updateMutation.mutateAsync({ id: modalState.partner.id, input });
      }
      setModalState(null);
    } catch (err) {
      setFormError(getUserFacingErrorMessage(err, 'Failed to save delivery partner'));
    }
  }

  async function handleToggleStatus(partner: DeliveryPartner) {
    if (partner.isActive) {
      await deactivateMutation.mutateAsync(partner.id);
    } else {
      await activateMutation.mutateAsync(partner.id);
    }
  }

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete.partner.id);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Delivery Partners"
        description="Manage courier services, integration keys, and shipment tracking URL templates."
        actions={
          <AdminButton onClick={openCreateModal}>
            <Plus className="size-3.5" strokeWidth={2} />
            Add Delivery Partner
          </AdminButton>
        }
      />

      <AdminPanel
        title="Partner Directory"
        description="Configure active shipping carriers for admin order fulfillment."
      >
        <form
          className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,200px)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
            resetPagination();
          }}
        >
          <AdminInput
            aria-label="Search delivery partners"
            placeholder="Search company, contact person, email, or phone"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <AdminSelect
            aria-label="Filter active status"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as 'all' | 'active' | 'inactive');
              resetPagination();
            }}
          >
            <option value="all">All partners</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </AdminSelect>
          <AdminButton type="submit">
            <Search className="size-3.5" strokeWidth={1.7} />
            Search
          </AdminButton>
        </form>

        {partnersQuery.isError ? (
          <AdminError>
            {getUserFacingErrorMessage(partnersQuery.error, 'Could not load delivery partners.')}
          </AdminError>
        ) : null}

        {partnersQuery.isLoading ? <AdminTableSkeleton rows={6} /> : null}

        {!partnersQuery.isLoading && rows.length === 0 ? (
          <AdminEmpty>No delivery partners found.</AdminEmpty>
        ) : null}

        {rows.length > 0 ? (
          <div className={partnersQuery.isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Company</AdminTh>
                  <AdminTh>Contact</AdminTh>
                  <AdminTh>Website</AdminTh>
                  <AdminTh>Tracking Template</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh className="text-right">Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((partner) => (
                  <tr key={partner.id}>
                    <AdminTd>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#FAFAFA] text-[#C9A227]">
                          <Truck className="size-4" strokeWidth={1.7} />
                        </span>
                        <div>
                          <p className="font-semibold text-[#111111]">{partner.companyName}</p>
                          {partner.shipmentCount !== undefined ? (
                            <p className="text-[11px] text-[#555555]">
                              {partner.shipmentCount} shipment
                              {partner.shipmentCount === 1 ? '' : 's'}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </AdminTd>
                    <AdminTd>
                      <p className="text-xs font-medium text-[#111111]">
                        {partner.contactPerson || '—'}
                      </p>
                      <p className="text-xs text-[#555555]">
                        {partner.phone || partner.email || '—'}
                      </p>
                    </AdminTd>
                    <AdminTd>
                      {partner.website ? (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#C9A227] hover:underline"
                        >
                          Visit <ExternalLink className="size-3" strokeWidth={1.7} />
                        </a>
                      ) : (
                        <span className="text-xs text-[#555555]">—</span>
                      )}
                    </AdminTd>
                    <AdminTd>
                      <code className="max-w-[200px] truncate block text-[11px] text-[#555555]">
                        {partner.trackingUrlTemplate || 'None'}
                      </code>
                    </AdminTd>
                    <AdminTd>
                      <StatusPill>{partner.isActive ? 'ACTIVE' : 'INACTIVE'}</StatusPill>
                    </AdminTd>
                    <AdminTd className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <AdminButton
                          variant="secondary"
                          size="sm"
                          disabled={pending}
                          onClick={() => openEditModal(partner)}
                        >
                          Edit
                        </AdminButton>
                        <AdminButton
                          variant={partner.isActive ? 'ghost' : 'secondary'}
                          size="sm"
                          disabled={pending}
                          onClick={() => handleToggleStatus(partner)}
                        >
                          {partner.isActive ? 'Deactivate' : 'Activate'}
                        </AdminButton>
                        <AdminButton
                          variant="danger"
                          size="sm"
                          disabled={pending}
                          onClick={() => setConfirmDelete({ partner })}
                        >
                          Delete
                        </AdminButton>
                      </div>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>

            <AdminPagination
              meta={meta}
              entityLabel="delivery partners"
              isFetching={partnersQuery.isFetching && !partnersQuery.isLoading}
              onPageChange={(next) => setPage(next)}
              onPageSizeChange={(next) => {
                setPageSize(next);
                resetPagination();
              }}
            />
          </div>
        ) : null}
      </AdminPanel>

      {/* Create / Edit Modal */}
      <AdminModal
        open={Boolean(modalState)}
        onClose={closeModal}
        title={modalState?.mode === 'create' ? 'Add Delivery Partner' : 'Edit Delivery Partner'}
        size="lg"
        dismissDisabled={pending}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError ? <AdminError>{formError}</AdminError> : null}

          <AdminField label="Company Name *" hint="Official courier or logistics company name">
            <AdminInput
              required
              placeholder="e.g. Pathao Courier, SteadFast, RedX"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </AdminField>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Contact Person">
              <AdminInput
                placeholder="Support manager name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </AdminField>
            <AdminField label="Phone Number">
              <AdminInput
                placeholder="+8801700000000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </AdminField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Email Address">
              <AdminInput
                type="email"
                placeholder="support@courier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </AdminField>
            <AdminField label="Official Website">
              <AdminInput
                type="url"
                placeholder="https://courier.com.bd"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </AdminField>
          </div>

          <AdminField
            label="Tracking URL Template"
            hint="Use {trackingNumber} placeholder, e.g. https://courier.com/track/{trackingNumber}"
          >
            <AdminInput
              placeholder="https://pathao.com/track/{trackingNumber}"
              value={trackingUrlTemplate}
              onChange={(e) => setTrackingUrlTemplate(e.target.value)}
            />
          </AdminField>

          <AdminField label="Logo URL" hint="Optional link to partner logo image">
            <AdminInput
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </AdminField>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-[#E5E7EB] accent-[#C9A227]"
            />
            Active for order shipping assignments
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="ghost" onClick={closeModal} disabled={pending}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" loading={pending} disabled={pending}>
              {modalState?.mode === 'create' ? 'Create Partner' : 'Save Changes'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      {/* Delete / Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Delivery Partner"
        message={`Delete ${confirmDelete?.partner.companyName}? If this partner is linked to past shipments, it will be soft-deactivated to protect shipment history.`}
        confirmLabel="Delete Partner"
        loading={deleteMutation.isPending}
        onClose={() => (deleteMutation.isPending ? null : setConfirmDelete(null))}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
