import "./App.css";
import { AppLayout } from "./components/layout/AppLayout";
import { VaultGate } from "./components/vault/VaultGate";

function App() {
  return (
    <VaultGate>
      <AppLayout />
    </VaultGate>
  );
}

export default App;