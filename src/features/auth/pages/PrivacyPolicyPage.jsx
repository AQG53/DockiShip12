import { ShieldCheck } from 'lucide-react';
import LegalDocumentPage from '../components/LegalDocumentPage';

const sections = [
  {
    title: '1. Introduction',
    paragraphs: [
      'Dockiship respects your privacy and is committed to protecting personal information processed through our platform.',
    ],
  },
  {
    title: '2. Information We Collect',
    points: [
      'Account information: name, email address, and business details.',
      'Order and customer data via marketplace integrations: customer name, shipping address, phone number, email address, and order details.',
      'Technical information: IP address, browser type, and login activity logs.',
    ],
  },
  {
    title: '3. How We Use Information',
    paragraphs: [
      'Data is used to process and manage orders, provide inventory tracking, improve system functionality, ensure platform security, and comply with legal obligations. We do not sell personal data.',
    ],
  },
  {
    title: '4. Data Storage and Security',
    paragraphs: [
      'All data is transmitted over HTTPS (TLS 1.2+). Access is restricted via role-based permissions. System logs record user activity. Administrative access is limited.',
    ],
  },
  {
    title: '5. Data Sharing',
    paragraphs: [
      'We do not share personal data except with authorized internal users, integrated marketplaces (e.g., Temu), or when required by law.',
    ],
  },
  {
    title: '6. Data Retention',
    paragraphs: [
      'Data is retained only as long as necessary for operational purposes, legal compliance, and business recordkeeping.',
    ],
  },
  {
    title: '7. User Rights',
    paragraphs: [
      'Individuals may request access, correction, deletion, or portability of their data by contacting us at [Insert Email Address].',
    ],
  },
  {
    title: '8. Cookies',
    paragraphs: [
      'Dockiship uses essential cookies for authentication, session management, and security monitoring. We do not use advertising cookies.',
    ],
  },
  {
    title: '9. Data Breach Notification',
    paragraphs: [
      'In the event of a data breach, we will investigate promptly, notify affected parties where legally required, and take corrective action.',
    ],
  },
  {
    title: '10. Changes to This Policy',
    paragraphs: ['We may update this Privacy Policy periodically. Updates will be posted on this page.'],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      subtitle="This policy describes what information we collect, how we use it, and how we protect it."
      effectiveDate="01/01/2026"
      icon={ShieldCheck}
      companyName="Dockiship"
      sections={sections}
      contact={[
        'Email: info@dockiship.com',
        'Company Name: Dockiship',
        'Business Address: 8421 Homeward Way, Sugar Land, TX 77479 USA',
      ]}
    />
  );
}
