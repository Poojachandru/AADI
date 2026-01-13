import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { restaurants } from "../mock/restaurants";

export default function RestaurantPicker() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return restaurants;
    return restaurants.filter((r) =>
      (r.name + " " + r.cuisine).toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className="page">
      <div className="topbar">
        <div className="hero">
          <div className="spread">
            <div>
              <div className="kicker">AADI</div>
              <div className="title">Choose a restaurant</div>
              <div className="subtle">Pre-order, stage, and auto-fire on arrival (mock UI)</div>
            </div>
            <div className="badges">
              <span className="badge badgeAccent">Fast pickup</span>
              <span className="badge badgeCyan">Dine-in ready</span>
            </div>
          </div>

          <div className="divider" />

          <input
            className="input"
            placeholder="Search (e.g., sushi, tacos, italian)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="list">
        {filtered.map((r) => (
          <Link key={r.id} to={`/r/${r.id}`} className="card">
            <div className="spread">
              <div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>{r.name}</div>
                <div className="subtle">{r.cuisine}</div>
              </div>

              <div className="badges">
                <span className="badge">{r.distanceMiles} mi</span>
                <span className="badge badgeCyan">ETA {r.etaMins}m</span>
              </div>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="card">
            <div style={{ fontWeight: 900 }}>No matches</div>
            <div className="subtle">Try a different search.</div>
          </div>
        )}
      </div>
    </div>
  );
}
