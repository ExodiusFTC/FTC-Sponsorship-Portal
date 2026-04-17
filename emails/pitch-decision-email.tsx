import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

type Decision = 'approved' | 'rejected' | 'changes_requested'

interface PitchDecisionEmailProps {
  coachName: string
  pitchTitle: string
  decision: Decision
  feedback?: string | null
}

const DECISION_COPY: Record<Decision, { subject: string; headline: string; body: string }> = {
  approved: {
    subject: 'Your pitch has been approved 🎉',
    headline: 'Great news — your pitch is approved!',
    body: "We've reviewed your pitch and it's been approved. Sponsor outreach emails are now being sent on your behalf. Replies from sponsors will go directly to your email.",
  },
  rejected: {
    subject: 'Update on your pitch submission',
    headline: 'Your pitch was not approved',
    body: "After review, we were unable to approve this pitch at this time. Please see the admin's feedback below.",
  },
  changes_requested: {
    subject: 'Changes requested on your pitch',
    headline: 'Your pitch needs some changes',
    body: 'Our team reviewed your pitch and would like you to make a few changes before we can approve it. Please log in, update the pitch, and resubmit.',
  },
}

export default function PitchDecisionEmail({
  coachName,
  pitchTitle,
  decision,
  feedback,
}: PitchDecisionEmailProps) {
  const copy = DECISION_COPY[decision]

  return (
    <Html>
      <Head />
      <Preview>{copy.subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hello {coachName},</Heading>
          <Heading style={h2}>{copy.headline}</Heading>
          <Text style={text}>
            Pitch: <strong>{pitchTitle}</strong>
          </Text>
          <Text style={text}>{copy.body}</Text>

          {feedback && (
            <Section style={feedbackBox}>
              <Text style={{ ...text, fontWeight: 600, marginBottom: 4 }}>Admin Feedback:</Text>
              <Text style={{ ...text, marginTop: 0 }}>{feedback}</Text>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            FTC Sponsorship Portal · You received this email because you submitted a pitch on our platform.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }
const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '24px',
  borderRadius: '8px',
  maxWidth: '600px',
}
const h1 = { fontSize: '22px', color: '#1a1a1a', marginBottom: '4px' }
const h2 = { fontSize: '18px', color: '#333', marginTop: '0' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6' }
const feedbackBox = {
  backgroundColor: '#f4f4f5',
  borderLeft: '4px solid #888',
  padding: '12px 16px',
  borderRadius: '4px',
  margin: '16px 0',
}
const hr = { borderColor: '#e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999' }
