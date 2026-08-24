'use client';

import { useState, useCallback } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TextIconButton } from './TextIconButton';
import type { AlgorithmKind, AlgorithmResult } from './types';
import { ALGORITHM_LABELS, ALGORITHM_DESCRIPTIONS } from './types';

type AlgorithmPanelProps = {
  kind: AlgorithmKind;
  onResult?: (result: AlgorithmResult) => void;
};

export function AlgorithmPanel({ kind, onResult }: AlgorithmPanelProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultInputs: Record<AlgorithmKind, string> = {
    helloworld: '',
    hash: 'Hello, DTCoder!',
    bubblesort: '5,3,8,1,9,2,7,4,6',
  };

  const placeholderTexts: Record<AlgorithmKind, string> = {
    helloworld: '无需输入',
    hash: '输入要哈希的字符串',
    bubblesort: '输入逗号分隔的整数，如: 5,3,8,1,9',
  };

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { kind };
      if (kind !== 'helloworld') {
        body.input = input || defaultInputs[kind];
      }

      const res = await fetch('/api/dtcoder/algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as AlgorithmResult;
      setResult(data);
      onResult?.(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '执行失败');
    } finally {
      setLoading(false);
    }
  }, [kind, input, onResult, defaultInputs]);

  const showInput = kind !== 'helloworld';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{ALGORITHM_LABELS[kind]}</CardTitle>
        <CardDescription>{ALGORITHM_DESCRIPTIONS[kind]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInput && (
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              输入参数
            </label>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholderTexts[kind]}
              className="flex h-9 w-full rounded-md border border-border bg-input-bg px-3 py-1 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-border-strong"
            />
          </div>
        )}

        <TextIconButton
          icon={loading ? Loader2 : Play}
          label={loading ? '执行中...' : '执行算法'}
          onClick={execute}
          disabled={loading}
          variant="default"
        />

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && !error && (
          <div className="space-y-2 rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span>执行结果</span>
              <span>耗时: {result.executionTimeMs}ms</span>
            </div>
            <div className="text-sm text-foreground">
              <span className="text-foreground-subtle">输出: </span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {result.output}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}