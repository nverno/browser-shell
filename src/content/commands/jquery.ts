import $ from "jquery";
import { ArgsOrStdin, PipeEnv, Command } from '~content/exec';
import { Pipe } from "~content/io";
import { Debug, blinkElements } from '~utils';

const debug = Debug('cmd:jquery');


export const jqueryCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  jquery: {
    desc: "Run jquery on page's dom",
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = ['body'];
      const input = new ArgsOrStdin(env, stdin, args, { flags: 'r' });
      await input.readFlags();
      const raw = input.flag('r');
      let selector: any;
      while ((selector = await input.read()) != null) {
        try {
          if (raw) stdout.write($(selector));
          else $(selector).each((_, elem) => stdout.write(elem));
        } catch (error) {
          env.terminal.error(error);
        }
      }
      stdout.close();
    }
  },

  text: {
    desc: "Access the page's text",
    help: ["text [SELECTOR...] - try to get text for SELECTORS"],
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = ['body'];
      const input = new ArgsOrStdin(env, stdin, args);
      let selector: any;
      while ((selector = await input.read()) != null) {
        try {
          $(selector).each((_, elem) => stdout.write($(elem).text()));
        } catch (error) {
          env.terminal.error(error);
        }
      }
      stdout.close();
    },
  },

  '.': {
    desc: "Extract element attributes (ex. jquery a | . href)",
    help: ['. [attrs...] - extract ATTRS attributes from inputs'],
    run: async (env, stdin, stdout, args) => {
      if (!stdin) {
        return stdout.close(), null;
      }
      args = args?.split(' ') || null;
      if (!args)
        return env.fail('missing attrs', stdout);
      
      let elem: any;
      while ((elem = await stdin.read()) != null) {
        const attrs = [];
        args.forEach((attr: string) => {
          try {
            attrs.push($(elem).attr(attr));
          } catch (error) {
            env.terminal.error(error);
          }
        });
        if (attrs.length > 0)
          stdout.write(attrs.length === 1 ? attrs[0] : attrs);
      };
      stdout.close();
    }
  },

  blink: {
    desc: 'Blink elements',
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let elem: any;
      while ((elem = await input.read()) != null) {
        try {
          blinkElements($(elem), {
            'background-color': 'rgba(190, 40, 120, 0.15)',
            'font-weight': 'bold',
            color: 'darkblue',
          });
        } catch (error) {
          env.terminal.error(error);
        }
        stdout.write(elem);
      }
      stdout.close();
    }
  },
};

export default jqueryCommands;
