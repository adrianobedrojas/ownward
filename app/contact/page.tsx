import Image from 'next/image';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-white">
      <h1 className="text-4xl font-bold mb-6">About & Contact</h1>
      
      <div className="flex flex-col md:flex-row gap-8 items-center mb-12">
        <div className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-blue-500 flex-shrink-0">
          <Image 
            src="/profile.jpg" 
            alt="Founder Headshot" 
            fill 
            className="object-cover" 
          />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-2">Hi, I'm Adrian</h2>
          <p className="text-gray-300 leading-relaxed">
            Welcome to Ownward Hub. I built this platform to give business owners 
            the tools, knowledge, and confidential deal rooms needed to manage, grow, 
            and sell their companies.
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Get in Touch</h3>
        <p className="text-gray-400 mb-4">
          Have questions about listings, deal rooms, or articles? Send a direct message below.
        </p>
        <a 
          href="mailto:your-email@example.com" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-md transition"
        >
          Email Me
        </a>
      </div>
    </div>
  );
}