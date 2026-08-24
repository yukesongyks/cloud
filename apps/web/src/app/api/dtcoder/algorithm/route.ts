import { NextResponse } from 'next/server';
import crypto from 'crypto';

type AlgorithmRequest = {
  kind: 'helloworld' | 'hash' | 'bubblesort';
  input?: string;
};

function bubbleSort(arr: number[]): number[] {
  const result = [...arr];
  const n = result.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (result[j] > result[j + 1]) {
        const temp = result[j];
        result[j] = result[j + 1];
        result[j + 1] = temp;
      }
    }
  }
  return result;
}

export async function POST(request: Request) {
  // CSRF: verify Origin/Referer (Next.js middleware should handle CSRF tokens globally)
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  if (origin && host && !origin.endsWith(host) && !referer?.includes(host)) {
    return NextResponse.json({ error: 'CSRF 校验失败' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as AlgorithmRequest;
    const { kind, input } = body;

    const start = performance.now();
    let output: string;

    switch (kind) {
      case 'helloworld':
        output = 'Hello, World!';
        break;
      case 'hash': {
        const hashInput = input || 'Hello, DTCoder!';
        // Server-side input length validation
        if (hashInput.length > 10000) {
          return NextResponse.json(
            { error: '输入长度不能超过 10000 个字符' },
            { status: 400 },
          );
        }
        output = crypto.createHash('sha256').update(hashInput).digest('hex');
        break;
      }
      case 'bubblesort': {
        const rawInput = input || '5,3,8,1,9,2,7,4,6';
        const nums = rawInput
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n));
        if (nums.length === 0) {
          return NextResponse.json({ error: '无效的输入: 需要逗号分隔的整数' }, { status: 400 });
        }
        // Server-side array length validation
        if (nums.length > 1000) {
          return NextResponse.json(
            { error: '数组长度不能超过 1000' },
            { status: 400 },
          );
        }
        const sorted = bubbleSort(nums);
        output = sorted.join(', ');
        break;
      }
      default:
        return NextResponse.json({ error: `未知算法类型: ${kind}` }, { status: 400 });
    }

    const end = performance.now();
    const executionTimeMs = Math.round((end - start) * 100) / 100;

    return NextResponse.json({
      kind,
      input: input || '',
      output,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Algorithm execution failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '执行失败' },
      { status: 500 },
    );
  }
}