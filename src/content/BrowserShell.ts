import $ from 'jquery';
import { Terminal, TerminalWindow, makeTerminalWindow } from "~content/terminal";
import { Debug } from '~utils';
const debug = Debug('shell');


export class BrowserShell {
  terminalWindow?: TerminalWindow;
  terminal?: Terminal;
  commands?: any;

  constructor() {}

  init() {
    debug("listening...");
    this.listen(document);
  }

  showTerminal() {
    if (this.terminalWindow) {
      this.terminalWindow.show();
    } else {
      this.terminalWindow = makeTerminalWindow({
        height: '250px',
        animate: true,
        closable: false,
        css: {
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
        },
      });
      this.listen(this.terminalWindow.document);
      this.terminal = new Terminal(this.terminalWindow, this);
      debug("created terminal: %O", this.terminal);
    }
    this.terminal.focusPrompt();
  }

  hideTerminal() {
    this.terminalWindow?.hide();
  }

  terminalShown() {
    return this.terminalWindow?.shown;
  }

  listen(target: any) {
    $(target).on('keydown' as any, (e: KeyboardEvent) => {
      if (e.key === "t" && e.altKey) {
        e.preventDefault();
        if (this.terminalShown()) {
          this.hideTerminal();
        } else {
          this.showTerminal();
        }
      }
    });
  }

  static start() {
    const extension = new BrowserShell();
    extension.init();
  }
}
