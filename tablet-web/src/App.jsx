import "./App.css";
import OrderCard from "./components/OrderCard";
import { useOrders } from "./hooks/useOrders";

function Column({ title, orders }) {
  return (
    <section className="col">
      <h2 className="colTitle">
        <span>{title}</span>
        <span className="count">{orders.length}</span>
      </h2>
      <div className="colBody">
        {orders.length === 0 && <div className="empty">No orders</div>}
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </section>
  );
}

function formatTime(d) {
  if (!d) return "—";
  return d.toLocaleTimeString();
}

function minutesSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60000);
  return Math.max(0, mins);
}

function buildAlerts(allOrders) {
  const alerts = [];

  for (const o of allOrders) {
    if (o.status === "READY") {
      const m = minutesSince(o.updatedAt || o.createdAt);
      if (m != null && m >= 5) {
        alerts.push({
          key: `ready-${o.id}`,
          severity: "urgent",
          title: `Ready ${m}m`,
          detail: `#${o.id} • ${o.table ?? "Unseated"}`,
        });
      }
    }

    if (o.status === "INCOMING" && o?.arrival?.state === "ARRIVED") {
      const createdM = minutesSince(o.createdAt);
      if (createdM != null && createdM >= 4) {
        const arrivedM = minutesSince(o.arrival.arrivedAt);
        alerts.push({
          key: `arrived-${o.id}`,
          severity: "watch",
          title: "Arrived, not started",
          detail: `#${o.id} • ${o.table ?? "Unseated"} • ${arrivedM ?? "?"}m ago`,
        });
      }
    }
  }

  const score = (a) => (a.severity === "urgent" ? 2 : a.severity === "watch" ? 1 : 0);
  alerts.sort((a, b) => score(b) - score(a));
  return alerts.slice(0, 12);
}

export default function App() {
  const { ordersByStatus, connectionStatus, lastUpdated, debug } = useOrders({
    pollMs: 2000,
    path: "/tablet/orders",
  });

  const incoming = ordersByStatus.incoming;
  const preparing = ordersByStatus.preparing;
  const ready = ordersByStatus.ready;

  const allOrders = [...incoming, ...preparing, ...ready];
  const alerts = buildAlerts(allOrders);

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="title">Arrival-Aware Tablet</div>
          <div className="subtle">Last update: {formatTime(lastUpdated)}</div>
          <div className="subtle" style={{ marginTop: 4 }}>
            Mode: {debug?.mode} | URL: {debug?.lastUrl}
            {debug?.lastError ? ` | Error: ${debug.lastError}` : ""}
          </div>
        </div>

        <div className={`conn conn-${connectionStatus.toLowerCase()}`}>
          <span className="dot" />
          <span>{connectionStatus}</span>
        </div>
      </header>

      <main className="layout">
        <div className="grid">
          <Column title="Incoming" orders={incoming} />
          <Column title="Preparing" orders={preparing} />
          <Column title="Ready" orders={ready} />
        </div>

        <aside className="rail">
          <div className="railHeader">
            <div className="railTitle">Alerts</div>
            <div className="railCount">{alerts.length}</div>
          </div>

          <div className="railBody">
            {alerts.length === 0 ? (
              <div className="railEmpty">No alerts</div>
            ) : (
              alerts.map((a) => (
                <div key={a.key} className={`alert alert-${a.severity}`}>
                  <div className="alertTitle">{a.title}</div>
                  <div className="alertDetail">{a.detail}</div>
                </div>
              ))
            )}
          </div>

          <div className="railFooter">
            <div className="railStat">
              <span className="railLabel">Incoming</span>
              <span className="railValue">{incoming.length}</span>
            </div>
            <div className="railStat">
              <span className="railLabel">Preparing</span>
              <span className="railValue">{preparing.length}</span>
            </div>
            <div className="railStat">
              <span className="railLabel">Ready</span>
              <span className="railValue">{ready.length}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
