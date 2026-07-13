'use client';

import { PersonnelDashboard } from '@/components/personnel/PersonnelDashboard';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function PersonnelDashboardPage() {
  const { data: session } = useSession();
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    return <div className="p-4">请先登录</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Link
        href="/personnel"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← 返回人员列表
      </Link>
      <PersonnelDashboard organizationId={organizationId} />
    </div>
  );
}