// About page for the judges, laid out like a short slide deck: problem, who it is for, the idea, a live example,
// the fair split, how it works, the PPP model, impact, honest limits and links. The example trip is planned live by the app.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { StatTile } from '../../components/ui'
import { FIGMA_CONCEPT_URL, FIGMA_PROTOTYPE_URL } from '../../config.js'
import { toHHMM, toMin } from './metro.js'
import { plan, TRANSFER_DISCOUNT, CLEARING_FEE } from './plan.js'
import { usePlanner } from './usePlanner.js'
import { rs, plural, Chips, Steps, FareSplit } from './parts.jsx'

const SAMPLE = { from: 'Naroda Gam', to: 'Shivranjani', time: '18:30' }
const SAMPLE_LINK = `/?${new URLSearchParams(SAMPLE)}`
const REPO_URL = 'https://github.com/RhythmItaliya/One-City-One-Journey'

const SLIDES = [
  ['problem', 'The problem'],
  ['who', 'Who it is for'],
  ['idea', 'Our idea'],
  ['example', 'A real trip'],
  ['split', 'Fair split'],
  ['how', 'How it works'],
  ['ppp', 'PPP model'],
  ['impact', 'Impact'],
  ['limits', 'Honest limits'],
  ['links', 'Links'],
]

