import 'server-only';
import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { ensureOrganizationAccess } from '@/routers/organizations/utils';
import * as z from 'zod';
import {
  getDashboardByDepartment,
  getDashboardSummary,
} from '@/lib/staff/dashboard-service';

export const staffDashboardRouter = createTRPCRouter({
  summary: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        department: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return getDashboardSummary(input.organizationId, input.department);
    }),

  byDepartment: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        period: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return getDashboardByDepartment(input.organizationId, input.period);
    }),
});
