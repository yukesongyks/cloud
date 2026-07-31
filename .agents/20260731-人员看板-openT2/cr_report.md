# Code Review Report

> **Change** `人员看板-openT2` · **分支/Commit** `AI/task-DEV-966dcd0a-...` / `gt/toast/510a132b` · **日期** `2026-07-31` · **审查者** AI
>
> **AI**：等级 **P0 / P1 / P2**；G/S 以 checklist 行内定义为准；Bug 模式以 `bug-pattern-checklist.md` 表头为准（Blocker→P0、Major→P1、Info→P2）。**须先**运行 `scan-all-rules.sh` 并将要点并入 §5，**再**写 LLM 结论。问题须含 `path:line` 或清单 ID：可读性 `A3.4`，安全 `S1.1`，可靠性 `G16.2`，Bug 模式 `B012` / `M005` 等。**每个 ❌/⚠️ 问题在 §7 后必须附代码片段**（见 §7.1）。

> **审查适配说明**：本次变更为 **TypeScript** 代码（tRPC Router + Drizzle ORM + Zod），非 Java。技能 `dtazziboot-java-code-review` 的 `scan-all-rules.sh` 仅适用于 `.java` 文件，对 TS 变更无法执行，故 §4.1 预扫标 `N/A(非 Java)`。§3 可读性检查（A1–A7 基于 Java 风格）标 `N/A(非 Java)`，以 TS 社区规范替代评估。§5 可靠性/安全/缺陷模式以 LLM 逐文件按 G/S 检查清单完成，命中写 **规则 ID + `path:line`**。

---

## 1. 审查范围

| 项 | 值 |
|----|-----|
| `.ts` 文件数 | `15` |
| 变更行数 | `+~3100 / -0`（新增功能） |

| 类/接口 | 路径 | 角色（可选） |
|---------|------|--------------|
| `staff-service` | `apps/web/src/lib/staff/staff-service.ts` | 员工 CRUD + 脱敏 |
| `cost-budget-service` | `apps/web/src/lib/staff/cost-budget-service.ts` | 成本预算 CRUD |
| `whitelist-service` | `apps/web/src/lib/staff/whitelist-service.ts` | 白名单增删查 + 过期回收 |
| `import-service` | `apps/web/src/lib/staff/import-service.ts` | 批量导入(员工/白名单) + CSV解析 |
| `dashboard-service` | `apps/web/src/lib/staff/dashboard-service.ts` | 看板汇总 + 部门维度统计 |
| `staff-router` | `apps/web/src/routers/staff/staff-router.ts` | tRPC 员工路由 |
| `cost-budget-router` | `apps/web/src/routers/staff/cost-budget-router.ts` | tRPC 预算路由 |
| `whitelist-router` | `apps/web/src/routers/staff/whitelist-router.ts` | tRPC 白名单路由 |
| `import-router` | `apps/web/src/routers/staff/import-router.ts` | tRPC 导入路由 |
| `dashboard-router` | `apps/web/src/routers/staff/dashboard-router.ts` | tRPC 看板路由 |
| `root-router` | `apps/web/src/routers/root-router.ts` | 路由注册 |
| `schema` | `packages/db/src/schema.ts` | Drizzle 表定义 |
| `schema-types` | `packages/db/src/schema-types.ts` | 枚举定义 |
| `migration` | `packages/db/src/migrations/0155_staff_dashboard_tables.sql` | DDL + 索引 |

---

## 2. 问题计数

| P0 | P1 | P2 |
|----|----|-----|
| 6 | 7 | 4 |

---

## 3. Step 2 — 功能（REQ）

