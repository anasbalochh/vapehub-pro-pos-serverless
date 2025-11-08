import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle browser extension errors gracefully (e.g., MetaMask, Wallet extensions)
if (typeof window !== 'undefined') {
  // Prevent errors from browser extensions that try to inject ethereum object
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj: any, prop: string, descriptor: PropertyDescriptor) {
    if (prop === 'ethereum' && obj === window && descriptor.configurable === false) {
      // Allow browser extensions to define ethereum, but catch errors
      try {
        return originalDefineProperty.call(this, obj, prop, descriptor);
      } catch (e) {
        // Silently handle redefinition errors from extensions
        console.warn('Browser extension attempted to redefine ethereum property');
        return obj;
      }
    }
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
