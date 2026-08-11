const MANIFEST = {
  catwalk1: "assets/sprites/catwalk1.png",
  catwalk2: "assets/sprites/catwalk2.png",
  serverBoba: "assets/sprites/server_boba.png",
  serverFood: "assets/sprites/server_food.png",
  serverCake: "assets/sprites/server_cake.png",
};

const images = {};

function loadOne(name, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      images[name] = img;
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

export async function preloadImages() {
  await Promise.all(
    Object.entries(MANIFEST).map(([name, src]) => loadOne(name, src))
  );
}

export function getImage(name) {
  return images[name] || null;
}
