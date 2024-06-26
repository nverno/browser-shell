import { randomLink, Debug, isString, newWindow, sendMessage } from '~utils';
import { ArgsOrStdin, PipeEnv, Command } from '~content/exec';
import { Pipe } from "~content/io";


const debug = Debug('cmd:links');

export const linkCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  open: {
    desc: "Open links",
    help: ["open - with no input opens random link"],
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = randomLink();
      const input = new ArgsOrStdin(env, stdin, args);
      let link: any;
      while ((link = await input.read()) != null) {
        stdout.write(link)
        newWindow(link);
      }
      stdout.close();
    },
  },

  expandlink: {
    desc: "Expand relative urls",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let url: string;
      while ((url = await input.read()) != null) {
        if (!isString(url))
          debug("url(%s)=%o", typeof url, url)
        else
          stdout.write(String(url).startsWith("//")
            ? ("https:" + url)
            : (url.startsWith("/") ? `${location.origin}${url}` : url)
          );
      }
      stdout.close();
    },
  },
  
  download: {
    desc: "Download uris",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let url: any;
      while ((url = await input.read()) != null) {
        const id = await sendMessage({
          command: 'download',
          payload: { url },
        });
        stdout.write(id);
      }
      stdout.close();
    }
  },
};

export default linkCommands;
