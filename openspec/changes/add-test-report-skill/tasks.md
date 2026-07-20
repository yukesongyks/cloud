# Tasks: 测试报告生成器 Skill

任务按里程碑（M1/M2/M3）与功能需求（FR1~FR4）组织。每条任务标注优先级与关联的验收标准（AC）。

## 1. 脚手架与配置

- [ ] 1.1 初始化 Skill 目录结构与 SKILL.md（意图、触发示例、可配置项默认值、依赖声明）【P0】
- [ ] 1.2 实现 Config Resolver：合并默认值与用户覆盖（test_command / result_file / output_format / output_path / coverage / fail_threshold）【P0】(FR4.2)
- [ ] 1.3 定义输出路径与命名规则：默认 `reports/test-report-<YYYYMMDD-HHmmss>.md`，允许用户指定【P0】(FR3.2)

## 2. 框架检测与结果收集

- [ ] 2.1 实现 Framework Detector：按优先级 a 用户指定 > b 项目配置(package.json/pyproject.toml/Cargo.toml) > c 特征文件(jest.config/vitest.config/pytest.ini)【P0】(FR1.1)
- [ ] 2.2 实现执行模式：用检测到的 run_command 执行测试并收集 reporter 产物；长任务后台执行+轮询【P0】(FR1.3, R2)
- [ ] 2.3 实现解析模式：跳过执行，直接读取用户指定的 result_file【P0】(FR1.3, US4)
- [ ] 2.4 实现执行失败诊断：命令无法运行时返回明确诊断（退出码/stderr 摘要/可能原因），禁止生成空报告冒充成功【P0】(FR1.4, AC4)

## 3. 解析器（插件式）

- [ ] 3.1 定义 Parser 插件接口（`can_parse` + `parse → TestReportData`）与 Parser Registry【P0】(NFR5)
- [ ] 3.2 实现 jest-json-parser：消费 Jest `json` reporter 输出【P0】(FR1.2)
- [ ] 3.3 实现 vitest-json-parser：消费 Vitest `json` reporter 输出【P0】(FR1.2)
- [ ] 3.4 实现 junit-xml-parser：通用 JUnit XML，兼作 pytest / 跨语言兜底【P0】(FR1.2)
- [ ] 3.5 实现降级策略：字段缺失标"未获取"，解析异常抛 ParseError 由上层降级【P0】(NFR2, AC5)
- [ ] 3.6 (M2) 实现 pytest-json-parser【P1】(M2)

## 4. 覆盖率收集

- [ ] 4.1 (M2) 实现 Coverage Collector：解析 coverage 产物，填充 coverage 字段【P1】(FR2.5)
- [ ] 4.2 (M2) coverage=auto/on/off 三态处理；auto 检测不到时标"未获取"【P1】(AC5)

## 5. 报告渲染

- [ ] 5.1 定义统一内部模型 `TestReportData` 与字段缺失约定【P0】(design.md Data Model)
- [ ] 5.2 实现 markdown-renderer：固定六章节顺序渲染（报告头/摘要/失败分析/明细/覆盖率/附录）【P0】(FR2, AC1)
- [ ] 5.3 失败用例章节：用例名、文件路径、错误信息、堆栈关键行截断（≤8行/≤1200字符）【P0】(FR2.3, AC2)
- [ ] 5.4 用例明细按文件分组 + 超 200 条截断注明【P0】(FR2.4)
- [ ] 5.5 摘要整体结论用 ✅/❌，结合 fail_threshold 判定达标【P0】(FR2.2)
- [ ] 5.6 (M3) 实现 html-renderer【P1】(FR3.1, M3)
- [ ] 5.7 (M3) 实现 json-renderer：直接序列化 TestReportData 为伴随产物【P1】(FR3.1, M3)

## 6. 安全与幂等

- [ ] 6.1 实现 redactSensitive：过滤堆栈/日志中的凭据、token、auth header、webhook secret、env 路径【P0】(NFR3)
- [ ] 6.2 幂等性：解析+渲染为纯函数，generated_at 不计入一致性比较【P0】(NFR4)

## 7. 交互与返回

- [ ] 7.1 触发意图与触发示例（"生成测试报告"/"跑一下测试并出报告"/"把这个 junit.xml 转成测试报告"）【P0】(FR4.1)
- [ ] 7.2 生成后返回：报告路径 + 摘要（通过率、失败数），失败时附最关键 1~3 条失败原因【P0】(FR3.3)

## 8. 验收用例对照

- AC1 Jest/Vitest TS 项目执行"生成测试报告" → 六章节 Markdown + 摘要与原始输出一致 → 1.1/5.2/3.2/3.3
- AC2 失败用例章节含用例名/文件/错误信息 → 5.3/3.x
- AC3 提供 JUnit XML 走解析模式不执行 → 2.3/3.4
- AC4 结果文件损坏返回明确错误 → 2.4/3.5
- AC5 覆盖率存在则呈现，缺失标"未获取"且其余正常 → 4.1/4.2/3.5

## 9. 后续迭代（非本期）

- [ ] 9.1 (M4) 历史趋势对比分析
- [ ] 9.2 (M4) Go test / cargo test 等更多框架解析器
- [ ] 9.3 报告推送 IM/邮件渠道（Q3，当前非目标）
- [ ] 9.4 英文模板（Q2，当前仅中文）
