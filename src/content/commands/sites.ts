import $ from 'jquery';
import { Commands } from '~content/exec';
import { StreamEnv } from '~content/exec/stream';
import { Stream } from '~content/io';
import { newWindow, domain } from '~utils';

const commands: Commands<Stream, StreamEnv> = {
  hn: {
    desc: "Search hn",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (query) => {
          const q = Array.isArray(query) ? query.join() : query
          newWindow(`https://hn.algolia.com/?q=${encodeURIComponent(q)}`);
          stdout.closeWrite();
        });
      });
    },
  },

  bugmenot: {
    desc: "Launch BugMeNot for this site, or the site passed",
    run: (env, stdin, stdout, args = domain()) => {
      stdout.onRead(() => {
        env.terminal.hide();
        env.argsOrStdin([args], stdin, (domains) => {
          const domain = domains[0];
          if (!env.interrupted) {
            window.open(
              `http://bugmenot.com/view/${domain}`, 'BugMeNot',
              'height=500,width=700'
            )?.focus();
          }
          stdout.write(`Launching BugMeNot for '${domain}'`);
          stdout.closeWrite();
        });
      });
    },
  },

  random_link: {
    desc: "Open a random page link",
    run: (env, stdin, stdout) => {
      stdout.onRead(() => {
        newWindow(
          document.links[Math.floor(Math.random() * document.links.length)].href
        );
        stdout.closeWrite();
      });
    },
  },

  waybackmachine: {
    desc: "Open this page in Archive.org's Wayback Machine",
    run: (env, stdin, stdout) => {
      stdout.onRead(() => {
        newWindow('http://web.archive.org/web/*/' + domain());
        stdout.closeWrite();
      });
    },
  },

  gist: {
    desc: "Make a new GitHub gist",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        if (stdin) {
          stdin.readAll((rows) => {
            if (env.interrupted) {
              stdout.closeWrite();
            } else {
              const files: { [key: string]: { content: string } } = {};
              files[args || 'data.txt'] = { content: rows.join("\n") };
              $.post("https://api.github.com/gists", JSON.stringify({
                public: true,
                files
              }))
                .fail(() => stdout.closeWrite())
                .done((resp) => {
                  stdout.write(resp.html_url);
                  stdout.closeWrite();
                });
            }
          });
        } else {
          newWindow("https://gist.github.com/");
          stdout.closeWrite();
        }
      });
    },
  },

  namegrep: {
    desc: "Grep for domain names",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (lines) => {
          newWindow(`http://namegrep.com/#${lines.join("|")}`);
          stdout.closeWrite();
        });
      });
    },
  },

  requestbin: {
    desc: "Make a requestb.in",
    run: (env, stdin, stdout, args) => {
      stdout.onRead(() => {
        env.argsOrStdin([args], stdin, (lines) => {
          if (env.interrupted) {
            stdout.closeWrite();
          } else {
            $.post("http://requestb.in/api/v1/bins", {
              private: lines[0] === "private"
            }, (response) => {
              stdout.write(`http://requestb.in/${response['name']}?inspect`);
              stdout.closeWrite();
            });
          }
        });
      });
    },
  },
};

export default commands;
