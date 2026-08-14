# helloworld 模块

## 模块职责

提供 HelloWorld 问候服务，支持默认问候和自定义名称问候。

## 关键类

| 类名 | 类型 | 说明 |
|------|------|------|
| `HelloWorldService` | 服务类 | 生成问候语，支持默认和自定义名称 |

## 依赖关系

- 无外部模块依赖
- 无第三方库依赖

## API 接口列表

| 方法 | 签名 | 说明 |
|------|------|------|
| greet | `String greet()` | 返回默认问候语 "Hello, World!" |
| greet | `String greet(String name)` | 按指定名称返回问候语，name 不可为 null |