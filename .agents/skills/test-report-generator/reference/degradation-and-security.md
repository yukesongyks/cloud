# 降级与安全（NFR2 / NFR3 / NFR4）

依据 `design.md` Edge Cases & Degradation / Security / Idempotency 节。

## 降级策略（NFR2）

| 场景 | 处理 |
|---|---|
| 结果文件不存在 / 无法解析 | 返回 AC4 式明确错误说明（不生成空报告冒充成功） |
| 数值字段缺失 | 渲染 `未获取`；`duration_ms` 内部为 `0` |
| 文本字段缺失（文件路径/错误信息） | 渲染 `未获取` |
| 整段缺失（如 coverage） | 该章节标 `未获取`，其余章节正常 |
| 用例数 > 200 | 明细截断，附录注明 `truncated=true` 与实际总数 |
| 堆栈过长 | 截断至 ≤ 8 行 / ≤ 1200 字符，标注 `[已截断]` |
| coverage=auto | 检测到 coverage 产物则呈现，否则标 `未获取` |
| coverage=off | 跳过覆盖率章节 |
| 解析异常（ParseError） | 由上层捕获并降级为明确错误，不得崩溃或静默丢数据 |

`ParseError` 由解析器在格式异常时抛出；上层（Collector/编排层）捕获后返回 AC4 式诊断，不生成空报告。

## 安全脱敏 redactSensitive（NFR3）

解析与渲染链路禁止读取/输出环境变量、密钥、token、auth header、webhook secret。错误堆栈/日志经 `redactSensitive` 过滤后再写入报告。

### 过滤模式（按顺序应用，幂等）

1. **凭据赋值对**：匹配 `(?i)(password|passwd|secret|token|api[_-]?key|access[_-]?key|auth|authorization|webhook[_-]?secret)\s*[:=]\s*\S+` → 以 `键=<REDACTED>` 替换值。
2. **Bearer / Basic 头**：`(?i)(bearer|basic)\s+[A-Za-z0-9._\-/+=]+` → `Bearer <REDACTED>`。
3. **长令牌串**：连续长度 ≥ 40 的 hex / base64 串（`[A-Za-z0-9+/=_\-]{40,}`）→ `<REDACTED>`。
4. **疑似密钥前缀**：`sk_live_`、`sk_`、`pk_`、`ghp_`、`gho_`、`xox`（Slack）、`AKIA`（AWS）等已知敏感前缀开头的 token → `<REDACTED>`。
5. **本地 env 路径**：形如 `.env`、`.env.local`、`.env.production` 的绝对/相对路径引用 → 路径保留，但若同行含密钥赋值则按规则 1 脱敏。

### 不变量

- 仅对堆栈/日志/错误信息文本应用；不读取 `process.env` 或任何环境变量源。
- 脱敏为纯函数，同一输入重复脱敏结果一致。
- 脱敏后长度计入截断阈值（≤ 8 行 / ≤ 1200 字符）。

## 幂等性（NFR4）

- 解析 + 渲染均为纯函数（输入文件 → `TestReportData` → 报告文本）。
- `header.generated_at` 渲染时填入，不参与内容一致性比较。
- 其余字段由结果文件内容决定，同一文件重复运行结果一致。

## 性能（NFR1）

解析 + 渲染目标 < 5s / 1000 用例：

- 流式/分块解析大 XML/JSON，避免一次性全量驻留；
- 失败用例与明细分别构建后合并；
- 渲染为字符串一次性写盘，避免多次 IO。