### REQ-1: 员工基本信息增删改查

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 创建员工（必填工号+姓名，唯一性校验，手机/状态校验） | ✅ | `design.md` 员工管理模块 | `staff-service.ts:104-157` createStaff | 实现完整，含唯一性预检 + DB 兜底 |
| 列表查询（分页，关键词，部门/状态过滤） | ✅ | `design.md` 列表分页 | `staff-service.ts:159-203` listStaff | pageSize≤100，DESC排序，索引覆盖 |
| 更新员工（字段级更新，离职状态校验） | ⚠️ | `design.md` 编辑 | `staff-service.ts:205-258` updateStaff | 功能实现，**但缺 org_id 越权校验**（见§5 S2） |
| 删除员工（软删，关联预算/白名单阻断） | ⚠️ | `design.md` 删除关联检查 | `staff-service.ts:260-308` deleteStaff | 关联检查实现，**但 existence check 缺 org_id**（见§5 S2） |
| 查询单个员工（org 隔离，脱敏） | ✅ | `design.md` 详情 | `staff-service.ts:310-328` getStaffById | org_id 隔离正确，脱敏正确 |

### REQ-2: 成本预算记录

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 创建预算（员工存在性，唯一性(员工+类型+周期)，金额校验） | ✅ | `design.md` 成本预算 | `cost-budget-service.ts:70-128` createCostBudget | 含员工存在性 + 唯一性预检 + DB兜底 |
| 列表查询（分页，员工/类型/周期过滤） | ✅ | `design.md` 预算列表 | `cost-budget-service.ts:130-171` | 索引覆盖，分页正确 |
| 更新预算（金额校验，字段级更新） | ⚠️ | `design.md` 预算编辑 | `cost-budget-service.ts:173-212` updateCostBudget | **缺 org_id 越权校验**（见§5 S2） |
| 删除预算（软删，org隔离） | ✅ | `design.md` 预算删除 | `cost-budget-service.ts:214-240` deleteCostBudget | existence check 含 org_id，安全 |

### REQ-3: 白名单管理

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 添加白名单（员工存在性，同员工同类型唯一活跃，日期校验） | ✅ | `design.md` 白名单 | `whitelist-service.ts:62-120` addWhitelist | 校验完整，org隔离正确 |
| 列表查询（分页，员工/类型/状态过滤） | ✅ | `design.md` 白名单列表 | `whitelist-service.ts:122-163` | 索引覆盖，分页正确 |
| 移除白名单（软删，org隔离） | ✅ | `design.md` 白名单删除 | `whitelist-service.ts:165-191` removeWhitelist | existence check 含 org_id，安全 |
| 过期回收（expire_date 过期自动标记） | ❌ | `design.md` 过期回收 | `whitelist-service.ts:197-216` expireOverdueWhitelists | **逻辑错误：expire_date IS NULL 的记录被误判为过期**（见§5） |

### REQ-4: 批量导入

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 员工批量导入（CSV解析，必填校验，去重，逐行写入，失败明细） | ⚠️ | `design.md` 批量导入 | `import-service.ts:222-357` batchImportStaff | 功能完整，**但失败行号丢失 + 进程崩溃无恢复**（见§5） |
| 白名单批量导入（CSV解析，工号→ID映射，去重，逐行写入） | ⚠️ | `design.md` 白名单导入 | `import-service.ts:438-624` batchImportWhitelist | 功能完整，**全量预取员工可能内存溢出**（见§5） |
| 导入模板下载 | ✅ | `design.md` 导入模板 | `import-service.ts:85-100` getImportTemplate | 模板列定义正确 |
| 导入任务历史查询 | ✅ | `design.md` 导入历史 | `import-service.ts:375-410` listImportTasks | 分页正确 |

### REQ-5: 看板统计

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 汇总统计（总人数/各状态人数/白名单数/当月预算总额） | ✅ | `design.md` 看板汇总 | `dashboard-service.ts:43-107` getDashboardSummary | groupBy 查询 + 多源合并，readDb 读副本 |
| 部门维度统计（人数/预算/白名单，按部门聚合） | ✅ | `design.md` 部门维度 | `dashboard-service.ts:109-213` getDashboardByDepartment | 三查询合并到 Map，排序正确 |

