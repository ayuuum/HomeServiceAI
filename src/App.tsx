import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import BookingPage from "./pages/BookingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import ReportsPage from "./pages/ReportsPage";
import AdminDashboard from "./pages/AdminDashboard";
import CustomerManagement from "./pages/CustomerManagement";
import CalendarPage from "./pages/CalendarPage";
import InboxPage from "./pages/InboxPage";
import BroadcastPage from "./pages/BroadcastPage";
import CancelBookingPage from "./pages/CancelBookingPage";
import RescheduleBookingPage from "./pages/RescheduleBookingPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import MyBookingsPage from "./pages/liff/MyBookingsPage";
import LiffBookingPage from "./pages/liff/LiffBookingPage";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={<LandingPage />} />
            {/* Public booking page with organization slug */}
            <Route path="/booking/:orgSlug" element={<BookingPage />} />
            <Route path="/liff/booking/:orgSlug" element={<LiffBookingPage />} />
            <Route path="/liff/booking" element={<LiffBookingPage />} /> {/* LIFF default route */}
            <Route path="/booking/:orgSlug/my-bookings" element={<MyBookingsPage />} />
            {/* Default booking page */}
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/cancel/:token" element={<CancelBookingPage />} />
            <Route path="/reschedule/:token" element={<RescheduleBookingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/customers" element={
              <ProtectedRoute>
                <CustomerManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/calendar" element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/inbox" element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/broadcast" element={
              <ProtectedRoute>
                <BroadcastPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;