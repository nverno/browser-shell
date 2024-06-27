import { Debug, fmtHelp, pick } from '~utils';
import { Commands, ArgsOrStdin } from '~content/exec';

const debug = Debug('cmd:base');

export const baseCommands: Commands = {
  help: {
    desc: "Show help",
    help: ["help [commands] - show help for COMMANDS"],
    run: async (env, stdin, stdout, args) => {
      if (args && args === '-l') {
        stdout.write(Object.keys(env.bin));
        stdout.close();
        return;
      }
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'help',
        flatten: true,
        splitStdin: ' ',
      });
      let cmds = await input.readAll();
      const details = cmds.length > 0;
      cmds = Object.entries(cmds.length > 0 ? pick(env.bin, cmds) : env.bin)
        .filter(([_, opts]: any) => opts.desc);
      cmds.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

      cmds.forEach(([cmd, opts]: any) => {
        let doc = env.pp(cmd, 'bs-keyword');
        if (opts.alias?.length > 0)
          doc += ' (' + env.pp(opts.alias, 'bs-alias', ',') + ')';
        if (env.termOpts.pretty)
          doc = `<div class="bs-col">${doc}</div>`;
        doc += ` ${opts.desc}`;

        if (details && opts.help)
          doc += "\n<div class=\"bs-usage\">" + opts
            .help.map(fmtHelp).join('\n') + '</div>';
        stdout.write(doc);
      });
      stdout.close();
    }
  },

  echo: {
    desc: "Echo input to output",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let data: any;
      while ((data = await input.read()) != null)
        stdout.write(data);
      stdout.close();
    }
  },

  tick: {
    desc: "Read once every second",
    help: ["tick [ms] - read once every MS millisecs"],
    run: async (env, stdin, stdout, args) => {
      if (stdin) {
        const ms = parseInt(args) || 1000;
        let data: any;
        while ((data = await stdin.read()) != null) {
          await new Promise((resolve) =>
            env.setTimeout(() => {
              stdout.write(data);
              resolve(null);
            }, ms, stdout.stream));
        }
      }
      stdout.close();
    },
  },

  yes: {
    desc: "Emit newline every 200ms",
    help: [
      "yes [ms=200] - emit every MS millisecs",
      "yes [ms=200] [text=\\n] - emit TEXT every MS millisecs"
    ],
    run: async (env, stdin, stdout, args) => {
      args = args?.split(' ') || []
      const ms = parseInt(args[0]) || 200;
      const text = args[1] || "\n";

      const emit = async (data: any) => {
        return new Promise((resolve, reject) => {
          env.setTimeout(() => {
            if (env.interrupted)
              reject('yes interrupted');
            else {
              stdout.write(data);
              resolve(null);
            }
          }, ms, stdout.stream);
        });
      };

      while (!(env.interrupted > 0 || stdout.isClosed())) {
        try {
          const data = stdin ? await stdin.read() : text;
          await emit(data);
        } catch (error) {
          env.terminal.error(error);
          console.error(error);
          break;
        }
      }
      stdout.close();
    },
  },

  pbcopy: {
    desc: "Copy to clipboard",
    run: async (env, stdin, stdout, args) => {
      const data = await (new ArgsOrStdin(env, stdin, args)).readAll();
      try {
        await navigator.clipboard.writeText(data.join("\n"));
        // FIXME(6/22/24): write to stderr
        env.terminal.error('copied to clipboard');
      } catch (error) {
        env.fail(error);
      }
      stdout.close();
    },
  },

  pbpaste: {
    desc: "Pull data from the clipboard",
    run: async (_env, _stdin, stdout, _args) => {
      (await navigator.clipboard.readText())
        .split("\n")
        .forEach(line => stdout.write(line));
      stdout.close();
    },
  },
};
export default baseCommands;
