// Protected Route Guard Component
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, children }) => {
  // Check if authentication token exists in browser localStorage
  const token = localStorage.getItem('tripmate_token');

  if (!token || !user) {
    // Redirect unauthenticated visitors to login
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;
