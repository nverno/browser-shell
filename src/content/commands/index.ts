import { helpCommands } from './help';
import { domCommands } from './dom';
import { jqueryCommands } from './jquery';
import { streamCommands } from './streams';
import { evalCommands } from './eval';
import { siteCommands } from './sites';
import { stringCommands } from './strings';
import { linkCommands } from './links';
import { formatCommands } from './format';
import { settingsCommands } from './settings';
import { terminalCommands } from './terminal';
import { backgroundCommands } from './background';
import { intervalCommands } from './intervals';
import { clipboardCommands } from './clipboard';

export const commands = {
  ...settingsCommands,  
  ...terminalCommands,
  ...helpCommands,
  ...formatCommands,
  ...backgroundCommands,
  ...streamCommands,
  ...stringCommands,
  ...evalCommands,
  ...jqueryCommands,
  ...domCommands,
  ...linkCommands,
  ...siteCommands,
  ...intervalCommands,
  ...clipboardCommands,
};
