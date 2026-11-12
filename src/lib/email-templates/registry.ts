import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
import { template as welcomeTemplate } from './welcome'
import { template as sitePublishedTemplate } from './site-published'
import { template as newEnquiryTemplate } from './new-enquiry'
import { template as enquiryReceivedTemplate } from './enquiry-received'

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  'site-published': sitePublishedTemplate,
  'new-enquiry': newEnquiryTemplate,
  'enquiry-received': enquiryReceivedTemplate,
}
