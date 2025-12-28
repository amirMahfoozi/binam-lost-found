import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface VerifyResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await apiFetch("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("OTP sent (check server logs in dev).");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const data = await apiFetch<VerifyResponse>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp, password }),
      });
      login(data.token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 border rounded p-4">
      <h1 className="text-xl font-semibold mb-4">Sign up</h1>

      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="email"
              value={email}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm mb-1">OTP code</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full border rounded px-2 py-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
      )}

      <p className="mt-3 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
