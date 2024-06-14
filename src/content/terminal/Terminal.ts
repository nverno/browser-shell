import $ from 'jquery';
import { Debug, escapeAndLinkify, truncate, sendMessage, IMessage } from '~utils';
import { commands } from '~content';
import { BrowserShell } from '../BrowserShell';
import { TerminalWindow } from './TerminalWindow';
import { Commands } from '~content/exec';
import { StreamExec, StreamEnv } from '~content/exec/stream';

const debug = Debug('terminal');
const DONT_RECORD = [
  "exit", "help", "clear", "_"
].reduce((acc, s) => ({ [s]: true, ...acc }), {});
const MAX_OUTPUT_BUFFER: number = 1024

export class Terminal {
  win: TerminalWindow;
  shell: BrowserShell;
  bin: Commands<any> = commands as any;
  $body: JQuery<HTMLBodyElement>;
  $textarea: JQuery<HTMLTextAreaElement>;
  partialCmd: string | number | string[] = '';
  lastAutocompleteIndex = 0;
  lastAutocompletePrefix = '';
  $history: JQuery<HTMLElement>;
  $historyMetadata: JQuery<HTMLElement>;
  history: { command: string, output: string[] }[] = [];
  historyIndex: number;

  constructor(win: TerminalWindow, shell: BrowserShell, _options: any = {}) {
    this.win = win;
    this.shell = shell;
    this.$body = win.$body;
    this.$body.append(`
    <div id='terminal-app'>
      <div class='history'></div>
      <div class='prompt-wrapper'>
        <span class='prompt'>$</span>
        <textarea spellcheck='false' autocorrect='false'></textarea>
      </div>
      <div class='history-metadata'></div>
    </div>`);
    this.$history = this.$body.find(".history");
    this.$historyMetadata = this.$body.find(".history-metadata");
    this.$textarea = this.$body.find("textarea");
    // Clicking anywhere on terminal focuses prompt
    // XXX(5/27/24): shouldn't keep focusing when trying to select/copy stuff
    this.$body.on('click', () => this.focusPrompt());
    this.setupHistory();
    this.initInput();
  }

  hidePrompt() {
    this.$body.find(".prompt, textarea").hide();
  }

  showPrompt() {
    this.$body.find(".prompt, textarea").show().trigger('focus');
  }

  focusPrompt() {
    this.$textarea.trigger('focus');
  }

  hide() {
    this.shell.hideTerminal();
  }

  show() {
    this.shell.showTerminal();
  }

  toggleFullscreen() {
    this.win?.toggleFullscreen();
  }


  /**
   * Input
   */
  clearInput() {
    this.partialCmd = '';
    this.historyIndex = this.history.length;
    this.historyPreview(null);
    this.setVal('');
  }