---

## 4. Step 3 — 可读性检查

> 无 Java：**N/A**。本次变更为 TypeScript，A1–A7（基于阿里巴巴 Java 代码风格）不直接适用。

| 结果 | 说明（以 TS 社区规范替代评估） |
|------|--------------------------------|
| ✅ | 文件结构清晰：Types → Validation helpers → Service 分区注释明确；命名一致 lowerCamelCase；无 `any` 类型滥用（符合 AGENTS.md 约束）；标准 top-level imports（无 inline import）；Drizzle 查询构建器链式调用风格统一。 |

---

## 5. Step 4 — 可靠性检查

| 域 | 参考 | 结果 | 等级 | 说明（列命中 ID 或「已扫无命中」） |
|----|------|------|------|-------------------------------------|
| 可靠性 | `reliability-checklist.md` G1–G17 | ❌ | P0 | G1.1 命中 3 处（见下）；G8.1 命中 2 处；G3.2 命中 2 处；G4.3 命中 1 处 |
| 安全 | `security-checklist.md` S1–S10 | ❌ | P0 | S2 越权命中 3 处（updateStaff/deleteStaff/updateCostBudget）；S4 输入校验命中 1 处 |
| Bug 模式 | `bug-pattern-checklist.md` B/M/I | N/A | N/A | N/A(非 Java)：`scan-all-rules.sh` 仅适用于 `.java`，TS 变更无法预扫；LLM 逐文件按可靠性/安全清单完成 |

### 5.1 可靠性明细（G 系列）

| ID | 等级 | 命中位置 | 说明 |
|----|------|----------|------|
| G1.1 | P0 | `staff-service.ts:117-131` | `createStaff` 先 `select` 检查 employee_no 唯一性再 `insert`，两步非原子无 `SELECT FOR UPDATE`。并发下存在 TOCTOU 竞态。**有 DB 唯一索引 `uk_staff_employee_org_no` 兜底**，不会产生脏数据，但应用层未捕获 DB 唯一约束异常转为 `STAFF_001` 业务错误，并发请求收到 500 而非友好提示。 |
| G1.1 | P0 | `whitelist-service.ts:84-99` | `addWhitelist` 先查同员工同类型活跃记录再 `insert`，同理 TOCTOU。**有 DB 唯一索引 `uk_staff_wl_emp_type` 兜底**，但未捕获 DB 异常转 `WL_002`。 |
| G1.1 | P0 | `cost-budget-service.ts:92-107` | `createCostBudget` 先查 (employee_id, budget_type, period) 唯一性再 `insert`，同理。**有 DB 唯一索引 `uk_staff_budget_emp_period` 兜底**，但未捕获 DB 异常转 `BUDGET_002`。 |
| G3.2 | P1 | `import-service.ts:248-348` | `batchImportStaff` 在创建 import_task(Processing) 后逐行调用 `createStaff`（多次独立 DB 事务），进程中途崩溃则 task 永远停留在 Processing 状态，无超时回收/补偿机制。 |
| G3.2 | P1 | `import-service.ts:462-615` | `batchImportWhitelist` 同理，task 卡 Processing 无回收。 |
| G4.3 | P1 | `staff-service.ts:159-203`<br>`cost-budget-service.ts:130-171`<br>`whitelist-service.ts:122-163` | 列表查询使用 `offset` 分页，深分页（大 offset）时性能下降。当前 pageSize≤100 可控，但建议后续迁移游标分页。 |
| G8.1 | P1 | `import-service.ts:310-322` | `batchImportStaff` catch 块中非 `UpstreamApiError` 异常笼统归为"写入失败"，未记录原始错误堆栈，排障困难。 |
| G8.1 | P1 | `import-service.ts:581-593` | `batchImportWhitelist` catch 块同理。 |
| G1.3 | N/A | — | 无乐观锁场景。 |
| G2.x | N/A | — | 幂等由 DB 唯一索引兜底，无 MQ/定时重投场景。 |
| G5.x | N/A | — | 无 MQ。 |
| G6.x | N/A | — | 无缓存。 |
| G7.x | N/A | — | 无调度任务（`expireOverdueWhitelists` 为机会式调用，非定时调度）。 |
| G9.x | N/A | — | 无外部 HTTP/RPC 调用。 |

