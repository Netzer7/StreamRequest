'use client'

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '@/lib/firebase/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';

const Modal = ({ children }) => {
  return createPortal(
    <div className="modal-overlay">
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: '2rem'
        }}
      >
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-lg" 
          style={{ position: 'fixed' }}
        />
        <div 
          className="login-card relative z-50"
          style={{ 
            backgroundColor: 'rgb(34, 34, 34)',
            border: '1px solid rgb(0, 160, 160)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '65%',
            margin: '0 auto',
            padding: '2rem'
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ShowUsers = ({ users, onClose }) => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
  
    const handleRemoveUser = async (userId) => {
        if (!confirm('Are you sure you want to remove this user?')) return;
        
        setIsLoading(true);
        try {
          // First update user status
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            status: 'inactive'
          });
          
          // Then notify the user
          await fetch('/api/notify-user-removal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
          });
          
          setMessage({ type: 'success', text: 'User removed successfully' });
        } catch (error) {
          console.error('Error removing user:', error);
          setMessage({ type: 'error', text: 'Failed to remove user' });
        } finally {
          setIsLoading(false);
        }
      };

  return (
    <Modal>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary mb-3">Registered Users</h2>
        <p className="text-base text-gray-400">
          {users.length} {users.length === 1 ? 'user' : 'users'} registered
        </p>
      </div>

      {message && (
        <div 
          className={`p-4 rounded-lg mb-6 ${
            message.type === 'error' 
              ? 'bg-red-500/10 text-red-400 border border-red-500/30' 
              : 'bg-green-500/10 text-green-400 border border-green-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {users.length === 0 ? (
          <div className="text-gray-400">
            No registered users yet
          </div>
        ) : (
          users.map(user => (
            <div 
              key={user.id} 
              className="p-4 bg-secondary/20 rounded-lg group hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl text-primary flex items-center">
                  {user.nickname || 'Unnamed User'}
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    className="ml-3 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all duration-200 ease-in-out"
                    disabled={isLoading}
                    title="Remove User"
                    style={{
                      transform: 'translateX(6px)',
                    }}
                  >
                    <Trash2 
                      size={14} 
                      className="text-red-400 transform group-hover:scale-110 transition-transform duration-200" 
                    />
                  </button>
                </h3>
              </div>
              <p className="text-gray-400">
                {formatPhoneNumber(user.phoneNumber)}
              </p>
              <p className="text-gray-400">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="nav-button px-6"
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phoneNumber;
};

export default ShowUsers;