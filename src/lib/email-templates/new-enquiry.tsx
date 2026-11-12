import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  phone?: string
  message?: string
  source?: string
  siteName?: string
}

const Email = ({ name = 'Someone', email, phone, message, source = 'Website', siteName = 'SKTECHLAB' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New enquiry from ${name}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New enquiry</Heading>
        <Text style={text}>
          A new enquiry arrived on <strong>{siteName}</strong> ({source}).
        </Text>
        <Hr style={hr} />
        <Text style={row}><strong>Name:</strong> {name}</Text>
        {email ? <Text style={row}><strong>Email:</strong> {email}</Text> : null}
        {phone ? <Text style={row}><strong>Phone:</strong> {phone}</Text> : null}
        {message ? <Text style={row}><strong>Message:</strong><br />{message}</Text> : null}
        <Hr style={hr} />
        <Text style={footer}>Reply directly to this email to answer the customer.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New enquiry from ${d['name'] || 'a visitor'}`,
  displayName: 'New enquiry (to you)',
  previewData: {
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '+91 98765 43210',
    message: 'I need a website for my cafe.',
    source: 'Home page',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0b1220', margin: '0 0 14px' }
const text = { fontSize: '15px', color: '#4a5361', lineHeight: '1.6', margin: '0 0 14px' }
const row = { fontSize: '15px', color: '#0b1220', lineHeight: '1.6', margin: '0 0 8px' }
const hr = { borderColor: '#e6e8ec', margin: '18px 0' }
const footer = { fontSize: '13px', color: '#8b93a1', margin: '0' }
