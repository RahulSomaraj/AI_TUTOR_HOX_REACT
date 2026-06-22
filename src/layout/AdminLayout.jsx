import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Navbar from "../components/Navbar/Navbar";

const AdminLayout = () => {
  // Drawer state for the mobile sidebar (ignored at lg+ where it's static).
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* min-w-0 lets the content area shrink instead of overflowing on small screens */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#EEF5F9]">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
