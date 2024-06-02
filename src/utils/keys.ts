export const isKey = (kbd: string, e: KeyboardEvent) => {
  let [ctrlKey, key] = kbd.split('-');
  return (ctrlKey === 'C' && e.ctrlKey || ctrlKey === 'M' && e.altKey) &&
    e.key === key;
};
