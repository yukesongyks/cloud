# Code Review Report

> **Change** `新增算法演示页面（路由 /algorithm-demo）` · **分支** `AI/task-DEV-f4ad1a6e-7360-11f1-8c66-df5563d236aa-4aae1a9e-0320-4d6e-a089-a118101d8b85` · **日期** `2026-08-24` · **审查者** AI
>
> **等级说明**：**P0**（阻塞，必须阻止合并）/ **P1**（推荐，合并前应修复）/ **P2**（参考，可选改进）

---

## §1 审查范围

| # | 仓库 | 文件路径 | 类型 | 审查状态 |
|---|------|----------|------|----------|
| 1 | library-frontend | `index.html` | HTML | ✅ 已审 |
| 2 | library-frontend | `package.json` | JSON | ✅ 已审 |
| 3 | library-frontend | `src/App.tsx` | TSX | ⚠️ 已审有问题 |
| 4 | library-frontend | `src/main.tsx` | TSX | ✅ 已审 |
| 5 | library-frontend | `src/components/index.ts` | TS | ✅ 已审 |
| 6 | library-frontend | `src/components/OneSegmented/index.tsx` | TSX | ✅ 已审 |
| 7 | library-frontend | `src/components/TextIconButton/index.tsx` | TSX | ✅ 已审 |
| 8 | library-frontend | `src/components/TypeTabs/index.tsx` | TSX | ✅ 已审 |
| 9 | library-frontend | `src/pages/AlgorithmDemo/index.tsx` | TSX | ✅ 已审 |
| 10 | library-frontend | `src/pages/AlgorithmDemo/HelloworldTab.tsx` | TSX | ✅ 已审 |
| 11 | library-frontend | `src/pages/AlgorithmDemo/HashTab.tsx` | TSX | ✅ 已审 |
| 12 | library-frontend | `src/pages/AlgorithmDemo/BubbleSortTab.tsx` | TSX | ⚠️ 已审有问题 |
| 13 | library-frontend | `src/pages/AlgorithmDemo/ExportPanel.tsx` | TSX | ✅ 已审 |
| 14 | library-frontend | `src/pages/AlgorithmDemo/InvocationStats.tsx` | TSX | ⚠️ 已审有问题 |
| 15 | library-frontend | `src/services/dtcoderApi.ts` | TS | ⚠️ 已审有问题 |
| 16 | library-frontend | `src/types/index.ts` | TS | ⚠️ 已审有问题 |
| 17 | library-frontend | `src/utils/download.ts` | TS | ✅ 已审 |
| 18 | library-frontend | `src/vite-env.d.ts` | TS | ✅ 已审 |
| 19 | library-frontend | `tsconfig.json` | JSON | ✅ 已审 |
| 20 | library-frontend | `vite.config.ts` | TS | ✅ 已审 |

**审查文件数**：20 | **问题文件数**：5

> **技能适配说明**：本次变更全部为 TypeScript/React 前端代码，不含 `.java` 文件。已适配 `dtazziboot-java-code-review` 技能的审查维度（功能性→可读性→可靠性/安全性→自定义扩展）到前端技术栈，Java 特有的军规/Bug Pattern 规则标记为 N/A。

---

## §2 功能性检查（Step 2）

