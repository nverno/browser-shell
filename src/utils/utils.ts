import $ from "jquery";

export const title = (): string => {
  return $("title").text().trim();
};

export const not = (func: () => boolean): () => boolean => {
  return () => !func();
};

export const isNumber = (n) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

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

export const truncate = (text: string, length: number): string => {
  return text.length > length - 3 ? text.slice(0, length - 3) + "..." : text;
};
