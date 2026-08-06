package com.dtazziboot.algo;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Comparator;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * {@link QuickSort} 的单元测试。
 *
 * <p>遵循 FIRST 原则，基于 JUnit 5；不使用 Mock，直接对算法输出进行断言。
 */
@DisplayName("QuickSort 单元测试")
class QuickSortTest {

    @Nested
    @DisplayName("int[] 排序")
    class IntArraySort {

        @Test
        @DisplayName("普通乱序数组升序排序")
        void sortRandomArray() {
            int[] input = {5, 3, 8, 1, 9, 2, 7, 4, 6, 0};
            int[] expected = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("已排序数组保持不变")
        void sortAlreadySortedArray() {
            int[] input = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
            int[] expected = input.clone();

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("逆序数组排序后升序")
        void sortReversedArray() {
            int[] input = {10, 9, 8, 7, 6, 5, 4, 3, 2, 1};
            int[] expected = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("含大量重复元素排序")
        void sortWithDuplicates() {
            int[] input = {4, 2, 4, 2, 4, 1, 1, 3, 3, 4};
            int[] expected = {1, 1, 2, 2, 3, 3, 4, 4, 4, 4};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("全部相同元素排序")
        void sortAllEqual() {
            int[] input = {7, 7, 7, 7, 7, 7};
            int[] expected = {7, 7, 7, 7, 7, 7};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("空数组不抛异常")
        void sortEmptyArray() {
            int[] input = {};

            assertDoesNotThrow(() -> QuickSort.sort(input));

            assertEquals(0, input.length);
        }

        @Test
        @DisplayName("null 数组不抛异常")
        void sortNullArray() {
            assertDoesNotThrow(() -> QuickSort.sort((int[]) null));
        }

        @Test
        @DisplayName("单元素数组保持不变")
        void sortSingleElementArray() {
            int[] input = {42};
            int[] expected = {42};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("两元素无序数组排序")
        void sortTwoElements() {
            int[] input = {9, 3};
            int[] expected = {3, 9};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("含负数排序")
        void sortWithNegatives() {
            int[] input = {3, -1, 0, -5, 2, 8, -3};
            int[] expected = {-5, -3, -1, 0, 2, 3, 8};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("大数据量排序结果与 JDK 排序一致")
        void sortLargeArrayMatchesJdk() {
            int size = 10_000;
            int[] input = new int[size];
            for (int i = 0; i < size; i++) {
                input[i] = (i * 7 + 13) % size; // 伪随机但可复现
            }
            int[] expected = input.clone();
            Arrays.sort(expected);

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }
    }

    @Nested
    @DisplayName("泛型 Comparable 排序")
    class GenericSort {

        @Test
        @DisplayName("String 数组升序排序")
        void sortStringArray() {
            String[] input = {"banana", "apple", "cherry", "date", "elderberry"};
            String[] expected = {"apple", "banana", "cherry", "date", "elderberry"};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("Integer 逆序数组排序")
        void sortIntegerReversed() {
            Integer[] input = {50, 40, 30, 20, 10};
            Integer[] expected = {10, 20, 30, 40, 50};

            QuickSort.sort(input);

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("null 数组不抛异常")
        void sortNullArray() {
            assertDoesNotThrow(() -> QuickSort.sort((Integer[]) null));
        }

        @Test
        @DisplayName("空数组不抛异常")
        void sortEmptyArray() {
            Integer[] input = {};

            assertDoesNotThrow(() -> QuickSort.sort(input));
        }

        @Test
        @DisplayName("sorted 返回新数组且不修改原数组")
        void sortedReturnsCopyWithoutMutation() {
            Integer[] input = {5, 3, 1, 4, 2};
            Integer[] originalSnapshot = input.clone();

            Integer[] result = QuickSort.sorted(input);

            assertNotNull(result);
            assertArrayEquals(new Integer[]{1, 2, 3, 4, 5}, result);
            // 原数组不应被修改
            assertArrayEquals(originalSnapshot, input);
        }

        @Test
        @DisplayName("sorted 入参为 null 时返回 null")
        void sortedNullReturnsNull() {
            assertNull(QuickSort.sorted((Integer[]) null));
        }
    }

    @Nested
    @DisplayName("Comparator 自定义排序")
    class ComparatorSort {

        @Test
        @DisplayName("按降序比较器排序")
        void sortDescending() {
            Integer[] input = {1, 5, 3, 9, 7};
            Integer[] expected = {9, 7, 5, 3, 1};

            QuickSort.sort(input, Comparator.reverseOrder());

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("按字符串长度比较器排序")
        void sortByStringLength() {
            String[] input = {"aaa", "a", "aaaa", "aa"};
            String[] expected = {"a", "aa", "aaa", "aaaa"};

            QuickSort.sort(input, Comparator.comparingInt(String::length));

            assertArrayEquals(expected, input);
        }

        @Test
        @DisplayName("comparator 为 null 时抛出 NullPointerException")
        void sortWithNullComparatorThrows() {
            Integer[] input = {1, 2, 3};

            assertThrows(NullPointerException.class, () -> QuickSort.sort(input, null));
        }

        @Test
        @DisplayName("comparator 为 null 且数组为空时仍抛出（参数校验优先）")
        void sortWithNullComparatorThrowsEvenForEmptyArray() {
            Integer[] input = {};

            assertThrows(NullPointerException.class, () -> QuickSort.sort(input, null));
        }
    }
}
