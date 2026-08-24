# Code Review Report

> **Change** 新增算法演示页面（路由 /algorithm-demo） · **分支** `AI/task-DEV-f4ad1a6e-7360-11f1-8c66-df5563d236aa-36b84e0b-5802-4a19-a22d-59332556b072` · **日期** 2026-08-24 · **审查者** AI
>
> **AI**：等级 **P0（阻塞）/ P1（推荐修复）/ P2（参考）**。本审查为 TypeScript/React 项目，规则编号沿用技能框架语义（G=可靠性、S=安全），规则描述已适配前端/Node.js 上下文。

---

## 1. 审查范围

| 项 | 值 |
|----|-----|
| 文件数 | 11（TypeScript/TSX） |
| 仓库 | cloud-main |

| # | 文件 | 路径 | 角色 |
|---|------|------|------|
| 1 | page.tsx | `apps/web/src/app/(app)/algorithm-demo/page.tsx` | 页面入口，组合子组件 |
| 2 | algorithm/route.ts | `apps/web/src/app/api/dtcoder/algorithm/route.ts` | 算法执行 API |
| 3 | export/route.ts | `apps/web/src/app/api/dtcoder/export/route.ts` | 导出下载 API |
| 4 | stats/route.ts | `apps/web/src/app/api/dtcoder/stats/route.ts` | 调用统计 API |
| 5 | AlgorithmPanel.tsx | `apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx` | 算法执行面板 |
| 6 | ExportButton.tsx | `apps/web/src/components/algorithm-demo/ExportButton.tsx` | 导出按钮 |
| 7 | InvocationStats.tsx | `apps/web/src/components/algorithm-demo/InvocationStats.tsx` | 统计图表 |
| 8 | OneSegmented.tsx | `apps/web/src/components/algorithm-demo/OneSegmented.tsx` | 分段选择器 |
| 9 | TextIconButton.tsx | `apps/web/src/components/algorithm-demo/TextIconButton.tsx` | 图标文字按钮 |
| 10 | TypeTabs.tsx | `apps/web/src/components/algorithm-demo/TypeTabs.tsx` | Tab 容器 |
| 11 | types.ts | `apps/web/src/components/algorithm-demo/types.ts` | 类型与常量定义 |

---

## 2. 问题计数

| P0 | P1 | P2 |
|----|----|-----|
| 4 | 6 | 4 |

---

## 3. Step 2 — 功能性检查（对照需求描述）

### REQ-1: TypeTabs 实现三个 Tab（Helloworld/哈希算法/冒泡排序）

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 三个 Tab 渲染 | ✅ | 需求："Helloworld/哈希算法/冒泡排序" | `page.tsx:13-17` | 正确 |
| TypeTabs 组件 | ✅ | 需求："使用 TypeTabs" | `page.tsx:93` | 正确 |

### REQ-2: 每个 Tab 调用后端 antchain/dtcoder-agentic-dev REST API 并展示结果

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| POST 调用 | ✅ | 需求："调用后端 REST API" | `AlgorithmPanel.tsx:80` | 正确 |
| 结果展示 | ✅ | 需求："展示执行结果" | `AlgorithmPanel.tsx:139-152` | 正确 |
| 后端代理 | ⚠️ | 需求："调用后端 antchain/dtcoder-agentic-dev" | `algorithm/route.ts:9-22,32-55` | 算法逻辑内联在 Route 中，未代理到 antchain/dtcoder-agentic-dev |

### REQ-3: 导出按钮 POST /api/dtcoder/export（Excel/CSV，blob 下载）

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| POST 调用 | ✅ | 需求："POST /api/dtcoder/export" | `ExportButton.tsx:22` | 正确 |
| blob 下载 | ✅ | 需求："blob 下载" | `ExportButton.tsx:32-41` | 正确 |
| Excel 格式 | ❌ | 需求："支持 excel/csv 格式" | `export/route.ts:19-25` | **P0: Excel 导出实际输出 CSV 内容**，XLSX 文件损坏 |
| 数据来源 | ❌ | 需求：导出算法执行结果 | `export/route.ts:9-13` | **P0: 硬编码 3 条假数据**，非真实调用记录 |

