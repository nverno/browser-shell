
export const truncate = (text: string, length: number): string => {
  return text.length > length - 3 ? text.slice(0, length - 3) + "..." : text;
};

export const escape = (text: string): string => {
  const entityMap: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (s) => entityMap[s]);
};

export const escapeAndLinkify = (text: string): string => {
  return escape(text)
    .replace(/https?:\/\/[^\s]+/i, (s) => `<a href='${s}' target='_blank'>${s}</a>`);
};
