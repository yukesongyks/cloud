# Code Review Report

> **Change** 新增算法演示页面（路由 /algorithm-demo） · **分支** `AI/task-DEV-f4ad1a6e-7360-11f1-8c66-df5563d236aa-36b84e0b-5802-4a19-a22d-59332556b072` · **日期** 2026-08-24 · **审查者** AI

> **AI**：等级 **P0（阻塞）/ P1（推荐修复）/ P2（参考）**。本审查为 TypeScript/React 项目，审查维度沿用技能框架（功能性/可读性/可靠性/安全/缺陷模式），已适配前端/Node.js 上下文。`scan-all-rules.sh` 对 TS 文件不可用，全部由 LLM 逐文件审查。

---

## §1 审查范围

| # | 文件 | 状态 |
|---|------|------|
| 1 | `apps/web/src/components/algorithm-demo/types.ts` | ✅ 已审 |
| 2 | `apps/web/src/components/algorithm-demo/TextIconButton.tsx` | ✅ 已审 |
| 3 | `apps/web/src/components/algorithm-demo/OneSegmented.tsx` | ✅ 已审 |
| 4 | `apps/web/src/components/algorithm-demo/TypeTabs.tsx` | ✅ 已审 |
| 5 | `apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx` | ✅ 已审 |
| 6 | `apps/web/src/components/algorithm-demo/ExportButton.tsx` | ✅ 已审 |
| 7 | `apps/web/src/components/algorithm-demo/InvocationStats.tsx` | ✅ 已审 |
| 8 | `apps/web/src/app/(app)/algorithm-demo/page.tsx` | ✅ 已审 |
| 9 | `apps/web/src/app/api/dtcoder/algorithm/route.ts` | ⚠️ 已审有问题 |
| 10 | `apps/web/src/app/api/dtcoder/export/route.ts` | ⚠️ 已审有问题 |
| 11 | `apps/web/src/app/api/dtcoder/stats/route.ts` | ✅ 已审 |
| 12 | `apps/web/package.json` | ✅ 已审 |

---

## §2 功能性检查（对照需求描述）

| REQ | 描述 | 结果 | 证据 |
|-----|------|------|------|
| REQ-1 | 路由 `/algorithm-demo` 使用 TypeTabs 实现三个 Tab（Helloworld/哈希算法/冒泡排序） | ✅ | `page.tsx:13-17` ALGORITHM_TABS 定义三个 tab；`page.tsx:109` 使用 TypeTabs 渲染 |
| REQ-2 | 每个 Tab 调用后端 REST API 并展示执行结果 | ✅ | `AlgorithmPanel.tsx:88` fetch `/api/dtcoder/algorithm`；`AlgorithmPanel.tsx:151-163` 展示结果 |
| REQ-3 | 导出按钮调用 POST /api/dtcoder/export 下载文件（excel/csv，blob 下载） | ✅ | `ExportButton.tsx:29` fetch `/api/dtcoder/export`；`ExportButton.tsx:40-49` blob 下载 + URL.revokeObjectURL；`export/route.ts:128-246` 完整 XLSX ZIP 生成器 |
| REQ-4 | InvocationStats 使用 @ant-design/charts 展示折线图/饼图/柱状图 | ✅ | `InvocationStats.tsx:4` 导入 Line/Column/Pie from `@ant-design/charts`；`InvocationStats.tsx:204/258/307` 分别渲染 |
| REQ-5 | 支持按人员类型/层级/部门维度筛选 | ✅ | `InvocationStats.tsx:22-26` FILTER_OPTIONS；`InvocationStats.tsx:246-250` OneSegmented 维度切换；`page.tsx:44-46` 查询参数传递；`stats/route.ts:43-61` 正确读取 searchParams 并过滤 |
| REQ-6 | 遵循 AGENTS.md 规范，使用 TextIconButton、TypeTabs、OneSegmented | ✅ | 全部使用项目自有组件，搭配 Card/CardContent 等 UI 组件 |

**REQ 结论**：所有功能点均已实现，无功能性不符。

---

## §3 可靠性检查

### G1 并发控制
- `AlgorithmPanel.tsx:36-40`：`AbortController` 取消前一个请求，避免竞态 ✅
- `ExportButton.tsx:20-24`：同上 ✅
- `page.tsx:34-38`：`fetchStats` 使用 `AbortController` ✅

