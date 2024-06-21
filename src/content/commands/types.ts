import { ExecEnv } from '~content/exec';
import { PipeBase } from '~content/io';

export interface Command<T extends PipeBase, E = ExecEnv<T>> {
  desc: string;
  run: (
    env: E,
    stdin: T | null,
    stdout: T,
    args?: any
  ) => void | Promise<void>;
  alias?: string;
}
export type Commands<T extends PipeBase, E = ExecEnv<T>> = { [key: string]: Command<T, E> }
