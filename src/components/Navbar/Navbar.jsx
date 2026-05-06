import { useState } from "react";
import { Bell, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Navbar() {
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
  const adminName =
    adminUser.name && !adminUser.name.includes("@") ? adminUser.name : "Admin User";
  const adminRole = adminUser.role || "Admin";
  const adminAvatar =
    typeof adminUser.avatar === "string" && adminUser.avatar.trim()
      ? adminUser.avatar.trim()
      : "";

  function openLogoutConfirm() {
    setOpen(false);
    setShowLogoutConfirm(true);
  }

  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("adminUser");
    navigate("/login", { replace: true });
  }

  return (
    <div className="w-full bg-white shadow-sm px-6 py-3 flex items-center justify-end">
      {/* Right Side */}
      <div className="flex items-center gap-6 relative">
        {/* Notification */}
        <div className="relative cursor-pointer">
          <Bell className="w-5 h-5 text-gray-700" />
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs px-1 rounded-full">
            6
          </span>
        </div>

        {/* Profile */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setOpen(!open)}
        >
          {adminAvatar ? (
            <img
              src={adminAvatar}
              alt="profile"
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f48fb1]"
            >
              <UserRound size={18} className="text-white" strokeWidth={2.3} />
            </div>
          )}
          <div className="hidden md:block">
            <p className="text-sm font-semibold">{adminName}</p>
            <p className="text-xs text-gray-500">{adminRole}</p>
          </div>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-14 w-48 bg-white shadow-md rounded-lg py-2">
            <button
              type="button"
              onClick={openLogoutConfirm}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
            >
              Logout
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
            >
              Delete Account
            </button>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div
            className="w-full max-w-sm rounded-lg bg-white px-8 py-7 text-center shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <h2 id="logout-title" className="text-lg font-semibold text-gray-900">
              Logout
            </h2>
            <p className="mt-4 text-sm text-gray-700">
              Are you sure want to logout this account?
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded border border-[#155966] px-4 py-2 text-sm font-medium text-[#155966] transition hover:bg-[#155966]/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;
