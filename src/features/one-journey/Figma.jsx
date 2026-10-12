// Figma page: the design frames, shown from copies saved in public/figma/ (works offline).
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Button, Card, Tabs, cn } from '../../components/ui'
import { FIGMA_CONCEPT_URL, FIGMA_PROTOTYPE_URL } from '../../config.js'

// wide = a 1280×720 slide, otherwise a 390×844 phone screen. The images are 2× exports from Figma.
const DECKS = [
  {
    id: 'prototype',
    label: 'Prototype',
    url: FIGMA_PROTOTYPE_URL,
    note: 'Our clickable prototype. It uses the same sample trip and the same numbers as the app.',
    frames: [
      { file: '1-problem', title: 'Problem', text: 'Three operators and three tickets, so many riders give up.', wide: true },
      { file: '2-plan', title: 'Plan', text: 'Pick From, To and a time: Naroda Gam → Shivranjani at 18:30.' },
      { file: '3-options', title: 'Options', text: 'Three choices: 73 min ₹30, 74 min ₹30 and 74 min ₹40.' },
      { file: '4-journey', title: 'Journey', text: 'Every step: AMTS 66/3, a walk, Metro Blue, a walk, BRTS 12U-RL. You arrive at 19:44.' },
      { file: '5-fair-split', title: 'Fair split', text: 'One ₹30 ticket, split between AMTS, the Metro and BRTS, plus a 2% fee.' },
      { file: '6-impact-ppp', title: 'Impact + PPP', text: 'Who builds it, who runs and pays for it, and our honest limits.', wide: true },
    ],
  },
  {
    id: 'concept',
    label: 'First concept',
    url: FIGMA_CONCEPT_URL,
    note: 'Our first idea, made before the app. Its example trip (Gomtipur → ISRO) and its fare-split rule are different from the app.',
    frames: [
      { file: '1-problem', title: 'Problem', text: 'Three tickets, and one trip can need three rides.', wide: true },
      { file: '2-solution', title: 'Solution', text: 'One plan, one fare, and every walk shown.', wide: true },
      { file: '3-plan', title: 'Plan', text: 'Gomtipur Darwaja → ISRO, on a weekday after 08:15.' },
      { file: '4-one-journey', title: 'One journey', text: 'AMTS 77, Metro Blue, then BRTS 15U: 53 min, ₹30.' },
      { file: '5-one-fare', title: 'One fare', text: 'One price of ₹30, with our older and simpler split rule.' },
      { file: '6-journey-card-offline', title: 'Journey card', text: 'A saved card that still opens with no signal.' },
      { file: '7-impact-ppp', title: 'Impact + PPP', text: 'Where to start a pilot, who pays, and the honest limits.', wide: true },
    ],
  },
]

const imgUrl = (deckId, f) => `/figma/${deckId}/${f.file}.webp`

export default function Figma() {
  const [deckId, setDeckId] = useState('prototype')
  const [i, setI] = useState(0)
  const deck = DECKS.find((d) => d.id === deckId)
  const frame = deck.frames[i]
  const last = deck.frames.length - 1
  const go = (n) => setI(Math.min(Math.max(n, 0), last))

  // The left and right arrow keys move between frames.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0))
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, last))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  const pickDeck = (id) => {
    setDeckId(id)
    setI(0)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">PS-08 · Figma design</p>
        <h1 className="text-2xl font-bold text-slate-900">Figma screens</h1>
        <p className="text-sm text-slate-500">The screens we designed in Figma. They are saved in the app, so this page works offline too.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={DECKS} value={deckId} onChange={pickDeck} />
        <a
          href={deck.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline"
        >
          <ExternalLink className="size-4" />
          Open in Figma (needs internet)
        </a>
      </div>
      <p className="text-sm text-slate-600">{deck.note}</p>

      <Card
        title={`${i + 1} of ${deck.frames.length} · ${frame.title}`}
        subtitle={frame.text}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => go(i - 1)} disabled={i === 0}>
              Back
            </Button>
            <Button variant="secondary" size="sm" onClick={() => go(i + 1)} disabled={i === last}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          </>
        }
      >
        <img
          src={imgUrl(deck.id, frame)}
          alt={`${frame.title}: ${frame.text}`}
          width={frame.wide ? 1280 : 390}
          height={frame.wide ? 720 : 844}
          className={cn(
            'mx-auto rounded-xl border border-slate-200 object-contain',
            frame.wide ? 'h-auto w-full' : 'h-[min(844px,75vh)] w-auto max-w-full',
          )}
        />
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {deck.frames.map((f, n) => (
          <button
            key={f.file}
            onClick={() => go(n)}
            aria-current={n === i}
            className={cn(
              'shrink-0 rounded-xl border-2 p-1 transition',
              n === i ? 'border-slate-900 bg-white' : 'border-transparent opacity-70 hover:opacity-100',
            )}
          >
            <img src={imgUrl(deck.id, f)} alt="" loading="lazy" className="mx-auto h-20 w-auto rounded-md border border-slate-200" />
            <span className="mt-1 block text-center text-[11px] font-medium text-slate-600">
              {n + 1}. {f.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