### 5.2 安全明细（S 系列）

| ID | 等级 | 命中位置 | 说明 |
|----|------|----------|------|
| S2 | P0 | `staff-service.ts:217-226, 247-251` | **updateStaff 越权**：existence check `where(eq(id), isNull(is_deleted))` 和 update `where(eq(id))` 均缺 `org_id` 条件。router 层虽校验 `organizationId` 权限，但未传 orgId 给 service。攻击者可用自己 org 的 organizationId + 其他 org 的员工 id 修改他人数据。`UpdateStaffInput` 无 `orgId` 字段。 |
| S2 | P0 | `staff-service.ts:265-271, 302-305` | **deleteStaff 越权**：函数签名有 `orgId` 参数但 existence check `where(eq(id), isNull(is_deleted))` 和最终软删 `where(eq(id))` 均未使用 orgId。攻击者可删除其他 org 的员工。 |
| S2 | P0 | `cost-budget-service.ts:181-187, 201-205` | **updateCostBudget 越权**：existence check `where(eq(id), isNull(is_deleted))` 和 update `where(eq(id))` 均缺 org_id。router 传入 organizationId 但 service 层 `UpdateBudgetInput` 无 orgId 字段。 |
| S4 | P1 | `staff-router.ts:29` | `email` 字段仅 `z.string().max(128)` 校验，无 email 格式校验，可存入非法格式。 |
| S1 | ✅ | — | 已扫无命中：全程使用 Drizzle ORM 参数化查询，`ilike(name, kw)` 中 kw 通过 Drizzle 绑定参数，无 `${}` 字符串拼接 SQL。 |
| S3 | ✅ | `staff-service.ts:86-98` | 脱敏正确：`maskPhone` 隐去中间4位，`idCardNo` 固定 `******`。list/get 均过 `maskEmployee`。 |
| S6 | ✅ | — | 已扫无命中：无硬编码密钥/Token。 |

### 5.3 功能性 Bug

| 等级 | 命中位置 | 说明 |
|------|----------|------|
| P1 | `whitelist-service.ts:197-216` | **expireOverdueWhitelists 逻辑错误**：`or(isNull(expire_date), lte(expire_date, now))` 意味着 `expire_date IS NULL`（永不过期）的记录也被标记为 Expired。应为仅 `lte(expire_date, now)`（不含 IS NULL）。 |
| P1 | `import-service.ts:266, 275-279, 318` | **失败行号丢失**：`mapAndValidateRows(rawRows, 0)` 传入 startRowNumber=0，导致 dedupFails 和 batchFails 的 `row` 全为 0，用户无法定位失败行。应传 `1`（表头行号）或实际行号。 |
| P1 | `import-service.ts:497-506` | **全量预取员工内存风险**：`batchImportWhitelist` 中 `allEmployees` 无分页预取全部员工，大组织（数万员工）可能内存溢出。建议改为按 employeeNo 批量查询。 |
| P2 | `dashboard-service.ts:38-41` | **时区偏差**：`getCurrentPeriod()` 使用 `new Date()` 服务器本地时区，跨时区部署时月度预算统计可能错位。建议使用 UTC 或显式时区。 |

---

## 6. Step 5 — 自定义扩展检查

| 域 | 参考 | 结果 | 等级 | 说明 |
|----|------|------|------|------|
| 自定义扩展 | `customized-checklist.md` U* | N/A | N/A | 未启用自定义规则 |

---

## 7. 结论

