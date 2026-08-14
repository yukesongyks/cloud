# helloworld 模块

## 模块职责

提供标准化的 Hello World 问候语生成服务。

## 关键类

| 类名 | 类型 | 说明 |
|------|------|------|
| `HelloWorldService` | Service | 问候语生成服务，提供 `getGreeting()` 方法 |

## 依赖关系

无外部依赖，纯独立模块。

## API 接口

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `getGreeting()` | `String` | 返回默认问候语 "Hello World" |