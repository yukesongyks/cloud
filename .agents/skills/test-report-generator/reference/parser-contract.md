# Parser Contract（插件式，NFR5）

每种结果格式对应一个独立解析器，互不影响。新增框架支持只需新增解析器并注册。依据 `design.md` Parsers 节。

## 插件接口

```text
Parser {
  id: string                       // "jest" | "vitest" | "pytest-xml" | "junit-generic" | "pytest-json"
  can_parse(file): boolean         // 特征嗅探（扩展名/根节点/字段）
  parse(content): TestReportData  // 失败时抛 ParseError，由上层降级
}
```

- `can_parse`：轻量嗅探，不抛异常（异常视为 `false`）。依据扩展名、JSON 顶层字段、XML 根节点/属性判定。
- `parse`：消费文件内容，输出 `TestReportData`。字段缺失走降级约定（见 `degradation-and-security.md`），不得静默丢数据。格式异常抛 `ParseError(message, { cause? })`。

## Parser Registry

按注册顺序遍历，首个 `can_parse === true` 的解析器负责 `parse`。均不匹配时上层返回 AC4 式明确错误（不生成空报告）。

```text
ParserRegistry {
  register(parser): void
  resolve(file): Parser | null   // 遍历 can_parse
  parse_any(file, content): TestReportData | ParseError
}
```

## P0 解析器

### jest-json-parser（`id: "jest"`）

- `can_parse`：`.json` 且顶层为 `numPassedTests` / `numFailedTests` / `testResults` 字段。
- `parse`：消费 Jest `--json` reporter 输出。
  - `summary`：`numPassedTests` / `numFailedTests` / `numPendingTests` / `numTotalTests`；`success === true` → `overall="pass"`。
  - `header.framework = "jest"`；`environment` 从 `testResults[0].name` 推断或 `未获取`。
  - `failures`：遍历 `testResults[].assertionResults[]` 中 `status === "failed"`，取 `fullName` / `ancestorTitles` 拼接为 `name`，`failureMessages` 经脱敏拼接为 `error_message`，`file` 取 `testResult.name`。
  - `details.grouped_by_file`：按 `testResults[].name` 分组，用例 `status` 映射 `passed→pass` / `failed→fail` / `pending→skip`。
  - `duration_ms`：取 `testResults[].endTime - startTime`，缺失为 `0`。
  - `coverage`：Jest `--json` 不含；由 Coverage Collector 单独收集（auto/on）。

### vitest-json-parser（`id: "vitest"`）

- `can_parse`：`.json` 且顶层为 `numTotalTestSuites` / `testResults` 或含 `command` 与 `testResults`（Vitest JSON reporter 特征：`numTotalTests` + `testResults[].name` + `assertionResults`，结构与 Jest 高度兼容）。
- `parse`：逻辑与 jest-json-parser 一致（Vitest JSON reporter 与 Jest JSON 结构兼容），`header.framework = "vitest"`。注意 `assertionResults[].status` 取值含 `"skipped"`。

### junit-xml-parser（`id: "junit-generic"`，跨语言兜底）

- `can_parse`：`.xml` 且根节点为 `<testsuite>` 或 `<testsuites>`（JUnit XML）。
- `parse`：消费通用 JUnit XML，兼作 pytest（`--junitxml`）输出。
  - `summary`：从 `<testsuite>`/`<testsuites>` 汇总 `tests` / `failures` / `errors` / `skipped`；`duration_ms` 取 `time`（秒）× 1000，缺失为 `0`。
  - `failures`：遍历 `<testcase>` 中 `failure` / `error` 子节点，`name` 取 `testcase.name`，`file` 取 `testcase.file` 或所属 `<testsuite>` 的 `file`，缺失标 `未获取`；`error_message` 取 `failure/@message` 或节点文本，经脱敏。
  - `details.grouped_by_file`：按 `file`（缺失按 `classname`）分组；`status` 由 `failure`/`error`/`skipped` 子节点存在性判定。
  - `header.framework`：若 `testsuite` 含 `pytest` 特征（`host`/`timestamp` + Python 路径）标 `pytest`，否则 `junit`；`framework_version` 缺失标 `未获取`。

## P1 解析器（M2 已实现）

### pytest-json-parser（`id: "pytest-json"`）

消费 `pytest-json-report` 插件输出（`pytest --json-report --json-report-file=...`）。与 `junit-generic` 互为补充：当 pytest 项目同时产出 JSON 时优先本解析器以获取更丰富的失败上下文与耗时。详见 `reference/pytest-json-parser.md`。

- `can_parse`：`.json` 且顶层含 `tests`（数组）与 `summary`（对象），`summary` 含 `total`/`passed`/`failed`/`skipped` 至少两项；与 `junit-generic` 的 XML 嗅探不冲突。
- `parse`：字段映射见 `pytest-json-parser.md`；`header.framework = "pytest"`。
- Registry 注册顺序排在 `junit-generic` 之前，确保 JSON 优先于 XML 兜底。

## 扩展

- 扩展步骤见 `design.md` Extensibility：实现 `can_parse`+`parse` → Registry 注册 → 必要时在 Framework Detector 增加探测规则。既有解析器不受影响。
