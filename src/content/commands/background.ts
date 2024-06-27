import { Debug, isEmpty, sendMessage } from '~utils';
import { Commands, ArgsOrStdin } from '~content/exec';

const debug = Debug('cmd:bg');

export const backgroundCommands: Commands = {
  background: {
    desc: "Send command to background",
    help: [
      "bg target:command [args...] - send COMMAND to TARGET",
      "   ARGS can be key-value pairs with syntax KEY:VALUE",
    ],
    alias: ["bg"],
    run: async (env, stdin, stdout, args) => {
      if (!(stdin || args)) args = 'background:listCommands';
      const input = new ArgsOrStdin(env, stdin, args, { requiredArgs: 1 });
      const [cmd] = await input.readRequired();
      const [target, command] = cmd.split(/\s*:\s*/);
      if (!(target && command))
        return env.fail('missing target:command', stdout);
      debug("cmd: %o, target: %o, command: %o", cmd, target, command)

      const payload = (await input.readAll()).reduce((acc: any, kv: string) => {
        const [k, v] = kv.split(':');
        return { [k]: v, ...acc };
      }, {});

      const res = await sendMessage({ target, command, payload });
      if (!isEmpty(res?.errors)) {
        env.terminal.error(res.errors);
      } else {
        stdout.write(JSON.stringify(res));
      }
      stdout.close();
    },
  },
};
