import $ from 'jquery';
import { Debug, escapeAndLinkify, truncate, remoteCommand } from '~utils';
import { CommandParser, Commands, commands, type CommandEnvOpt } from '~content';
import { BrowserShell } from '../BrowserShell';
import { TerminalWindow } from './TerminalWindow';

const debug = Debug('terminal');
const DONT_RECORD = ["help", "_"].reduce((acc, s) => ({ [s]: true, ...acc }), {});
const MAX_OUTPUT_BUFFER: number = 1024

export class Terminal {
  win: TerminalWindow;
  shell: BrowserShell;
  bin: Commands = commands;
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
    this.setupBin();
    this.setupNewTerminalSession();
    this.initInput();
  }

  setupBin() {
    debug('Bin: %O', this.bin);
  }

  setupNewTerminalSession() {
    this.remote('getHistory', {}, (response: any) => {
      debug('setup history: %O', response);
      if (!this.history.length) {
        for (let command of response.commands) {
          this.history.unshift({
            command: command.command,
            output: command.output.split("\n")
          });
        }
        this.historyIndex = this.history.length;
      }
    });
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

  showHistory(change: string) {
    debug('history: %O', this.history);
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
    debug("handled edit: alt=%s ctrl=%s code=%s", e.altKey, e.ctrlKey, e.code);
    return true;
  }

  initInput() {
    this.$textarea.on("keydown", (e: JQuery.KeyDownEvent) => {
      if (this.handleEdit(e)) return;
      debug("%o", e);
      
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

  historyPreview(output: string[] | null, index: number = 1) {
    if (output) {
      this.$historyMetadata.html(
        `output#${index}: ` +
          escapeAndLinkify(truncate(output.join(", "), 100))).show();
    } else {
      this.$historyMetadata.hide();
    }
  }

  process() {
    const text = this.val().trim();

    if (text) {
      this.write("$ " + text, 'input');
      this.clearInput();

      const env: CommandEnvOpt = {
        terminal: this,
        onCommandFinish: [],
        bin: this.bin,
        interrupt: false,
      };

      const parser = new CommandParser(text, env);

      if (!parser.isValid()) {
        const errorMessage = parser.errors.join(", ");
        this.recordCommand(text, ["Error: " + errorMessage]);
        this.error(errorMessage);
        return;
      }

      this.hidePrompt();

      const signalHandler = (e: JQuery.KeyDownEvent) => {
        if (e.ctrlKey && e.key === "c") {
          e.preventDefault();
          this.error("Caught control-c");
          env.interrupt = true;
        }
      };
      this.$body.on("keydown", signalHandler);

      const stream = parser.execute();
      const outputLog: string[] = [];

      stream.onSenderClose(() => {
        this.$body.off("keydown", signalHandler);
        this.recordCommand(text, outputLog, (response: any) => {
          env.onCommandFinish.forEach((callback) => callback(response));
        });
        this.showPrompt();
      });

      stream.receive((text: string, readyForMore: () => void) => {
        this.write(text, 'output');
        outputLog.push(text);
        if (outputLog.length > MAX_OUTPUT_BUFFER)
          outputLog.shift();
        readyForMore();
      });
    }
  }

  error(text: string | string[]) {
    if (Array.isArray(text)) text = text.join(", ");
    this.write(text, 'error');
  }

  write(text: string, type: string) {
    text.toString().split("\n").forEach((line) => {
      this.$history.append(
        $("<div class='item'></div>")
          .html(escapeAndLinkify(line))
          .addClass(type)
      );
    });
    this.$history.scrollTop(this.$history[0].scrollHeight);
  }

  recordCommand(command: string, output: string[], callback?: (response: any) => void) {
    if (DONT_RECORD[command])
      return;
    this.history.push({ command, output });
    this.historyIndex = this.history.length;
    this.remote('recordCommand', { command, output: output.join("\n") }, callback);
  }

  remote(
    cmd: string,
    options: any,
    callback: (response: any) => void = (response) => {
      if (response.errors) this.error(response.errors);
    }) {
      debug('send background: %s, %o, %O', cmd, options, callback);
      remoteCommand(cmd, options, callback);
    }

  clear() {
    this.$history.empty();
  }

  hide() {
    this.shell.hideTerminal();
  }

  show() {
    this.shell.showTerminal();
  }
}
