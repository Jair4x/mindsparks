//
// Right-click context menu for sparks and flames on the canvas.
//
// Three variants on what was right-clicked:
//  - Nothing selected (right click on canvas): create actions.
//  - One node selected: actions that act on that single spark/flame.
//  - Multiple nodes selected: actions that act on the whole selection.
//

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useShallow } from "zustand/shallow";
import {
    Copy,
    Link,
    Sparkles,
    Tag,
    Archive,
    Plus,
    ChevronRight,
    GitBranch,
    Flame as FlameIcon,
    ArrowRight,
    Share2,
    Layers,
} from "lucide-react";
import {
    useUIStore,
    useSparkStore,
    useFlameStore,
    useCategoryStore,
    useConnectionStore,
    useSpaceStore
} from "../../store";
import type { Category } from "../../types";
import { HEADER_HEIGHT } from "../../lib/constants";

// --------------------------
// ContextMenu
// --------------------------

export function ContextMenu() {
    const contextMenu       = useUIStore((s) => s.contextMenu);
    const closeContextMenu  = useUIStore((s) => s.closeContextMenu);

    if (!contextMenu) return null;

    return (
        <ContextMenuContent
            contextMenu={contextMenu}
            onClose={closeContextMenu}
        />
    );
}


// --------------------------
// ContextMenuContent
// --------------------------

