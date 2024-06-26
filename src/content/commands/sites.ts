import $ from 'jquery';
import { ArgsOrStdin, PipeEnv, Command } from '~content/exec';
import { Pipe } from '~content/io';
import { Debug, domain, newWindow } from '~utils';

const debug = Debug('cmd:sites');

export const siteCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  hn: {
    desc: "Search hn",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let query: any;
      while ((query = await input.read()) != null) {
        const q = Array.isArray(query) ? query.join() : query;
        const url = `https://hn.algolia.com/?q=${encodeURIComponent(q)}`;
        stdout.write(url);
        newWindow(url);
      }
      stdout.close();
    },
  },

  bugmenot: {
    desc: "Launch BugMeNot for this site, or the site passed",
    run: async (env, stdin, stdout, args = domain()) => {
      env.terminal.hide();
      const input = new ArgsOrStdin(env, stdin, args);
      let cur: any;
      while ((cur = await input.read()) != null) {
        const url = `http://bugmenot.com/view/${cur}`
        stdout.write(url);
        window.open(url, 'BugMeNot', 'height=500,width=700')?.focus();
      }
      stdout.close();
    },
  },

  waybackmachine: {
    desc: "Open page in Archive.org's Wayback Machine",
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = domain();
      const input = new ArgsOrStdin(env, stdin, args);
      let cur: any;
      while ((cur = await input.read()) != null) {
        const url = `http://web.archive.org/web/*/${cur}`;
        stdout.write(url);
        newWindow(url);
      }
      stdout.close();
    },
  },

  gist: {
    desc: "Make a new GitHub gist",
    run: async (env, stdin, stdout, args = 'data.txt') => {
      const rows = await (new ArgsOrStdin(env, stdin, null)).readAll();
      if (rows.length === 0) {
        newWindow("https://gist.github.com/");
      } else {
        const files: { [key: string]: { content: string } } = {};
        files[args] = { content: rows.join("\n") };
        $.post("https://api.github.com/gists", JSON.stringify({
          public: true,
          files,
        }))
          .fail(() => console.error(`gist $.post failed`))
          .done((resp) => {
            stdout.write(resp.html_url);
          });
      }
      stdout.close();
    },
  },

  namegrep: {
    desc: "Grep for domain names",
    run: async (env, stdin, stdout, args) => {
      const names = await (new ArgsOrStdin(env, stdin, args)).readAll();
      const url = `http://namegrep.com/#${names.join("|")}`;
      stdout.write(url);
      newWindow(url);
      stdout.close();
    },
  },

  requestbin: {
    desc: "Make a requestb.in",
    run: async (env, stdin, stdout, args) => {
      const lines = await (new ArgsOrStdin(env, stdin, args)).readAll();
      $.post("http://requestb.in/api/v1/bins", {
        private: lines[0] === "private"
      }, (response) => stdout.write(
        `http://requestb.in/${response['name']}?inspect`)
      );
      stdout.close();
    },
  },
};
export default siteCommands;
