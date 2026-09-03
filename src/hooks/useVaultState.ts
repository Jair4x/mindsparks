import { useCallback, useEffect, useState } from "react";
import { getVaultState, pickVaultFolder, setVaultPath, type VaultState } from "../lib/vault";

interface UseVaultStateResult {
    state:          VaultState | null;  // null while initial setup is in progress.
    isChoosing:     boolean;            // true while the picker is open or is saving.
    error:          string | null;
    chooseFolder:   () => promise<void>;
}

export function useVaultState(): UseVaultStateResult {
    const [state, setState]             = useState<VaultState | null>(null);
    const [isChoosing, setIsChoosing]   = useState(false);
    const [error, setError]             = useState<string | null>(null);

    useEffect(() => {
        getVaultState()
            .then(setState)
            .catch((e) => setError(String(e)));
    }, []);

    const chooseFolder = useCallback(async () => {
        setError(null);
        setIsChoosing(true);

        try {
            const folder = await pickVaultFolder();

            if (!folder) {
                // user cancelled
                setIsChoosing(false);
                return;
            }

            await setVaultPath(folder);
            setState({ status: "ready", path: folder });
        } catch (e) {
            setError(String(e));
        } finally {
            setIsChoosing(false);
        }
    }, []);

    return { state, isChoosing, error, chooseFolder };
}