import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { SiteLayout } from "./components/site/SiteLayout";
import * as P from "./pages/site/Pages";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<P.About />} />
            <Route path="/properties" element={<P.Properties />} />
            <Route path="/properties/:slug" element={<P.PropertyDetail />} />
            <Route path="/furniture" element={<P.Furniture />} />
            <Route path="/previous-jobs" element={<P.PreviousJobs />} />
            <Route path="/project-updates" element={<P.ProjectUpdates />} />
            <Route path="/arya-luxe" element={<P.AryaLuxe />} />
            <Route path="/contact" element={<P.Contact />} />
            {/* Unknown public URLs keep the site header and footer */}
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Private application area: separate from the public layout */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
