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

// ─── Minimal XLSX (ZIP-based) generator ──────────────────────────────────────

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files: Array<{ name: string; content: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const { name, content } of files) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(content);
    const size = content.length;

    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);            // version needed
    lv.setUint16(6, 0, true);             // flags
    lv.setUint16(8, 0, true);             // compression (STORE)
    lv.setUint16(10, 0, true);            // mod time
    lv.setUint16(12, 0, true);            // mod date
    lv.setUint32(14, crc, true);          // CRC-32
    lv.setUint32(18, size, true);         // compressed size
    lv.setUint32(22, size, true);         // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // file name length
    lv.setUint16(28, 0, true);            // extra field length
    lh.set(nameBytes, 30);
    localHeaders.push(lh);

    // Central directory header
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);    // signature
    cv.setUint16(4, 20, true);            // version made by
    cv.setUint16(6, 20, true);            // version needed
    cv.setUint16(8, 0, true);             // flags
    cv.setUint16(10, 0, true);            // compression
    cv.setUint16(12, 0, true);            // mod time
    cv.setUint16(14, 0, true);            // mod date
    cv.setUint32(16, crc, true);          // CRC-32
    cv.setUint32(20, size, true);         // compressed size
    cv.setUint32(24, size, true);         // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // file name length
    cv.setUint16(30, 0, true);            // extra field length
    cv.setUint16(32, 0, true);            // comment length
    cv.setUint16(34, 0, true);            // disk number start
    cv.setUint16(36, 0, true);            // internal attributes
    cv.setUint32(38, 0, true);            // external attributes
    cv.setUint32(42, offset, true);       // local header offset
    ch.set(nameBytes, 46);
    centralHeaders.push(ch);

    offset += lh.length + content.length;
  }

  // End of central directory
  const cdOffset = offset;
  const cdSize = centralHeaders.reduce((s, h) => s + h.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);

  const parts: Uint8Array[] = [];
  for (let i = 0; i < files.length; i++) {
    parts.push(localHeaders[i], files[i].content);
  }
  for (const ch of centralHeaders) {
    parts.push(ch);
  }
  parts.push(eocd);

  const total = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateXlsxContent(): Uint8Array {
  const encoder = new TextEncoder();

  const headers = ['Algorithm', 'Input', 'Output', 'ExecutionTime(ms)', 'Timestamp'];
  const rows = [
    ['Helloworld', '-', 'Hello, World!', '0.05', new Date().toISOString()],
    ['SHA-256 Hash', 'Hello, DTCoder!', 'a1b2c3d4...', '0.12', new Date().toISOString()],
    ['Bubble Sort', '5,3,8,1,9,2,7,4,6', '1, 2, 3, 4, 5, 6, 7, 8, 9', '0.08', new Date().toISOString()],
  ];

  // Build shared strings
  const sharedStrings: string[] = [];
  const ssIndex = new Map<string, number>();
  const getSS = (s: string): number => {
    if (ssIndex.has(s)) return ssIndex.get(s)!;
    const idx = sharedStrings.length;
    sharedStrings.push(s);
    ssIndex.set(s, idx);
    return idx;
  };

  const allStrings = [...headers, ...rows.flat()];
  for (const s of allStrings) getSS(s);

  // Shared strings XML
  let ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ` count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">`;
  for (const s of sharedStrings) {
    ssXml += '<si><t>' + escapeXml(s) + '</t></si>';
  }
  ssXml += '</sst>';

  // Sheet XML
  let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetData>';
  // Header row
  sheetXml += '<row r="1">';
  for (let c = 0; c < headers.length; c++) {
    const col = String.fromCharCode(65 + c);
    sheetXml += `<c r="${col}1" t="s"><v>${getSS(headers[c])}</v></c>`;
  }
  sheetXml += '</row>';
  // Data rows
  for (let r = 0; r < rows.length; r++) {
    sheetXml += `<row r="${r + 2}">`;
    for (let c = 0; c < rows[r].length; c++) {
      const col = String.fromCharCode(65 + c);
      sheetXml += `<c r="${col}${r + 2}" t="s"><v>${getSS(rows[r][c])}</v></c>`;
    }
    sheetXml += '</row>';
  }
  sheetXml += '</sheetData></worksheet>';

  // Styles XML (minimal)
  const stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>'
    + '<fills count="2"><fill><patternFill patternType="none"/></fill>'
    + '<fill><patternFill patternType="gray125"/></fill></fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
    + '</styleSheet>';

  // Workbook XML
  const workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';

  // Workbook rels
  const workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1"'
    + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"'
    + ' Target="worksheets/sheet1.xml"/>'
    + '<Relationship Id="rId2"'
    + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings"'
    + ' Target="sharedStrings.xml"/>'
    + '<Relationship Id="rId3"'
    + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"'
    + ' Target="styles.xml"/>'
    + '</Relationships>';

  // Root rels
  const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1"'
    + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"'
    + ' Target="xl/workbook.xml"/>'
    + '</Relationships>';

  // Content types
  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/worksheets/sheet1.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    + '<Override PartName="/xl/sharedStrings.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
    + '<Override PartName="/xl/styles.xml"'
    + ' ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + '</Types>';

  return buildZip([
    { name: '[Content_Types].xml', content: encoder.encode(contentTypes) },
    { name: '_rels/.rels', content: encoder.encode(rootRels) },
    { name: 'xl/workbook.xml', content: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', content: encoder.encode(workbookRels) },
    { name: 'xl/worksheets/sheet1.xml', content: encoder.encode(sheetXml) },
    { name: 'xl/sharedStrings.xml', content: encoder.encode(ssXml) },
    { name: 'xl/styles.xml', content: encoder.encode(stylesXml) },
  ]);
}

// ─── Simple in-memory rate limiter ────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  // CSRF: verify Origin/Referer using exact hostname comparison
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');
  let originHost: string | null = null;
  try { originHost = origin ? new URL(origin).hostname : null; } catch { /* origin 格式异常 */ }
  if (originHost && host && originHost !== host && !referer?.includes(host)) {
    return NextResponse.json({ error: 'CSRF 校验失败' }, { status: 403 });
  }

  // Rate limiting: 10 requests per minute per client IP (export is more expensive)
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  if (!checkRateLimit(clientIp, 10, 60_000)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

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
      const content = generateXlsxContent();
      return new NextResponse(content, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="algorithm-demo-results.xlsx"',
        },
      });
    }

    return NextResponse.json({ error: `不支持的导出格式: ${format}` }, { status: 400 });
  } catch (e) {
    console.error('Export failed:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '导出失败' },
      { status: 500 },
    );
  }
}