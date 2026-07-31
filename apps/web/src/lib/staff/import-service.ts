import { db } from '@/lib/drizzle';
import { UpstreamApiError } from '@/lib/trpc/init';
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  staff_employees,
  staff_import_tasks,
  EmployeeStatus,
  ImportTaskStatus,
  ImportTaskType,
  type StaffImportTask,
} from '@kilocode/db/schema';
import { createStaff } from '@/lib/staff/staff-service';
import { addWhitelist } from '@/lib/staff/whitelist-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_IMPORT_ROWS = 5000;
const BATCH_SIZE = 100;

// Required columns for staff import template
export const STAFF_IMPORT_COLUMNS = [
  'employeeNo',
  'name',
  'department',
  'position',
  'phone',
  'email',
  'status',
  'entryDate',
  'remark',
] as const;

const REQUIRED_STAFF_COLUMNS = ['employeeNo', 'name'] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportRow {
  employeeNo: string;
  name: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  status?: string;
  entryDate?: string;
  remark?: string;
}

export interface FailItem {
  row: number;
  reason: string;
  data: string;
}

export interface BatchImportResult {
  taskId: number;
  totalCount: number;
  successCount: number;
  failCount: number;
  failDetail: FailItem[];
}

export interface ListImportTasksInput {
  orgId: string;
  page: number;
  pageSize: number;
  taskType?: number;
}

export interface ImportTaskListResult {
  list: StaffImportTask[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export function getImportTemplate(taskType: ImportTaskType): {
  downloadUrl: string;
  columns: string[];
} {
  if (taskType === ImportTaskType.StaffImport) {
    return {
      downloadUrl: '/templates/staff_import_template.csv',
      columns: [...STAFF_IMPORT_COLUMNS],
    };
  }
  // Whitelist import template
  return {
    downloadUrl: '/templates/whitelist_import_template.csv',
    columns: ['employeeNo', 'wlType', 'effectiveDate', 'expireDate', 'remark'],
  };
}

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/**
 * Parse a simple CSV string into rows of string arrays.
 * Handles quoted fields with embedded commas and escaped quotes.
 */
export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        if (csvText[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentField = '';
        currentRow = [];
      } else if (char === '\r') {
        // Skip — handled by \n
      } else {
        currentField += char;
      }
    }
  }

  // Push the last field/row if any content remains
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter(r => r.length > 0 && !(r.length === 1 && r[0] === ''));
}

/**
 * Map raw CSV rows (with header) to typed ImportRow objects.
 * Returns { validRows, failItems }.
 */
export function mapAndValidateRows(
  rawRows: string[][],
  startRowNumber: number
): { mapped: ImportRow[]; fails: FailItem[] } {
  if (rawRows.length === 0) {
    return { mapped: [], fails: [] };
  }

  const header = rawRows[0].map(h => h.trim().toLowerCase());
  const colIndex: Record<string, number> = {};
  header.forEach((col, idx) => {
    colIndex[col] = idx;
  });

  // Verify required columns exist
  for (const req of REQUIRED_STAFF_COLUMNS) {
    if (colIndex[req.toLowerCase()] === undefined) {
      throw new UpstreamApiError('IMPORT_004');
    }
  }

  const mapped: ImportRow[] = [];
  const fails: FailItem[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = startRowNumber + i;

    const employeeNo = row[colIndex['employeeno']]?.trim() ?? '';
    const name = row[colIndex['name']]?.trim() ?? '';

    if (!employeeNo || !name) {
      fails.push({
        row: rowNumber,
        reason: '必填字段缺失（工号或姓名）',
        data: row.join(','),
      });
      continue;
    }

    mapped.push({
      employeeNo,
      name,
      department: row[colIndex['department']]?.trim() || undefined,
      position: row[colIndex['position']]?.trim() || undefined,
      phone: row[colIndex['phone']]?.trim() || undefined,
      email: row[colIndex['email']]?.trim() || undefined,
      status: row[colIndex['status']]?.trim() || undefined,
      entryDate: row[colIndex['entrydate']]?.trim() || undefined,
      remark: row[colIndex['remark']]?.trim() || undefined,
    });
  }

  return { mapped, fails };
}

