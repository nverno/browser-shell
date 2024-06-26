export const isNumber = (n: any) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

export const isString = (val: any) => typeof val === 'string';

export const isNil = (val: any) => val === undefined || val === null;

export const isEmpty = val => val == null || !(Object.keys(val) || val).length;

export const isArrayLike = obj => obj != null && typeof obj[Symbol.iterator] === 'function';