| REQ | 功能点 | 需求来源 | 关联文件 | 状态 | 备注 |
|-----|--------|----------|----------|------|------|
| F01 | TypeTabs 三 Tab 切换（Helloworld/哈希算法/冒泡排序） | 需求描述 + design.md F01 | `src/pages/AlgorithmDemo/index.tsx:13-17` | ✅ | TAB_ITEMS 正确定义三个 Tab，使用 TypeTabs 组件 |
| F02 | Helloworld 算法调用与结果展示 | 需求描述 + design.md F02 | `src/pages/AlgorithmDemo/HelloworldTab.tsx` | ✅ | 调用 fetchHelloworld()，展示 response.data.result |
| F03 | 哈希算法调用与结果展示 | 需求描述 + design.md F03 | `src/pages/AlgorithmDemo/HashTab.tsx` | ✅ | 调用 computeHash()，支持输入文本，展示哈希结果 |
| F04 | 冒泡排序算法调用与结果展示 | 需求描述 + design.md F04 | `src/pages/AlgorithmDemo/BubbleSortTab.tsx` | ✅ | 调用 computeBubbleSort()，输入数组校验，Tag 展示排序结果 |
| F05 | 数据导出（excel/csv，blob 下载） | 需求描述 + design.md F05 | `src/pages/AlgorithmDemo/ExportPanel.tsx` + `src/utils/download.ts` | ✅ | exportData() 返回 Blob，downloadBlob() 触发下载 |
| F06 | InvocationStats 折线图展示 | 需求描述 + design.md F06 | `src/pages/AlgorithmDemo/InvocationStats.tsx:85-99` | ⚠️ | 使用 `seriesField` 属性，在 @ant-design/charts v2.x 中已废弃（详见 §4） |
| F07 | InvocationStats 饼图展示 | 需求描述 + design.md F07 | `src/pages/AlgorithmDemo/InvocationStats.tsx:102-118` | ⚠️ | label/legend 配置可能不兼容 v2.x API（详见 §4） |
| F08 | InvocationStats 柱状图展示 | 需求描述 + design.md F08 | `src/pages/AlgorithmDemo/InvocationStats.tsx:120-131` | ✅ | Column 组件使用 xField/yField，API 兼容 |
| F09 | 维度筛选（人员类型/层级/部门） | 需求描述 + design.md F09 | `src/pages/AlgorithmDemo/InvocationStats.tsx:14-18` | ✅ | DIMENSION_OPTIONS 正确定义三个维度 |
| F10 | 路由 /algorithm-demo | 需求描述 | `src/App.tsx:12` | ✅ | Route path="/algorithm-demo" 正确配置 |
| F11 | 项目组件复用（TextIconButton/TypeTabs/OneSegmented） | 需求描述 + design.md | 各组件文件 | ✅ | 三个组件均已创建并在页面中使用 |

**功能性检查结论**：核心功能点全部实现，折线图/饼图的 @ant-design/charts v2.x API 兼容性存在隐患（详见 §4 P1 问题）。

---

## §3 可读性检查（Step 3）

| ID | 检查项 | 状态 | 问题描述 |
|----|--------|------|----------|
| A1 | 源文件格式（缩进/换行/行宽） | ✅ | 代码格式统一，行宽合理 |
| A2 | 命名规范（组件/函数/变量/类型） | ✅ | PascalCase 组件名，camelCase 函数/变量名，TypeScript 类型命名规范 |
| A3 | 注释与文档 | ✅ | 组件和 API 函数均有 JSDoc 注释，类型有注释说明 |
| A4 | 组件结构与职责分离 | ✅ | 每个 Tab 独立组件，组件/服务/类型/工具分层清晰 |
| A5 | 魔法数字与常量提取 | ✅ | 维度选项、图表选项均提取为常量数组 |
| A6 | 类型定义完整性 | ⚠️ | `ExportFormat` 与 `ExportRequest.format` 存在重复定义（详见 §4 P2） |
| A7 | 导入顺序与分组 | ✅ | 导入顺序：React → 第三方库 → 项目组件 → 服务/类型，分组合理 |

**可读性检查结论**：整体可读性良好，1 项 P2 类型重复定义问题。

---

## §4 可靠性与安全性检查（Step 4）

### 可靠性

