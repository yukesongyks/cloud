# Code Review Checklist

> **Change** helloworld · **分支/Commit** AI/task-DEV-f4ad1a6e-7360-11f1-8c66-df5563d236aa-5a9af4e2-4893-41c1-95a9-04fc95963ac5 · **日期** 2026-04-29
>
> **AI**：唯一进度源；状态仅用 `⬜` `✅` `❌` `⚠️` `N/A`。

---

## Step 1 — 执行队列（产物 A）

| # | 文件（仓库相对路径） | 归属原因 | Step2 | Step3 | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 | G9 | G10 | G11 | G12 | G13 | G14 | G15 | G16 | G17 | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | 总状态 |
|---|----------------------|----------|-------|-------|----|----|----|----|----|----|----|----|----|-----|----|----|----|----|----|----|----|----|----|-----|-----|-----|-----|-----|-----|-----|-----|--------|
| 1 | `java-quick-sort/src/main/java/com/dtazziboot/hello/HelloWorldService.java` | REQ-1~5 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ |
| 2 | `java-quick-sort/src/test/java/com/dtazziboot/hello/HelloWorldServiceTest.java` | REQ-6~8 | ✅ | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ✅ |

---

## Step 2 — 功能（产物 B）

| REQ | Scenario | Spec证据（原文/章节） | 关联文件 | 状态 | 代码证据（文件/测试/接口） |
|-----|----------|----------------------|----------|------|----------------------------|
| REQ-1 | greet() 返回默认问候语 "Hello, World!" | `docs/modules/helloworld/README.md:22` — `greet() 返回默认问候语 "Hello, World!"` | HelloWorldService.java, HelloWorldServiceTest.java | ✅ | `HelloWorldService.java:28-30` delegate to greet(DEFAULT_NAME); `HelloWorldServiceTest.java:30-35` assert |
| REQ-2 | greet(String name) 按指定名称返回问候语 | `docs/modules/helloworld/README.md:23` — `按指定名称返回问候语` | HelloWorldService.java, HelloWorldServiceTest.java | ✅ | `HelloWorldService.java:39-44`; `HelloWorldServiceTest.java:44-49` (英文), `:53-58` (中文) |
| REQ-3 | name 为 null 时抛出 NullPointerException | `docs/modules/helloworld/README.md:23` — `name 不可为 null` | HelloWorldService.java, HelloWorldServiceTest.java | ✅ | `HelloWorldService.java:40-42` null check; `HelloWorldServiceTest.java:76-78` assertThrows |
| REQ-4 | 常量提取：DEFAULT_NAME="World" | `.agents/helloworld-impl.md:25` — `常量提取：DEFAULT_NAME` | HelloWorldService.java | ✅ | `HelloWorldService.java:15` |
| REQ-5 | 常量提取：GREETING_PREFIX / GREETING_SUFFIX | `.agents/helloworld-impl.md:25-26` — `GREETING_PREFIX、GREETING_SUFFIX` | HelloWorldService.java | ✅ | `HelloWorldService.java:18,21` |
| REQ-6 | 5 个测试方法：正常路径、边界值（空字符串）、异常处理（null） | `.agents/helloworld-impl.md:20-21` — `5 个测试方法，覆盖：正常路径、边界值（空字符串）、异常处理（null）` | HelloWorldServiceTest.java | ✅ | 5 tests: L30, L44, L53, L62, L76 |
| REQ-7 | JUnit 5 @Nested + @DisplayName 分组 | `.agents/helloworld-impl.md:21` — `使用 JUnit 5 @Nested + @DisplayName 分组` | HelloWorldServiceTest.java | ✅ | 3 @Nested classes: L24-35, L38-67, L70-78 |
| REQ-8 | AAA 模式（Arrange-Act-Assert） | `docs/ARCHITECTURE.md:25` — `测试类遵循 FIRST 原则，使用 AAA 模式` | HelloWorldServiceTest.java | ✅ | 每个测试方法内 Arrange-Act-Assert 结构清晰 |
| REQ-9 | 无外部模块依赖 | `docs/modules/helloworld/README.md:15-16` — `无外部模块依赖` | HelloWorldService.java | ✅ | 无 import 语句，纯 JDK |
| REQ-10 | JDK 21 + JUnit 5.10.2 | `docs/ARCHITECTURE.md:16-18` — `JDK 21 LTS, JUnit Jupiter 5.10.2` | HelloWorldServiceTest.java | ✅ | import org.junit.jupiter.api.* |

