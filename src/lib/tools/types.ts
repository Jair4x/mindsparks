export interface ToolContext {
    instanceId:     string;
    flameId:        string;
    flameName:      string;
    spaceId:        string;
    spaceName:      string;
}

export interface ToolContentAdapter<TRoot> {
    resolveRoot (context: ToolContext): Promise<TRoot>;
    delete      (context: ToolContext): Promise<void>;
}
