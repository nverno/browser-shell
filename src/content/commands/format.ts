import { ArgsOrStdin, Commands } from '~content/exec';
import { Debug, isString } from '~utils';

const debug = Debug('cmd:fmt');


export const formatCommands: Commands = {
  strip: {
    desc: "Strip html tags from input",
  },

  tojson: {
    desc: "Convert to JSON",
  },

  tostring: {
    desc: "Convert to string",
  },

  tohtml: {
    desc: "Convert to html",
  },
};
export default formatCommands;
