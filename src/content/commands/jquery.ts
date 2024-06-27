import $ from "jquery";
import { ArgsOrStdin, Commands } from '~content/exec';
import { Debug, blinkElements, isString } from '~utils';

const debug = Debug('cmd:jquery');


export const jqueryCommands: Commands = {
  jquery: {
    desc: "Run jquery on page's dom",
    help: [],
    alias: ['j'],
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = ['body'];
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'jquery',
        flags: 'r'
      });
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
    desc: "Extrace the page's text",
    help: ["text SELECTOR - extract text from SELECTOR"],
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
    help: ['. [attrs...] - extract ATTRS attributes'],
    run: async (env, stdin, stdout, args) => {
      if (!(args && stdin))
        return env.fail('missing attrs/stdin', stdout);
      if (isString(args))
        args = args.split(' ');
      
      let elem: any;
      while ((elem = await stdin.read()) != null) {
        const attrs = [];
        args.forEach((attr: string) => {
          try {
            const val = $(elem).attr(attr);
            if (val) attrs.push(val);
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
