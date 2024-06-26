export const putInClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => console.log("copied"));
};

export const getFromClipboard = () => {
  navigator.clipboard.readText().then(clipText => {
    return clipText;
  });
};
