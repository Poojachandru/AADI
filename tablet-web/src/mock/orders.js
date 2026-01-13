export const mockOrders = [
    {
      id: "A1032",
      status: "INCOMING",
      partySize: 2,
      table: null,
      createdAt: "2026-01-07T20:11:12Z",
      arrival: { state: "ETA", etaMinutes: 6 },
      items: [
        { name: "Burger", qty: 2 },
        { name: "Fries", qty: 1 }
      ],
      flags: ["ALLERGY"]
    },
    {
      id: "A1033",
      status: "PREPARING",
      partySize: 4,
      table: "T12",
      createdAt: "2026-01-07T20:05:10Z",
      arrival: { state: "ARRIVED", arrivedAt: "2026-01-07T20:09:00Z" },
      items: [
        { name: "Margherita Pizza", qty: 1 },
        { name: "Caesar Salad", qty: 2 },
        { name: "Iced Tea", qty: 4 }
      ],
      flags: []
    },
    {
      id: "A1034",
      status: "READY",
      partySize: 1,
      table: "T3",
      createdAt: "2026-01-07T19:55:42Z",
      arrival: { state: "ARRIVED", arrivedAt: "2026-01-07T19:57:00Z" },
      items: [{ name: "Espresso", qty: 1 }],
      flags: ["VIP"]
    }
  ];
  
