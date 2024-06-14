import { Commands } from "~content/exec";
import { StreamEnv } from '~content/exec/stream';
import { Stream } from "~content/io";

// Stream manipulating commands
const commands: Commands<Stream, StreamEnv> = {
  wait: {
    desc: "Wait for [n=null] ms. Without n, wait for all input (blocks)",
    run: (env, stdin, stdout, args) => {},
  },
  chunk: {
    desc: "Accumulate chunks of [n=10] lines before sending.",
    run: (env, stdin, stdout, args) => {},
  },
  join: {
    desc: "Join lines with [str=\"\\n\"] (blocks)",
    run: (env, stdin, stdout, args) => {},
  },
  split: {
    desc: "Split input on [regexp=\"\\n\"]",
    run: (env, stdin, stdout, args) => {},
  },
  take: {
    desc: "Take the first [n=5] elements from stream.",
    alias: "head",
    run: (env, stdin, stdout, args) => {},
  },
  tail: {
    desc: "Take the last [n=5] elements (blocks)",
    run: (env, stdin, stdout, args) => {},
  },
  drop: {
    desc: "Drop [n=0] elements",
    run: (env, stdin, stdout, args) => {},
  },
  uniq: {
    desc: "Remove duplicates (blocks)",
    run: (env, stdin, stdout, args) => {},
  },
  gsub: {
    desc: "Replace <regexp> with <replacement> in stream",
    run: (env, stdin, stdout, args) => {},
  },
};

export default commands;
