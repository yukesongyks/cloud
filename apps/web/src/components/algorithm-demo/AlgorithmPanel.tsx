'use client';

import { useState, useCallback, useRef } from 'react';
import { Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TextIconButton } from './TextIconButton';
import type { AlgorithmKind, AlgorithmResult } from './types';
import { ALGORITHM_LABELS, ALGORITHM_DESCRIPTIONS } from './types';

type AlgorithmPanelProps = {
  kind: AlgorithmKind;
  onResult?: (result: AlgorithmResult) => void;
};

const DEFAULT_INPUTS: Record<AlgorithmKind, string> = {
  helloworld: '',
  hash: 'Hello, DTCoder!',
  bubblesort: '5,3,8,1,9,2,7,4,6',
};

const PLACEHOLDER_TEXTS: Record<AlgorithmKind, string> = {
  helloworld: '无需输入',
  hash: '输入要哈希的字符串',
  bubblesort: '输入逗号分隔的整数，如: 5,3,8,1,9',
};

export function AlgorithmPanel({ kind, onResult }: AlgorithmPanelProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    // Client-side input validation
    if (kind === 'hash') {
      const hashInput = input || DEFAULT_INPUTS[kind];
      if (!hashInput.trim()) {
        setError('输入不能为空');
        setLoading(false);
        return;
      }
      if (hashInput.length > 10000) {
        setError('输入长度不能超过 10000 个字符');
        setLoading(false);
        return;
      }
    }
    if (kind === 'bubblesort') {
      const rawInput = input || DEFAULT_INPUTS[kind];
      if (!rawInput.trim()) {
        setError('输入不能为空');
        setLoading(false);
        return;
      }
      const nums = rawInput
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
      if (nums.length === 0) {
        setError('无效的输入: 需要逗号分隔的整数');
        setLoading(false);
        return;
      }
      if (nums.length > 1000) {
        setError('数组长度不能超过 1000');
        setLoading(false);
        return;
      }
    }

    try {
      const body: Record<string, unknown> = { kind };
      if (kind !== 'helloworld') {
        body.input = input || DEFAULT_INPUTS[kind];
      }

      const res = await fetch('/api/dtcoder/algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as AlgorithmResult;
      setResult(data);
      onResult?.(data);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      setError(e instanceof Error ? e.message : '执行失败');
    } finally {
      setLoading(false);
    }
  }, [kind, input, onResult]);

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
              placeholder={PLACEHOLDER_TEXTS[kind]}
              className="flex h-9 w-full rounded-md border border-border bg-input-bg px-3 py-1 text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-border-strong"
            />
          </div>
        )}

        <TextIconButton
          icon={Play}
          label="执行算法"
          onClick={execute}
          loading={loading}
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