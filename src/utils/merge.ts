
type IObject = { [key: string]: any };

export const mergeCombineFn = (
  key: string, a: IObject, b: IObject, max_depth: number
) => {
  if (a && b) {
    if (Array.isArray(a) && Array.isArray(b))
      return a.concat(b);
    if (typeof a === 'object' && typeof b === 'object') {
      return max_depth <= 0
        ? Object.assign({}, b, a)
        : deepMerge(a, b, mergeCombineFn, max_depth);
    }
    if (typeof a === 'string' && typeof b === 'string')
      return a;
  }
  return a ?? b;
};

/** 
 * Recursively merge objects up to max_depth levels.
 * When called with mergeCombineFn, keys from A override those in B.
 */
export const deepMerge = (
  a: IObject, b: IObject, fn: typeof mergeCombineFn = mergeCombineFn, max_depth = 2
) => ([
  ...new Set([...Object.keys(a), ...Object.keys(b)])
].reduce((acc, key) => ({
  ...acc,
  [key]: fn(key, a[key], b[key], max_depth - 1)
}), {}));
