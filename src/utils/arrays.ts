
export const pick = (
  obj: { [key: string]: any },
  arr: (string | number)[]
) => arr.reduce((acc, curr) => (curr in obj && (acc[curr] = obj[curr]), acc), {});
