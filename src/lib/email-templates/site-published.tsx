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
  siteName?: string
  siteUrl?: string
}

const Email = ({ name, siteName = 'Your website', siteUrl = 'https://sktechlab.com' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{siteName} is live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your website is live</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          <strong>{siteName}</strong> has been published and is now available
          online. Share the link with your customers.
        </Text>
        <Button style={button} href={siteUrl}>
          View my website
        </Button>
        <Text style={footer}>You can keep editing anytime from your dashboard.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your website is live',
  displayName: 'Site published',
  previewData: { name: 'Rahul', siteName: 'Sharma Interiors', siteUrl: 'https://sharma.sktechlab.com' },
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
