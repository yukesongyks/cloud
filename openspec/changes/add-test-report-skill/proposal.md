## What & Why

提供一个新的 Agent Skill——"测试报告生成器"（test-report-generator）。该 Skill 让 Agent 在完成测试执行后，能够自动解析测试结果产物（Jest/Vitest JSON reporter、pytest JUnit XML/JSON、通用 JUnit XML），并生成结构化、可读性强的标准测试报告（默认 Markdown）。

背景与痛点：
- 测试结果散落在终端输出、CI 日志或框架原生产物（JUnit XML、coverage 目录）中，需要人工收集、整理、汇总，耗时且易遗漏；
- 缺乏统一格式的测试报告，跨项目/跨团队沟通成本高；
- 失败用例的上下文（错误信息、堆栈、关联代码）需要人工回溯；
- 覆盖率、通过率等质量指标无法沉淀为可追踪的历史数据。

目标：一条指令即可"执行测试 → 收集结果 → 生成报告"，并支持"仅解析已有结果"模式。

## Goals / Non-Goals

### Goals
- G1：一条指令（如"生成测试报告"）即可自动完成：执行测试 → 收集结果 → 生成报告；
- G2：报告内容标准化，包含报告头、结果摘要、失败用例分析、用例明细、覆盖率、附录六大板块；
- G3：首期支持主流测试框架的结果解析（Jest/Vitest JSON、pytest JUnit XML/JSON、通用 JUnit XML）；
- G4：报告支持多种输出格式，默认 Markdown，P1 支持 HTML，JSON 作为可选伴随产物。

### Non-Goals
- 不做测试用例的自动生成或修复（仅报告）；
- 不做报告的在线托管 / Web 服务化展示；
- 不做多次运行结果的趋势对比分析（列为后续迭代候选，见 M4）；
- 不做非测试类质量报告（如 lint、安全扫描）的聚合。

## Affected PRs or Specs

- 新增 Skill 产物，不修改既有 spec；本期为独立新增能力。
- 后续若与 CI 流水线深度集成，再在相关 service spec 中引用本 Skill 的输出路径约定。

## Open Questions

- Q1：首期目标项目栈是否以 TypeScript/Node 为主？→ 决策：按需求文档假设，P0 范围以 TypeScript/Node（Jest/Vitest）为主，Python（pytest）与通用 JUnit XML 为兜底。
- Q2：报告是否需要中文/英文双语模板？→ 决策：首期仅中文模板；模板层采用可替换结构，后续可扩展英文模板。
- Q3：是否需要将报告自动推送到 IM / 邮件等渠道？→ 决策：当前列为非目标，不纳入本期范围。
