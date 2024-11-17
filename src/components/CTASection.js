import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const CTASection = ({ user }) => {
  return (
    <section 
      className="relative overflow-hidden"
      style={{
        padding: '20px 0 40px 0',
        marginTop: '20px',
        position: 'relative',
        borderTop: '1px solid rgba(74, 74, 74, 0.2)'
      }}
    >
      <div className="container mx-auto relative z-10 px-4">
        <div style={{ maxWidth: '800px' }}>
          <h2 
            className="hero-title text-6xl font-bold mb-6 text-white"
            style={{ 
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
              lineHeight: 1.2
            }}
          >
            Ready to Streamline Your Media Requests?
          </h2>
          
          <div style={{ maxWidth: '600px' }}>
            <p className="text-2xl mb-12 text-white opacity-90">
              Join StreamRequest today and experience the future of media management.
            </p>
          </div>

          <Link 
            href="/signup"
            className="button inline-flex items-center justify-center gap-2 text-lg font-medium transition-all duration-300 hover:scale-105"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            Get Started Now
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;