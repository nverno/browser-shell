import { Debug, sendMessage, pick, } from '~utils';
import { Command } from '~content/exec';
import { Stream } from '~content/io';
import { StreamEnv } from '~content/exec/stream';

const debug = Debug('base');

export const baseCommands: { [key: string]: Command<Stream, StreamEnv> } = {
  help: {
    desc: "Show help",
    run: (env, _stdin, stdout, args) => {
      const cmds = args ? pick(env.bin, args) : env.bin;
      stdout.onRead(() => {
        stdout.write(Object.entries(cmds)
          .filter(([_, opts]: any) => opts.desc)
          .map(([cmd, opts]: any) => {
            let doc = `<b>${cmd}</b>\t\t${opts.desc}`;
            if (opts.alias)
              doc += `\n${opts.alias}\t\tAlias for ${cmd}`;
            return doc;
          })
          .join("\n"));
        stdout.closeWrite();
      });
    },
  },

  exit: {
    desc: "Close the terminal",
    run: (env, _stdin, stdout) => {
      stdout.onRead(() => {
        env.terminal.hide();
        stdout.closeWrite();
      });
    },
  },

  clear: {
    desc: "Clear the terminal",
    run: (env, _stdin, stdout) => {
      stdout.onRead(() => {
        env.terminal.clear();
        stdout.closeWrite();
      });
    },
  },

  echo: {
    desc: "Output to the terminal",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        if (env.interrupted) stdout.closeWrite();
        else if (stdin) {
          stdin.read((data, readyForMore) => {
            stdout.write(data, readyForMore);
            readyForMore();
          });
          stdin.onCloseWrite(() => stdout.closeWrite());
        } else {
          stdout.write(args);
          stdout.closeWrite();
        }
      });
    },
  },

  _: {
    desc: "Access the previous command's output",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (back) => {
          (env.terminal.history[env.terminal.historyIndex -
            parseInt(back[0])]?.output || [])
            .forEach((line) => {
              stdout.write(line);
            });
          stdout.closeWrite();
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
      stdout.onRead(() => {
        stdin.onCloseWrite(() => stdout.closeWrite());

        stdin.read((text, readyForMore) => {
          const matches = (String(text).split("\n").filter((line) => line.match(pattern)));
          if (matches.length > 0) {
            matches.forEach((line, index) => {
              if (index === matches.length - 1) {
                stdout.write(line, readyForMore);
              } else {
                stdout.write(line);
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
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (rows) => {
          stdout.write(rows);
          stdout.closeWrite();
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
      stdout.onRead(() => {
        stdin.onCloseWrite(() => stdout.closeWrite());
        stdin.read((line, readyForMore) => {
          stdout.write(line);
          env.setTimeout(() => {
            if (env.interrupted) {
              debug('tick sees interrupted');
              stdout.closeWrite();
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
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (text) => {
          const emit = () => {
            env.setTimeout(() => {
              if (env.interrupted) {
                stdout.closeWrite();
              } else {
                stdout.write(text[0], emit);
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
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (lines) => {
          navigator.clipboard.writeText(lines.join("\n"))
            .then(() => {
              debug("copied");
              stdout.closeWrite();
            });
        });
      });
    },
  },

  pbpaste: {
    desc: "Pull data from the clipboard",
    run: (_env, _stdin, stdout, _args) => {
      stdout.onRead(() => {
        navigator.clipboard.readText()
          .then(clipText => {
            clipText.split("\n").forEach(line => stdout.write(line));
            stdout.closeWrite();
          });
      });
    },
  },

  bgPage: {
    desc: "Manually execute a background page command",
    run: (env, stdin, stdout, args) => {
      args = args || 'listCommands'
      stdout.onRead(() => {
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
            stdout.write(JSON.stringify(res));
            stdout.closeWrite();
          }
        });
      });
    },
  },

  eval: {
    desc: "Eval javascript code",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (code) => {
          stdout.write(eval(code));
          stdout.closeWrite();
        });
      });
    },
  },

};

export default baseCommands;
