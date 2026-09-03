import "./App.css";
import { AppLayout } from "./components/layout/AppLayout";
import { VaultGate } from "./components/vault/VaultGate";
import { useQuickCaptureBridge } from "./hooks";

function App() {
  useQuickCaptureBridge();

  return (
    <VaultGate>
      <AppLayout />
    </VaultGate>
  );
}

export default App;