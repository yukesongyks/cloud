'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OneSegmented } from './OneSegmented';
import type { InvocationStatsSummary, StatsFilter } from './types';

const CHART_COLORS = [
  '#EDFF00',
  '#3B82F6',
  '#A855F7',
  '#10B981',
  '#F97316',
  '#EF4444',
  '#EAB308',
  '#22C55E',
];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(17, 24, 39, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  fontSize: 12,
};

type FilterDimension = 'personnelType' | 'level' | 'department';

const FILTER_OPTIONS: Array<{ value: FilterDimension; label: string }> = [
  { value: 'personnelType', label: '人员类型' },
  { value: 'level', label: '层级' },
  { value: 'department', label: '部门' },
];

type InvocationStatsProps = {
  data: InvocationStatsSummary | null;
  loading: boolean;
  filter: StatsFilter;
  onFilterChange: (filter: StatsFilter) => void;
};

const SkeletonBlock = ({ h }: { h: string }) => (
  <div className={`bg-muted/30 animate-pulse rounded ${h}`} />
);

export function InvocationStats({ data, loading, filter, onFilterChange }: InvocationStatsProps) {
  const [activeDimension, setActiveDimension] = useState<FilterDimension>('personnelType');

  const breakdownData = useMemo(() => {
    if (!data) return [];
    switch (activeDimension) {
      case 'personnelType':
        return data.breakdownByPersonnelType;
      case 'level':
        return data.breakdownByLevel;
      case 'department':
        return data.breakdownByDepartment;
    }
  }, [data, activeDimension]);

  const handleDimensionChange = useCallback(
    (dim: string) => {
      setActiveDimension(dim as FilterDimension);
      onFilterChange({ ...filter, [activeDimension]: undefined });
    },
    [filter, onFilterChange, activeDimension],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonBlock h="h-24" />
          <SkeletonBlock h="h-24" />
          <SkeletonBlock h="h-24" />
        </div>
        <SkeletonBlock h="h-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SkeletonBlock h="h-72" />
          <SkeletonBlock h="h-72" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center text-sm">暂无统计数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-foreground-muted">
              总调用次数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{data.totalInvocations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-foreground-muted">
              成功率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">
              {(data.successRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-foreground-muted">
              平均耗时
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {data.avgExecutionTimeMs.toFixed(1)}ms
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">调用趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.timeline}
                margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="timestamp"
                  stroke="currentColor"
                  fontSize={11}
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis stroke="currentColor" fontSize={11} tick={{ fill: 'currentColor' }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="调用次数"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="avgTimeMs"
                  name="平均耗时(ms)"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">按维度分布</CardTitle>
              <OneSegmented
                options={FILTER_OPTIONS}
                value={activeDimension}
                onChange={handleDimensionChange}
              />
            </div>
          </CardHeader>
          <CardContent>
            {breakdownData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={breakdownData}
                    layout="vertical"
                    margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" stroke="currentColor" fontSize={11} />
                    <YAxis
                      dataKey="label"
                      type="category"
                      stroke="currentColor"
                      fontSize={11}
                      width={80}
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value, _name, item) => {
                        const raw = Number(value);
                        const pct =
                          (item?.payload as { percentage?: number } | undefined)?.percentage ?? 0;
                        return [`${raw} (${pct.toFixed(1)}%)`];
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {breakdownData.map((item, i) => (
                        <Cell key={item.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">算法占比</CardTitle>
          </CardHeader>
          <CardContent>
            {data.breakdownByAlgorithm.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data.</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="flex w-full justify-center sm:w-1/2">
                  <div className="relative aspect-square w-full max-w-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.breakdownByAlgorithm}
                          cx="50%"
                          cy="50%"
                          innerRadius="56%"
                          outerRadius="92%"
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {data.breakdownByAlgorithm.map((item, i) => (
                            <Cell
                              key={item.key}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={CHART_TOOLTIP_STYLE}
                          formatter={(value, _name, item) => {
                            const raw = Number(value);
                            const pct =
                              (item?.payload as { percentage?: number } | undefined)?.percentage ??
                              0;
                            return [`${raw} (${pct.toFixed(1)}%)`];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <ul className="flex w-full min-w-0 flex-col gap-1 text-xs sm:w-1/2">
                  {data.breakdownByAlgorithm.map((item, i) => (
                    <li key={item.key} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <span className="text-muted-foreground shrink-0">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}