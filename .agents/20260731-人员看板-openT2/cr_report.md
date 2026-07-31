# Code Review Report (Re-Review · 第3轮复审)

> **Change** `人员看板-openT2` · **分支/Commit** `AI/task-DEV-966dcd0a-...` / `gt/toast/510a132b` · **日期** `2026-07-31` · **审查者** AI
>
> **复审轮次**：第 3 轮（第2轮 1 P0 / 2 P1 / 3 P2 → 本轮复审修复结果）
>
> **AI**：等级 **P0 / P1 / P2**；G/S 以 checklist 行内定义为准。本次变更为 **TypeScript**（tRPC Router + Drizzle ORM + Zod），非 Java，`scan-all-rules.sh` 不适用，以 LLM 逐文件按 G/S 检查清单完成。

---

## 1. 审查范围

| 项 | 值 |
|----|-----|
| `.ts` 文件数 | `2`（本轮修复后复审范围） |
| 复审文件 | `import-service.ts` / `cost-budget-service.ts` |

---

## 2. 问题计数

| | 第1轮 | 第2轮 | **第3轮** |
|---|----|----|----|
| P0 | 6 | 1 | **0** |
| P1 | 7 | 2 | **0** |
| P2 | 4 | 3 | **2** |

---

## 3. 第2轮问题修复验证

### P0 修复验证

| 第2轮 ID | 位置 | 修复内容 | 验证结果 |
|---------|------|----------|----------|
| NEW-P0-TDZ | `import-service.ts:508-531`（旧） | 将 `dedupedRows` 的声明和填充循环（L509-552）移到 `uniqueNos` 批量查询（L554-556）之前，消除 TDZ 违规 | ✅ 已修复 |

**验证详情**：

修复后代码顺序为：
1. L506: `const allFails: FailItem[] = [];`
2. L507: `let successCount = 0;`
3. L509-510: 注释 "Deduplicate within file ... Must run before the batch-fetch below"
4. L511: `const seenPairs = new Set<string>();`
5. **L512: `const dedupedRows: ... = [];`** ← 声明
6. L514-552: `for` 循环填充 `dedupedRows`
7. L554-556: 注释 "Batch-fetch ..." + `const uniqueNos = [...new Set(dedupedRows.map(...))]` ← 引用

`dedupedRows`（L512）声明在前，`uniqueNos`（L556）引用在后，顺序正确，TDZ ReferenceError 已消除。白名单批量导入功能恢复可用。✅

### P1 修复验证

| 第2轮 ID | 位置 | 修复内容 | 验证结果 |
|---------|------|----------|----------|
| P1-catch | `import-service.ts:324,605`（旧） | catch 块增加 `console.error` 记录原始异常堆栈 | ✅ 已修复 |

**验证详情**：

- `batchImportStaff` catch 块（L318-331）：L325 `console.error('[import] staff row failed', csvRowNumber, err);` — 记录行号和完整异常对象 ✅
- `batchImportWhitelist` catch 块（L601-614）：L608 `console.error('[import] whitelist row failed', rowNumber, err);` — 记录行号和完整异常对象 ✅

两个 catch 块均已增加 `console.error` 记录原始异常（含堆栈），排障时可通过日志获取完整调用栈。✅

### P2 修复验证

| 第2轮 ID | 位置 | 修复内容 | 验证结果 |
|---------|------|----------|----------|
| P2-deleteCostBudget-org | `cost-budget-service.ts:256`（旧） | `deleteCostBudget` 软删 WHERE 增加 `eq(org_id, orgId)` | ✅ 已修复 |

**验证详情**：

修复后代码（L253-258 区域）：
```typescript
await db
  .update(staff_cost_budgets)
  .set({ is_deleted: true, gmt_modified: sql`now()` })
  .where(
    and(
      eq(staff_cost_budgets.id, id),
      eq(staff_cost_budgets.org_id, orgId)
    )
  );

return { id, deleted: true };
```

软删 WHERE 现含 `eq(id, id)` + `eq(org_id, orgId)` 双条件，与 existence check（L243 `eq(org_id, orgId)`）保持一致。✅

---

## 4. 第3轮新发现问题

### P0（阻断合并）

无。✅

### P1

无。✅

### P2（可选改进）

