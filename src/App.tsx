import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { Admin } from "@/pages/Admin";
import { CompleteProfile } from "@/pages/CompleteProfile";
import { Leaderboard } from "@/pages/Leaderboard";
import { Login } from "@/pages/Login";
import { NotFound } from "@/pages/NotFound";
import { Predictions } from "@/pages/Predictions";
import { ResetPassword } from "@/pages/ResetPassword";

function RequireAuth({ children, adminOnly = false }: { children: JSX.Element; adminOnly?: boolean }) {
  const { user, profile, isAdmin, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile?.full_name) return <Navigate to="/complete-profile" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/predictions" replace />;

  return children;
}

function RequireSession({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user && profile?.full_name) return <Navigate to="/predictions" replace />;
  if (user) return <Navigate to="/complete-profile" replace />;

  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/predictions" replace />} />
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/complete-profile"
        element={
          <RequireSession>
            <CompleteProfile />
          </RequireSession>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route
          path="/predictions"
          element={
            <RequireAuth>
              <Predictions />
            </RequireAuth>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <RequireAuth>
              <Leaderboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth adminOnly>
              <Admin />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
