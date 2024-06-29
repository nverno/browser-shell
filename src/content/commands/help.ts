import { Debug, fmtHelp, pick } from '~utils';
import { Commands, ArgsOrStdin } from '~content/exec';

const debug = Debug('cmd:help');

export const helpCommands: Commands = {
  help: {
    desc: "Show help",
    help: [
      "help - show short descriptions for all commands",
      "help commands... - show all help for COMMANDS",
      "help -l - list commands",
    ],
    run: async (env, stdin, stdout, args) => {
      if (args && args === '-l') {
        stdout.write(Object.keys(env.bin));
        stdout.close();
        return;
      }
      const input = new ArgsOrStdin(env, stdin, args, {
        name: 'help',
        flatten: true,
        splitStdin: ' ',
      });
      let cmds = await input.readAll();
      const details = cmds.length > 0;
      cmds = Object.entries(cmds.length > 0 ? pick(env.bin, cmds) : env.bin)
        .filter(([_, opts]: any) => opts.desc);
      cmds.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

      const cls = details ? 'bs-detail' : 'bs-col';
      cmds.forEach(([cmd, opts]: any) => {
        let doc = env.pp(cmd, `bs-keyword ${cls}`);
        if (opts.alias?.length > 0)
          doc += ' (' + env.pp(opts.alias, 'bs-alias', ',') + ')';
        if (env.termOpts.pretty)
          doc = `<div class=\"${cls}\"">${doc}</div> <div class=\"bs-desc\">${opts.desc}</div>`;
        else doc += ` ${opts.desc}`;
        
        if (details && opts.help?.length > 0)
          doc += "\n" + (env.termOpts.pretty
            ? (`<li class=\"${cls}\">` + opts.help.map(fmtHelp)
              .join(`</li>\n<li class=\"${cls}\">`) + '</li>'
            ) : opts.help.join('\n'));
        stdout.write(doc);
      });
      stdout.close();
    }
  },
};
