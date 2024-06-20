import baseCommands from './base';
import domCommands from './dom';
import siteCommands from './commands';
import streamCommands from './streams';

export const commands = {
  ...baseCommands,
  ...domCommands,
  ...siteCommands,
  ...streamCommands,
};
