import { db } from '@/lib/drizzle';
import { UpstreamApiError } from '@/lib/trpc/init';
import { and, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import {
  staff_cost_budgets,
  staff_employees,
  staff_whitelists,
  EmployeeStatus,
  type StaffEmployee,
} from '@kilocode/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateStaffInput {
  orgId: string;
  employeeNo: string;
  name: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  idCardNo?: string;
  status?: number;
  entryDate?: string;
  remark?: string;
  creatorId?: string;
}

export interface UpdateStaffInput {
  id: number;
  name?: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  status?: number;
  entryDate?: string;
  leaveDate?: string;
  remark?: string;
  modifierId?: string;
}

export interface ListStaffInput {
  orgId: string;
  page: number;
  pageSize: number;
  keyword?: string;
  department?: string;
  status?: number;
}

export interface StaffListResult {
  list: MaskedStaffEmployee[];
  total: number;
  page: number;
  pageSize: number;
}

/** Employee with sensitive fields masked for API output. */
export type MaskedStaffEmployee = Omit<StaffEmployee, 'phone' | 'id_card_no'> & {
  phone: string | null;
  idCardNo: string | null;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const PHONE_REGEX = /^\+?[\d\s-]{6,20}$/;

function validatePhone(phone: string | undefined): void {
  if (phone && !PHONE_REGEX.test(phone)) {
    throw new UpstreamApiError('STAFF_003');
  }
}

function validateStaffStatus(status: number | undefined): asserts status is EmployeeStatus {
  if (status !== undefined && !Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
    throw new UpstreamApiError('STAFF_008');
  }
}

/** Mask the middle 4 digits of a phone number for display. */
export function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function maskEmployee(row: StaffEmployee): MaskedStaffEmployee {
  const { id_card_no, phone, ...rest } = row;
  return {
    ...rest,
    phone: maskPhone(phone),
    idCardNo: id_card_no ? '******' : null,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function createStaff(input: CreateStaffInput): Promise<{
  id: number;
  employeeNo: string;
  name: string;
}> {
  validatePhone(input.phone);
  validateStaffStatus(input.status);

  if (input.status === EmployeeStatus.Resigned && !input.entryDate) {
    throw new UpstreamApiError('STAFF_002');
  }

  // Check employee_no uniqueness within org (among non-deleted rows)
  const existing = await db
    .select({ id: staff_employees.id })
    .from(staff_employees)
    .where(
      and(
        eq(staff_employees.org_id, input.orgId),
        eq(staff_employees.employee_no, input.employeeNo),
        isNull(staff_employees.is_deleted)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new UpstreamApiError('STAFF_001');
  }

  const [created] = await db
    .insert(staff_employees)
    .values({
      org_id: input.orgId,
      employee_no: input.employeeNo,
      name: input.name,
      department: input.department ?? null,
      position: input.position ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      id_card_no: input.idCardNo ?? null,
      status: (input.status ?? EmployeeStatus.Active) as EmployeeStatus,
      entry_date: input.entryDate ?? null,
      leave_date: input.leaveDate ?? null,
      remark: input.remark ?? null,
      creator_id: input.creatorId ?? null,
    })
    .returning({ id: staff_employees.id });

  if (!created) {
    throw new UpstreamApiError('STAFF_009');
  }

  return { id: created.id, employeeNo: input.employeeNo, name: input.name };
}

export async function listStaff(input: ListStaffInput): Promise<StaffListResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(staff_employees.org_id, input.orgId),
    isNull(staff_employees.is_deleted),
  ];

  if (input.keyword) {
    const kw = `%${input.keyword}%`;
    conditions.push(
      or(ilike(staff_employees.name, kw), ilike(staff_employees.employee_no, kw))!
    );
  }
  if (input.department) {
    conditions.push(eq(staff_employees.department, input.department));
  }
  if (input.status !== undefined) {
    conditions.push(eq(staff_employees.status, input.status));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(staff_employees)
    .where(where);

  const rows = await db
    .select()
    .from(staff_employees)
    .where(where)
    .orderBy(sql`${staff_employees.id} DESC`)
    .limit(pageSize)
    .offset(offset);

  return {
    list: rows.map(maskEmployee),
    total: totalRow?.total ?? 0,
    page,
    pageSize,
  };
}

export async function updateStaff(input: UpdateStaffInput): Promise<{
  id: number;
  updatedAt: string;
}> {
  validatePhone(input.phone);
  validateStaffStatus(input.status);

  // When status becomes Resigned, leaveDate must be provided
  if (input.status === EmployeeStatus.Resigned && !input.leaveDate) {
    throw new UpstreamApiError('STAFF_002');
  }

  const [existing] = await db
    .select()
    .from(staff_employees)
    .where(
      and(
        eq(staff_employees.id, input.id),
        isNull(staff_employees.is_deleted)
      )
    )
    .limit(1);

  if (!existing) {
    throw new UpstreamApiError('STAFF_005');
  }

  const updateFields: Partial<typeof staff_employees.$inferInsert> = {
    gmt_modified: sql`now()`,
  };

  if (input.name !== undefined) updateFields.name = input.name;
  if (input.department !== undefined) updateFields.department = input.department;
  if (input.position !== undefined) updateFields.position = input.position;
  if (input.phone !== undefined) updateFields.phone = input.phone;
  if (input.email !== undefined) updateFields.email = input.email;
  if (input.status !== undefined) updateFields.status = input.status;
  if (input.entryDate !== undefined) updateFields.entry_date = input.entryDate;
  if (input.leaveDate !== undefined) updateFields.leave_date = input.leaveDate;
  if (input.remark !== undefined) updateFields.remark = input.remark;
  if (input.modifierId !== undefined) updateFields.modifier_id = input.modifierId;

  const [updated] = await db
    .update(staff_employees)
    .set(updateFields)
    .where(eq(staff_employees.id, input.id))
    .returning({ gmt_modified: staff_employees.gmt_modified });

  if (!updated) {
    throw new UpstreamApiError('STAFF_005');
  }

  return { id: input.id, updatedAt: updated.gmt_modified };
}

export async function deleteStaff(
  id: number,
  orgId: string
): Promise<{ id: number; deleted: boolean }> {
  // Check existence
  const [existing] = await db
    .select({ id: staff_employees.id })
    .from(staff_employees)
    .where(
      and(eq(staff_employees.id, id), isNull(staff_employees.is_deleted))
    )
    .limit(1);

  if (!existing) {
    throw new UpstreamApiError('STAFF_005');
  }

  // Check for associated cost_budget / whitelist records
  const [budgetCount] = await db
    .select({ c: count() })
    .from(staff_cost_budgets)
    .where(
      and(
        eq(staff_cost_budgets.employee_id, id),
        isNull(staff_cost_budgets.is_deleted)
      )
    );

  const [wlCount] = await db
    .select({ c: count() })
    .from(staff_whitelists)
    .where(
      and(
        eq(staff_whitelists.employee_id, id),
        isNull(staff_whitelists.is_deleted)
      )
    );

  if ((budgetCount?.c ?? 0) > 0 || (wlCount?.c ?? 0) > 0) {
    throw new UpstreamApiError('STAFF_007');
  }

  await db
    .update(staff_employees)
    .set({ is_deleted: true, gmt_modified: sql`now()` })
    .where(eq(staff_employees.id, id));

  return { id, deleted: true };
}

/** Fetch a single non-deleted employee by id within an org. */
export async function getStaffById(
  id: number,
  orgId: string
): Promise<MaskedStaffEmployee | null> {
  const [row] = await db
    .select()
    .from(staff_employees)
    .where(
      and(
        eq(staff_employees.id, id),
        eq(staff_employees.org_id, orgId),
        isNull(staff_employees.is_deleted)
      )
    )
    .limit(1);

  return row ? maskEmployee(row) : null;
}
