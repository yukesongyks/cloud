'use client';

import { PersonnelList } from '@/components/personnel/PersonnelList';
import { useSession } from 'next-auth/react';

export default function PersonnelPage() {
  const { data: session } = useSession();
  const organizationId = session?.user?.organizationId;

  if (!organizationId) {
    return <div className="p-4">请先登录</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <PersonnelList organizationId={organizationId} />
    </div>
  );
}