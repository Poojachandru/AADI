const KEY = "aadi_cart_v1";

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getCart(restaurantId) {
  const all = read();
  return all[restaurantId] || { items: [] };
}

export function setCart(restaurantId, cart) {
  const all = read();
  all[restaurantId] = cart;
  write(all);
}

export function addToCart(restaurantId, item) {
  const cart = getCart(restaurantId);
  const existing = cart.items.find((x) => x.itemId === item.itemId);
  if (existing) existing.qty += item.qty;
  else cart.items.push(item);
  setCart(restaurantId, cart);
  return cart;
}

export function updateQty(restaurantId, itemId, qty) {
  const cart = getCart(restaurantId);
  cart.items = cart.items
    .map((x) => (x.itemId === itemId ? { ...x, qty } : x))
    .filter((x) => x.qty > 0);
  setCart(restaurantId, cart);
  return cart;
}

export function clearCart(restaurantId) {
  setCart(restaurantId, { items: [] });
}
