# Code Review Report — java-quick-sort

> **评审技能**：`dtazziboot-java-code-review`（SDD 范式结构化审查）
> **评审对象**：快速排序算法实现
> **需求**：实现一个快速排序算法
> **评审日期**：2026-08-06
> **评审阶段**：review（只读，不修改源码）

---

## 0. 预检结果

| 预检项 | 结果 |
|---|---|
| Git 状态（只读） | 分支 `AI/ta***`，working tree 干净，无未提交 diff |
| `scan-all-rules.sh` 自动化预扫 | `No findings. 52/222 rules scanned`（52 条适用 ripgrep 规则 B/M/I+A/S/G 全部通过） |
| 变更范围 | 3 文件：`pom.xml` / `QuickSort.java` / `QuickSortTest.java` |
| 阶段门控 | review 阶段 → 只读分析 + 报告产出，不修改源码 ✓ |

---

## 1. 执行队列（Step1）

| 序号 | 文件 | 行数 | 评审重点 |
|---|---|---|---|
| F1 | `src/main/java/com/dtazziboot/algo/QuickSort.java` | 264 | 算法正确性、边界、尾递归、泛型/原生类型双实现 |
| F2 | `src/test/java/com/dtazziboot/algo/QuickSortTest.java` | 253 | 测试覆盖、FIRST 原则、交叉验证 |
| F3 | `pom.xml` | 44 | 构建配置、依赖、编码 |

---

## 2. 逐文件评审

### F1. QuickSort.java（264 行）

#### Step2 — 功能核对

**实现概览**：基于 Lomuto 分区的快速排序，泛型 `T[]`（Comparable / Comparator）与原生 `int[]` 双实现。采用三数取中法选 pivot + 小数组切换插入排序（阈值 16）+ 尾递归优化（较小侧递归、较大侧迭代）。

| 功能点 | 验证结论 | 证据（行号） |
|---|---|---|
| `sort(T[])` 自然序 | ✓ 正确，委托 `sort(T[], Comparator.naturalOrder())` | L34-39 |
| `sort(T[], Comparator)` | ✓ 正确，先校验 comparator 非空再处理数组 | L49-57 |
| `sort(int[])` 原生版 | ✓ 正确，独立实现避免装箱 | L64-69 |
| `sorted(T[])` 返回新数组 | ✓ 正确，`Arrays.copyOf` 保留运行时组件类型，不修改原数组 | L78-85 |
| null / 空数组 / 单元素 | ✓ 全部安全短路返回 | L35, L53, L65 |
| Lomuto partition | ✓ 正确，`i` 从 low-1 起，`<=` pivot 左移，最终 swap(i+1, high) | L124-136, L216-228 |
| medianOfThree 三数取中 | ✓ **正确**（详见推导） | L147-160, L230-242 |
| 尾递归优化（较小侧递归） | ✓ 正确，栈深 O(log n) | L103-110, L206-212 |
| 插入排序阈值切换 | ✓ 正确，`high-low+1 <= 16` 时走插入排序 | L98-101, L201-204 |
| 工具类防实例化 | ✓ `private` 构造器抛 `AssertionError`（Effective Java 惯用法） | L23-26 |

**medianOfThree 正确性推导**（关键审查点）：

前三步条件交换构成排序网络，对 `array[low]`、`array[mid]`、`array[high]` 排序：
1. L149: `if low > mid → swap(low,mid)` → 保证 `array[low] <= array[mid]`
2. L152: `if low > high → swap(low,high)` → 保证 `array[low]` 为三者最小
3. L155: `if mid > high → swap(mid,high)` → 保证 `array[mid] <= array[high]`

三步后 `array[low] <= array[mid] <= array[high]`，中位数 = `array[mid]`。
4. L159: `swap(mid, high)` → 将中位数置于 `high` 作为 pivot。

**结论**：pivot 选取为三数中位数，符合"三数取中法"定义，正确避免了已排序/逆序输入退化为 O(n²)。✓

**边界穷举验证**（partition 返回值与尾递归）：
- `pivotIndex == low`（pivot 最小）：左子区间 `[low, low-1]` 空，走 if 分支后 `low = pivotIndex+1`，无死循环 ✓
- `pivotIndex == high`（pivot 最大）：右子区间 `[high+1, high]` 空，走 else 分支后 `high = pivotIndex-1`，无死循环 ✓
- `low < high` 守卫确保 partition 不在空/单元素区间调用 ✓

#### Step3 — 可读性

