import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginAndGetToken } from "../api/authService";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Username and password are required.");
      return;
    }

    try {
      setLoading(true);
      await loginAndGetToken(username.trim(), password.trim());
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#eef7fa] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[520px] rounded-lg bg-white px-11 py-10 shadow-sm">
        <div className="mb-9 text-center">
          <h1 className="text-[32px] font-bold leading-tight text-[#245f6d]" style={{ fontFamily: "'Harabara Mais Demo', sans-serif" }}>
            AiTutor
          </h1>
          <h2 className="mt-3 text-[18px] font-semibold text-neutral-900">
            Login
          </h2>
        </div>

        {error && (
          <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div>
            <label
              className="mb-2 block text-[13px] font-medium text-neutral-900"
              htmlFor="username"
            >
              Email or Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="you@example.com"
              className="h-9 w-full rounded-md border border-neutral-300 px-3 text-[12px] text-neutral-900 outline-none transition focus:border-[#245f6d] focus:ring-2 focus:ring-[#245f6d]/15"
              autoComplete="username"
            />
          </div>

          <div className="mt-7">
            <label
              className="mb-2 block text-[13px] font-medium text-neutral-900"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="h-9 w-full rounded-md border border-neutral-300 px-3 pr-10 text-[12px] text-neutral-900 outline-none transition focus:border-[#245f6d] focus:ring-2 focus:ring-[#245f6d]/15"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition hover:text-[#245f6d]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-4 text-right">
              <button
                type="button"
                className="text-[13px] font-semibold text-[#245f6d] transition hover:text-[#174652]"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 h-9 w-full rounded-md bg-[#1f6573] text-[13px] font-medium text-white transition hover:bg-[#174f5b] disabled:cursor-not-allowed disabled:bg-[#8fb6bf]"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4 text-[13px] text-neutral-500">
          <span className="h-px flex-1 bg-neutral-300" />
          <span>Or Continue with</span>
          <span className="h-px flex-1 bg-neutral-300" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-3 rounded-md border border-neutral-400 bg-white text-[13px] text-neutral-500 transition hover:border-[#245f6d] hover:text-[#245f6d]"
          >
            <span className="text-lg font-bold">
              <span className="text-[#4285f4]">G</span>
            </span>
            Google
          </button>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-3 rounded-md border border-neutral-400 bg-white text-[13px] text-neutral-500 transition hover:border-[#245f6d] hover:text-[#245f6d]"
          >
            <span className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-0.5">
              <span className="bg-[#f25022]" />
              <span className="bg-[#7fba00]" />
              <span className="bg-[#00a4ef]" />
              <span className="bg-[#ffb900]" />
            </span>
            Microsoft
          </button>
        </div>

        <p className="mt-8 text-center text-[13px] text-neutral-500">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className="font-semibold text-[#245f6d] transition hover:text-[#174652]"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