| ID | 检查项 | 等级 | 文件:行号 | 问题描述 |
|----|--------|------|-----------|----------|
| G1 | @ant-design/charts v2.x API 兼容性 — Line `seriesField` | **P1** | `InvocationStats.tsx:91` | `seriesField="label"` 在 @ant-design/charts v2.x（基于 G2 5.x）中已被移除，应替换为 `colorField="label"`。当前写法会导致折线图无法按系列分组展示，维度筛选效果不可见。 |
| G2 | @ant-design/charts v2.x API 兼容性 — Pie `label`/`legend` | **P1** | `InvocationStats.tsx:111-115` | Pie 组件的 `label={{ text: 'label', position: 'outside' }}` 和 `legend={{ position: 'right' }}` 配置格式在 v2.x 中已变更。v2.x 使用 `label: { text: (d) => d.label }` 函数式配置和 `legend: { color: { position: 'right' } }` 嵌套结构。当前写法可能导致饼图标签和图例渲染异常。 |
| G3 | axios 实例缺少认证拦截器 | **P1** | `dtcoderApi.ts:14-18` | 设计文档明确要求"复用现有登录态"，但 axios 实例未配置 request interceptor 注入认证 token/cookie。若后端 API 需要认证，所有请求将返回 401。建议添加 `http.interceptors.request.use()` 注入 auth header，或在 vite proxy 中配置认证透传。 |
| G4 | Blob 错误响应处理 | **P1** | `dtcoderApi.ts:58-63` | `exportData` 使用 `responseType: 'blob'`，当后端返回非 2xx 状态码时，axios 抛出的 `error.response.data` 也是 Blob（非 JSON），调用方无法解析出具体错误信息。建议添加 blob 错误解析逻辑：读取 Blob 内容为 JSON 以提取 errorMessage。 |
| G5 | React key 使用数组索引 | **P2** | `BubbleSortTab.tsx:73` | `sorted.map((num, idx) => <Tag key={idx}>...)` 使用数组索引作为 key。当排序结果数组变化时，可能导致不必要的 DOM 重建。建议使用 `key={`${num}-${idx}`}` 或后端返回唯一 ID。 |
| G6 | useState 惰性初始化 | **P2** | `InvocationStats.tsx:33-36` | `dateRange` 初始值使用 `dayjs()` 即时计算，每次组件重新渲染时都会创建新的 dayjs 对象（虽然 useState 只使用首次值，不影响功能）。建议使用惰性初始化 `useState(() => [dayjs().subtract(30, 'day'), dayjs()])` 以明确意图并避免不必要的对象创建。 |
| G7 | 超时配置 | ✅ | `dtcoderApi.ts:16` | axios 实例配置 `timeout: 30000`（30s），合理 |
| G8 | 资源释放 | ✅ | `download.ts:5-12` | `downloadBlob` 正确调用 `URL.revokeObjectURL()` 释放内存，DOM 元素正确移除 |
| G9 | 异步错误处理 | ✅ | 各 Tab 组件 | 所有 async 操作均有 try/catch/finally，loading 状态正确管理 |
| G10 | 输入校验 | ✅ | `HashTab.tsx:20-23` + `BubbleSortTab.tsx:19-30` | 哈希和冒泡排序 Tab 均有前端输入校验 |

### 安全性

| ID | 检查项 | 等级 | 状态 | 备注 |
|----|--------|------|------|------|
| S1 | XSS 防护 | — | ✅ | 后端返回值通过 antd `<Text code>` / `<Tag>` 渲染，React 默认转义 HTML，无 XSS 风险 |
| S2 | 敏感信息泄露 | — | ✅ | 无硬编码密钥/token/凭证 |
| S3 | 认证/授权 | P1 | ⚠️ | 同 G3，缺少认证拦截器 |
| S4 | CSRF 防护 | — | ✅ | 使用 axios + JSON Content-Type，非表单提交，CSRF 风险低 |
| S5 | 依赖安全 | — | ✅ | 依赖版本均为当前主流版本，无已知高危漏洞 |

### Java 特有规则（N/A）

本次变更不含 Java 代码，以下检查项不适用：
- 阿里巴巴 Java Bug Pattern（B*/M*/I* 共 120 条）：N/A
- 蚂蚁编码军规（G1-G12 并发/事务/灰度等）：N/A（前端不涉及）
- `scan-all-rules.sh` 自动化扫描：N/A（脚本仅扫描 .java 文件）

---

## §5 自定义扩展检查（Step 5）

N/A（未启用自定义规则）

---

## §6 问题汇总

