'use client';

import { trpc } from '@/lib/trpc/client';

interface PersonnelDashboardProps {
  organizationId: string;
}

export function PersonnelDashboard({ organizationId }: PersonnelDashboardProps) {
  const { data: stats, isLoading } = trpc.personnel.stats.useQuery({
    organizationId,
  });

  const { data: positionExport, refetch: exportPosition } =
    trpc.personnel.export.useQuery(
      { dimension: 'position', organizationId },
      { enabled: false }
    );

  const { data: levelExport, refetch: exportLevel } =
    trpc.personnel.export.useQuery(
      { dimension: 'level', organizationId },
      { enabled: false }
    );

  const handleExport = async (dimension: 'position' | 'level') => {
    if (dimension === 'position') {
      const result = await exportPosition();
      if (result.data) {
        downloadFile(
          result.data.data,
          `personnel-by-position.${result.data.format}`
        );
      }
    } else {
      const result = await exportLevel();
      if (result.data) {
        downloadFile(
          result.data.data,
          `personnel-by-level.${result.data.format}`
        );
      }
    }
  };

  const downloadFile = (data: unknown, filename: string) => {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="p-4">加载中...</div>;
  }

  const positionLabels: Record<string, string> = {
    developer: '开发',
    designer: '设计',
    product_manager: '产品',
    tester: '测试',
    operations: '运维',
    other: '其他',
  };

  const levelLabels: Record<string, string> = {
    junior: '初级',
    intermediate: '中级',
    senior: '高级',
    expert: '专家',
    architect: '架构师',
  };

  const statusLabels: Record<string, string> = {
    active: '在职',
    resigned: '已离职',
    on_leave: '请假中',
    probation: '试用期',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">人员数据看板</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('position')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            导出岗位数据
          </button>
          <button
            onClick={() => handleExport('level')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            导出职级数据
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded">
        <p className="text-lg">
          总人数: <span className="font-bold">{stats?.total || 0}</span> 人
        </p>
      </div>

      {/* By Position */}
      <div className="bg-white p-6 rounded border">
        <h3 className="text-xl font-bold mb-4">按岗位统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.byPosition.map((item) => (
            <div key={item.position} className="p-4 bg-gray-50 rounded">
              <h4 className="font-bold text-lg mb-2">
                {positionLabels[item.position] || item.position}
              </h4>
              <p className="text-gray-600">人数: {item.count}</p>
              <p className="text-gray-600">
                平均年龄:{' '}
                {item.avgAge !== null ? item.avgAge.toFixed(1) : 'N/A'}
              </p>
              <div className="mt-2">
                <p className="text-sm text-gray-500">状态分布:</p>
                {Object.entries(item.distribution).map(([status, count]) => (
                  <span
                    key={status}
                    className="inline-block mr-2 text-sm bg-gray-200 px-2 py-1 rounded"
                  >
                    {statusLabels[status] || status}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart for Position */}
        <div className="mt-6">
          <h4 className="font-bold mb-2">人数分布图</h4>
          <div className="flex items-end gap-2 h-48">
            {stats?.byPosition.map((item) => {
              const maxCount = Math.max(
                ...stats.byPosition.map((p) => p.count)
              );
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.position} className="flex flex-col items-center">
                  <div
                    className="w-12 bg-blue-500 rounded-t"
                    style={{ height: `${height}%`, minHeight: '8px' }}
                    title={`${item.count}人`}
                  />
                  <p className="text-xs mt-1 text-center">
                    {positionLabels[item.position] || item.position}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* By Level */}
      <div className="bg-white p-6 rounded border">
        <h3 className="text-xl font-bold mb-4">按职级统计</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.byLevel.map((item) => (
            <div key={item.level} className="p-4 bg-gray-50 rounded">
              <h4 className="font-bold text-lg mb-2">
                {levelLabels[item.level] || item.level}
              </h4>
              <p className="text-gray-600">人数: {item.count}</p>
              <p className="text-gray-600">
                平均年龄:{' '}
                {item.avgAge !== null ? item.avgAge.toFixed(1) : 'N/A'}
              </p>
              <div className="mt-2">
                <p className="text-sm text-gray-500">状态分布:</p>
                {Object.entries(item.distribution).map(([status, count]) => (
                  <span
                    key={status}
                    className="inline-block mr-2 text-sm bg-gray-200 px-2 py-1 rounded"
                  >
                    {statusLabels[status] || status}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bar Chart for Level */}
        <div className="mt-6">
          <h4 className="font-bold mb-2">人数分布图</h4>
          <div className="flex items-end gap-2 h-48">
            {stats?.byLevel.map((item) => {
              const maxCount = Math.max(...stats.byLevel.map((l) => l.count));
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.level} className="flex flex-col items-center">
                  <div
                    className="w-12 bg-green-500 rounded-t"
                    style={{ height: `${height}%`, minHeight: '8px' }}
                    title={`${item.count}人`}
                  />
                  <p className="text-xs mt-1 text-center">
                    {levelLabels[item.level] || item.level}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}