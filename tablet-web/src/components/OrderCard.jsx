import "./OrderCard.css";

function minutesSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((Date.now() - t) / 60000);
  return Math.max(0, mins);
}

function fmtClock(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString();
}

function arrivalLabel(order) {
  const a = order?.arrival;
  if (!a) return "—";

  if (a.state === "ARRIVED") {
    const m = minutesSince(a.arrivedAt);
    return m == null ? "Arrived" : `Arrived ${m}m ago`;
  }

  if (a.state === "ETA") {
    if (a.etaMinutes == null) return "ETA";
    return `ETA ${a.etaMinutes}m`;
  }

  return "—";
}

function statusAgeLabel(order) {
  // Restaurant-friendly: show how long it’s been waiting in READY
  if (order?.status !== "READY") return null;
  const m = minutesSince(order?.updatedAt || order?.createdAt);
  if (m == null) return "Ready";
  return `Ready ${m}m`;
}

function computeUrgency(order) {
  // Simple, understandable rules:
  // - READY >= 5m => urgent
  // - INCOMING + ARRIVED and created >= 4m => urgent (arrived but not started)
  const createdMins = minutesSince(order?.createdAt);
  const arrivedMins =
    order?.arrival?.state === "ARRIVED" ? minutesSince(order?.arrival?.arrivedAt) : null;

  if (order?.status === "READY") {
    const readyMins = minutesSince(order?.updatedAt || order?.createdAt);
    if (readyMins != null && readyMins >= 5) return "urgent";
    return "normal";
  }

  if (order?.status === "INCOMING" && arrivedMins != null) {
    if (createdMins != null && createdMins >= 4) return "urgent";
    return "watch";
  }

  return "normal";
}

export default function OrderCard({ order }) {
  const urgency = computeUrgency(order);

  const topRight = order.table ?? "Unseated";
  const arrivalText = arrivalLabel(order);
  const createdClock = fmtClock(order.createdAt);
  const readyAge = statusAgeLabel(order);

  return (
    <div className={`card card-${urgency}`}>
      <div className="cardTop">
        <div className="left">
          <strong>#{order.id}</strong>
          <span className="muted"> P{order.partySize ?? "?"}</span>
        </div>

        <div className="badge">{topRight}</div>
      </div>

      <div className="cardMeta">
        <span className="metaLeft">{arrivalText}</span>
        <span className="metaRight">{createdClock}</span>
      </div>

      {readyAge && (
        <div className="pills">
          <span className="pill pill-ready">{readyAge}</span>
        </div>
      )}

      <div className="items">
        {(order.items || []).slice(0, 4).map((i, idx) => (
          <div key={idx}>
            {i.qty ?? 1}× {i.name}
          </div>
        ))}
        {(order.items || []).length > 4 && (
          <div className="muted">+{order.items.length - 4} more</div>
        )}
      </div>

      {(order.flags || []).length > 0 && (
        <div className="flags">
          {order.flags.map((f) => (
            <span key={f} className="flag">
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Restaurant hint: arrived but still incoming */}
      {order.status === "INCOMING" && order?.arrival?.state === "ARRIVED" && (
        <div className="hint">Arrived but not started</div>
      )}
    </div>
  );
}