// ---------------------------------------------------------------------------
// Batch import
// ---------------------------------------------------------------------------

export async function batchImportStaff(input: {
  orgId: string;
  fileName: string;
  csvContent: string;
  creatorId?: string;
}): Promise<BatchImportResult> {
  const { orgId, fileName, csvContent, creatorId } = input;

  if (!csvContent || csvContent.trim().length === 0) {
    throw new UpstreamApiError('IMPORT_002');
  }

  const rawRows = parseCsv(csvContent);

  if (rawRows.length <= 1) {
    // Only header or empty
    throw new UpstreamApiError('IMPORT_002');
  }

  // Subtract header row
  const dataRowCount = rawRows.length - 1;
  if (dataRowCount > MAX_IMPORT_ROWS) {
    throw new UpstreamApiError('IMPORT_003');
  }

  // Create import task record (status=Processing)
  const [task] = await db
    .insert(staff_import_tasks)
    .values({
      org_id: orgId,
      task_type: ImportTaskType.StaffImport,
      file_name: fileName,
      total_count: dataRowCount,
      success_count: 0,
      fail_count: 0,
      status: ImportTaskStatus.Processing,
      creator_id: creatorId ?? null,
    })
    .returning({ id: staff_import_tasks.id });

  if (!task) {
    throw new UpstreamApiError('IMPORT_005');
  }

  const { mapped, fails } = mapAndValidateRows(rawRows, 1);

  // Deduplicate within file — keep first occurrence of each employeeNo
  // Track original CSV row number (1-based data rows start at line 2 in the file, header is line 1).
  const seenNos = new Set<string>();
  const deduped: ImportRow[] = [];
  const dedupFails: FailItem[] = [];
  const rowNumbers: number[] = [];

  for (let idx = 0; idx < mapped.length; idx++) {
    const row = mapped[idx];
    const csvRowNumber = idx + 2; // header=1, first data row=2
    if (seenNos.has(row.employeeNo)) {
      dedupFails.push({
        row: csvRowNumber,
        reason: '文件内工号重复，已跳过',
        data: `${row.employeeNo},${row.name}`,
      });
      continue;
    }
    seenNos.add(row.employeeNo);
    deduped.push(row);
    rowNumbers.push(csvRowNumber);
  }

  let successCount = 0;
  const allFails: FailItem[] = [...fails, ...dedupFails];

  // Insert in batches
  let rowIdx = 0;
  try {
    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
      const batch = deduped.slice(i, i + BATCH_SIZE);
      const batchFails: FailItem[] = [];

      for (const row of batch) {
        const csvRowNumber = rowNumbers[rowIdx++];
        try {
          await createStaff({
            orgId,
            employeeNo: row.employeeNo,
            name: row.name,
            department: row.department,
            position: row.position,
            phone: row.phone,
            email: row.email,
            status: parseStatus(row.status),
            entryDate: row.entryDate,
            remark: row.remark,
            creatorId,
          });
          successCount++;
        } catch (err) {
          const reason =
            err instanceof UpstreamApiError
              ? err.upstreamCode === 'STAFF_001'
                ? '工号已存在'
                : err.upstreamCode
              : `写入失败: ${err instanceof Error ? err.message : String(err)}`;
          console.error('[import] staff row failed', csvRowNumber, err);
          batchFails.push({
            row: csvRowNumber,
            reason,
            data: `${row.employeeNo},${row.name}`,
          });
        }
      }

      allFails.push(...batchFails);
    }
  } finally {
    // G3.2: Ensure task status is updated even if the process crashes mid-import.
    const failCount = allFails.length;
    const finalStatus =
      failCount === 0
        ? ImportTaskStatus.Success
        : successCount > 0
          ? ImportTaskStatus.PartialFail
          : ImportTaskStatus.Fail;

    const failDetailJson = JSON.stringify(allFails.slice(0, 200));

    await db
      .update(staff_import_tasks)
      .set({
        success_count: successCount,
        fail_count: failCount,
        status: finalStatus,
        fail_detail: failDetailJson,
        gmt_modified: sql`now()`,
      })
      .where(eq(staff_import_tasks.id, task.id));
  }

  const failCount = allFails.length;

  return {
    taskId: task.id,
    totalCount: dataRowCount,
    successCount,
    failCount,
    failDetail: allFails.slice(0, 200),
  };
}

