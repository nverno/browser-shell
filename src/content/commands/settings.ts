import { Debug, debugEnable } from '~utils';
import { Commands, ArgsOrStdin } from '~content/exec';
import { terminalDefaultOpts } from '~content/terminal';

const debug = Debug('cmd:settings');

export const settingsCommands: Commands = {
  settings: {
    desc: 'Output settings',
    help: [
      "set - show current settings",
      "set reset - RESET to defaults",
      "set key - show settings for KEY",
      "set key:val - set KEY to VAL",
    ],
    alias: ["set"],
    run: async (env, stdin, stdout, args) => {
      const input = await (new ArgsOrStdin(env, stdin, args)).readAll();
      if (input.length === 0) {
        Object.entries(env.termOpts).forEach((e) => stdout.write(e));
      } else if (input[0] === 'reset') {
        Object.assign(env.termOpts, terminalDefaultOpts);
        stdout.write(Object.entries(env.termOpts));
      } else {
        input.forEach(e => {
          const [k, v] = e.split(':');
          if (v)
            env.termOpts[k] = v === 'false' ? false : v === 'true' ? true : v;
          stdout.write([k, env.termOpts[k] || null]);
        })
      }
      stdout.close();
    },
  },

  alias: {
    desc: 'Show command aliases',
    help: [
      'alias name command - define NAME as alias for COMMAND',
      'alias name - undefine alias NAME',
    ],
    run: async (env, stdin, stdout, args) => {
      args = (stdin ? await stdin.readAll() as any[] : [args])
        ?.map((arg) => arg?.split(' ').filter((el) => el.length > 0))
        ?.filter((el) => el?.length > 0);

      if (!args || args.length === 0) {
        Object.entries(env.terminal.alias).forEach(([alias, cmd]) => {
          stdout.write(`alias ${alias}=${cmd}`);
        });
      } else {
        args.forEach(([a, c]) => env.terminal.defineAlias(a, c));
      }
      stdout.close();
    }
  },

  debug: {
    desc: "Debug settings",
    help: [
      'debug enabled [prefix=bs:*] - test is logging is enabled for PREFIX',
      'debug enable [prefix=bs:*] - enable logging for modules with PREFIX',
      'debug disable - disable debug logging'
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, { requiredArgs: 1 });
      args = await input.readAll();
      if (args.length < 1)
        return env.fail('missing debug argument', stdout);
      let check = false;
      switch (args[0]) {
        case 'disable':
          stdout.write(`debug disabled (was '${debugEnable()}')`);
          break;
        case 'enabled':                           // fall-through
          check = true;
        case 'enable':
          const pre = args[1]
            ? (args[1].indexOf(':') === -1 ? 'bs:' : '') + args[1]
            : 'bs:*';
          const res = debugEnable(pre, check);
          stdout.write(
            `debug ${(check && !res) ? "NOT " : ""}enabled for '${pre}'`
          );
          break;
        default:
          return env.fail(`unknown debug args: ${args.join(" ")}`, stdout);
      }
      stdout.close();
    }
  },
};

export default settingsCommands;
