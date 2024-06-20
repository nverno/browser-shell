import $ from "jquery";
import { Debug, sendMessage, evaluateXpath } from '~utils';
import { Commands } from './types';
import { StreamEnv } from "~content/exec/stream";
import { Stream } from "~content/io";
const debug = Debug('dom');

export const domCommands: Commands<Stream, StreamEnv> = {
  selection: {
    desc: "Get the current document selection",
    run: (env, stdin, stdout) => {
      stdout.onRead(() => {
        document.getSelection()?.toString().split("\n").forEach((line) => {
          stdout.write(line);
        });
        stdout.closeWrite();
      });
    },
  },

  text: {
    desc: "Access the page's text",
    run: (env, stdin, stdout, args) => {
      args = args || 'body';
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (selectors: string[]) => {
          selectors.forEach((selector) => {
            try {
              $(selector).each((_, elem) => {
                stdout.write($(elem).text());
              });
            } catch (error) {
              env.terminal.error(error);
            }
          });
          stdout.closeWrite();
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
      // send SIGPIPE
      stdout.onRead(() => {
        if (!args || args.length === 0)
          stdin.closeRead();
        stdin.onCloseWrite(() => stdout.closeWrite());
        stdin.read((elems, readyForMore) => {
          try {
            stdout.write($(elems).attr(args));
            readyForMore();
          } catch (error) {
            env.terminal.error(error);
            stdin.closeRead();
          }
        });
      });
    }
  },

  xpath: {
    desc: 'Return nodes matching xpath query',
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (queries: string[]) => {
          queries.forEach(query => {
            try {
              // stdout.write(evaluateXpath(query, document));
            } catch (error) {
              env.terminal.error(error);
            }
          });
        });
        stdout.closeWrite();
      });
    },
  },

  jquery: {
    desc: "Access the page's dom",
    run: (env, stdin, stdout, args) => {
      args = args || 'body'
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (selectors: string[]) => {
          selectors.forEach((selector) => {
            try {
              $(selector).each((_, elem) => {
                stdout.write(elem);
              });
            } catch (error) {
              env.terminal.error(error);
            }
          });
          stdout.closeWrite();
        });
      });
    }
  },

  expandpath: {
    desc: "Expand relative urls",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (urls) => {
          urls.forEach((url: string) => {
            stdout.write(url.startsWith("//")
              ? "https:" + url
              : url.startsWith("/")
                ? `${location.origin}${url}`
                : url);
          });
          stdout.closeWrite();
        });
      });
    },
  },

  download: {
    desc: "Download urls",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (urls) => {
          debug('Downloading: %s', urls);
          urls.forEach(async (url: string) => {
            const id = await sendMessage({
              command: 'download',
              payload: { url },
            });
            stdout.write(id);
          });
          stdout.closeWrite();
        });
      });
    }
  },

  selectorgadget: {
    desc: "Launch selectorGadget",
    run: (env, stdin, stdout) => {
      stdout.onRead(async () => {
        let SelectorGadget = (window as any)?.SelectorGadget;
        if (typeof SelectorGadget == "undefined") {
          await sendMessage({
            command: 'insertCSS',
            payload: {
              files: ["vendor/selectorgadget_combined.css"]
            },
          });
          debug('inserted selectorgadget_combined.css')
          await sendMessage({
            command: 'executeScript',
            payload: {
              target: { allFrames: true },
              files: ["vendor/selectorgadget_combined.js"],
            }
          });
          SelectorGadget = (window as any).SelectorGadget;
          debug('SelectorGadget loaded: %O', SelectorGadget);
        }

        env.terminal.hide()
        SelectorGadget.toggle({ analytics: false });

        env.whenTrue(() =>
          env.interrupted > 0 || $("#selectorgadget_path_field").length > 0,
          () => {
            let lastVal: string;
            const timerId = env.setInterval(() => {
              const val = $("#selectorgadget_path_field").val() as string;
              if (val !== "No valid path found.") {
                lastVal = val;
              }
            }, 100);
            env.whenTrue(() =>
              env.interrupted > 0 || $("#selectorgadget_path_field").length === 0,
              () => {
                env.clearTimer(timerId);
                env.terminal.show();
                stdout.write(lastVal || 'unknown');
                stdout.closeWrite();
              });
          });
      });
    },
  },
};

export default domCommands;
