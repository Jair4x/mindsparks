import "./App.css";
import { AppLayout } from "./components/layout/AppLayout";
import { VaultGate } from "./components/vault/VaultGate";
import { useQuickCaptureBridge, useFlushPositionsOnClose } from "./hooks";

function App() {
  useQuickCaptureBridge();
  useFlushPositionsOnClose();

  return (
    <VaultGate>
      <AppLayout />
    </VaultGate>
  );
}

export default App;