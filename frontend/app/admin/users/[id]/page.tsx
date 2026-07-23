'use client';

import { useParams } from 'next/navigation';
import { AccountDetail } from '@/features/admin/components/account-detail';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <AccountDetail id={id} mode="customers" />;
}
