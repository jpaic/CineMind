import React from 'react';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: 'Information We Collect',
      content: 'We collect information you provide directly to us, including your name, email address, movie ratings, and profile information. We also collect usage data about how you interact with our service.'
    },
    {
      title: 'How We Use Your Information',
      content: 'We use the information we collect to provide, maintain, and improve our services, generate personalized recommendations, communicate with you about updates and features, and analyze usage patterns to enhance user experience.'
    },
    {
      title: 'Data Sharing and Disclosure',
      content: 'We do not sell your personal information. We may share your information with service providers who assist in operating our platform, when required by law, or to protect our rights and the safety of our users.'
    },
    {
      title: 'Your Rights and Choices',
      content: 'You have the right to access, update, or delete your personal information at any time. You can export your data or request account deletion through your settings. You may also opt out of certain data collection practices.'
    },
    {
      title: 'Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.'
    },
    {
      title: 'Cookies and Tracking',
      content: 'We use cookies and similar tracking technologies to collect usage data and improve your experience. You can control cookie preferences through your browser settings.'
    },
    {
      title: 'Children\'s Privacy',
      content: 'Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us.'
    },
    {
      title: 'Changes to This Policy',
      content: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.'
    },
    {
      title: 'Contact Us',
      content: 'If you have any questions about this Privacy Policy or our data practices, please contact us at privacy@cinemahub.com.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2 text-slate-50">
          Privacy Policy
        </h1>
        <p className="text-slate-400 mb-2">Effective Date: December 12, 2025</p>
        <p className="text-slate-400 mb-8">
          Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information.
        </p>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={index} className="border border-slate-800 rounded-lg p-6 hover:border-blue-500/30 transition">
              <h2 className="text-xl font-semibold mb-3 text-slate-200">{section.title}</h2>
              <p className="text-slate-400 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 bg-slate-900/60 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-slate-400 text-center">
            By using Cinema Hub, you agree to the terms outlined in this Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}