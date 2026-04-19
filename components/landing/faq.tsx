'use client'

import { FadeUp } from '@/components/motion/fade-up'
import { Accordion } from '@/components/ui/accordion'

const items = [
  {
    q: 'Is Matchmaker COPPA compliant?',
    a: 'Yes — structurally, not just on paper. Only verified adult coaches can register. Student PII never enters the database, and row-level security enforces that guarantee even against a misbehaving admin.',
  },
  {
    q: 'How long does dispatch review usually take?',
    a: 'Median review time this season is under six hours during weekdays. Every email is read by a human admin before it leaves the platform — no auto-send, no LLM-grammar-check-and-ship.',
  },
  {
    q: 'How do you vet sponsors?',
    a: 'Sponsors apply through a dedicated form and are approved manually. Funding caps are declared up front and enforced at the database level — a sponsor cannot be over-committed, even under race conditions.',
  },
  {
    q: 'Does it cost anything?',
    a: 'Matchmaker is free for FTC teams during the 2026 season. Sponsors pay nothing to be listed. We do not take a cut of funding.',
  },
  {
    q: 'What happens to my team data if we leave?',
    a: 'Coaches can export their full portfolio as JSON + PDF and request deletion at any time. Deletion is hard — not soft — and is logged in an immutable audit trail.',
  },
  {
    q: 'Can my team use Matchmaker without my coach onboard?',
    a: 'No. The platform requires a verified adult coach to originate every submission. This is a hard constraint, not a policy — student-only accounts cannot be created.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <FadeUp>
        <h2 className="mt-3 text-center text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Questions coaches actually ask.
        </h2>
      </FadeUp>
      <FadeUp delay={0.1} className="mt-12">
        <Accordion items={items} />
      </FadeUp>
    </section>
  )
}
