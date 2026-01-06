import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { EmailVerification } from "./components/EmailVerification";
import { Header } from "./components/Header";
import AddItem from "./pages/AddItem";
import ItemsList from "./pages/ItemsList";
import Dashboard from "./pages/Dashboard";
import ItemShow from "./pages/ItemShow";

export type AppUser = {
  uid: number | string;
  email: string;
  username: string;
};

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

function userExists(){
  return localStorage.getItem("user") !== null;
}

function App() {
  const [userEmail, setUserEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) {
      try {
        const parsed = JSON.parse(u) as AppUser;
        setToken(t);
        setUser(parsed);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const persistSession = (t: string, u: AppUser) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
  };

  const handleRegisterSuccess = (email: string, username: string, password: string) => {
    setUserEmail(email);
    setRegisterUsername(username);
    setRegisterPassword(password);
  };

  const handleLoginSuccess = (t: string, u: AppUser) => persistSession(t, u);
  const handleVerificationComplete = (t: string, u: AppUser) => persistSession(t, u);

  const signOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Routes>
            <Route
              path="/"
              // element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
              element={userExists() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
            />

            <Route
              path="/login"
              element={
                !userExists() ?
                <LoginForm
                  onLoginSuccess={handleLoginSuccess}
                  onSwitchToRegister={() => (window.location.href = "/register")}
                /> : 
                <Navigate to="/dashboard" replace />
              }
            />

            <Route
              path="/register"
              element={
                <RegisterForm
                  onRegisterSuccess={(email, username, password) => {
                    handleRegisterSuccess(email, username, password);
                    // navigate to verify-email after storing register fields
                    window.location.href = "/verify-email";
                  }}
                  onSwitchToLogin={() => (window.location.href = "/login")}
                />
              }
            />

            <Route
              path="/verify-email"
              element={
                <EmailVerification
                  email={userEmail}
                  username={registerUsername}
                  password={registerPassword}
                  onVerificationComplete={(t, u) => {
                    handleVerificationComplete(t, u);
                    window.location.href = "/dashboard";
                  }}
                  onBackToRegister={() => (window.location.href = "/register")}
                />
              }
            />

            <Route
              path="/dashboard"
              element={
                // user ? (
                  userExists() ? (
                  <Dashboard
                    user={user}
                    onNavigate={(path) => (window.location.href = path)}
                    onSignOut={signOut}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route
              path="/items"
              // element={user ? <ItemsList changeView={() => { /* unused */ }} /> : <Navigate to="/login" replace />}
              element={userExists() ? <ItemsList/> : <Navigate to="/login" replace />}
            />

            <Route
              path="/add-item"
              // element={user ? <AddItem changeView={() => { /* unused */ }} /> : <Navigate to="/login" replace />}
              element={userExists() ? <AddItem/> : <Navigate to="/login" replace />}
            />

            <Route
              path="/items/:id"
              element={
                userExists() ? (
                  <ItemShowWrapper/>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />


            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function ItemShowWrapper() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const itemId = Number(id);
  if (Number.isNaN(itemId)) {
    return <div className="p-4">Invalid item id</div>;
  }

  return (
    <ItemShow
      id={itemId}
      onEdit={(iid) => navigate(`/items/${iid}/edit`)}
      onDelete={(iid) => navigate("/items")}
    />
  );
}
