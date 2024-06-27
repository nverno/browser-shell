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

export const handleDoubleClick = (id, doubleClickDelay = 300) => {
  const element = document.getElementById(id);
  if (element) {
    let clickTimeout: number | null = null;
    const dcHandler = (event: MouseEvent) => {
      if (clickTimeout !== null) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        console.log('Double-click detected');
        element.removeEventListener('click', dcHandler);
      } else {
        clickTimeout = window.setTimeout(() => {
          clickTimeout = null;
          console.log('Single click detected');
        }, doubleClickDelay);
      }
    };
    element.addEventListener('click', dcHandler);
  }
};
