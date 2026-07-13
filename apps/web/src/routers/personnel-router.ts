import 'server-only';
import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { db, readDb } from '@/lib/drizzle';
import {
  personnel,
  organization_memberships,
} from '@kilocode/db/schema';
import { eq, and, count, avg } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import * as z from 'zod';

// Enums
export const PositionSchema = z.enum([
  'developer',
  'designer',
  'product_manager',
  'tester',
  'operations',
  'other',
]);

export const LevelSchema = z.enum([
  'junior',
  'intermediate',
  'senior',
  'expert',
  'architect',
]);

export const StatusSchema = z.enum([
  'active',
  'resigned',
  'on_leave',
  'probation',
]);

// Input schemas
const CreatePersonnelInputSchema = z.object({
  name: z.string().min(1).max(100),
  position: PositionSchema,
  level: LevelSchema,
  age: z.number().int().min(18).max(100),
  baseLocation: z.string().min(1).max(200),
  status: StatusSchema.optional().default('active'),
  organizationId: z.string().uuid(),
});

const ListPersonnelInputSchema = z.object({
  position: PositionSchema.optional(),
  level: LevelSchema.optional(),
  status: StatusSchema.optional(),
  organizationId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

const UpdatePersonnelInputSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  position: PositionSchema.optional(),
  level: LevelSchema.optional(),
  age: z.number().int().min(18).max(100).optional(),
  baseLocation: z.string().min(1).max(200).optional(),
  status: StatusSchema.optional(),
});

const DeletePersonnelInputSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
});

const ExportInputSchema = z.object({
  dimension: z.enum(['position', 'level']),
  format: z.enum(['csv', 'json']).optional().default('csv'),
  organizationId: z.string().uuid(),
});

// Output schemas
const PersonnelStatsSchema = z.object({
  byPosition: z.array(
    z.object({
      position: PositionSchema,
      count: z.number(),
      avgAge: z.number().nullable(),
      distribution: z.record(z.string(), z.number()),
    })
  ),
  byLevel: z.array(
    z.object({
      level: LevelSchema,
      count: z.number(),
      avgAge: z.number().nullable(),
      distribution: z.record(z.string(), z.number()),
    })
  ),
  total: z.number(),
  lastUpdated: z.string(),
});

/**
 * Verifies that the user is a member of the specified organization.
 * Throws FORBIDDEN error if not a member.
 */
async function verifyOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<void> {
  const [membership] = await readDb
    .select()
    .from(organization_memberships)
    .where(
      and(
        eq(organization_memberships.user_id, userId),
        eq(organization_memberships.organization_id, organizationId)
      )
    )
    .limit(1);

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this organization',
    });
  }
}

/**
 * Escapes a value for CSV output to prevent CSV injection attacks.
 * If the value contains commas, quotes, or newlines, wrap it in quotes
 * and escape any existing quotes by doubling them.
 */
function escapeCsvField(value: string | number): string {
  const strValue = String(value);
  // Check if the value needs escaping
  if (
    strValue.includes(',') ||
    strValue.includes('"') ||
    strValue.includes('\n') ||
    strValue.includes('\r')
  ) {
    // Escape quotes by doubling them and wrap in quotes
    return `"${strValue.replace(/"/g, '""')}"`;
  }
  return strValue;
}

