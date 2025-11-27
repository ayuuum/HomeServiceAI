import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "./contexts/StoreContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import BookingPage from "./pages/BookingPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import StaffSchedulePage from "./pages/StaffSchedulePage";
import CustomerManagement from "./pages/CustomerManagement";
import StaffManagement from "./pages/StaffManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<BookingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/schedule" element={
                <ProtectedRoute>
                  <StaffSchedulePage />
                </ProtectedRoute>
              } />
              <Route path="/admin/customers" element={
                <ProtectedRoute>
                  <CustomerManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/staffs" element={
                <ProtectedRoute>
                  <StaffManagement />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
