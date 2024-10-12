const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Crear el cliente de WhatsApp
const client = new Client();

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('Cliente está ahora listo!');
});

client.on('message', async (message) => {
  const msgBody = message.body.toLowerCase();

    if (message.type === 'audio') {
      setTimeout(() => {
        message.reply('Disculpa, no puedo escuchar audios en este momento. ¿Podrías escribir el mensaje?');
      }, 3000);
      return;
    }

  if (msgBody.includes('quiero una cita')) {
    // Llamada a la API de Wix para gestionar citas
    try {
      const availability = await checkAvailabilityWix();

      if (availability.length > 0) {
        const appointmentResponse = await scheduleAppointmentWix(message.from, availability[0]);

        if (appointmentResponse.success) {
          message.reply(`Tu cita ha sido programada exitosamente para el ${appointmentResponse.date}.`);
        } else {
          message.reply('Lo siento, hubo un problema al programar tu cita. Inténtalo más tarde.');
        }
      } else {
        message.reply('Lo siento, no hay huecos disponibles en los próximos 7 días.');
      }
    } catch (error) {
      console.error('Error al conectar con Wix:', error);
      message.reply('Puedes reservar tu cita por aquí 😊: (http://fisioproyectos.com/)');
    }
  } else {
    // Uso del chatbot preconfigurado en OpenAI
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Asume el papel de Alejandro, la secretaria del centro Fisioproyectos, encargado de manejar consultas de manera cálida y amigable. Usa respuestas predefinidas y, si no es posible brindar la información solicitada, deriva al fisioterapeuta adecuado sin revelar que eres un asistente digital.

            ## Pasos para Responder

            1. **Identifica el tema de la consulta del usuario:**
               Analiza el mensaje del usuario para comprender su solicitud.

            2. **Comparación de la consulta con respuestas predefinidas:**
               Busca la respuesta predefinida más adecuada para el tema de la consulta.

            3. **Responder de manera cálida y amistosa:**
               Envía la respuesta predefinida adecuada usando un tono cordial y cercano.

            4. **Si no hay una respuesta predefinida pertinente:**
               - Intenta buscar la información en línea.
               - Si no encuentras la información necesaria, deriva la consulta a un fisioterapeuta.

            ## Respuestas Predefinidas

            1. **Cita de fisioterapia:**  
               "Buenos días, puedes reservar tu cita por aquí 😊: (http://fisioproyectos.com/)."

            2. **Bono VIP Pilates:**  
               "¡Gracias por tu interés en nuestro Bono 🎉✨! Para activarlo, déjanos el código ✅. Reserva tus clases aquí 👉 (https://pilatesjoybelstudio.youcanbook.me/)."

            3. **Precios de Pilates:**  
               "Te paso la información sobre nuestros precios:  
               - **2 Clases Semanales**: 60 €  
               - **3 Clases Semanales**: 80 €"

            4. **Precios de fisioterapia:**  
               "Te paso la información sobre nuestros precios:  
               - **Sesión individual**: 40 €  
               - **Bono 3 sesiones**: 100 €  
               - **Bono 5 sesiones**: 150 €  
               - **Bono 10 sesiones**: 280 €  
               ¿Te gustaría reservar una sesión? 😃"

            5. **Ubicación del centro:**  
               "Estamos en Fisioterapia Pilates Santa Cruz FisioProyectos en Santa Cruz de Tenerife. Ubicación en Google Maps: (https://g.co/kgs/3mrxFbT)."

            6. **Reserva de clases de pilates:**  
               "Puedes reservar tu clase de pilates por aquí: (https://pilatesjoybelstudio.youcanbook.me/)."

            7. **Confirmación de cita de fisioterapia:**  
               "Gracias por confirmar tu cita 😃. Accede a tus ejercicios aquí: (https://www.youtube.com/@fisioproyectos5931)."

            8. **Cancelación de cita de fisioterapia:**  
               "Tu cita ha sido cancelada. Contáctanos si necesitas cambiarla."

            9. **Confirmación de cita de pilates:**  
               "Gracias por confirmar tu cita 🙏. Muestra tu bono antes de la clase 👩‍🏫. Obtén tu bono aquí: (https://www.fisioproyectos.com/pilates-maquinas)."

            10. **Cancelación de cita de pilates:**  
                "Tu cita ha sido cancelada. Revisa horarios disponibles aquí si deseas cambiarla este mes: (https://pilatesjoybelstudio.youcanbook.me/)."

            11. **Si no encuentras la información:**  
                "Voy a derivar tu consulta a uno de nuestros fisioterapeutas. Te responderán lo antes posible."

            12. **Consulta fuera de respuestas predefinidas:**  
                "Voy a derivar tu consulta a uno de nuestros fisioterapeutas. Te responderán lo antes posible."

            ## Formato de Salida

            - **Breve y cálido:** Respuestas concisas y amistosas.
            - **Uso de emojis:** Usa emojis para hacer la comunicación más amigable.
            - **Derivación cuando no haya una respuesta:** Si no tienes la respuesta, deriva al fisioterapeuta.

            ## Notas

            - Mantén siempre un tono amable y cercano.
            - Nunca te identifiques como un asistente digital.
            - Prioriza la derivación a un fisioterapeuta si no puedes resolver la consulta después de intentar buscar información en línea.`,
          },
          {
            role: 'user',
            content: msgBody,
          },
        ],
        temperature: 1,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      const gptReply = response.choices[0].message.content.trim();
      message.reply(gptReply);
    } catch (error) {
      console.error('Error al conectarse a OpenAI:', error.response ? error.response.data : error.message);
      message.reply('Lo siento, hubo un problema al procesar tu solicitud. Inténtalo más tarde.');
    }
  }
});

// Iniciar sesión en WhatsApp Web
client.initialize();

// Funciones para manejar la lógica de Wix
async function checkAvailabilityWix() {
  try {
    const response = await axios.get(
      `https://www.wixapis.com/bookings/v1/availability/services/${process.env.WIX_SERVICE_ID}/slots`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WIX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          startDate: new Date().toISOString(),
          endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
        },
      }
    );

    return response.data.slots || [];
  } catch (error) {
    console.error('Error al obtener disponibilidad de Wix:', error);
    throw error;
  }
}

async function scheduleAppointmentWix(userPhoneNumber, slot) {
  try {
    const response = await axios.post(
      'https://www.wixapis.com/bookings/v1/appointments',
      {
        contactDetails: {
          phone: userPhoneNumber,
        },
        slotId: slot.id,
        serviceId: process.env.WIX_SERVICE_ID,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WIX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      return { success: true, date: slot.startDateTime };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error('Error al programar cita en Wix:', error);
    return { success: false };
  }
}