function ContextMenuContent({
    contextMenu,
    onClose,
}: {
    contextMenu: NonNullable<ReturnType<typeof useUIStore.getState>["contextMenu"]>;
    onClose: () => void;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [openSubmenu, setOpenSubmenu] = useState<"category" | "relation" | null>(null);

    const { screenToFlowPosition } = useReactFlow();

    const selection         = useUIStore((s) => s.selection);
    const openModal         = useUIStore((s) => s.openModal);
    const openSparkInput    = useUIStore((s) => s.openSparkInput);
    const activeSpaceId     = useSpaceStore((s) => s.activeSpaceId);

    const sparks        = useSparkStore((s) => s.sparks);
    const createSpark   = useSparkStore((s) => s.createSpark);
    const archiveSpark  = useSparkStore((s) => s.archiveSpark);

    const flames        = useFlameStore((s) => s.flames);
    const createFlame   = useFlameStore((s) => s.convertSparkToFlame);
    const archiveFlame  = useFlameStore((s) => s.archiveFlame);

    const categories    = useCategoryStore(useShallow((s) =>
        s.getCategoriesBySpace(activeSpaceId)
    ));
    const assignSparkCategory = useSparkStore((s) => s.assignCategory);
    const assignFlameCategory = useFlameStore((s) => s.assignCategory);

    const createRelatedConnection = useConnectionStore((s) => s.createRelatedConnection);
    const createLineageConnection = useConnectionStore((s) => s.createLineageConnection);
    
    // For repulsion calculation on new child or duplication
    const requestRepulsion  = useUIStore((s) => s.requestRepulsion);

    // For when we create a new space
    const createSpace       = useSpaceStore((s) => s.createSpace);
    const setActiveSpace    = useSpaceStore((s) => s.setActiveSpace);

    // Whether this menu is anchored to a node (single or multi) or to an empty side of canvas.
    const isNodeContext = contextMenu.nodeType !== null;

    // Only treat this as a "multi" menu if the right-clicked node is
    // actually part of the current multi-selection.
    // Basically, if you right-click a node outside of the nodes you have selected,
    // the app should act on just that node, not what you have selected previously.
    const isMulti =
        isNodeContext &&
        selection.type === "multi" &&
        selection.nodes.length > 1 &&
        selection.nodes.some((n) => n.id === contextMenu.nodeId);
    
    const targetNodes: { id: string; type: "spark" | "flame" }[] = isMulti && selection.type === "multi"
        ? selection.nodes
        : isNodeContext
            ? [{ id: contextMenu.nodeId, type: contextMenu.nodeType as "spark" | "flame" }]
            : [];

    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node)) return; // let it work normally inside the menu

            e.stopPropagation(); // don't also let the click drag/select whatever's underneath it
            onClose();
        }
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", handleMouseDown, true);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown, true);
            document.removeEventListener("keydown", handleEscape);
        }
    }, [onClose]);
    
    // Note: If the right-clicked node isn't part of the current selection, Canvas.tsx
    //       already selects it (just that node) before opening this menu, so by the time
    //       we get here, 'selection' and 'contextMenu' are guaranteed to agree.

    // --------------------------
    // Handlers: single/multi node actions
    // --------------------------

    const handleDuplicate = () => {
        const newIds = [];
        targetNodes.forEach((node) => {
            if (node.type === "spark") {
                const spark = sparks.find((s) => s.id === node.id);
                if (!spark) return;

                const newSpark = createSpark({
                    text: spark.text,
                    position: { x: spark.position.x + 20, y: spark.position.y + 20 },
                    spaceId: spark.spaceId,
                    categoryId: spark.categoryId,
                    parentId: spark.parentId,
                });

                newIds.push(newSpark.id);
            }
            if (node.type === "flame") {
                const flame = flames.find((f) => f.id === node.id);
                if (!flame) return;

                const tempSpark = createSpark({
                    text: flame.name,
                    position: { x: flame.position.x + 20, y: flame.position.y + 20 },
                    spaceId: flame.spaceId,
                    categoryId: flame.categoryId,
                    parentId: flame.parentId,
                });

                const newFlame = createFlame({
                    sparkId: tempSpark.id,
                    name: tempSpark.text,
                    position: tempSpark.position,
                    spaceId: tempSpark.spaceId,
                    schema: flame.schema,
                    tools: flame.tools,
                    categoryId: flame.categoryId,
                    parentId: flame.parentId,
                });

                newIds.push(newFlame.id);
            }
        });

        requestRepulsion(newIds);
        onClose();
    };

    const handleCreateChild = () => {
        if (!isNodeContext) return;

        const parent = contextMenu.nodeType === "spark"
            ? sparks.find((s) => s.id === contextMenu.nodeId)
            : flames.find((f) => f.id === contextMenu.nodeId);
        
        if (!parent) return;

        const child = createSpark({
            text: "New idea", // TODO?: Maybe open the input to set the name?
            position: { x: parent.position.x + 100, y: parent.position.y },
            spaceId: parent.spaceId,
            parentId: parent.id,
        });

        createLineageConnection({
            sourceId: parent.id,
            targetId: child.id,
            spaceId: parent.spaceId,
        });

        requestRepulsion([child.id]);

        onClose();
    };

    const handleConvert = () => {
        if (contextMenu.nodeType !== "spark") return; // Flame -> Spark isn't implemented yet.

        openModal("spark-to-flame", contextMenu.nodeId);
        onClose();
    };

    const handleAssignCategory = (categoryId: string) => {
        targetNodes.forEach((node) => {
            if (node.type === "spark") {
                assignSparkCategory(node.id, categoryId);
            } else {
                assignFlameCategory(node.id, categoryId);
            }
        });

        onClose();
    };

    const handleArchive = () => {
        targetNodes.forEach((node) => {
            if (node.type === "spark") archiveSpark(node.id);
            else archiveFlame(node.id);
        });

        onClose();
    };

    // --------------------------
    // Handlers: multi-only actions
    // --------------------------

    // Create a map of all nodes by ID for quick lookup
    const nodesById = useMemo(() => new Map(
        [...sparks, ...flames].map((node) => [node.id, node] as [string, typeof node])
    ), [sparks, flames]);

    // Connects every other selected node to the one that was right-clicked (star topology)
    const handleCreateRelationToNode = () => {
        if (selection.type !== "multi") return;

        selection.nodes
            .filter((n) => n.id !== contextMenu.nodeId)
            .forEach((n) => {
                // Prevent connections between parent and child nodes
                const contextNode = nodesById.get(contextMenu.nodeId);
                const thisNode = nodesById.get(n.id);

                if (contextNode?.parentId === n.id || thisNode?.parentId === contextMenu.nodeId) return;

                createRelatedConnection({
                    sourceId: n.id,
                    targetId: contextMenu.nodeId,
                    spaceId: activeSpaceId,
                });
            });
    
        onClose();
    };

    // Connects every selected node to every other selected node (full mesh)
    const handleCreateRelationBetweenAll = () => {
        if (selection.type !== "multi") return;

        const nodes = selection.nodes;        

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeA = nodes[i];
                const nodeB = nodes[j];

                // Prevent connections between parent and child nodes
                const getParentId = (nodeId: string) => {
                    const node = nodesById.get(nodeId);
                    return node?.parentId;
                };

                if (getParentId(nodeA.id) === nodeB.id || getParentId(nodeB.id) === nodeA.id) continue;

                createRelatedConnection({
                    sourceId: nodeA.id,
                    targetId: nodeB.id,
                    spaceId: activeSpaceId,
                });
            }
        }

        onClose();
    };

    // --------------------------
    // Handlers: empty part of canvas actions
    // --------------------------

    const handleCreateSparkHere = () => {
        const canvasPosition = screenToFlowPosition(contextMenu.position);
        const screenPosition = {
            x: contextMenu.position.x,
            y: contextMenu.position.y - HEADER_HEIGHT,
        };
            
        openSparkInput({ screen: screenPosition, canvas: canvasPosition });
        
        onClose();
    };

    const handleCreateCategory = () => {
        openModal("category-form", null);
        onClose();
    };

    const handleCreateSpace = () => {        
        // TODO: Logic for this when space management gets implemented.
        onClose();
    };

    // --------------------------
    // Positioning
    // --------------------------

    const menuWidth     = 220;
    const estimatedH    = !isNodeContext ? 132 : isMulti ? 200 : 240;

    const x = Math.min(contextMenu.position.x, window.innerWidth - menuWidth - 8);
    const y = Math.min(contextMenu.position.y, window.innerHeight - estimatedH - 8);

    // If there isn't room for a submenu to open to the right, flip it to the left.
    const flipSubmenuLeft = x > window.innerWidth - menuWidth * 2 - 16;

    return (
        <div
            ref={menuRef}
            style={{
                position: "fixed",
                left: x,
                top: y,
                width: menuWidth,
                background: "var(--color-surface)",
                border: "0.5px solid var(--color-border)",
                borderRadius: 10,
                padding: "4px 0",
                zIndex: 200,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}
        >
            {/* Nothing selected: Right click on empty part of canvas */}
            {!isNodeContext && (
                <>
                    <MenuItem
                        icon={<Sparkles size={14} />}
                        label="Create Spark"
                        onClick={handleCreateSparkHere}
                        onMouseEnter={() => setOpenSubmenu(null)}
                    />
                    <MenuItem
                        icon={<Tag size={14} />}
                        label="Create Category"
                        onClick={handleCreateCategory}
                        onMouseEnter={() => setOpenSubmenu(null)}
                    />
                    <MenuItem
                        icon={<Layers size={14} />}
                        label="Create New Space"
                        onClick={handleCreateSpace}
                        onMouseEnter={() => setOpenSubmenu(null)}
                        disabled
                    />
                </>
            )}

            {/* Single node selected */}
            {isNodeContext && !isMulti && (
                <>
                    <MenuItem
                        icon={<GitBranch size={14} />}
                        label="Create child Spark"
                        onClick={handleCreateChild}
                        onMouseEnter={() => setOpenSubmenu(null)}
                    />

                    <MenuSeparator />
                    
                    <MenuItem
                        icon={<Copy size={14} />}
                        label="Duplicate"
                        onClick={handleDuplicate}
                        onMouseEnter={() => setOpenSubmenu(null)}
                    />
                    <MenuItem
                        icon={<FlameIcon size={14} />}
                        label={contextMenu.nodeType === "spark" ? "Convert into Flame" : "Convert back to Spark"}
                        onClick={handleConvert}
                        onMouseEnter={() => setOpenSubmenu(null)}
                        disabled={contextMenu.nodeType === "flame"}
                    />
                    
                    <SubmenuItem
                        icon={<Tag size={14} />}
                        label="Assign category"
                        isOpen={openSubmenu === "category"}
                        onOpen={() => setOpenSubmenu("category")}
                        flipLeft={flipSubmenuLeft}
                    >
                        <CategorySubmenuContent
                            categories={categories}
                            onSelect={handleAssignCategory}
                            onCreateNew={handleCreateCategory}
                        />
                    </SubmenuItem>

                    <MenuSeparator />

                    <MenuItem
                        icon={<Archive size={14} />}
                        label="Archive"
                        onClick={handleArchive}
                        onMouseEnter={() => setOpenSubmenu(null)}
                        danger
                    />
                </>
            )}

            {/* Multiple nodes selected */}
            {isNodeContext && isMulti && (
                <>
                    <SubmenuItem
                        icon={<Link size={14} />}
                        label="Create relation"
                        isOpen={openSubmenu === "relation"}
                        onOpen={() => setOpenSubmenu("relation")}
                        flipLeft={flipSubmenuLeft}
                    >
                        <MenuItem
                            icon={<ArrowRight size={14} />}
                            label="To this node"
                            onClick={handleCreateRelationToNode}
                        />
                        <MenuItem
                            icon={<Share2 size={14} />}
                            label="Between all selected nodes"
                            onClick={handleCreateRelationBetweenAll}
                        />
                    </SubmenuItem>
                    
                    <MenuSeparator />

                    <MenuItem
                        icon={<Copy size={14} />}
                        label="Duplicate"
                        onClick={handleDuplicate}
                        onMouseEnter={() => setOpenSubmenu(null)}
                    />
                    <SubmenuItem
                        icon={<Tag size={14} />}
                        label="Assign category"
                        isOpen={openSubmenu === "category"}
                        onOpen={() => setOpenSubmenu("category")}
                        flipLeft={flipSubmenuLeft}
                    >
                        <CategorySubmenuContent
                            categories={categories}
                            onSelect={handleAssignCategory}
                            onCreateNew={handleCreateCategory}
                        />
                    </SubmenuItem>

                    <MenuSeparator />

                    <MenuItem
                        icon={<Archive size={14} />}
                        label="Archive"
                        onClick={handleArchive}
                        onMouseEnter={() => setOpenSubmenu(null)}
                        danger
                    />
                </>
            )}
        </div>
    );
}