### G2 边界条件 & 输入校验
- `route.ts (algorithm):47-51`：hash 输入长度 ≤ 10000，超限返回 400 ✅
- `route.ts (algorithm):62-63`：bubblesort 空数组校验，返回 400 ✅
- `route.ts (algorithm):66-70`：bubblesort 数组长度 ≤ 1000 ✅
- `AlgorithmPanel.tsx:46-79`：客户端同样做了输入长度/空值校验 ✅
- `route.ts (algorithm):76-77`：default 分支拒绝未知 `kind` ✅
- `route.ts (export):281`：拒绝非 excel/csv 格式 ✅

### G3 错误处理
- `AlgorithmPanel.tsx:103-108`：catch 正确处理 AbortError（`DOMException.name === 'AbortError'`），其他错误展示 message ✅
- `ExportButton.tsx:50-56`：同上 ✅
- `page.tsx:56-62`：`fetchStats` catch 正确处理 AbortError，设置 `statsError` 状态 ✅
- `route.ts (algorithm):90-96`：服务端 try/catch 返回 500 + error message ✅
- `route.ts (export):282-288`：同上 ✅
- `route.ts (stats):87-93`：同上 ✅
- `InvocationStats.tsx:43-86`：`StatsErrorBoundary` 类组件捕获图表渲染错误，提供重试 ✅

### G4 资源释放
- `ExportButton.tsx:49`：`URL.revokeObjectURL(url)` 正确释放 blob URL ✅
- `ExportButton.tsx:48`：`document.body.removeChild(link)` 清理 DOM ✅

### G5 速率限制
- ⚠️ **P1** — `route.ts (algorithm)` POST 端点无速率限制，可能被滥用
- ⚠️ **P1** — `route.ts (export)` POST 端点无速率限制

### G6 加载/空/错误状态
- `InvocationStats.tsx:124-139`：Skeleton 加载态 ✅
- `InvocationStats.tsx:141-149`：空数据提示 ✅
- `page.tsx:153-164`：stats 错误展示 + 重试按钮 ✅
- `AlgorithmPanel.tsx:145-149`：错误展示 ✅
- `TextIconButton.tsx:42/46/60`：loading 态 spinner + "加载中..." ✅

---

## §4 安全检查

### S1 CSRF
- 🔴 **P0** — `route.ts (algorithm):29`：CSRF Origin 校验存在旁路漏洞

  ```typescript
  // 当前代码（有漏洞）
  if (origin && host && !origin.endsWith(host) && !referer?.includes(host)) {
  ```

  **问题分析**：`origin.endsWith(host)` 过于宽松。例如当 `host = "example.com"` 时，`origin = "https://evil-example.com"` 的 `"evil-example.com".endsWith("example.com")` 返回 `true`，请求会通过 CSRF 校验。攻击者只需注册一个以目标域名结尾的域名即可绕过。

  **修复建议**：
  ```typescript
  // 提取 hostname 做精确比较
  let originHost: string | null = null;
  try { originHost = origin ? new URL(origin).hostname : null; } catch { /* origin 格式异常 */ }
  if (originHost && host && originHost !== host && !referer?.includes(host)) {
  ```

- 🔴 **P0** — `route.ts (export):253`：相同的 CSRF Origin 旁路漏洞（与 algorithm 路由完全一致的代码）

### S2 认证/授权
- ⚠️ **P1** — 所有 `/api/dtcoder/*` 端点未做认证校验。假设由 Next.js middleware 全局处理，但代码中未体现。建议确认 middleware 已覆盖 `/api/dtcoder/*` 路由。

### S3 输入校验
- `route.ts (algorithm):34`：`request.json()` 后做类型断言，配合后续长度/空值校验补足 ✅
- `route.ts (algorithm):76-77`：switch default 拒绝未知 kind ✅
- 无 SQL 注入/XXE/命令执行/反序列化场景 ✅

### S4 密钥泄露
- 无硬编码密钥/凭证 ✅

### S5 依赖安全
- `@ant-design/charts: ^2.1.0` 已在 `package.json:35` 声明 ✅
- `@radix-ui/react-tabs` 已在 `package.json` 声明 ✅

---

## §5 可读性检查

