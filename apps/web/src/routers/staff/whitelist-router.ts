import 'server-only';
import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { ensureOrganizationAccess } from '@/routers/organizations/utils';
import * as z from 'zod';
import {
  addWhitelist,
  listWhitelist,
  removeWhitelist,
} from '@/lib/staff/whitelist-service';
import { WhitelistStatus, WhitelistType } from '@kilocode/db/schema';

const whitelistTypeSchema = z.union([
  z.literal(WhitelistType.Access),
  z.literal(WhitelistType.Benefit),
]);

const whitelistStatusSchema = z.union([
  z.literal(WhitelistStatus.Active),
  z.literal(WhitelistStatus.Expired),
]);

export const whitelistRouter = createTRPCRouter({
  add: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        employeeId: z.number().int().positive(),
        wlType: whitelistTypeSchema,
        effectiveDate: z.string().min(1),
        expireDate: z.string().optional(),
        remark: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
      ]);
      return addWhitelist({
        orgId: input.organizationId,
        employeeId: input.employeeId,
        wlType: input.wlType,
        effectiveDate: input.effectiveDate,
        expireDate: input.expireDate,
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
        wlType: whitelistTypeSchema.optional(),
        status: whitelistStatusSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return listWhitelist({
        orgId: input.organizationId,
        page: input.page,
        pageSize: input.pageSize,
        employeeId: input.employeeId,
        wlType: input.wlType,
        status: input.status,
      });
    }),

  remove: baseProcedure
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
      return removeWhitelist(input.id, input.organizationId);
    }),
});
