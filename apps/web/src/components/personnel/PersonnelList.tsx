'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { PersonnelForm } from './PersonnelForm';
import type { Position, Level, Status } from '@/routers/personnel-router';

type Personnel = {
  id: string;
  name: string;
  position: Position;
  level: Level;
  age: number;
  baseLocation: string;
  status: Status;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

export function PersonnelList({ organizationId }: { organizationId: string }) {
  const [filters, setFilters] = useState({
    position: undefined as Position | undefined,
    level: undefined as Level | undefined,
    status: undefined as Status | undefined,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = trpc.personnel.list.useQuery({
    organizationId,
    ...filters,
    limit: 50,
  });

  const deleteMutation = trpc.personnel.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除此人员信息吗？')) {
      await deleteMutation.mutateAsync({ id, organizationId });
    }
  };

  if (isLoading) {
    return <div className="p-4">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">人员列表</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          新增人员
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded">
        <select
          value={filters.position || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              position: (e.target.value as Position) || undefined,
            }))
          }
          className="px-3 py-2 border rounded"
        >
          <option value="">全部岗位</option>
          <option value="developer">开发</option>
          <option value="designer">设计</option>
          <option value="product_manager">产品</option>
          <option value="tester">测试</option>
          <option value="operations">运维</option>
          <option value="other">其他</option>
        </select>

        <select
          value={filters.level || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              level: (e.target.value as Level) || undefined,
            }))
          }
          className="px-3 py-2 border rounded"
        >
          <option value="">全部职级</option>
          <option value="junior">初级</option>
          <option value="intermediate">中级</option>
          <option value="senior">高级</option>
          <option value="expert">专家</option>
          <option value="architect">架构师</option>
        </select>

        <select
          value={filters.status || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              status: (e.target.value as Status) || undefined,
            }))
          }
          className="px-3 py-2 border rounded"
        >
          <option value="">全部状态</option>
          <option value="active">在职</option>
          <option value="resigned">已离职</option>
          <option value="on_leave">请假中</option>
          <option value="probation">试用期</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left border-b">姓名</th>
              <th className="px-4 py-2 text-left border-b">岗位</th>
              <th className="px-4 py-2 text-left border-b">职级</th>
              <th className="px-4 py-2 text-left border-b">年龄</th>
              <th className="px-4 py-2 text-left border-b">Base地</th>
              <th className="px-4 py-2 text-left border-b">状态</th>
              <th className="px-4 py-2 text-left border-b">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((person: Personnel) => (
              <tr key={person.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 border-b">{person.name}</td>
                <td className="px-4 py-2 border-b">{person.position}</td>
                <td className="px-4 py-2 border-b">{person.level}</td>
                <td className="px-4 py-2 border-b">{person.age}</td>
                <td className="px-4 py-2 border-b">{person.baseLocation}</td>
                <td className="px-4 py-2 border-b">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      person.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : person.status === 'resigned'
                          ? 'bg-red-100 text-red-800'
                          : person.status === 'on_leave'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {person.status === 'active'
                      ? '在职'
                      : person.status === 'resigned'
                        ? '已离职'
                        : person.status === 'on_leave'
                          ? '请假中'
                          : '试用期'}
                  </span>
                </td>
                <td className="px-4 py-2 border-b">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(person.id)}
                      className="text-blue-600 hover:underline"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-red-600 hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {(showForm || editingId) && (
        <PersonnelForm
          organizationId={organizationId}
          personnelId={editingId}
          onClose={() => {
            setShowForm(false);
            setEditingId(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}