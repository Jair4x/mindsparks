export interface ToolContext {
    instanceId:         string;
    flameId:            string;
    flameName:          string;
    flameFolderName:    string;
    flameIsArchived:    boolean;
    spaceId:            string;
    spaceName:          string;
    spaceFolderName:    string;
}

export interface ToolContentAdapter<TRoot> {
    resolveRoot (context: ToolContext): Promise<TRoot>;
    delete      (context: ToolContext): Promise<void>;
}
