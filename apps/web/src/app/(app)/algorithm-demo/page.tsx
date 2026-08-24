'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [statsFilter, setStatsFilter] = useState<StatsFilter>({});

  const handleResult = useCallback((result: AlgorithmResult) => {
    setResults(prev => [result, ...prev].slice(0, 20));
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/dtcoder/stats');
      if (res.ok) {
        const data = (await res.json()) as InvocationStatsSummary;
        setStatsData(data);
      }
    } catch {
      // Stats fetch failed silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

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
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border text-foreground">
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
        </div>
      )}
    </div>
  );
}