import DebugModule from "debug";
import { log } from './log';

const DEBUG = 'bs:*';
const DEBUG_PREFIX = 'bs';

DebugModule.log = function(...args: any[]) {
  log(...args);
}

DEBUG && DebugModule.enable(DEBUG);
export const Debug = (prefix: string) => DebugModule(`${DEBUG_PREFIX}:${prefix}`);