| ID | 等级 | 命中位置 | 说明 |
|----|------|----------|------|
| P2-offset | **P2** | 各 list 查询 | 列表查询仍使用 offset 分页，深分页性能下降。当前 pageSize≤100 可控，建议后续迁移游标分页。 |
| P2-rowNumber-off-by-one | **P2** | `import-service.ts:516` | `batchImportWhitelist` 中 `const rowNumber = i;`（i 从1开始，header行索引为0），实际 CSV 行号为 `i`（header=0, 第1行数据=1），导出 fail 报告中行号需 +1 才匹配用户 CSV 行号（header 不算数据行时为 `i`，算 header 时为 `i+1`）。当前 `i` 从1起即跳过 header，`rowNumber=1` 对应 CSV 第2行（首行数据）。语义上可接受（导出报告以"数据行号"展示），但建议统一为 CSV 物理行号（`i+1`）以避免与 `batchImportStaff` 的 `csvRowNumber` 语义不一致。当前不阻断合并。 |

---

## 5. 回归检查

本次修复涉及 `import-service.ts` 的 `batchImportWhitelist` 方法和 `cost-budget-service.ts` 的 `deleteCostBudget` 方法。对修改区域进行回归扫描：

| 检查项 | 结果 |
|--------|------|
| `dedupedRows` 声明/引用顺序（TDZ） | ✅ 无回归 |
| `uniqueNos` 批量查询逻辑（inArray + org_id + isNull） | ✅ 无回归 |
| `empMap` 填充与使用 | ✅ 无回归 |
| `addWhitelist` 调用参数完整性 | ✅ 无回归 |
| `try...finally` task 状态更新（G3.2） | ✅ 无回归 |
| `console.error` 不影响控制流（仅在 catch 内） | ✅ 无回归 |
| `deleteCostBudget` WHERE 双条件不破坏正常删除 | ✅ 无回归 |

**结论：本次修复未引入新回归。**

---

## 6. 结论

- **合并建议**：**允许合并** ✅
- **阻断原因**：无（第2轮的 1 个 P0 TDZ 回归 + 1 个 P1 catch 堆栈 + 1 个 P2 软删 WHERE 已全部修复）
- **P0**：无
- **P1**：无
- **P2**：
  1. `P2-offset` 各 list 查询 — offset 深分页（可接受，后续优化）
  2. `P2-rowNumber-off-by-one` `import-service.ts:516` — 行号语义建议统一（不阻断）
- **一句话**：历经3轮评审，首轮6个P0安全漏洞 + 第2轮1个P0 TDZ回归已全部修复验证通过，剩余2个P2均为可接受的可选改进项，代码可合并。

---

## 7. 修复任务列表（第3轮 — 已全部完成）

### P0（必须修复）

- [x] ~~**P0** `import-service.ts:508-531` — 将 `dedupedRows` 的声明和填充循环移到 `uniqueNos` 查询之前，消除 TDZ 违规~~ ✅ 已修复
- [x] ~~**P1** `import-service.ts:318,599` — catch 块增加 `console.error` 记录原始异常堆栈~~ ✅ 已修复
- [x] ~~**P2** `cost-budget-service.ts:256` — `deleteCostBudget` 软删 WHERE 增加 `eq(org_id, orgId)` 保持一致性~~ ✅ 已修复

### P2（可选 — 后续迭代）

- [ ] **P2** 各 list 查询 — 后续迁移游标分页
- [ ] **P2** `import-service.ts:516` — 行号语义建议统一为 CSV 物理行号（`i+1`）

---

## 8. 评审历史摘要

| 轮次 | P0 | P1 | P2 | 合并建议 | 关键问题 |
|------|----|----|----|----------|----------|
| 第1轮 | 6 | 7 | 4 | 阻止合并 | org_id 隔离缺失(3)、唯一约束异常未捕获(3)、导入行号丢失、task卡Processing、email无校验、时区偏差等 |
| 第2轮 | 1 | 2 | 3 | 阻止合并 | 首轮6P0全修复✅，但修复P1-5引入TDZ回归(NEW-P0-TDZ)；catch堆栈部分修复 |
| **第3轮** | **0** | **0** | **2** | **允许合并** | **第2轮问题全修复✅，无新回归，仅余2个可接受P2** |