function parseStatus(statusStr?: string): number | undefined {
  if (!statusStr) return undefined;
  const lower = statusStr.toLowerCase();
  if (lower === 'active' || lower === '在职' || lower === '1')
    return EmployeeStatus.Active;
  if (lower === 'probation' || lower === '试用期' || lower === '2')
    return EmployeeStatus.Probation;
  if (lower === 'resigned' || lower === '离职' || lower === '3')
    return EmployeeStatus.Resigned;
  return undefined;
}

// ---------------------------------------------------------------------------
// Import task history
// ---------------------------------------------------------------------------

export async function listImportTasks(input: ListImportTasksInput): Promise<ImportTaskListResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(staff_import_tasks.org_id, input.orgId),
    isNull(staff_import_tasks.is_deleted),
  ];

  if (input.taskType !== undefined) {
    conditions.push(eq(staff_import_tasks.task_type, input.taskType));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(staff_import_tasks)
    .where(where);

  const rows = await db
    .select()
    .from(staff_import_tasks)
    .where(where)
    .orderBy(sql`${staff_import_tasks.id} DESC`)
    .limit(pageSize)
    .offset(offset);

  return {
    list: rows,
    total: totalRow?.total ?? 0,
    page,
    pageSize,
  };
}

// ---------------------------------------------------------------------------
// Whitelist batch import
// ---------------------------------------------------------------------------

/** Required columns for whitelist import template */
const REQUIRED_WHITELIST_COLUMNS = ['employeeNo', 'wlType', 'effectiveDate'] as const;

export interface WhitelistImportRow {
  employeeNo: string;
  wlType: string;
  effectiveDate: string;
  expireDate?: string;
  remark?: string;
}

/**
 * Parse a numeric whitelist type from CSV text.
 * Accepts: "1", "access", "准入", "2", "benefit", "权益"
 */
function parseWhitelistType(typeStr: string): number {
  const lower = typeStr.toLowerCase();
  if (lower === '1' || lower === 'access' || lower === '准入') return 1;
  if (lower === '2' || lower === 'benefit' || lower === '权益') return 2;
  throw new UpstreamApiError('WL_005');
}

