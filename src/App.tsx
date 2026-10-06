import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import { fetchSiteContent } from "@/lib/siteContent";
const Auth = lazy(() => import("./pages/Auth"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Enquiries = lazy(() => import("./pages/admin/Enquiries"));
const Content = lazy(() => import("./pages/admin/Content"));
const Media = lazy(() => import("./pages/admin/Media"));
const Arya = lazy(() => import("./pages/admin/Arya"));
const Listings = lazy(() => import("./pages/admin/Listings"));
const Projects = lazy(() => import("./pages/admin/Projects"));
const Team = lazy(() => import("./pages/admin/Team"));
import NotFound from "./pages/NotFound";
import { SiteLayout } from "./components/site/SiteLayout";
import * as P from "./pages/site/Pages";
import { Inbox } from "./pages/site/Inbox";

// The admin area and sign-in are only downloaded by the people who open them, so the public pages stay light.
const queryClient = new QueryClient();
// Start fetching the site text and photo choices straight away, so photos are only requested once, at their final address.
queryClient.prefetchQuery({ queryKey: ["site-content"], queryFn: fetchSiteContent, staleTime: 60_000 });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
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
            <Route path="media" element={<Media />} />
            <Route path="arya" element={<Arya />} />
            <Route path="team" element={<Team />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="/reset-password" element={<Navigate to="/auth" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
