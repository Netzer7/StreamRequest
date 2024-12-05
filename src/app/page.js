"use client";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, Users, Phone, Shield, Bell, Check } from "lucide-react";
import TrendingCarousel from "@/components/TrendingCarousel";
import HowItWorks from "@/components/HowItWorks";
import CTASection from "@/components/CTASection";

const PhoneMockup = ({ children, className = "" }) => (
  <div
    className={`relative border-8 border-gray-800 rounded-[3rem] h-[600px] w-[300px] bg-gray-800 ${className}`}
  >
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/3 h-7 bg-gray-800 rounded-b-2xl" />
    <div className="h-full w-full bg-gray-100 rounded-[2rem] overflow-hidden">
      {children}
    </div>
  </div>
);

const MessageBubble = ({ text, sent = false }) => (
  <div
    className={`max-w-[80%] rounded-2xl p-3 mb-2 ${sent ? "ml-auto bg-primary text-white" : "bg-gray-200 text-gray-800"}`}
  >
    {text}
  </div>
);

export default function Home() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero min-h-screen flex items-center justify-center text-center">
        <div className={`hero-content ${isVisible ? "fade-in" : ""}`}>
          <h1 className="hero-title">Meet your Media Concierge</h1>
          <p className="text-2xl mb-8 max-w-2xl mx-auto opacity-90">
            <p className="hero-subtitle">
              Need something to watch? We're on it. StreamRequest combines your
              media library with easy request management.
            </p>
          </p>
          {user ? (
            <Link href="/dashboard" className="button pulse text-xl px-12 py-4">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/signup" className="button pulse text-xl px-12 py-4">
              Get Started
            </Link>
          )}
        </div>
      </section>

      {/* Service Overview */}
      <section
        className="py-32 overflow-hidden bg-secondary/10"
        style={{ borderTop: "1px solid rgba(74, 74, 74, 0.2)" }}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-6xl font-bold text-center mb-4">
            Service Overview
          </h2>
          <p className="text-2xl text-center mb-20 max-w-2xl mx-auto text-gray-300">
            Our SMS-based system makes requesting and managing content simple.
            <br></br>
            It couldn't be easier, or faster.
          </p>
          <div className="relative mx-auto max-w-6xl">
            <img
              src="/images/phonemockup.svg"
              alt="StreamRequest instant messaging system demonstration"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      <HowItWorks />

      <TrendingCarousel />

      <CTASection />
    </>
  );
}
