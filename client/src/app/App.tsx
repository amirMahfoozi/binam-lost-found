import React, { useEffect, useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { EmailVerification } from "./components/EmailVerification";
import { Header } from "./components/Header";
import { PackageCheck, FileText, Bell } from "lucide-react";
import AddItem from "./components/AddItem";
import ItemsList from "./components/ItemsList";

// type ViewType = "login" | "register" | "verify-email" | "dashboard";
// type ViewType = "login" | "register" | "verify-email" | "dashboard" | "add-item";
type ViewType = "login" | "register" | "verify-email" | "dashboard" | "add-item" | "items";

type AppUser = {
  uid: number | string;
  email: string;
  username: string;
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("login");

  // For OTP flow
  const [userEmail, setUserEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  // Auth session
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);

  // Restore session on refresh
  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");

    if (t && u) {
      try {
        const parsed = JSON.parse(u) as AppUser;
        setToken(t);
        setUser(parsed);
        setCurrentView("dashboard");
      } catch {
        // If storage is corrupted, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Register step 1 success -> go to OTP screen
  const handleRegisterSuccess = (email: string, username: string, password: string) => {
    setUserEmail(email);
    setRegisterUsername(username);
    setRegisterPassword(password);
    setCurrentView("verify-email");
  };

  const persistSession = (t: string, u: AppUser) => {
    setToken(t);
    setUser(u);
    localStorage.setItem("token", t);
    localStorage.setItem("user", JSON.stringify(u));
    setCurrentView("dashboard");
  };

  // Login success
  const handleLoginSuccess = (t: string, u: AppUser) => {
    persistSession(t, u);
  };

  // OTP verification success
  const handleVerificationComplete = (t: string, u: AppUser) => {
    persistSession(t, u);
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentView("login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <div className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {currentView === "login" && (
            <LoginForm
              onLoginSuccess={handleLoginSuccess}
              onSwitchToRegister={() => setCurrentView("register")}
            />
          )}

          {currentView === "register" && (
            <RegisterForm
              onRegisterSuccess={handleRegisterSuccess}
              onSwitchToLogin={() => setCurrentView("login")}
            />
          )}

          {currentView === "verify-email" && (
            <EmailVerification
              email={userEmail}
              username={registerUsername}
              password={registerPassword}
              onVerificationComplete={handleVerificationComplete}
              onBackToRegister={() => setCurrentView("register")}
            />
          )}

          {currentView === "dashboard" && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <PackageCheck className="size-8 text-green-600" />
                </div>
                <h2 className="mb-2">Welcome to Campus Lost &amp; Found!</h2>
                {user && (
                  <p className="text-sm text-gray-600">
                    Signed in as {user.email} ({user.username})
                  </p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <PackageCheck className="size-5 text-green-600 mt-0.5" />
                    <div onClick={() => setCurrentView("items")}>
                      <h3 className="text-sm mb-1">Lost/Found Items</h3>
                      <p className="text-xs text-gray-600">
                        See all of the lost and found items
                      </p>
                    </div>
                  </div>
                </div>

              <div className="space-y-4 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="size-5 text-blue-600 mt-0.5" />
                    <div onClick={() => setCurrentView("add-item")}>
                      <h3 className="text-sm mb-1">Report Lost Items</h3>
                      <p className="text-xs text-gray-600">
                        Let others know what you've lost so they can help you find it
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Bell className="size-5 text-purple-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm mb-1">Get Notifications</h3>
                      <p className="text-xs text-gray-600">
                        Receive alerts when items matching your description are found
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <button onClick={signOut} className="text-blue-600 hover:underline text-sm">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentView === "add-item" && (
            <AddItem changeView={setCurrentView}/>
            )}
      
      {currentView === "items" && (
            <ItemsList changeView={setCurrentView}/>
            )}

      {/* token is currently unused here, but kept for future API calls */}
      {/* {token && <div className="hidden">{token}</div>} */}
    </div>
  );
}
