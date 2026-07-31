import { db } from '@/lib/drizzle';
import { UpstreamApiError } from '@/lib/trpc/init';
import { and, count, eq, isNull, sql } from 'drizzle-orm';
import {
  staff_cost_budgets,
  staff_employees,
  BudgetType,
  type StaffCostBudget,
} from '@kilocode/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateBudgetInput {
  orgId: string;
  employeeId: number;
  budgetType: number;
  period: string;
  amount: string;
  currency?: string;
  remark?: string;
  creatorId?: string;
}

export interface UpdateBudgetInput {
  id: number;
  amount?: string;
  remark?: string;
  modifierId?: string;
}

export interface ListBudgetInput {
  orgId: string;
  page: number;
  pageSize: number;
  employeeId?: number;
  budgetType?: number;
  period?: string;
}

export interface BudgetListResult {
  list: StaffCostBudget[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validateBudgetType(budgetType: number): asserts budgetType is BudgetType {
  if (!Object.values(BudgetType).includes(budgetType as BudgetType)) {
    throw new UpstreamApiError('BUDGET_005');
  }
}

function validateAmount(amount: string): void {
  const parsed = Number(amount);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new UpstreamApiError('BUDGET_003');
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function createCostBudget(input: CreateBudgetInput): Promise<{ id: number }> {
  validateBudgetType(input.budgetType);
  validateAmount(input.amount);

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
    throw new UpstreamApiError('BUDGET_001');
  }

  // Check uniqueness (employee_id, budget_type, period)
  const [existing] = await db
    .select({ id: staff_cost_budgets.id })
    .from(staff_cost_budgets)
    .where(
      and(
        eq(staff_cost_budgets.employee_id, input.employeeId),
        eq(staff_cost_budgets.budget_type, input.budgetType),
        eq(staff_cost_budgets.period, input.period),
        isNull(staff_cost_budgets.is_deleted)
      )
    )
    .limit(1);

  if (existing) {
    throw new UpstreamApiError('BUDGET_002');
  }

  const [created] = await db
    .insert(staff_cost_budgets)
    .values({
      org_id: input.orgId,
      employee_id: input.employeeId,
      budget_type: input.budgetType,
      period: input.period,
      amount: input.amount,
      currency: input.currency ?? 'CNY',
      remark: input.remark ?? null,
      creator_id: input.creatorId ?? null,
    })
    .returning({ id: staff_cost_budgets.id });

  if (!created) {
    throw new UpstreamApiError('BUDGET_006');
  }

  return { id: created.id };
}

export async function listCostBudget(input: ListBudgetInput): Promise<BudgetListResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(100, Math.max(1, input.pageSize));
  const offset = (page - 1) * pageSize;

  const conditions = [
    eq(staff_cost_budgets.org_id, input.orgId),
    isNull(staff_cost_budgets.is_deleted),
  ];

  if (input.employeeId !== undefined) {
    conditions.push(eq(staff_cost_budgets.employee_id, input.employeeId));
  }
  if (input.budgetType !== undefined) {
    conditions.push(eq(staff_cost_budgets.budget_type, input.budgetType));
  }
  if (input.period) {
    conditions.push(eq(staff_cost_budgets.period, input.period));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ total: count() })
    .from(staff_cost_budgets)
    .where(where);

  const rows = await db
    .select()
    .from(staff_cost_budgets)
    .where(where)
    .orderBy(sql`${staff_cost_budgets.id} DESC`)
    .limit(pageSize)
    .offset(offset);

  return {
    list: rows,
    total: totalRow?.total ?? 0,
    page,
    pageSize,
  };
}

export async function updateCostBudget(input: UpdateBudgetInput): Promise<{
  id: number;
  updatedAt: string;
}> {
  if (input.amount !== undefined) {
    validateAmount(input.amount);
  }

  const [existing] = await db
    .select({ id: staff_cost_budgets.id })
    .from(staff_cost_budgets)
    .where(
      and(eq(staff_cost_budgets.id, input.id), isNull(staff_cost_budgets.is_deleted))
    )
    .limit(1);

  if (!existing) {
    throw new UpstreamApiError('BUDGET_004');
  }

  const updateFields: Partial<typeof staff_cost_budgets.$inferInsert> = {
    gmt_modified: sql`now()`,
  };

  if (input.amount !== undefined) updateFields.amount = input.amount;
  if (input.remark !== undefined) updateFields.remark = input.remark;
  if (input.modifierId !== undefined) updateFields.modifier_id = input.modifierId;

  const [updated] = await db
    .update(staff_cost_budgets)
    .set(updateFields)
    .where(eq(staff_cost_budgets.id, input.id))
    .returning({ gmt_modified: staff_cost_budgets.gmt_modified });

  if (!updated) {
    throw new UpstreamApiError('BUDGET_004');
  }

  return { id: input.id, updatedAt: updated.gmt_modified };
}

export async function deleteCostBudget(
  id: number,
  orgId: string
): Promise<{ id: number; deleted: boolean }> {
  const [existing] = await db
    .select({ id: staff_cost_budgets.id })
    .from(staff_cost_budgets)
    .where(
      and(
        eq(staff_cost_budgets.id, id),
        eq(staff_cost_budgets.org_id, orgId),
        isNull(staff_cost_budgets.is_deleted)
      )
    )
    .limit(1);

  if (!existing) {
    throw new UpstreamApiError('BUDGET_004');
  }

  await db
    .update(staff_cost_budgets)
    .set({ is_deleted: true, gmt_modified: sql`now()` })
    .where(eq(staff_cost_budgets.id, id));

  return { id, deleted: true };
}
