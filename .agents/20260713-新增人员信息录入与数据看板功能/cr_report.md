# 代码评审报告

**项目**: 人员信息录入与数据看板功能  
**评审日期**: 2026-07-13  
**评审范围**: 数据库Schema、tRPC路由、前端组件  
**评审人**: AI Code Reviewer

---

## 1. 评审概述

本次评审针对新增人员信息管理功能的完整实现，包括数据库表设计、tRPC API路由、前端页面组件等。评审重点关注**安全性、数据隔离、性能、代码质量**四个维度。

### 评审文件清单
| 文件 | 类型 | 行数 |
|------|------|------|
| `packages/db/src/schema.ts` | 数据库Schema | ~30 (新增部分) |
| `apps/web/src/routers/personnel-router.ts` | tRPC路由 | 356 |
| `apps/web/src/routers/root-router.ts` | 路由注册 | 92 |
| `apps/web/src/app/(app)/personnel/page.tsx` | 列表页面 | 19 |
| `apps/web/src/app/(app)/personnel/dashboard/page.tsx` | 看板页面 | 26 |
| `apps/web/src/components/personnel/PersonnelList.tsx` | 列表组件 | 200 |
| `apps/web/src/components/personnel/PersonnelForm.tsx` | 表单组件 | 206 |
| `apps/web/src/components/personnel/PersonnelDashboard.tsx` | 看板组件 | 221 |

---

## 2. 问题汇总

| 级别 | 数量 | 描述 |
|------|------|------|
| **BLOCKER** | 2 | 必须修复，阻塞上线 |
| **MAJOR** | 4 | 强烈建议修复，存在安全或性能风险 |
| **MINOR** | 3 | 建议优化，提升代码质量 |

**总问题数**: 9

---

## 3. BLOCKER 问题详情

### 🔴 CRITICAL-001: 缺少用户权限校验

**位置**: `apps/web/src/routers/personnel-router.ts`  
**影响范围**: create, update, delete, get, list, stats, export 所有接口

**问题描述**:
所有tRPC接口使用 `baseProcedure`，未验证用户是否有权限操作对应组织的数据。攻击者可以通过构造任意 `organizationId` 来：
1. 创建其他组织的人员信息（第98-109行）
2. 更新其他组织的人员信息（第163-182行）
3. 删除其他组织的人员信息（第185-206行）
4. 查询其他组织的人员统计和导出数据（第209-355行）

**代码证据**:
```typescript
// personnel-router.ts:98-109
create: baseProcedure
  .input(CreatePersonnelInputSchema)
  .mutation(async ({ input }) => {
    // ❌ 未验证 input.organizationId 是否属于当前登录用户
    const [created] = await db.insert(personnel).values(input).returning();
    if (!created) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create personnel',
      });
    }
    return created;
  }),
```

**风险等级**: 🔴 **高危** - 可导致数据泄露、数据篡改、权限绕过

**修复建议**:
1. 创建受保护的 procedure（如 `protectedProcedure`），从 session 中获取当前用户的 organizationId
2. 验证 input 中的 organizationId 是否与 session 中的匹配
3. 参考项目中其他 router 的权限校验实现

```typescript
// 修复示例
const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.organizationId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

create: protectedProcedure
  .input(CreatePersonnelInputSchema)
  .mutation(async ({ input, ctx }) => {
    // ✅ 验证 organizationId 属于当前用户
    if (input.organizationId !== ctx.session.user.organizationId) {
      throw new TRPCError({ code: 'FORBIDDEN', message: '无权操作此组织' });
    }
    // ... 创建逻辑
  }),
```

---

### 🔴 CRITICAL-002: 查询接口缺少数据隔离

**位置**: `apps/web/src/routers/personnel-router.ts:144-160`

**问题描述**:
`get` 接口只根据 `id` 查询人员信息，未验证该人员是否属于当前用户的组织。攻击者可以通过遍历 UUID 查看任意组织的任意人员信息。

**代码证据**:
```typescript
// personnel-router.ts:144-160
get: baseProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input }) => {
    const [result] = await readDb
      .select()
      .from(personnel)
      .where(eq(personnel.id, input.id)); // ❌ 只验证 id，未验证 organizationId

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Personnel not found',
      });
    }

    return result; // ❌ 直接返回，可能泄露其他组织的人员信息
  }),
```

**风险等级**: 🔴 **高危** - 信息泄露，违反数据隔离原则

