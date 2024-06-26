import { ArgsOrStdin, PipeEnv, Command } from '~content/exec';
import { Pipe } from '~content/io';
import { Debug, isString, sitFor } from '~utils';

const debug = Debug('cmd:stream');

export const streamCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  len: {
    desc: 'Compute length of input (blocks)',
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      const res = await input.readAll();
      stdout.write(res.length > 1 ? res.length : res[0].length);
      stdout.close();
    }
  },

  pause: {
    desc: 'Pause stream',
  },

  wc: {
    desc: "Count newline, word, or bytes",
    help: [
      "wc [-lwcb] - count by lines, words, chars or bytes",
      "  Flags: l=>lines(default), w=>words, c=>chars, b=>bytes"
    ],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'wc',
        flags: 'lwcb',
      });
      await input.readFlags();

      const sep = input.flag('l') ? /\n/          // lines
        : (input.flag('w') ? /\s+/                // words
          : (input.flag('c') ? /\s*/              // chars
            : (input.flag('b') ? null : /\n/)));  // TODO: bytes
      if (!sep)
        return env.fail(`unimplemented: -b`, stdout)

      let cur: any;
      while ((cur = await input.read()) != null) {
        if (isString(cur) && sep) {
          stdout.write(cur.split(sep).length);
        } else {
          env.terminal.error(`skipped ${cur}`);
        }
      }
      stdout.close();
    },
  },

  join: {
    desc: "Join input (blocks)",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      const sep = args || "\n";
      const res = await input.readAll();
      stdout.write(res.join(sep));
      stdout.close();
    },
  },

  split: {
    desc: "Split input",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      const sep = args ? new RegExp(args) : /\n+/;
      debug('split: sep=%s', sep);
      let cur: any;
      while ((cur = await input.read()) != null) {
        cur.split(sep).forEach(line => stdout.write(line));
      }
      stdout.close();
    },
  },

  collect: {
    desc: "Collect input into an array (blocks)",
    run: async (env, stdin, stdout, args) => {
      const res = await (new ArgsOrStdin(env, stdin, args)).readAll();
      stdout.write(res);
      stdout.close();
    },
  },

  chunk: {
    desc: "Accumulate input into chunks of size [n=5]",
    run: async (env, stdin, stdout, args) => {
      const n = parseInt(args) || 5;
      const input = new ArgsOrStdin(env, stdin, null);
      let cur: any;
      while ((cur = await input.readN(n))?.length > 0)
        stdout.write(cur);
      stdout.close();
    },
  },

  wait: {
    desc: "Wait for time [ms=2000] before sending",
    run: async (env, stdin, stdout, args) => {
      const ms = parseInt(args) || 2000;
      debug('wait: %d', ms);
      const input = new ArgsOrStdin(env, stdin, null);
      await sitFor(ms);
      let cur: any;
      while ((cur = await input.read()) != null)
        stdout.write(cur);
      stdout.close();
    },
  },

  head: {
    desc: "Take the first [n=5] elements from stream",
    alias: ["take"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      let cnt = parseInt(args) || 5, cur: any;
      while (cnt-- > 0 && (cur = await input.read()) != null)
        stdout.write(cur);
      stdout.close();
    },
  },

  tail: {
    desc: "Take the last [n=5] elements (blocks)",
    alias: ["last"],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      let cnt = parseInt(args) || 5, cur: any;
      const res = await input.readAll();
      res.slice(-cnt).forEach(data => stdout.write(data));
      stdout.close();
    },
  },

  drop: {
    desc: "Drop [n=0] elements",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, null);
      let cnt = parseInt(args) || 5, cur: any;
      while ((cur = await input.read()) != null) {
        if (cnt-- <= 0)
          stdout.write(cur);
      }
      stdout.close();
    },
  },

  uniq: {
    desc: "Remove duplicates, keeping first",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      const seen = new Map();
      let cur: any;
      while ((cur = await input.read()) != null) {
        if (!seen.has(cur.toString())) {
          seen.set(cur.toString(), true);
          stdout.write(cur);
        }
      }
      stdout.close();
    },
  },

  sort: {
    desc: "Sort elements (blocks)",
    run: async (env, stdin, stdout, args) => {
      const res = await (new ArgsOrStdin(env, stdin, args)).readAll();
      res.sort();
      res.forEach(line => stdout.write(line));
      stdout.close();
    },
  },

  reverse: {
    desc: "Reverse elements (blocks)",
    run: async (env, stdin, stdout, args) => {
      const res = await (new ArgsOrStdin(env, stdin, args)).readAll();
      res.reverse();
      res.forEach(line => stdout.write(line));
      stdout.close();
    },
  },
};

export default streamCommands;
