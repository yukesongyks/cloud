package com.example.helloworld;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * HelloWorldService 单元测试。
 *
 * @author DTCoder
 */
class HelloWorldServiceTest {

    private final HelloWorldService sut = new HelloWorldService();

    @Test
    @DisplayName("should return Hello World greeting when getGreeting is called")
    void shouldReturnHelloWorldGreeting_whenGetGreetingCalled() {
        // Arrange
        String expected = "Hello World";

        // Act
        String actual = sut.getGreeting();

        // Assert
        assertThat(actual).isEqualTo(expected);
    }

    @Test
    @DisplayName("should return non-null non-blank greeting")
    void shouldReturnNonNullNonBlankGreeting() {
        // Act
        String greeting = sut.getGreeting();

        // Assert
        assertThat(greeting).isNotNull().isNotBlank();
    }
}