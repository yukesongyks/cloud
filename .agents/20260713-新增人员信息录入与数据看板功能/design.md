# 人员信息录入与数据看板功能 - 系统设计文档

## 1. 需求概述

### 1.1 功能背景
新增人员信息管理功能，支持人员信息的全生命周期管理（增删改查），并提供多维度数据看板展示与导出能力。

### 1.2 核心需求
- **人员信息录入**：支持人员信息的增删改查
- **数据看板**：按岗位维度和职级维度展示统计数据，支持导出

### 1.3 人员信息字段
| 字段 | 类型 | 说明 |
|---|---|
| 岗位 (position) | 枚举 | 人员岗位类型 |
| 职级 (level) | 枚举 | 人员职级等级 |
| 年龄 (age) | 整数 | 人员年龄 |
| Base地 (baseLocation) | 字符串 | 工作地点 |
| 人员状态 (status) | 枚举 | 在职/离职等状态 |

---

## 2. 架构设计

### 2.1 技术栈选型
基于现有 Kilo Code 架构：
- **前端**：Next.js (apps/web)
- **后端**：tRPC 路由 (apps/web/src/routers/)
- **数据库**：PostgreSQL + Drizzle ORM (packages/db/)
- **UI组件**：遵循 DESIGN.md 和 kilo-design 技能规范

### 2.2 模块划分
```
apps/web/
├── src/
│   ├── routers/
│   │   └── personnel.ts          # tRPC 路由
│   ├── components/
│   │   └── personnel/            # 人员管理组件
│   │       ├── PersonnelForm.tsx
│   │       ├── PersonnelList.tsx
│   │       └── PersonnelDashboard.tsx
│   └── pages/
│       └── personnel/            # 页面路由
│           ├── index.tsx         # 列表页
│           └── dashboard.tsx     # 看板页

packages/db/src/
├── schema.ts                     # 新增 personnel 表定义
└── migrations/                   # 迁移文件
```

---

## 3. 数据库设计

### 3.1 人员表 (personnel)

```typescript
// packages/db/src/schema.ts 新增
export const personnel = pgTable('personnel', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // 基本信息
  name: text('name').notNull(),
  
  // 枚举字段
  position: text('position', { enum: [
    'developer',      // 开发
    'designer',       // 设计
    'product_manager', // 产品
    'tester',         // 测试
    'operations',     // 运维
    'other'           // 其他
  ]}).notNull(),
  
  level: text('level', { enum: [
    'junior',    // 初级
    'intermediate', // 中级
    'senior',    // 高级
    'expert',    // 专家
    'architect'  // 架构师
  ]}).notNull(),
  
  status: text('status', { enum: [
    'active',     // 在职
    'resigned',   // 已离职
    'on_leave',   // 请假中
    'probation'   // 试用期
  ]}).notNull().default('active'),
  
  // 数值字段
  age: integer('age').notNull(),
  
  // 文本字段
  baseLocation: text('base_location').notNull(),
  
  // 元数据
  organizationId: uuid('organization_id').notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  
}, (table) => ({
  orgIdx: index('personnel_org_idx').on(table.organizationId),
  positionIdx: index('personnel_position_idx').on(table.position),
  levelIdx: index('personnel_level_idx').on(table.level),
  statusIdx: index('personnel_status_idx').on(table.status),
}));
```

### 3.2 索引设计
- `personnel_org_idx`: 组织维度查询
- `personnel_position_idx`: 岗位维度统计
- `personnel_level_idx`: 职级维度统计
- `personnel_status_idx`: 状态过滤

---

## 4. API 设计

### 4.1 tRPC 路由定义

```typescript
// apps/web/src/routers/personnel.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const personnelRouter = router({
  // 创建人员
  create: publicProcedure
    .input(z.object({
      name: z.string(),
      position: z.enum(['developer', 'designer', 'product_manager', 'tester', 'operations', 'other']),
      level: z.enum(['junior', 'intermediate', 'senior', 'expert', 'architect']),
      age: z.number().int().min(18).max(100),
      baseLocation: z.string(),
      status: z.enum(['active', 'resigned', 'on_leave', 'probation']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 实现创建逻辑
    }),

  // 查询人员列表
  list: publicProcedure
    .input(z.object({
      position: z.string().optional(),
      level: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().optional().default(20),
      offset: z.number().optional().default(0),
    }))
    .query(async ({ ctx, input }) => {
      // 实现查询逻辑
    }),

  // 更新人员
  update: publicProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      position: z.enum([...]).optional(),
      level: z.enum([...]).optional(),
      age: z.number().int().min(18).max(100).optional(),
      baseLocation: z.string().optional(),
      status: z.enum([...]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 实现更新逻辑
    }),

  // 删除人员
  delete: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // 实现删除逻辑
    }),

  // 统计数据（看板用）
  stats: publicProcedure
    .query(async ({ ctx }) => {
      // 按岗位统计
      // 按职级统计
      // 返回聚合数据
    }),

  // 导出数据
  export: publicProcedure
    .input(z.object({
      dimension: z.enum(['position', 'level']),
      format: z.enum(['csv', 'json']).default('csv'),
    }))
    .query(async ({ ctx, input }) => {
      // 导出指定维度的统计数据
    }),
});
```

