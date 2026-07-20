# Parser: pytest-json-parser（M2 / P1，FR1.2）

依据 `design.md` Parsers 节与 `parser-contract.md` 插件接口。消费 pytest 的 JSON report 产物（`pytest --json-report --json-report-file=reports/pytest-results.json` 或 `pytest-json-report` 插件输出），统一为 `TestReportData`。与既有 `junit-xml-parser` 互为补充：当 pytest 项目同时产出 JSON 时优先本解析器以获取更丰富的失败上下文与耗时。

## 插件接口实现

```text
Parser {
  id: "pytest-json"
  can_parse(file):
    - 扩展名为 .json；且
    - 根节点含 `tests`（数组）与 `summary`（对象）字段；且
    - `summary` 含 `total`/`passed`/`failed`/`skipped` 中的至少两项。
  parse(content) -> TestReportData:
    解析失败抛 ParseError，由上层降级（见 degradation-and-security.md）。
}
```

与 `junit-generic` 的 `can_parse` 不冲突：后者只认 XML 根节点。

## 字段映射（结果 JSON → TestReportData）

| TestReportData 字段 | JSON 来源 | 缺失处理 |
|---|---|---|
| header.project_name | 顶层 `metadata` 或 cwd 目录名 | 标 `未获取` |
| header.generated_at | 渲染时填入（不计入幂等） | — |
| header.command | 顶层 `args`（数组 join）或 `parse-only: <file>` | 标 `未获取` |
| header.framework | 固定 `pytest` | — |
| header.framework_version | `environment.python_version` 或 `summary.python_version` | 标 `未获取` |
| header.environment | `environment` 对象序列化（Python/平台/plugins 摘要） | 标 `未获取` |
| summary.total | `summary.total` | 0 + 渲染标 `未获取` |
| summary.passed | `summary.passed` | 0 |
| summary.failed | `summary.failed` | 0 |
| summary.skipped | `summary.skipped` | 0 |
| summary.pass_rate | `passed/total*100`，保留 1 位小数 | total=0 时标 `未获取` |
| summary.duration_ms | `duration`（秒）×1000，或 `summary.duration`×1000 | 0 + 标 `未获取` |
| summary.overall | 由 `failed` 与 `fail_threshold` 判定 | — |
| failures[].name | `tests[i].name`（含 node id） | 必填，缺失跳过该用例 |
| failures[].file | `tests[i].metadata`/`call.crash.filename`/node id 第一段 | 标 `未获取` |
| failures[].error_message | `tests[i].call.longrepr` 首段或 `crash.message` | 标 `未获取` |
| failures[].stack_summary | `tests[i].call.traceback` 或 `longrepr` 截断 ≤8 行/≤1200 字符，标 `[已截断]` | 标 `未获取` |
| details.grouped_by_file | 按 `tests[i]` 的源文件分组（node id `::` 前路径） | 文件缺失标 `未获取` |
| details.cases[].name | `tests[i].name` | — |
| details.cases[].duration_ms | `tests[i].duration`×1000 | 省略 |
| details.cases[].status | outcome 映射：passed→pass、failed→fail、skipped→skip、errors→fail | — |
| details.truncated | `len(tests) > 200` | — |
| details.total_cases | `len(tests)` | — |
| appendix.source_files | 输入结果文件路径 | — |
| appendix.tool_version | 本 Skill 版本 | — |

## outcome → status 映射

```text
passed           -> pass
failed           -> fail
skipped          -> skip
error / xfail    -> fail（计入 failures）
xpass            -> pass
```

`errors` 项归入 `failures` 与 `details`，并计入 `summary.failed`。

## 降级与幂等

- 任一 `tests[i]` 缺字段：跳过该用例的对应字段填充（标 `未获取`），不抛错；仅当 `summary` 与 `tests` 同时缺失或 JSON 非法时抛 `ParseError`。
- `parse` 为纯函数：相同输入 JSON 产生相同 `TestReportData`（`generated_at` 不参与比较）。
- 长堆栈经 `redactSensitive` 脱敏后再截断（见 `degradation-and-security.md`）。

## Registry 注册

实现完成后在 Parser Registry 按 `id="pytest-json"` 注册；`can_parse` 优先于 `junit-generic` 嗅探 JSON。既有解析器不受影响（NFR5）。