| ID | 规则 | 结果 | 说明 |
|----|------|------|------|
| A1 | 命名规范 | ✅ | `AlgorithmKind`、`AlgorithmResult`、`ExportFormat`、`StatsFilter` 等类型命名清晰；`ALGORITHM_LABELS`、`DEFAULT_INPUTS`、`PLACEHOLDER_TEXTS` 常量命名规范；事件处理函数 `handleResult`、`handleExport`、`handleToggleStats` 命名一致 |
| A2 | 注释 | ✅ | `types.ts:13` InvocationStatEntry 标注 TODO；`export/route.ts:19` XLSX 分段注释；`InvocationStats.tsx:39` ErrorBoundary 分段注释；`InvocationStats.tsx:106` fix 注释说明 newDim |
| A3 | 代码结构 | ⚠️ | **P2** — `export/route.ts:19-246` XLSX 生成器（CRC32、ZIP 构建、XML 生成）约 230 行内联在路由中，建议提取到独立工具模块（如 `@/lib/xlsx-generator`）以提高可维护性和可测试性 |
| A4 | 类型安全 | ✅ | 所有组件 Props 显式类型；`OneSegmented` 使用泛型 `<T extends string>`；JSON 解析处 `as` 断言合理 |
| A5 | 魔法数字 | ✅ | 输入长度限制 `10000`/`1000` 在客户端和服务端保持一致；`page.tsx:29` `.slice(0, 20)` 可接受 |
| A6 | 导入排序 | ✅ | React → 第三方库 → 项目组件 → 类型 |
| A7 | displayName | ✅ | `TypeTabs.tsx:22/41/56` 均已设置 |

---

## §6 代码缺陷 / Bug 模式

> 本次为 TypeScript 代码，`scan-all-rules.sh` 不可用，由 LLM 逐文件审查。

| # | 文件:行号 | 等级 | 描述 |
|---|-----------|------|------|
| 1 | `route.ts (algorithm):29` | **P0** | CSRF Origin 校验使用 `endsWith` 可被域名后缀攻击旁路 |
| 2 | `route.ts (export):253` | **P0** | 同上，CSRF 校验旁路（与 algorithm 路由代码一致） |
| 3 | `route.ts (algorithm):24-31` | P1 | POST 端点缺少速率限制 |
| 4 | `route.ts (export):248-255` | P1 | POST 端点缺少速率限制 |
| 5 | `page.tsx:75-79` | P1 | `useEffect` 依赖 `[statsFilter, showStats, fetchStats]`，`fetchStats` 本身依赖 `statsFilter`，当 `statsFilter` 变化时 `fetchStats` 引用变化导致 effect 触发两次（第一次被 abort 取消）。功能正确但存在冗余请求。建议使用 ref 避免依赖 `fetchStats` |
| 6 | `export/route.ts:19-246` | P2 | 230 行 XLSX 生成器内联在路由中，建议提取为独立模块 |

---

## §7 自定义扩展检查

N/A（未启用项目自定义规则）

---

## §8 修复任务列表

### P0 — 必须修复（阻塞合并）

- [ ] **CSRF-01** `apps/web/src/app/api/dtcoder/algorithm/route.ts:29` — 将 `origin.endsWith(host)` 替换为 `new URL(origin).hostname === host`，防止 Origin 域名后缀旁路
- [ ] **CSRF-02** `apps/web/src/app/api/dtcoder/export/route.ts:253` — 同上 CSRF 修复

### P1 — 合并前应修复

- [ ] **RATE-01** `apps/web/src/app/api/dtcoder/algorithm/route.ts` — POST 端点添加速率限制
- [ ] **RATE-02** `apps/web/src/app/api/dtcoder/export/route.ts` — POST 端点添加速率限制
- [ ] **AUTH-01** — 确认 Next.js middleware 已覆盖 `/api/dtcoder/*` 路由的认证校验
- [ ] **PERF-01** `apps/web/src/app/(app)/algorithm-demo/page.tsx:75-79` — 优化 useEffect 依赖，避免 `statsFilter` 变化时产生冗余请求（使用 ref 存储最新 filter 或移除 `fetchStats` 依赖）

### P2 — 可选改进

- [ ] **REF-01** `apps/web/src/app/api/dtcoder/export/route.ts:19-246` — 将 XLSX 生成器（CRC32/ZIP/XML）提取到 `@/lib/xlsx-generator` 独立模块

---

## §9 审查结论

- **Blocker (P0)**：2 个 — CSRF Origin 旁路漏洞 × 2
- **Major (P1)**：2 个 — 速率限制缺失、useEffect 冗余触发
- **Minor (P2)**：1 个 — XLSX 生成器内联
- **总体评估**：功能实现完整，组件设计合理，错误处理充分（含 ErrorBoundary、AbortController、Skeleton 加载态、重试按钮）。**2 个 P0 CSRF 安全漏洞必须修复后方可合并。** 对比上一轮评审的 4 个 P0（Excel 损坏、筛选无效、图表库不符、空 catch），本轮已全部修复，代码质量显著提升。