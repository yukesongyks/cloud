import { NextResponse } from 'next/server';

const PERSONNEL_TYPES = ['开发', '测试', '运维', '产品'];
const LEVELS = ['初级', '中级', '高级', '专家'];
const DEPARTMENTS = ['平台部', '业务部', '数据部', '安全部', '基础架构部'];
const ALGORITHMS = [
  { key: 'helloworld', label: 'Helloworld' },
  { key: 'hash', label: '哈希算法' },
  { key: 'bubblesort', label: '冒泡排序' },
];

function generateTimeline() {
  const now = new Date();
  const timeline: Array<{ timestamp: string; count: number; avgTimeMs: number }> = [];
  for (let i = 23; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600 * 1000);
    timeline.push({
      timestamp: `${t.getHours().toString().padStart(2, '0')}:00`,
      count: Math.floor(Math.random() * 50) + 5,
      avgTimeMs: Math.round((Math.random() * 5 + 0.5) * 100) / 100,
    });
  }
  return timeline;
}

function generateBreakdown(items: string[], total: number) {
  let remaining = total;
  return items.map((key, i) => {
    const isLast = i === items.length - 1;
    const value = isLast ? remaining : Math.floor(Math.random() * (remaining * 0.5)) + 1;
    remaining -= value;
    return {
      key,
      label: key,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personnelType = searchParams.get('personnelType');
    const level = searchParams.get('level');
    const department = searchParams.get('department');

    const totalInvocations = Math.floor(Math.random() * 500) + 100;
    const successRate = Math.round((0.85 + Math.random() * 0.14) * 100) / 100;
    const avgExecutionTimeMs = Math.round((Math.random() * 3 + 0.5) * 100) / 100;

    // Filter dimensions based on query params
    const filteredPersonnelTypes = personnelType
      ? PERSONNEL_TYPES.filter(t => t === personnelType)
      : PERSONNEL_TYPES;
    const filteredLevels = level
      ? LEVELS.filter(l => l === level)
      : LEVELS;
    const filteredDepartments = department
      ? DEPARTMENTS.filter(d => d === department)
      : DEPARTMENTS;

    const summary = {
      totalInvocations,
      successRate,
      avgExecutionTimeMs,
      breakdownByAlgorithm: generateBreakdown(
        ALGORITHMS.map(a => a.label),
        totalInvocations,
      ),
      breakdownByPersonnelType: generateBreakdown(
        filteredPersonnelTypes,
        totalInvocations,
      ),
      breakdownByLevel: generateBreakdown(
        filteredLevels,
        totalInvocations,
      ),
      breakdownByDepartment: generateBreakdown(
        filteredDepartments,
        totalInvocations,
      ),
      timeline: generateTimeline(),
    };

    return NextResponse.json(summary);
  } catch (e) {
    console.error('Stats fetch failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '获取统计数据失败' },
      { status: 500 },
    );
  }
}