---

## Step 3 — 可读性检查（产物 C）

| ID | 检查项 | 状态 | 备注（命中写 `path:line`） |
|----|--------|------|----------------------------|
| A1 | 源文件格式 | ✅ | 文件名与类名一致，UTF-8，无 Tab |
| A2 | 源文件结构/import 顺序 | ✅ | package→import→class；无通配符；静态/非静态分组正确（Test.java L3-9） |
| A3 | 代码样式 | ✅ | K&R 大括号、4空格缩进、行宽≤120、成员间空行、运算符空格 |
| A4 | 命名规范 | ✅ | 包名全小写、类名 UpperCamelCase、方法 lowerCamelCase、常量 UPPER_SNAKE_CASE、测试类名 HelloWorldServiceTest |
| A5 | 编码实践 | ✅ | 无覆盖方法（无需 @Override）、无 catch 块、无静态方法误用、无 finalize() |
| A6 | 特定元素样式 | ✅ | 修饰符顺序 `private static final` 正确 |
| A7 | Javadoc 规范 | ✅ | public 类与方法均有 Javadoc；@param→@return→@throws 顺序正确 |

---

## Step 4 — 可靠性检查（产物 D）

### 4.1 Bug 模式（`bug-pattern-checklist.md`）

> 预扫结果：`scan-all-rules.sh` 无命中。LLM 逐条核销。

