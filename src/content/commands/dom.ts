import $ from "jquery";
import { Debug, whenTrue, sendMessage } from '~utils';
import { Commands } from './CommandParser';
const debug = Debug('dom');

export const domCommands: Commands = {
  selection: {
    desc: "Get the current document selection",
    run: (stdin, stdout, env) => {
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
    run: (stdin, stdout, env, args) => {
      args = args || 'body';
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (selectors: string[]) => {
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
    run: (stdin, stdout, env, args) => {
      if (!stdin) {
        env.helpers.fail(env, stdout, "stdin required");
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
    run: (stdin, stdout, env, args) => {
      args = args || 'body';
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (selectors: string[]) => {
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

  download: {
    desc: "Download urls",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (urls) => {
          debug('Downloading: %s', urls);
          urls.forEach(async (url) => {
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
    run: (stdin, stdout, env) => {
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

        whenTrue(() =>
          env.interrupt || $("#selectorgadget_path_field").length > 0,
          () => {
            let lastVal: string;
            const interval = setInterval(() => {
              const val = $("#selectorgadget_path_field").val() as string;
              if (val !== "No valid path found.") {
                lastVal = val;
              }
            }, 100);
            whenTrue(() =>
              env.interrupt || $("#selectorgadget_path_field").length === 0,
              () => {
                clearInterval(interval);
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
