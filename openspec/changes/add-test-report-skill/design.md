# Design: 测试报告生成器 Skill

## Overview

本 Skill 是一个无状态、可复用的报告生成能力。它以"解析器插件 + 标准报告模型 + 渲染器"三层结构组织，将异构测试结果产物统一为内部 `TestReportData` 模型，再渲染为 Markdown（P1: HTML/JSON）。

核心设计原则：
- **解析层插件化（NFR5）**：每种结果格式对应一个独立解析器，互不影响；新增框架支持只需新增解析器并注册。
- **降级而非崩溃（NFR2）**：字段缺失统一标注"未获取"，不得静默丢数据。
- **幂等性（NFR4）**：同一结果文件多次生成报告内容一致（时间戳字段除外）。
- **安全脱敏（NFR3）**：错误堆栈/日志须过滤凭据、密钥、环境变量；不得在报告中泄露。

## Data Model

统一内部模型 `TestReportData`，所有解析器输出该结构，渲染器仅消费它。

```text
TestReportData {
  header: {
    project_name: string
    generated_at: string        // ISO8601，渲染时填入，不计入幂等
    command: string             // 执行命令；解析模式可为 "parse-only: <file>"
    framework: string           // 如 "jest" / "vitest" / "pytest" / "junit"
    framework_version?: string  // 未获取时省略或标 "未获取"
    environment: string         // node/python/os 摘要
  }
  summary: {
    total: number
    passed: number
    failed: number
    skipped: number
    pass_rate: number           // 百分比，保留 1 位小数
    duration_ms: number        // 未获取时为 0 并在渲染标 "未获取"
    overall: "pass" | "fail"    // 由 fail_threshold 判定
  }
  failures: Array<{
    name: string
    file: string               // 源文件路径；未获取时标 "未获取"
    error_message: string     // 脱敏后
    stack_summary: string     // 截断至可读长度（默认 ≤ 8 行 / 1200 字符）
  }>
  details: {
    grouped_by_file: Array<{
      file: string
      cases: Array<{ name: string; duration_ms?: number; status: "pass"|"fail"|"skip" }>
    }>
    truncated: boolean        // 超过 200 条时为 true 并注明
    total_cases: number
  }
  coverage?: {
    statements_pct?: number
    branches_pct?: number
    functions_pct?: number
    lines_pct?: number
    below_threshold_files: Array<string>   // 覆盖率低于阈值的文件
  }                            // 不存在时整段省略，渲染时标 "未获取"
  appendix: {
    source_files: string[]     // 原始结果文件路径
    tool_version: string       // 本 Skill 版本
  }
}
```

字段缺失统一约定：数值缺失渲染为 `未获取`，文本缺失渲染为 `未获取`，整段缺失（如 coverage）渲染为 `未获取` 且其余章节正常。

## Components

### 1. Framework Detector（FR1.1）
识别优先级：
1. 用户显式指定的命令（覆盖默认）；
2. 项目配置：`package.json` scripts.test、`pyproject.toml`、`Cargo.toml` 等；
3. 框架特征文件推断：`jest.config.*`、`vitest.config.*`、`pytest.ini`、`conftest.py`。

输出：`{ framework, run_command?, reporter_hint? }`。解析模式下 framework 由结果文件特征推断，无需 run_command。

### 2. Result Collector（FR1.3 / FR1.4）
两种模式：
- **执行模式**：用检测到的 run_command 执行测试，收集 reporter 输出（JSON / JUnit XML）。长任务交由后台执行并轮询（依赖 Agent 运行时后台任务能力）。
- **解析模式**：跳过执行，直接读取用户指定的 `result_file`。

执行失败诊断（FR1.4）：命令无法运行（非用例失败）时，返回明确诊断信息（退出码、stderr 摘要、可能原因），**不得生成空报告冒充成功**。

### 3. Parsers（FR1.2 / NFR5 插件式）
插件接口：

```text
Parser {
  id: string                       // "jest" | "vitest" | "pytest-xml" | "junit-generic"
  can_parse(file): boolean         // 特征嗅探（扩展名/根节点/字段）
  parse(content): TestReportData   // 失败时抛 ParseError，由上层降级
}
```

