//
// Global constants of the project.
//
// Each and every magic number that appears in more than one place
// or that's possible to change in the future goes here.
//
import i18n from "i18next";

// --------------------------
//            Canvas
// --------------------------

export const MIN_ZOOM               = 0.2;      // 20%
export const MAX_ZOOM               = 2.5;      // 250%
export const DEFAULT_ZOOM           = 1;
export const ZOOM_STEP              = 0.1;
export const DEFAULT_CARD_WIDTH     = 180;      // px
export const DEFAULT_CARD_HEIGHT    = 40;       // px

// --------------------------
//          Repulsion
// --------------------------

export const REPULSION_GAP          = 24;       // px (air between borders of two cards)
export const REPULSION_MAX_FORCE    = 100;
export const REPULSION_DURATION     = 400;      // ms

// --------------------------
//            Spark
// --------------------------

export const SPARK_DESC_MAX_LENGTH  = 100;
export const SPARK_DESC_MAX_LINES   = 2;

// --------------------------
//             UI
// --------------------------

export const SAFE_ZONE_MARGIN       = 20;       // px (margin for canvas safe zones)
export const HEADER_HEIGHT          = 44;       // px

// --------------------------
//           Flames
// --------------------------

// * Tools are probably going to change or integrate one another as features instead of individual after the MVP.
// * Highly depends on feedback and new ideas that arise.

// Previously the whole Tool[] and Schema[] constants, had to change into static shapes because of rendering timing problems with i18n.
// Label & description fields + proper Tool[] and Schema[] defined on src/hooks/useToolCatalog.ts

export interface ToolDefinition {
    name:                   string;
    icon:                   string;
    enabled:                boolean;
    allowMultipleInstances: boolean;
}

export const toolDefinitions: ToolDefinition[] = [
    {
        name:                   "markdown",
        icon:                   "FileText",
        enabled:                true,
        allowMultipleInstances: true,
    },
    {
        name:                   "kanban",
        icon:                   "SquareKanban",
        enabled:                true,
        allowMultipleInstances: false,
    },
    {
        name:                   "gantt",
        icon:                   "SquareChartGantt",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "canvas",
        icon:                   "Presentation",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "glossary",
        icon:                   "BookOpen",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "bibliography",
        icon:                   "Library",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "openapi",
        icon:                   "Code",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "database",
        icon:                   "Database",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "changelog",
        icon:                   "FolderGit2",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "journal",
        icon:                   "BookMarked",
        enabled:                false,
        allowMultipleInstances: false,
    }
];

export interface SchemaDefinition {
    name:   string;
    tools:  string[];
}

export const schemaDefinitions: SchemaDefinition[] = [
    {
        name:           "general",
        tools:          ["markdown", "kanban"],
    },
    {
        name:           "development",
        tools:          ["markdown", "kanban", "openapi", "database", "changelog"],
    },
    {
        name:           "research",
        tools:          ["markdown", "glossary", "bibliography"],
    },
    {
        name:           "custom",
        tools:          [],
    }
];
