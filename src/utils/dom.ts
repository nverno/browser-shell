
export const randomLink = () => {
  return document.links[Math.floor(Math.random() * document.links.length)].href;
}
