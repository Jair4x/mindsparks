import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useSpaceStore } from "./store";
import { QuickCaptureApp } from "./quick-capture/QuickCaptureApp";

const isQuickCapture = new URLSearchParams(window.location.search).get("window") === "quick-capture";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isQuickCapture ? <QuickCaptureApp /> : <App />}
  </React.StrictMode>,
);
