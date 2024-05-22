export * from './CommandParser';
export * from './Stream';

import baseCommands from './base';
import domCommands from './dom';
import moreCommands from './assorted';

export const commands = {
  ...baseCommands,
  ...domCommands,
  ...moreCommands,
};