### REQ-4: InvocationStats 使用 @ant-design/charts 展示图表

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 图表库 | ❌ | 需求："使用 @ant-design/charts" | `InvocationStats.tsx:4-18` | **P0: 使用 recharts 而非 @ant-design/charts** |
| 折线图 | ✅ | 需求："折线图" | `InvocationStats.tsx:159-191` | 功能正确 |
| 饼图 | ✅ | 需求："饼图" | `InvocationStats.tsx:264-294` | 功能正确 |
| 柱状图 | ✅ | 需求："柱状图" | `InvocationStats.tsx:215-246` | 功能正确 |

### REQ-5: 支持按人员类型/层级/部门维度筛选

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| 筛选 UI | ✅ | 需求："按人员类型/层级/部门维度筛选" | `InvocationStats.tsx:43-47` | 正确 |
| 筛选参数传递 | ✅ | 需求：同上 | `page.tsx:33-36` | 正确 |
| 后端筛选逻辑 | ❌ | 需求：同上 | `stats/route.ts:41-68` | **P0: GET handler 完全忽略 query params**，筛选无效 |

### REQ-6: 使用项目组件（TextIconButton、TypeTabs、OneSegmented）

| Scenario | 结果 | Spec证据 | 代码证据 | 说明 |
|----------|------|----------|----------|------|
| TextIconButton | ✅ | 需求："使用 TextIconButton" | `page.tsx:83`、`AlgorithmPanel.tsx:125`、`ExportButton.tsx:62` | 正确，含 loading 态 |
| TypeTabs | ✅ | 需求："使用 TypeTabs" | `page.tsx:93` | 正确 |
| OneSegmented | ✅ | 需求："使用 OneSegmented" | `ExportButton.tsx:54`、`InvocationStats.tsx:203` | 正确 |

---

## 4. Step 3 — 可读性检查

> 适配 TypeScript/React 上下文，保留 A1–A7 框架语义。

| ID | 规则 | 结果 | 说明 |
|----|------|------|------|
| A2.2 | 禁止 `import *` | ✅ | 仅 TypeTabs 使用 `import * as React`，属 React 标准实践 |
| A4.2 | 组件名 UpperCamelCase | ✅ | 全部符合 |
| A4.3 | 函数/变量 lowerCamelCase | ✅ | 全部符合 |
| A4.4 | 常量 UPPER_SNAKE_CASE | ✅ | `ALGORITHM_TABS`、`CHART_COLORS`、`FILTER_OPTIONS` |
| A5.1 | 类型注解完整 | ✅ | 全部显式类型声明 |
| A5.2 | 空 catch 块 | ❌ | `page.tsx:44-46` — 空 catch 无注释说明（P0，见可靠性） |
| A6.2 | switch 有 default | ✅ | `algorithm/route.ts:54-55` |
| A3.4 | 行宽 ≤ 120 | ⚠️ | `InvocationStats.tsx:31` ~130 字符；`TypeTabs.tsx:31` ~270 字符 |
| — | 中英文混杂 | ⚠️ | `InvocationStats.tsx:212,259` "No data." 应为中文 |
| — | 未使用类型 | ⚠️ | `types.ts:14` `InvocationStatEntry` 已定义但未使用（已标注 TODO） |
| — | 数组索引作 key | ⚠️ | `page.tsx:111` `key={i}` 应用稳定标识符 |

---

## 5. Step 4 — 可靠性检查