export const personnelRouter = createTRPCRouter({
  // Create personnel
  create: baseProcedure
    .input(CreatePersonnelInputSchema)
    .mutation(async ({ ctx, input }) => {
      // CRITICAL-001: Verify user is authenticated and has access to the organization
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      const [created] = await db.insert(personnel).values(input).returning();
      if (!created) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create personnel',
        });
      }
      return created;
    }),

  // List personnel with filters
  list: baseProcedure
    .input(ListPersonnelInputSchema)
    .query(async ({ ctx, input }) => {
      // CRITICAL-001: Verify authentication and organization access
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      const { position, level, status, organizationId, limit, offset } = input;

      const conditions = [eq(personnel.organizationId, organizationId)];
      if (position) conditions.push(eq(personnel.position, position));
      if (level) conditions.push(eq(personnel.level, level));
      if (status) conditions.push(eq(personnel.status, status));

      const results = await readDb
        .select()
        .from(personnel)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset);

      const [{ total }] = await readDb
        .select({ total: count() })
        .from(personnel)
        .where(and(...conditions));

      return {
        data: results,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      };
    }),

  // Get single personnel by ID
  get: baseProcedure
    .input(z.object({ id: z.string().uuid(), organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // CRITICAL-001 & CRITICAL-002: Verify authentication and organization access
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      const [result] = await readDb
        .select()
        .from(personnel)
        .where(
          and(
            eq(personnel.id, input.id),
            eq(personnel.organizationId, input.organizationId)
          )
        );

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Personnel not found',
        });
      }

      return result;
    }),

  // Update personnel
  update: baseProcedure
    .input(UpdatePersonnelInputSchema)
    .mutation(async ({ ctx, input }) => {
      // CRITICAL-001 & MAJOR-002: Verify authentication and organization access
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      const { id, organizationId, ...updateData } = input;

      // MAJOR-004: Verify the personnel belongs to the organization before updating
      const [existing] = await readDb
        .select()
        .from(personnel)
        .where(
          and(
            eq(personnel.id, id),
            eq(personnel.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Personnel not found or does not belong to this organization',
        });
      }

      const [updated] = await db
        .update(personnel)
        .set(updateData)
        .where(eq(personnel.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Personnel not found',
        });
      }

      return updated;
    }),

  // Delete personnel
  delete: baseProcedure
    .input(DeletePersonnelInputSchema)
    .mutation(async ({ ctx, input }) => {
      // CRITICAL-001 & MAJOR-004: Verify authentication and organization access
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      const [deleted] = await db
        .delete(personnel)
        .where(
          and(
            eq(personnel.id, input.id),
            eq(personnel.organizationId, input.organizationId)
          )
        )
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Personnel not found',
        });
      }

      return { success: true, id: deleted.id };
    }),

  // Statistics for dashboard - MAJOR-001: Use database aggregation
  stats: baseProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .output(PersonnelStatsSchema)
    .query(async ({ ctx, input }) => {
      // CRITICAL-001: Verify authentication and organization access
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      // MAJOR-001: Use database aggregation for better performance
      const byPositionStats = await readDb
        .select({
          position: personnel.position,
          count: count(),
          avgAge: avg(personnel.age),
        })
        .from(personnel)
        .where(eq(personnel.organizationId, input.organizationId))
        .groupBy(personnel.position);

      const byLevelStats = await readDb
        .select({
          level: personnel.level,
          count: count(),
          avgAge: avg(personnel.age),
        })
        .from(personnel)
        .where(eq(personnel.organizationId, input.organizationId))
        .groupBy(personnel.level);

      // Get status distribution using database aggregation
      const statusDistribution = await readDb
        .select({
          position: personnel.position,
          status: personnel.status,
          count: count(),
        })
        .from(personnel)
        .where(eq(personnel.organizationId, input.organizationId))
        .groupBy(personnel.position, personnel.status);

      const levelStatusDistribution = await readDb
        .select({
          level: personnel.level,
          status: personnel.status,
          count: count(),
        })
        .from(personnel)
        .where(eq(personnel.organizationId, input.organizationId))
        .groupBy(personnel.level, personnel.status);

      // Build distribution maps
      const positionDistributionMap = new Map<string, Record<string, number>>();
      for (const item of statusDistribution) {
        if (!positionDistributionMap.has(item.position)) {
          positionDistributionMap.set(item.position, {});
        }
        const dist = positionDistributionMap.get(item.position)!;
        dist[item.status] = item.count;
      }

      const levelDistributionMap = new Map<string, Record<string, number>>();
      for (const item of levelStatusDistribution) {
        if (!levelDistributionMap.has(item.level)) {
          levelDistributionMap.set(item.level, {});
        }
        const dist = levelDistributionMap.get(item.level)!;
        dist[item.status] = item.count;
      }

      const byPosition = byPositionStats.map((stat) => ({
        position: stat.position as z.infer<typeof PositionSchema>,
        count: stat.count,
        avgAge: stat.avgAge ? Number(stat.avgAge) : null,
        distribution: positionDistributionMap.get(stat.position) || {},
      }));

      const byLevel = byLevelStats.map((stat) => ({
        level: stat.level as z.infer<typeof LevelSchema>,
        count: stat.count,
        avgAge: stat.avgAge ? Number(stat.avgAge) : null,
        distribution: levelDistributionMap.get(stat.level) || {},
      }));

      // Get total count
      const [{ total }] = await readDb
        .select({ total: count() })
        .from(personnel)
        .where(eq(personnel.organizationId, input.organizationId));

      return {
        byPosition,
        byLevel,
        total,
        lastUpdated: new Date().toISOString(),
      };
    }),

  // Export data - MAJOR-001: Use database aggregation, MAJOR-003: Add CSV escaping
  export: baseProcedure
    .input(ExportInputSchema)
    .query(async ({ ctx, input }) => {
      // CRITICAL-001: Verify authentication and organization access
      const userId = ctx.session?.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        });
      }

      await verifyOrganizationMembership(userId, input.organizationId);

      // MAJOR-001: Use database aggregation
      if (input.dimension === 'position') {
        const positionStats = await readDb
          .select({
            position: personnel.position,
            count: count(),
            avgAge: avg(personnel.age),
          })
          .from(personnel)
          .where(eq(personnel.organizationId, input.organizationId))
          .groupBy(personnel.position);

        const result = positionStats.map((stat) => ({
          position: stat.position,
          count: stat.count,
          avgAge: stat.avgAge ? Number(stat.avgAge) : 0,
        }));

        if (input.format === 'csv') {
          // MAJOR-003: Use CSV escaping to prevent injection
          const csv = [
            'position,count,avgAge',
            ...result.map(
              (r) =>
                `${escapeCsvField(r.position)},${escapeCsvField(r.count)},${escapeCsvField(r.avgAge.toFixed(2))}`
            ),
          ].join('\n');
          return { data: csv, format: 'csv' as const };
        }

        return { data: result, format: 'json' as const };
      } else {
        const levelStats = await readDb
          .select({
            level: personnel.level,
            count: count(),
            avgAge: avg(personnel.age),
          })
          .from(personnel)
          .where(eq(personnel.organizationId, input.organizationId))
          .groupBy(personnel.level);

        const result = levelStats.map((stat) => ({
          level: stat.level,
          count: stat.count,
          avgAge: stat.avgAge ? Number(stat.avgAge) : 0,
        }));

        if (input.format === 'csv') {
          // MAJOR-003: Use CSV escaping to prevent injection
          const csv = [
            'level,count,avgAge',
            ...result.map(
              (r) =>
                `${escapeCsvField(r.level)},${escapeCsvField(r.count)},${escapeCsvField(r.avgAge.toFixed(2))}`
            ),
          ].join('\n');
          return { data: csv, format: 'csv' as const };
        }

        return { data: result, format: 'json' as const };
      }
    }),
});
