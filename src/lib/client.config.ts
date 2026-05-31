export const clientConfig = {
  name: "Feer Demo",
  businessName: "Feer Demo",
  businessDescription: "Barbería profesional con los mejores servicios de corte, barba y grooming en San Juan",
  behavior: "profesional y cercano",
  slogan: "Tu mejor versión, cada semana",
  address: "San Juan Capital, San Juan",
  phone: "2640000000",

  hours: {
    monday:    { open: "09:00", close: "20:00" },
    tuesday:   { open: "09:00", close: "20:00" },
    wednesday: { open: "09:00", close: "20:00" },
    thursday:  { open: "09:00", close: "20:00" },
    friday:    { open: "09:00", close: "20:00" },
    saturday:  { open: "09:00", close: "18:00" },
    sunday:    null,
  },

  services: [
    {
      id: "corte",
      name: "Corte de cabello",
      price: 15000,
      duration: 30,
      description: "Corte clásico o moderno a elección",
    },
    {
      id: "barba",
      name: "Arreglo de barba",
      price: 10000,
      duration: 20,
      description: "Perfilado y definición de barba",
    },
    {
      id: "corte_barba",
      name: "Corte + Barba",
      price: 22000,
      duration: 50,
      description: "Combo completo, incluye productos",
    },
    {
      id: "afeitado",
      name: "Afeitado con navaja",
      price: 18000,
      duration: 30,
      description: "Afeitado tradicional con toalla caliente",
    },
    {
      id: "corte_ninos",
      name: "Corte infantil",
      price: 10000,
      duration: 25,
      description: "Para menores de 12 años",
    },
    {
      id: "grooming",
      name: "Grooming completo",
      price: 35000,
      duration: 60,
      description: "Corte + barba + cejas + productos premium",
    },
  ],

  combos: [
    {
      id: "corte_barba_combo",
      name: "Corte + Barba",
      description: "El combo más pedido, ahorrás vs precio individual",
    },
  ],

  botName: "Feer",
  botBooking: true,
  appointmentDuration: 30,
  loginPin: "3175",

  responseDelayMs: 8000,
  appointments: {
    enabled: true,
    resource: "Barbero",
  },
};
