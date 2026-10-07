//
// Functions to stop file watchers when trying to edit stuff (renaming and other actions)
//  So we can do those edits without being bugged with "hey! you can't do that!" (access denied)
//

type Unwatch = () => void;

const watchersByFlame = new Map<string, Set<Unwatch>>();

// Returns a guarded version of unwatch, safe to call more than once
export function registerWatcher(flameId: string, unwatch: Unwatch): Unwatch {
    let called = false;
    const guarded: Unwatch = () => {
        if (called) return;
        called = true;
        unwatch();
    };

    if (!watchersByFlame.has(flameId)) {
        watchersByFlame.set(flameId, new Set());
    }

    watchersByFlame.get(flameId)!.add(guarded);

    return guarded;
}

export function unregisterWatcher(flameId: string, unwatch: Unwatch) {
    watchersByFlame.get(flameId)?.delete(unwatch);
}

export function pauseWatchersForFlame(flameId: string) {
    const watchers = watchersByFlame.get(flameId);
    if (!watchers) return;

    for (const unwatch of watchers) {
        unwatch();
    }

    watchers.clear();
}
