import React from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Film,
  Archive,
  MessageSquare
} from 'lucide-react';

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

export default function WelcomeModal({ onClose }) {
  return (
    <Modal>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary mb-3">
          Welcome to StreamRequest! 🎉
        </h2>
        <p className="text-base text-gray-400">
          Here's how to get started with managing your media server
        </p>
      </div>

      <div className="space-y-6 mb-8">
        <div className="p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-xl text-primary mb-2">Invite Users</h3>
              <p className="text-gray-400">
                Start by inviting your friends and family using their phone numbers. They'll receive a text message to join your media server.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-xl text-primary mb-2">Receive Requests</h3>
              <p className="text-gray-400">
                Your users can text their media requests, which will appear in your dashboard for approval.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-xl text-primary mb-2">Manage Requests</h3>
              <p className="text-gray-400">
                Review and approve media requests from your dashboard. Users will be notified when their requests are approved or rejected.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-xl text-primary mb-2">Library Management</h3>
              <p className="text-gray-400">
                Approved content appears in your library for 21 days. You'll be notified when items are about to expire. Users will be able confirm deletion or renew the content. 
                <br></br><br></br>Use this to keep media storage usage in check and keep your library fresh.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="nav-button px-6"
        >
          Get Started
        </button>
      </div>
    </Modal>
  );
}