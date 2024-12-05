import React, { useState } from "react";
import { Play, Users, Settings } from "lucide-react";

const StepCard = ({ number, title, description, icon: Icon, isActive }) => {
  return (
    <div
      className="relative transition-all duration-300"
      style={{
        backgroundColor: isActive
          ? "rgba(0, 160, 160, 0.15)"
          : "rgba(74, 74, 74, 0.2)",
        borderRadius: "20px",
        border: `1px solid ${isActive ? "var(--color-primary)" : "rgba(74, 74, 74, 0.3)"}`,
        padding: "24px",
      }}
    >
      {/* Container for aligned content */}
      <div style={{ marginLeft: "8px" }}>
        {/* Step Number Badge */}
        <div
          style={{
            width: "48px",
            height: "48px",
            backgroundColor: isActive
              ? "var(--color-primary)"
              : "var(--color-background)",
            border: `2px solid ${isActive ? "var(--color-accent)" : "var(--color-primary)"}`,
            borderRadius: "50%",
            color: isActive ? "#ffffff" : "var(--color-primary)",
            transition: "all 0.3s ease",
            boxShadow: isActive
              ? "0 4px 20px rgba(0, 160, 160, 0.3)"
              : "0 4px 20px rgba(0, 0, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              lineHeight: 1,
              position: "relative",
              top: "-1px",
            }}
          >
            {number}
          </span>
        </div>

        {/* Content */}
        <h3
          style={{
            color: isActive ? "var(--color-primary)" : "rgba(0, 160, 160, 0.8)",
          }}
          className="text-2xl font-bold mb-4 transition-all duration-300"
        >
          {title}
        </h3>

        <p className="text-white opacity-90 leading-relaxed text-lg">
          {description}
        </p>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      number: "1",
      title: "Sign Up",
      description:
        "Create your account in less than 2 minutes and start managing your media library effortlessly.",
    },
    {
      number: "2",
      title: "Invite Users",
      description:
        "Add friends and family to your media circle with our simple SMS-based invitation system.",
    },
    {
      number: "3",
      title: "Start Managing",
      description:
        "Handle incoming SMS media requests with ease through your intuitive dashboard. Keep everyone happy and organized.",
    },
  ];

  return (
    <section
      className="relative py-40"
      style={{ borderTop: "1px solid rgba(74, 74, 74, 0.2)" }}
    >
      <div style={{ maxWidth: "1200px" }} className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-32">
          <h2
            className="text-5xl font-bold mb-8"
            style={{ color: "var(--color-primary)" }}
          >
            How StreamRequest Works
          </h2>
          <p className="text-2xl text-white opacity-90 max-w-2xl mx-auto">
            Get started with StreamRequest in three simple steps
          </p>
        </div>

        {/* Steps Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "20px",
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.number}
              onMouseEnter={() => setActiveStep(index + 1)}
              className="relative"
            >
              <StepCard
                {...step}
                isActive={activeStep === index + 1}
                isLastStep={index === steps.length - 1}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
