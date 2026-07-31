# Code Review Report (Re-Review · 修复后复审)

> **Change** `人员看板-openT2` · **分支/Commit** `AI/task-DEV-966dcd0a-...` / `gt/toast/510a132b` · **日期** `2026-07-31` · **审查者** AI
>
> **复审轮次**：第 2 轮（首轮 6 P0 / 7 P1 / 4 P2 → 本轮复审修复结果）
>
> **AI**：等级 **P0 / P1 / P2**；G/S 以 checklist 行内定义为准。本次变更为 **TypeScript**（tRPC Router + Drizzle ORM + Zod），非 Java，`scan-all-rules.sh` 不适用，以 LLM 逐文件按 G/S 检查清单完成。

---

## 1. 审查范围

| 项 | 值 |
|----|-----|
| `.ts` 文件数 | `7`（修复后复审范围） |
| 复审文件 | staff-service / cost-budget-service / whitelist-service / import-service / dashboard-service / staff-router / cost-budget-router |

---

## 2. 问题计数

| | 首轮 | 本轮 |
|---|----|----|
| P0 | 6 | **1** |
| P1 | 7 | **2** |
| P2 | 4 | **3** |

---

## 3. 首轮 P0 修复验证

| 首轮 ID | 位置 | 修复内容 | 验证结果 |
|---------|------|----------|----------|
| P0-S2-1 | `staff-service.ts:216-275` | `UpdateStaffInput` 增加 `orgId`，existence check（:234）和 update WHERE（:264-265）均加 `eq(org_id, orgId)`，router 传 `organizationId` | ✅ 已修复 |
| P0-S2-2 | `staff-service.ts:277-336` | existence check（:288）、关联检查（:305,316）、软删 WHERE（:331）均加 `eq(org_id, orgId)` | ✅ 已修复 |
| P0-S2-3 | `cost-budget-service.ts:183-231` | `UpdateBudgetInput` 增加 `orgId`，existence check（:197）和 update WHERE（:221）均加 `eq(org_id, orgId)`，router 传 `organizationId` | ✅ 已修复 |
| P0-G1.1-1 | `staff-service.ts:135-161` | insert 包裹 try-catch，捕获 PostgreSQL `23505` 转 `STAFF_001` | ✅ 已修复 |
| P0-G1.1-2 | `whitelist-service.ts:101-122` | insert 包裹 try-catch，捕获 `23505` 转 `WL_002` | ✅ 已修复 |
| P0-G1.1-3 | `cost-budget-service.ts:110-131` | insert 包裹 try-catch，捕获 `23505` 转 `BUDGET_002` | ✅ 已修复 |

**首轮 6 个 P0 全部修复 ✅**

---

## 4. 首轮 P1/P2 修复验证

| 首轮 ID | 位置 | 修复内容 | 验证结果 |
|---------|------|----------|----------|
| P1 expireOverdueWhitelists | `whitelist-service.ts:206-216` | 移除 `or(isNull(expire_date))`，仅保留 `lte(expire_date, now)`，注释说明 NULL 语义 | ✅ 已修复 |
| P1 导入失败行号丢失 | `import-service.ts:266` | `mapAndValidateRows(rawRows, 1)`；dedup 循环追踪 `csvRowNumber = idx+2`（:277）；batchFails 用 `rowNumbers[]`（:302,326） | ✅ 已修复 |
| P1 catch 吞异常无堆栈 | `import-service.ts:324,605` | 非 UpstreamApiError 异常 reason 改为 `` `写入失败: ${err.message}` `` | ⚠️ 部分修复（见 §5 P1） |
| P1 全量预取员工 | `import-service.ts:508-527` | 改为按 CSV employeeNo 集合 `inArray` 批量查询 | ❌ 引入新 P0（见 §5 P0） |
| P1 task 卡 Processing | `import-service.ts:296-357,574-635` | 增加 `try...finally`，finally 块更新 task 状态 | ✅ 已修复 |
| P1 email 无格式校验 | `staff-router.ts:29,92` | `z.string().max(128).email().optional()` | ✅ 已修复 |
| P2 时区偏差 | `dashboard-service.ts:40-43` | 改用 `getUTCFullYear()` / `getUTCMonth()` | ✅ 已修复 |
| P2 dedupFails 行号 | `import-service.ts:277-280` | dedup 循环追踪 `csvRowNumber` | ✅ 已修复 |
| P2 offset 深分页 | 各 list 查询 | 仍使用 offset 分页 | ⚠️ 保留 P2（可接受后续优化） |

---

## 5. 本轮新发现问题

### P0（阻断合并）

| ID | 等级 | 命中位置 | 说明 |
|----|------|----------|------|
| NEW-P0-TDZ | **P0** | `import-service.ts:510 vs 531` | **batchImportWhitelist 使用 dedupedRows 在声明前引用（TDZ 违规）**：第 510 行 `const uniqueNos = [...new Set(dedupedRows.map(r => r.data.employeeNo))]` 引用了 `dedupedRows`，但 `dedupedRows` 在第 531 行才通过 `const` 声明。JavaScript `const` 存在 Temporal Dead Zone，运行时会抛出 `ReferenceError: Cannot access 'dedupedRows' before initialization`。**白名单批量导入功能完全不可用**。这是修复 P1-5（全量预取→inArray 批量查询）时引入的回归。修复方案：将 `dedupedRows` 的声明和填充循环（第 529-571 行）移到 `uniqueNos` 查询（第 510 行）之前。 |

### P1

| ID | 等级 | 命中位置 | 说明 |
|----|------|----------|------|
| P1-catch | **P1** | `import-service.ts:324,605` | catch 块异常处理有改进（从笼统"写入失败"改为包含 `err.message`），但仍无完整堆栈记录（`console.error` / logger）。排障时仅有单行 message，丢失调用栈。建议增加 `console.error(\`[import] row ${csvRowNumber} failed\`, err)` 或接入 logger。降级为 P2 亦可接受。 |