- **合并建议**：**阻止合并**
- **P0**：
  1. `S2` `staff-service.ts:217-251` — updateStaff 缺 org_id 越权校验，可跨组织修改员工数据
  2. `S2` `staff-service.ts:265-305` — deleteStaff 缺 org_id 越权校验（orgId 参数未使用），可跨组织删除员工
  3. `S2` `cost-budget-service.ts:181-205` — updateCostBudget 缺 org_id 越权校验，可跨组织修改预算
  4. `G1.1` `staff-service.ts:117-131` — createStaff 先查后插无锁，有 DB 兜底但未捕获唯一约束异常
  5. `G1.1` `whitelist-service.ts:84-99` — addWhitelist 先查后插无锁，有 DB 兜底但未捕获唯一约束异常
  6. `G1.1` `cost-budget-service.ts:92-107` — createCostBudget 先查后插无锁，有 DB 兜底但未捕获唯一约束异常
- **P1/P2**：
  1. `P1` `whitelist-service.ts:203` — expireOverdueWhitelists 逻辑错误，expire_date IS NULL 被误过期
  2. `P1` `import-service.ts:266,318` — 导入失败行号丢失（全为0）
  3. `P1` `import-service.ts:497-506` — 全量预取员工内存溢出风险
  4. `P1` `import-service.ts:248-348,462-615` — 导入 task 卡 Processing 无回收
  5. `P1` `import-service.ts:310-322,581-593` — catch 吞异常无堆栈
  6. `P1` `staff-router.ts:29` — email 无格式校验
  7. `P1` 列表查询 offset 深分页性能
  8. `P2` `dashboard-service.ts:38-41` — 时区偏差
- **一句话**：功能覆盖完整、架构分层清晰，但存在 3 处跨组织越权漏洞（P0）和多处可靠性缺陷，须修复后方可合并。

---

## 7.1 问题片段

> **规则**：对 §3–§7 中每个 `❌/⚠️` 问题，提供一段对应代码片段（最少 3 行，建议 5–15 行），标题写 `path:startLine-endLine`，代码行前用 `Lxx|` 标注。本次变更为 TypeScript（非 Java），片段标注 `N/A(非 Java)` 的规则不适用。

### P0-S2-1: updateStaff 越权

- **P0** `S2` `apps/web/src/lib/staff/staff-service.ts:217-251` — existence check 和 update WHERE 均缺 org_id 条件，可跨组织修改员工。

片段范围：`apps/web/src/lib/staff/staff-service.ts:217-251`

```typescript
L217|  const [existing] = await db
L218|    .select()
L219|    .from(staff_employees)
L220|    .where(
L221|      and(
L222|        eq(staff_employees.id, input.id),
L223|        isNull(staff_employees.is_deleted)   // 问题：缺 eq(org_id, orgId)
L224|      )
L225|    )
L226|    .limit(1);
...
L247|  const [updated] = await db
L248|    .update(staff_employees)
L249|    .set(updateFields)
L250|    .where(eq(staff_employees.id, input.id))  // 问题：缺 org_id 条件
L251|    .returning({ gmt_modified: staff_employees.gmt_modified });
```

### P0-S2-2: deleteStaff 越权

- **P0** `S2` `apps/web/src/lib/staff/staff-service.ts:260-308` — orgId 参数传入但 existence check 和软删 WHERE 均未使用 orgId。

片段范围：`apps/web/src/lib/staff/staff-service.ts:260-308`

```typescript
L260|export async function deleteStaff(
L261|  id: number,
L262|  orgId: string          // orgId 参数存在
L263|): Promise<{ id: number; deleted: boolean }> {
L264|  // Check existence
L265|  const [existing] = await db
L266|    .select({ id: staff_employees.id })
L267|    .from(staff_employees)
L268|    .where(
L269|      and(eq(staff_employees.id, id), isNull(staff_employees.is_deleted))
           // 问题：orgId 未出现在 WHERE 中
L270|    )
L271|    .limit(1);
...
L302|  await db
L303|    .update(staff_employees)
L304|    .set({ is_deleted: true, gmt_modified: sql`now()` })
L305|    .where(eq(staff_employees.id, id));  // 问题：缺 org_id 条件
```

