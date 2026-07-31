import 'server-only';
import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { ensureOrganizationAccess } from '@/routers/organizations/utils';
import * as z from 'zod';
import {
  batchImportStaff,
  batchImportWhitelist,
  getImportTemplate,
  listImportTasks,
} from '@/lib/staff/import-service';
import { ImportTaskType } from '@kilocode/db/schema';

const importTaskTypeSchema = z.union([
  z.literal(ImportTaskType.StaffImport),
  z.literal(ImportTaskType.WhitelistImport),
]);

export const staffImportRouter = createTRPCRouter({
  importTemplate: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        type: importTaskTypeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return getImportTemplate(input.type ?? ImportTaskType.StaffImport);
    }),

  batchImport: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        fileName: z.string().min(1).max(256),
        csvContent: z.string(),
        type: importTaskTypeSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
        'member',
      ]);

      if (input.type === ImportTaskType.WhitelistImport) {
        return batchImportWhitelist({
          orgId: input.organizationId,
          fileName: input.fileName,
          csvContent: input.csvContent,
          creatorId: ctx.user.id,
        });
      }

      return batchImportStaff({
        orgId: input.organizationId,
        fileName: input.fileName,
        csvContent: input.csvContent,
        creatorId: ctx.user.id,
      });
    }),

  importTasks: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        type: importTaskTypeSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return listImportTasks({
        orgId: input.organizationId,
        page: input.page,
        pageSize: input.pageSize,
        taskType: input.type,
      });
    }),
});