// --------------------------
// MenuSeparator
// --------------------------

function MenuSeparator() {
    return (
        <div
            style={{
                height: "0.5px",
                margin: "4px 0",
                background: "var(--color-border)",
            }}
        />
    );
}

// --------------------------
// MenuItem
// --------------------------

function MenuItem({
    icon,
    label,
    rightIcon,
    onClick,
    onMouseEnter,
    danger,
    disabled,
}: {
    icon: React.ReactNode;
    label: string;
    rightIcon?: React.ReactNode;
    onClick: () => void;
    onMouseEnter?: () => void;
    danger?: boolean;
    disabled?: boolean;
}) {
    const [hovered, setHovered] = useState(false);

    return (
        <button
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => {
                setHovered(true);
                onMouseEnter?.();
            }}
            onMouseLeave={() => setHovered(false)}
            disabled={disabled}
            title={disabled ? "Coming soon..." : undefined}
            className="flex items-center gap-2 w-full cursor-pointer"
            style={{
                background: !disabled && hovered ? "var(--color-surface-raised)" : "transparent",
                border: "none",
                padding: "6px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                color: danger ? "var(--color-danger)" : "var(--color-text)",
            }}
        >
            <span style={{ color: danger ? "var(--color-danger)" : "var(--color-text-muted)", flexShrink: 0 }}>
                {icon}
            </span>
            <span style={{ flex: 1, textAlign: "left" }}>
                {label}
            </span>
            {rightIcon && (
                <span style={{ color: "var(--color-text-muted)", display: "flex", alignItems: "center" }}>
                    {rightIcon}
                </span>
            )}
        </button>
    );
}

