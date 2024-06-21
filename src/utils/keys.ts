/** 
 * Return true if E matches key represented by KBD string.
 * KBD is form: 'C-c', 'M-C-K', 'M-l'
 */
export const isKey = (kbd: string, e: KeyboardEvent) => {
  return kbd.split('-').every((k) => {
    switch (k) {
      case 'C': return e.ctrlKey;
      case 'M': return e.metaKey || e.altKey;
      default: return e.key === k;
    }
  });
};
