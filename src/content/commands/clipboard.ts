import { Debug } from '~utils';
import { Commands, ArgsOrStdin } from '~content/exec';
const debug = Debug('cmd:clipboard');

export const clipboardCommands: Commands = {
  pbcopy: {
    desc: "Copy to clipboard",
    run: async (env, stdin, stdout, args) => {
      const data = await (new ArgsOrStdin(env, stdin, args)).readAll();
      try {
        await navigator.clipboard.writeText(data.join("\n"));
        // FIXME(6/22/24): write to stderr
        env.terminal.error('copied to clipboard');
      } catch (error) {
        env.fail(error);
      }
      stdout.close();
    },
  },

  pbpaste: {
    desc: "Pull data from the clipboard",
    run: async (_env, _stdin, stdout, _args) => {
      (await navigator.clipboard.readText())
        .split("\n")
        .forEach(line => stdout.write(line));
      stdout.close();
    },
  },
};
