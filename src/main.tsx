import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useSpaceStore } from "./store";

useSpaceStore.getState().initializeDefaultSpace();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
