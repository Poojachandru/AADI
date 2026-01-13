import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { restaurants } from "../mock/restaurants";
import { menuByRestaurantId } from "../mock/menu";
import { addToCart, getCart } from "../store/cartStore";

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RestaurantMenu() {
  const { restaurantId } = useParams();
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const menu = menuByRestaurantId[restaurantId];

  const [cartVersion, setCartVersion] = useState(0);
  const cart = useMemo(() => getCart(restaurantId), [restaurantId, cartVersion]);
  const cartCount = cart.items.reduce((sum, x) => sum + x.qty, 0);

  if (!restaurant || !menu) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="hero">
            <div className="title">Restaurant not found</div>
            <div className="subtle">Go back and pick a restaurant.</div>
            <div className="divider" />
            <Link className="btn" to="/">Back</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="hero">
          <div className="spread">
            <div>
              <div className="kicker">Menu</div>
              <div className="title">{restaurant.name}</div>
              <div className="subtle">
                {restaurant.cuisine} • {restaurant.distanceMiles} mi • ETA {restaurant.etaMins}m
              </div>
            </div>

            <div className="row">
              <Link className="btn btnGhost" to="/">Change</Link>
              <Link className="btn btnPrimary" to={`/r/${restaurantId}/cart`}>
                Cart ({cartCount})
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="list">
        {menu.categories.map((cat) => (
          <div key={cat.id} className="card">
            <div className="sectionTitle">{cat.name}</div>
            <div className="subtle">Tap Add to build your order.</div>

            <div className="divider" />

            <div className="list">
              {cat.items.map((it) => (
                <div key={it.id} className="card cardSoft">
                  <div className="spread" style={{ alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>{it.name}</div>
                      <div className="subtle">{it.desc}</div>
                      <div style={{ height: 8 }} />
                      <span className="badge badgeAccent">Popular</span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="price">{money(it.priceCents)}</div>
                      <div style={{ height: 10 }} />
                      <button
                        className="btn"
                        onClick={() => {
                          addToCart(restaurantId, {
                            itemId: it.id,
                            name: it.name,
                            priceCents: it.priceCents,
                            qty: 1,
                          });
                          setCartVersion((v) => v + 1);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