### P0-S2-3: updateCostBudget 越权

- **P0** `S2` `apps/web/src/lib/staff/cost-budget-service.ts:181-205` — existence check 和 update WHERE 均缺 org_id。

片段范围：`apps/web/src/lib/staff/cost-budget-service.ts:181-205`

```typescript
L181|  const [existing] = await db
L182|    .select({ id: staff_cost_budgets.id })
L183|    .from(staff_cost_budgets)
L184|    .where(
L185|      and(eq(staff_cost_budgets.id, input.id), isNull(staff_cost_budgets.is_deleted))
           // 问题：缺 eq(org_id, orgId)
L186|    )
L187|    .limit(1);
...
L201|  const [updated] = await db
L202|    .update(staff_cost_budgets)
L203|    .set(updateFields)
L204|    .where(eq(staff_cost_budgets.id, input.id))  // 问题：缺 org_id 条件
L205|    .returning({ gmt_modified: staff_cost_budgets.gmt_modified });
```

### P0-G1.1-1: createStaff 先查后插无锁

- **P0** `G1.1` `apps/web/src/lib/staff/staff-service.ts:117-131` — select 检查唯一性后 insert，两步非原子无锁。有 DB 唯一索引兜底但应用层未捕获异常。

片段范围：`apps/web/src/lib/staff/staff-service.ts:116-135`

```typescript
L116|  // Check employee_no uniqueness within org (among non-deleted rows)
L117|  const existing = await db
L118|    .select({ id: staff_employees.id })
L119|    .from(staff_employees)
L120|    .where(
L121|      and(
L122|        eq(staff_employees.org_id, input.orgId),
L123|        eq(staff_employees.employee_no, input.employeeNo),
L124|        isNull(staff_employees.is_deleted)
L125|      )
L126|    )
L127|    .limit(1);
L128|
L129|  if (existing.length > 0) {
L130|    throw new UpstreamApiError('STAFF_001');
L131|  }
L132|
L133|  const [created] = await db
L134|    .insert(staff_employees)
L135|    .values({ ... })
```

### P0-G1.1-2: addWhitelist 先查后插无锁

- **P0** `G1.1` `apps/web/src/lib/staff/whitelist-service.ts:84-99` — 同理先查后插。有 DB 唯一索引兜底但未捕获异常。

片段范围：`apps/web/src/lib/staff/whitelist-service.ts:83-101`

```typescript
L83|  // Check for an existing active record of same type for this employee
L84|  const [existing] = await db
L85|    .select({ id: staff_whitelists.id })
L86|    .from(staff_whitelists)
L87|    .where(
L88|      and(
L89|        eq(staff_whitelists.employee_id, input.employeeId),
L90|        eq(staff_whitelists.wl_type, input.wlType),
L91|        eq(staff_whitelists.status, WhitelistStatus.Active),
L92|        isNull(staff_whitelists.is_deleted)
L93|      )
L94|    )
L95|    .limit(1);
L96|
L97|  if (existing) {
L98|    throw new UpstreamApiError('WL_002');
L99|  }
L100|
L101|  const [created] = await db
L102|    .insert(staff_whitelists)
```

### P0-G1.1-3: createCostBudget 先查后插无锁

- **P0** `G1.1` `apps/web/src/lib/staff/cost-budget-service.ts:92-107` — 同理。有 DB 唯一索引兜底但未捕获异常。

片段范围：`apps/web/src/lib/staff/cost-budget-service.ts:91-109`

