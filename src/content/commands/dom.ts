import $ from "jquery";
import { load, loadCSS, whenTrue } from '~utils';
import { Commands } from './CommandParser';

export const domCommands: Commands = {
  text: {
    desc: "Access the page's text",
    run: (stdin, stdout, env, args) => {
      args = args || 'body';
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (selectors: string[]) => {
          selectors.forEach((selector) => {
            $(selector).each((_, item) => {
              stdout.send($(item).text());
            });
          });
          stdout.senderClose();
        });
      });
    },
  },

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

  jquery: {
    desc: "Access the page's dom",
    run: (stdin, stdout, env, args) => {
      args = args || 'body';
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (selectors: string[]) => {
          selectors.forEach((selector) => {
            $(selector).each((_, elem) => {
              stdout.send($(elem) as any);
            });
          });
          stdout.senderClose();
        });
      });
    },
  },

  selectorgadget: {
    desc: "Launch selectorGadget",
    run: (stdin, stdout, env) => {
      stdout.onReceiver(() => {
        env.terminal.hide();
        loadCSS("vendor/selectorgadget/selectorgadget_combined.css");
        load("vendor/selectorgadget/selectorgadget_combined.js", {
          callback: () => {
            // FIXME:
            // SelectorGadget.toggle();
          }
        });

        whenTrue(() =>
          $("#selectorgadget_path_field").length > 0 || env.interrupt, () => {
            let lastVal: string | null = null;
            const interval = setInterval(() => {
              const val = $("#selectorgadget_path_field").val() as string;
              if (val !== "No valid path found.") {
                lastVal = val;
              }
            }, 100);
            whenTrue(() =>
              $("#selectorgadget_path_field").length === 0 || env.interrupt, () => {
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