| 维度 | 评价 | 证据 |
|---|---|---|
| Javadoc 完整性 | ✓ 优。类/公有方法均有 `@param`/`@return`/`@throws` | L6-17, L28-33 等 |
| 命名清晰度 | ✓ 优。`medianOfThree`/`insertionSort`/`partition` 语义自明 | 全文 |
| 注释解释"为什么" | ✓ 优。L103"较小侧先递归…栈深 O(log n)"、L20 阈值说明 | L20, L103, L158 |
| 常量命名 | ✓ `INSERTION_SORT_THRESHOLD` 自描述 | L21 |
| 结构组织 | ✓ 公有 API → 私有算法（泛型）→ 私有算法（int[]），层次清晰 | L18-264 |

**小问题**（Info，非阻断）：
- **I-1**：L158 注释"此时 array[mid] <= array[high]"不完整。前三步排序后实际为 `array[low] <= array[mid] <= array[high]`（三者完全有序），注释仅提了半截。建议补全为"此时三者已有序 array[low] ≤ array[mid] ≤ array[high]，将中值 array[mid] 置于 high 作为 pivot"。

#### Step4 — 可靠性

| 维度 | 评价 | 证据 |
|---|---|---|
| 空指针安全 | ✓ comparator 非空校验在数组校验前（参数校验优先） | L50-52 |
| 数组越界安全 | ✓ quickSort 的 `low < high` 守卫 + 阈值切换确保 medianOfThree 至少有 3 元素 | L97-101 |
| 递归栈溢出防护 | ✓ 尾递归优化将栈深压至 O(log n) | L103-110 |
| 原地排序契约 | ✓ 仅 swap，无额外分配（sorted 除外） | 全文 |
| 异常类型一致性 | ✓ 抛 NPE 与 Javadoc `@throws NullPointerException` 及测试断言一致 | L47, L51 |

**讨论点**（非 Bug，设计取舍）：
- **D-1**：`comparator == null` 抛 `NullPointerException` 而非 `IllegalArgumentException`。与 `Objects.requireNonNull` 惯例一致，且已声明 `@throws` + 测试覆盖。JDK `List.sort(null)` 语义为"自然序"，此处选择禁止 null 是另一种合理设计。**维持现状可接受**。
- **D-2**：泛型版与 int[] 版的 `quickSort`/`partition`/`medianOfThree`/`insertionSort`/`swap` 完全平行重复（约 130 行）。注释 L193 承认"逻辑与泛型版本一致"。这是为避免装箱的性能取舍，**可接受**，但增加了维护双份逻辑的成本。

**潜在 Bug 模式排查**（自动化预扫未覆盖、需 LLM 判断）：
- 溢出：`int mid = low + (high - low) / 2` 用减法避免 `(low+high)/2` 溢出 ✓
- 重复元素：Lomuto + `<=` pivot 对重复元素正确分区（全部相同时每次分区极不均衡，但有阈值切换兜底）✓
- 比较器一致性：未校验 comparator 传递性/自反性（超出排序算法职责，由调用方保证）✓ 合理

---

### F2. QuickSortTest.java（253 行）

#### Step2 — 功能核对（测试覆盖）

