package com.antfin.dtcoder.common.util;

/**
 * 快速排序工具类。
 *
 * <p>对 {@code int[]} 进行原地升序排序，采用三数取中法选取基准元素以降低最坏情况概率，
 * 时间复杂度平均 O(n log n)，最坏 O(n^2)，空间复杂度 O(log n)（递归栈）。
 *
 * <p>该类为工具类，仅包含静态方法，禁止实例化。
 *
 * @author dtcoder
 */
public final class QuickSortUtil {

    private QuickSortUtil() {
    }

    /**
     * 对整型数组进行原地升序快速排序。
     *
     * @param array 待排序数组，允许为 null 或空数组，此时直接返回不做处理
     */
    public static void sort(int[] array) {
        if (array == null || array.length <= 1) {
            return;
        }
        quickSort(array, 0, array.length - 1);
    }

    /**
     * 递归排序子区间 [low, high]。
     */
    private static void quickSort(int[] array, int low, int high) {
        if (low >= high) {
            return;
        }
        int pivotIndex = partition(array, low, high);
        quickSort(array, low, pivotIndex - 1);
        quickSort(array, pivotIndex + 1, high);
    }

    /**
     * Lomuto 分区：选取三数取中后的基准元素，将小于等于基准的元素移至左侧，大于基准的移至右侧。
     *
     * @return 基准元素最终所在下标
     */
    private static int partition(int[] array, int low, int high) {
        choosePivot(array, low, high);
        int pivot = array[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (array[j] <= pivot) {
                i++;
                swap(array, i, j);
            }
        }
        swap(array, i + 1, high);
        return i + 1;
    }

    /**
     * 三数取中法：比较 low、mid、high 三处元素，将中位数交换至 high 位置作为基准。
     */
    private static void choosePivot(int[] array, int low, int high) {
        int mid = low + (high - low) / 2;
        if (array[low] > array[mid]) {
            swap(array, low, mid);
        }
        if (array[low] > array[high]) {
            swap(array, low, high);
        }
        if (array[mid] > array[high]) {
            swap(array, mid, high);
        }
        swap(array, mid, high);
    }

    private static void swap(int[] array, int i, int j) {
        int temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}
