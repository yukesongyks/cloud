package com.example.helloworld;

/**
 * HelloWorld 问候服务。
 *
 * <p>提供标准化的问候语生成能力。</p>
 *
 * @author DTCoder
 */
public class HelloWorldService {

    private static final String DEFAULT_GREETING = "Hello World";

    /**
     * 获取问候语。
     *
     * @return 默认问候语 "Hello World"
     */
    public String getGreeting() {
        return DEFAULT_GREETING;
    }
}