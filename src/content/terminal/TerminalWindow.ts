import $ from 'jquery';
import { loadCSS } from '~utils';
import './terminal-window.css';

export interface TerminalWindowOptions {
  css?: { [key: string]: string };
  height?: string;
  animate?: boolean;
  closable?: boolean;
  onClose?: () => void;
};

export interface TerminalWindow {
  shown: boolean;
  height: number | string;
  $wrapper: JQuery<Element>;
  $iframe: JQuery<HTMLIFrameElement>;
  document: JQuery<HTMLIFrameElement | Document | Text | Comment>;
  $body: JQuery<HTMLBodyElement>;
  $head: JQuery<HTMLHeadElement>;
  hide: () => void;
  show: () => void;
  close: () => void;
};

export const makeTerminalWindow = (options: TerminalWindowOptions = {}): TerminalWindow => {
  const $wrapper = $("<div class='terminal-wrapper'><iframe></iframe></div>");
  $("body").append($wrapper);
  if (options.css) $wrapper.css(options.css);
  const $iframe = $wrapper.find("iframe");
  const iframeDocument = $iframe.contents();

  const win = {
    shown: true,
    height: options.height || '500px',
    $wrapper,
    $iframe,
    document: iframeDocument,
    $body: iframeDocument.find("body"),
    $head: iframeDocument.find("head"),

    hide() {
      this.shown = false;
      if (options.animate) {
        this.$wrapper.animate({ height: '0px' }, 150, () => {
          this.$wrapper.hide();
        });
      } else {
        this.$wrapper.hide();
      }
    },

    show() {
      this.shown = true;
      if (options.animate) {
        this.$wrapper.css('height', '0px').show();
        this.$wrapper.animate({ height: this.height }, 150);
      } else {
        this.$wrapper.css('height', this.height).show();
      }
    },

    close() {
      if (options.animate) {
        this.$wrapper.animate({ height: '0px' }, 150, () => {
          this.$wrapper.remove();
        });
      } else {
        this.$wrapper.remove();
      }
    },
  };

  win.$body.addClass('terminal-iframe');
  loadCSS('terminal.css', { target: win.$head.get(0) });

  if (options.closable !== false) {
    $("<div class='close-window'>&#x2715;</div>").appendTo(win.$body).on('click', () => {
      options.onClose?.();
      win.close();
    });
  }

  win.$iframe.css('height', win.height);
  win.show();

  return win;
}
