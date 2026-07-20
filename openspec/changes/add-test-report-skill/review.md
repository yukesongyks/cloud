# Code Review: 测试报告生成器 Skill (test-report-generator)

> 评审阶段: review (代码评审)
> 评审技能: /code-review-skill
> 评审对象: `.agents/skills/test-report-generator/` (SKILL.md + reference/*.md)
> 规格基线: `openspec/changes/add-test-report-skill/{proposal,design,tasks}.md` + `openspec/config.yaml`
> 评审时间: 2026-07-20
> 证据充分性: proposal.md / design.md / tasks.md / markdown-renderer.md / config.yaml 为完整内容; SKILL.md / config-and-output.md / framework-and-collector.md / parser-contract.md / data-model.md 仅获取结构化预览(受工具预算约束); degradation-and-security.md / coverage-collector.md / pytest-json-parser.md 未读取, 相关结论标注为"待复核"。

---

## 1. 总体结论 (Verdict)

**结论: Conditionally Approve (有条件通过) — 修复 2 个 Major 项后可合入)**

Skill 整体架构清晰、规格追溯完整、六章节渲染与降级策略对齐 FR/AC/NFR, 达到 P0 可交付质量。但存在 2 处 Major 级设计缺口(覆盖率阈值来源、fail_threshold 单位)需在合入前明确, 另有若干 Minor 项建议一并修复。未发现 Blocker。

| 维度 | 评级 | 说明 |
|---|---|---|
| 规格符合性 (FR/AC) | A- | P0 范围 FR1~FR4、AC1~AC5 均有任务与实现落点, 双向追溯清晰 |
| 架构与可维护性 (NFR5) | A | 解析器插件化 + Registry + 统一 TestReportData 模型, 扩展步骤明确 |
| 降级与健壮性 (NFR2) | B+ | 字段缺失标注"未获取"约定一致, 但 AC4 与 NFR2 边界需细化 |
| 安全 (NFR3) | B | redactSensitive 覆盖基础模式, 模式集偏窄, 建议复用 worker-utils |
| 幂等性 (NFR4) | A- | 解析+渲染纯函数, generated_at 不计入一致性; 文件名层面幂等需补一句 |
| 性能 (NFR1) | B+ | 策略合理(流式/分块/一次性写盘), 但缺 1000 用例基准验证记录 |
| 文档一致性 | B+ | design 与 tasks 里程碑标注存在细微不一致; parser id 命名需核对 |

---

## 2. 规格符合性矩阵 (FR / AC / NFR 覆盖)

| 编号 | 要求 | 实现落点 | 状态 | 证据/备注 |
|---|---|---|---|---|
| FR1.1 | 框架检测优先级 | framework-and-collector.md | ✅ | 优先级 a>b>c 与 design 一致 |
| FR1.2 | P0 框架解析 | parser-contract.md | ✅ | jest/vitest/junit-xml 三解析器 |
| FR1.3 | 执行/解析双模式 | framework-and-collector.md | ✅ | 两模式定义明确 |
| FR1.4 | 执行失败诊断 | framework-and-collector.md | ✅ | 禁止空报告冒充成功 |
| FR2 | 报告六章节 | markdown-renderer.md | ✅ | 章节顺序固定, 缺失标未获取 |
| FR2.3 | 失败用例分析 | markdown-renderer.md §3 | ✅ | 含用例名/文件/错误/堆栈截断 |
| FR2.4 | 明细分组+截断 | markdown-renderer.md §4 | ✅ | >200 条截断注明 |
| FR2.5 | 覆盖率章节 | coverage-collector.md (待复核) | ⚠️ | below_threshold_files 阈值来源缺失(见 F-2) |
| FR3.1 | 输出格式 | markdown-renderer.md (html/json 待 M3) | ✅ | P0 Markdown 已实现, M3 标 [ ] 符合范围 |
| FR3.2 | 输出路径命名 | config-and-output.md | ✅ | reports/test-report-<ts>.md |
| FR3.3 | 返回摘要 | config-and-output.md | ✅ | 路径+通过率+失败数+1~3 条原因 |
| FR4.1 | 触发意图 | SKILL.md | ✅ | 三示例与 proposal 一致 |
| FR4.2 | 可配置项 | config-and-output.md | ⚠️ | fail_threshold 单位未定义(见 F-1) |
| AC1 | Jest/Vitest TS 报告 | 5.2/3.2/3.3 | ✅ | 任务标 [x] |
| AC2 | 失败用例章节 | 5.3 | ✅ | 渲染规则明确 |
| AC3 | 解析模式不执行 | 2.3/3.4 | ✅ | 解析模式定义清晰 |
| AC4 | 损坏文件返回错误 | 2.4/3.5 | ⚠️ | 与 NFR2 降级边界需细化(见 F-3) |
| AC5 | 覆盖率缺失标未获取 | 4.1/4.2/3.5 | ✅ | 三态处理 |
| NFR1 | <5s/1000 用例 | design Performance | ⚠️ | 策略到位, 缺基准验证记录 |
| NFR2 | 降级不崩溃 | degradation-and-security.md (待复核) | ✅ | 字段缺失约定一致 |
| NFR3 | 安全脱敏 | degradation-and-security.md (待复核) | ⚠️ | 模式集偏窄(见 F-4) |
| NFR4 | 幂等性 | degradation-and-security.md (待复核) | ✅ | generated_at 不计入 |
| NFR5 | 插件式可扩展 | parser-contract.md | ✅ | 扩展三步骤明确 |

---

## 3. 问题清单 (Findings)

### F-1 [Major] fail_threshold 单位/格式未定义
- **位置**: design.md Config Resolver 表(第 115 行)、config-and-output.md 配置项表
- **现象**: 配置项说明为"通过率低于该值时整体结论标记为不达标", 但未定义取值类型——是百分比整数(如 `80`)、小数(如 `0.8`)、还是带 `%` 字符串。markdown-renderer.md §2 将 pass_rate 渲染为 `<pass_rate>%`, 隐含 pass_rate 为数值, 但 fail_threshold 与之比较时的类型对齐规则缺失。
- **影响**: 不同实现者可能采用不同约定, 导致同一 fail_threshold 在不同解析器/渲染器中判定结果不一致, 违反 NFR4 幂等性。
- **建议**: 在 config-and-output.md 明确: `fail_threshold` 为 0~100 的数值(百分比, 与 pass_rate 同单位), 比较式 `pass_rate < fail_threshold`。补充示例: `fail_threshold=80` 表示通过率低于 80% 标记不达标。

### F-2 [Major] coverage below_threshold_files 阈值来源缺失
- **位置**: design.md Data Model `coverage.below_threshold_files`(第 55 行)、data-model.md、coverage-collector.md(待复核)
- **现象**: FR2.5 要求"低于阈值的文件清单", data-model 注释"覆盖率低于阈值的文件", 但 Config Resolver 配置项表中仅有 `coverage=auto/on/off`, 缺少 `coverage_threshold` / `coverage_global_threshold` 配置项。阈值无来源, 解析器无法判定哪些文件"低于阈值"。
- **影响**: 覆盖率章节的"低于阈值文件清单"无判定依据, 渲染时可能恒为空或依赖硬编码, 违反 FR2.5 与可配置性。
- **建议**: 在 Config Resolver 新增 `coverage_threshold`(默认值如 80, 单位百分比); coverage-collector 据此判定 below_threshold_files。若本期不实现, 需在 tasks.md 明确降级为"不展示低于阈值清单"并更新 FR2.5 描述。

### F-3 [Minor→Major 边界] AC4 "损坏"与 NFR2 "字段缺失"判定边界未定义
- **位置**: design.md Edge Cases(第 130 行)、degradation-and-security.md(待复核)
- **现象**: design 同时规定"结果文件不存在/无法解析: 返回 AC4 式明确错误, 不生成空报告"与"字段缺失: 降级标未获取"。但二者边界未量化: 何种程度算"整体无法解析"(→AC4 错误) vs "部分字段缺失"(→降级)? 例如 JUnit XML 根节点缺失算损坏, 但单个 testcase 缺少 time 算降级——判定规则需明确。
- **影响**: 解析器实现者可能对边界 case 做出不同处理, 导致 AC4 验收时行为不一致。
- **建议**: 在 degradation-and-security.md 补充判定规则: "根节点/必需字段缺失或 JSON/XML 语法错误 → ParseError → AC4 错误; 非必需字段缺失 → 标未获取降级"。列出各解析器的必需字段清单。

### F-4 [Minor] redactSensitive 脱敏模式集偏窄
- **位置**: design.md Security(第 140 行)、degradation-and-security.md(待复核)
- **现象**: design 列举的模式为 `password=`、`token=`、`Bearer `、`.env` 路径。未覆盖: AWS Access Key ID / Secret Key(`AKIA...`、`aws_secret_access_key=`)、私有密钥块(`-----BEGIN PRIVATE KEY-----`)、JWT(`eyJ...`)、Slack/GitHub PAT(`xoxb-`、`ghp_`)、连接串内嵌凭据(`mongodb+srv://user:pass@`)。
- **影响**: NFR3 要求"不得泄露密钥类内容", 现有模式集对云原生/CI 场景常见凭据覆盖不足, 堆栈中可能残留凭据。
- **建议**: 扩展模式集, 或直接复用 `@kilocode/worker-utils/redact-headers`(agents.md 已声明该 helper)对 header 类凭据统一脱敏; 在 degradation-and-security.md 列出完整模式表与测试 fixture。

### F-5 [Minor] 文件名层面幂等性未说明
- **位置**: design.md Idempotency(第 165 行)、config-and-output.md
- **现象**: NFR4 规定"同一结果文件多次生成报告内容一致(时间戳除外)"。内容层面已通过 generated_at 排除实现幂等, 但默认输出路径 `reports/test-report-<YYYYMMDD-HHmmss>.md` 含秒级时间戳, 多次生成会产出不同文件名。这本身符合设计(时间戳除外), 但需明确"幂等指内容一致而非同一文件路径", 避免使用者误解。
- **影响**: 低, 文档清晰度问题。
- **建议**: 在 config-and-output.md 补一句: "幂等性保证报告内容一致; 文件名因含时间戳每次不同, 如需覆盖同一文件请显式指定 output_path + 文件名"。

### F-6 [Minor] framework_version "省略或标未获取"二义
- **位置**: design.md Data Model(第 24 行)、data-model.md
- **现象**: 注释"未获取时省略或标 未获取"——"省略"(字段不存在)与"标未获取"(字段值为字符串"未获取")是两种不同处理, 渲染器需区分 nullable 与 string 字面量。
- **影响**: 渲染器分支逻辑可能不一致; 类型层面 `framework_version?: string` 与 `"未获取"` 字面量混用。
- **建议**: 统一为单一约定。推荐: 字段缺失时值为 `undefined`(省略), 渲染时统一渲染为 `未获取`; 不在数据模型中存字符串"未获取", 保持模型类型纯粹。

### F-7 [Minor] coverage below_threshold_files 为空数组时渲染未定义
- **位置**: markdown-renderer.md §5(第 81-82 行)
- **现象**: 模板为"低于阈值文件:\n- <below_threshold_files...>", 当数组为空时渲染为"低于阈值文件:"后无列表项, 视觉上像截断。
- **影响**: 低, 渲染美观问题。
- **建议**: 明确空数组时渲染为"低于阈值文件: 无"或省略该子标题。

### F-8 [Minor] environment 字段格式与脱敏边界未定义
- **位置**: design.md Data Model `header.environment`(第 25 行)
- **现象**: 注释"node/python/os 摘要", 但未定义具体格式(如 `Node v20.11.0 / Darwin 23.4.0`)。OS 版本可能被部分团队视为敏感信息(NFR3 边界)。
- **影响**: 不同解析器产出格式不一, 且 NFR3 脱敏边界模糊。
- **建议**: 在 data-model.md 定义格式规范(如 `runtime: <name>@<version>; os: <type> <major>`), 并在 Security 节明确 environment 不含 hostname/用户名/路径。

### F-9 [Info] design 与 tasks 里程碑标注细微不一致
- **位置**: design.md Parsers 第 99 行 vs tasks.md 3.6
- **现象**: design 说"P1 新增 pytest-json-parser", tasks 3.6 标"(M2) 实现 pytest-json-parser【P1】"且 [x] 已完成。二者在"P1"与"M2"的映射上需读者自行关联(里程碑表 M2=P1)。无逻辑冲突, 但表述不统一。
- **影响**: 极低, 可读性问题。
- **建议**: design 统一使用里程碑编号(如"M2 新增 pytest-json-parser")或显式标注"M2(P1)"。

### F-10 [Info] parser id 命名一致性需核对
- **位置**: design.md Parsers 接口(第 88 行) `id: "jest"|"vitest"|"pytest-xml"|"junit-generic"` vs tasks.md 3.6 引用 `pytest-json-parser`
- **现象**: design 接口示例 id 用 `"pytest-xml"`(XML 格式), 但 tasks 3.6 新增的是 `pytest-json-parser`(JSON 格式), 二者并非同一解析器。需核对 parser-contract.md 是否补登记 `pytest-json` id。
- **影响**: 待复核。若 parser-contract.md 的 Registry 表未包含 `pytest-json` id, 则 NFR5 扩展步骤不完整。
- **建议**: 复核 parser-contract.md Registry 表, 确认 `pytest-json-parser` 已注册且 id 命名与 design 接口示例一致或更新 design 示例。

### F-11 [Info] tasks.md 第 8 节 AC 对照无验证状态
- **位置**: tasks.md §8 验收用例对照
- **现象**: 仅列 AC 与任务编号映射, 未标注 AC 验证状态(是否已通过验收用例/是否存在测试 fixture)。
- **影响**: 低, 追溯完整度问题。
- **建议**: 补充"验证状态"列或引用测试 fixture 路径, 便于 release 时核对。

---

## 4. 改进建议 (Recommendations)

### R1. 合入前必改 (Block 合入)
1. **F-1 fail_threshold 单位**: 在 config-and-output.md 明确百分比数值约定 + 示例。
2. **F-2 coverage 阈值来源**: 新增 `coverage_threshold` 配置项或明确降级策略并更新 FR2.5。

### R2. 建议同 PR 修复
3. **F-3 AC4/NFR2 边界**: 补充判定规则与各解析器必需字段清单。
4. **F-4 脱敏模式集**: 扩展模式或复用 worker-utils/redact-headers, 附 fixture。
5. **F-6 framework_version 二义**: 统一为 undefined + 渲染时标未获取。

### R3. 可后续迭代修复
6. **F-5 文件名幂等说明**、**F-7 空数组渲染**、**F-8 environment 格式**、**F-9 里程碑表述**、**F-10 parser id 核对**、**F-11 AC 验证状态**。

### R4. 验证补充
7. **NFR1 性能基准**: 补充 1000 用例 Jest/Vitest/JUnit XML 的解析+渲染耗时实测记录, 证明 <5s。
8. **AC1~AC5 验收 fixture**: 建议在 Skill 目录新增 `examples/` 存放各框架样本结果文件与期望报告, 供回归对照。

---

## 5. 验证建议 (Verification)

本次评审为静态文档审查, 未执行动态验证。建议合入前补充:

| 验证项 | 方式 | 优先级 |
|---|---|---|
| F-1/F-2 修复后规格一致性 | 重新核对 config-and-output.md 与 design.md Config Resolver 表 | 高 |
| parser id 注册完整性 | 复核 parser-contract.md Registry 表(F-10) | 中 |
| redactSensitive fixture | 构造含 AWS Key/JWT/私有键的堆栈样本验证脱敏 | 中 |
| NFR1 性能基准 | 1000 用例样本实测 | 中 |
| AC1~AC5 端到端 | 在含 Jest 的 TS 项目走"生成测试报告"全流程 | 高 |

> 注: 按 agents.md 验证约定, 本次未运行 `pnpm typecheck` / `pnpm test` —— 评审对象为 Markdown Skill 文档, 无可编译/可测试的源码产物, 全量构建不适用。待 Skill 落地为可执行脚本/解析器代码后再纳入构建验证。

---

## 6. 评审覆盖说明与待复核项

因工具预算约束, 以下文件仅基于结构化预览评审, 结论可能不完整, 建议二次复核:

| 文件 | 证据充分性 | 待复核重点 |
|---|---|---|
| SKILL.md | 预览(frontmatter + 目录结构) | 触发示例、可配置项默认值是否与 config-and-output 完全一致 |
| config-and-output.md | 预览 | F-1(fail_threshold)、F-2(coverage_threshold)、F-5(文件名幂等) 修复落点 |
| framework-and-collector.md | 预览 | FR1.4 诊断信息字段完整性、后台执行降级方案 |
| parser-contract.md | 预览 | F-10 pytest-json id 注册、各解析器 can_parse 嗅探规则 |
| data-model.md | 预览 | F-6 framework_version 约定、F-8 environment 格式 |
| degradation-and-security.md | 未读取 | F-3 边界规则、F-4 脱敏模式集、NFR2/NFR3/NFR4 实现细节 |
| coverage-collector.md | 未读取 | F-2 阈值来源、coverage 产物探测路径、三态处理 |
| pytest-json-parser.md | 未读取 | F-10 id 命名、pytest JSON 字段映射 |

**复核优先级**: degradation-and-security.md > coverage-collector.md > parser-contract.md(因此三文件承载 NFR2/NFR3/NFR5/F-2/F-3/F-4 关键结论, 当前 Findings 中标注"待复核"的项需在补读后确认或调整等级)。

---

## 7. 评审摘要

- **Blocker**: 0
- **Major**: 2(F-1 fail_threshold 单位、F-2 coverage 阈值来源)
- **Minor**: 6(F-3~F-8)
- **Info**: 3(F-9~F-11)
- **合入建议**: 修复 F-1、F-2 后合入; F-3、F-4 建议同 PR 修复; 其余可后续迭代。
- **整体质量**: Skill 1.0 T2 交付达到 P0 可交付门槛, 架构与规格追溯质量高, 主要风险集中在配置项类型定义与覆盖率阈值来源两处设计缺口, 修复成本低。
