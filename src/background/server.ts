import { SERVER_PORT } from '~config';
import { Debug, type IMessage } from '~utils';

const debug = Debug('server');

export interface ServerResponse {
  errors?: string[];
  result?: any;
}
export interface ServerArgs {
  endpoint?: string;
}

// Call local server
export async function callServer(args: ServerArgs): Promise<ServerResponse> {
  const { endpoint = 'bshell', ...body } = args;
  try {
    const response = await fetch(`http://localhost:${SERVER_PORT}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body as BodyInit,
    });
    const data = await response.json();
    debug('server output: %O', data.output);
    return data;
  } catch (error) {
    console.error('Error:', error);
    return { errors: [error?.message ?? "unknown error"] };
  }
}

chrome.runtime.onMessage.addListener(
  (request: IMessage, sender, sendResponse: any) => {
    if (request.target !== 'server')
      return;

    debug("received from %s (%s): %j",
      sender.tab?.url, sender.tab?.incognito && 'incognito', request);

    (async () => {
      switch (request.command) {
        case 'callServer':
          const res = await callServer(request.payload);
          return res;
        default:
          return { errors: `unknown command: ${request.command}` };
      }
    })()
      .then(res => sendResponse(res))
      .catch(errors => sendResponse({ errors }));

    // keep message channel open until sendResponse is called
    return true;
  });
