import { Debug, IMessage, escapeAndLinkify, isNil, sendMessage, truncate } from '~utils';

const debug = Debug('term:history');

const DONT_RECORD = [
  "exit", "help", "clear", "_", 'alias', 'history', 'h', 'hist',
].reduce((acc, s) => ({ [s]: true, ...acc }), {});


/** 
 * Shell history management
 */
export class History {
  $textarea: JQuery<HTMLTextAreaElement>;
  $preview: JQuery<HTMLElement>;
  $promptInfo: JQuery<HTMLSpanElement>;
  history: { command: string, output: string[] }[] = [];
  index: number;
  partialCmd: string | number | string[] = '';
  filterRegex: string | null = undefined;
  filterMask: boolean[] | null = undefined;
  filterInds: number[] | null = undefined;

  constructor($body: JQuery<HTMLBodyElement>) {
    this.$preview = $body.find(".history-preview");
    this.$textarea = $body.find("textarea");
    this.$promptInfo = $body.find(".prompt-info");
    this.setup();
  }

  clearPreview() {
    this.partialCmd = '';
    this.setIndex();
    this.preview(null);
  }

  /** clear history */
  clear() {
    this.index = 0;
    this.history = [];
    this.clearFilter();
    this.send({
      command: 'clearHistory',
      payload: {},
    });
  }

  get(index: number) {
    const n = this.history.length;
    return this.history[(n + index) % n];
  }

  setIndex(idx?: number) {
    this.index = idx || this.history.length;
  }

  /** Toggle regexp filtering of history commands */
  toggleFiltering(regexp?: string) {
    if (!isNil(this.filterRegex)) {
      this.clearFilter();
    } else {
      this.filterRegex = regexp || this.$textarea.val();
      this.filterInds = []
      this.filterMask = this.history.map((h, idx) => {
        if (h.command.match(this.filterRegex)) {
          this.filterInds.push(idx);
          return true;
        }
        return false;
      });
      debug('filtering: "%s", %O', this.filterRegex, this.filterInds);
      this.index = this.filterInds.length;
      this.$promptInfo.text("/" + this.filterRegex + "/").css('margin-right', '6px');
      this.show('prev');
    }
  }

  /** Clear history filters */
  clearFilter() {
    this.filterMask = null;
    this.filterRegex = null;
    this.filterInds = null;
    this.$promptInfo.text('').css('margin-right', 0);
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
      let idx = this.index;
      if (!isNil(this.filterRegex)) {
        this.index = (this.index + this.filterInds.length) % this.filterInds.length;
        idx = this.filterInds[this.index];
      }
      if (this.history[idx]) {
        this.$textarea.val(this.history[idx].command);
        this.preview(this.history[idx].output, n - idx);
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
        // XXX(6/21/24): sync when history is removed?
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
    if (DONT_RECORD[command.split(' ')[0]])
      return;
    this.history.push({ command, output });
    this.setIndex();
    return this.send({
      command: 'addCommand',
      payload: { command, output: output.join("\n") },
    });
  }

  /** Iterator for history entries accounting for possible filtering */
  [Symbol.iterator]() {
    const history = this.history;
    const mask = this.filterMask;
    let index = history.length - 1;
    return {
      next() {
        while (index >= 0) {
          if (isNil(mask) || mask[index]) {
            return {
              value: { history: history[index], index: index-- },
              done: false
            };
          }
          index--;
        }
        return { done: true };
      }
    }
  }
};

export default History;
