export const location = (): string => {
  return window.location?.href;
};

export const urlMatches = (pattern: string): boolean => {
  return !!location()?.match(pattern);
};

export const reload = (e: Event | null = null) => {
  if (e) e.preventDefault();
  window.location.reload();
};

export const newWindow = (url: string) => {
  window.open(url, '_blank');
};

export const redirectTo = (url: string) => {
  window.location.href = url;
};

export const domain = () => {
  return window.location.origin.replace(/^https?:\/\//i, '');
};
