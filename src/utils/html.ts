
export const stripHTMLTags = (str: string) => str.replace(/<[^>]*>/g, '');

export const escapeHTML = (text: string): string => {
  const entityMap: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (s) => entityMap[s]);
};

export const unescapeHTML = (text: string): string => text
  .replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g,
    tag => ({
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&#39;': "'",
      '&quot;': '"'
    }[tag] || tag)
  );

export const escapeAndLinkify = (text: string, opts = { escape: true, linkify: true }): string => {
  if (opts.escape)
    text = escapeHTML(text);
  return opts.linkify ? convertLinks(text) : text;
};

export const convertLinks = (text: string): string => text
  .replace(/https?:\/\/[^\s]+/i, (s) => `<a href='${s}' target='_blank'>${s}</a>`)
