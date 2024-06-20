import { isString, Debug, sendMessage, pick, flatten } from '~utils';
import { Command } from '~content/exec';
import { Pipe } from '~content/io';
import { PipeEnv } from '~content/exec/pipe';

const debug = Debug('base');


export const baseCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  help: {
    desc: "Show help",
    help: ["help [commands] - show help for COMMANDS"],
    alias: ["h"],
    run: async (env, stdin, stdout, args) => {
      args = flatten((stdin ? await stdin.readAll() as any[] : [args])
        ?.map((el) => el?.split(' ')))
        ?.filter(el => el?.length > 0);
      const details = args?.length > 0;
      const cmds = details ? pick(env.bin, args) : env.bin;

      let aliases = [];
      Object.entries(cmds)
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
    run: async (env, stdin, stdout) => {
      if (stdin) await stdin.readAll();
      stdout.close();
      env.terminal.clear();
    },
  },

  history: {
    desc: 'Show command history',
    help: ['history [index] - print output of command history[INDEX]'],
    run: async (env, stdin, stdout, args) => {
      if (stdin) await stdin.readAll();
      if (args) {
        const idx = parseInt(args);
        stdout.write(env.terminal.history.history[idx]?.output);
      } else {
        env.terminal.history.history.forEach((hist, idx) =>
          stdout.write(`[${idx}] ${hist.command}`));
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
      debug('args: %o', args);
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
      if (stdin) {
        while (!env.interrupted) {
          try {
            stdout.write(await stdin.read());
          } catch (error) {
            break;
          }
        }
        if (env.interrupted) debug('echo interrupted..');
      } else if (args) {
        [args].forEach((arg: any) => stdout.write(arg));
      }
      stdout.close();
    }
  },

  // _: {
  //   desc: "Access the previous command's output",
  //   run: async (env, stdin, stdout, args) => {
  //     stdout.onRead(() => {
  //       env.argsOrStdin([args], stdin, (back) => {
  //         (env.terminal.history[env.terminal.historyIndex -
  //           parseInt(back[0])]?.output || [])
  //           .forEach((line) => {
  //             stdout.write(line);
  //           });
  //         stdout.closeWrite();
  //       });
  //     });
  //   },
  // },

  // grep: {
  //   desc: "Search for lines matching a pattern",
  //   run: (env, stdin, stdout, args) => {
  //     if (!stdin)
  //       return env.fail(stdout, "stdin required for grep");

  //     const pattern = new RegExp(args, 'i');
  //     stdout.onRead(() => {
  //       stdin.onCloseWrite(() => stdout.closeWrite());

  //       stdin.read((text, readyForMore) => {
  //         const matches = (String(text).split("\n").filter((line) => line.match(pattern)));
  //         if (matches.length > 0) {
  //           matches.forEach((line, index) => {
  //             if (index === matches.length - 1) {
  //               stdout.write(line, readyForMore);
  //             } else {
  //               stdout.write(line);
  //             }
  //           });
  //         } else {
  //           readyForMore();
  //         }
  //       });
  //     });
  //   },
  // },

  // collect: {
  //   desc: "Grab all input into an array",
  //   run: (env, stdin, stdout, args) => {
  //     stdout.onRead(() => {
  //       env.argsOrStdin([args], stdin, (rows) => {
  //         stdout.write(rows);
  //         stdout.closeWrite();
  //       });
  //     });
  //   },
  // },

  // tick: {
  //   desc: "Read once per second",
  //   run: (env, stdin, stdout, args) => {
  //     if (!stdin)
  //       return env.fail(stdout, "stdin required for tick");

  //     const ms = parseInt(args) || 500;
  //     stdout.onRead(() => {
  //       stdin.onCloseWrite(() => stdout.closeWrite());
  //       stdin.read((line, readyForMore) => {
  //         stdout.write(line);
  //         env.setTimeout(() => {
  //           if (env.interrupted) {
  //             debug('tick sees interrupted');
  //             stdout.closeWrite();
  //           } else {
  //             readyForMore();
  //           }
  //         }, ms, stdout);
  //       });
  //     });
  //   },
  // },

  // yes: {
  //   desc: "Emit the given text continuously",
  //   run: (env, stdin, stdout, args) => {
  //     const ms = parseInt(args) || 50;
  //     stdout.onRead(() => {
  //       env.argsOrStdin([args], stdin, (text) => {
  //         const emit = () => {
  //           env.setTimeout(() => {
  //             if (env.interrupted) {
  //               stdout.closeWrite();
  //             } else {
  //               stdout.write(text[0], emit);
  //             }
  //           }, ms, stdout);
  //         };
  //         emit();
  //       });
  //     });
  //   },
  // },

  // pbcopy: {
  //   desc: "Put data into the clipboard",
  //   run: (env, stdin, stdout, args) => {
  //     stdout.onRead(() => {
  //       env.argsOrStdin([args], stdin, (lines) => {
  //         navigator.clipboard.writeText(lines.join("\n"))
  //           .then(() => {
  //             debug("copied");
  //             stdout.closeWrite();
  //           });
  //       });
  //     });
  //   },
  // },

  // pbpaste: {
  //   desc: "Pull data from the clipboard",
  //   run: (_env, _stdin, stdout, _args) => {
  //     stdout.onRead(() => {
  //       navigator.clipboard.readText()
  //         .then(clipText => {
  //           clipText.split("\n").forEach(line => stdout.write(line));
  //           stdout.closeWrite();
  //         });
  //     });
  //   },
  // },

  // bgPage: {
  //   desc: "Manually execute a background page command",
  //   run: (env, stdin, stdout, args) => {
  //     args = args || 'listCommands'
  //     stdout.onRead(() => {
  //       env.argsOrStdin([args], stdin, async (cmdLine) => {
  //         const [cmd, ...rest] = cmdLine[0].split(" ");
  //         if (!cmd || cmd.length === 0) {
  //           return env.fail(stdout, "missing command");
  //         }
  //         const payload: { [key: string]: string } = {};
  //         rest.forEach((segment: string) => {
  //           const [k, v] = [
  //             segment.slice(0, segment.indexOf(':')),
  //             segment.slice(segment.indexOf(':') + 1)
  //           ];
  //           payload[k] = v;
  //         });
  //         const res = await sendMessage({
  //           target: cmd === 'callServer' ? 'server' : 'background',
  //           command: cmd,
  //           payload,
  //         });
  //         if (res?.errors) {
  //           env.fail(stdout, res.errors);
  //         } else {
  //           stdout.write(JSON.stringify(res));
  //           stdout.closeWrite();
  //         }
  //       });
  //     });
  //   },
  // },

  // eval: {
  //   desc: "Eval javascript code",
  //   run: (env, stdin, stdout, args) => {
  //     stdout.onRead(() => {
  //       env.argsOrStdin([args], stdin, (code) => {
  //         stdout.write(eval(code));
  //         stdout.closeWrite();
  //       });
  //     });
  //   },
  // },

};
export default baseCommands;