| # | 等级 | 类别 | 文件 | 行号 | 问题摘要 |
|---|------|------|------|------|----------|
| 1 | **P1** | 可靠性 G1 | `src/pages/AlgorithmDemo/InvocationStats.tsx` | 91 | Line 图表 `seriesField` 在 @ant-design/charts v2.x 中已废弃，应改为 `colorField` |
| 2 | **P1** | 可靠性 G2 | `src/pages/AlgorithmDemo/InvocationStats.tsx` | 111-115 | Pie 图表 `label`/`legend` 配置格式不兼容 v2.x API |
| 3 | **P1** | 安全 G3/S3 | `src/services/dtcoderApi.ts` | 14-18 | axios 实例缺少认证拦截器，设计文档要求"复用现有登录态"未实现 |
| 4 | **P1** | 可靠性 G4 | `src/services/dtcoderApi.ts` | 58-63 | Blob 错误响应未做内容解析，调用方无法获取具体错误信息 |
| 5 | **P2** | 可靠性 G5 | `src/pages/AlgorithmDemo/BubbleSortTab.tsx` | 73 | React key 使用数组索引 |
| 6 | **P2** | 可读性 A6 | `src/types/index.ts` | 38, 59 | `ExportFormat` 与 `ExportRequest.format` 类型重复定义 |
| 7 | **P2** | 可靠性 G6 | `src/pages/AlgorithmDemo/InvocationStats.tsx` | 33-36 | useState 初始值建议使用惰性初始化 |

**统计**：
- **P0（Blocker）**：0
- **P1（推荐修复）**：4
- **P2（参考改进）**：3

---

## §7 跨仓对齐点检查

| 对齐点 | 前端（library-frontend） | 后端（cloud-main） | 状态 |
|--------|--------------------------|---------------------|------|
| API 基础路径 | `baseURL: '/api/dtcoder'`（dtcoderApi.ts:15） | 后端 Controller 路径前缀应为 `/api/dtcoder` | ⚠️ 需确认后端路径一致 |
| Helloworld 接口 | `GET /helloworld` → `ApiResponse<HelloworldData>` | 后端应返回 `{ code, message, data: { result } }` | ⚠️ 需确认响应结构 |
| Hash 接口 | `POST /hash` body: `{ input }` → `{ result }` | 后端应接受 `{ input }` 返回 `{ result }` | ⚠️ 需确认 |
| BubbleSort 接口 | `POST /bubble-sort` body: `{ array }` → `{ sorted }` | 后端应接受 `{ array: number[] }` 返回 `{ sorted: number[] }` | ⚠️ 需确认 |
| Export 接口 | `POST /export` body: `{ format }` → Blob | 后端应返回二进制文件流 | ⚠️ 需确认 Content-Type |
| InvocationStats 接口 | `GET /invocation-stats` params: `{ dimension, startDate, endDate }` → `InvocationStat[]` | 后端应返回 `[{ label, count, date? }]` | ⚠️ 需确认 |
| Vite Proxy | `/api` → `http://localhost:8080`（vite.config.ts:15-18） | 后端服务应监听 8080 端口 | ✅ 配置合理 |

---

## §8 修复任务列表

- [ ] **[P1]** `InvocationStats.tsx:91` — 将 Line 组件的 `seriesField="label"` 替换为 `colorField="label"`，适配 @ant-design/charts v2.x API
- [ ] **[P1]** `InvocationStats.tsx:111-115` — 更新 Pie 组件的 `label` 和 `legend` 配置为 v2.x 格式：`label: { text: (d) => d.label }` + `legend: { color: { position: 'right' } }`
- [ ] **[P1]** `dtcoderApi.ts:14-18` — 为 axios 实例添加 request interceptor 注入认证信息（token/cookie），实现设计文档要求的"复用现有登录态"
- [ ] **[P1]** `dtcoderApi.ts:58-63` — 为 `exportData` 添加 Blob 错误响应解析：捕获异常时尝试将 Blob 读取为 JSON 以提取 errorMessage
- [ ] **[P2]** `BubbleSortTab.tsx:73` — 将 `key={idx}` 替换为更稳定的 key 值
- [ ] **[P2]** `types/index.ts:38,59` — 合并 `ExportFormat` 和 `ExportRequest.format` 类型定义，消除重复
- [ ] **[P2]** `InvocationStats.tsx:33-36` — 使用 `useState(() => [...])` 惰性初始化 dateRange
