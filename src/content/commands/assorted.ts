import { Commands } from './CommandParser';
import { remoteCommand, newWindow, domain } from '~utils';

// const extendCommands = (commands: { [key: string]: Command }) => {
//   for (const [key, value] of Object.entries(commands)) {
//     // window.ChromePipe.Commands.Terminal[key] = value;
//   }
// };

// TODO(5/27/24):
const otherCommands: Commands = {
  bugmenot: {
    desc: "Launch BugMeNot for this site, or the site passed",
    run: (stdin, stdout, env, args) => {
      args = args || domain();
      stdout.onReceiver(() => {
        env.terminal.hide();
        env.helpers.argsOrStdin([args], stdin, (domains) => {
          const domain = domains[0];
          if (!env.interrupt) {
            window.open(`http://bugmenot.com/view/${domain}`, 'BugMeNot', 'height=500,width=700')?.focus();
          }
          stdout.send(`Launching BugMeNot for '${domain}'`);
          stdout.senderClose();
        });
      });
    },
  },

  random_link: {
    desc: "Open a random page link",
    run: (stdin, stdout) => {
      stdout.onReceiver(() => {
        newWindow(document.links[Math.floor(Math.random() * document.links.length)].href);
        stdout.senderClose();
      });
    },
  },

  waybackmachine: {
    desc: "Open this page in Archive.org's Wayback Machine",
    run: (stdin, stdout) => {
      stdout.onReceiver(() => {
        newWindow('http://web.archive.org/web/*/' + domain());
        stdout.senderClose();
      });
    },
  },

  gist: {
    desc: "Make a new GitHub gist",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        if (stdin) {
          stdin.receiveAll((rows) => {
            if (env.interrupt) {
              stdout.senderClose();
            } else {
              const files: { [key: string]: { content: string } } = {};
              files[args || 'data.txt'] = { content: rows.join("\n") };
              $.post("https://api.github.com/gists", JSON.stringify({
                public: true, files
              }))
                .fail(() => stdout.senderClose())
                .done((resp) => {
                  stdout.send(resp.html_url);
                  stdout.senderClose();
                });
            }
          });
        } else {
          newWindow("https://gist.github.com/");
          stdout.senderClose();
        }
      });
    },
  },

  namegrep: {
    desc: "Grep for domain names",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (lines) => {
          newWindow(`http://namegrep.com/#${lines.join("|")}`);
          stdout.senderClose();
        });
      });
    },
  },

  requestbin: {
    desc: "Make a requestb.in",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (lines) => {
          if (env.interrupt) {
            stdout.senderClose();
          } else {
            $.post("http://requestb.in/api/v1/bins", {
              private: lines[0] === "private"
            }, (response) => {
              stdout.send(`http://requestb.in/${response['name']}?inspect`);
              stdout.senderClose();
            });
          }
        });
      });
    },
  },

};

const commands: Commands = {
  // TODO(5/27/24): fix
  bgPage: {
    desc: "Manually execute a background page command",
    run: (stdin, stdout, env, args) => {
      args = args || 'fetch';
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (cmdLine) => {
          const [cmd, ...rest] = cmdLine[0].split(" ");

          const payload: { [key: string]: string } = {};
          rest.forEach((segment: string) => {
            const [k, v] = [
              segment.slice(0, segment.indexOf(':')),
              segment.slice(segment.indexOf(':') + 1)
            ];
            payload[k] = v;
          });

          remoteCommand(cmd, payload, (response) => {
            stdout.send(JSON.stringify(response));
            stdout.senderClose();
          });
        });
      });
    },
  },

  hn: {
    desc: "Search hn",
    run: (stdin, stdout, env, args) => {
      stdout.onReceiver(() => {
        env.helpers.argsOrStdin([args], stdin, (query) => {
          const q = Array.isArray(query) ? query.join() : query
          newWindow(`https://hn.algolia.com/?q=${encodeURIComponent(q)}`);
          stdout.senderClose();
        });
      });
    },
  },
};

export default commands;
