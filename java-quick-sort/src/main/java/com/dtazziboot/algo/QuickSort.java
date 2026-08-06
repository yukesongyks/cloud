package com.dtazziboot.algo;

import java.util.Arrays;
import java.util.Comparator;

/**
 * 快速排序算法工具类。
 *
 * <p>基于 Lomuto 分区方案，采用三数取中法选取基准元素（pivot），
 * 以降低在已排序或逆序输入上退化为 O(n^2) 的概率。
 * 平均时间复杂度 O(n log n)，最坏 O(n^2)；
 * 空间复杂度 O(log n)（递归栈），原地排序。
 *
 * <p>该类为工具类，不可实例化。
 *
 * @since 1.0.0
 */
public final class QuickSort {

    /** 插入排序的切换阈值：子数组长度小于等于该值时改用插入排序，减少递归开销。 */
    private static final int INSERTION_SORT_THRESHOLD = 16;

    private QuickSort() {
        // 工具类禁止实例化
        throw new AssertionError("Utility class QuickSort cannot be instantiated.");
    }

    /**
     * 对可比较元素数组进行升序快速排序（原地排序）。
     *
     * @param array 待排序数组，允许为 null 或空数组
     * @param <T>   元素类型，必须实现 {@link Comparable}
     */
    public static <T extends Comparable<? super T>> void sort(T[] array) {
        if (array == null || array.length <= 1) {
            return;
        }
        sort(array, Comparator.naturalOrder());
    }

    /**
     * 按指定比较器对数组进行升序快速排序（原地排序）。
     *
     * @param array      待排序数组，允许为 null 或空数组
     * @param comparator 比较器，不可为 null
     * @param <T>        元素类型
     * @throws NullPointerException 当 comparator 为 null 时
     */
    public static <T> void sort(T[] array, Comparator<? super T> comparator) {
        if (comparator == null) {
            throw new NullPointerException("comparator must not be null");
        }
        if (array == null || array.length <= 1) {
            return;
        }
        quickSort(array, 0, array.length - 1, comparator);
    }

    /**
     * 对 int[] 进行升序快速排序（原地排序）。
     *
     * @param array 待排序数组，允许为 null 或空数组
     */
    public static void sort(int[] array) {
        if (array == null || array.length <= 1) {
            return;
        }
        quickSort(array, 0, array.length - 1);
    }

    /**
     * 返回排序后的新数组，不修改原数组。
     *
     * @param array 待排序数组，允许为 null
     * @param <T>   元素类型
     * @return 排序后的新数组；入参为 null 时返回 null
     */
    public static <T extends Comparable<? super T>> T[] sorted(T[] array) {
        if (array == null) {
            return null;
        }
        T[] copy = Arrays.copyOf(array, array.length);
        sort(copy);
        return copy;
    }

    /**
     * 递归执行快速排序（泛型版本）。
     *
     * @param array      数组
     * @param low        当前子数组起始下标（含）
     * @param high       当前子数组结束下标（含）
     * @param comparator 比较器
     * @param <T>        元素类型
     */
    private static <T> void quickSort(T[] array, int low, int high, Comparator<? super T> comparator) {
        while (low < high) {
            if (high - low + 1 <= INSERTION_SORT_THRESHOLD) {
                insertionSort(array, low, high, comparator);
                return;
            }
            int pivotIndex = partition(array, low, high, comparator);
            // 对较小的一侧先递归，较大的一侧尾递归，将递归栈深度控制在 O(log n)
            if (pivotIndex - low < high - pivotIndex) {
                quickSort(array, low, pivotIndex - 1, comparator);
                low = pivotIndex + 1;
            } else {
                quickSort(array, pivotIndex + 1, high, comparator);
                high = pivotIndex - 1;
            }
        }
    }

    /**
     * Lomuto 分区（泛型版本）：将 pivot 放到正确位置，并返回其下标。
     *
     * @param array      数组
     * @param low        子数组起始下标（含）
     * @param high       子数组结束下标（含）
     * @param comparator 比较器
     * @return pivot 最终所在下标
     * @param <T>        元素类型
     */
    private static <T> int partition(T[] array, int low, int high, Comparator<? super T> comparator) {
        medianOfThree(array, low, high, comparator);
        T pivot = array[high];
        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (comparator.compare(array[j], pivot) <= 0) {
                i++;
                swap(array, i, j);
            }
        }
        swap(array, i + 1, high);
        return i + 1;
    }

    /**
     * 三数取中法：对 array[low]、array[mid]、array[high] 排序后，将中值交换到 array[high] 作为 pivot。
     *
     * @param array      数组
     * @param low        起始下标
     * @param high       结束下标
     * @param comparator 比较器
     * @param <T>        元素类型
     */
    private static <T> void medianOfThree(T[] array, int low, int high, Comparator<? super T> comparator) {
        int mid = low + (high - low) / 2;
        if (comparator.compare(array[low], array[mid]) > 0) {
            swap(array, low, mid);
        }
        if (comparator.compare(array[low], array[high]) > 0) {
            swap(array, low, high);
        }
        if (comparator.compare(array[mid], array[high]) > 0) {
            swap(array, mid, high);
        }
        // 此时 array[mid] <= array[high]，将中值放到 high 位置作为 pivot
        swap(array, mid, high);
    }

    /**
     * 对小规模子数组使用插入排序。
     *
     * @param array      数组
     * @param low        起始下标（含）
     * @param high       结束下标（含）
     * @param comparator 比较器
     * @param <T>        元素类型
     */
    private static <T> void insertionSort(T[] array, int low, int high, Comparator<? super T> comparator) {
        for (int i = low + 1; i <= high; i++) {
            T key = array[i];
            int j = i - 1;
            while (j >= low && comparator.compare(array[j], key) > 0) {
                array[j + 1] = array[j];
                j--;
            }
            array[j + 1] = key;
        }
    }

    private static <T> void swap(T[] array, int a, int b) {
        if (a == b) {
            return;
        }
        T tmp = array[a];
        array[a] = array[b];
        array[b] = tmp;
    }

    /**
     * 递归执行快速排序（int[] 版本），逻辑与泛型版本一致。
     *
     * @param array 数组
     * @param low   起始下标（含）
     * @param high  结束下标（含）
     */
    private static void quickSort(int[] array, int low, int high) {
        while (low < high) {
            if (high - low + 1 <= INSERTION_SORT_THRESHOLD) {
                insertionSort(array, low, high);
                return;
            }
            int pivotIndex = partition(array, low, high);
            if (pivotIndex - low < high - pivotIndex) {
                quickSort(array, low, pivotIndex - 1);
                low = pivotIndex + 1;
            } else {
                quickSort(array, pivotIndex + 1, high);
                high = pivotIndex - 1;
            }
        }
    }

    private static int partition(int[] array, int low, int high) {
        medianOfThree(array, low, high);
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

    private static void medianOfThree(int[] array, int low, int high) {
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

    private static void insertionSort(int[] array, int low, int high) {
        for (int i = low + 1; i <= high; i++) {
            int key = array[i];
            int j = i - 1;
            while (j >= low && array[j] > key) {
                array[j + 1] = array[j];
                j--;
            }
            array[j + 1] = key;
        }
    }

    private static void swap(int[] array, int a, int b) {
        if (a == b) {
            return;
        }
        int tmp = array[a];
        array[a] = array[b];
        array[b] = tmp;
    }
}
