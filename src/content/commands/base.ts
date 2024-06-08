import { Debug, sendMessage, pick, } from '~utils';
import { Command } from './CommandParser';

const debug = Debug('base');

export const baseCommands: { [key: string]: Command } = {
  help: {
    desc: "Show help",
    run: (env, _stdin, stdout, args) => {
      const cmds = args ? pick(env.bin, args) : env.bin;
      stdout.onReceiver(() => {
        stdout.send(Object.entries(cmds)
          .filter(([_, opts]: any) => opts.desc)
          .map(([cmd, opts]: any) => {
            let doc = `<b>${cmd}</b>\t\t${opts.desc}`;
            if (opts.alias)
              doc += `\n${opts.alias}\t\tAlias for ${cmd}`;
            return doc;
          })
          .join("\n"));
        stdout.senderClose();
      });
    },
  },

  exit: {
    desc: "Close the terminal",
    run: (env, _stdin, stdout) => {
      stdout.onReceiver(() => {
        env.terminal.hide();
        stdout.senderClose();
      });
    },
  },

  clear: {
    desc: "Clear the terminal",
    run: (env, _stdin, stdout) => {
      stdout.onReceiver(() => {
        env.terminal.clear();
        stdout.senderClose();
      });
    },
  },

  echo: {
    desc: "Output to the terminal",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        if (env.interrupted) stdout.senderClose();
        else if (stdin) {
          stdin.receive((data, readyForMore) => {
            stdout.send(data, readyForMore);
            readyForMore();
          });
          stdin.onSenderClose(() => stdout.senderClose());
        } else {
          stdout.send(args);
          stdout.senderClose();
        }
      });
    },
  },

  _: {
    desc: "Access the previous command's output",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (back) => {
          (env.terminal.history[env.terminal.historyIndex -
            parseInt(back[0])]?.output || [])
            .forEach((line) => {
              stdout.send(line);
            });
          stdout.senderClose();
        });
      });
    },
  },

  grep: {
    desc: "Search for lines matching a pattern",
    run: (env, stdin, stdout, args) => {
      if (!stdin)
        return env.fail(stdout, "stdin required for grep");

      const pattern = new RegExp(args, 'i');
      stdout.onReceiver(() => {
        stdin.onSenderClose(() => stdout.senderClose());

        stdin.receive((text, readyForMore) => {
          const matches = (String(text).split("\n").filter((line) => line.match(pattern)));
          if (matches.length > 0) {
            matches.forEach((line, index) => {
              if (index === matches.length - 1) {
                stdout.send(line, readyForMore);
              } else {
                stdout.send(line);
              }
            });
          } else {
            readyForMore();
          }
        });
      });
    },
  },

  collect: {
    desc: "Grab all input into an array",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (rows) => {
          stdout.send(rows);
          stdout.senderClose();
        });
      });
    },
  },

  tick: {
    desc: "Read once per second",
    run: (env, stdin, stdout, args) => {
      if (!stdin)
        return env.fail(stdout, "stdin required for tick");

      const ms = parseInt(args) || 500;
      stdout.onReceiver(() => {
        stdin.onSenderClose(() => stdout.senderClose());
        stdin.receive((line, readyForMore) => {
          stdout.send(line);
          env.setTimeout(() => {
            if (env.interrupted) {
              debug('tick sees interrupted');
              stdout.senderClose();
            } else {
              readyForMore();
            }
          }, ms, stdout);
        });
      });
    },
  },

  yes: {
    desc: "Emit the given text continuously",
    run: (env, stdin, stdout, args) => {

      const ms = parseInt(args) || 50;
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (text) => {
          const emit = () => {
            env.setTimeout(() => {
              if (env.interrupted) {
                stdout.senderClose();
              } else {
                stdout.send(text[0], emit);
              }
            }, ms, stdout);
          };
          emit();
        });
      });
    },
  },

  pbcopy: {
    desc: "Put data into the clipboard",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (lines) => {
          navigator.clipboard.writeText(lines.join("\n"))
            .then(() => {
              debug("copied");
              stdout.senderClose();
            });
        });
      });
    },
  },

  pbpaste: {
    desc: "Pull data from the clipboard",
    run: (_env, _stdin, stdout, _args) => {
      stdout.onReceiver(() => {
        navigator.clipboard.readText()
          .then(clipText => {
            clipText.split("\n").forEach(line => stdout.send(line));
            stdout.senderClose();
          });
      });
    },
  },

  bgPage: {
    desc: "Manually execute a background page command",
    run: (env, stdin, stdout, args) => {
      args = args || 'echo'
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, async (cmdLine) => {
          const [cmd, ...rest] = cmdLine[0].split(" ");
          if (!cmd || cmd.length === 0) {
            return env.fail(stdout, "missing command");
          }
          const payload: { [key: string]: string } = {};
          rest.forEach((segment: string) => {
            const [k, v] = [
              segment.slice(0, segment.indexOf(':')),
              segment.slice(segment.indexOf(':') + 1)
            ];
            payload[k] = v;
          });
          const res = await sendMessage({
            target: cmd === 'callServer' ? 'server' : 'background',
            command: cmd,
            payload,
          });
          if (res?.errors) {
            env.fail(stdout, res.errors);
          } else {
            stdout.send(JSON.stringify(res));
            stdout.senderClose();
          }
        });
      });
    },
  },

  eval: {
    desc: "Eval javascript code",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (code) => {
          stdout.send(eval(code));
          stdout.senderClose();
        });
      });
    },
  },

};

export default baseCommands;
