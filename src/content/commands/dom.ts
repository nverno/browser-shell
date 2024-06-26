import { Debug, sendMessage, evaluateXpath, domain, pollUntil } from '~utils';
import { ArgsOrStdin, PipeEnv, Command } from '~content/exec';
import { Pipe } from "~content/io";

const debug = Debug('cmd:dom');

export const domCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  domain: {
    desc: "Get Current domain",
    run: async (_env, _stdin, stdout, _args) => {
      stdout.write(domain());
      stdout.close();
    }
  },

  selection: {
    desc: "Get the current document selection (ignores stdin)",
    run: async (_env, _stdin, stdout) => {
      document.getSelection()?.toString().split("\n").forEach((line) => {
        stdout.write(line);
      });
      stdout.close();
    },
  },

  xpath: {
    desc: 'Run Xpath query',
    help: ["xpath [path='//body'] - get nodes matching PATH"],
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

  selectorgadget: {
    desc: "Launch selectorGadget",
    run: async (env, stdin, stdout, args) => {
      await (new ArgsOrStdin(env, stdin, args)).readAll();

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

      const getPath = () =>
        document.getElementById("selectorgadget_path_field") as HTMLInputElement;

      await pollUntil(async () => env.interrupted > 0 || !!getPath());

      let path = '';
      const [tid, _] = env.setInterval(() => {
        const val = getPath()?.value;
        if (val && val !== "No valid path found.") {
          path = val;
        }
      }, 50);

      await pollUntil(async () => env.interrupted > 0 || !getPath());
      env.clearTimer(tid as number);
      env.terminal.show();

      if (path) {
        stdout.write(path);
      } else {
        env.terminal.error('selectorgadget results unknown');
      }
      stdout.close();
    }
  }
};

export default domCommands;