| 域 | 参考 | 结果 | 等级 | 说明 |
|----|------|------|------|------|
| G8 防御编程 | 军规 G8 | ❌ | P0 | `page.tsx:44-46` — 空 catch 吞异常，违反 G16.4 |
| G9 网络调用 | 军规 G9 | ❌ | P1 | `AlgorithmPanel.tsx:80`、`ExportButton.tsx:22`、`page.tsx:39` — 三个 fetch 均未设置 AbortController/超时 |
| G11 边界条件 | 军规 G11 | ❌ | P0 | `export/route.ts:19-25` — Excel 导出功能不可用；`stats/route.ts:41-68` — 筛选功能无效 |
| G11 输入校验 | 军规 G11 | ❌ | P1 | `algorithm/route.ts:37` — 服务端未校验哈希输入长度，违反 G11.3 |
| G16 可监控 | 军规 G16 | ❌ | P0 | `page.tsx:44-46` — 空 catch 无日志，违反 G16.4 |
| G17 可应急 | 军规 G17 | ❌ | P1 | 无 ErrorBoundary 包裹图表；API 错误无重试按钮 |
| S10 CSRF | 安全 S10 | ❌ | P1 | `algorithm/route.ts:24`、`export/route.ts:27` — POST 端点无 CSRF 防护 |
| 速率限制 | 自定义 | ❌ | P1 | 所有 `/api/dtcoder/*` 端点无 Rate Limiting |
| S1–S5 | 安全 | N/A | — | 无 SQL/XXE/命令执行/反序列化场景 |
| S9 数据安全 | 安全 | ✅ | — | 无硬编码密钥/凭证 |

---

## 6. Step 5 — 自定义扩展检查

| 域 | 结果 | 说明 |
|----|------|------|
| 自定义扩展 | N/A | 未启用项目自定义规则 |

---

## 7. 结论

- **合并建议**：修复后合并
- **P0（4 项）**：
  1. Excel 导出功能不可用 — `export/route.ts:19-25` 生成 CSV 伪装 XLSX
  2. 统计筛选功能无效 — `stats/route.ts:41-68` 忽略查询参数
  3. 图表库不符合需求 — `InvocationStats.tsx:4-18` 使用 recharts 而非 @ant-design/charts
  4. 空 catch 吞异常 — `page.tsx:44-46` 无日志/告警
- **P1（6 项）**：fetch 缺少超时、CSRF 缺失、服务端缺少输入校验、维度切换逻辑缺陷、缺少 ErrorBoundary/重试、缺少 Rate Limiting
- **P2（4 项）**：中英文混杂、数组索引作 key、行宽超限、未使用类型
- **一句话**：4 个 P0 问题中 3 个为功能性缺陷（Excel 损坏、筛选无效、图表库不符），1 个为可靠性缺陷（空 catch），修复后可合并。

---

## 7.1 问题片段

### P0-1: Excel 导出实际输出 CSV 内容

- **P0** `G11.1` `apps/web/src/app/api/dtcoder/export/route.ts:19-25` — `generateExcelContent()` 返回 CSV 编码内容，MIME 类型设为 XLSX，Excel 打开时报错。

```ts
// apps/web/src/app/api/dtcoder/export/route.ts:19-25
L19|function generateExcelContent(): Uint8Array {
L20|  // Minimal binary XLSX content (ZIP-based). For production, use a library like exceljs.
L21|  // This generates a simple CSV disguised as Excel for demo purposes.
L22|  const csv = generateCsvContent();
L23|  const encoder = new TextEncoder();
L24|  return encoder.encode(csv);
L25|}
```

### P0-2: 统计 API 忽略筛选参数

- **P0** `G11.1` `apps/web/src/app/api/dtcoder/stats/route.ts:41-68` — GET handler 未读取 `searchParams`，`personnelType`/`level`/`department` 参数完全被忽略。

```ts
// apps/web/src/app/api/dtcoder/stats/route.ts:41-61
L41|export async function GET() {
L42|  try {
L43|    const totalInvocations = Math.floor(Math.random() * 500) + 100;
L44|    const successRate = Math.round((0.85 + Math.random() * 0.14) * 100) / 100;
L45|    const avgExecutionTimeMs = Math.round((Math.random() * 3 + 0.5) * 100) / 100;
// ... 未读取任何 query parameter
L61|    return NextResponse.json(summary);
```

### P0-3: 图表库与需求不符

- **P0** `REQ-4` `apps/web/src/components/algorithm-demo/InvocationStats.tsx:4-18` — 需求要求 `@ant-design/charts`，实际使用 `recharts`。

```tsx
// apps/web/src/components/algorithm-demo/InvocationStats.tsx:4-18
L4| import {
L5|   LineChart,
L6|   Line,
L7|   BarChart,
L8|   Bar,
L9|   PieChart,
L10|  Pie,
// ...
L18| } from 'recharts';
```

