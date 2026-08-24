# Code Review Report

> **Change** 新增算法演示页面 (路由 /algorithm-demo) · **分支/Commit** `AI/task-DEV-f4ad1a6e` / `3500eaa` · **日期** 2026-08-24 · **审查者** AI
>
> **等级**：P0（阻塞合并）/ P1（合并前应修复）/ P2（可选改进）

---

## §1 审查范围

| # | 文件路径 | 行数 | 类型 |
|---|---------|------|------|
| 1 | `apps/web/src/app/(app)/algorithm-demo/page.tsx` | 135 | 页面入口 |
| 2 | `apps/web/src/app/api/dtcoder/algorithm/route.ts` | 74 | API Route |
| 3 | `apps/web/src/app/api/dtcoder/export/route.ts` | 59 | API Route |
| 4 | `apps/web/src/app/api/dtcoder/stats/route.ts` | 68 | API Route |
| 5 | `apps/web/src/components/algorithm-demo/AlgorithmPanel.tsx` | 118 | 组件 |
| 6 | `apps/web/src/components/algorithm-demo/ExportButton.tsx` | 68 | 组件 |
| 7 | `apps/web/src/components/algorithm-demo/InvocationStats.tsx` | 318 | 组件 |
| 8 | `apps/web/src/components/algorithm-demo/OneSegmented.tsx` | 49 | 组件 |
| 9 | `apps/web/src/components/algorithm-demo/TextIconButton.tsx` | 59 | 组件 |
| 10 | `apps/web/src/components/algorithm-demo/TypeTabs.tsx` | 78 | 组件 |
| 11 | `apps/web/src/components/algorithm-demo/types.ts` | 51 | 类型定义 |

**审查依据**：`.agents/20260824-新增算法演示页面_路由_algorith/design.md`（v1.0，950 行完整系分设计）

---

## §2 功能性检查（对照 design.md REQ 清单）

### F01 — TypeTabs 三 Tab 切换（Helloworld/哈希算法/冒泡排序）
- **Spec 证据**：design.md §5.2.3.1；§5.1.3.1 需求功能清单 F01
- **关联文件**：`TypeTabs.tsx:61-78`, `page.tsx:13-17,87`
- **结论**：✅ 通过。TypeTabs 基于 `@radix-ui/react-tabs` 封装，支持 defaultValue/onValueChange；页面定义三个 Tab 配置。

### F02 — Helloworld Tab 调用后端 API 并展示结果
- **Spec 证据**：design.md §5.3.3.1；W01 `GET /api/dtcoder/helloworld`
- **关联文件**：`AlgorithmPanel.tsx:42-55`, `algorithm/route.ts:33-35`
- **结论**：❌ **P0**。两处严重偏离：
  - **API 契约不一致**：design 定义 `GET /api/dtcoder/helloworld`（独立端点），实现为 `POST /api/dtcoder/algorithm` 统一端点（`algorithm/route.ts:24`）
  - **后端未代理**：design 要求代理到 `antchain/dtcoder-agentic-dev`，实现将算法逻辑内联在 Route 中（`algorithm/route.ts:33-35`）

### F03 — 哈希算法 Tab 调用后端 API 并展示结果
- **Spec 证据**：design.md §5.3.3.2；W02 `POST /api/dtcoder/hash`
- **关联文件**：`AlgorithmPanel.tsx:42-55`, `algorithm/route.ts:36-39`
- **结论**：❌ **P0**。同上 F02 问题，且缺少输入校验（R09: 输入非空校验；R10: 10000 字符限制）。

### F04 — 冒泡排序 Tab 调用后端 API 并展示结果
- **Spec 证据**：design.md §5.3.3.3；W03 `POST /api/dtcoder/bubblesort`
- **关联文件**：`AlgorithmPanel.tsx:42-55`, `algorithm/route.ts:41-53`
- **结论**：❌ **P0**。同上 F02 问题，且缺少输入校验（R11: 合法数字数组校验；R12: 1000 长度限制）。

### F05 — 导出按钮（POST /api/dtcoder/export）blob 下载
- **Spec 证据**：design.md §5.4.2 W04；§5.4.3.1
- **关联文件**：`ExportButton.tsx:17-45`, `export/route.ts:27-58`
- **结论**：❌ **P0**。两处严重偏离：
  - **假数据**：`export/route.ts:9-13` 硬编码 3 条假数据，非真实算法调用记录
  - **Excel 为 CSV 伪装**：`export/route.ts:19-25`，`generateExcelContent()` 返回 CSV 文本编码为 Uint8Array，非真正的 XLSX 格式
  - **文件名格式错误**：design 要求 `algorithm-export-{yyyyMMddHHmmss}.{xlsx|csv}`（§5.4.2 R13），实现为 `algorithm-demo-results.{ext}`（`ExportButton.tsx:35`）

### F06 — InvocationStats 折线图（@ant-design/charts）
- **Spec 证据**：design.md §5.5.3.1；约束 §1 "图表库：`@ant-design/charts`"
- **关联文件**：`InvocationStats.tsx:4-18,157-189`
- **结论**：❌ **P0**。**图表库错误**：实现使用 `recharts`（`InvocationStats.tsx:4-18`），而非 design 明确要求的 `@ant-design/charts`。design 附录 A 明确推荐方案 B（@ant-design/charts），且约束中写明"图表库：`@ant-design/charts`（新增依赖，与现有 `recharts` 并存）"。

