import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import {  ParkomatyProvider,} from "./context/ParkomatyContext";
import { AuthProvider } from "./context/AuthContext";
import './index.css'


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ParkomatyProvider>
        <App />
      </ParkomatyProvider>
    </AuthProvider>
  </StrictMode>
)


