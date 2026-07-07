export type ReturnReason = "Größe" | "Qualität" | "Farbe" | "Material" | "Sonstiges"
export type AIStatus = "Optimiert" | "In Bearbeitung" | "Ausstehend"

export interface Product {
  id: string
  name: string
  category: string
  size: string
  color: string
  returnRate: number
  topReason: ReturnReason
  aiStatus: AIStatus
  imageUrl: string
  description: string
  aiDescription: string
  comments: string[]
  qualityIssues: string[]
  aiInsight: string
  recommendations: Recommendation[]
}

export interface Recommendation {
  id: string
  text: string
  priority: "Hoch" | "Mittel" | "Niedrig"
  impact: string
  effort: "Niedrig" | "Mittel" | "Hoch"
  done: boolean
}

export const products: Product[] = [
  {
    id: "ART-10482",
    name: "Slim-Fit Chino Hose",
    category: "Hosen",
    size: "M",
    color: "Beige",
    returnRate: 38.4,
    topReason: "Größe",
    aiStatus: "Ausstehend",
    imageUrl: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&auto=format",
    description: "Moderne Slim-Fit Chino Hose aus hochwertiger Baumwolle. Perfekt für Büro und Freizeit. Erhältlich in verschiedenen Farben.",
    aiDescription: "Moderne Slim-Fit Chino Hose aus 98% Baumwolle, 2% Elasthan – für optimale Bewegungsfreiheit. Fällt eine Größe kleiner aus: Bitte eine Nummer größer bestellen. Bundweite 78 cm (M), Innenbeinlänge 82 cm. Ideal für Körpergrößen 175–185 cm.",
    comments: [
      '"Viel zu eng, obwohl ich immer M trage – musste zurückschicken."',
      '"Passform nicht wie auf dem Foto, sehr enganliegend."',
      '"Größe stimmt nicht mit der Tabelle überein."',
    ],
    qualityIssues: [
      "Naht an der Seitennaht reißt nach wenigen Wäschen",
      "Stoff wirkt dünner als auf den Produktfotos",
      "Reißverschluss klemmt bei 12% der Retouren",
    ],
    aiInsight: "Viele Kunden senden diesen Artikel aufgrund der Größenangabe zurück. Die Beschreibung enthält keine Information zur Passform oder Körpergröße. Ein Hinweis auf den Slim-Fit-Schnitt und eine Größentabelle würden die Retourenquote signifikant senken.",
    recommendations: [
      { id: "r1", text: "Größenhinweis hinzufügen", priority: "Hoch", impact: "−12% Retouren", effort: "Niedrig", done: false },
      { id: "r2", text: "Produktbeschreibung ergänzen", priority: "Hoch", impact: "−8% Retouren", effort: "Niedrig", done: false },
      { id: "r3", text: "Neue Produktfotos aufnehmen", priority: "Mittel", impact: "−5% Retouren", effort: "Hoch", done: false },
      { id: "r4", text: "Qualitätsprüfung durchführen", priority: "Hoch", impact: "−6% Retouren", effort: "Mittel", done: false },
      { id: "r5", text: "Hersteller informieren", priority: "Mittel", impact: "−4% Retouren", effort: "Mittel", done: false },
    ],
  },
  {
    id: "ART-20871",
    name: "Oversized Linen Blazer",
    category: "Jacken",
    size: "L",
    color: "Weiß",
    returnRate: 29.1,
    topReason: "Qualität",
    aiStatus: "In Bearbeitung",
    imageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4e5e?w=400&h=400&fit=crop&auto=format",
    description: "Leichter Leinenblazer im Oversized-Schnitt. Perfekt für sommerliche Outfits.",
    aiDescription: "Leichter Leinenblazer (100% Leinen) im bewusst weiten Oversized-Schnitt. Bitte in Ihrer gewohnten Größe bestellen. Beachten Sie: Leinen neigt zu natürlicher Faltenbildung – ein Qualitätsmerkmal des Materials. Pflegeempfehlung: Handwäsche, 30°C.",
    comments: [
      '"Stoff ist sehr transparent, das war nicht erkennbar."',
      '"Nähte lassen nach zweimal tragen nach."',
      '"Farbe wirkt im echten Leben gelblicher als auf den Fotos."',
    ],
    qualityIssues: [
      "Transparenz des Stoffes nicht in Beschreibung erwähnt",
      "Nähte zeigen Mängel bei 18% der Rücksendungen",
      "Farbabweichung zu Produktfoto bemängelt",
    ],
    aiInsight: "Qualitätsbezogene Rücksendungen dominieren. Transparenz des Leinenstoffs und Pflegehinweise fehlen in der Produktbeschreibung völlig. Zusätzlich deuten Kundenbewertungen auf Nahtprobleme hin, die mit dem Hersteller geklärt werden sollten.",
    recommendations: [
      { id: "r1", text: "Materialeigenschaften beschreiben", priority: "Hoch", impact: "−10% Retouren", effort: "Niedrig", done: true },
      { id: "r2", text: "Pflegehinweise ergänzen", priority: "Mittel", impact: "−5% Retouren", effort: "Niedrig", done: false },
      { id: "r3", text: "Hersteller wegen Nahtqualität kontaktieren", priority: "Hoch", impact: "−8% Retouren", effort: "Hoch", done: false },
    ],
  },
  {
    id: "ART-33104",
    name: "Merino Rollkragenpullover",
    category: "Pullover",
    size: "S",
    color: "Navyblau",
    returnRate: 11.2,
    topReason: "Farbe",
    aiStatus: "Optimiert",
    imageUrl: "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400&h=400&fit=crop&auto=format",
    description: "Klassischer Rollkragenpullover aus 100% Merino-Wolle. Besonders weich und wärmend.",
    aiDescription: "Klassischer Rollkragenpullover aus 100% feinster Merino-Wolle (Merinograde 17,5 Mikron). Hinweis: Die Farbe Navyblau erscheint je nach Bildschirmkalibrierung leicht unterschiedlich – im echten Leben tendenziell etwas dunkler als auf dem Foto. Fällt größentreu aus.",
    comments: [
      '"Farbe ist etwas dunkler als erwartet, aber schöne Qualität."',
      '"Sehr weich, genau wie beschrieben."',
    ],
    qualityIssues: [],
    aiInsight: "Geringe Retourenquote. Der Hauptgrund sind Farberwartungen, die durch einen Disclaimer im Listing bereits adressiert wurden. Das Produkt gilt als optimiert.",
    recommendations: [
      { id: "r1", text: "Farbdisclaimer aktuell halten", priority: "Niedrig", impact: "−2% Retouren", effort: "Niedrig", done: true },
    ],
  },
  {
    id: "ART-44230",
    name: "Boyfriend Jeans",
    category: "Hosen",
    size: "XS",
    color: "Hellblau",
    returnRate: 42.7,
    topReason: "Größe",
    aiStatus: "Ausstehend",
    imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop&auto=format",
    description: "Lässige Boyfriend Jeans mit Stretch-Anteil für optimalen Komfort.",
    aiDescription: "Lässige Boyfriend Jeans mit 2% Stretch für optimalen Komfort. Wichtig: XS entspricht Bundweite 68 cm, Hüfte 90 cm. Schnitt fällt bewusst weit aus (Boyfriend-Fit). Empfehlung für schlanke Figuren: Eine Nummer kleiner wählen.",
    comments: [
      '"XS ist wie ein M – viel zu groß!"',
      '"Auch nach Waschen zieht sich der Stoff stark zusammen."',
      '"Super bequem, aber Größentabelle ist irreführend."',
      '"Zurückgeschickt weil Hüftumfang nicht passt."',
    ],
    qualityIssues: [
      "Starkes Einlaufen nach dem Waschen bei 22% der Fälle",
      "Größentabelle stimmt nicht mit realem Schnitt überein",
    ],
    aiInsight: "Höchste Retourenquote im Sortiment. Der Boyfriend-Schnitt fällt stark von der Norm ab, ohne dass die Beschreibung darauf hinweist. Dazu kommt erhebliches Einlaufen, das nicht kommuniziert wird. Sofortiger Handlungsbedarf.",
    recommendations: [
      { id: "r1", text: "Schnitt-Erklärung hinzufügen", priority: "Hoch", impact: "−15% Retouren", effort: "Niedrig", done: false },
      { id: "r2", text: "Maßtabelle korrigieren", priority: "Hoch", impact: "−10% Retouren", effort: "Mittel", done: false },
      { id: "r3", text: "Einlaufhinweis ergänzen", priority: "Hoch", impact: "−8% Retouren", effort: "Niedrig", done: false },
      { id: "r4", text: "Neue Messungen beim Hersteller anfordern", priority: "Mittel", impact: "−6% Retouren", effort: "Hoch", done: false },
    ],
  },
  {
    id: "ART-55891",
    name: "Seidenblusen Klassik",
    category: "Blusen",
    size: "M",
    color: "Creme",
    returnRate: 19.3,
    topReason: "Material",
    aiStatus: "In Bearbeitung",
    imageUrl: "https://images.unsplash.com/photo-1485518882345-15568b007407?w=400&h=400&fit=crop&auto=format",
    description: "Elegante Seidenbluse für besondere Anlässe. Hochwertige Verarbeitung.",
    aiDescription: "Elegante Bluse aus 100% echter Seide (Charmeuse-Webart) für besondere Anlässe. Hinweis: Seide ist pflegeintensiv – nur Handwäsche oder Reinigung empfohlen. Der natürliche Glanz kann auf Fotos verstärkt wirken. Fällt größentreu aus.",
    comments: [
      '"Stoff fühlt sich nicht wie Seide an."',
      '"Materialzusammensetzung war anders als erwartet."',
    ],
    qualityIssues: [
      "Kunden zweifeln an angegebener Materialzusammensetzung",
      "Pflegeanforderungen nicht klar kommuniziert",
    ],
    aiInsight: "Materialerwartungen der Kunden werden nicht erfüllt. Pflegehinweise und Materialdetails müssen dringend ergänzt werden. Eine Zertifizierung des Seidengehalts könnte das Vertrauen stärken.",
    recommendations: [
      { id: "r1", text: "Materialzertifikat einfügen", priority: "Hoch", impact: "−9% Retouren", effort: "Mittel", done: false },
      { id: "r2", text: "Pflegehinweise ergänzen", priority: "Hoch", impact: "−7% Retouren", effort: "Niedrig", done: false },
    ],
  },
  {
    id: "ART-66340",
    name: "Strick-Cardigan Oversized",
    category: "Pullover",
    size: "L",
    color: "Camel",
    returnRate: 8.6,
    topReason: "Sonstiges",
    aiStatus: "Optimiert",
    imageUrl: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=400&fit=crop&auto=format",
    description: "Gemütlicher Strick-Cardigan im trendigen Oversized-Look.",
    aiDescription: "Gemütlicher Strick-Cardigan im Oversized-Look aus 60% Wolle, 40% Acryl. Bitte eine Größe kleiner bestellen für normalen Sitz, oder Ihre gewohnte Größe für den Oversized-Effekt.",
    comments: ['"Super gemütlich, genau wie erwartet."', '"Sehr schöne Qualität."'],
    qualityIssues: [],
    aiInsight: "Niedrige Retourenquote. Produkt gut beschrieben. Keine Maßnahmen erforderlich.",
    recommendations: [],
  },
]

export const pieData = [
  { name: "Größe", value: 41, color: "#2563EB" },
  { name: "Qualität", value: 28, color: "#60A5FA" },
  { name: "Farbe", value: 16, color: "#93C5FD" },
  { name: "Material", value: 10, color: "#BFDBFE" },
  { name: "Sonstiges", value: 5, color: "#DBEAFE" },
]

export const barData = products.map((p) => ({
  name: p.name.split(" ").slice(0, 2).join(" "),
  rate: p.returnRate,
}))
