import debug from "debug";
import { log } from './log';

export const DEBUG_PREFIX = 'bs';
export const DEBUG = `${DEBUG_PREFIX}:*`;

debug.log = function (...args: any[]) {
  log(...args);
}

if (DEBUG) debug.enable(DEBUG);
export const Debug = (prefix: string) => debug(DEBUG_PREFIX).extend(prefix);
// `${DEBUG_PREFIX}:${prefix}`);

// debug.formatArgs = formatArgs;
// function formatArgs(args) {
//   let name = this.namespace;
//   let useColors = this.useColors ?? true;
//   if (useColors) {
//     let c = this.color;
//     let colorCode = '\u001b[3' + (c < 8 ? c : '8;5;' + c);
//     let prefix = ' ' + colorCode + ';1m' + name + ' ' + '\u001b[0m';
//     args[0] = prefix + args[0].split('\n').join('\n' + '                       ' + prefix);
//     args.push(colorCode + 'm+' + debug.humanize(this.diff) + '\u001b[0m');
//   } else {
//     args[0] = name + ' ' + args[0].split('\n').join('\n' + '                       ' + name);
//   }
//   // remove;
//   return args;
// }

export const debugEnable = (prefix?: string, check = false) => {
  if (check) return Debug(prefix).enabled;
  return prefix ? debug.enable(prefix) : debug.disable();
};
