import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { BNPLProvider, useBNPL } from './hooks/useBNPL';
import CheckoutPage from './pages/CheckoutPage';
import QuotationPage from './pages/QuotationPage';
import ContractPage from './pages/ContractPage';
import ProcessingPage from './pages/ProcessingPage';
import DashboardPage from './pages/DashboardPage';
import DemoWalkthroughPage from './pages/DemoWalkthroughPage';
import './styles/globals.css';

function AppContent() {
  const { state } = useBNPL();

  const getRouteForStep = (step: string) => {
    switch (step) {
      case 'checkout':
        return '/';
      case 'quotation':
        return '/quotation';
      case 'contract':
        return '/contract';
      case 'processing':
        return '/processing';
      case 'dashboard':
        return '/dashboard';
      default:
        return '/';
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<CheckoutPage />} />
          <Route path="/quotation" element={<QuotationPage />} />
          <Route path="/contract" element={<ContractPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/demo" element={<DemoWalkthroughPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <BNPLProvider>
      <AppContent />
    </BNPLProvider>
  );
}

export default App;