首期解析器（P0）：
- `jest-json-parser`：消费 Jest `json` reporter 输出；
- `vitest-json-parser`：消费 Vitest `json` reporter 输出；
- `junit-xml-parser`：通用 JUnit XML，兼作 pytest / 跨语言兜底。

P1 新增 `pytest-json-parser`。

### 4. Renderer（FR3）
- 默认 `markdown-renderer`：按固定章节顺序渲染（见"Report Structure"）。
- P1：`html-renderer`、`json-renderer`（JSON 为结构化伴随产物，直接序列化 `TestReportData`）。

### 5. Config Resolver（FR4.2）
合并默认值与用户覆盖：

| 配置项 | 默认值 | 说明 |
|---|---|---|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式结果文件路径 |
| output_format | markdown | markdown / html / json |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | auto / on / off |
| fail_threshold | 无 | 通过率低于该值时整体结论标记为不达标 |

默认输出文件名：`reports/test-report-<YYYYMMDD-HHmmss>.md`。

## Report Structure（固定顺序，FR2）

1. 报告头：项目名、生成时间、执行命令、框架/版本、执行环境摘要；
2. 结果摘要：用例总数、通过/失败/跳过数、通过率、总耗时；整体结论用 ✅/❌ 标识；
3. 失败用例分析（有失败时必选）：用例名、所属文件、错误信息、堆栈关键行（截断）；
4. 用例明细：按测试文件分组，各用例耗时；超过 200 条截断并注明；
5. 覆盖率（若可获取）：语句/分支/函数/行覆盖率总表 + 低于阈值文件清单；
6. 附录：原始结果文件路径、生成工具版本。

## Edge Cases & Degradation（NFR2）

- 结果文件不存在 / 无法解析：返回 AC4 式明确错误说明，不生成空报告。
- 字段缺失：数值→`未获取`，文本→`未获取`，整段缺失→该章节标 `未获取` 且其余正常。
- 用例数 > 200：明细截断，附录注明 `truncated=true` 与实际总数。
- 堆栈过长：截断至 ≤8 行 / ≤1200 字符，并标注 `[已截断]`。
- coverage=auto：检测到 coverage 产物则呈现，否则标 `未获取`。
- coverage=off：跳过覆盖率章节。

## Security（NFR3）

- 解析与渲染链路禁止读取/输出环境变量、密钥、token、auth header、webhook secret；
- 错误堆栈经 `redactSensitive` 过滤：移除疑似凭据模式（如 `password=`、`token=`、`Bearer `、`.env` 路径等）后再写入报告。

## Sequence（典型流程）

```text
用户: "生成测试报告"
  → Config Resolver: 合并默认值与覆盖
  → Framework Detector: 识别 framework/run_command（或解析模式的 result_file）
  → 模式判定:
      执行模式 → Result Collector 执行测试 → 收集 reporter 产物
      解析模式 → 直接使用 result_file
  → Parser(can_parse 嗅探 → parse): 统一为 TestReportData（降级处理缺失）
  → (可选) Coverage Collector: 解析 coverage 产物并入 coverage 字段
  → Renderer: 按 Report Structure 渲染为 Markdown
  → 落盘 reports/test-report-<ts>.md
  → 返回: 报告路径 + 摘要（通过率、失败数、关键 1~3 条失败原因）
```

## Performance（NFR1）

解析+渲染目标 <5s / 1000 用例。策略：
- 流式/分块解析大 XML/JSON，避免一次性全量驻留；
- 失败用例与明细分别构建后合并；
- 渲染为字符串一次性写盘，避免多次 IO。

## Idempotency（NFR4）

- 解析与渲染均为纯函数（输入文件 → `TestReportData` → 报告文本）；
- `header.generated_at` 在渲染时填入，不参与内容一致性比较；
- 其余字段由结果文件内容决定，重复运行结果一致。

## Extensibility（NFR5）

新增框架支持步骤：
1. 新增 `Parser` 实现 `can_parse` + `parse`；
2. 在 Parser Registry 注册；
3. 若需特殊执行命令，在 Framework Detector 增加探测规则。

既有解析器不受影响。
