import { useCallback } from "react";
import { useToolSessionStore } from "../store";

export function useToolSession<T>(instanceId: string, defaultValue: T): [T, (value: T) => void] {
    const value         = useToolSessionStore((s) => s.session[instanceId]) as T | undefined;
    const setSession    = useToolSessionStore((s) => s.setSession);

    const setValue = useCallback(
        (newValue: T) => setSession(instanceId, newValue),
        [instanceId, setSession]
    );

    return [value ?? defaultValue, setValue];
}
