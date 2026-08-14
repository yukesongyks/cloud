package com.dtazziboot.hello;

/**
 * HelloWorld 问候服务。
 *
 * <p>提供默认和自定义名称的问候语生成能力。
 *
 * @author DTCoder
 * @date 2026/04/29
 * @since 1.0.0
 */
public class HelloWorldService {

    /** 默认问候名称。 */
    private static final String DEFAULT_NAME = "World";

    /** 问候语前缀。 */
    private static final String GREETING_PREFIX = "Hello, ";

    /** 问候语后缀。 */
    private static final String GREETING_SUFFIX = "!";

    /**
     * 返回默认问候语 "Hello, World!"。
     *
     * @return 默认问候语字符串
     */
    public String greet() {
        return greet(DEFAULT_NAME);
    }

    /**
     * 按指定名称返回问候语。
     *
     * @param name 问候对象名称，不可为 null
     * @return 格式为 "Hello, {name}!" 的问候语
     * @throws NullPointerException 当 name 为 null 时
     */
    public String greet(String name) {
        if (name == null) {
            throw new NullPointerException("name must not be null");
        }
        return GREETING_PREFIX + name + GREETING_SUFFIX;
    }
}