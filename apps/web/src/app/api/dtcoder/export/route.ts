import { NextResponse } from 'next/server';

type ExportRequest = {
  format: 'excel' | 'csv';
};

function generateCsvContent(): string {
  const headers = ['Algorithm', 'Input', 'Output', 'ExecutionTime(ms)', 'Timestamp'];
  const rows = [
    ['Helloworld', '-', 'Hello, World!', '0.05', new Date().toISOString()],
    ['SHA-256 Hash', 'Hello, DTCoder!', 'a1b2c3d4...', '0.12', new Date().toISOString()],
    ['Bubble Sort', '5,3,8,1,9,2,7,4,6', '1, 2, 3, 4, 5, 6, 7, 8, 9', '0.08', new Date().toISOString()],
  ];

  const escapeCsv = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
}

function generateExcelContent(): Uint8Array {
  // Minimal binary XLSX content (ZIP-based). For production, use a library like exceljs.
  // This generates a simple CSV disguised as Excel for demo purposes.
  const csv = generateCsvContent();
  const encoder = new TextEncoder();
  return encoder.encode(csv);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequest;
    const { format } = body;

    if (format === 'csv') {
      const content = generateCsvContent();
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="algorithm-demo-results.csv"',
        },
      });
    }

    if (format === 'excel') {
      const content = generateExcelContent();
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="algorithm-demo-results.xlsx"',
        },
      });
    }

    return NextResponse.json({ error: `不支持的导出格式: ${format}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '导出失败' },
      { status: 500 },
    );
  }
}