
export interface IMessage {
  target?: string,
  command: string;
  payload: { [key: string]: any };
};

export const sendMessage = async (
  command: IMessage['command'],
  payload: IMessage['payload'],
  callback: any = (res: any) => res
) => {
  await chrome.runtime
    .sendMessage(chrome.runtime.id, {
      target: 'background',
      command,
      payload
    })
    .then((res) => { callback(res) });
};