| ID | 状态 | 备注 |
|----|------|------|
| B001 | N/A | 无 LocalDateTime.parse/UUID.fromString 等调用 |
| B002 | N/A | 无数组比较 |
| B003 | N/A | 无 Arrays.fill |
| B004 | N/A | 无数组 toString |
| B005 | N/A | 无 Arrays.asList |
| B006 | ✅ | assertEquals(expected, actual) 参数顺序正确；Test.java L34,L48,L57,L66 |
| B007 | N/A | 无 catch Throwable |
| B008 | N/A | 无线程池 |
| B009 | N/A | 无移位操作 |
| B010 | N/A | 无 BigDecimal |
| B011 | N/A | 无包装类型 == 比较 |
| B012 | N/A | 无 Calendar |
| B013 | N/A | 无 Calendar |
| B014 | N/A | 无集合泛型不匹配 |
| B015 | N/A | 无 Collection.toArray |
| B016 | N/A | 无 Comparable |
| B017 | N/A | 无 this==null |
| B018 | N/A | 无三目运算符类型提升 |
| B019 | N/A | 无 Money 类 |
| B020 | N/A | 无编译期常量乘法 |
| B021 | N/A | 无 Jedis |
| B022 | N/A | 无 SimpleDateFormat |
| B023 | N/A | 无 DeadException |
| B024 | N/A | 无 DeadThread |
| B025 | N/A | 无双括号初始化 |
| B026 | N/A | 无 equals(null) |
| B027 | N/A | 无自定义 equals |
| B028 | N/A | 无 DateUtil |
| B029 | N/A | 无 setter |
| B030 | N/A | 无浮点比较 |
| B031 | N/A | 无 String.format |
| B032 | N/A | 无注解 getClass |
| B033 | N/A | 无 Unsafe |
| B034 | N/A | 无 Hashtable |
| B035 | N/A | 无 IdentityBinaryExpression |
| B036 | N/A | 无 IdentityHashMap |
| B037 | N/A | 无 InexactVarargsConditional |
| B038 | N/A | 无递归 |
| B039 | N/A | 无 IndexOfChar |
| B040 | N/A | 无 Class.isInstance |
| B041 | N/A | 无 JDBC |
| B042 | N/A | 非 JUnit3 |
| B043 | N/A | 非 JUnit4 |
| B044 | N/A | 非 JUnit3+4 混用 |
| B045 | N/A | 无包装类型加锁 |
| B046 | N/A | 无循环条件未更新 |
| B047 | N/A | 无 LossyPrimitiveCompare |
| B048 | N/A | 无 Math.round(整型) |
| B049 | N/A | 无日期格式 |
| B050 | N/A | 无日期格式 |
| B051 | N/A | 无 Boolean.getBoolean |
| B052 | N/A | 无日期格式 |
| B053 | N/A | 无 try-catch 期望异常（已用 assertThrows） |
| B054 | N/A | 无 EqualsTester |
| B055 | N/A | 无 Mockito |
| B056 | N/A | 无 Arrays.asList |
| B057 | N/A | 无增强 for 循环修改集合 |
| B058 | N/A | 无集合自引用 |
| B059 | N/A | 无 Collections.nCopies |
| B060 | N/A | 无 NullTernary |
| B061 | N/A | 无 BASE64 |
| B062 | N/A | 无 URLClassLoader |
| B063 | N/A | 无 javax.xml |
| B064 | N/A | 无 Optional |
| B065 | N/A | 无 PojoSelfAssignment |
| B066 | N/A | 无 Math.random |
| B067 | N/A | 无 Random.nextInt |
| B068 | N/A | 无 SelfAssignment |
| B069 | N/A | 无 compareTo |
| B070 | N/A | 无 equals |
| B071 | N/A | 无 size()>=0 |
| B072 | N/A | 无 Stream.toString |
| B073 | N/A | 无 StringBuilder(char) |
| B074 | N/A | 无 substring(0) |
| B075 | N/A | 无 for 循环 |
| B076 | N/A | 无 @Transactional |
| B077 | N/A | 无 try-fail-Throwable |
| B078 | N/A | 无 Truth |
| B079 | N/A | 无 @Mock |
| B080 | ✅ | 所有测试方法均含断言（assertEquals/assertNotNull/assertThrows） |
| B081 | N/A | 无 UnusedCollectionModifiedInPlace |
| M001 | N/A | 无连续相同条件判断 |
| M002 | N/A | 无 instanceof |
| M003 | N/A | 无包装类构造器 |
| M004 | N/A | 无 printStackTrace |
| M005 | N/A | 无内部类 |
| M006 | N/A | 无编译期常量布尔表达式 |
| M007 | N/A | 无 catch 块 |
| M008 | N/A | 无自定义 equals |
| M009 | N/A | 无 equals 不兼容类型 |
| M010 | N/A | 无位运算 |
| M011 | N/A | 无 switch |
| M012 | N/A | 无 finally |
| M013 | N/A | 无类型转换 |
| M014 | N/A | 无枚举 |
| M015 | N/A | 无继承 |
| M016 | N/A | 无时间 API |
| M017 | N/A | 非 JUnit4 |
| M018 | N/A | 无锁 |
| M019 | N/A | 无枚举 switch |
| M020 | N/A | 无重写方法 |
| M021 | N/A | 无自定义 equals |
| M022 | N/A | 无 Optional |
| M023 | N/A | 无 Object.toString |
| M024 | N/A | 无 Optional |
| M025 | N/A | 非 final 类 |
| M026 | N/A | 无 @Mock |
| M027 | N/A | 无 ThreadLocal |
| I001 | ⚠️ | `HelloWorldServiceTest.java:77` — `assertThrows(NullPointerException.class, ...)` 仅断言异常类型，未验证异常消息。建议增加 `assertThat(thrown).hasMessage("name must not be null")` 以增强断言精度。P2 |
| I002 | N/A | 无 @DoNotMock |
| I003 | N/A | 无 @AutoValue |
| I004 | N/A | 无 java.util.Date |
| I005 | N/A | 非 JUnit3 |
| I006 | N/A | 非 JUnit4 setUp |
| I007 | N/A | 非 JUnit4 tearDown |
| I008 | N/A | 无 dataProvider |
| I009 | N/A | 统计用 |
| I010 | N/A | 无需 Spring 容器 |

### 4.2 可靠性（`reliability-checklist.md`）

