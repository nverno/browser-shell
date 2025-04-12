import $ from 'jquery';
import { isError } from 'lodash';
import { escapeAndLinkify, escapeHTML } from '~utils';
import { commands, BrowserShell } from '~content';
import { PipeExec, PipeEnv, CommandsBase } from '~content/exec';
import { TerminalWindow } from './TerminalWindow';
import History from './History';


const MAX_OUTPUT_BUFFER: number = 1024

export const terminalOutputTypes = [
  'text', 'html', 'json', 'object', 'string', 'jquery',
] as const;
export type TerminalOutputType = typeof terminalOutputTypes[number];

export type ITerminalOpts = {
  escape: boolean;
  pretty: boolean;
  linkify: boolean;
  outputType: TerminalOutputType;
};
export const terminalDefaultOpts: Partial<ITerminalOpts> = {
  outputType: 'text',
  pretty: false,
  linkify: true,
  escape: true,
};

export class Terminal {
  win: TerminalWindow;
  shell: BrowserShell;
  history: History;
  bin: CommandsBase<any> = commands as any;
  alias: { [key: string]: string } = {};
  opts: { [key: string]: any } = Object.assign({}, terminalDefaultOpts);

  $body: JQuery<HTMLBodyElement>;
  $textarea: JQuery<HTMLTextAreaElement>;
  $output: JQuery<HTMLElement>;
  lastAutocompleteIndex = 0;
  lastAutocompletePrefix = '';

  constructor(win: TerminalWindow, shell: BrowserShell, _options: any = {}) {
    this.win = win;
    this.shell = shell;
    this.$body = win.$body;
    this.$body.append(`
    <div id='terminal-app'>
      <div class='output'></div>
      <div class='prompt-wrapper'>
        <span class='prompt'>$</span>
        <span class='prompt-info'></span>
        <textarea spellcheck='false' autocorrect='false'></textarea>
      </div>
      <div class='history-preview'></div>
    </div>`);
    this.$output = this.$body.find(".output");
    this.$textarea = this.$body.find("textarea");
    // Clicking anywhere on terminal focuses prompt
    // XXX(5/27/24): shouldn't keep focusing when trying to select/copy stuff
    const focusPrompt = () => {
      this.focusPrompt();
      this.$body.off('click', focusPrompt);
    }
    this.$body.on('click', focusPrompt);
    this.history = new History(this.$body);
    this.setupCommands();
    this.handleInput();
  }

  // Add predefined aliases
  setupCommands() {
    Object.entries(this.bin).forEach(([cmd, opts]) => {
      if (opts.alias)
        opts.alias.forEach(alias => this.defineAlias(alias, cmd));
    });
  }

  /** Clear shell output */
  clear() {
    this.history.clearPreview();
    this.$output.empty();
  }

  /** Hide terminal prompt */
  hidePrompt() {
    this.$body.find(".prompt, textarea").hide();
  }

  /** Show terminal prompt and focus it */
  showPrompt() {
    this.$body.find(".prompt, textarea").show().trigger('focus');
  }

  /** Focus terminal prompt */
  focusPrompt() {
    this.$textarea.trigger('focus');
  }

  /** Hide terminal */
  hide() {
    this.shell.hideTerminal();
  }

  /** Show terminal */
  show() {
    this.shell.showTerminal();
  }

  /** Toggle terminal fullscreen */
  toggleFullscreen() {
    this.win?.toggleFullscreen();
  }

  /** Clear terminal input */
  clearInput() {
    this.history.clearPreview();
    this.setVal('');
  }

  /** Un/define aliases */
  defineAlias(alias: string, cmd?: string) {
    if (cmd && !this.bin[cmd]) {
      this.error(`unknown command: '${cmd}'`);
    } else {
      const prev = this.alias[alias];
      if (cmd && cmd === prev) return;
      if (cmd && prev)
        this.error(`Overwritting alias ${alias}=${cmd} (previous: ${prev})`);
      if (prev)
        this.bin[prev].alias = this.bin[prev]?.alias.filter((a) => a !== alias);
      if (!cmd) {
        delete this.alias[alias];
      } else {
        this.alias[alias] = cmd;
        this.bin[cmd].alias ||= [];
        if (!this.bin[cmd].alias.includes(alias))
          this.bin[cmd].alias.push(alias);
      }
    }
  }

  /** Handle line editing commands */
  handleEdit(e: JQuery.KeyDownEvent): boolean {
    let pos = 0;
    if (e.altKey && e.ctrlKey) {
      switch (e.code) {
        case "KeyK": // C-M-k clear terminal
          this.clear();
          break;
      }
    } else if (e.altKey) {
      let dx = 1;
      switch (e.code) {
        case "KeyB": // backward word
          dx = -1;
          break;
        case "KeyF": // forward word
          break;
        default:
          return false;
      }
      const text = this.val();
      const n = text.length;
      pos = this.$textarea[0].selectionStart;
      while (pos > 0 && pos < n && text[pos] === ' ')
        pos += dx;
      pos += dx;
      while (pos > 0 && pos < n && text[pos] !== ' ')
        pos += dx;
      pos = Math.max(pos, 0);
    } else if (e.ctrlKey) {
      let dx = 1;
      switch (e.code) {
        case "KeyB": // backward char
          dx = -1;   // fallthrough...
        case "KeyF": // forward char
          pos = this.$textarea[0].selectionStart + dx;
          break;
        case "KeyE": // end of line
          pos = this.$textarea[0].textLength;
          break;
        case "KeyA": // beginning of line
          pos = 0;
          break;
        case "KeyK": // kill to end of line
          pos = -1;
          this.setVal(this.val().substring(0, this.$textarea[0].selectionStart));
          this.history.clearPreview();
          break;
        default:
          return false;
      }
    } else {
      return false;
    }
    e.preventDefault();
    if (pos >= 0)
      this.$textarea[0].setSelectionRange(pos, pos);

    return true;
  }