// --------------------------
// SubmenuItem
//
// A MenuItem that, instead of running an action directly, opens
// a nested panel of its own MenuItems to the side.
// --------------------------

function SubmenuItem({ 
    icon,
    label,
    isOpen,
    onOpen,
    flipLeft,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    isOpen: boolean;
    onOpen: () => void;
    flipLeft: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="relative" onMouseEnter={onOpen}>
            <MenuItem
                icon={icon}
                label={label}
                rightIcon={<ChevronRight size={14} />}
                onClick={onOpen}
            />
            {isOpen && (
                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute"
                    style={{
                        top: -4,
                        width: 200,
                        maxHeight: 240,
                        overflowY: "auto",
                        background: "var(--color-surface)",
                        border: "0.5px solid var(--color-border)",
                        borderRadius: 10,
                        padding: "4px 0",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                        ...(flipLeft
                            ? { right: "100%", marginRight: 4 }
                            : { left: "100%", marginLeft: 4}),
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

// --------------------------
// CategorySubmenuContent
//
// Shared by the single- and multi-selection "Assign category" submenus.
// --------------------------

function CategorySubmenuContent({
    categories,
    onSelect,
    onCreateNew,
}: {
    categories: Category[],
    onSelect: (categoryId: string) => void;
    onCreateNew: () => void;
}) {
    return (
        <>
            {categories.map((category) => (
                <MenuItem
                    key={category.id}
                    icon={<Tag size={14} />}
                    label={category.name}
                    rightIcon={
                        /* Circle with the color of the category, not a Lucide icon */
                        <span
                            style={{
                                display: "inline-block",
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: category.color,
                                flexShrink: 0,
                            }}
                        />
                    }
                    onClick={() => onSelect(category.id)}
                />
            ))}
            {categories.length > 0 && <MenuSeparator />}
            <MenuItem
                icon={<Plus size={14} />}
                label="Create new Category"
                onClick={onCreateNew}
            />
        </>
    );
}