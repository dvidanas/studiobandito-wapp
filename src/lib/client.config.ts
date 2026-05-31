export const clientConfig = {
  name: "Nombre del Negocio",
  businessName: "Nombre del Negocio",
  businessDescription: "Descripción breve del negocio y sus servicios",
  behavior: "profesional y cercano",
  slogan: "",
  address: "Dirección del negocio, Ciudad",
  phone: "1100000000",

  hours: {
    monday:    { open: "09:00", close: "18:00" },
    tuesday:   { open: "09:00", close: "18:00" },
    wednesday: { open: "09:00", close: "18:00" },
    thursday:  { open: "09:00", close: "18:00" },
    friday:    { open: "09:00", close: "18:00" },
    saturday:  { open: "09:00", close: "14:00" },
    sunday:    null,
  },

  services: [
    {
      id: "servicio_1",
      name: "Servicio 1",
      price: 10000,
      duration: 30,
      description: "Descripción del servicio",
    },
    {
      id: "servicio_2",
      name: "Servicio 2",
      price: 15000,
      duration: 45,
      description: "Descripción del servicio",
    },
  ],

  combos: [],

  botName: "Asistente",
  botBooking: true,
  appointmentDuration: 30,
  loginPin: "0000",

  responseDelayMs: 8000,
  appointments: {
    enabled: true,
    resource: "Principal",
  },
};
