# java-quick-sort 架构文档

## 项目概述

`java-quick-sort` 是基于 dtazziboot Java 编码规范的算法与基础服务模块集合。项目采用 JDK 21 + Maven + JUnit 5 技术栈。

## 模块列表

| 模块 | 包路径 | 说明 |
|------|--------|------|
| algo | `com.dtazziboot.algo` | 排序算法（QuickSort） |
| hello | `com.dtazziboot.hello` | HelloWorld 问候服务 |

## 技术栈

- **JDK**: 21 LTS
- **构建工具**: Maven 3.x
- **测试框架**: JUnit Jupiter 5.10.2
- **编码规范**: dtazziboot-java-coding-standards

## 分层约束

- 每个模块独立包，模块间无直接依赖
- 服务类遵循单一职责原则
- 测试类遵循 FIRST 原则，使用 AAA 模式