  /** Handle keys in terminal */
  handleInput() {
    this.$textarea.on("keydown", async (e: JQuery.KeyDownEvent) => {
      if (this.handleEdit(e))
        return;
      let propagate = false;
      let autocompleteIndex = 0;
      let autocompletePrefix = '';

      const key = e.altKey
        ? (e.code === "KeyP" ? "ArrowUp" : e.code === "KeyN" ? "ArrowDown" : e.code)
        : e.code;

      switch (key) {
        case "Enter":
          await this.process();
          break;

        case "ArrowUp":
          e.preventDefault();
          this.history.show('prev');
          break;

        case "ArrowDown":
          e.preventDefault();
          this.history.show('next');
          break;

        case "ArrowLeft":
        case "ArrowRight":
          propagate = true;
          break;

        case "Tab":
          const val = this.val();
          const tokens = val.split(/[^a-zA-Z0-9_-]+/);
          let lastToken = tokens[tokens.length - 1];
          const rest = val.slice(0, val.length - lastToken.length);
          if (lastToken.length > 0) {
            lastToken = this.lastAutocompletePrefix || lastToken;
            autocompletePrefix = lastToken;
            const matches = Object.keys(this.bin)
              .filter(key => key.indexOf(lastToken) === 0);
            if (matches.length > 0) {
              this.setVal(
                rest + matches[this.lastAutocompleteIndex % matches.length]
              );
              autocompleteIndex = this.lastAutocompleteIndex + 1;
            }
          }
          break;

        case "Escape":
          if (this.val()) this.clearInput();
          else this.hide();
          break;

        default:
          propagate = true;
          if (!(e.altKey || e.ctrlKey))
            this.history.clearPreview();
          break;
      }

      this.lastAutocompleteIndex = autocompleteIndex;
      this.lastAutocompletePrefix = autocompletePrefix;
      if (!propagate) e.preventDefault();
    });
  }

  setVal(newVal: string) {
    this.$textarea.val(newVal);
  }

  val(): string {
    return this.$textarea.val() as string;
  }

  /** Write error output in terminal */
  error(text: Error | string | string[]) {
    if (Array.isArray(text)) text = text.join(", ");
    else if (isError(text)) text = 'Error: ' + text.message;
    this.write(text, 'error');
  }

  /** Write OUTPUT in terminal. */
  write(output: any, cls: string, opts: Partial<ITerminalOpts> = {}) {
    const { escape, linkify, outputType } = Object.assign({}, this.opts, opts);
    switch (outputType) {
      case 'html':
        this.$output
          .append((output as JQuery<HTMLElement>).html())
          .addClass(cls);
        break;
      case 'json':
      case 'object':
      case 'string':
      case 'text':
      default:
        output?.toString().split("\n").forEach((line) => {
          this.$output.append(
            $("<div class='item'></div>")
              .html(escapeAndLinkify(line, { escape, linkify }))
              .addClass(cls));
        });
    }
    this.$output.scrollTop(this.$output[0].scrollHeight);
  }

  /** Run current terminal command-line */
  async process() {
    const text = this.val().trim();

    if (text) {
      this.write("$ " + text, 'input');
      this.clearInput();

      const env = new PipeEnv(this);
      const parser = new PipeExec(text, env);

      if (!parser.isValid()) {
        const errorMessage = parser.errors.join(", ");
        this.history.add(text, ["Error: " + errorMessage]);
        this.error(errorMessage);
        return;
      }

      this.hidePrompt();

      // Handle interrupts (C-c C-c)
      // First C-c is a 'soft' interrupt allowing commands to try to handle it
      // gracefully.
      // Second C-c force cancels all timers and closes all pipes.
      const signalHandler = (e: JQuery.KeyDownEvent) => {
        if (e.ctrlKey && e.key === "c") {
          e.preventDefault();
          this.error("^C");
          env.interrupt();
        }
      };
      this.$body.on("keydown", signalHandler);

      try {
        const stream = parser.execute();
        const outputLog: string[] = [];

        stream.onClose(async () => {
          this.$body.off("keydown", signalHandler);
          const res = await this.history.add(text, outputLog);
          env.onCommandFinish.forEach((callback) => callback(res));
          this.showPrompt();
        });

        let data: any;
        while (env.interrupted <= 1 && (data = await stream.read()) != null) {
          this.write(data, 'output');
          outputLog.push(data);
          if (outputLog.length > MAX_OUTPUT_BUFFER)
            outputLog.shift();
        }
        stream.close();
      } catch (error) {
        this.error(error);
      }
    }
  }
};
