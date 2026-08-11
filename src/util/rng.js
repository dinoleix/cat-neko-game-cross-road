export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function pick(list) {
  return list[randInt(0, list.length - 1)];
}

export function chance(probability) {
  return Math.random() < probability;
}