  /** Line editing commands */
  handleEdit(e: JQuery.KeyDownEvent): boolean {
    let pos = 0;
    if (e.altKey) {
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
    // debug("handled edit: alt=%s ctrl=%s code=%s", e.altKey, e.ctrlKey, e.code);
    return true;
  }

  initInput() {
    this.$textarea.on("keydown", (e: JQuery.KeyDownEvent) => {
      if (this.handleEdit(e)) return;
      // debug("%o", e);

      let propagate = false;
      let autocompleteIndex = 0;
      let autocompletePrefix = '';

      const key = e.altKey
        ? (e.code === "KeyP" ? "ArrowUp" : e.code === "KeyN" ? "ArrowDown" : e.code)
        : e.code;

      switch (key) {
        case "Enter":
          this.process();
          break;

        case "ArrowUp":
          e.preventDefault();
          this.showHistory('up');
          break;

        case "ArrowDown":
          e.preventDefault();
          this.showHistory('down');
          break;

        case "ArrowRight" || "ArrowLeft":
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
          this.historyPreview(null);
          this.historyIndex = this.history.length;
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


  /** 
   * Run input
   */
  process() {
    const text = this.val().trim();

    if (text) {
      this.write("$ " + text, 'input');
      this.clearInput();

      const env = new StreamEnv(this);
      const parser = new StreamExec(text, env);

      if (!parser.isValid()) {
        const errorMessage = parser.errors.join(", ");
        this.addToHistory(text, ["Error: " + errorMessage]);
        this.error(errorMessage);
        return;
      }

      this.hidePrompt();

      const signalHandler = (e: JQuery.KeyDownEvent) => {
        if (e.ctrlKey && e.key === "c") {
          e.preventDefault();
          this.error("Caught control-c");
          env.interrupt();
        }
      };
      this.$body.on("keydown", signalHandler);

      const stream = parser.execute();
      const outputLog: string[] = [];

      stream.onCloseWrite(async () => {
        this.$body.off("keydown", signalHandler);
        const res = await this.addToHistory(text, outputLog);
        env.onCommandFinish.forEach((callback) => callback(res));
        this.showPrompt();
      });

      stream.read((data, readyForMore: () => void) => {
        this.write(data, 'output');
        outputLog.push(data);
        if (outputLog.length > MAX_OUTPUT_BUFFER)
          outputLog.shift();
        readyForMore();
      });
    }
  }

  /**
   * Output
   */
  error(text: string | string[]) {
    if (Array.isArray(text)) text = text.join(", ");
    this.write(text, 'error');
  }

  write(text: string, type: string) {
    text?.toString().split("\n").forEach((line) => {
      this.$history.append(
        $("<div class='item'></div>")
          .html(escapeAndLinkify(line))
          .addClass(type)
      );
    });
    this.$history.scrollTop(this.$history[0].scrollHeight);
  }


  /** 
   * History 
   */
  setupHistory() {
    this.remote({
      target: 'history',
      command: 'getHistory',
      payload: {}
    })
      .then(data => {
        debug('loaded history: %O', data);
        const commandHistory = data.commandHistory || [];

        if (!this.history.length) {
          for (let { command, output } of commandHistory) {
            this.history.unshift({
              command,
              output: output.split("\n")
            });
          }
          this.historyIndex = this.history.length;
        }
      })
      .catch(errors => this.error(errors));

    debug('setup storage.onChanged listener');
    // Listen for changes to history from other tabs and such
    chrome.storage.onChanged.addListener((changes, area) => {
      debug('storage change: %s, %o', area, changes);
      if (area === 'local' && changes.commandHistory) {
        debug('history changes: %O', changes.commandHistory);
        // TODO(6/15/24): update history
      }
    });
  }

  async remote(message: IMessage): Promise<any> {
    message.target ||= 'history';
    debug('remote: %o', message);

    try {
      const res = await sendMessage(message);
      return res;
    } catch (errors) {
      this.error(errors);
    }
  }

  // Handle history storage in background
  async addToHistory(command: string, output: string[]): Promise<any> {
    if (DONT_RECORD[command])
      return;
    this.history.push({ command, output });
    this.historyIndex = this.history.length;
    return this.remote({
      command: 'addCommand',
      payload: { command, output: output.join("\n") }
    });
  }

  clear() {
    this.$history.empty();
  }

  historyPreview(output: string[] | null, index: number = 1) {
    if (output) {
      this.$historyMetadata.html(
        `output#${index}: ` +
        escapeAndLinkify(truncate(output.join(", "), 100))).show();
    } else {
      this.$historyMetadata.hide();
    }
  }

  showHistory(change: string) {
    if (change === 'up') {
      if (this.historyIndex === this.history.length) this.partialCmd = this.val();
      this.historyIndex -= 1;
      if (this.historyIndex < 0) this.historyIndex = 0;
      if (this.history[this.historyIndex]) {
        this.$textarea.val(this.history[this.historyIndex].command);
        this.historyPreview(
          this.history[this.historyIndex].output,
          this.history.length - this.historyIndex
        );
      }
    } else {
      this.historyIndex += 1;
      if (this.historyIndex === this.history.length) {
        this.$textarea.val(this.partialCmd);
        this.historyPreview(null);
      } else if (this.historyIndex > this.history.length) {
        this.historyIndex = this.history.length;
      } else {
        if (this.history[this.historyIndex]) {
          this.$textarea.val(this.history[this.historyIndex].command);
          this.historyPreview(
            this.history[this.historyIndex].output,
            this.history.length - this.historyIndex
          );
        }
      }
    }
  }
}
