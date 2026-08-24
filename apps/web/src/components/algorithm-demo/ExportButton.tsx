'use client';

import { useState, useCallback } from 'react';
import { Download } from 'lucide-react';
import { TextIconButton } from './TextIconButton';
import { OneSegmented } from './OneSegmented';
import type { ExportFormat } from './types';

type ExportButtonProps = {
  className?: string;
};

export function ExportButton({ className }: ExportButtonProps) {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dtcoder/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      });

      if (!res.ok) {
        throw new Error(`Export failed: HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      link.download = `algorithm-demo-results.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : '导出失败';
      setError(message);
      console.error('Export failed:', e);
    } finally {
      setLoading(false);
    }
  }, [format]);

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <OneSegmented<ExportFormat>
          options={[
            { value: 'excel', label: 'Excel' },
            { value: 'csv', label: 'CSV' },
          ]}
          value={format}
          onChange={setFormat}
        />
        <TextIconButton
          icon={Download}
          label="导出结果"
          onClick={handleExport}
          loading={loading}
          variant="outline"
        />
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}