### P0-4: 空 catch 吞异常

- **P0** `G16.4` `apps/web/src/app/(app)/algorithm-demo/page.tsx:44-46` — 统计请求失败时静默吞异常，无日志无告警。

```tsx
// apps/web/src/app/(app)/algorithm-demo/page.tsx:44-46
L44|    } catch {
L45|      // Stats fetch failed silently
L46|    } finally {
```

### P1-1: 维度切换时 filter 清理逻辑有误

- **P1** `G11.1` `apps/web/src/components/algorithm-demo/InvocationStats.tsx:75-83` — 清除 `activeDimension` 时该值尚未更新，实际清除的是旧维度的值。

```tsx
// apps/web/src/components/algorithm-demo/InvocationStats.tsx:75-83
L75|  const handleDimensionChange = useCallback(
L76|    (dim: string) => {
L77|      const newDim = dim as FilterDimension;
L78|      setActiveDimension(newDim);
L79|      // Clear the previous dimension's filter value when switching dimensions
L80|      onFilterChange({ ...filter, [activeDimension]: undefined });
L81|    },
L82|    [filter, onFilterChange, activeDimension],
L83|  );
```

### P1-2: fetch 缺少 AbortController

- **P1** `G9.2` `apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx:80-84` — 无超时/中断机制。

```tsx
// apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx:80-84
L80|      const res = await fetch('/api/dtcoder/algorithm', {
L81|        method: 'POST',
L82|        headers: { 'Content-Type': 'application/json' },
L83|        body: JSON.stringify(body),
L84|      });
```

---

## 8. 修复任务列表

### P0

- [ ] **P0** `apps/web/src/app/api/dtcoder/export/route.ts:19-25` — 使用 `exceljs` 或 `xlsx` 库生成真正的 XLSX 二进制内容；导出数据改为真实调用记录
- [ ] **P0** `apps/web/src/app/api/dtcoder/stats/route.ts:41` — 从 `request.nextUrl.searchParams` 读取 `personnelType`/`level`/`department` 参数并过滤数据
- [ ] **P0** `apps/web/src/components/algorithm-demo/InvocationStats.tsx:4-18` — 将 `recharts` 替换为 `@ant-design/charts`，安装对应依赖
- [ ] **P0** `apps/web/src/app/(app)/algorithm-demo/page.tsx:44-46` — 空 catch 块添加 `console.error` 日志并设置 error 状态

### P1

- [ ] **P1** `apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx:80` — 添加 `AbortController` 超时机制
- [ ] **P1** `apps/web/src/components/algorithm-demo/ExportButton.tsx:22` — 同上
- [ ] **P1** `apps/web/src/app/(app)/algorithm-demo/page.tsx:39` — 同上
- [ ] **P1** `apps/web/src/app/api/dtcoder/algorithm/route.ts:24` — 添加 CSRF Token 校验或确认全局中间件已覆盖
- [ ] **P1** `apps/web/src/app/api/dtcoder/export/route.ts:27` — 同上
- [ ] **P1** `apps/web/src/app/api/dtcoder/algorithm/route.ts:37` — 服务端添加输入长度校验（≤10000）
- [ ] **P1** `apps/web/src/components/algorithm-demo/InvocationStats.tsx:80` — 修复维度切换时 filter 清理逻辑
- [ ] **P1** — 添加 ErrorBoundary 包裹图表组件；API 错误状态添加重试按钮
- [ ] **P1** — 所有 `/api/dtcoder/*` 端点添加 Rate Limiting

### P2

- [ ] **P2** `apps/web/src/components/algorithm-demo/InvocationStats.tsx:212,259` — "No data." 改为中文"暂无数据"
- [ ] **P2** `apps/web/src/app/(app)/algorithm-demo/page.tsx:111` — `key={i}` 改为 `key={r.timestamp}`
- [ ] **P2** `apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx:21-25` — 将 `defaultInputs` 移到组件外或使用 `useMemo`
- [ ] **P2** `apps/web/src/components/algorithm-demo/TypeTabs.tsx:31` — 超长行宽适当换行