// ============================================================
// Edge Function — Génération IA de lignes de facture
// Reçoit une description libre + contexte (catalogue, catégories)
// Appelle l'API Claude et retourne des lignes structurées
// ============================================================

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  description: string
  products: { name: string; category: string; default_price_ht: number | null; unit: string; tva_rate: number }[]
  categories: { id: string; label: string; tva_rate: number; activity_type: string }[]
  is_vat_exempt: boolean
  territoire: 'metropole' | 'dom'
}

interface GeneratedLine {
  description: string
  quantity: number
  unit: string
  unit_price_ht: number
  tva_rate: number
  category: string
  activity_type: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body: RequestBody = await req.json()
    const { description, products, categories, is_vat_exempt, territoire } = body

    if (!description || description.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Description trop courte' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Build context for Claude
    const productCatalog = products.length > 0
      ? `\nCatalogue produits existants :\n${products.map(p => `- "${p.name}" : ${p.default_price_ht ?? '?'}€ HT/${p.unit}, catégorie ${p.category}, TVA ${p.tva_rate}%`).join('\n')}`
      : ''

    const categoryList = categories
      .map(c => `- ${c.id} : ${c.label} (TVA ${c.tva_rate}%, type: ${c.activity_type})`)
      .join('\n')

    const tvaNote = is_vat_exempt
      ? 'IMPORTANT : L\'entreprise est auto-entrepreneur exonérée de TVA (art. 293 B CGI). Tous les taux TVA doivent être à 0.'
      : territoire === 'dom'
        ? 'IMPORTANT : L\'entreprise est en DOM. Taux TVA DOM : normal 8.5%, réduit 2.1%.'
        : ''

    const systemPrompt = `Tu es un assistant de facturation pour auto-entrepreneurs et TPE françaises.
À partir d'une description libre, tu génères des lignes de facture structurées en JSON.

Catégories fiscales disponibles :
${categoryList}
${productCatalog}

${tvaNote}

Règles :
- Retourne UNIQUEMENT un tableau JSON valide, sans texte avant/après
- Chaque ligne doit avoir : description, quantity, unit, unit_price_ht, tva_rate, category, activity_type
- Les prix doivent être réalistes pour le marché français
- Si un produit du catalogue correspond, utilise son prix et sa catégorie
- unit parmi : "unité", "heure", "jour", "forfait", "m²", "kg", "lot", "session", "pièce"
- category doit être un ID exact de la liste ci-dessus
- activity_type parmi : "service", "goods", "produit_fini", "formation", "export", "exempt"
- Arrondis les prix à 2 décimales`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Génère les lignes de facture pour : "${description}"`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic API error:', err)
      return new Response(
        JSON.stringify({ error: 'Erreur API IA' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const content = result.content?.[0]?.text ?? '[]'

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: 'Réponse IA invalide', raw: content }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    let parsed: unknown[]
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return new Response(
        JSON.stringify({ error: 'Réponse IA : JSON invalide', raw: content }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Réponse IA vide' }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const validUnits = ['unité', 'heure', 'jour', 'forfait', 'm²', 'kg', 'lot', 'session', 'pièce']
    const validActivityTypes = ['service', 'goods', 'produit_fini', 'formation', 'export', 'exempt']
    const categoryIds = new Set(categories.map(c => c.id))

    const lines: GeneratedLine[] = parsed
      .filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).description === 'string'
      )
      .map((item) => ({
        description: String(item.description).slice(0, 500),
        quantity: Math.max(0.01, Number(item.quantity) || 1),
        unit: validUnits.includes(String(item.unit)) ? String(item.unit) : 'unité',
        unit_price_ht: Math.max(0, Math.round((Number(item.unit_price_ht) || 0) * 100) / 100),
        tva_rate: Math.max(0, Number(item.tva_rate) || 0),
        category: categoryIds.has(String(item.category)) ? String(item.category) : (is_vat_exempt ? 'exempt_293b' : 'prestation_generale'),
        activity_type: validActivityTypes.includes(String(item.activity_type)) ? String(item.activity_type) : 'service',
      }))

    if (lines.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucune ligne valide générée par l\'IA' }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ lines }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
