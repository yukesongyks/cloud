# Coverage Collector（M2 / P1，FR2.5 / AC5）

依据 `design.md` Components 与 Edge Cases。解析 coverage 产物，填充 `TestReportData.coverage` 字段；与 `coverage` 配置项的三态处理联动。Coverage Collector 在 Parser 之后、Renderer 之前运行，仅消费已解析的 `TestReportData` 与 coverage 产物文件，不触碰结果解析逻辑。

## coverage 配置三态（FR4.2 / AC5，任务 4.2）

| 配置值 | 行为 |
|---|---|
| `auto`（默认） | 自动探测 coverage 产物：检测到则解析填充；检测不到则整段省略并在渲染时标 `未获取`，其余章节正常 |
| `on` | 强制收集：用户须显式提供 coverage 产物路径或可被探测；探测/解析失败时覆盖率章节标 `未获取` 并附诊断说明（不抛错阻塞其余章节） |
| `off` | 跳过覆盖率章节：渲染器不输出该章节，`TestReportData.coverage` 置空 |

`auto` 的"未获取"与 `on` 的失败诊断均不触发整体降级；仅覆盖率章节受影响（AC5）。

## coverage 字段映射（design.md Data Model）

```text
coverage?: {
  statements_pct?: number   // 保留 1 位小数
  branches_pct?: number
  functions_pct?: number
  lines_pct?: number
  below_threshold_files: string[]   // 覆盖率低于阈值的文件
}
```

整段缺失时渲染标 `未获取`；单字段缺失标 `未获取`，其余字段正常呈现。

## 首期支持的 coverage 产物（P1）

| 产物 | 来源框架 | 解析方式 |
|---|---|---|
| `coverage-summary.json` | Jest / Vitest（`--coverage` + json-summary reporter） | 根节点 `total` 取 statements/branches/functions/lines 的 `pct` |
| `.coverage/coverage-final.json` | Jest / Vitest（coverage-final） | 按 file 聚合 lines/branches/fns 计算汇总百分比 |
| `coverage.xml` | Python `coverage.py` / pytest-cov | 解析 `<coverage line-rate branch-rate>`（无分支则 branches_pct 标 `未获取`） |
| `lcov.info` | 通用 lcov | 聚合 LF/LH/BRF/BRH 计算行/分支覆盖率；functions 可缺失 |

低于阈值的文件清单（`below_threshold_files`）：以 `line_rate` 或 `lines_pct` 与配置的 `coverage_threshold`（默认沿用 `fail_threshold` 不混淆，由用户单独提供或按 80% 兜底）比较，低于阈值者按相对路径列入。文件路径经 `redactSensitive` 过滤（移除含 `.env`/凭据的路径片段）。

## 解析失败与降级（NFR2）

- 产物不存在：`auto`→省略章节；`on`→标 `未获取` + 诊断说明。
- 产物损坏/字段缺失：可解析部分填充，缺失字段标 `未获取`；仅当完全无法解析时整段标 `未获取`。
- 不抛错阻塞渲染链路；Coverage Collector 异常被上层捕获并降级为 `未获取`，其余章节正常输出。

## 幂等（NFR4）

Coverage Collector 为纯函数：相同 coverage 产物 → 相同 `coverage` 字段。`below_threshold_files` 排序稳定（按路径升序），避免多次运行结果漂移。

## 扩展（NFR5）

新增 coverage 产物格式：实现 `can_parse` + `parse_coverage` → 在 Coverage Collector 注册。既有 coverage 解析不受影响。