const jump = (e, id) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** One "slide": its number, a big title, a one-line message, then the content. */
function Slide({ id, title, lead, children }) {
  const n = SLIDES.findIndex(([s]) => s === id) + 1
  return (
    <section id={id} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <p className="text-xs font-bold uppercase tracking-wide text-red-600">{n} / {SLIDES.length} · {SLIDES[n - 1][1]}</p>
      <h2 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">{title}</h2>
      {lead && <p className="mt-1 text-slate-600">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

const Points = ({ items }) => (
  <ul className="space-y-2 text-slate-700">
    {items.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-red-500" /><span>{t}</span></li>)}
  </ul>
)

const Steps123 = ({ items }) => (
  <ol className="space-y-2 text-slate-700">
    {items.map((t, i) => (
      <li key={t} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span><span>{t}</span></li>
    ))}
  </ol>
)

const Boxes = ({ items }) => (
  <div className="grid gap-3 md:grid-cols-3">
    {items.map(([title, text]) => (
      <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="font-bold text-red-600">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
      </div>
    ))}
  </div>
)

const OutLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-sky-700 hover:underline">
    {children}<ExternalLink className="size-3.5" />
  </a>
)

export default function About() {
  const { ix, facts, error } = usePlanner()
  const find = (name) => ix?.places.find((p) => p.name === name)
  const from = find(SAMPLE.from), to = find(SAMPLE.to)
  const opts = useMemo(() => (ix && facts && from && to ? plan(ix, facts, from, to, toMin(SAMPLE.time)) : []), [ix, facts, from, to])
  // Show the option that uses all three operators, so the fair split has three rows.
  const o = opts.find((x) => x.split.rows.length === 3) || opts[0]
  const stations = ix ? ix.places.filter((p) => p.kind === 'station').length : 53
  const stops = ix ? ix.places.length - stations : null

  const wait = error ? 'The timetables did not load. Connect to the internet and reload once.' : 'Loading the timetables…'

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl bg-slate-900 p-5 text-white md:p-7">
        <p className="text-xs font-bold uppercase tracking-wide text-red-400">PS-08 · City Public Transport · Metro Hacks, 10 Oct 2026</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">One City, One Journey</h1>
        <p className="mt-2 max-w-2xl text-slate-300">One plan and one fare for a trip that mixes the Metro, BRTS and AMTS buses in Ahmedabad. It works with no signal.</p>
        <p className="mt-3 text-sm text-slate-400">Made by Rhythm Italiya · ritaliya2003@gmail.com</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={SAMPLE_LINK} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500">
            Try the sample trip<ArrowRight className="size-4" />
          </Link>
          <Link to="/figma" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-600 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            See the Figma screens
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="One fare" value={o ? rs(o.split.oneFare) : '₹30'} hint={`${o ? rs(o.split.standalone) : '₹40'} with separate tickets`} />
        <StatTile label="Plans a trip in" value="< 0.1 s" hint="on the phone itself" />
        <StatTile label="Covers" value={`${stations} + ${stops ? stops.toLocaleString('en-GB') : '…'}`} hint="metro stations + bus stops" />
        <StatTile label="Signal needed" value="None" hint="after the first visit" />
      </div>

      <nav aria-label="Slides" className="flex flex-wrap gap-2">
        {SLIDES.map(([id, label], i) => (
          <a key={id} href={`#${id}`} onClick={(e) => jump(e, id)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400">
            {i + 1}. {label}
          </a>
        ))}
      </nav>

      <Slide id="problem" title="Three operators, three tickets. Riders give up and take the bike.">
        <blockquote className="mb-4 border-l-4 border-red-500 pl-3 text-slate-600 italic">
          “Metro, BRTS and city buses are run by different operators with separate tickets, and transfers between them are confusing.” (from the PS-08 brief)
        </blockquote>
        <Points items={[
          'The Metro (GMRC), BRTS Janmarg (AJL) and AMTS city buses each have their own ticket and their own app.',
          'Nothing shows a trip that uses more than one: which bus goes to the metro, how far you walk between them, or what the whole trip costs.',
          'So many people give up and use a bike or a car.',
        ]} />
      </Slide>

      <Slide id="who" title="People who live or work far from a metro station">
        <Boxes items={[
          ['Daily riders', 'Office workers, students and shop staff who need a bus to reach the metro, or a bus after it.'],
          ['The operators', 'They win back riders who now use a bike or a car, and see exactly what they get from each shared ticket.'],
          ['The city', 'AMC and GMRC get more use out of the metro and buses they already run.'],
        ]} />
      </Slide>

      <Slide id="idea" title="One app, one plan, one fare" lead="Type where you start, where you are going and when you leave. The app shows the whole trip:">
        <Steps123 items={[
          'Which bus to take and when it comes (from the real timetable).',
          'How many minutes and metres you walk to the metro.',
          'Which metro line to take and where to get off.',
          'The walk to the next bus, and that bus.',
          'One price for the whole trip.',
        ]} />
        <p className="mt-4 text-sm text-slate-600">It gives a few choices and marks the fastest, the cheapest and the one with the fewest changes. It works with no internet, even in a metro tunnel.</p>
      </Slide>

      <Slide id="example" title={`${SAMPLE.from} → ${SAMPLE.to} at ${SAMPLE.time}`} lead="Worked out live by the same planner as the app, so these are the app's real numbers.">
        {o ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="font-semibold text-slate-900">
                {o.minutes} min · leave {toHHMM(o.depart)}, arrive {toHHMM(o.arrive)} · {plural(o.transfers, 'change')} · one fare {rs(o.split.oneFare)}
              </p>
              <div className="mt-2"><Chips legs={o.legs} /></div>
            </div>
            <Steps o={o} from={from} to={to} />
            <p className="text-sm text-slate-600">
              This is option {opts.indexOf(o) + 1} of {opts.length}. We show it here because it uses all three operators.{' '}
              <Link to={SAMPLE_LINK} className="font-medium text-sky-700 hover:underline">Open this trip in the planner</Link>
            </p>
          </div>
        ) : <p className="text-sm text-slate-500">{wait}</p>}
      </Slide>

      <Slide id="split" title={o ? `One ${rs(o.split.oneFare)} ticket, shared fairly` : 'One ticket, shared fairly'} lead="If you pay once, how does each operator get its money? Our rule:">
        <Steps123 items={[
          'Each operator starts with the price of its own part of the trip.',
          `You get ₹${TRANSFER_DISCOUNT} off for every change between operators. Each operator gives up a part of this, by how many km you rode with it.`,
          `${CLEARING_FEE * 100}% goes to the company that runs the one ticket.`,
        ]} />
        <div className="mt-4">{o ? <FareSplit split={o.split} legs={o.legs} showRule={false} /> : <p className="text-sm text-slate-500">{wait}</p>}</div>
      </Slide>

      <Slide id="how" title="Timetables on the phone and a fast search">
        <Boxes items={[
          ['Data on the phone', 'The public AMTS and BRTS timetables (958 route patterns, 14,030 trips) and the 4 metro lines. About 1 MB in all.'],
          ['The search', 'It finds the next real bus to a metro station, the best metro route, the next bus after it and the walks in between.'],
          ['Works offline', 'After the first visit the app and its timetables are saved on the phone, so it plans trips with no signal.'],
        ]} />
        <p className="mt-4 text-sm text-slate-600">It is a simple search, so it is fast (under 0.1 seconds) and always gives the same answer.</p>
      </Slide>

      <Slide id="ppp" title="One journey, one fare, piloted on existing data">
        <Boxes items={[
          ['Who builds', `A private partner builds the planner and one QR or NCMC ticket. It earns the ${CLEARING_FEE * 100}% clearing fee.`],
          ['Who runs and pays', `The operators pay the ${CLEARING_FEE * 100}% fee only on shared tickets. The city (AMC and GMRC) owns the data and sets the fare rules.`],
          ['Why now', 'All the timetables are already open data (GTFS), so a pilot needs no new machines.'],
        ]} />
      </Slide>

      <Slide id="impact" title="Better for riders, operators and the city">
        <Boxes items={[
          ['Riders', `See the whole trip and its price before leaving, and pay once. The sample trip costs ${o ? rs(o.split.oneFare) : '₹30'} instead of ${o ? rs(o.split.standalone) : '₹40'}.`],
          ['Operators', 'More riders on the buses that bring people to the metro and take them home, and a clear share of every shared ticket.'],
          ['The city', 'Fewer bikes and cars on the road, and more use of the metro it has built.'],
        ]} />
        <p className="mt-4 text-sm text-slate-600">Start small: a pilot on a few bus routes that feed the metro, then grow.</p>
      </Slide>

      <Slide id="limits" title="What is not perfect yet">
        <Points items={[
          'Bus times are from the timetable, not live GPS. A late bus is not shown.',
          `The bus and metro prices are our estimates. The ₹${TRANSFER_DISCOUNT} discount and the ${CLEARING_FEE * 100}% fee are our proposals.`,
          'The metro wait is an average: half the time between trains.',
          'Walks use straight-line distance, so the real walk can be a bit longer.',
          'Gandhinagar city buses are not included, because they have no public timetable.',
          'We prepared the data and the empty app before the event. We built the PS-08 planner, its screens and the Figma prototype on the train.',
          'After the event (12 Oct 2026) we made the screens easier to read. The planner and its numbers did not change.',
        ]} />
      </Slide>

      <Slide id="links" title="See more">
        <ul className="space-y-2">
          <li><Link to="/figma" className="font-medium text-sky-700 hover:underline">Figma screens in this app</Link> <span className="text-sm text-slate-500">(works offline)</span></li>
          <li><OutLink href={FIGMA_PROTOTYPE_URL}>Figma prototype</OutLink> <span className="text-sm text-slate-500">(same trip and numbers as the app)</span></li>
          <li><OutLink href={FIGMA_CONCEPT_URL}>First idea in Figma</OutLink> <span className="text-sm text-slate-500">(older, a different example trip)</span></li>
          <li><OutLink href={REPO_URL}>Code and README on GitHub</OutLink></li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">Data: AMTS and BRTS timetables (croyla/amd-gtfs), metro lines © OpenStreetMap contributors, metro times from GMRC public information.</p>
      </Slide>
    </div>
  )
}
