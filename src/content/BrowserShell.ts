import $ from 'jquery';
import { Terminal, TerminalWindow } from "~content/terminal";
import { Debug, isKey } from '~utils';
import { getUserConfig } from '~config';

const debug = Debug('shell');

export class BrowserShell {
  terminalWindow?: TerminalWindow;
  terminal?: Terminal;
  commands?: any;

  constructor() {}

  async init() {
    debug("listening...");
    await this.listen(document);
  }

  async showTerminal() {
    if (this.terminalWindow) {
      this.terminalWindow.show();
    } else {
      const config = await getUserConfig();
      this.terminalWindow = new TerminalWindow({
        height: config.shell.height,
        animate: true,
        resizable: true,
        closable: true,
        css: {
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
        },
      });
      await this.listen(this.terminalWindow.document);
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

  async listen(target: TerminalWindow['document'] | Document) {
    const config = await getUserConfig();
    $(target).on('keydown' as any, (e: KeyboardEvent) => {
      if (isKey(config.commands.openShell, e)) {
        e.preventDefault();
        if (this.terminalShown()) {
          this.hideTerminal();
        } else {
          this.showTerminal();
        }
      } else if (isKey(config.commands.toggleFullscreen, e) && this.terminalShown()) {
        e.preventDefault();
        this.terminal.toggleFullscreen()!;
      }
    });
  }

  static async start() {
    const extension = new BrowserShell();
    await extension.init();
  }
}