| 测试组 | 测试数 | 覆盖场景 | 评价 |
|---|---|---|---|
| `IntArraySort` | 11 | 乱序/已排序/逆序/重复/全相同/空/null/单元素/两元素/负数/**10k 大数据量 vs JDK** | ✓ 优秀 |
| `GenericSort` | 6 | String/Integer 逆序/null/空/sorted 不变性/sorted null | ✓ 良好 |
| `ComparatorSort` | 4 | 降序/字符串长度/null comparator 抛 NPE/**空数组+null comparator 仍抛**（参数校验优先） | ✓ 良好 |

#### Step3 — 可读性

- `@Nested` + `@DisplayName` 中文分组命名清晰 ✓
- 测试方法名语义化（`sortRandomArray`/`sortWithNegatives`/`sortedReturnsCopyWithoutMutation`）✓
- 注释解释意图（L200"原数组不应被修改"、L139"伪随机但可复现"）✓

#### Step4 — 可靠性（测试质量）

| 维度 | 评价 | 证据 |
|---|---|---|
| 无 Mock | ✓ 符合 AGENTS.md "Avoid mocks in tests"，直接断言结果 | 全文 |
| 交叉验证 | ✓ int[] 大数据量用 JDK `Arrays.sort` 做基准 | L133-147 |
| 可复现性 | ✓ 伪随机用确定公式 `(i*7+13)%size` | L139 |
| FIRST 原则 | ✓ Fast/Independent/Repeatable/Self-validating/Timely | 全文 |
| `sorted` 不变性 | ✓ 快照 + 结果双重断言 | L191-202 |
| 参数校验优先 | ✓ 显式测试"空数组+null comparator 仍抛 NPE" | L245-251 |

**测试缺口**（建议级，非阻断）：
- **S-1**：泛型 `sorted`/`sort(T[])` 缺大数据量交叉验证（int[] 有 10k vs JDK，泛型仅 5 元素 String）。建议补 `sortLargeGenericArrayMatchesJdk`。
- **S-2**：Comparator 路径缺大数据量交叉验证（仅小数组）。建议补 Comparator 版 10k vs JDK。
- **S-3**：`sorted` 缺空数组用例（测了 null→null，未测 `sorted({})`→空数组）。
- **S-4**：`sorted` 文档未说明快速排序**不保证稳定性**（非必须，但建议在 Javadoc 补充，避免调用方误用）。

---

### F3. pom.xml（44 行）

| 维度 | 评价 |
|---|---|
| Java 版本 | ✓ `maven.compiler.release=21` |
| 编码 | ✓ `sourceEncoding=UTF-8` |
| 测试框架 | ✓ JUnit Jupiter 5.10.2 |
| 插件版本 | ✓ compiler 3.13.0 / surefire 3.2.5（合理） |
| 依赖 scope | ✓ junit 为 test scope |

**小建议**（Info）：
- **P-1**：`properties` 未定义 `project.reporting.outputEncoding`（Maven 最佳实践建议与 sourceEncoding 成对设置，非阻断）。

---

## 3. 问题汇总（分级）

| 编号 | 级别 | 文件:行号 | 描述 | 建议 |
|---|---|---|---|---|
| I-1 | Info | QuickSort.java:158 | medianOfThree 注释不完整，仅提 `array[mid]<=array[high]`，未说明三者已完全有序 | 补全为"三者已有序 array[low]≤array[mid]≤array[high]" |
| D-1 | 讨论 | QuickSort.java:51 | comparator null 抛 NPE（非 IAE） | 维持现状（与 Objects.requireNonNull 一致） |
| D-2 | 讨论 | QuickSort.java:192-263 | 泛型/int[] 双实现约 130 行重复 | 性能取舍，可接受；若维护成本敏感可评估仅留泛型版 |
| S-1 | 建议 | QuickSortTest.java | 泛型 sorted/sort(T[]) 缺大数据量交叉验证 | 补 sortLargeGenericArrayMatchesJdk |
| S-2 | 建议 | QuickSortTest.java | Comparator 路径缺大数据量交叉验证 | 补 Comparator 版 10k vs JDK |
| S-3 | 建议 | QuickSortTest.java | sorted 缺空数组用例 | 补 sortedEmptyReturnsEmpty |
| S-4 | 建议 | QuickSort.java:72-77 | sorted Javadoc 未声明不保证稳定性 | 补"快速排序为不稳定排序"说明 |
| P-1 | Info | pom.xml:17 | 未设 project.reporting.outputEncoding | 可选补充 |

**阻断级（Blocker）/ 严重级（Major）：0 项**
**次要级（Minor）：0 项**
**讨论/建议/Info：8 项（均非阻断）**

---

## 4. 评审结论

| 维度 | 评级 | 依据 |
|---|---|---|
| 功能正确性 | ✓ 通过 | medianOfThree/partition/尾递归/边界穷举验证均正确，无 Bug |
| 代码可读性 | ✓ 优秀 | Javadoc 完整、命名清晰、注释解释设计意图 |
| 代码可靠性 | ✓ 良好 | 空指针安全、栈溢出防护、异常一致性 |
| 测试质量 | ✓ 良好 | 无 Mock、交叉验证、FIRST 原则、覆盖全面 |
| 自动化预扫 | ✓ 通过 | 52/222 规则零命中 |

**总评**：**通过（Approve）**。

本次快速排序实现质量高：算法正确（三数取中 + Lomuto + 插入排序阈值 + 尾递归优化），工程纪律良好（完整 Javadoc、null 安全、工具类防实例化），测试遵循 FIRST 原则并用 JDK 排序做交叉验证。自动化预扫零命中，LLM 深度审查未发现阻断性或严重问题。所列 8 项均为 Info/讨论/建议级改进点，可在后续迭代中酌情采纳，不阻塞本次交付。

---

*报告由 `dtazziboot-java-code-review` 技能生成，review 阶段只读产出，未修改任何源码文件。*
