import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Enquiries from "./pages/admin/Enquiries";
import Content from "./pages/admin/Content";
import Listings from "./pages/admin/Listings";
import Projects from "./pages/admin/Projects";
import Team from "./pages/admin/Team";
import NotFound from "./pages/NotFound";
import { SiteLayout } from "./components/site/SiteLayout";
import * as P from "./pages/site/Pages";
import { Inbox } from "./pages/site/Inbox";

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
            <Route path="/inbox" element={<Inbox />} />
            {/* Unknown public URLs keep the site header and footer */}
            <Route path="*" element={<NotFound />} />
          </Route>
          {/* Private application area: separate from the public layout */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="listings" element={<Listings />} />
            <Route path="projects" element={<Projects />} />
            <Route path="content" element={<Content />} />
            <Route path="team" element={<Team />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="/reset-password" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
