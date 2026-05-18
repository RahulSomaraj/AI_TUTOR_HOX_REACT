import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  adminLogout,
  deleteAdminAccount,
  fetchMyProfile,
} from "../../api/authService";

function readStoredAdminUser() {
  try {
    return JSON.parse(localStorage.getItem("adminUser") || "{}");
  } catch {
    return {};
  }
}

function pickName(user) {
  const firstLast = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  const candidate =
    user?.name || user?.fullName || user?.displayName || firstLast || user?.username;
  return candidate && !String(candidate).includes("@") ? candidate : "Admin User";
}

function pickRole(role) {
  if (!role) return "Admin";
  return String(role)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Navbar() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [adminUser, setAdminUser] = useState(() => readStoredAdminUser());
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const adminName = pickName(adminUser);
  const adminRole = pickRole(adminUser.role);
  const adminAvatar =
    typeof adminUser.avatar === "string" && adminUser.avatar.trim()
      ? adminUser.avatar.trim()
      : "";

  // Hydrate profile from API if name/id missing
  useEffect(() => {
    const needsHydration = !adminUser?.id || !adminUser?.name;
    if (!needsHydration) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled || !profile) return;
        const merged = {
          id: profile.id || profile._id || adminUser.id || null,
          name: pickName(profile),
          role: profile.role || profile.userType || adminUser.role || "Admin",
          avatar: profile.avatar || profile.profileImage || adminUser.avatar || "",
        };
        localStorage.setItem("adminUser", JSON.stringify(merged));
        setAdminUser(merged);
      } catch {
        // ignore — fall back to stored values
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function clearSession() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("adminUser");
  }

  function openLogoutConfirm() {
    setOpen(false);
    setErrorMsg("");
    setShowLogoutConfirm(true);
  }

  function openDeleteConfirm() {
    setOpen(false);
    setErrorMsg("");
    setShowDeleteConfirm(true);
  }

  async function handleLogout() {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await adminLogout();
    } catch (err) {
      console.error("Logout API failed:", err);
      // Still proceed to clear local session
    } finally {
      clearSession();
      setIsSubmitting(false);
      setShowLogoutConfirm(false);
      navigate("/login", { replace: true });
    }
  }

  async function handleDeleteAccount() {
    if (!adminUser?.id) {
      setErrorMsg("Unable to identify current account.");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await deleteAdminAccount(adminUser.id);
      clearSession();
      setShowDeleteConfirm(false);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Delete account failed:", err);
      setErrorMsg(
        err?.response?.data?.message || "Failed to delete account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-white shadow-sm px-6 py-3 flex items-center justify-end">
      <div className="flex items-center gap-6 relative" ref={dropdownRef}>
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
          onClick={() => setOpen((v) => !v)}
        >
          {adminAvatar ? (
            <img src={adminAvatar} alt="profile" className="w-10 h-10 rounded-full" />
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
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-14 w-48 bg-white shadow-md rounded-lg py-2 z-40">
            <button
              type="button"
              onClick={openLogoutConfirm}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
            >
              Logout
            </button>
            <button
              type="button"
              onClick={openDeleteConfirm}
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
                disabled={isSubmitting}
                className="rounded border border-[#155966] px-4 py-2 text-sm font-medium text-[#155966] transition hover:bg-[#155966]/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {isSubmitting ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div
            className="w-full max-w-sm rounded-lg bg-white px-8 py-7 text-center shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <h2 id="delete-title" className="text-lg font-semibold text-gray-900">
              Delete Account
            </h2>
            <p className="mt-4 text-sm text-gray-700">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>

            {errorMsg && (
              <p className="mt-3 text-xs text-red-600">{errorMsg}</p>
            )}

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="rounded border border-[#155966] px-4 py-2 text-sm font-medium text-[#155966] transition hover:bg-[#155966]/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isSubmitting}
                className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Navbar;