### 4.2 统计接口返回结构

```typescript
// 统计数据结构
interface PersonnelStats {
  byPosition: Array<{
    position: string;
    count: number;
    avgAge: number;
    distribution: Record<string, number>; // 按状态分布
  }>;
  
  byLevel: Array<{
    level: string;
    count: number;
    avgAge: number;
    distribution: Record<string, number>; // 按状态分布
  }>;
  
  total: number;
  lastUpdated: string;
}
```

---

## 5. 前端设计

### 5.1 页面结构

#### 人员列表页 (`/personnel`)
- 功能：展示人员列表，支持筛选、搜索、新增、编辑、删除
- 组件：`PersonnelList.tsx`, `PersonnelForm.tsx`

#### 数据看板页 (`/personnel/dashboard`)
- 功能：按岗位/职级维度展示统计图表，支持导出
- 组件：`PersonnelDashboard.tsx`

### 5.2 关键组件设计

```typescript
// apps/web/src/components/personnel/PersonnelList.tsx
// 人员列表组件
// - 表格展示人员信息
// - 筛选器：岗位、职级、状态
// - 操作按钮：新增、编辑、删除

// apps/web/src/components/personnel/PersonnelForm.tsx
// 人员表单组件
// - 表单字段：姓名、岗位、职级、年龄、Base地、状态
// - 校验规则
// - 提交逻辑

// apps/web/src/components/personnel/PersonnelDashboard.tsx
// 数据看板组件
// - 岗位维度图表（柱状图/饼图）
// - 职级维度图表
// - 导出按钮
```

### 5.3 UI 规范
遵循 `DESIGN.md` 和 `kilo-design` 技能规范：
- 使用 Tailwind CSS 样式
- 响应式布局
- 无障碍访问支持

---

## 6. 数据库迁移

### 6.1 迁移生成
```bash
pnpm drizzle generate
```

### 6.2 迁移执行
```bash
# 开发环境
pnpm db:migrate

# 生产环境通过 CI/CD 自动执行
```

---

## 7. 安全与权限

### 7.1 权限控制
- 基于组织隔离：`organizationId` 字段
- 需结合现有认证体系（参考 `apps/web/src/routers/` 现有路由）

### 7.2 GDPR 合规
- 人员姓名属于 PII
- 需在 `softDeleteUser` 流程中处理（参考 `apps/web/src/lib/user.ts`）

---

## 8. 测试计划

### 8.1 单元测试
- tRPC 路由测试：`apps/web/src/routers/personnel.test.ts`
- 覆盖 CRUD 操作、统计计算、导出逻辑

### 8.2 集成测试
- 端到端测试：创建 → 查询 → 更新 → 删除流程
- 看板数据准确性验证

---

## 9. 实施计划

### 9.1 阶段划分

| 阶段 | 内容 | 预估工时 |
|---|---|---|
| Phase 1 | 数据库 Schema 定义与迁移 | 2h |
| Phase 2 | tRPC 路由实现 | 3h |
| Phase 3 | 前端列表页开发 | 3h |
| Phase 4 | 数据看板开发 | 4h |
| Phase 5 | 导出功能开发 | 2h |
| Phase 6 | 测试与验收 | 2h |

### 9.2 依赖关系
```
Phase 1 (Schema) 
  ↓
Phase 2 (API) 
  ↓
Phase 3, 4, 5 (前端并行开发)
  ↓
Phase 6 (测试)
```

---

## 10. 风险与应对

| 风险 | 影响 | 应对措施 |
|---|---|---|
| 枚举值后续扩展 | 低 | 使用 Drizzle enum 便于扩展 |
| 导出数据量大 | 中 | 分页导出或流式导出 |
| 权限粒度不足 | 中 | 参考现有权限体系实现 |

---

## 11. 验收标准

### 11.1 功能验收
- [ ] 可创建人员信息并保存到数据库
- [ ] 可查询、筛选人员列表
- [ ] 可编辑人员信息
- [ ] 可删除人员信息
- [ ] 看板正确展示岗位/职级统计数据
- [ ] 导出功能正常工作

### 11.2 质量验收
- [ ] 类型检查通过 (`pnpm typecheck`)
- [ ] 格式化通过 (`pnpm format`)
- [ ] 单元测试通过 (`pnpm test`)

---

## 附录

### A. 参考文档
- `packages/db/src/schema.ts` - 现有数据库模式
- `apps/web/src/routers/` - 现有 tRPC 路由示例
- `DESIGN.md` - UI 设计规范
- `.agents/skills/kilo-design/SKILL.md` - 前端开发技能

### B. 相关技术文档
- Drizzle ORM: https://orm.drizzle.team/docs/overview
- tRPC: https://trpc.io/docs/