// src/App.js
import React from 'react';
import { AuthProvider, withAuth } from './contexts/AuthContext';
import ProjectLoomApp from './components/ProjectLoomApp';
import './App.css';

// Wrap your main app with authentication
const AuthenticatedApp = withAuth(ProjectLoomApp);

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </div>
  );
}

export default App;