export async function batchImportWhitelist(input: {
  orgId: string;
  fileName: string;
  csvContent: string;
  creatorId?: string;
}): Promise<BatchImportResult> {
  const { orgId, fileName, csvContent, creatorId } = input;

  if (!csvContent || csvContent.trim().length === 0) {
    throw new UpstreamApiError('IMPORT_002');
  }

  const rawRows = parseCsv(csvContent);

  if (rawRows.length <= 1) {
    throw new UpstreamApiError('IMPORT_002');
  }

  const dataRowCount = rawRows.length - 1;
  if (dataRowCount > MAX_IMPORT_ROWS) {
    throw new UpstreamApiError('IMPORT_003');
  }

  // Create import task record (status=Processing)
  const [task] = await db
    .insert(staff_import_tasks)
    .values({
      org_id: orgId,
      task_type: ImportTaskType.WhitelistImport,
      file_name: fileName,
      total_count: dataRowCount,
      success_count: 0,
      fail_count: 0,
      status: ImportTaskStatus.Processing,
      creator_id: creatorId ?? null,
    })
    .returning({ id: staff_import_tasks.id });

  if (!task) {
    throw new UpstreamApiError('IMPORT_005');
  }

  // Parse header and map rows
  const header = rawRows[0].map(h => h.trim().toLowerCase());
  const colIndex: Record<string, number> = {};
  header.forEach((col, idx) => {
    colIndex[col] = idx;
  });

  // Verify required columns exist
  for (const req of REQUIRED_WHITELIST_COLUMNS) {
    if (colIndex[req.toLowerCase()] === undefined) {
      throw new UpstreamApiError('IMPORT_004');
    }
  }

  const allFails: FailItem[] = [];
  let successCount = 0;

  // Deduplicate within file — keep first occurrence of each (employeeNo, wlType) pair.
  // Must run before the batch-fetch below, which references dedupedRows.
  const seenPairs = new Set<string>();
  const dedupedRows: { rowNumber: number; data: WhitelistImportRow }[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNumber = i;

    const employeeNo = row[colIndex['employeeno']]?.trim() ?? '';
    const wlTypeStr = row[colIndex['wltype']]?.trim() ?? '';
    const effectiveDate = row[colIndex['effectivedate']]?.trim() ?? '';

    if (!employeeNo || !wlTypeStr || !effectiveDate) {
      allFails.push({
        row: rowNumber,
        reason: '必填字段缺失（工号/白名单类型/生效日期）',
        data: row.join(','),
      });
      continue;
    }

    const dedupKey = `${employeeNo}|${wlTypeStr}`;
    if (seenPairs.has(dedupKey)) {
      allFails.push({
        row: rowNumber,
        reason: '文件内同工号同类型重复，已跳过',
        data: row.join(','),
      });
      continue;
    }
    seenPairs.add(dedupKey);

    dedupedRows.push({
      rowNumber,
      data: {
        employeeNo,
        wlType: wlTypeStr,
        effectiveDate,
        expireDate: colIndex['expiredate'] !== undefined ? (row[colIndex['expiredate']]?.trim() || undefined) : undefined,
        remark: colIndex['remark'] !== undefined ? (row[colIndex['remark']]?.trim() || undefined) : undefined,
      },
    });
  }

  // Batch-fetch only the employees referenced in this import file (by employeeNo),
  // instead of loading the entire org's employee table — avoids OOM for large orgs.
  const uniqueNos = [...new Set(dedupedRows.map(r => r.data.employeeNo))];
  const empMap = new Map<string, number>();
  for (let i = 0; i < uniqueNos.length; i += BATCH_SIZE) {
    const batchNos = uniqueNos.slice(i, i + BATCH_SIZE);
    const batchEmployees = await db
      .select({ id: staff_employees.id, employee_no: staff_employees.employee_no })
      .from(staff_employees)
      .where(
        and(
          eq(staff_employees.org_id, orgId),
          inArray(staff_employees.employee_no, batchNos),
          isNull(staff_employees.is_deleted)
        )
      );
    for (const emp of batchEmployees) {
      empMap.set(emp.employee_no, emp.id);
    }
  }

  // Process each row — call addWhitelist which validates employee existence, uniqueness, and date validity
  try {
    for (const { rowNumber, data } of dedupedRows) {
      try {
        const employeeId = empMap.get(data.employeeNo);
        if (!employeeId) {
          allFails.push({
            row: rowNumber,
            reason: 'WL_001 员工不存在',
            data: data.employeeNo,
          });
          continue;
        }

        const wlType = parseWhitelistType(data.wlType);

        await addWhitelist({
          orgId,
          employeeId,
          wlType,
          effectiveDate: data.effectiveDate,
          expireDate: data.expireDate,
          remark: data.remark,
          creatorId,
        });
        successCount++;
      } catch (err) {
        const reason =
          err instanceof UpstreamApiError
            ? err.upstreamCode === 'WL_002'
              ? '同员工同类型已有生效记录'
              : err.upstreamCode
            : `写入失败: ${err instanceof Error ? err.message : String(err)}`;
        console.error('[import] whitelist row failed', rowNumber, err);
        allFails.push({
          row: rowNumber,
          reason,
          data: `${data.employeeNo},${data.wlType}`,
        });
      }
    }
  } finally {
    // G3.2: Ensure task status is updated even if the process crashes mid-import.
    const failCount = allFails.length;
    const finalStatus =
      failCount === 0
        ? ImportTaskStatus.Success
        : successCount > 0
          ? ImportTaskStatus.PartialFail
          : ImportTaskStatus.Fail;

    const failDetailJson = JSON.stringify(allFails.slice(0, 200));

    await db
      .update(staff_import_tasks)
      .set({
        success_count: successCount,
        fail_count: failCount,
        status: finalStatus,
        fail_detail: failDetailJson,
        gmt_modified: sql`now()`,
      })
      .where(eq(staff_import_tasks.id, task.id));
  }

  const failCount = allFails.length;

  return {
    taskId: task.id,
    totalCount: dataRowCount,
    successCount,
    failCount,
    failDetail: allFails.slice(0, 200),
  };
}
