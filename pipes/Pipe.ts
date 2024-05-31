class Pipe<T> {
  private buffer: T[] = [];
  private readers: ((value?: T) => void)[] = [];
  private closed: boolean = false;

  write(value: T): void {
    if (this.closed) {
      throw new Error("Cannot write to a closed pipe.");
    }
    if (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader(value);
    } else {
      this.buffer.push(value);
    }
  }

  read(): Promise<T | void> {
    return new Promise((resolve, reject) => {
      if (this.buffer.length > 0) {
        resolve(this.buffer.shift()!);
      } else if (this.closed) {
        reject(new Error("Cannot read from a closed pipe."));
      } else {
        this.readers.push(resolve);
      }
    });
  }

  close(): void {
    this.closed = true;
    while (this.readers.length > 0) {
      const reader = this.readers.shift()!;
      reader();
      // reader(new Error("Pipe is closed"));
    }
  }
};

let randomIntArray = (min, max, n = 1) => Array
  .from({ length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min);

// Example usage:
let pipe = new Pipe<number>();

// Writer
let times = randomIntArray(1000, 10000, 3);
times.sort((a, b) => a - b);
for (let [i, ms] of times.entries()) {
  setTimeout(() => {
    pipe.write(i)
  }, ms);
}
setTimeout(() => pipe.close(), times[times.length - 1] + 500);

// Reader
(async () => {
  try {
    console.log(await pipe.read()); // 1
    console.log(await pipe.read()); // 2
    console.log(await pipe.read()); // 3
  } catch (error) {
    console.error(error.message);
  }
})();
