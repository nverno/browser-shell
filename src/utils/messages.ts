
export interface IMessage {
  target?: string,
  command: string;
  payload: { [key: string]: any };
};

export const sendMessage = async (message: IMessage) => {
  message.target ||= 'background';
  const res = await chrome.runtime.sendMessage(chrome.runtime.id, message);
  return res;
}

// export const sendMessage = async (
//   command: IMessage['command'],
//   payload: IMessage['payload'],
//   callback: any = (res: any) => res
// ) => {
//   chrome.runtime
//     .sendMessage(chrome.runtime.id, {
//       target: 'background',
//       command,
//       payload
//     })
//     .then((res) => { callback(res); })
//     .catch(errors => { callback({ errors }); });
// };