### P2

| ID | 等级 | 命中位置 | 说明 |
|----|------|----------|------|
| P2-offset | **P2** | 各 list 查询 | 列表查询仍使用 offset 分页，深分页性能下降。当前 pageSize≤100 可控，建议后续迁移游标分页。 |
| P2-catch-stack | **P2** | `import-service.ts:324,605` | catch 块无完整堆栈记录（见 P1-catch，可降级为 P2） |
| P2-deleteCostBudget-org | **P2** | `cost-budget-service.ts:256` | `deleteCostBudget` 软删 WHERE 仅 `eq(id)` 缺 `org_id`（existence check 已含 org_id :243，故安全，但建议 WHERE 也加 org_id 保持一致性） |

---

## 6. 结论

- **合并建议**：**阻止合并**
- **阻断原因**：首轮 6 个 P0 已全部修复 ✅，但修复 P1-5（全量预取员工）时引入了 **1 个新 P0 回归**（`batchImportWhitelist` TDZ 违规），导致白名单批量导入功能完全不可用。
- **P0**：
  1. `NEW-P0-TDZ` `import-service.ts:510` — `dedupedRows` 在声明前被引用，白名单批量导入运行即抛 ReferenceError
- **P1**：
  1. `P1-catch` `import-service.ts:324,605` — catch 块异常处理有改进但无完整堆栈
- **P2**：
  1. `P2-offset` 各 list 查询 — offset 深分页
  2. `P2-catch-stack` — 同 P1-catch，可降级
  3. `P2-deleteCostBudget-org` `cost-budget-service.ts:256` — 软删 WHERE 缺 org_id（existence check 已含，安全但不一致）
- **一句话**：首轮安全漏洞全部修复，但修复引入了白名单导入 TDZ 回归（P0），须修复后方可合并。

---

## 7. 问题片段

### NEW-P0: batchImportWhitelist TDZ 违规

- **P0** `apps/web/src/lib/staff/import-service.ts:508-531` — `dedupedRows` 在第 510 行被引用，但第 531 行才声明。

片段范围：`apps/web/src/lib/staff/import-service.ts:505-535`

```typescript
L505|   const allFails: FailItem[] = [];
L506|   let successCount = 0;
L507|
L508|   // Batch-fetch only the employees referenced in this import file (by employeeNo),
L509|   // instead of loading the entire org's employee table — avoids OOM for large orgs.
L510|   const uniqueNos = [...new Set(dedupedRows.map(r => r.data.employeeNo))];
            // 问题：dedupedRows 在此引用，但下方第 531 行才声明
L511|   const empMap = new Map<string, number>();
L512|   for (let i = 0; i < uniqueNos.length; i += BATCH_SIZE) {
...
L527|   }
L528|
L529|   // Deduplicate within file — keep first occurrence of each (employeeNo, wlType) pair
L530|   const seenPairs = new Set<string>();
L531|   const dedupedRows: { rowNumber: number; data: WhitelistImportRow }[] = [];
            // 声明在此，但上方第 510 行已引用 → TDZ ReferenceError
```

### P1: catch 块异常处理（改进但有残留）

- **P1** `apps/web/src/lib/staff/import-service.ts:318-330` — 非 UpstreamApiError 异常 reason 含 `err.message` 但无堆栈记录。

片段范围：`apps/web/src/lib/staff/import-service.ts:318-330`

```typescript
L318|       } catch (err) {
L319|         const reason =
L320|           err instanceof UpstreamApiError
L321|             ? err.upstreamCode === 'STAFF_001'
L322|               ? '工号已存在'
L323|               : err.upstreamCode
L324|             : `写入失败: ${err instanceof Error ? err.message : String(err)}`;
            // 改进：含 err.message；残留：无 console.error / logger 记录堆栈
L325|         batchFails.push({
L326|           row: csvRowNumber,
L327|           reason,
L328|           data: `${row.employeeNo},${row.name}`,
L329|         });
L330|       }
```

### P2: deleteCostBudget 软删 WHERE 缺 org_id

- **P2** `apps/web/src/lib/staff/cost-budget-service.ts:253-256` — existence check（:243）已含 org_id，安全；但软删 WHERE 仅 `eq(id)`。

片段范围：`apps/web/src/lib/staff/cost-budget-service.ts:253-258`

```typescript
L253|   await db
L254|     .update(staff_cost_budgets)
L255|     .set({ is_deleted: true, gmt_modified: sql`now()` })
L256|     .where(eq(staff_cost_budgets.id, id));
            // 建议加 eq(org_id, orgId) 保持与 existence check 一致
L257|
L258|   return { id, deleted: true };
```

---

## 8. 修复任务列表（本轮）

### P0（必须修复）

- [ ] **P0** `apps/web/src/lib/staff/import-service.ts:508-531` — 将 `dedupedRows` 的声明和填充循环（第 529-571 行）移到 `uniqueNos` 查询（第 510 行）之前，消除 TDZ 违规，使白名单批量导入可用

### P1

- [ ] **P1** `apps/web/src/lib/staff/import-service.ts:318,599` — catch 块增加 `console.error` 或 logger 记录原始异常堆栈（至少 `console.error('[import] row failed', csvRowNumber, err)`）

### P2（可选）

- [ ] **P2** `apps/web/src/lib/staff/cost-budget-service.ts:256` — `deleteCostBudget` 软删 WHERE 增加 `eq(org_id, orgId)` 保持一致性
- [ ] **P2** 各 list 查询 — 后续迁移游标分页
