---
name: test-report-generator
description: Generate a standardized test report (Markdown by default) from test results. Use after test execution, or when the user says "生成测试报告" / "跑一下测试并出报告" / "把这个 junit.xml 转成测试报告", to parse Jest/Vitest JSON, pytest JUnit XML/JSON, or generic JUnit XML and emit a six-section report (header / summary / failure analysis / details / coverage / appendix).
version: 1.0.0
activation: auto
---

# 测试报告生成器 Skill

## What & Why

Agent 在完成测试执行后，将散落在终端输出、CI 日志或框架原生产物（JUnit XML、coverage 目录）中的测试结果，自动解析为统一内部模型 `TestReportData`，并渲染为结构化、可读性强的标准测试报告（默认 Markdown）。支持"执行模式"（触发测试运行并收集结果）与"解析模式"（仅解析已有结果文件，不重复执行）。

目标：一条指令即可"执行测试 → 收集结果 → 生成报告"，报告标准化为六大板块，首期支持 Jest/Vitest JSON、pytest JUnit XML、通用 JUnit XML。

非目标：不做测试用例自动生成/修复、不做在线托管/Web 展示、不做趋势对比（M4）、不做非测试类质量报告聚合。

详细设计依据见 `openspec/changes/add-test-report-skill/design.md`。本 Skill 为**无状态、可复用**的报告生成能力，技术细节与契约定义见同目录 `reference/`。

## When to Use

用户表达以下意图时触发（FR4.1）：

- "生成测试报告"
- "跑一下测试并出报告"
- "把这个 junit.xml 转成测试报告"
- "pytest 的结果生成报告"
- 任意"测试执行 + 出报告"组合意图；或仅提供已有结果文件要求转报告

触发判定：意图中包含"测试报告/test report/出报告"且涉及测试结果产物或测试执行。

## How It Works（执行流程）

按 `design.md` 的典型 Sequence 执行：

1. **Config Resolver**：合并默认值与用户覆盖（见"配置项"）。
2. **Framework Detector**：识别 `framework` / `run_command`；解析模式由结果文件特征推断 `framework`，无需 `run_command`。
3. **模式判定**：
   - 执行模式：用 `run_command` 执行测试并收集 reporter 产物；长任务后台执行 + 轮询（R2）。
   - 解析模式：跳过执行，直接使用 `result_file`。
4. **Parser（插件式）**：`can_parse` 嗅探 → `parse` 统一为 `TestReportData`（缺失字段降级，解析异常抛 `ParseError` 由上层降级）。
5. **(可选) Coverage Collector**：解析 coverage 产物并入 `coverage` 字段。
6. **Renderer**：按固定六章节顺序渲染为 Markdown。
7. **落盘**：`reports/test-report-<YYYYMMDD-HHmmss>.md`。
8. **返回**：报告路径 + 摘要（通过率、失败数），失败时附最关键 1~3 条失败原因（FR3.3）。

执行失败（命令无法运行，非用例失败）时：返回明确诊断信息（退出码 / stderr 摘要 / 可能原因），**不得生成空报告冒充成功**（FR1.4 / AC4）。

## Report Structure（固定顺序，FR2）

1. **报告头**：项目名、生成时间、执行命令、框架/版本、执行环境摘要。
2. **结果摘要**：用例总数、通过/失败/跳过数、通过率、总耗时；整体结论用 ✅ / ❌ 标识（结合 `fail_threshold` 判定达标）。
3. **失败用例分析**（有失败时必选）：每条含用例名、所属文件、错误信息、堆栈关键行（截断 ≤ 8 行 / ≤ 1200 字符，标注 `[已截断]`）。
4. **用例明细**：按测试文件分组，各用例耗时；超过 200 条截断并注明。
5. **覆盖率**（若可获取）：语句/分支/函数/行覆盖率总表 + 低于阈值文件清单；不存在标 `未获取`。
6. **附录**：原始结果文件路径、生成工具版本。

## 配置项（FR4.2，均有默认值，用户可覆盖）

| 配置项 | 默认值 | 说明 |
|---|---|---|
| test_command | 自动检测 | 测试执行命令 |
| result_file | 自动检测 | 解析模式下的结果文件路径 |
| output_format | markdown | markdown / html / json |
| output_path | reports/ | 报告输出目录 |
| coverage | auto | auto / on / off |
| fail_threshold | 无 | 通过率低于该值时整体结论标记为不达标 |

默认输出文件名：`reports/test-report-<YYYYMMDD-HHmmss>.md`。`output_format` 支持 `markdown`（P0）、`html`（P1）、`json`（P1 伴随产物）。

## 插件式解析器契约（NFR5）

每种结果格式对应一个独立解析器，互不影响。新增框架支持只需新增解析器并注册。插件接口与三个 P0 解析器（jest-json / vitest-json / junit-xml）的精确定义见 `reference/parser-contract.md`。

## 降级与安全（NFR2 / NFR3）

- **降级**：数值缺失 → `未获取`，文本缺失 → `未获取`，整段缺失（如 coverage）→ 该章节标 `未获取` 且其余正常；结果文件不存在/无法解析 → 返回 AC4 式明确错误，不生成空报告；用例 > 200 截断注明；堆栈过长截断标注 `[已截断]`。
- **安全**：解析与渲染链路禁止读取/输出环境变量、密钥、token、auth header、webhook secret；错误堆栈经 `redactSensitive` 过滤疑似凭据模式后再写入。详见 `reference/degradation-and-security.md`。

## 幂等性与性能（NFR4 / NFR1）

- 解析 + 渲染为纯函数；`header.generated_at` 渲染时填入，不参与内容一致性比较。
- 解析 + 渲染目标 < 5s / 1000 用例；大 XML/JSON 流式/分块解析，渲染字符串一次性写盘。

## 依赖与假设

- 无运行时强依赖；解析依赖 Node 内置能力（`fs` / JSON / XML 解析），或 Agent 运行时提供的等价能力。
- P0 范围以 TypeScript/Node（Jest/Vitest）为主，Python（pytest）与通用 JUnit XML 为兜底。
- 报告首期仅中文模板；模板层可替换，后续可扩展英文模板（Q2）。

## 实现参考（reference/）

- `reference/data-model.md` — `TestReportData` 统一内部模型与字段缺失约定。
- `reference/parser-contract.md` — Parser 插件接口、Parser Registry、三个 P0 解析器。
- `reference/framework-and-collector.md` — Framework Detector、执行/解析双模式、执行失败诊断。
- `reference/markdown-renderer.md` — 六章节渲染规则、截断、达标判定。
- `reference/degradation-and-security.md` — 降级策略、`redactSensitive`、幂等性。
- `reference/config-and-output.md` — Config Resolver、输出路径命名、交互返回约定。
