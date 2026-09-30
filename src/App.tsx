import { Route, Routes, Navigate } from "react-router-dom"
import Login from "./pages/login"
import SettingsPage from "./pages/settings"
import AdminLayout from "./layouts/admin-layout"
import Dayend from "./pages/dayend"
import Packages from "./pages/packages"
import StaffPage from "./pages/staff"
import SeatPage from "./pages/seat"
import ServicesPage from "./pages/services"
import BookingsPage from "./pages/bookings"
import TodayPage from "./pages/today"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Admin Dashboard Routes */}
      <Route element={<AdminLayout><StaffPage /></AdminLayout>} path="/staff" />
      <Route element={<AdminLayout><SeatPage /></AdminLayout>} path="/seat" />
      <Route element={<AdminLayout><ServicesPage /></AdminLayout>} path="/services" />
      <Route element={<AdminLayout><BookingsPage /></AdminLayout>} path="/bookings" />
      <Route element={<AdminLayout><Packages /></AdminLayout>} path="/packages" />
      <Route element={<AdminLayout><TodayPage /></AdminLayout>} path="/today" />
      <Route element={<AdminLayout><Dayend /></AdminLayout>} path="/dayend" />
      <Route element={<AdminLayout><SettingsPage /></AdminLayout>} path="/settings" />
      
      {/* Redirect to dashboard */}
      <Route path="*" element={<Navigate to="/services" />} />
    </Routes>
  )
}

export default App
