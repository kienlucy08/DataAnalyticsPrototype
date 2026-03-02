import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'

const Layout: React.FC = () => (
  <div className="flex min-h-screen bg-surface">
    <Sidebar />
    <div className="flex flex-col flex-1 min-w-0">
      <TopNav />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  </div>
)

export default Layout
