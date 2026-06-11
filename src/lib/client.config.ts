export const clientConfig = {
  name: "Studio Bandito",
  businessName: "Studio Bandito",
  businessDescription: "Estudio de corte de cabello, barba y masajes relajantes en San Juan",
  behavior: "profesional y cercano",
  slogan: "",
  address: "Tucumán 1106 sur, Capital, San Juan",
  phone: "2646230305",

  hours: {
    monday:    { open: "10:00", close: "20:00" },
    tuesday:   { open: "10:00", close: "20:00" },
    wednesday: { open: "10:00", close: "20:00" },
    thursday:  { open: "10:00", close: "20:00" },
    friday:    { open: "10:00", close: "20:00" },
    saturday:  { open: "10:00", close: "20:00" },
    sunday:    null,
  },

  services: [
    {
      id: "corte",
      name: "Corte de cabello / Barba",
      price: 17000,
      duration: 40,
      description: "Incluye productos",
    },
    {
      id: "corte_completo",
      name: "Corte + Barba + Perfilado de cejas",
      price: 20000,
      duration: 40,
      description: "Incluye productos",
    },
    {
      id: "masaje",
      name: "Masaje relajante",
      price: 40000,
      duration: 40,
      description: "Facial, capilar o cervical — a elección",
    },
  ],

  combos: [
    {
      id: "corte_masaje",
      name: "Corte + Masaje",
      description: "Combiná tu servicio de corte con un masaje relajante",
    },
  ],

  botName: "Soledad",
  botBooking: true,
  appointmentDuration: 30,
  loginPin: "0305",

  responseDelayMs: 8000,
  appointments: {
    enabled: true,
    resource: "Bandito",
  },
};
