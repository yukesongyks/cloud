import { baseProcedure, createTRPCRouter } from '@/lib/trpc/init';
import { db, readDb } from '@/lib/drizzle';
import { personnel } from '@kilocode/db/schema';
import { eq, and, sql, inArray, count, avg } from 'drizzle-orm';
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

export const personnelRouter = createTRPCRouter({
  // Create personnel
  create: baseProcedure
    .input(CreatePersonnelInputSchema)
    .mutation(async ({ input }) => {
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
  list: baseProcedure.input(ListPersonnelInputSchema).query(async ({ input }) => {
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
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [result] = await readDb
        .select()
        .from(personnel)
        .where(eq(personnel.id, input.id));

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
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

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
    .mutation(async ({ input }) => {
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

  // Statistics for dashboard
  stats: baseProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .output(PersonnelStatsSchema)
    .query(async ({ input }) => {
      // Get all personnel for the organization
      const allPersonnel = await readDb
        .select()
        .from(personnel)
        .where(eq(personnel.organizationId, input.organizationId));

      // Calculate by position
      const positionMap = new Map<
        string,
        { count: number; ages: number[]; distribution: Record<string, number> }
      >();
      const levelMap = new Map<
        string,
        { count: number; ages: number[]; distribution: Record<string, number> }
      >();

      for (const p of allPersonnel) {
        // By position
        if (!positionMap.has(p.position)) {
          positionMap.set(p.position, {
            count: 0,
            ages: [],
            distribution: {},
          });
        }
        const posData = positionMap.get(p.position)!;
        posData.count++;
        posData.ages.push(p.age);
        posData.distribution[p.status] = (posData.distribution[p.status] || 0) + 1;

        // By level
        if (!levelMap.has(p.level)) {
          levelMap.set(p.level, {
            count: 0,
            ages: [],
            distribution: {},
          });
        }
        const levelData = levelMap.get(p.level)!;
        levelData.count++;
        levelData.ages.push(p.age);
        levelData.distribution[p.status] = (levelData.distribution[p.status] || 0) + 1;
      }

      const byPosition = Array.from(positionMap.entries()).map(
        ([position, data]) => ({
          position: position as z.infer<typeof PositionSchema>,
          count: data.count,
          avgAge:
            data.ages.length > 0
              ? data.ages.reduce((a, b) => a + b, 0) / data.ages.length
              : null,
          distribution: data.distribution,
        })
      );

      const byLevel = Array.from(levelMap.entries()).map(([level, data]) => ({
        level: level as z.infer<typeof LevelSchema>,
        count: data.count,
        avgAge:
          data.ages.length > 0
            ? data.ages.reduce((a, b) => a + b, 0) / data.ages.length
            : null,
        distribution: data.distribution,
      }));

      return {
        byPosition,
        byLevel,
        total: allPersonnel.length,
        lastUpdated: new Date().toISOString(),
      };
    }),

  // Export data
  export: baseProcedure.input(ExportInputSchema).query(async ({ input }) => {
    const stats = await readDb
      .select()
      .from(personnel)
      .where(eq(personnel.organizationId, input.organizationId));

    if (input.dimension === 'position') {
      const positionStats = new Map<string, { count: number; ages: number[] }>();
      for (const p of stats) {
        if (!positionStats.has(p.position)) {
          positionStats.set(p.position, { count: 0, ages: [] });
        }
        const data = positionStats.get(p.position)!;
        data.count++;
        data.ages.push(p.age);
      }

      const result = Array.from(positionStats.entries()).map(
        ([position, data]) => ({
          position,
          count: data.count,
          avgAge:
            data.ages.length > 0
              ? data.ages.reduce((a, b) => a + b, 0) / data.ages.length
              : 0,
        })
      );

      if (input.format === 'csv') {
        const csv = [
          'position,count,avgAge',
          ...result.map((r) => `${r.position},${r.count},${r.avgAge.toFixed(2)}`),
        ].join('\n');
        return { data: csv, format: 'csv' as const };
      }

      return { data: result, format: 'json' as const };
    } else {
      const levelStats = new Map<string, { count: number; ages: number[] }>();
      for (const p of stats) {
        if (!levelStats.has(p.level)) {
          levelStats.set(p.level, { count: 0, ages: [] });
        }
        const data = levelStats.get(p.level)!;
        data.count++;
        data.ages.push(p.age);
      }

      const result = Array.from(levelStats.entries()).map(([level, data]) => ({
        level,
        count: data.count,
        avgAge:
          data.ages.length > 0
            ? data.ages.reduce((a, b) => a + b, 0) / data.ages.length
            : 0,
      }));

      if (input.format === 'csv') {
        const csv = [
          'level,count,avgAge',
          ...result.map((r) => `${r.level},${r.count},${r.avgAge.toFixed(2)}`),
        ].join('\n');
        return { data: csv, format: 'csv' as const };
      }

      return { data: result, format: 'json' as const };
    }
  }),
});