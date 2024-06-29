import { Debug } from '~utils';
import { Commands } from '~content/exec';
const debug = Debug('cmd:interval');

export const intervalCommands: Commands = {
  tick: {
    desc: "Read at intervals",
    help: ["tick [ms=400] - read once every MS millisecs"],
    run: async (env, stdin, stdout, args) => {
      if (stdin) {
        const ms = parseInt(args) || 400;
        let data: any;
        while ((data = await stdin.read()) != null) {
          stdout.write(data);
          await new Promise<void>((resolve) =>
            env.setTimeout(() => resolve(), ms, stdout.stream));
        }
      }
      stdout.close();
    },
  },

  yes: {
    desc: 'Emit newlines at intervals',
    help: [
      "yes [ms=200] - emit newline every MS millisecs",
      "yes [ms=200] [text=\\n] - emit TEXT every MS millisecs"
    ],
    run: async (env, stdin, stdout, args) => {
      args = args?.split(' ') || []
      const ms = parseInt(args[0]) || 200;
      const text = args[1] || "\n";
      const wait = async (): Promise<void> => {
        return new Promise(resolve => {
          env.setTimeout(() => resolve(), ms, stdout.stream);
        });
      };
      while (env.interrupted === 0 && !stdout.isClosed()) {
        const data = (stdin && !stdin.isClosed()) ? await stdin.read() : text;
        stdout.write(data);
        await wait()
      }
      stdout.close();
    },
  },
};
