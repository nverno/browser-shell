import $ from "jquery";
import { Debug, sendMessage, evaluateXpath } from '~utils';
import { Command } from '~content/exec';
import { ArgsOrStdin, PipeEnv } from "~content/exec/pipe";
import { Pipe } from "~content/io";

const debug = Debug('cmd:dom');


export const domCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  selection: {
    desc: "Get the current document selection",
    run: async (_env, _stdin, stdout) => {
      document.getSelection()?.toString().split("\n").forEach((line) => {
        stdout.write(line);
      });
      stdout.close();
    },
  },

  text: {
    desc: "Access the page's text",
    help: ["text [SELECTOR...] - try to get text for SELECTORS"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args || 'body');
      let selector: any;
      while (!env.interrupted && (selector = await input.read()) != null) {
        try {
          $(selector).each((_, elem) => {
            stdout.write($(elem).text());
          });
        } catch (error) {
          env.terminal.error(error);
        }
      }
      stdout.close();
    },
  },

  '.': {
    desc: "Extract element attributes (ex. jquery a | . href)",
    help: ['. [attrs...] - extract ATTRS attributes from inputs'],
    run: async (env, stdin, stdout, args) => {
      if (!stdin) {
        stdout.close();
        return;
      }
      args = args?.split(' ') || [];
      if (args.length === 0)
        env.fail('missing attrs');

      let elem: any;
      while (!env.interrupted && (elem = await stdin.read()) != null) {
        const res = [];
        args.forEach((attr: string) => {
          try {
            res.push($(elem).attr(attr));
          } catch (error) {
            env.terminal.error(error);
          }
        });
        if (res.length > 0)
          stdout.write(res);
      };
      stdout.close();
    }
  },

  xpath: {
    desc: 'Return nodes matching xpath query',
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args || '//body');
      let query: any;
      while ((query = await input.read()) != null) {
        try {
          stdout.write(evaluateXpath(query, document));
        } catch (error) {
          env.terminal.error(error);
        }
      }
      stdout.close();
    },
  },

  jquery: {
    desc: "Access the page's dom",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args?.length > 0 ? args : 'body');
      let selector: any;
      while ((selector = await input.read()) != null) {
        try {
          $(selector).each((_, elem) => stdout.write(elem));
        } catch (error) {
          env.terminal.error(error);
        }
      }
      stdout.close();
    }
  },

  expandpath: {
    desc: "Expand relative urls",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let url: string;
      while ((url = await input.read()) != null) {
        stdout.write(url.startsWith("//")
          ? "https:" + url
          : url.startsWith("/") ? `${location.origin}${url}` : url
        );
      }
      stdout.close();
    },
  },

  download: {
    desc: "Download urls",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let url: any;
      while ((url = await input.read()) != null) {
        const id = await sendMessage({
          command: 'download',
          payload: { url },
        });
        stdout.write(id);
      }
      stdout.close();
    }
  },

  selectorgadget: {
    desc: "Launch selectorGadget",
    run: async (env, stdin, stdout, args) => {
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

      const waitUntil = async (check: () => boolean, ms = 100): Promise<boolean> => {
        return new Promise(resolve => {
          setTimeout(() => {
            const res = env.interrupted > 0 || check();
            resolve(res);
          }, ms);
        });
      };

      await waitUntil(() => $("#selectorgadget_path_field").length > 0);
      let lastVal: string;
      const [timerId, _] = env.setInterval(() => {
        const val = $("#selectorgadget_path_field").val() as string;
        if (val !== "No valid path found.") {
          lastVal = val;
        }
      });

      await waitUntil(() => $("#selectorgadget_path_field").length === 0);
      env.clearTimer(timerId as any);
      env.terminal.show();
      stdout.write(lastVal || 'unknown');
      stdout.close();
    }
  }
};

export default domCommands;
