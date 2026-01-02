import { useState } from "react";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { EmailVerification } from "./components/EmailVerification";
import { Header } from "./components/Header";
import { PackageCheck, FileText, Bell } from "lucide-react";
import AddItem from "./components/AddItem";
import ItemsList from "./components/ItemsList";

// type ViewType = "login" | "register" | "verify-email" | "dashboard";
type ViewType = "login" | "register" | "verify-email" | "dashboard" | "add-item" | "items";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("login");
  const [userEmail, setUserEmail] = useState("");

  const handleRegisterSuccess = (email: string) => {
    setUserEmail(email);
    setCurrentView("verify-email");
  };

  const handleLoginSuccess = () => {
    setCurrentView("dashboard");
  };

  const handleVerificationComplete = () => {
    setCurrentView("dashboard");
  };

  const handleBackToRegister = () => {
    setCurrentView("register");
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
              onVerificationComplete={handleVerificationComplete}
              onBackToRegister={handleBackToRegister}
            />
          )}

          {currentView === "dashboard" && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <PackageCheck className="size-8 text-green-600" />
                </div>
                <h2 className="mb-2">Welcome to Campus Lost & Found!</h2>
                <p className="text-gray-600">
                  You're now ready to help reunite lost items with their owners
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="size-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm mb-1">Report Lost Items</h3>
                      <p className="text-xs text-gray-600">
                        Let others know what you've lost so they can help you find it
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <PackageCheck className="size-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="text-sm mb-1">Found Something?</h3>
                      <p className="text-xs text-gray-600">
                        Post found items to help fellow students recover their belongings
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
                <button
                  onClick={() => setCurrentView("login")}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {currentView === "add-item" && (
            <AddItem/>
          )}

          {currentView === "items" && (
            <ItemsList/>
          )}


          <button onClick={() => setCurrentView("login")}>login</button>
          <button onClick={() => setCurrentView("add-item")}>add-item</button>
          <button onClick={() => setCurrentView("items")}>items</button>
        </div>
      </div>
    </div>
  );
}