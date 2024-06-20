
export const pick = (
  obj: { [key: string]: any },
  arr: (string | number)[]
) => arr.reduce((acc, curr) => (curr in obj && (acc[curr] = obj[curr]), acc), {});

export const flatten = (arr, depth = 1) =>
  arr.reduce((a, v) =>
    a.concat(depth > 1 && Array.isArray(v)
      ? flatten(v, depth - 1) : v), []);
