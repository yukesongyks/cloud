export type AlgorithmKind = 'helloworld' | 'hash' | 'bubblesort';

export type AlgorithmResult = {
  kind: AlgorithmKind;
  input: string;
  output: string;
  executionTimeMs: number;
  timestamp: string;
};

export type ExportFormat = 'excel' | 'csv';

export type InvocationStatEntry = {
  id: string;
  algorithm: AlgorithmKind;
  personnelType: string;
  level: string;
  department: string;
  executionTimeMs: number;
  timestamp: string;
  success: boolean;
};

export type StatsFilter = {
  personnelType?: string;
  level?: string;
  department?: string;
};

export type InvocationStatsSummary = {
  totalInvocations: number;
  successRate: number;
  avgExecutionTimeMs: number;
  breakdownByAlgorithm: Array<{ key: string; label: string; value: number; percentage: number }>;
  breakdownByPersonnelType: Array<{ key: string; label: string; value: number; percentage: number }>;
  breakdownByLevel: Array<{ key: string; label: string; value: number; percentage: number }>;
  breakdownByDepartment: Array<{ key: string; label: string; value: number; percentage: number }>;
  timeline: Array<{ timestamp: string; count: number; avgTimeMs: number }>;
};

export const ALGORITHM_LABELS: Record<AlgorithmKind, string> = {
  helloworld: 'Helloworld',
  hash: '哈希算法',
  bubblesort: '冒泡排序',
};

export const ALGORITHM_DESCRIPTIONS: Record<AlgorithmKind, string> = {
  helloworld: '输出 "Hello, World!" 字符串',
  hash: '使用 SHA-256 对输入字符串进行哈希计算',
  bubblesort: '对输入的整数数组进行冒泡排序',
};