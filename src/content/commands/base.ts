import { Debug } from '~utils';
import { Command } from './CommandParser';

const debug = Debug('base');

export const baseCommands: { [key: string]: Command } = {
  exit: {
    desc: "Close the terminal",
    run: (_stdin, stdout, env) => {
      stdout.onReceiver(() => {
        env.terminal.hide();
        stdout.senderClose();
      });
    },
  },

  clear: {
    desc: "Clear the terminal",
    run: (_stdin, stdout, env) => {
      stdout.onReceiver(() => {
        env.terminal.clear();
        stdout.senderClose();
      });
    },
  },

  help: {
    desc: "Show help",
    run: (_stdin, stdout, env) => {
      stdout.onReceiver(() => {
        stdout.send(Object.entries(env.bin)
          .filter(([_, opts]: any) => opts.desc)
          .map(([cmd, opts]: any) => `${cmd} - ${opts.desc}`)
          .join("\n"));
        stdout.senderClose();
      });
    },
  },

  echo: {
    desc: "Output to the terminal",
    run: (_stdin, stdout, _env, args) => {
      stdout.onReceiver(() => {
        stdout.send(args);
        stdout.senderClose();
      });
    },
  },

  _: {
    desc: "Access the previous command's output",
    run: (stdin, stdout, env, args) => {
      args = args || '1';
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (back) => {
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
    run: (stdin, stdout, env, args) => {
      if (!stdin) {
        return stdout.fail(env, "stdin required for grep");
      }
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
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (rows) => {
          stdout.send(rows);
          stdout.senderClose();
        });
      });
    },
  },

  tick: {
    desc: "Read once per second",
    run: (stdin, stdout, env, args) => {
      if (!stdin) {
        env.helpers.fail(env, stdout, "stdin required for tick");
        return;
      }
      stdout.onReceiver(() => {
        stdin.onSenderClose(() => stdout.senderClose());
        stdin.receive((line, readyForMore) => {
          stdout.send(line);
          setTimeout(() => {
            if (env.interrupt) {
              stdout.senderClose();
            } else {
              readyForMore();
            }
          }, parseInt(args) || 500);
        });
      });
    },
  },

  yes: {
    desc: "Emit the given text continuously",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (text) => {
          const emit = () => {
            setTimeout(() => {
              if (env.interrupt) {
                stdout.senderClose();
              } else {
                stdout.send(text[0], emit);
              }
            }, 50);
          };
          emit();
        });
      });
    },
  },

  pbcopy: {
    desc: "Put data into the clipboard",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (lines) => {
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
    run: (_stdin, stdout, _env, _args) => {
      stdout.onReceiver(() => {
        navigator.clipboard.readText()
          .then(clipText => {
            clipText.split("\n").forEach(line => stdout.send(line));
            stdout.senderClose();
          });
      });
    },
  },
};

export default baseCommands;
