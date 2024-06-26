import { Debug, isEmpty, sendMessage, pick, debugEnable } from '~utils';
import { Command } from '~content/exec';
import { Pipe } from '~content/io';
import { ArgsOrStdin, PipeEnv } from '~content/exec/pipe';

const debug = Debug('cmd:base');

export const baseCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  help: {
    desc: "Show help",
    help: ["help [commands] - show help for COMMANDS"],
    alias: ["h"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, { flatten: true, splitStdin: ' ' });
      const cmds = await input.readAll();
      const details = cmds.length > 0;
      let aliases = [];
      Object.entries(cmds.length > 0 ? pick(env.bin, cmds) : env.bin)
        .filter(([_, opts]: any) => opts.desc)
        .forEach(([cmd, opts]: any) => {
          let doc = `${cmd}\t\t${opts.desc}`;
          if (opts.alias?.length > 0) {
            doc += ` (${opts.alias})`;
            aliases = aliases.concat(opts.alias);
          }
          if (details && opts.help)
            doc += "\n\t" + opts.help.join("\n\t");
          stdout.write(doc);
        });
      if (aliases.length > 0)
        stdout.write(`Aliases: ${aliases.join(", ")}`);
      stdout.close();
    }
  },

  exit: {
    desc: "Close the terminal",
    run: async (env, stdin, stdout) => {
      if (stdin) await stdin.readAll();
      stdout.close();
      env.terminal.hide();
    },
  },

  clear: {
    desc: "Clear the terminal",
    help: ["clear history - clear history"],
    run: async (env, stdin, stdout, args) => {
      if (stdin) await stdin.readAll();
      if (args === 'history')
        env.terminal.history.clear();
      else
        env.terminal.clear();
      stdout.close();
    },
  },

  history: {
    desc: 'Show command history',
    help: ['history [index] - print output of command history[INDEX]'],
    alias: ['hist'],
    run: async (env, stdin, stdout, args) => {
      if (stdin) await stdin.readAll();
      if (args) {
        const idx = parseInt(args);
        stdout.write(env.terminal.history.get(idx)?.output);
      } else {
        for (const { history, index } of env.terminal.history)
          stdout.write(`[${index}] ${history.command}`);
      }
      stdout.close();
    }
  },

  alias: {
    desc: 'Show command aliases',
    help: [
      'alias <alias> <command> - define ALIAS for COMMAND',
      'alias <alias> - undefine ALIAS',
    ],
    run: async (env, stdin, stdout, args) => {
      args = (stdin ? await stdin.readAll() as any[] : [args])
        ?.map((arg) => arg?.split(' ').filter((el) => el.length > 0))
        ?.filter((el) => el?.length > 0);

      if (!args || args.length === 0) {
        Object.entries(env.terminal.alias).forEach(([alias, cmd]) => {
          stdout.write(`alias ${alias}=${cmd}`);
        });
      } else {
        args.forEach(([a, c]) => env.terminal.defineAlias(a, c));
      }
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

  _: {
    desc: "Access the previous command's output",
    run: async (env, stdin, stdout, args) => {
      if (stdin) await stdin.readAll();
      const idx = parseInt(args) || 1;
      env.terminal.history.get(-idx)?.output.forEach((line) => {
        stdout.write(line);
      });
      stdout.close();
    }
  },

  grep: {
    desc: "Search for lines matching a pattern",
    help: [
      "grep [-si] <pattern> ...rest - find matches for pattern in REST.",
      "  Flags: i => ignore case, s => enclose matches in html span elements for highlighting",
    ],
    run: async (env, stdin, stdout, args) => {
      debugger;
      
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'grep',
        requiredArgs: 1,
        flags: 'si',
      });
      const [pattern] = await input.readRequired();
      if (!pattern)
        return env.fail('grep missing regexp pattern', stdout);

      const highlight = input.flag('s');
      const flags = (highlight ? 'g' : '') + (input.flag('i') ? 'i' : '');
      const re = new RegExp(pattern, flags);

      debug(`grep: re=${re}, highlight=${highlight}, flags=${flags}`);

      let text: any;
      while ((text = await input.read()) != null) {
        String(text)
          .split("\n")
          .filter((line) => re.test(line))
          .forEach(line => {
            stdout.write(
              highlight
                ? line.replaceAll(re, (m) => `<span class="match">${m}</span>`)
                : line
            );
          });
      }
      stdout.close();
    },
  },

  // highlight: {
  //   desc: 'Highlight text matching a pattern',
  //   run: async (env, stdin, stdout, args) => {
  //     const input = new ArgsOrStdin(env, stdin, args);
  //     const pattern = await input.read();
  //     if (!pattern)
  //       return env.fail('grep missing regexp pattern', stdout);
  //   },
  // },

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

  debug: {
    desc: "Debug settings (blocks)",
    help: [
      'debug enabled [prefix:"bs:*"] - test is logging is enabled for PREFIX',
      'debug enable [prefix:"bs:*"] - enable logging for modules with PREFIX',
      'debug disable - disable debug logging'
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, { requiredArgs: 1 });
      args = await input.readAll();
      if (args.length < 1)
        return env.fail('missing debug argument', stdout);
      let check = false;
      switch (args[0]) {
        case 'disable':
          stdout.write(`debug disabled (was '${debugEnable()}')`);
          break;
        case 'enabled':                           // fall-through
          check = true;
        case 'enable':
          const pre = args[1]
            ? (args[1].indexOf(':') === -1 ? 'bs:' : '') + args[1]
            : 'bs:*';
          const res = debugEnable(pre, check);
          stdout.write(
            `debug ${(check && !res) ? "NOT " : ""}enabled for '${pre}'`
          );
          break;
        default:
          return env.fail(`unknown debug args: ${args.join(" ")}`, stdout);
      }
      stdout.close();
    }
  },

  yes: {
    desc: "Emit newline every 200ms",
    help: [
      "yes [ms:200] - emit every MS millisecs",
      "yes [ms:200] [text:\"\\n\"] - emit TEXT every MS millisecs"
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

  bg: {
    desc: "Send command to background",
    help: [
      "bg [target]:[command] [args...] - send COMMAND to TARGET",
      "   ARGS can be key-value pairs with syntax <key>:<value>",
    ],
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = 'background:listCommands';
      const input = new ArgsOrStdin(env, stdin, args, { requiredArgs: 1 });
      const [cmd] = await input.readRequired();
      const [target, command] = cmd.split(/\s*:\s*/);
      if (!(target && command))
        return env.fail('missing target:command', stdout);
      debug("cmd: %o, target: %o, command: %o", cmd, target, command)

      const payload = (await input.readAll()).reduce((acc: any, kv: string) => {
        const [k, v] = kv.split(':');
        return { [k]: v, ...acc };
      }, {});

      const res = await sendMessage({ target, command, payload });
      if (!isEmpty(res?.errors)) {
        env.terminal.error(res.errors);
      } else {
        stdout.write(JSON.stringify(res));
      }
      stdout.close();
    },
  },
};
export default baseCommands;
