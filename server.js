const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security middleware ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    }
  }
}));

app.use(express.json({ limit: '1kb' }));

// Rate limiting: max 20 API analyze requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Espera un momento antes de intentar de nuevo.' }
});

// --- Serve static files from /public ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API proxy for Claude ---
app.post('/api/analyze', apiLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'El servidor no tiene configurada la clave de API de Anthropic. Configura la variable ANTHROPIC_API_KEY.' });
  }

  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL no proporcionada o inválida.' });
  }

  // Validate URL format (allow Instagram, YouTube, TikTok, and general URLs)
  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(url)) {
    return res.status(400).json({ error: 'Formato de URL no válido.' });
  }

  // Limit URL length to prevent abuse
  if (url.length > 2048) {
    return res.status(400).json({ error: 'URL demasiado larga.' });
  }

  const prompt = `Analiza este video de estiramiento/ejercicio: ${url}

Basándote en la URL y el contexto, extrae información sobre el estiramiento mostrado.
Responde ÚNICAMENTE con un objeto JSON válido (sin bloques markdown, sin texto extra) con estos campos:

{
  "nombre": "nombre descriptivo del estiramiento",
  "categoria": "una de: cuello, hombros, espalda_superior, espalda_baja, pecho, brazos, caderas, piernas, tobillos_pies, full_body",
  "duracion": "estimación en minutos (número)",
  "nivel": "principiante, intermedio o avanzado",
  "musculos": ["lista de músculos principales trabajados"],
  "descripcion": "breve descripción del estiramiento en 1-2 frases",
  "beneficios": "principales beneficios del estiramiento",
  "tags": ["etiquetas relevantes como: mañana, oficina, post-entreno, relajación, movilidad, flexibilidad"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const status = response.status;
      if (status === 401) {
        return res.status(500).json({ error: 'Clave de API de Anthropic inválida. Contacta al administrador.' });
      }
      if (status === 429) {
        return res.status(429).json({ error: 'Límite de peticiones de la API alcanzado. Espera un momento.' });
      }
      return res.status(502).json({ error: errData.error?.message || 'Error al comunicarse con Claude.' });
    }

    const data = await response.json();
    const rawText = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'La IA no devolvió un formato compatible. Intenta con otro video.' });
    }

    const exerciseData = JSON.parse(jsonMatch[0]);

    // Validate required fields
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
});

// --- API to suggest a plan based on exercises ---
app.post('/api/suggest-plan', apiLimiter, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

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
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(502).json({ error: errData.error?.message || 'Error al comunicarse con Claude.' });
    }

    const data = await response.json();
    const rawText = data.content[0].text;

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
});

// Fallback to index.html for SPA-like routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏋️ StretchLibrary server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY no está configurada. La funcionalidad de IA no estará disponible.');
  }
});
