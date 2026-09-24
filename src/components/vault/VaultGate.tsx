//
// Blockes the rendering of the rest of the app until we know WHERE is the vault.
//
// 4 possible states (according to useVaultState):
//  - Not yet known (initial checking in-progress)      -> nothing is rendered
//  - "not_set" (first time)                            -> onboarding
//  - "missing" (already set up, but not there anymore) -> error screen
//  - "ready", Spaces still loading                     -> nothing is rendered (briefly)
//  - "ready", Spaces failed to load                    -> error screen, Retry
//  - "ready", Spaces loaded                            -> Renders the rest of the app
//

import { useEffect, useState } from "react";
import { FolderOpen, FolderX, AlertTriangle } from "lucide-react";
import { useVaultState } from "../../hooks";
import { useCategoryStore, useFlameStore, useSpaceStore, useSparkStore } from "../../store";

export function VaultGate({ children }: { children: React.ReactNode }) {
    const { state, isChoosing, error, chooseFolder } = useVaultState();

    const [spacesLoaded, setSpacesLoaded] = useState(false);
    const [spacesError, setSpacesError]   = useState<string | null>(null);
    
    useEffect(() => {
        if (state?.status !== "ready") return;

        useSpaceStore.getState().loadSpaces()
            .then(() => setSpacesLoaded(true))
            .catch((e) => setSpacesError(String(e)));
        
        useSparkStore.getState().loadSparks()
            .catch((e) => console.error("Couldn't load Sparks: ", e));
        
        useFlameStore.getState().loadFlames()
            .catch((e) => console.error("Couldn't load Flames: ", e));
        
        useCategoryStore.getState().loadCategories()
            .catch((e) => console.error("Couldn't load Categories: ", e));
    }, [state?.status]);

    const retryLoadSpaces = () => {
        setSpacesError(null);
        useSpaceStore.getState().loadSpaces()
            .then(() => setSpacesLoaded(true))
            .catch((e) => setSpacesError(String(e)));
    };

    if (state === null) {
        return null; // prevents the onboarding flashing while resolving the initial checks
    }

    if (state.status === "ready" && spacesLoaded) {
        return <>{children}</>;
    }

    if (state.status === "ready" && !spacesError) {
        return null; // spaces are loading, should be brief enough to not need a spinner
    }

    const isMissing = state.status === "missing";
    const isSpacesError = state.status === "ready" && spacesError !== null;

    return (
        <div
            className="w-screen h-screen flex items-center justify-center"
            style={{ background: "var(--color-bg)" }}
        >
            <div
                className="flex flex-col items-center gap-4 text-center"
                style={{ maxWidth: 360 }}
            >
                <span style={{ color: "var(--color-accent)" }}>
                    {isSpacesError
                        ? <AlertTriangle size={32} />
                        : isMissing ? <FolderX size={32} /> : <FolderOpen size={32} />}
                </span>

                <div>
                    <h1 style={{ fontSize: 16, color: "var(--color-text)" }}>
                        {isSpacesError ? "Couldn't load your data" : isMissing ? "Vault not found" : "Welcome to MindSparks"}
                    </h1>
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
                        {isSpacesError
                            ? spacesError
                            : isMissing
                                ? "The folder MindSparks last used isn't there anymore."
                                : "Choose a folder where MindSparks will keep your sparks, flames and files."}
                    </p>

                    {isMissing && (
                        <code
                            style={{
                                display: "block",
                                fontSize: 11,
                                color: "var(--color-text-muted)",
                                marginTop: 6,
                                wordBreak: "break-all"
                            }}
                        >
                            {state.path}
                        </code>
                    )}
                </div>

                <button
                    onClick={isSpacesError ? retryLoadSpaces : chooseFolder}
                    disabled={isChoosing}
                    className="cursor-pointer border-none"
                    style={{
                        background: "var(--color-accent)",
                        color: "var(--color-bg)",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 13,
                        fontFamily: "inherit",
                        opacity: isChoosing ? 0.6 : 1,
                    }}
                >
                    {isSpacesError ? "Retry" : isChoosing ? "Choosing..." : "Choose folder"}
                </button>

                {error && (
                    <p style={{ fontSize: 12, color: "var(--color-danger)"}}>
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}