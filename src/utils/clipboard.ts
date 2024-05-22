// import $ from 'jquery';

export const putInClipboard = (text: string) => {
  // const $elem = $('<textarea />');
  // $('body').append($elem);
  // $elem.text(text).trigger('select');
  // document.execCommand("copy", true);
  // $elem.remove();
  navigator.clipboard.writeText(text).then(() => console.log("copied"));
};

export const getFromClipboard = () => {
  // const pasteTarget = document.createElement("div");
  // pasteTarget.contentEditable = "true";
  // const actElem = document.activeElement!.appendChild(pasteTarget).parentNode!;
  // pasteTarget.focus();
  navigator.clipboard.readText().then(clipText => {
    return clipText;
  });
  // document.execCommand("Paste", null, null);
  // const paste = pasteTarget.innerText;
  // actElem.removeChild(pasteTarget);
  // return paste;
};
