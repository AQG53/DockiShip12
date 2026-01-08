import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { AnimatedAlertProvider } from "./components/ui/AnimatedAlert";

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedAlertProvider>
          <App />
        </AnimatedAlertProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
