import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  message?: string
  siteName?: string
  siteUrl?: string
}

const Email = ({ name, message, siteName = 'SKTECHLAB', siteUrl = 'https://sktechlab.com' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Thanks for reaching out</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          We received your message and our team will get back to you within 24 hours.
        </Text>
        {message ? <Text style={quote}>{message}</Text> : null}
        <Button style={button} href={siteUrl}>Visit {siteName}</Button>
        <Text style={footer}>If it is urgent, just reply to this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your message',
  displayName: 'Enquiry auto-reply (to customer)',
  previewData: { name: 'Rahul', message: 'I need a website for my cafe.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0b1220', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#4a5361', lineHeight: '1.6', margin: '0 0 18px' }
const quote = {
  fontSize: '14px',
  color: '#4a5361',
  lineHeight: '1.6',
  margin: '0 0 18px',
  padding: '12px 16px',
  borderLeft: '3px solid #0e9b7a',
  backgroundColor: '#f6f8f8',
}
const button = {
  backgroundColor: '#0e9b7a',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '12px 22px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#8b93a1', margin: '26px 0 0' }