| ID | 状态 | 备注 |
|----|------|------|
| G1.1 | N/A | 无事务/并发场景 |
| G1.2 | N/A | 无锁操作 |
| G1.3 | N/A | 无乐观锁 |
| G1.4 | N/A | 无多资源加锁 |
| G2.1 | N/A | 无写接口 |
| G2.2 | N/A | 无重试/定时任务 |
| G2.3 | N/A | 无幂等键 |
| G3.1 | N/A | 无分布式事务 |
| G3.2 | N/A | 无 @Transactional |
| G4.1 | N/A | 无 SQL |
| G4.2 | N/A | 无 SQL |
| G4.3 | N/A | 无 SQL |
| G5.1 | N/A | 无 MQ |
| G6.1 | N/A | 无缓存 |
| G6.2 | N/A | 无缓存 |
| G7.1 | N/A | 无调度任务 |
| G7.2 | N/A | 无调度任务 |
| G8.1 | N/A | 无 catch 块 |
| G8.2 | N/A | 无外部依赖 |
| G8.3 | N/A | 无 I/O 资源 |
| G8.4 | N/A | 无线程池 |
| G8.5 | N/A | 无 ThreadLocal |
| G8.6 | N/A | 无 Executors |
| G9.1 | N/A | 无外部调用 |
| G9.2 | N/A | 无外部调用 |
| G9.3 | N/A | 无重试 |
| G10.1 | N/A | 无 null 双语义 |
| G10.2 | N/A | 无契约变更 |
| G11.1 | ✅ | 有单测且含断言 |
| G11.2 | ✅ | 覆盖边界：空字符串(L62)、中文(L53)、null(L76) |
| G11.3 | ✅ | `HelloWorldService.java:40-42` 对 null 入参有防御性校验 |
| G11.4 | N/A | 无数值运算 |
| G12.1 | N/A | 无资金场景 |
| G12.2 | N/A | 无资金场景 |
| G13.1 | N/A | 无日志 |
| G14.1 | N/A | 无金额 |
| G14.2 | N/A | 无多租户 |
| G14.3 | N/A | 无时区 |
| G14.4 | N/A | 无日期格式化 |
| G15.1 | N/A | 无 DB 变更 |
| G15.2 | N/A | 无接口 |
| G15.3 | N/A | 无开关 |
| G16.1 | N/A | 纯内存服务，无核心链路 |
| G16.2 | N/A | 无异常路径 |
| G16.3 | N/A | 无日志 |
| G16.4 | N/A | 无 catch 块 |
| G17.1 | N/A | 无功能开关 |
| G17.2 | N/A | 无降级场景 |
| G17.3 | N/A | 无数据变更 |

### 4.3 安全（`security-checklist.md`）

| ID | 状态 | 备注 |
|----|------|------|
| S1.1 | N/A | 无 SQL |
| S1.2 | N/A | 无 SQL |
| S1.3 | N/A | 无 SQL |
| S2.1 | N/A | 无 Web 输出 |
| S2.2 | N/A | 无富文本 |
| S2.3 | N/A | 无模板引擎 |
| S3.1 | N/A | 无外部 URL 请求 |
| S3.2 | N/A | 无重定向 |
| S3.3 | N/A | 无外部请求 |
| S4.1 | N/A | 无命令执行 |
| S4.2 | N/A | 无文件操作 |
| S5.1 | N/A | 无 XML |
| S5.2 | N/A | 无 XPath |
| S6.1 | N/A | 无反序列化 |
| S6.2 | N/A | 无 JSON 反序列化 |
| S6.3 | N/A | 无 transient |
| S7.1 | N/A | 无文件上传 |
| S7.2 | N/A | 无文件路径 |
| S7.3 | N/A | 无文件存储 |
| S8.1 | N/A | 无 Web 接口 |
| S8.2 | N/A | 无 HTTP |
| S8.3 | N/A | 无数据 ID |
| S8.4 | N/A | 无 Cookie |
| S9.1 | N/A | 无密钥/凭证 |
| S9.2 | N/A | 无日志 |
| S9.3 | N/A | 无传输 |
| S9.4 | N/A | 无随机数 |
| S10.1 | N/A | 无 CSRF |
| S10.2 | N/A | 无 CORS |
| S10.3 | N/A | 无 URL 跳转 |

---

## Step 5 — 自定义扩展检查（产物 E）

### 5.1 自定义扩展（`customized-checklist.md`）

| ID | 状态 | 备注 |
|----|------|------|
| U1.1 | N/A | 示例项，非 Controller，无需 @Valid |

---

## 终检（防漏检）

- [x] 执行队列中每个文件 `Step2`、`Step3`、**S1–S10 / G1–G17** 各列均非 `⬜`（跳过文件除外）；
- [x] Step 2 的每个 REQ/Scenario 均非 `⬜`
- [x] Step 3 的 A1–A7 均非 `⬜`
- [x] Step 4 全部 **G/S** 与 **B001–B081 / M001–M027 / I001–I010** ID 均非 `⬜`（允许 `N/A`，但有原因）
- [x] Step 5 全部 U* ID 均非 `⬜`（允许 `N/A(未启用自定义规则)`）
- [x] 所有 `❌/⚠️` 已写入 report，且包含 `ID + path:line`