```typescript
L91|  // Check uniqueness (employee_id, budget_type, period)
L92|  const [existing] = await db
L93|    .select({ id: staff_cost_budgets.id })
L94|    .from(staff_cost_budgets)
L95|    .where(
L96|      and(
L97|        eq(staff_cost_budgets.employee_id, input.employeeId),
L98|        eq(staff_cost_budgets.budget_type, input.budgetType),
L99|        eq(staff_cost_budgets.period, input.period),
L100|        isNull(staff_cost_budgets.is_deleted)
L101|      )
L102|    )
L103|    .limit(1);
L104|
L105|  if (existing) {
L106|    throw new UpstreamApiError('BUDGET_002');
L107|  }
L108|
L109|  const [created] = await db
L110|    .insert(staff_cost_budgets)
```

### P1: expireOverdueWhitelists 逻辑错误

- **P1** `whitelist-service.ts:197-214` — `or(isNull(expire_date), lte(expire_date, now))` 将 expire_date IS NULL（永不过期）的记录误标为 Expired。

片段范围：`apps/web/src/lib/staff/whitelist-service.ts:197-214`

```typescript
L197|export async function expireOverdueWhitelists(orgId?: string): Promise<number> {
L198|  const now = new Date().toISOString().slice(0, 10);
L199|
L200|  const conditions = [
L201|    eq(staff_whitelists.status, WhitelistStatus.Active),
L202|    isNull(staff_whitelists.is_deleted),
L203|    or(isNull(staff_whitelists.expire_date), lte(staff_whitelists.expire_date, now)),
            // 问题：isNull(expire_date) 意味着"永不过期"，不应被过期
L204|  ];
```

### P1: 导入失败行号丢失

- **P1** `import-service.ts:266,275-279,318` — `mapAndValidateRows(rawRows, 0)` 传入 startRowNumber=0，导致所有失败行 row=0。

片段范围：`apps/web/src/lib/staff/import-service.ts:266-280`

```typescript
L266|  const { mapped, fails } = mapAndValidateRows(rawRows, 0);
            // 问题：startRowNumber=0 导致行号从0开始，实际应为1(表头)
...
L273|  for (const row of mapped) {
L274|    if (seenNos.has(row.employeeNo)) {
L275|      dedupFails.push({
L276|        row: 0,              // 问题：行号丢失
L277|        reason: '文件内工号重复，已跳过',
L278|        data: `${row.employeeNo},${row.name}`,
L279|      });
```

### P1: 全量预取员工内存风险

- **P1** `import-service.ts:497-510` — 无分页预取全部员工到内存。

片段范围：`apps/web/src/lib/staff/import-service.ts:497-510`

```typescript
L497|  // Pre-fetch all employees in this org for employeeNo → id lookup
L498|  const allEmployees = await db
L499|    .select({ id: staff_employees.id, employee_no: staff_employees.employee_no })
L500|    .from(staff_employees)
L501|    .where(
L502|      and(
L503|        eq(staff_employees.org_id, orgId),
L504|        isNull(staff_employees.is_deleted)
L505|      )
L506|    );
            // 问题：无 LIMIT，大组织数万员工可能内存溢出
L507|  const empMap = new Map<string, number>();
L508|  for (const emp of allEmployees) {
L509|    empMap.set(emp.employee_no, emp.id);
L510|  }
```

### P1: catch 吞异常无堆栈

- **P1** `import-service.ts:310-322` — 非 UpstreamApiError 异常笼统归"写入失败"，无堆栈记录。

片段范围：`apps/web/src/lib/staff/import-service.ts:310-322`

```typescript
L310|      } catch (err) {
L311|        const reason =
L312|          err instanceof UpstreamApiError
L313|            ? err.upstreamCode === 'STAFF_001'
L314|              ? '工号已存在'
L315|              : err.upstreamCode
L316|            : '写入失败';        // 问题：吞异常无 console.error/log
L317|        batchFails.push({
L318|          row: 0,               // 问题：行号也丢失
L319|          reason,
L320|          data: `${row.employeeNo},${row.name}`,
L321|        });
L322|      }
```

