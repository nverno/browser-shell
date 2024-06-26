
export const sitFor = async (ms: number): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
};

/**
 * Polls a condition asynchronously until it is met.
 * @param conditionFn - A function that returns a promise resolving to a
 * boolean. The condition to be met.
 * @param interval - The interval in milliseconds between each poll.
 * @param timeout - The maximum time in milliseconds to keep polling. Throws an
 * error if the condition is not met within this time.
 * @returns A promise that resolves when the condition is met or rejects if the
 * timeout is reached.
 */
export async function pollUntil(
  conditionFn: () => Promise<boolean>, interval = 100, timeout = 60000 * 60000): Promise<void> {
  const endTime = Date.now() + timeout;

  const poll = async (resolve: () => void, reject: (reason?: any) => void) => {
    const res = await conditionFn();
    if (res) {
      resolve();
    } else if (Date.now() < endTime) {
      setTimeout(poll, interval, resolve, reject);
    } else {
      reject(new Error('Polling timed out'));
    }
  };

  return new Promise(poll);
}

// Example usage: A mock condition function that resolves to true after 5
// seconds.
// const conditionFn = async () => {
//   const currentTime = Date.now();
//   const targetTime = startTime + 5000;
//   return currentTime >= targetTime;
// };

// const startTime = Date.now();

// var res = await pollUntil(conditionFn, 1000, 10000)
// pollUntil(conditionFn, 1000, 10000)
//   .then(() => {
//     console.log('Condition met!');
//   }).catch((error) => {
//     console.error(error.message);
//   });
