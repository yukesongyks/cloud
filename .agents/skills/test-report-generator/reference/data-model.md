# Data Model: TestReportData

统一内部模型，所有解析器输出该结构，渲染器仅消费它。依据 `openspec/changes/add-test-report-skill/design.md` Data Model 节。

```text
TestReportData {
  header: {
    project_name: string
    generated_at: string        // ISO8601，渲染时填入，不计入幂等
    command: string             // 执行命令；解析模式可为 "parse-only: <file>"
    framework: string           // "jest" | "vitest" | "pytest" | "junit"
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
    error_message: string      // 脱敏后
    stack_summary: string      // 截断至可读长度（默认 ≤ 8 行 / 1200 字符）
  }>
  details: {
    grouped_by_file: Array<{
      file: string
      cases: Array<{ name: string; duration_ms?: number; status: "pass" | "fail" | "skip" }>
    }>
    truncated: boolean          // 超过 200 条时为 true 并注明
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

## 字段缺失统一约定（NFR2）

| 缺失类型 | 渲染表现 |
|---|---|
| 数值缺失（duration/version 等） | `未获取`；`duration_ms` 缺失时内部为 `0`，渲染标 `未获取` |
| 文本缺失（文件路径/错误信息） | `未获取` |
| 整段缺失（如 coverage） | 该章节标 `未获取`，其余章节正常 |
| 用例明细 > 200 条 | `details.truncated = true`，附录注明实际总数 |

## 幂等性字段排除（NFR4）

仅 `header.generated_at` 在渲染时填入，不参与内容一致性比较。其余字段由结果文件内容决定，同一文件重复运行结果一致。

## 关键不变量

- `summary.total === passed + failed + skipped`（解析器必须保证）。
- `summary.pass_rate` 由 `(passed / total) * 100` 计算，`total === 0` 时为 `0`。
- `summary.overall` 默认由 `failed === 0` 判定；若设置 `fail_threshold`，则 `pass_rate < fail_threshold` 时为 `fail`。
- `failures` 仅含失败用例；`details` 含全部用例（含截断控制）。
