// About page for the judges: problem, how it works, PPP model, honest limits.
import { Card } from '../../components/ui'

const Section = ({ title, items }) => (
  <Card title={title} className="p-4">
    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((t) => <li key={t}>{t}</li>)}</ul>
  </Card>
)

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600">PS-08 · City Public Transport</p>
        <h1 className="text-2xl font-bold text-slate-900">One City, One Journey</h1>
        <p className="text-sm text-slate-500">Metro, BRTS and AMTS are run by three operators with three tickets. We show one plan, one fare and a fair split.</p>
      </div>
      <Section title="The problem" items={[
        'Metro (GMRC), BRTS Janmarg (AJL) and AMTS city buses have separate tickets and separate apps.',
        'A rider who mixes them cannot see the whole journey, the total cost or the walks between them.',
        'Many give up and use a bike or car.',
      ]} />
      <Section title="What the app does" items={[
        'You pick From, To and a time. It plans bus + metro + bus journeys from the real AMTS and BRTS timetables (958 route patterns, 14,030 trips) and the 4 metro lines.',
        'Every transfer walk is shown in minutes and metres.',
        'You see ONE fare for the whole trip, and how it is split between the operators.',
        'It runs on the phone: after the first visit it works with no network.',
      ]} />
      <Section title="Fare split (bonus)" items={[
        'Each operator keeps its own standalone fare for its part of the trip.',
        'The rider gets ₹5 off for each change between operators; each operator pays its share of that discount by km.',
        'A 2% clearing fee pays the private integrator who runs the one ticket.',
      ]} />
      <Section title="PPP model" items={[
        'Private partner: builds and runs the planner and one QR / NCMC ticket, earns the 2% clearing fee.',
        'Operators: sell more trips (riders who now take a bike or car), pay the fee only on integrated tickets.',
        'City (AMC / GMRC): owns the data and sets the fare rules. A pilot needs no new hardware: the timetables are already open data (GTFS).',
      ]} />
      <Section title="Honest limits" items={[
        'Bus times are the published timetable, not live bus GPS.',
        'Bus fare slabs are our assumption (BRTS publishes a ₹5–₹50 range). The metro fare is an estimate.',
        'Metro wait = half the average headway (assumption). Station-to-bus-stop walks use straight-line distance; other walks use straight line × 1.3.',
        'Gandhinagar GGTSL e-buses have no public timetable, so they are not included.',
      ]} />
    </div>
  )
}
