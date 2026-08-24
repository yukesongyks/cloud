'use client';

import { useState, useMemo, useCallback, Component } from 'react';
import { Line, Column, Pie } from '@ant-design/charts';
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

// ─── Error Boundary ──────────────────────────────────────────────────────────

type ErrorBoundaryState = { hasError: boolean; error: Error | null };

class StatsErrorBoundary extends Component<
  { children: React.ReactNode; onRetry?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('InvocationStats ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-red-400 mb-3">
              图表渲染失败: {this.state.error?.message ?? '未知错误'}
            </p>
            {this.props.onRetry && (
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onRetry?.();
                }}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                重试
              </button>
            )}
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

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
      const newDim = dim as FilterDimension;
      // Clear the new dimension's filter value when switching (fix: use newDim, not stale activeDimension)
      onFilterChange({ ...filter, [newDim]: undefined });
      setActiveDimension(newDim);
    },
    [filter, onFilterChange],
  );

  // Reshape timeline data for multi-series Line chart
  const timelineData = useMemo(() => {
    if (!data) return [];
    const result: Array<{ timestamp: string; value: number; category: string }> = [];
    for (const point of data.timeline) {
      result.push({ timestamp: point.timestamp, value: point.count, category: '调用次数' });
      result.push({ timestamp: point.timestamp, value: point.avgTimeMs, category: '平均耗时(ms)' });
    }
    return result;
  }, [data]);

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
    <StatsErrorBoundary
      onRetry={() => {
        // Trigger parent re-fetch via filter change
        onFilterChange({ ...filter });
      }}
    >
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
              <Line
                data={timelineData}
                xField="timestamp"
                yField="value"
                seriesField="category"
                smooth
                color={[CHART_COLORS[0], CHART_COLORS[1]]}
                xAxis={{
                  tickCount: 6,
                  label: { style: { fill: 'currentColor', fontSize: 11 } },
                }}
                yAxis={{
                  label: { style: { fill: 'currentColor', fontSize: 11 } },
                }}
                legend={{
                  position: 'top',
                  itemName: { style: { fill: 'currentColor', fontSize: 12 } },
                }}
                tooltip={{
                  domStyles: {
                    'g2-tooltip': {
                      backgroundColor: 'rgba(17, 24, 39, 0.95)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                    },
                  },
                }}
                animation={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Breakdown Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Column Chart */}
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
                <p className="text-muted-foreground text-sm">暂无数据</p>
              ) : (
                <div className="h-72 w-full">
                  <Column
                    data={breakdownData}
                    xField="label"
                    yField="value"
                    color={CHART_COLORS}
                    xAxis={{
                      label: {
                        style: { fill: 'currentColor', fontSize: 11 },
                        autoRotate: true,
                      },
                    }}
                    yAxis={{
                      label: { style: { fill: 'currentColor', fontSize: 11 } },
                    }}
                    tooltip={{
                      domStyles: {
                        'g2-tooltip': {
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                        },
                      },
                      formatter: (datum: { value?: number; percentage?: number }) => {
                        const raw = datum.value ?? 0;
                        const pct = datum.percentage ?? 0;
                        return { name: '调用次数', value: `${raw} (${pct.toFixed(1)}%)` };
                      },
                    }}
                    animation={false}
                  />
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
                <p className="text-muted-foreground text-sm">暂无数据</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <div className="flex w-full justify-center sm:w-1/2">
                    <div className="relative aspect-square w-full max-w-[220px]">
                      <Pie
                        data={data.breakdownByAlgorithm}
                        angleField="value"
                        colorField="label"
                        color={CHART_COLORS}
                        innerRadius={0.56}
                        radius={0.92}
                        statistic={null}
                        tooltip={{
                          domStyles: {
                            'g2-tooltip': {
                              backgroundColor: 'rgba(17, 24, 39, 0.95)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '12px',
                            },
                          },
                          formatter: (datum: { value?: number; percentage?: number }) => {
                            const raw = datum.value ?? 0;
                            const pct = datum.percentage ?? 0;
                            return { name: '调用次数', value: `${raw} (${pct.toFixed(1)}%)` };
                          },
                        }}
                        legend={{
                          position: 'bottom',
                          itemName: { style: { fill: 'currentColor', fontSize: 12 } },
                        }}
                        label={{
                          style: { fill: 'currentColor', fontSize: 11 },
                        }}
                        interactions={[{ type: 'element-active' }]}
                        animation={false}
                      />
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
    </StatsErrorBoundary>
  );
}