**修复建议**:
```typescript
get: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ input, ctx }) => {
    const [result] = await readDb
      .select()
      .from(personnel)
      .where(
        and(
          eq(personnel.id, input.id),
          eq(personnel.organizationId, ctx.session.user.organizationId) // ✅ 添加组织隔离
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
```

---

## 4. MAJOR 问题详情

### 🟠 MAJOR-001: 统计计算性能问题

**位置**: `apps/web/src/routers/personnel-router.ts:209-285`

**问题描述**:
`stats` 接口将所有人员数据加载到内存中计算统计信息，当组织人员数量达到数千或更多时，会导致：
1. 数据库返回大量数据，占用网络带宽
2. 内存消耗增加，可能导致 Worker 内存溢出
3. 响应时间变长，影响用户体验

**代码证据**:
```typescript
// personnel-router.ts:213-217
const allPersonnel = await readDb
  .select()
  .from(personnel)
  .where(eq(personnel.organizationId, input.organizationId));
// ❌ 加载全部人员到内存，然后在 JS 中循环计算（第229-277行）
```

**修复建议**:
使用数据库聚合函数直接计算：
```typescript
// ✅ 使用 GROUP BY 在数据库层面计算
const positionStats = await readDb
  .select({
    position: personnel.position,
    count: count(),
    avgAge: avg(personnel.age),
  })
  .from(personnel)
  .where(eq(personnel.organizationId, input.organizationId))
  .groupBy(personnel.position);
```

---

### 🟠 MAJOR-002: 更新接口缺少组织隔离

**位置**: `apps/web/src/routers/personnel-router.ts:163-182`

**问题描述**:
`update` 接口的 `UpdatePersonnelInputSchema` 不包含 `organizationId` 字段，虽然防止了跨组织修改，但也缺少对修改记录所属组织的验证。

**代码证据**:
```typescript
// personnel-router.ts:53-61
const UpdatePersonnelInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  position: PositionSchema.optional(),
  level: LevelSchema.optional(),
  age: z.number().int().min(18).max(100).optional(),
  baseLocation: z.string().min(1).max(200).optional(),
  status: StatusSchema.optional(),
  // ❌ 缺少 organizationId 验证
});
```

**修复建议**:
在 update 时验证目标记录属于当前用户的组织：
```typescript
update: protectedProcedure
  .input(UpdatePersonnelInputSchema)
  .mutation(async ({ input, ctx }) => {
    const { id, ...updateData } = input;

    const [updated] = await db
      .update(personnel)
      .set(updateData)
      .where(
        and(
          eq(personnel.id, id),
          eq(personnel.organizationId, ctx.session.user.organizationId) // ✅ 验证组织归属
        )
      )
      .returning();

    // ...
  }),
```

---

### 🟠 MAJOR-003: CSV导出存在注入风险

**位置**: `apps/web/src/routers/personnel-router.ts:319, 348`

**问题描述**:
CSV导出直接拼接数据值，如果数据中包含特殊字符（如 `,`, `"`, `\n`），会导致：
1. CSV格式错乱
2. CSV公式注入（如数据为 `=1+1`）

**代码证据**:
```typescript
// personnel-router.ts:317-320
const csv = [
  'position,count,avgAge',
  ...result.map((r) => `${r.position},${r.count},${r.avgAge.toFixed(2)}`),
  // ❌ 未对 position 进行转义，如果包含逗号会破坏格式
].join('\\n');
```

**修复建议**:
```typescript
const escapeCSV = (value: string | number) => {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`; // CSV标准转义
  }
  return str;
};

const csv = [
  'position,count,avgAge',
  ...result.map((r) => `${escapeCSV(r.position)},${r.count},${r.avgAge.toFixed(2)}`),
].join('\n');
```

---

### 🟠 MAJOR-004: 删除接口的组织验证时机不当

**位置**: `apps/web/src/routers/personnel-router.ts:185-206`

**问题描述**:
虽然 `delete` 接口在 where 条件中验证了 `organizationId`，但这个 `organizationId` 来自前端参数，而非从 session 中获取。如果用户可以伪造前端参数，仍然可以删除其他组织的数据。

**代码证据**:
```typescript
// personnel-router.ts:185-206
delete: baseProcedure
  .input(DeletePersonnelInputSchema)
  .mutation(async ({ input }) => {
    // input.organizationId 来自前端，可被伪造
    const [deleted] = await db
      .delete(personnel)
      .where(
        and(
          eq(personnel.id, input.id),
          eq(personnel.organizationId, input.organizationId)
          // ❌ 虽然验证了 organizationId，但来源不可信
        )
      )
      .returning();
    // ...
  }),
