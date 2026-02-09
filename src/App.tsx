import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Threats from "./pages/Threats";
import ThreatDetail from "./pages/ThreatDetail";
import ReviewQueue from "./pages/ReviewQueue";
import Chat from "./pages/Chat";
import HuntHistory from "./pages/HuntHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/threats" element={<Threats />} />
            <Route path="/threats/:id" element={<ThreatDetail />} />
            <Route path="/review" element={<ReviewQueue />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/hunt-history" element={<HuntHistory />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
