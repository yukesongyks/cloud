import { db } from '@/lib/drizzle';
import { UpstreamApiError } from '@/lib/trpc/init';
import { and, count, eq, isNull, lte, sql } from 'drizzle-orm';
import {
  staff_employees,
  staff_whitelists,
  WhitelistStatus,
  WhitelistType,
  type StaffWhitelist,
} from '@kilocode/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AddWhitelistInput {
  orgId: string;
  employeeId: number;
  wlType: number;
  effectiveDate: string;
  expireDate?: string;
  remark?: string;
  creatorId?: string;
}

export interface ListWhitelistInput {
  orgId: string;
  page: number;
  pageSize: number;
  employeeId?: number;
  wlType?: number;
  status?: number;
}

export interface WhitelistListResult {
  list: StaffWhitelist[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateWhitelistType(wlType: number): asserts wlType is WhitelistType {
  if (!Object.values(WhitelistType).includes(wlType as WhitelistType)) {
    throw new UpstreamApiError('WL_005');
  }
}

function validateDates(effectiveDate: string, expireDate?: string): void {
  if (expireDate && new Date(expireDate) <= new Date(effectiveDate)) {
    throw new UpstreamApiError('WL_003');
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function addWhitelist(input: AddWhitelistInput): Promise<{ id: number }> {
  validateWhitelistType(input.wlType);
  validateDates(input.effectiveDate, input.expireDate);

  // Verify employee exists within the org
  const [employee] = await db
    .select({ id: staff_employees.id })
    .from(staff_employees)
    .where(
      and(
        eq(staff_employees.id, input.employeeId),
        eq(staff_employees.org_id, input.orgId),
        isNull(staff_employees.is_deleted)
      )
    )
    .limit(1);

  if (!employee) {
    throw new UpstreamApiError('WL_001');
  }

  // Check for an existing active record of same type for this employee
  const [existing] = await db
    .select({ id: staff_whitelists.id })
    .from(staff_whitelists)
    .where(
      and(
        eq(staff_whitelists.employee_id, input.employeeId),
        eq(staff_whitelists.wl_type, input.wlType),
        eq(staff_whitelists.status, WhitelistStatus.Active),
        isNull(staff_whitelists.is_deleted)
      )
    )
    .limit(1);

  if (existing) {
    throw new UpstreamApiError('WL_002');
  }

  let created: { id: number } | undefined;
  try {
    [created] = await db
      .insert(staff_whitelists)
      .values({
        org_id: input.orgId,
        employee_id: input.employeeId,
        wl_type: input.wlType,
        status: WhitelistStatus.Active,
        effective_date: input.effectiveDate,
        expire_date: input.expireDate ?? null,
        remark: input.remark ?? null,
        creator_id: input.creatorId ?? null,
      })
      .returning({ id: staff_whitelists.id });
  } catch (err) {
    // G1.1: DB unique constraint violation (uk_staff_wl_emp_type) — concurrent TOCTOU race
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      throw new UpstreamApiError('WL_002');
    }
    throw err;
  }

  if (!created) {
    throw new UpstreamApiError('WL_006');
  }

  return { id: created.id };
}

export async function listWhitelist(input: ListWhitelistInput): Promise<WhitelistListResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(staff_whitelists.org_id, input.orgId),
    isNull(staff_whitelists.is_deleted),
  ];

  if (input.employeeId !== undefined) {
    conditions.push(eq(staff_whitelists.employee_id, input.employeeId));
  }
  if (input.wlType !== undefined) {
    conditions.push(eq(staff_whitelists.wl_type, input.wlType));
  }
  if (input.status !== undefined) {
    conditions.push(eq(staff_whitelists.status, input.status));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(staff_whitelists)
    .where(where);

  const rows = await db
    .select()
    .from(staff_whitelists)
    .where(where)
    .orderBy(sql`${staff_whitelists.id} DESC`)
    .limit(pageSize)
    .offset(offset);

  return {
    list: rows,
    total: totalRow?.total ?? 0,
    page,
    pageSize,
  };
}

export async function removeWhitelist(
  id: number,
  orgId: string
): Promise<{ id: number; deleted: boolean }> {
  const [existing] = await db
    .select({ id: staff_whitelists.id })
    .from(staff_whitelists)
    .where(
      and(
        eq(staff_whitelists.id, id),
        eq(staff_whitelists.org_id, orgId),
        isNull(staff_whitelists.is_deleted)
      )
    )
    .limit(1);

  if (!existing) {
    throw new UpstreamApiError('WL_004');
  }

  await db
    .update(staff_whitelists)
    .set({ is_deleted: true, gmt_modified: sql`now()` })
    .where(eq(staff_whitelists.id, id));

  return { id, deleted: true };
}

/**
 * Expire whitelist records whose expire_date has passed.
 * Called opportunistically during list queries or via a scheduled job.
 */
export async function expireOverdueWhitelists(orgId?: string): Promise<number> {
  const now = new Date().toISOString().slice(0, 10);

  const conditions = [
    eq(staff_whitelists.status, WhitelistStatus.Active),
    isNull(staff_whitelists.is_deleted),
    // P1 fix: only expire records whose expire_date has passed.
    // expire_date IS NULL means "never expires" — SQL `NULL <= now` yields NULL (not true),
    // so those records are naturally excluded and must NOT be marked as Expired.
    lte(staff_whitelists.expire_date, now),
  ];

  if (orgId) {
    conditions.push(eq(staff_whitelists.org_id, orgId));
  }

  const result = await db
    .update(staff_whitelists)
    .set({ status: WhitelistStatus.Expired, gmt_modified: sql`now()` })
    .where(and(...conditions))
    .returning({ id: staff_whitelists.id });

  return result.length;
}
