
export const log = (...s: any[]) => {
  if (typeof console !== 'undefined') {
    console.log(...s);
  }
};

export const alert = (message: string) => {
  alert(message);
};
