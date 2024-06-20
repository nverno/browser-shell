// interface Command {
//   desc: string;
//   run: (stdin: any, stdout: any, env: any, args: any) => void;
// }

// interface Commands {
//   Terminal?: {
//     eval?: Command;
//   };
// }

// const evalCommand: Command = {
//   desc: "Run inline CoffeeScript",
//   run: (stdin, stdout, env, args) => {

//     const evalAndEmit = (javascript: string, input: any, readyForMore: () => void) => {
//       let result: any = eval(javascript);
//       if (typeof result === 'string') {
//         result = result.split(/\n/);
//       }
//       if (!Array.isArray(result)) {
//         result = [result];
//       }

//       if (result.length > 0) {
//         result.forEach((line: string, index: number) => {
//           if (index === result.length - 1 && readyForMore) {
//             stdout.send(line, readyForMore);
//           } else {
//             stdout.send(line);
//           }
//         });
//       } else {
//         if (readyForMore) readyForMore();
//       }
//     };

//     let closed = false;
//     let pendingCount = 0;

//     stdout.onReceiver(() => {
//       if (stdin) {
//         stdin.onSenderClose(() => {
//           closed = true;
//           if (pendingCount === 0) {
//             stdout.closeWrite();
//           }
//         });

//         stdin.receive((input: any, readyForMore: () => void) => {
//           const source = args ? args : input;
//           pendingCount += 1;
//           remote("coffeeCompile", { coffeescript: `return ${source}` }, (response: any) => {
//             pendingCount -= 1;
//             try {
//               if (response.errors) throw response.errors;
//               evalAndEmit(response.javascript, input, readyForMore);
//               if (closed && pendingCount === 0) {
//                 stdout.closeWrite();
//               }
//             } catch (e) {
//               env.helpers.fail(env, stdout, e);
//             }
//           });
//         });
//       } else if (args) {
//         Utils.remote("coffeeCompile", { coffeescript: `return ${args}` }, (response: any) => {
//           try {
//             if (response.errors) throw response.errors;
//             evalAndEmit(response.javascript);
//             stdout.closeWrite();
//           } catch (e) {
//             env.helpers.fail(env, stdout, e);
//           }
//         });
//       } else {
//         env.helpers.fail(env, stdout, "args or stdin required");
//       }
//     });
//   }
// };

