# Framework Detector & Result Collector

依据 `design.md` Components 1/2 与 FR1.1 / FR1.3 / FR1.4。

## Framework Detector（FR1.1）

识别优先级（高 → 低）：

1. **用户显式指定命令**（`test_command` 覆盖默认）。
2. **项目配置**：`package.json` 的 `scripts.test`、`pyproject.toml` 的 `[tool.pytest]`/`pytest.ini`、`Cargo.toml` 的 `[[test]]`。
3. **框架特征文件推断**：`jest.config.*`、`vitest.config.*`、`pytest.ini`、`conftest.py`。

输出：`{ framework, run_command?, reporter_hint? }`。

- 执行模式：必须给出 `run_command`；`reporter_hint` 指示如何让框架产出可解析的 reporter（见下表）。
- 解析模式：`framework` 由结果文件特征推断（委托 Parser 的 `can_parse`），无需 `run_command`。

### run_command 构造（默认，可被 `test_command` 覆盖）

| 框架 | 默认 run_command（执行模式） | reporter 产物 |
|---|---|---|
| jest | `npx jest --json --outputFile=reports/jest-results.json` | JSON |
| vitest | `npx vitest run --reporter=json --outputFile=reports/vitest-results.json` | JSON |
| pytest | `pytest --junitxml=reports/pytest-results.xml` | JUnit XML |
| junit（兜底） | 无默认 run_command；仅解析模式消费已有 XML | JUnit XML |

长任务交由 Agent 运行时后台执行 + 轮询（R2）。

## Result Collector 双模式（FR1.3）

- **执行模式**：用检测到的 `run_command` 执行测试，收集 reporter 输出（JSON / JUnit XML）。失败用例不影响"命令是否成功运行"——只要 reporter 产物生成即视为收集成功。
- **解析模式**：跳过执行，直接读取用户指定的 `result_file`（满足 US4 / AC3）。

模式判定：`result_file` 显式提供或检测到已有结果文件 → 解析模式；否则 → 执行模式。

## 执行失败诊断（FR1.4 / AC4）

命令无法运行（**非用例失败**，如命令未找到、缺依赖、超时退出码）时，返回明确诊断信息，**不得生成空报告冒充成功**：

```text
执行失败诊断:
  command: <run_command>
  exit_code: <code>
  stderr_summary: <截断至 ~500 字符>
  possible_causes:
    - 命令/可执行文件不存在
    - 依赖未安装（package.json 未执行 install）
    - 超时或被信号终止
  建议: 安装依赖 / 校正 test_command / 检查 reporter 参数
```

- 用例失败（退出码非 0 但 reporter 产物已生成）→ 正常生成报告（含失败分析章节），不触发执行失败诊断。
- reporter 产物缺失且退出码非 0 → 视为执行失败，返回诊断而非空报告。

## 覆盖率收集（FR2.5 / AC5，M2 P1）

- `coverage=auto`：检测 `coverage/` 目录或 `coverage-final.json` / `.coverage` 产物，存在则解析并入 `coverage` 字段；否则 `coverage` 整段省略，渲染标 `未获取`。
- `coverage=on`：强制尝试收集，检测不到仍标 `未获取`。
- `coverage=off`：跳过覆盖率章节。
- `coverage=auto`：M2 已实现 coverage 产物探测与解析填充（任务 4.1/4.2，见 `coverage-collector.md`）。
