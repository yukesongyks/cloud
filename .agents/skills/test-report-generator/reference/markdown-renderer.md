# Markdown Renderer（六章节，FR2 / AC1）

依据 `design.md` Report Structure。渲染器仅消费 `TestReportData`，为纯函数（NFR4）。固定章节顺序如下，缺失章节标 `未获取` 且其余正常。

## 章节顺序与渲染规则

### 1. 报告头

```markdown
# 测试报告：<project_name>

- 生成时间：<generated_at>
- 执行命令：<command>
- 框架：<framework> <framework_version 或 "未获取">
- 执行环境：<environment>
```

`command` 在解析模式为 `parse-only: <result_file>`。

### 2. 结果摘要

```markdown
## 结果摘要

| 指标 | 值 |
|---|---|
| 用例总数 | <total> |
| 通过 | <passed> |
| 失败 | <failed> |
| 跳过 | <skipped> |
| 通过率 | <pass_rate>% |
| 总耗时 | <duration_ms 或 "未获取"> |
| 整体结论 | <✅ 通过 / ❌ 不达标> |
```

- `overall="pass"` → ✅ 通过；`fail` → ❌ 不达标。
- `fail_threshold` 设置时：`pass_rate < fail_threshold` → `fail`（FR2.2）。

### 3. 失败用例分析（有失败时必选，AC2）

```markdown
## 失败用例分析

### 1. <name>

- 所属文件：<file 或 "未获取">
- 错误信息：<error_message 脱敏后>

<stack_summary，≤ 8 行 / ≤ 1200 字符，截断标 [已截断]>
```

无失败时该章节标注：`本次运行无失败用例。`

### 4. 用例明细（按文件分组，FR2.4）

```markdown
## 用例明细

### <file>

| 用例 | 状态 | 耗时(ms) |
|---|---|---|
| <name> | pass/fail/skip | <duration_ms 或 "未获取"> |
```

- 超过 200 条：截断并注明 `明细已截断，仅展示前 200 条，实际总数 <total_cases>（truncated=true）`。
- 耗时缺失标 `未获取`。

### 5. 覆盖率（若可获取，AC5）

```markdown
## 覆盖率

| 类型 | 覆盖率 |
|---|---|
| 语句 | <statements_pct 或 "未获取">% |
| 分支 | <branches_pct 或 "未获取">% |
| 函数 | <functions_pct 或 "未获取">% |
| 行 | <lines_pct 或 "未获取">% |

低于阈值文件：
- <below_threshold_files...>
```

- `coverage` 整段缺失 → `## 覆盖率\n\n未获取`。
- `coverage=off` → 该章节省略。

### 6. 附录

```markdown
## 附录

- 原始结果文件：<source_files[] 逐行>
- 生成工具版本：<tool_version>
- 明细截断：<truncated ? true : false>（实际总数 <total_cases>）
```

## 不变量

- 章节顺序固定，不得调换或省略（缺失章节标 `未获取` 而非删除）。
- `header.generated_at` 渲染时填入，不参与幂等比较。
- 堆栈/错误信息渲染前必须经 `redactSensitive` 脱敏（见 `degradation-and-security.md`）。
- 用例状态统一用小写 `pass` / `fail` / `skip`。
