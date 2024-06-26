import { Command } from '~content/exec';
import { Pipe } from '~content/io';
import { ArgsOrStdin, PipeEnv } from '~content/exec/pipe';
import { Debug } from '~utils';

const debug = Debug('cmd:sites');

export const siteCommands: { [key: string]: Command<Pipe, PipeEnv> } = {
  
};
export default siteCommands;
