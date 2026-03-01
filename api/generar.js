export default async function handler(req, res) {
    // 1. Comprobamos que nos envían datos correctamente
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se permiten peticiones POST' });
    }

    const { ingredientes } = req.body;
    
    // 2. RECUPERAMOS TU CLAVE SECRETA DE LA CAJA FUERTE DE VERCEL
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        return res.status(500).json({ error: 'Falta la API Key en el servidor' });
    }

    // 3. El Prompt del sistema
    const systemPrompt = `Eres el 'Chef Mareta', un cocinero moderno y experto en la preparación de comidas para llevar de la marca Mareta. La marca vende el 'Mareta Bowl', un tupper premium con 3 características clave: 1) Compartimento principal grande y hermético, 2) Recipiente pequeño especial antifugas para aliños/salsas, y 3) Bandeja superior seca para ingredientes que deben mantenerse crujientes.
    El usuario te dará una lista de ingredientes. Tu objetivo es crear UNA receta creativa, deliciosa y saludable.
    Debes distribuir obligatoriamente los ingredientes pensando en las características del Mareta Bowl.
    Tono: Cercano, entusiasta, premium.
    Devuelve el resultado ESTRICTAMENTE en JSON usando el esquema solicitado.`;

    // 4. Preparamos la petición a Google (¡AQUÍ ESTÁ LA VERSIÓN ESTABLE CORREGIDA!)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: `Tengo estos ingredientes: ${ingredientes}. Crea una receta espectacular para mi Mareta Bowl.` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    nombre: { type: "STRING" },
                    descripcion: { type: "STRING" },
                    calorias: { type: "STRING" },
                    proteinas: { type: "STRING" },
                    carbos: { type: "STRING" },
                    grasas: { type: "STRING" },
                    base: { type: "STRING" },
                    toppings: { type: "STRING" },
                    alino: { type: "STRING" },
                    preparacion: { type: "STRING" },
                    toque_mareta: { type: "STRING" }
                },
                required: ["nombre", "descripcion", "calorias", "proteinas", "carbos", "grasas", "base", "toppings", "alino", "preparacion", "toque_mareta"]
            }
        }
    };

    // 5. Hacemos la llamada a Google de forma segura
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Error de Google: ${response.status} - ${errorDetails}`);
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        const recipe = JSON.parse(rawText);

        // 6. Devolvemos la receta ya lista a tu web
        return res.status(200).json(recipe);

    } catch (error) {
        console.error("Error en el servidor:", error);
        return res.status(500).json({ error: 'Error al generar la receta con la IA', details: error.message });
    }
}
