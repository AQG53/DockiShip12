import { Scale } from 'lucide-react';
import LegalDocumentPage from '../components/LegalDocumentPage';

const sections = [
  {
    title: '1. Acceptance of Terms',
    paragraphs: [
      'By accessing or using the Dockiship Portal ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you may not use the Service.',
    ],
  },
  {
    title: '2. Description of Service',
    paragraphs: [
      'Dockiship provides an internal ecommerce management system that allows authorized users to manage product listings, track purchase orders, manage inventory, import and process marketplace orders (e.g., Temu), and monitor order fulfillment workflows. The Service is intended for business use only.',
    ],
  },
  {
    title: '3. Account Registration and Security',
    paragraphs: [
      'Users must provide accurate information, maintain confidentiality of login credentials, and notify us immediately of unauthorized access. Users are responsible for all activities under their account.',
    ],
  },
  {
    title: '4. Use Restrictions',
    paragraphs: [
      'Users may not use the system for unlawful purposes, attempt to reverse engineer the system, interfere with security, or upload malicious software.',
    ],
  },
  {
    title: '5. Data Ownership',
    paragraphs: [
      'All business data uploaded into Dockiship remains the property of the account owner. Dockiship does not claim ownership of operational or customer data.',
    ],
  },
  {
    title: '6. Service Availability',
    paragraphs: [
      'We strive to maintain high uptime but do not guarantee uninterrupted access. Maintenance or unexpected downtime may occur.',
    ],
  },
  {
    title: '7. Limitation of Liability',
    paragraphs: [
      'Dockiship shall not be liable for loss of business data caused by third-party integrations, marketplace API downtime, or indirect, incidental, or consequential damages.',
    ],
  },
  {
    title: '8. Termination',
    paragraphs: [
      'We reserve the right to suspend or terminate access if Terms are violated, security risks are detected, or fraudulent activity is identified.',
    ],
  },
  {
    title: '9. Governing Law',
    paragraphs: ['These Terms are governed by the laws of the State of [Insert State], United States.'],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalDocumentPage
      title="Terms of Service"
      subtitle="These terms explain the rules, responsibilities, and limitations for using the Dockiship Portal."
      effectiveDate="01/01/2026"
      website="https://portal.dockiship.com"
      icon={Scale}
      companyName="Dockiship"
      sections={sections}
      contact={[
        'Email: info@dockiship.com',
        'Business Address: 8421 Homeward Way, Sugar Land, TX 77479 USA',
      ]}
    />
  );
}
