interface LoadPathOptions {
  exports?: string;
  callback?: () => void;
}

interface LoadOptions {
  reload?: boolean;
  loads?: string;
  then?: () => void;
}

interface CSSLoadOptions {
  media?: string;
  target?: HTMLElement;
}

export const attachElement = (elem: HTMLElement, target: HTMLElement = null): void => {
  const head = target || document.getElementsByTagName('head')[0];
  if (head) {
    head.appendChild(elem);
  } else {
    document.body.appendChild(elem);
  }
};

export const whenTrue = (condition: () => boolean, callback: () => void): void => {
  const go = () => {
    if (condition()) {
      callback();
    } else {
      setTimeout(go, 50);
    }
  };
  go();
};

export const loadScript = (src: string, opts: LoadOptions = {}) => {
  const script = document.createElement('SCRIPT');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', forChrome(src + (opts.reload ? `?r=${Math.random()}` : '')));
  attachElement(script);
  if (opts.loads && opts.then) {
    whenTrue(() => !!window[opts.loads], opts.then);
  }
};

export const loadCSS = (href: string, opts: CSSLoadOptions = {}) => {
  const link = document.createElement('LINK');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', forChrome(href));
  link.setAttribute('type', 'text/css');
  link.setAttribute('media', opts.media || 'all');
  attachElement(link, opts.target);
};

export const forChrome = (path: string): string => {
  return path.match(/^http/i) ? path : chrome?.runtime.getURL(path);
};

const pathCache = {};

export const load = (path: string, opts: LoadPathOptions | null = {}) => {
  if (pathCache[path]) {
    opts.callback?.();
  } else {
    pathCache[path] = true;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.runtime.getURL(path), true);
    xhr.onreadystatechange = (e) => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        if (opts.exports) {
          const module = { exports: {} };
          eval(`(function() { ${xhr.responseText} })();`);
          (window as any)[opts.exports] = module.exports;
        } else {
          eval(xhr.responseText);
        }
        opts.callback?.();
      }
    };
    xhr.send(null);
  }
};
