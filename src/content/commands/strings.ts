import { ArgsOrStdin, PipeEnv, Command } from '~content/exec';
import { Pipe } from '~content/io';
import { asArray, Debug, isString } from '~utils';

const debug = Debug('cmd:string');

export const stringCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
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

  gsub: {
    desc: "Replace <regexp> with <replacement> in stream",
    help: [
      "gsub [-gGi] <regex> <replacement> - replace REGEX match(es) with REPLACEMENT",
      "  Flags: g=>global(default), G=>not global, i=>ignore case"
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, {
        flags: 'gGi',
        requiredArgs: 2,
      });
      const [patt, rep] = await input.readRequired();
      if (!(patt && rep))
        return env.fail('gsub missing <regexp> <replacement>');
      const global = input.flag('g') || !input.flag('G');
      const flags = (global ? 'g' : '') + (input.flag('i') ? 'i' : '');
      const re = new RegExp(patt, flags);
      let cur: any;
      while ((cur = await input.read()) != null) 
        stdout.write(String(cur).replace(re, rep));
      stdout.close();
    },
  },

  grep: {
    desc: "Search for lines matching a pattern",
    help: [
      "grep [-si] <pattern> ...rest - find matches for pattern in REST.",
      "  Flags: i => ignore case, s => enclose matches in html span elements for highlighting",
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'grep',
        requiredArgs: 1,
        flags: 'si',
      });
      const [pattern] = await input.readRequired();
      if (!pattern)
        return env.fail('grep missing regexp pattern', stdout);

      const highlight = input.flag('s');
      const flags = (highlight ? 'g' : '') + (input.flag('i') ? 'i' : '');
      const re = new RegExp(pattern, flags);

      let text: any;
      while ((text = await input.read()) != null) {
        String(text)
          .split("\n")
          .filter((line) => re.test(line))
          .forEach(line => {
            stdout.write(
              highlight
                ? line.replaceAll(re, (m) => `<span class="match">${m}</span>`)
                : line
            );
          });
      }
      if (highlight)
        env.outputOpts.escapeHtml = false;
      stdout.close();
    },
  },
};

export default stringCommands;
