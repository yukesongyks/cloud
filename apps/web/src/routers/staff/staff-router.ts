import 'server-only';
import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { ensureOrganizationAccess } from '@/routers/organizations/utils';
import * as z from 'zod';
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
} from '@/lib/staff/staff-service';
import { EmployeeStatus } from '@kilocode/db/schema';

const employeeStatusSchema = z.union([
  z.literal(EmployeeStatus.Active),
  z.literal(EmployeeStatus.Probation),
  z.literal(EmployeeStatus.Resigned),
]);

export const staffRouter = createTRPCRouter({
  create: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        employeeNo: z.string().min(1).max(64),
        name: z.string().min(1).max(128),
        department: z.string().max(128).optional(),
        position: z.string().max(128).optional(),
        phone: z.string().max(32).optional(),
        email: z.string().max(128).optional(),
        idCardNo: z.string().max(128).optional(),
        status: employeeStatusSchema.optional(),
        entryDate: z.string().optional(),
        leaveDate: z.string().optional(),
        remark: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
        'member',
      ]);
      return createStaff({
        orgId: input.organizationId,
        employeeNo: input.employeeNo,
        name: input.name,
        department: input.department,
        position: input.position,
        phone: input.phone,
        email: input.email,
        idCardNo: input.idCardNo,
        status: input.status,
        entryDate: input.entryDate,
        leaveDate: input.leaveDate,
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
        keyword: z.string().optional(),
        department: z.string().optional(),
        status: employeeStatusSchema.optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId);
      return listStaff({
        orgId: input.organizationId,
        page: input.page,
        pageSize: input.pageSize,
        keyword: input.keyword,
        department: input.department,
        status: input.status,
      });
    }),

  update: baseProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        department: z.string().max(128).optional(),
        position: z.string().max(128).optional(),
        phone: z.string().max(32).optional(),
        email: z.string().max(128).optional(),
        status: employeeStatusSchema.optional(),
        entryDate: z.string().optional(),
        leaveDate: z.string().optional(),
        remark: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ensureOrganizationAccess(ctx, input.organizationId, [
        'owner',
        'billing_manager',
        'member',
      ]);
      return updateStaff({
        id: input.id,
        name: input.name,
        department: input.department,
        position: input.position,
        phone: input.phone,
        email: input.email,
        status: input.status,
        entryDate: input.entryDate,
        leaveDate: input.leaveDate,
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
      return deleteStaff(input.id, input.organizationId);
    }),
});
