export * from './CommandParser';
export * from './Stream';

import baseCommands from './base';
import domCommands from './dom';
import siteCommands from './sites';
import streamCommands from './streams';

export const commands = {
  ...baseCommands,
  ...domCommands,
  ...siteCommands,
  ...streamCommands,
};
