import $ from "jquery";
import { Debug, whenTrue, sendMessage } from '~utils';
import { Commands } from './CommandParser';
const debug = Debug('dom');

export const domCommands: Commands = {
  selection: {
    desc: "Get the current document selection",
    run: (env, stdin, stdout) => {
      stdout.onReceiver(() => {
        document.getSelection()?.toString().split("\n").forEach((line) => {
          stdout.send(line);
        });
        stdout.senderClose();
      });
    },
  },

  text: {
    desc: "Access the page's text",
    run: (env, stdin, stdout, args) => {
      args = args || 'body';
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (selectors: string[]) => {
          selectors.forEach((selector) => {
            try {
              $(selector).each((_, elem) => {
                stdout.send($(elem).text());
              });
            } catch (error) {
              env.terminal.error(error);
            }
          });
          stdout.senderClose();
        });
      });
    },
  },

  '.': {
    desc: "Select object attrs, eg. 'jquery a | . href'",
    run: (env, stdin, stdout, args) => {
      if (!stdin) {
        env.fail(stdout, "stdin required");
        return;
      }
      stdout.onReceiver(() => {
        stdin.onSenderClose(() => stdout.senderClose());
        stdin.receive((elems, readyForMore) => {
          try {
            stdout.send($(elems).attr(args));
            readyForMore();
          } catch (error) {
            env.terminal.error(error);
            stdin.receiverClose();
          }
        });
      });
    }
  },

  jquery: {
    desc: "Access the page's dom",
    run: (env, stdin, stdout, args) => {
      args = args || 'body'
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (selectors: string[]) => {
          selectors.forEach((selector) => {
            try {
              $(selector).each((_, elem) => {
                stdout.send(elem);
              });
            } catch (error) {
              env.terminal.error(error);
            }
          });
          stdout.senderClose();
        });
      });
    }
  },

  expandpath: {
    desc: "Expand relative urls",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (urls) => {
          urls.forEach((url: string) => {
            stdout.send(url.startsWith("//")
              ? "https:" + url
              : url.startsWith("/")
                ? `${location.origin}${url}`
                : url);
          });
          stdout.senderClose();
        });
      });
    },
  },

  download: {
    desc: "Download urls",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (urls) => {
          debug('Downloading: %s', urls);
          urls.forEach(async (url: string) => {
            await sendMessage('download', { url }, (id) => {
              stdout.send(id);
            });
          });
          stdout.senderClose();
        });
      });
    }
  },
  
  selectorgadget: {
    desc: "Launch selectorGadget",
    run: (env, stdin, stdout) => {
      stdout.onReceiver(async () => {
        let SelectorGadget = (window as any)?.SelectorGadget;
        if (typeof SelectorGadget == "undefined") {
          sendMessage('insertCSS', {
            files:["vendor/selectorgadget_combined.css"]
          }, () => debug('inserted selectorgadget_combined.css'));
          await sendMessage('executeScript', {
            target: { allFrames: true },
            files: ["vendor/selectorgadget_combined.js"],
          }, (res) => {
            SelectorGadget = (window as any).SelectorGadget;
            debug('SelectorGadget loaded: %O', SelectorGadget);
          });
        }

        env.terminal.hide()
        SelectorGadget.toggle({ analytics: false });

        env.whenTrue(() =>
          env.interrupted || $("#selectorgadget_path_field").length > 0,
          () => {
            let lastVal: string;
            const timerId = env.setInterval(() => {
              const val = $("#selectorgadget_path_field").val() as string;
              if (val !== "No valid path found.") {
                lastVal = val;
              }
            }, 100);
            env.whenTrue(() =>
              env.interrupted || $("#selectorgadget_path_field").length === 0,
              () => {
                env.clearTimer(timerId);
                env.terminal.show();
                stdout.send(lastVal || 'unknown');
                stdout.senderClose();
              });
          });
      });
    },
  },
};

export default domCommands;
