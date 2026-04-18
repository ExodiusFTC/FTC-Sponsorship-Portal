import { Html, Head, Preview, Body, Container, Section, Heading, Text, Hr } from '@react-email/components'
import * as React from 'react'

interface SubmissionEmailProps {
  teamName: string
  missionStatement: string | null
  technicalSummary: string | null
  outreachSummary: string | null
  financialAskCents: number
  budgetItems: { label: string; qty: number; unitCostCents: number; totalCents: number }[]
  customPitchAlignment: string
  specificNeedsStatement: string
}

export default function SubmissionEmail({
  teamName,
  missionStatement,
  technicalSummary,
  outreachSummary,
  financialAskCents,
  budgetItems,
  customPitchAlignment,
  specificNeedsStatement,
}: SubmissionEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sponsorship Opportunity: {teamName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Partnership Request: {teamName}</Heading>
          
          <Section style={pitchBox}>
            <Text style={text}><strong>Why we align with you:</strong><br />{customPitchAlignment}</Text>
            <Text style={text}><strong>Our specific needs:</strong><br />{specificNeedsStatement}</Text>
          </Section>

          <Hr style={hr} />
          
          <Heading style={h2}>Team Portfolio</Heading>
          {missionStatement && <Text style={text}><strong>Mission:</strong> {missionStatement}</Text>}
          {technicalSummary && <Text style={text}><strong>Technical Summary:</strong> {technicalSummary}</Text>}
          {outreachSummary && <Text style={text}><strong>Outreach:</strong> {outreachSummary}</Text>}

          <Heading style={h3}>Budget Ask: ${(financialAskCents / 100).toFixed(2)}</Heading>
          <ul style={{ ...text, paddingLeft: '20px' }}>
            {budgetItems && budgetItems.map((item, i) => (
              <li key={i}>
                {item.qty}x {item.label} - ${(item.totalCents / 100).toFixed(2)}
              </li>
            ))}
          </ul>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: 'sans-serif' }
const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', margin: '30px 0 15px' }
const h2 = { fontSize: '20px', fontWeight: 'bold', margin: '20px 0 10px' }
const h3 = { fontSize: '18px', fontWeight: 'bold', margin: '15px 0 10px' }
const text = { fontSize: '14px', lineHeight: '24px' }
const pitchBox = { padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
