import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DataAnalytics from './pages/DataAnalytics'
import Dashboard from './pages/Dashboard'
import PowerBIDashboardPage from './pages/PowerBIDashboardPage'
import QADashboard from './pages/QADashboard'
import Sites from './pages/Sites'
import Projects from './pages/Projects'
import Customers from './pages/Customers'
import ScopeOfWork from './pages/ScopeOfWork'
import Templates from './pages/Templates'
import Import from './pages/Import'
import Organization from './pages/Organization'
import DemoGuide from './pages/DemoGuide'
import { DashboardProvider } from './context/DashboardContext'
import { DemoProvider } from './context/DemoContext'

const App: React.FC = () => (
  <BrowserRouter>
    <DashboardProvider>
      <DemoProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/qa-dashboard" replace />} />
            <Route path="qa-dashboard"          element={<QADashboard />} />
            <Route path="sites"                 element={<Sites />} />
            <Route path="projects"              element={<Projects />} />
            <Route path="customers"             element={<Customers />} />
            <Route path="scope-of-work"         element={<ScopeOfWork />} />
            <Route path="templates"             element={<Templates />} />
            <Route path="import"                element={<Import />} />
            <Route path="organization"          element={<Organization />} />
            <Route path="powerbi-dashboard"     element={<PowerBIDashboardPage />} />
            <Route path="custom-data-analytics" element={<DataAnalytics />} />
            <Route path="custom-dashboard"      element={<Dashboard />} />
            <Route path="demo"                  element={<DemoGuide />} />
            <Route path="*" element={<Navigate to="/qa-dashboard" replace />} />
          </Route>
        </Routes>
      </DemoProvider>
    </DashboardProvider>
  </BrowserRouter>
)

export default App
