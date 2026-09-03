//
// Global constants of the project.
//
// Each and every magic number that appears in more than one place
// or that's possible to change in the future goes here.
//
import { Tool, Schema } from "../types";

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

export const tools: Tool[] = [
    {
        name:                   "markdown",
        label:                  "Markdown Notes",
        description:            "Write notes and documentation with Markdown support.",
        icon:                   "FileText",
        enabled:                true,
        allowMultipleInstances: true,
    },
    {
        name:                   "kanban",
        label:                  "Kanban Board",
        description:            "Manage tasks with a customizable Kanban board",
        icon:                   "SquareKanban",
        enabled:                true,
        allowMultipleInstances: false,
    },
    {
        name:                   "gantt",
        label:                  "Gantt Chart",
        description:            "Visualize your project timeline. Linkeable to Kanban.",
        icon:                   "SquareChartGantt",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "canvas",
        label:                  "Free Canvas",
        description:            "Open whiteboard to diagram and think visually.",
        icon:                   "Presentation",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "glossary",
        label:                  "Glossary",
        description:            "Table of terms and definitions.",
        icon:                   "BookOpen",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "bibliography",
        label:                  "Bibliography",
        description:            "Reference log with author, year and URL fields.",
        icon:                   "Library",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "openapi",
        label:                  "OpenAPI",
        description:            "Importable and exportable OpenAPI schema editor.",
        icon:                   "Code",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "database",
        label:                  "Database Schema",
        description:            "Visual definition of tables, relationships and data types.",
        icon:                   "Database",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "changelog",
        label:                  "Changelog",
        description:            "Version and change log.",
        icon:                   "FolderGit2",
        enabled:                false,
        allowMultipleInstances: false,
    },
    {
        name:                   "journal",
        label:                  "Project Journal",
        description:            "Chronological log of decisions with date and context.",
        icon:                   "BookMarked",
        enabled:                false,
        allowMultipleInstances: false,
    }
];

export const schemas: Schema[] = [
    {
        name:           "general",
        label:          "General",
        description:    "A balanced starting point for most projects.",
        tools:          ["markdown", "kanban"],
    },
    {
        name:           "development",
        label:          "Development",
        description:    "For technical projects: apps, APIs, scripts.",
        tools:          ["markdown", "kanban", "openapi", "database", "changelog"],
    },
    {
        name:           "research",
        label:          "Research",
        description:    "For study, experiments or knowledge projects.",
        tools:          ["markdown", "glossary", "bibliography"],
    },
    {
        name:           "custom",
        label:          "Custom",
        description:    "Start from scratch and pick your own tools.",
        tools:          [],
    }
];
