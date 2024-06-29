import { ArgsOrStdin, Commands } from '~content/exec';
import { Debug, isString, stripHTMLTags } from '~utils';

const debug = Debug('cmd:fmt');


export const formatCommands: Commands = {
  strip: {
    desc: "Strip html tags from input",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let cur: any;
      while ((cur = await input.read()) != null) 
        stdout.write(stripHTMLTags(cur.toString()));
      stdout.close();
    },
  },

  tojson: {
    desc: "Convert to JSON",
    run: async (env, stdin, stdout, args) => {
      const input = new ArgsOrStdin(env, stdin, args);
      let cur: any;
      while ((cur = await input.read()) != null) 
        stdout.write(JSON.stringify(cur));
      stdout.close();
    },
  },

  tostring: {
    desc: "Convert to string",
  },

  tohtml: {
    desc: "Convert to html",
  },
};
export default formatCommands;
