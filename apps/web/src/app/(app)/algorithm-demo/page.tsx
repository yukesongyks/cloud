'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import { TypeTabs } from '@/components/algorithm-demo/TypeTabs';
import { AlgorithmPanel } from '@/components/algorithm-demo/AlgorithmPanel';
import { ExportButton } from '@/components/algorithm-demo/ExportButton';
import { InvocationStats } from '@/components/algorithm-demo/InvocationStats';
import { TextIconButton } from '@/components/algorithm-demo/TextIconButton';
import type { AlgorithmKind, AlgorithmResult, InvocationStatsSummary, StatsFilter } from '@/components/algorithm-demo/types';
import { ALGORITHM_LABELS } from '@/components/algorithm-demo/types';

const ALGORITHM_TABS: Array<{ value: AlgorithmKind; label: string }> = [
  { value: 'helloworld', label: 'Helloworld' },
  { value: 'hash', label: '哈希算法' },
  { value: 'bubblesort', label: '冒泡排序' },
];

export default function AlgorithmDemoPage() {
  const [results, setResults] = useState<AlgorithmResult[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<InvocationStatsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsFilter, setStatsFilter] = useState<StatsFilter>({});
  const abortRef = useRef<AbortController | null>(null);

  const handleResult = useCallback((result: AlgorithmResult) => {
    setResults(prev => [result, ...prev].slice(0, 20));
  }, []);

  const fetchStats = useCallback(async () => {
    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setStatsLoading(true);
    setStatsError(null);
    try {
      const params = new URLSearchParams();
      if (statsFilter.personnelType) params.set('personnelType', statsFilter.personnelType);
      if (statsFilter.level) params.set('level', statsFilter.level);
      if (statsFilter.department) params.set('department', statsFilter.department);
      const queryString = params.toString();
      const url = queryString ? `/api/dtcoder/stats?${queryString}` : '/api/dtcoder/stats';
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const data = (await res.json()) as InvocationStatsSummary;
        setStatsData(data);
      } else {
        setStatsError(`HTTP ${res.status}`);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return; // intentionally aborted, ignore
      }
      console.error('Failed to fetch invocation stats:', e);
      setStatsError(e instanceof Error ? e.message : '获取统计数据失败');
    } finally {
      setStatsLoading(false);
    }
  }, [statsFilter]);

  const handleToggleStats = useCallback(() => {
    const next = !showStats;
    setShowStats(next);
    if (next) {
      fetchStats();
    }
  }, [showStats, fetchStats]);

  useEffect(() => {
    if (showStats) {
      fetchStats();
    }
  }, [statsFilter, showStats, fetchStats]);

  const tabContent = ALGORITHM_TABS.map(tab => ({
    value: tab.value,
    label: tab.label,
    content: <AlgorithmPanel kind={tab.value} onResult={handleResult} />,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">算法演示</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            在线执行算法并查看调用统计
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton />
          <TextIconButton
            icon={BarChart3}
            label={showStats ? '隐藏统计' : '调用统计'}
            onClick={handleToggleStats}
            variant="outline"
          />
        </div>
      </div>

      {/* Algorithm Tabs */}
      <TypeTabs defaultValue="helloworld" tabs={tabContent} />

      {/* Recent Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-foreground-muted">最近执行结果</h2>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface">
                <tr className="text-left text-foreground-muted">
                  <th className="px-3 py-2 font-medium">算法</th>
                  <th className="px-3 py-2 font-medium">输入</th>
                  <th className="px-3 py-2 font-medium">输出</th>
                  <th className="px-3 py-2 font-medium">耗时</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.timestamp} className="border-t border-border text-foreground">
                    <td className="px-3 py-2">{ALGORITHM_LABELS[r.kind]}</td>
                    <td className="max-w-[120px] truncate px-3 py-2 font-mono">
                      {r.input || '-'}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 font-mono">
                      {r.output}
                    </td>
                    <td className="px-3 py-2">{r.executionTimeMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invocation Stats */}
      {showStats && (
        <div className="border-t border-border pt-6">
          <InvocationStats
            data={statsData}
            loading={statsLoading}
            filter={statsFilter}
            onFilterChange={setStatsFilter}
          />
          {statsError && (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              <span>{statsError}</span>
              <button
                type="button"
                onClick={fetchStats}
                className="rounded bg-red-500/20 px-2 py-1 text-xs font-medium hover:bg-red-500/30"
              >
                重试
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}