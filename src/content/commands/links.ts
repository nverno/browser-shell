import { randomLink, Debug, isString, newWindow, sendMessage } from '~utils';
import { ArgsOrStdin, Commands } from '~content/exec';


const debug = Debug('cmd:links');

export const linkCommands: Commands = {
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
  
  open: {
    desc: "Open links",
    help: [
      "open - with no input opens random link",
      "open link - open LINK in new window",
    ],
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

  download: {
    desc: "Download uris",
    help: [
      "download uri - download URI, returning download id from background"
    ],
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
