package com.dtazziboot.hello;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * {@link HelloWorldService} 的单元测试。
 *
 * <p>遵循 FIRST 原则，基于 JUnit 5；不使用 Mock，直接对服务输出进行断言。
 *
 * @author DTCoder
 * @date 2026/04/29
 */
@DisplayName("HelloWorldService 单元测试")
class HelloWorldServiceTest {

    private final HelloWorldService service = new HelloWorldService();

    @Nested
    @DisplayName("greet() 默认问候")
    class DefaultGreet {

        @Test
        @DisplayName("无参调用返回默认问候语")
        void shouldReturnDefaultGreeting() {
            String result = service.greet();

            assertNotNull(result);
            assertEquals("Hello, World!", result);
        }
    }

    @Nested
    @DisplayName("greet(String) 自定义问候")
    class CustomGreet {

        @Test
        @DisplayName("传入英文名返回对应问候语")
        void shouldReturnGreetingWithEnglishName() {
            String result = service.greet("Alice");

            assertNotNull(result);
            assertEquals("Hello, Alice!", result);
        }

        @Test
        @DisplayName("传入中文名返回对应问候语")
        void shouldReturnGreetingWithChineseName() {
            String result = service.greet("世界");

            assertNotNull(result);
            assertEquals("Hello, 世界!", result);
        }

        @Test
        @DisplayName("传入空字符串返回仅含标点的问候语")
        void shouldReturnGreetingWithEmptyName() {
            String result = service.greet("");

            assertNotNull(result);
            assertEquals("Hello, !", result);
        }
    }

    @Nested
    @DisplayName("greet(String) 参数校验")
    class ParameterValidation {

        @Test
        @DisplayName("传入 null 时抛出 NullPointerException")
        void shouldThrowExceptionWhenNameIsNull() {
            assertThrows(NullPointerException.class, () -> service.greet(null));
        }
    }
}