```

**修复建议**:
与 BLOCKER-001 相同，需要从 session 中获取 organizationId 并验证。

---

## 5. MINOR 问题详情

### 🟡 MINOR-001: 未使用的导入

**位置**: `apps/web/src/routers/personnel-router.ts:4`

```typescript
import { eq, and, sql, inArray, count, avg } from 'drizzle-orm';
// ❌ inArray 和 avg 未使用，sql 仅在注释中出现
```

**修复建议**:
移除未使用的导入，保持代码整洁。

---

### 🟡 MINOR-002: 前端枚举值硬编码

**位置**: 
- `apps/web/src/components/personnel/PersonnelList.tsx:76-118`
- `apps/web/src/components/personnel/PersonnelForm.tsx:110-184`

**问题描述**:
岗位、职级、状态的选项值硬编码在前端组件中，如果数据库 schema 的枚举值更新，需要同步修改多处前端代码。

**修复建议**:
从后端获取枚举配置，或使用 tRPC 推导的类型配合常量配置。

---

### 🟡 MINOR-003: 删除确认使用 window.confirm

**位置**: `apps/web/src/components/personnel/PersonnelList.tsx:43`

```typescript
if (confirm('确定要删除此人员信息吗？')) {
  await deleteMutation.mutateAsync({ id, organizationId });
}
```

**问题描述**:
使用浏览器原生 `confirm` 对话框，用户体验较差，且在不同浏览器中样式不一致。

**修复建议**:
使用项目中的 UI 组件库（如 Dialog/Modal）实现更友好的确认对话框。

---

## 6. 设计与架构评审

### ✅ 优点
1. **Schema设计合理**: 人员表字段设计满足需求，包含必要的枚举和约束
2. **接口职责清晰**: CRUD + 统计 + 导出的接口划分合理
3. **前端组件分离**: List、Form、Dashboard 组件职责分明
4. **使用项目技术栈**: Drizzle ORM、tRPC、React Query 等符合项目规范

### ⚠️ 待改进
1. **缺少测试用例**: 未发现对应的单元测试或集成测试文件
2. **缺少GDPR软删除**: 人员信息属于PII，应考虑实现软删除流程（参考 AGENTS.md）
3. **缺少日志记录**: 创建、更新、删除操作应记录审计日志
4. **未遵循DESIGN.md**: 前端组件未使用 Kilo Design Token，直接使用 Tailwind 原子类

---

## 7. 修复优先级建议

| 优先级 | 问题ID | 描述 | 预计工时 |
|--------|--------|------|----------|
| P0 | CRITICAL-001 | 权限校验缺失 | 4h |
| P0 | CRITICAL-002 | 数据隔离缺失 | 2h |
| P1 | MAJOR-001 | 统计性能优化 | 3h |
| P1 | MAJOR-002 | 更新接口隔离 | 1h |
| P1 | MAJOR-003 | CSV注入修复 | 1h |
| P2 | MINOR-001 | 代码清理 | 0.5h |
| P2 | MINOR-002 | 枚举配置优化 | 2h |
| P2 | MINOR-003 | 确认框优化 | 1h |

---

## 8. 评审结论

**整体评价**: 功能实现基本完整，但存在**严重的安全漏洞**，不可上线发布。

**阻塞原因**: 
- 2个 BLOCKER 问题涉及权限校验和数据隔离，属于高危安全漏洞
- 攻击者可绕过权限查看、修改、删除任意组织的人员信息

**建议措施**:
1. **立即修复** CRITICAL-001 和 CRITICAL-002，添加完整的权限校验机制
2. **高优修复** MAJOR 级别问题，特别是性能和安全相关
3. **补充测试** 单元测试覆盖权限边界和业务逻辑
4. **设计对齐** 前端组件应符合 DESIGN.md 规范

---

## 9. 附录

### 安全检查清单
- [ ] 所有接口验证用户身份（Authentication）
- [ ] 所有接口验证用户权限（Authorization）
- [ ] 数据隔离：用户只能访问其组织的数据
- [ ] 输入验证：使用 Zod schema 验证所有输入
- [ ] 输出编码：CSV/JSON 导出防止注入
- [ ] 审计日志：记录关键操作

### 性能检查清单
- [ ] 避免在内存中处理大量数据
- [ ] 使用数据库聚合代替 JS 计算
- [ ] 分页查询避免全表扫描
- [ ] 添加适当的数据库索引

---

**评审完成时间**: 2026-07-13 23:40 UTC  
**评审工具**: AI Code Reviewer（手动评审替代方案）