
export const pick = (
  obj: { [key: string]: any },
  arr: (string | number)[]
) => arr.reduce((acc, curr) => (curr in obj && (acc[curr] = obj[curr]), acc), {});

export const flatten = (arr, depth = 1) =>
  arr.reduce((a, v) =>
    a.concat(depth > 1 && Array.isArray(v)
      ? flatten(v, depth - 1) : v), []);

// declare global {
//   interface Array<T> {
//     lowerBound(cmp: any): number;
//   }
// }
// first index where cmp(x) is true, or if cmp not a function, 
// the index where element is not less than cmp
// Array.prototype.lowerBound = function (cmp) {
//   let comparator = typeof cmp !== 'function' ? (x) => x >= cmp : cmp;
//   let l = 0, r = this.length;
//   while (l < r) {
//     let mid = (l + r) >>> 1;
//     if (comparator(this[mid])) r = mid;
//     else l = mid + 1;
//   }
//   return r;
// };

export function lowerBound<T = any>(arr: T[], cmp: (((x: T) => boolean) | T)) {
  let comparator = (
    typeof cmp === 'function' ? cmp
      : ((x: T) => x >= (cmp as T)) as (x: T) => boolean
  ) as (x: T) => boolean;
  let l = 0, r = arr.length;
  while (l < r) {
    let mid = (l + r) >>> 1;
    if (comparator(arr[mid])) r = mid;
    else l = mid + 1;
  }
  return r;
};
