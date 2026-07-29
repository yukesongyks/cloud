package com.antfin.dtcoder.common.util;

import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * {@link QuickSortUtil} 单元测试。
 *
 * <p>遵循 AAA（Arrange-Act-Assert）模式，覆盖正常、边界与异常场景。
 *
 * @author dtcoder
 */
class QuickSortUtilTest {

    // ==================== sort 测试 ====================

    @Test
    void should_sortedAscending_when_arrayIsUnsorted() {
        // Arrange (Given)
        int[] array = {5, 3, 8, 1, 9, 2, 7, 4, 6};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9}, array);
    }

    @Test
    void should_doNothing_when_arrayIsEmpty() {
        // Arrange (Given)
        int[] array = {};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{}, array);
    }

    @Test
    void should_keepSame_when_arrayHasSingleElement() {
        // Arrange (Given)
        int[] array = {42};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{42}, array);
    }

    @Test
    void should_doNothing_when_arrayIsNull() {
        // Arrange (Given)
        int[] array = null;

        // Act (When)
        // Assert (Then)
        assertDoesNotThrow(() -> QuickSortUtil.sort(array));
        assertNull(array);
    }

    @Test
    void should_keepSame_when_arrayIsAlreadySorted() {
        // Arrange (Given)
        int[] array = {1, 2, 3, 4, 5};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{1, 2, 3, 4, 5}, array);
    }

    @Test
    void should_sortCorrectly_when_arrayIsReverseSorted() {
        // Arrange (Given)
        int[] array = {9, 8, 7, 6, 5, 4, 3, 2, 1};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{1, 2, 3, 4, 5, 6, 7, 8, 9}, array);
    }

    @Test
    void should_sortCorrectly_when_arrayHasDuplicateElements() {
        // Arrange (Given)
        int[] array = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9}, array);
    }

    @Test
    void should_sortCorrectly_when_arrayHasNegativeElements() {
        // Arrange (Given)
        int[] array = {-3, 5, -1, 0, 2, -8};

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(new int[]{-8, -3, -1, 0, 2, 5}, array);
    }

    @Test
    void should_matchJdkSort_when_randomLargeArray() {
        // Arrange (Given)
        int[] array = new int[1000];
        for (int i = 0; i < array.length; i++) {
            array[i] = (i * 37 + 13) % 997;
        }
        int[] expected = Arrays.copyOf(array, array.length);
        Arrays.sort(expected);

        // Act (When)
        QuickSortUtil.sort(array);

        // Assert (Then)
        assertArrayEquals(expected, array);
    }
}
