import { create } from "zustand";

interface ToolSessionStore {
    session: Record<string, unknown>;
    setSession: (instanceId: string, value: unknown) => void;
    clearSession: (instanceId: string) => void;
}

export const useToolSessionStore = create<ToolSessionStore>((set) => ({
    session: {},

    setSession: (instanceId, value) => {
        set((state) => ({ session: { ...state.session, [instanceId]: value }}));
    },

    clearSession: (instanceId) => {
        set((state) => {
            const { [instanceId]: _removed, ...rest } = state.session;

            return { session: rest };
        });
    },
}));