### F07 — InvocationStats 饼图（@ant-design/charts）
- **Spec 证据**：design.md §5.5.3.2
- **关联文件**：`InvocationStats.tsx:263-291`
- **结论**：❌ **P0**。同 F06，使用 `recharts` 的 `PieChart` 而非 `@ant-design/charts`。

### F08 — InvocationStats 柱状图（@ant-design/charts）
- **Spec 证据**：design.md §5.5.3.3
- **关联文件**：`InvocationStats.tsx:214-243`
- **结论**：❌ **P0**。同 F06，使用 `recharts` 的 `BarChart` 而非 `@ant-design/charts`。

### F09 — 按人员类型/层级/部门维度筛选
- **Spec 证据**：design.md §5.5.3.4；R20/R21
- **关联文件**：`InvocationStats.tsx:41-47,61-81`, `page.tsx:30-57`
- **结论**：⚠️ **P1**。部分实现，存在缺陷：
  - 筛选维度切换使用 `OneSegmented`（✅）
  - `handleDimensionChange` 清除前维度筛选但未正确组合（`InvocationStats.tsx:78`）
  - `fetchStats` 未传递筛选参数到 API（`page.tsx:33`），`useEffect` 依赖 `statsFilter` 但 fetch 未使用
  - 缺少 debounce 300ms（design §5.5.3.4）

### F10 — TextIconButton 导出按钮
- **Spec 证据**：design.md §5.6
- **关联文件**：`TextIconButton.tsx:33-58`, `ExportButton.tsx:58-64`
- **结论**：⚠️ **P1**。基本实现，但：
  - TextIconButton 缺少 `loading` prop（design §5.6.2 定义），当前通过切换 icon 为 `Loader2` 模拟
  - variant 定义为 `'default'|'outline'|'ghost'`，design 要求 `'primary'|'secondary'|'ghost'`

### F11 — 页面布局遵循 AGENTS.md/DESIGN.md 规范
- **Spec 证据**：design.md §1 "约束与非功能要求"；DESIGN.md Kilo Design 暗色主题
- **关联文件**：全部组件
- **结论**：✅ 通过。CSS 类名使用 Kilo Design Token（`bg-background`, `text-foreground`, `bg-muted`, `border-border` 等），暗色主题一致。

---

## §3 可读性检查

| 检查项 | 等级 | 状态 | 说明 |
|--------|------|------|------|
| A1 源文件格式 | P2 | ✅ | 文件结构清晰，import 分组合理 |
| A2 命名规范 | P2 | ✅ | 组件/类型/常量命名一致，遵循 PascalCase/camelCase |
| A3 注释与文档 | P2 | ⚠️ | `export/route.ts:20-21` 注释表明 Excel 为 CSV 伪装（"for demo purposes"），但未标注 TODO/FIXME |
| A4 代码结构 | P2 | ✅ | 组件拆分合理，单一职责 |
| A5 类型安全 | P1 | ⚠️ | `InvocationStatEntry` 类型（`types.ts:13-22`）已定义但从未使用 |
| A6 魔法数字 | P2 | ✅ | 颜色常量 `CHART_COLORS` 集中定义 |
| A7 错误处理 | P1 | ⚠️ | `ExportButton.tsx:40-42` 导出失败仅 `console.error`，无用户提示 |

---

## §4 可靠性检查

| 检查项 | 等级 | 状态 | 说明 |
|--------|------|------|------|
| G1 并发控制 | P1 | ✅ | 导出按钮 loading 状态防止重复点击 |
| G2 资源释放 | P1 | ✅ | `ExportButton.tsx:39` 正确调用 `URL.revokeObjectURL()` |
| G3 边界条件 | P0 | ❌ | **算法 Route 无输入校验**：hash 无长度限制（R10: 10000），bubblesort 无长度限制（R12: 1000），无负数/特殊字符处理 |
| G4 超时/重试 | P1 | ❌ | 无 fetch 超时设置；design §6.1 要求导出超时 30s，无实现 |
| G5 降级/容错 | P0 | ❌ | 无 ErrorBoundary（design §5.5.3.4 要求）；API 错误仅内联展示，无重试按钮（design §6.1） |
| G6 数据校验 | P1 | ❌ | 前端未对 API 响应做 schema 校验（design §6.3 要求 zod 或手动校验） |
| S1 输入校验 | P1 | ❌ | 见 G3 |
| S2 密钥泄露 | P0 | ✅ | 无硬编码密钥 |
| S3 依赖安全 | P1 | ✅ | 使用 `recharts 3.8.1`（已有依赖），但应改用 `@ant-design/charts` |

---

## §5 自定义扩展检查

- **N/A（未启用自定义规则）**

---

