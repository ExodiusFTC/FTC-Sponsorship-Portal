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

interface PitchEmailProps {
  sponsorContactName: string
  teamName: string
  pitchTitle: string
  pitchSummary: string
  costExplanation: string
  financialAskCents: number
  lineItems: { label: string; qty: number; totalCents: number }[]
}

export default function PitchEmail({
  sponsorContactName,
  teamName,
  pitchTitle,
  pitchSummary,
  costExplanation,
  financialAskCents,
  lineItems = [],
}: PitchEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sponsorship Opportunity: {teamName} - {pitchTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hello {sponsorContactName},</Heading>
          <Text style={text}>
            We are reaching out from <strong>{teamName}</strong> with a sponsorship opportunity.
          </Text>

          <Section style={pitchBox}>
            <Heading style={h2}>{pitchTitle}</Heading>
            <Text style={text}>{pitchSummary}</Text>

            <Hr style={hr} />

            <Heading style={h3}>Financial Ask: ${(financialAskCents / 100).toFixed(2)}</Heading>
            <Text style={text}>{costExplanation}</Text>

            <Section style={tableContainer}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={thLeft}>Item</th>
                    <th style={thCenter}>Qty</th>
                    <th style={thRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={tdLeft}>{item.label}</td>
                      <td style={tdCenter}>{item.qty}</td>
                      <td style={tdRight}>${(item.totalCents / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </Section>

          <Text style={text}>
            If you are interested in discussing this further, please reply directly to this email to connect with our team coach.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Sent via FTC Sponsorship Portal • {teamName}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
}

const h2 = {
  color: '#333',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 12px',
}

const h3 = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  margin: '20px 0 12px',
}

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
}

const pitchBox = {
  background: '#f4f4f5',
  padding: '24px',
  borderRadius: '8px',
  margin: '24px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
}

const tableContainer = {
  marginTop: '16px',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
}

const thLeft = {
  textAlign: 'left' as const,
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
  color: '#6b7280',
}

const thCenter = {
  textAlign: 'center' as const,
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
  color: '#6b7280',
}

const thRight = {
  textAlign: 'right' as const,
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
  color: '#6b7280',
}

const tdLeft = {
  textAlign: 'left' as const,
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
}

const tdCenter = {
  textAlign: 'center' as const,
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
}

const tdRight = {
  textAlign: 'right' as const,
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '14px',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '12px',
  marginBottom: '24px',
}
