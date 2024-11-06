import React, { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

const InviteUsers = () => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 0) return '';
    if (numbers.length <= 3) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
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
      setMessage({ type: 'error', text: 'Please provide a nickname for the user' });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          managerId: user.uid,
          nickname: nickname.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Invitation sent! User will be registered when they reply YES.' });
        setPhoneNumber('');
        setNickname('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send invitation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while sending the invitation' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-secondary p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary">Invite Users</h2>
        <p className="text-sm text-gray-400 mt-2">Set a nickname for your user to personalize their experience.</p>
      </div>
      <div className="p-4">
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="input-group">
            <label htmlFor="nickname" className="block mb-2">Nickname</label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter a nickname"
              required
              className="w-full p-2 rounded-md bg-opacity-10 bg-white border border-secondary"
              maxLength={20}
            />
          </div>
          <div className="input-group">
            <label htmlFor="phoneNumber" className="block mb-2">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder="(555) 555-5555"
              required
              className="w-full p-2 rounded-md bg-opacity-10 bg-white border border-secondary"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`button w-full ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </button>
          {message && (
            <div className={`notification ${message.type} mt-4`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default InviteUsers;