if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'El servidor no tiene configurada la clave de API de Gemini. Configura la variable GEMINI_API_KEY.' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL no proporcionada o inválida.' });
  }

  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(url)) {
    return res.status(400).json({ error: 'Formato de URL no válido.' });
  }

  if (url.length > 2048) {
    return res.status(400).json({ error: 'URL demasiado larga.' });
  }

  const prompt = `Analiza este video de estiramiento/ejercicio: ${url}\n\nBasándote en la URL y el contexto, extrae información sobre el estiramiento mostrado.\nResponde ÚNICAMENTE con un objeto JSON válido (sin bloques markdown, sin texto extra) con estos campos:\n\n{\n  "nombre": "nombre descriptivo del estiramiento",\n  "categoria": "una de: cuello, hombros, espalda_superior, espalda_baja, pecho, brazos, caderas, piernas, tobillos_pies, full_body",\n  "duracion": "estimación en minutos (número)",\n  "nivel": "principiante, intermedio o avanzado",\n  "musculos": ["lista de músculos principales trabajados"],\n  "descripcion": "breve descripción del estiramiento en 1-2 frases",\n  "beneficios": "principales beneficios del estiramiento",\n  "tags": ["etiquetas relevantes como: mañana, oficina, post-entreno, relajación, movilidad, flexibilidad"]\n};`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const status = response.status;
      if (status === 401 || status === 403 || (status === 400 && errData.error?.status === 'INVALID_ARGUMENT')) {
        return res.status(500).json({ error: 'Clave de API de Gemini inválida. Contacta al administrador.' });
      }
      if (status === 429) {
        return res.status(429).json({ error: 'Límite de peticiones de la API alcanzado. Espera un momento.' });
      }
      return res.status(502).json({ error: errData.error?.message || 'Error al comunicarse con Gemini.' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'La IA no devolvió un formato compatible. Intenta con otro video.' });
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'La IA no devolvió un formato compatible. Intenta con otro video.' });
    }

    const exerciseData = JSON.parse(jsonMatch[0]);

    const validCategories = [
      'cuello', 'hombros', 'espalda_superior', 'espalda_baja',
      'pecho', 'brazos', 'caderas', 'piernas', 'tobillos_pies', 'full_body'
    ];

    if (exerciseData.categoria && !validCategories.includes(exerciseData.categoria)) {
      exerciseData.categoria = 'full_body';
    }

    return res.json({ exercise: exerciseData });
  } catch (err) {
    console.error('Error en /api/analyze:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor al analizar el video.' });
  }
};