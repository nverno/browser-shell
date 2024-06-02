import $ from 'jquery';
import { loadCSS, Debug } from '~utils';
import './terminal-window.css';
const debug = Debug('terminalWindow');

export interface TerminalWindowOptions {
  css?: { [key: string]: string };
  height?: string;
  animate?: boolean;
  closable?: boolean;
  resizable?: boolean;
  onClose?: () => void;
};

export class TerminalWindow {
  shown: boolean;
  isResizing: boolean;
  height: number | string;
  $wrapper: JQuery<HTMLElement>;
  $iframe: JQuery<HTMLIFrameElement>;
  document: JQuery<HTMLIFrameElement | Document | Text | Comment>;
  $body: JQuery<HTMLBodyElement>;
  $head: JQuery<HTMLHeadElement>;
  options: TerminalWindowOptions;

  constructor(options: TerminalWindowOptions = {}) {
    this.$wrapper = $(`
     <div class='terminal-wrapper'>
       <iframe></iframe>
     </div>`);
    $("body").append(this.$wrapper);
    if (options.css) this.$wrapper.css(options.css);
    this.$iframe = this.$wrapper.find("iframe");
    this.document = this.$iframe.contents();
    this.$body = this.document.find("body");
    this.$head = this.document.find("head");
    this.height = options.height || '500px';
    this.shown = true;
    this.isResizing = false;
    this.options = options;

    this.$body.addClass('terminal-iframe');
    loadCSS('terminal.css', { target: this.$head.get(0) });

    if (options.closable !== false) {
      $("<div class='close-window'>&#x2715;</div>")
        .appendTo(this.$body).on('click', () => {
          options.onClose?.();
          this.hide();
        });
    }

    if (options.resizable !== false) {
      $("<div id='terminal-resizer'>&#x2630;</div>").appendTo(this.$body)
        .on('click', () => this.toggleFullscreen());
    }

    this.$iframe.css('height', '100%');
    this.show();
  }

  toggleFullscreen() {
    this.height = this.height === '100vh' ? this.options.height ?? '500px' : '100vh';
    this.$wrapper.css('height', this.height);
  }

  hide() {
    this.shown = false;
    if (this.options.animate) {
      this.$wrapper.animate({ height: '0px' }, 150, () => {
        this.$wrapper.hide();
      });
    } else {
      this.$wrapper.hide();
    }
  }

  show() {
    this.shown = true;
    if (this.options.animate) {
      this.$wrapper.css('height', '0px').show();
      this.$wrapper.animate({ height: this.height }, 150);
    } else {
      this.$wrapper.css('height', this.height).show();
    }
  }

  close() {
    if (this.options.animate) {
      this.$wrapper.animate({ height: '0px' }, 150, () => {
        this.$wrapper.remove();
      });
    } else {
      this.$wrapper.remove();
    }
  }

  // startResize(e) {
  //   debug("resizing: %O", e);
  //   this.isResizing = true;
  //   this.$wrapper.parent().on('mousemove', this.resize.bind(this));
  //   this.$wrapper.parent().on('mouseup', this.stopResize.bind(this));
  // }
  // resize(e) {
  //   if (this.isResizing) {
  //     const y = this.$wrapper.offset().top;
  //     const dy = e.clientY - y;
  //     const ht = y + dy;
  //     this.$wrapper.css('height', ht + 'px');
  //   }
  // }
  // stopResize(e) {
  //   debug("stopResize");
  //   this.isResizing = false;
  //   this.$wrapper.parent().off('mousemove', this.resize);
  //   this.$wrapper.parent().off('mouseup', this.stopResize);
  // }
};
