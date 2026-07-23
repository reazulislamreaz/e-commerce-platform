'use client';

import { useParams } from 'next/navigation';
import { AccountDetail } from '@/features/admin/components/account-detail';

export default function AdminStaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AccountDetail id={id} mode="staff" />;
}
