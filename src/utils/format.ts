

export const truncate = (text: string, length: number): string => {
  return text.length > length - 3 ? text.slice(0, length - 3) + "..." : text;
};

// Wrap ELEM in spans with class CLS, joining with SEP
export function fmtWrap(elem: any[], cls: string, sep = ' ') {
  return elem
    .map(e => `<span class=\"${cls}\">${e}</span>`)
    .join(sep);
}

// Format help docs for pretty
const argRe = new RegExp(/\b[A-Z]+\b/, "g");
const cmdRe = new RegExp(/^[a-z._]+/, 'i');
const docRe = new RegExp(/ - .*/);

export const fmtHelp = (help: string) => {
  help = help.replaceAll(argRe, (m) => `<span class=\"bs-argument\">${m}</span>`);
  return help[0] !== ' ' ?
    help.replace(cmdRe, (m) => `<span class=\"bs-keyword\">${m}</span>`)
      .replace(docRe, (m) => ` <span class=\"bs-doc\">${m.slice(3)}</span>`)
    : help;
};
