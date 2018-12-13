/* =========================================================================
 *
 *  math_utils.ts
 *  simple math functions
 * ========================================================================= */

export function absmax(x: number, y: number) {
    return (x * x > y * y) ? x : y;
}

export function absmin(x: number, y: number) {
    return (x * x < y * y) ? x : y;
}

export function muldec(x: number, y: number) {
    return ((x * 10) * (y * 10)) / 100;
}