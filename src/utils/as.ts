// import { isArrayLike } from "./is";

export function asArray<T>(val?: T | T[]): T[] {
  return (!val ? [] : Array.isArray(val) ? val : [val]) as T[];
};
