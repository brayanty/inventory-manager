import Fuse from "fuse.js";

export function searchCoincide(data, search, keys) {
  try {
    const fuse = new Fuse(data, {
      keys: [...keys],
      includeScore: false,
    });
    return fuse.search(search).map((r) => r.item);
  } catch (error) {
    console.error("Error in searchCoincide:", error);
    return [];
  }
}
