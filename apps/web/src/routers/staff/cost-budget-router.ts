import 'server-only';
import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { ensureOrganizationAccess } from '@/routers/organizations/utils';
import * as z from 'zod';
import {
  createCostBudget,
  deleteCostBudget,
  listCostBudget,
  updateCostBudget,
} from '@/lib/staff/cost-budget-service';
import { BudgetType } from '@kilocode/db/schema';

const budgetTypeSchema = z.union([
  z.literal(BudgetType.LaborCost),
  z.literal(BudgetType.ProjectBudget),
  z.literal(BudgetType.Other),
]);

export const costBudgetRouter = createTRPCRouter({
  create: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        employeeId: z.number().int().positive(),
        budgetType: budgetTypeSchema,
        period: z.string().min(1).max(16),
        amount: z.string().min(1),
        currency: z.string().max(8).optional(),
        remark: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
      ]);
      return createCostBudget({
        orgId: input.organizationId,
        employeeId: input.employeeId,
        budgetType: input.budgetType,
        period: input.period,
        amount: input.amount,
        currency: input.currency,
        remark: input.remark,
        creatorId: ctx.user.id,
      });
    }),

  list: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        employeeId: z.number().int().positive().optional(),
        budgetType: budgetTypeSchema.optional(),
        period: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return listCostBudget({
        orgId: input.organizationId,
        page: input.page,
        pageSize: input.pageSize,
        employeeId: input.employeeId,
        budgetType: input.budgetType,
        period: input.period,
      });
    }),

  update: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        id: z.number().int().positive(),
        amount: z.string().min(1).optional(),
        remark: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
      ]);
      return updateCostBudget({
        id: input.id,
        orgId: input.organizationId,
        amount: input.amount,
        remark: input.remark,
        modifierId: ctx.user.id,
      });
    }),

  delete: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
      ]);
      return deleteCostBudget(input.id, input.organizationId);
    }),
});