### P2: 时区偏差

- **P2** `dashboard-service.ts:38-41` — `new Date()` 使用服务器本地时区。

片段范围：`apps/web/src/lib/staff/dashboard-service.ts:38-41`

```typescript
L38|function getCurrentPeriod(): string {
L39|  const now = new Date();    // 问题：本地时区，跨时区部署月度统计可能错位
L40|  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
L41|}
```

---

## 8. 修复任务列表

> 供后续改代码时逐项执行与核销；须与 §3–§7 中 ❌/⚠️ 及结论中的可执行项对应。

### P0

- [ ] **P0** `apps/web/src/lib/staff/staff-service.ts:205-258` — `UpdateStaffInput` 增加 `orgId` 字段，updateStaff existence check 和 update WHERE 增加 `eq(staff_employees.org_id, orgId)` 条件，router 层传 `organizationId`
- [ ] **P0** `apps/web/src/lib/staff/staff-service.ts:260-308` — deleteStaff existence check 增加 `eq(staff_employees.org_id, orgId)` 条件，软删 WHERE 增加 org_id 条件
- [ ] **P0** `apps/web/src/lib/staff/cost-budget-service.ts:173-212` — `UpdateBudgetInput` 增加 `orgId` 字段，updateCostBudget existence check 和 update WHERE 增加 `eq(staff_cost_budgets.org_id, orgId)` 条件，router 层传 `organizationId`
- [ ] **P0** `apps/web/src/lib/staff/staff-service.ts:133-150` — createStaff insert 包裹 try-catch 捕获 DB 唯一约束异常（PostgreSQL `23505`），转为 `UpstreamApiError('STAFF_001')` 友好提示
- [ ] **P0** `apps/web/src/lib/staff/whitelist-service.ts:101-113` — addWhitelist insert 同理捕获唯一约束异常转 `WL_002`
- [ ] **P0** `apps/web/src/lib/staff/cost-budget-service.ts:109-121` — createCostBudget insert 同理捕获唯一约束异常转 `BUDGET_002`

### P1

- [ ] **P1** `apps/web/src/lib/staff/whitelist-service.ts:203` — 移除 `isNull(expire_date)` 条件，仅保留 `lte(expire_date, now)`，使永不过期记录不被误标记
- [ ] **P1** `apps/web/src/lib/staff/import-service.ts:266` — `mapAndValidateRows(rawRows, 1)` 传入 startRowNumber=1（表头行号），使失败行号正确反映 CSV 行号
- [ ] **P1** `apps/web/src/lib/staff/import-service.ts:318` — batchImportStaff catch 块增加 `console.error` 或 logger 记录原始异常堆栈
- [ ] **P1** `apps/web/src/lib/staff/import-service.ts:582-593` — batchImportWhitelist catch 块同理增加异常堆栈记录
- [ ] **P1** `apps/web/src/lib/staff/import-service.ts:497-506` — 改为按 CSV 中出现的 employeeNo 集合做批量 `inArray` 查询，避免全量预取
- [ ] **P1** `apps/web/src/lib/staff/import-service.ts:248-348,462-615` — 增加 import_task Processing 超时回收机制（定时扫描或查询时补偿）
- [ ] **P1** `apps/web/src/routers/staff/staff-router.ts:29` — email 字段增加 `z.string().email()` 格式校验

### P2（可选）

- [ ] **P2** `apps/web/src/lib/staff/dashboard-service.ts:38-41` — `getCurrentPeriod()` 改用 UTC 或配置时区
- [ ] **P2** 列表查询考虑后续迁移为游标分页（基于 `id DESC` 的 keyset pagination）
- [ ] **P2** `apps/web/src/lib/staff/import-service.ts:275-279` — dedupFails 中 row 字段补充实际 CSV 行号（需在 dedup 循环中追踪行号）
