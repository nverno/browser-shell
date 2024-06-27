import { Debug } from '~utils';
import { Commands, ArgsOrStdin } from '~content/exec';

const debug = Debug('cmd:term');

export const terminalCommands: Commands = {
  _: {
    desc: "Access the previous command's output",
    run: async (env, stdin, stdout, args) => {
      if (stdin) await stdin.readAll();
      const idx = parseInt(args) || 1;
      env.terminal.history.get(-idx)?.output.forEach((line) => {
        stdout.write(line);
      });
      stdout.close();
    }
  },

  history: {
    desc: 'Show command history',
    help: [
      'history - print command history',
      'history index - print output from history[INDEX]'],
    alias: ['hist'],
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);

      if (args) {
        const idx = parseInt(args);
        stdout.write(env.terminal.history.get(idx)?.output);
      } else {
        for (const { history, index } of env.terminal.history)
          stdout.write(`[${index}] ${history.command}`);
      }
      stdout.close();
    }
  },

  clear: {
    desc: "Clear the terminal",
    help: ["clear history - clear HISTORY from shell and local storage"],
    run: async (env, stdin, stdout, args) => {
      if (stdin) await stdin.readAll();
      if (args === 'history')
        env.terminal.history.clear();
      else
        env.terminal.clear();
      stdout.close();
    },
  },

  exit: {
    desc: "Close the terminal",
    run: async (env, stdin, stdout) => {
      if (stdin) await stdin.readAll();
      env.terminal.hide();
      stdout.close();
    },
  },
};
export default terminalCommands;
