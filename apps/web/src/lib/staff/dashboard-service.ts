import { db, readDb } from '@/lib/drizzle';
import { and, count, eq, isNull, sql, sum } from 'drizzle-orm';
import {
  staff_cost_budgets,
  staff_employees,
  staff_whitelists,
  EmployeeStatus,
  WhitelistStatus,
} from '@kilocode/db/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  totalEmployees: number;
  activeCount: number;
  probationCount: number;
  resignedCount: number;
  whitelistCount: number;
  totalBudget: string;
}

export interface DeptStat {
  department: string | null;
  employeeCount: number;
  budgetAmount: string;
  whitelistCount: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * Get the current month period string (YYYY-MM).
 */
function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getDashboardSummary(
  orgId: string,
  department?: string
): Promise<DashboardSummary> {
  // Base conditions: org-scoped, non-deleted
  const baseConditions = [eq(staff_employees.org_id, orgId), isNull(staff_employees.is_deleted)];
  if (department) {
    baseConditions.push(eq(staff_employees.department, department));
  }
  const baseWhere = and(...baseConditions);

  // Status breakdown via group by
  const statusBreakdown = await readDb
    .select({
      status: staff_employees.status,
      count: count(),
    })
    .from(staff_employees)
    .where(baseWhere)
    .groupBy(staff_employees.status);

  let activeCount = 0;
  let probationCount = 0;
  let resignedCount = 0;
  for (const row of statusBreakdown) {
    if (row.status === EmployeeStatus.Active) activeCount = row.count;
    else if (row.status === EmployeeStatus.Probation) probationCount = row.count;
    else if (row.status === EmployeeStatus.Resigned) resignedCount = row.count;
  }
  const totalEmployees = activeCount + probationCount + resignedCount;

  // Whitelist count — active status, scoped to employees in this org
  const [wlRow] = await readDb
    .select({ c: count() })
    .from(staff_whitelists)
    .where(
      and(
        eq(staff_whitelists.org_id, orgId),
        eq(staff_whitelists.status, WhitelistStatus.Active),
        isNull(staff_whitelists.is_deleted)
      )
    );

  // Total budget for current period
  const currentPeriod = getCurrentPeriod();
  const [budgetRow] = await readDb
    .select({ total: sum(staff_cost_budgets.amount) })
    .from(staff_cost_budgets)
    .where(
      and(
        eq(staff_cost_budgets.org_id, orgId),
        eq(staff_cost_budgets.period, currentPeriod),
        isNull(staff_cost_budgets.is_deleted)
      )
    );

  return {
    totalEmployees,
    activeCount,
    probationCount,
    resignedCount,
    whitelistCount: wlRow?.c ?? 0,
    totalBudget: budgetRow?.total ?? '0',
  };
}

export async function getDashboardByDepartment(
  orgId: string,
  period?: string
): Promise<DeptStat[]> {
  const targetPeriod = period ?? getCurrentPeriod();

  // Employee count by department
  const empByDept = await readDb
    .select({
      department: staff_employees.department,
      employeeCount: count(),
    })
    .from(staff_employees)
    .where(
      and(
        eq(staff_employees.org_id, orgId),
        isNull(staff_employees.is_deleted)
      )
    )
    .groupBy(staff_employees.department);

  // Budget sum by department for the target period
  // Need to join through employee to get department
  const budgetByDept = await readDb
    .select({
      department: staff_employees.department,
      budgetAmount: sum(staff_cost_budgets.amount),
    })
    .from(staff_cost_budgets)
    .innerJoin(staff_employees, eq(staff_employees.id, staff_cost_budgets.employee_id))
    .where(
      and(
        eq(staff_cost_budgets.org_id, orgId),
        eq(staff_cost_budgets.period, targetPeriod),
        isNull(staff_cost_budgets.is_deleted),
        isNull(staff_employees.is_deleted)
      )
    )
    .groupBy(staff_employees.department);

  // Whitelist count by department (via employee join)
  const wlByDept = await readDb
    .select({
      department: staff_employees.department,
      whitelistCount: count(),
    })
    .from(staff_whitelists)
    .innerJoin(staff_employees, eq(staff_employees.id, staff_whitelists.employee_id))
    .where(
      and(
        eq(staff_whitelists.org_id, orgId),
        eq(staff_whitelists.status, WhitelistStatus.Active),
        isNull(staff_whitelists.is_deleted),
        isNull(staff_employees.is_deleted)
      )
    )
    .groupBy(staff_employees.department);

  // Merge all three into a single department map
  const deptMap = new Map<string, DeptStat>();

  for (const row of empByDept) {
    const key = row.department ?? '';
    deptMap.set(key, {
      department: row.department,
      employeeCount: row.employeeCount,
      budgetAmount: '0',
      whitelistCount: 0,
    });
  }

  for (const row of budgetByDept) {
    const key = row.department ?? '';
    const entry = deptMap.get(key);
    if (entry) {
      entry.budgetAmount = row.budgetAmount ?? '0';
    } else {
      deptMap.set(key, {
        department: row.department,
        employeeCount: 0,
        budgetAmount: row.budgetAmount ?? '0',
        whitelistCount: 0,
      });
    }
  }

  for (const row of wlByDept) {
    const key = row.department ?? '';
    const entry = deptMap.get(key);
    if (entry) {
      entry.whitelistCount = row.whitelistCount;
    } else {
      deptMap.set(key, {
        department: row.department,
        employeeCount: 0,
        budgetAmount: '0',
        whitelistCount: row.whitelistCount,
      });
    }
  }

  return Array.from(deptMap.values()).sort((a, b) =>
    (a.department ?? '').localeCompare(b.department ?? '')
  );
}
