if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'El servidor no tiene configurada la clave de API.' });
  }

  const { exercises } = req.body;

  if (!Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'Debes proporcionar al menos un ejercicio para crear un plan.' });
  }

  // Limit the number of exercises to prevent abuse
  if (exercises.length > 50) {
    return res.status(400).json({ error: 'Demasiados ejercicios. Máximo 50.' });
  }

  const exerciseList = exercises.map((e, i) =>
    `${i + 1}. ${e.nombre} (${e.categoria}, ${e.nivel}) - ${e.descripcion || ''}`
  ).join('\n');

  const prompt = `Basándote en estos estiramientos guardados por el usuario, sugiere un plan de estiramientos organizado.

Estiramientos disponibles:
${exerciseList}

Crea un plan de estiramientos coherente agrupando los ejercicios similares o complementarios.
Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra):

{
  "nombre_plan": "nombre descriptivo del plan",
  "descripcion": "descripción breve del plan",
  "duracion_total": "estimación en minutos",
  "nivel": "principiante, intermedio o avanzado",
  "rutina": [
    {
      "orden": 1,
      "ejercicio_index": 0,
      "duracion_segundos": 30,
      "repeticiones": "30 segundos cada lado",
      "notas": "nota opcional"
    }
  ],
  "consejos": ["consejo 1", "consejo 2"]
}

El campo ejercicio_index es el índice (base 0) del ejercicio en la lista proporcionada.`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
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
      if (status === 401 || status === 403) {
        return res.status(500).json({ error: 'Clave de API de Gemini inválida. Contacta al administrador.' });
      }
      return res.status(502).json({ error: errData.error?.message || 'Error al comunicarse con Gemini.' });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return res.status(502).json({ error: 'La IA no devolvió un formato compatible.' });
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'La IA no devolvió un formato compatible.' });
    }

    const plan = JSON.parse(jsonMatch[0]);
    return res.json({ plan });
  } catch (err) {
    console.error('Error en /api/suggest-plan:', err.message);
    return res.status(500).json({ error: 'Error interno del servidor al crear el plan.' });
  }
};
