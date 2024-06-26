import $ from 'jquery';

export const title = (): string => {
  return $("title").text().trim();
};

export const blinkElements = (
  elems: JQuery<HTMLElement>,
  css: { [key: string]: any },
  timeout = 2000
) => {
  const props = Object.keys(css);
  const orig = elems.map((_i, e) => props.reduce((acc, p) => ({
    [p]: $(e).css(p),
    ...acc
  }), {}));
  Object.entries(css).forEach(([p, v]) => elems.css(p, v));

  // Restore
  setTimeout(function () {
    elems.each((i, e) => Object.entries(orig[i])
      .forEach(([p, v]: any) => $(e).css(p, v)));
  }, timeout);
};
