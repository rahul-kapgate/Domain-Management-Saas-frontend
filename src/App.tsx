import { Routes, Route } from "react-router-dom";
import LoginPage from "@/Pages/LoginPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDashboardPage from "./Pages/AdminDashboardPage";
import UserDomainsPage from "./Pages/UserDomainsPage";

function Dashboard() {
  return <div className="p-4">Dashboard ✅</div>;
}

function Unauthorized() {
  return <div className="p-4">Unauthorized ❌</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/user" element={<UserDomainsPage />} />
      </Route>

      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
}
