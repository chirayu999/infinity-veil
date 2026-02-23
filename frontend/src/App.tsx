import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import WebSocketProvider from "./components/WebSocketProvider";
import Index from "./pages/Index";
import Threats from "./pages/Threats";
import ThreatDetail from "./pages/ThreatDetail";
import ReviewQueue from "./pages/ReviewQueue";
import Chat from "./pages/Chat";
import HuntHistory from "./pages/HuntHistory";
import HuntDetail from "./pages/HuntDetail";
import ExceptionPatterns from "./pages/ExceptionPatterns";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider queryClient={queryClient}>
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
              <Route path="/hunts" element={<HuntHistory />} />
              <Route path="/hunts/:id" element={<HuntDetail />} />
              <Route path="/exceptions" element={<ExceptionPatterns />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </WebSocketProvider>
  </QueryClientProvider>
);

export default App;

