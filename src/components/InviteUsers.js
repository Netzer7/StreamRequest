"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { createPortal } from "react-dom";

const Modal = ({ children }) => {
  return createPortal(
    <div className="modal-overlay">
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "auto",
          padding: "2rem",
        }}
      >
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-lg"
          style={{ position: "fixed" }}
        />
        <div
          className="login-card relative z-50"
          style={{
            backgroundColor: "rgb(34, 34, 34)",
            border: "1px solid rgb(0, 160, 160)",
            borderRadius: "8px",
            width: "100%",
            maxWidth: "65%",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const InviteUsers = ({ onClose }) => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length === 0) return "";
    if (numbers.length <= 3) return `(${numbers}`;
    if (numbers.length <= 6)
      return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneNumberChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!nickname.trim()) {
      setMessage({
        type: "error",
        text: "Please provide a nickname for the user",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          managerId: user.uid,
          nickname: nickname.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Invitation sent! User will be registered when they reply YES.",
        });
        setPhoneNumber("");
        setNickname("");
        setTimeout(() => onClose(), 2000);
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to send invitation",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while sending the invitation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary mb-3">Invite User</h2>
        <p className="text-base text-gray-400">
          Configure your invitation settings below
        </p>
      </div>

      <form onSubmit={handleInvite} className="login-form">
        <div className="space-y-6">
          <div className="input-group">
            <label htmlFor="nickname">Nickname</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter a nickname"
              required
              maxLength={20}
            />
          </div>

          <div className="input-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder="(555) 555-5555"
              required
            />
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mt-6 ${
              message.type === "error"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "bg-green-500/10 text-green-400 border border-green-500/30"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-end gap-8 mt-8">
          <button type="button" onClick={onClose} className="nav-button px-6">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="nav-button nav-button-highlight px-6"
            style={{ marginLeft: "8px" }}
          >
            {isLoading ? "Sending..." : "Invite"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InviteUsers;
