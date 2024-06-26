import baseCommands from './base';
import domCommands from './dom';
import jqueryCommands from './jquery';
import streamCommands from './streams';
import evalCommands from './eval';
import siteCommands from './sites';

export const commands = {
  ...baseCommands,
  ...jqueryCommands,
  ...domCommands,
  ...streamCommands,
  ...evalCommands,
  ...siteCommands,
};
