import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  dashboardUrl?: string
}

const Email = ({ name, dashboardUrl = 'https://sktechlab.com/dashboard' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to SKTECHLAB — your website journey starts here</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to SKTECHLAB</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          Your account is ready. You can build your website, pick a design, and
          publish it in minutes.
        </Text>
        <Button style={button} href={dashboardUrl}>
          Open my dashboard
        </Button>
        <Text style={footer}>Need help? Just reply to this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to SKTECHLAB',
  displayName: 'Welcome email',
  previewData: { name: 'Rahul' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0b1220', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#4a5361', lineHeight: '1.6', margin: '0 0 18px' }
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