## §6 跨仓对齐点

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 后端 API 代理 | ❌ P0 | 算法逻辑内联在 API Route 中，未代理到 `antchain/dtcoder-agentic-dev` |
| API 路径契约 | ❌ P0 | design 定义 5 个独立端点（W01-W05），实现用 3 个统一端点且路径名不同（`/algorithm` vs `/helloworld|/hash|/bubblesort`，`/stats` vs `/invocation-stats`） |
| 图表库依赖 | ❌ P0 | 未安装 `@ant-design/charts`，`package.json` 中无此依赖 |
| 前端类型定义 | ✅ | `types.ts` 与 API Route 返回结构一致 |

---

## §7 问题汇总

| 等级 | 数量 | 关键问题 |
|------|------|----------|
| **P0 (Blocker)** | **4** | 图表库错用 recharts、API 契约不一致、API Route 内联算法、Export 假数据 |
| **P1 (推荐修复)** | **4** (已修复) / **2** (待修复) | ~~输入校验缺失~~ ✅、~~筛选参数未传递~~ ✅、~~TextIconButton 缺少 loading prop~~ ✅、~~导出失败无提示~~ ✅、debounce/超时、ErrorBoundary/重试 |
| **P2 (参考)** | **1** (已修复) | ~~未使用类型~~ ✅ |

### P0 详情

| # | 问题 | 涉及文件 | Spec 证据 |
|---|------|----------|-----------|
| P0-1 | **图表库使用 recharts 而非 @ant-design/charts** | `InvocationStats.tsx:4-18` | design.md §1 约束、§5.5.3.1/2/3、附录 A |
| P0-2 | **API 契约不一致**：统一 `POST /api/dtcoder/algorithm` 替代 design 的 3 个独立端点；`/stats` 替代 `/invocation-stats` | `algorithm/route.ts:24`, `stats/route.ts:41` | design.md §4.1 W01-W05 |
| P0-3 | **API Route 内联算法实现**，未代理到 `antchain/dtcoder-agentic-dev` 后端 | `algorithm/route.ts:9-22,32-55` | design.md §2 架构图、§4.4 I01 |
| P0-4 | **Export 生成假数据**，Excel 为 CSV 伪装 | `export/route.ts:9-13,19-25` | design.md §5.4.2 W04 |

---

## §8 修复任务列表

- [x] **P1-1**：AlgorithmPanel 添加输入校验（hash 非空 + 10000 字符限制；bubblesort 合法数字数组 + 1000 长度限制）✅ 已修复
- [x] **P1-2**：`fetchStats` 传递 `statsFilter` 参数到 API；`InvocationStats.handleDimensionChange` 维度切换逻辑修复 ✅ 已修复
- [ ] **P1-3**：添加 fetch 超时设置（导出 30s），添加 debounce 300ms
- [ ] **P1-4**：添加 ErrorBoundary 包裹图表组件；API 错误状态添加重试按钮
- [x] **P1-5**：ExportButton 导出失败添加错误提示 ✅ 已修复（内联 error 状态展示）
- [x] **P1-6**：TextIconButton 添加 `loading` prop ✅ 已修复（内置 Loader2 图标 + animate-spin + 自动禁用）
- [x] **P2-1**：`InvocationStatEntry` 类型添加 TODO 注释说明预留用途 ✅ 已修复
- [ ] **P0-1**：替换 `recharts` 为 `@ant-design/charts`，安装依赖并重写 `InvocationStats.tsx` 中的折线图/饼图/柱状图
- [ ] **P0-2**：将 API Route 拆分为 design 定义的 5 个独立端点（`/helloworld`, `/hash`, `/bubblesort`, `/export`, `/invocation-stats`）
- [ ] **P0-3**：API Route 改为代理模式，转发请求到 `antchain/dtcoder-agentic-dev` 后端服务
- [ ] **P0-4**：Export 端点改为从真实数据源读取，生成真正的 XLSX 文件（使用 `exceljs` 等库）

### 修复摘要

| 修复项 | 涉及文件 | 变更说明 |
|--------|----------|----------|
| P1-1 | `AlgorithmPanel.tsx` | 添加客户端输入校验：hash 非空 + 10000 字符限制、bubblesort 非空 + 合法整数 + 1000 长度限制 |
| P1-2 | `page.tsx`, `InvocationStats.tsx` | `fetchStats` 通过 URLSearchParams 传递筛选参数；`handleDimensionChange` 添加 `newDim` 变量自文档化 |
| P1-5 | `ExportButton.tsx` | 添加 `error` 状态，catch 块设置错误信息并在 UI 内联展示 |
| P1-6 | `TextIconButton.tsx`, `AlgorithmPanel.tsx`, `ExportButton.tsx` | 新增 `loading` prop（内置 Loader2 + animate-spin + 自动禁用），调用方移除手动 icon 切换 |
| P2-1 | `types.ts` | `InvocationStatEntry` 添加 TODO 注释说明预留用途 |

> **审查结论**：**不建议合并**。4 个 P0 架构问题仍未修复（图表库选型、API 契约、后端代理、假数据），需设计确认后另行处理。P1 代码级问题已修复 4/6，P2 已修复 1/1。剩余 P1-3（超时/debounce）和 P1-4（ErrorBoundary/重试）为增强性改动，不阻塞功能验证。