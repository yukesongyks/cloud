# Config Resolver & 输出与交互返回

依据 `design.md` Config Resolver / Sequence / FR3 / FR4。

## Config Resolver（FR4.2）

合并默认值与用户覆盖；解析顺序：CLI/意图参数 > 项目配置嗅探 > 默认值。

| 配置项 | 默认值 | 覆盖来源 |
|---|---|---|
| test_command | 自动检测（见 framework-and-collector.md） | 用户显式指定 |
| result_file | 自动检测 | 用户指定 / 检测已有产物 |
| output_format | markdown | 用户指定（markdown/html/json） |
| output_path | reports/ | 用户指定目录 |
| coverage | auto | 用户指定（auto/on/off） |
| fail_threshold | 无（不启用） | 用户指定百分比数值 |

解析模式由 `result_file` 存在触发；执行模式由 `test_command`/检测到的 `run_command` 触发。

## 输出路径与命名（FR3.2）

- 默认目录：`reports/`（不存在则创建）。
- 默认文件名：`reports/test-report-<YYYYMMDD-HHmmss>.md`。
  - 时间戳取**渲染时刻**（与 `generated_at` 同源，不计入幂等）。
- 用户可指定完整 `output_path`（目录）或完整文件路径。
- `output_format=markdown` → `.md`；`html`(P1) → `.html`；`json`(P1) → `.json`。
- 落盘为字符串一次性写盘（NFR1，避免多次 IO）。

## 交互返回（FR3.3）

生成后向用户返回（不超过 3 条失败原因）：

```text
✅ 测试报告已生成：<output_path>

结果摘要：
- 通过率：<pass_rate>%（<passed>/<total>）
- 失败数：<failed>
- 跳过数：<skipped>

关键失败原因（如有）：
1. <failure.name> @ <file>
   <error_message 摘要, ≤ 200 字符>
2. ...
```

- 无失败时省略"关键失败原因"段。
- 执行失败（AC4）时返回诊断块（见 framework-and-collector.md），不返回报告路径。

## 触发意图（FR4.1）

- "生成测试报告"
- "跑一下测试并出报告"
- "把这个 junit.xml 转成测试报告"
- 仅提供结果文件路径 + "生成报告" → 解析模式。

## P1（非本期）

- `html-renderer`、`json-renderer`（JSON 直接序列化 `TestReportData` 为伴随产物）。
- pytest-json-parser（M2 已实现，见 `pytest-json-parser.md`）、coverage 填充与三态处理（M2 已实现，见 `coverage-collector.md`）、fail_threshold 更细判定。
