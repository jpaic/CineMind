import React, { useState } from 'react';
import { HelpCircle, ChevronRight, Mail, FileText, Shield } from 'lucide-react';

export default function Help() {
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
  {
    question: 'How do I add movies to my library?',
    answer: 'Go to the "Add Movies" page, search for a movie, select it, rate it from 1-10 stars, and click "Add to My Films".'
  },
  {
    question: 'Can I import my ratings from other platforms?',
    answer: 'Yes! Use the "Import CSV" button on the Add Movies page. Your CSV should include columns for title, year, director, and optionally poster URL.'
  },
  {
    question: 'How are movie recommendations generated?',
    answer: 'Recommendations on the "Discover" page are based on your ratings, favorite genres, and viewing history. The more movies you rate, the better the suggestions.'
  },
  {
    question: 'How do I showcase my favorite movies on my profile?',
    answer: 'Go to your Profile page and click the + button in any showcase slot. Search for a movie and add it to your showcase to display it on your profile.'
  },
  {
    question: 'How can I connect my Letterboxd or IMDb account?',
    answer: 'Navigate to Settings > Connections and click "Connect" for Letterboxd or IMDb. Once connected, your ratings and activity can be synced.'
  },
  {
    question: 'How do I change my account password?',
    answer: 'Go to Settings > Account and click "Change Password". Enter your current password and choose a new one.'
  },
  {
    question: 'Can I export my movie data?',
    answer: 'Yes! In Settings > Account, click "Export My Data" to download a CSV file with all your ratings, watched movies, and profile info.'
  },
  {
    question: 'What happens if I delete my account?',
    answer: 'Deleting your account will permanently remove all your movies, ratings, and profile data. This action cannot be undone.'
  },
  {
    question: 'Can I reset my movie library?',
    answer: 'Yes, in Settings > Account, click "Reset Library" to remove all your rated movies without deleting your account.'
  }
];


  const quickLinks = [
    { icon: Mail, title: 'Contact Support', description: 'Get help from our team', link: 'mailto:support@cinemahub.com' },
    { icon: FileText, title: 'Documentation', description: 'Learn how to use Cinema Hub', link: '#' },
    { icon: Shield, title: 'Privacy Policy', description: 'View our privacy practices', link: '/legal/privacy-policy' }
  ];

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2 text-slate-50">
          Help & Support
        </h1>
        <p className="text-slate-400 mb-8">Find answers to common questions</p>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickLinks.map((link) => (
            <a
              key={link.title}
              href={link.link}
              className="border border-slate-800 rounded-lg p-4 hover:border-blue-500/30 transition group cursor-pointer"
            >
              <link.icon className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-slate-200 mb-1 group-hover:text-slate-200 transition">
                {link.title}
              </h3>
              <p className="text-sm text-slate-500">{link.description}</p>
            </a>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-900/50 transition"
                >
                  <span className="font-medium text-slate-200">{faq.question}</span>
                  <ChevronRight
                    className={`w-5 h-5 text-slate-500 transition-transform ${
                      openFaq === index ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-4 py-3 bg-slate-900/30 border-t border-slate-800">
                    <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 border border-slate-800 rounded-lg p-6 bg-gradient-to-br from-slate-900/20 to-slate-800/20">
          <h2 className="text-xl font-semibold mb-3">Still need help?</h2>
          <p className="text-slate-400 mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <button className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 rounded font-medium text-sm transition shadow-lg shadow-blue-500/20">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}