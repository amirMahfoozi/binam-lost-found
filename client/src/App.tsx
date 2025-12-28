import { Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ItemsPage from "./pages/ItemsPage";

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <Link to="/" className="font-semibold text-lg">
          Lost &amp; Found
        </Link>
        <nav className="flex gap-3 items-center">
          {user ? (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ItemsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        {/* later: /items/:id , /items/new, etc. */}
      </Routes>
    </Layout>
  );
}
