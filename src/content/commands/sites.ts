import $ from 'jquery';
import { Commands } from './CommandParser';
import { newWindow, domain } from '~utils';

const commands: Commands = {
  hn: {
    desc: "Search hn",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (query) => {
          const q = Array.isArray(query) ? query.join() : query
          newWindow(`https://hn.algolia.com/?q=${encodeURIComponent(q)}`);
          stdout.senderClose();
        });
      });
    },
  },

  bugmenot: {
    desc: "Launch BugMeNot for this site, or the site passed",
    run: (env, stdin, stdout, args = domain()) => {
      stdout.onReceiver(() => {
        env.terminal.hide();
        env.argsOrStdin([args], stdin, (domains) => {
          const domain = domains[0];
          if (!env.interrupted) {
            window.open(
              `http://bugmenot.com/view/${domain}`, 'BugMeNot',
              'height=500,width=700'
            )?.focus();
          }
          stdout.send(`Launching BugMeNot for '${domain}'`);
          stdout.senderClose();
        });
      });
    },
  },

  random_link: {
    desc: "Open a random page link",
    run: (env, stdin, stdout) => {
      stdout.onReceiver(() => {
        newWindow(
          document.links[Math.floor(Math.random() * document.links.length)].href
        );
        stdout.senderClose();
      });
    },
  },

  waybackmachine: {
    desc: "Open this page in Archive.org's Wayback Machine",
    run: (env, stdin, stdout) => {
      stdout.onReceiver(() => {
        newWindow('http://web.archive.org/web/*/' + domain());
        stdout.senderClose();
      });
    },
  },

  gist: {
    desc: "Make a new GitHub gist",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        if (stdin) {
          stdin.receiveAll((rows) => {
            if (env.interrupted) {
              stdout.senderClose();
            } else {
              const files: { [key: string]: { content: string } } = {};
              files[args || 'data.txt'] = { content: rows.join("\n") };
              $.post("https://api.github.com/gists", JSON.stringify({
                public: true,
                files
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
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (lines) => {
          newWindow(`http://namegrep.com/#${lines.join("|")}`);
          stdout.senderClose();
        });
      });
    },
  },

  requestbin: {
    desc: "Make a requestb.in",
    run: (env, stdin, stdout, args) => {
      stdout.onReceiver(() => {
        env.argsOrStdin([args], stdin, (lines) => {
          if (env.interrupted) {
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

export default commands;
