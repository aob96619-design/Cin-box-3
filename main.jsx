import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// Service workers require HTTPS in production (localhost is also allowed for development).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("CineBox: impossible d’activer le mode hors ligne", error);
    });
  });
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
