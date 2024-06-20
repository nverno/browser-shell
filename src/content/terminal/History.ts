import { Debug, IMessage, escapeAndLinkify, sendMessage, truncate } from '~utils';
import { Terminal } from './Terminal';

const debug = Debug('history');

const DONT_RECORD = [
  "exit", "help", "clear", "_", 'alias', 'history',
].reduce((acc, s) => ({ [s]: true, ...acc }), {});


/** 
 * Shell history management
 */
export class History {
  $textarea: JQuery<HTMLTextAreaElement>;
  $preview: JQuery<HTMLElement>;
  history: { command: string, output: string[] }[] = [];
  index: number;
  partialCmd: string | number | string[] = '';

  constructor($body: JQuery<HTMLBodyElement>) {
    this.$preview = $body.find(".history-preview");
    this.$textarea = $body.find("textarea");
    this.setup();
  }

  clearPreview() {
    this.partialCmd = '';
    this.setIndex();
    this.preview(null);
  }

  setIndex(idx?: number) {
    this.index = idx || this.history.length;
  }

  /** Show preview of history in shell */
  preview(output: string[] | null, index: number = 1) {
    if (output) {
      this.$preview.html(
        `output#${index}: ` +
        escapeAndLinkify(truncate(output.join(", "), 100))).show();
    } else {
      this.$preview.hide();
    }
  }

  /** Update history in shell according to CHANGE */
  show(change: 'prev' | 'next') {
    const dx = change === 'prev' ? -1 : 1;
    const n = this.history.length;
    if (dx === -1 && this.index === 0) return;
    if (dx === -1 && this.index === n)
      this.partialCmd = this.$textarea.val();

    if (dx === 1 && this.index === n) {
      this.$textarea.val(this.partialCmd);
      this.preview(null);
    } else {
      this.index += dx;
      if (this.history[this.index]) {
        this.$textarea.val(this.history[this.index].command);
        this.preview(this.history[this.index].output, n - this.index);
      }
    }
  }

  /** Send message to background history handler */
  async send(message: IMessage): Promise<any> {
    message.target ||= 'history';
    debug('send %o', message);
    try {
      const res = await sendMessage(message);
      return res;
    } catch (errors) {
      console.error(errors);
    }
  }

  /** Load history from local storage and keep in-sync with any subsequent changes */
  async setup() {
    chrome.storage.onChanged.addListener((changes, area) => {
      // debug('storage change: %s, %o', area, changes);
      if (area === 'local' && changes.commandHistory) {
        debug('history changes: %O', changes.commandHistory);
        const { newValue } = changes.commandHistory;
        // FIXME(6/21/24): what if history is erased?
        while (this.index < newValue.length) {
          const { command, output } = newValue[this.index];
          this.history.push({
            command,
            output: output.split("\n"),
          });
          this.index++;
        }
      }
    });

    const data = await this.send({
      command: 'getHistory',
      payload: {}
    });
    debug('loaded history: %O', data.history);

    const commandHistory = data?.history ?? [];
    if (!this.history.length) {
      for (const { command, output } of commandHistory) {
        this.history.push({
          command,
          output: output.split("\n")
        });
      }
      this.index = this.history.length;
    }
  }

  /** Send message to background to store command */
  async add(command: string, output: string[]): Promise<any> {
    if (DONT_RECORD[command])
      return;
    this.history.push({ command, output });
    this.setIndex();
    return this.send({
      command: 'addCommand',
      payload: { command, output: output.join("\n") },
    });
  }
};

export default History;
