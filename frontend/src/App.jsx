import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Orders from './pages/Orders.jsx';
import Communications from './pages/Communications.jsx';
import Insights from './pages/Insights.jsx';
import Agent from './pages/Agent.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="orders" element={<Orders />} />
        <Route path="communications" element={<Communications />} />
        <Route path="insights" element={<Insights />} />
        <Route path="agent" element={<Agent />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<p>Page not found.</p>} />
      </Route>
    </Routes>
  );
}
