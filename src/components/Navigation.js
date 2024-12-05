"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { useNotification } from "@/app/context/NotificationContext";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const { user, logout } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      showNotification("Logged out successfully!", "success");
      router.push("/");
    } catch (error) {
      console.error("Failed to log out", error);
      showNotification("Failed to log out", "error");
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="logo">
          <svg className="logo-icon" viewBox="0 0 24 24" width="24" height="24">
            <path
              fill="currentColor"
              d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"
            />
          </svg>
          <span className="logo-text">
            Stream<span className="logo-highlight">Request</span>
          </span>
        </Link>
        <ul className="nav-links">
          {user ? (
            <>
              <li>
                <Link href="/dashboard" className="nav-button">
                  Dashboard
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} className="nav-button">
                  Log Out
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/login" className="nav-button">
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="nav-button nav-button-highlight"
                >
                  Sign Up
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
