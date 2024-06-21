import $ from "jquery";

export const sitFor = async (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
};

export const title = (): string => {
  return $("title").text().trim();
};

export const not = (func: () => boolean): () => boolean => {
  return () => !func();
};

export const isNumber = (n: any) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export const isString = (val: any) => typeof val === 'string';

export const isNil = (val: any) => val === undefined || val === null;

export const isEmpty = val => val == null || !(Object.keys(val) || val).length;

export const escape = (text: string): string => {
  const entityMap: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (s) => entityMap[s]);
};

export const escapeAndLinkify = (text: string): string => {
  return escape(text)
    .replace(/https?:\/\/[^\s]+/i, (s) => `<a href='${s}' target='_blank'>${s}</a>`);
};

export const truncate = (text: string, length: number): string => {
  return text.length > length - 3 ? text.slice(0, length - 3) + "..." : text;
};

type IObject = { [key: string]: any };

export const mergeCombineFn = (
  key: string, a: IObject, b: IObject, max_depth: number
) => {
  if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
  if (typeof a === 'object' && typeof b === 'object') {
    return max_depth <= 0
      ? Object.assign({}, b, a)
      : deepMerge(a, b, mergeCombineFn, max_depth);
  }
  if (typeof a === 'string' && typeof b === 'string') return a;
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
