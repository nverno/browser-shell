import { ArgsOrStdin, Commands } from '~content/exec';
import { asArray, Debug, isString } from '~utils';

const debug = Debug('cmd:string');

export const stringCommands: Commands = {
  trim: {
    desc: "Trim whitespace",
    alias: ["chomp"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let cur: any;
      while ((cur = await input.read()) != null)
        asArray(cur).forEach((el) => stdout.write(isString(el) ? el.trim() : el));
      stdout.close();
    },
  },

  split: {
    desc: "Split inputs",
    help: ["split [sep=\\s*\\n+\\s*] - split inputs by SEP"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      const sep = args ? new RegExp(args) : /\s*\n+\s*/;
      debug('split: sep=%s', sep);
      let cur: any;
      while ((cur = await input.read()) != null) {
        cur.split(sep).forEach(line => stdout.write(line));
      }
      stdout.close();
    },
  },

  join: {
    desc: "Join inputs",
    help: ["join [sep=\\n] - join inputs with SEP"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      const sep = args || "\n";
      const res = await input.readAll();
      stdout.write(res.join(sep));
      stdout.close();
    },
  },

  gsub: {
    desc: "Search and replace regexp",
    help: [
      "gsub [-gGi] regex replacement - replace REGEX match(es) with REPLACEMENT",
      "  Flags: g => global(default), G => not global, i => ignore case"
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'gsub',
        flags: 'gGi',
        requiredArgs: 2,
      });
      const [patt, rep] = await input.readRequired();
      if (!(patt && rep)) {
        env.fail('gsub missing <regexp> <replacement>');
      } else {
        const global = input.flag('g') || !input.flag('G');
        const flags = (global ? 'g' : '') + (input.flag('i') ? 'i' : '');
        const re = new RegExp(patt, flags);
        let cur: any;
        while ((cur = await input.read()) != null) 
          stdout.write(String(cur).replace(re, rep));
      }
      stdout.close();
    },
  },

  grep: {
    desc: "Search for lines matching a pattern",
    help: [
      "grep [-id] pattern ...rest - find matches for PATTERN in REST.",
      "  Flags: i => ignore case, d => highlight matches",
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'grep',
        requiredArgs: 1,
        flags: 'id',
      });
      const [pattern] = await input.readRequired();
      if (!pattern)
        return env.fail('grep missing regexp pattern', stdout);

      const pretty = input.flag('d') || env.termOpts.pretty;
      const flags = (pretty ? 'g' : '') + (input.flag('i') ? 'i' : '');
      const re = new RegExp(pattern, flags);

      let text: any;
      while ((text = await input.read()) != null) {
        String(text)
          .split("\n")
          .filter((line) => re.test(line))
          .forEach(line => {
            stdout.write(
              pretty
                ? line.replaceAll(re, (m) => `<span class="bs-match">${m}</span>`)
                : line
            );
          });
      }
      if (pretty)
        env.termOpts.escape = false;
      stdout.close();
    },
  },
};

export default stringCommands;
