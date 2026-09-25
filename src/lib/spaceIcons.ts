//
// Preset icon options for a Space, same spirit as toolConfig.tsx's icon resolution for Tools,
//  but returning the component itself since this needs to render at different sizes/colors
//  depending on where it's used.
//
// Icons available are of course not final, the amount might vary depending on how feedback comes back when available.
//

import {
    Layers, BriefcaseBusiness as Briefcase, BookOpen, Lightbulb,
    Zap, GraduationCap, PawPrint, Bug, Bot, Gem, Puzzle, Gamepad2 as Gamepad,
    Database, Camera, Disc3 as Disc, Music, Star, Heart, ChefHat, Candy, Compass,
    Feather, LandPlot, Ghost, Sparkles, Flower, Flame, Globe, Blocks,
    type LucideIcon
} from "lucide-react";

export const SPACE_ICONS: string[] = [
    "Layers", "Briefcase", "BookOpen", "Lightbulb", "Zap", "GraduationCap",
    "PawPrint", "Bug", "Bot", "Gem", "Puzzle", "Gamepad", "Database", "Camera", "Disc",
    "Music", "Star", "Heart", "ChefHat", "Candy", "Compass", "Feather", "LandPlot",
    "Ghost", "Sparkles", "Flower", "Flame", "Globe", "Blocks",
];

const iconComponents: Record<string, LucideIcon> = {
    Layers, Briefcase, BookOpen, Lightbulb, Zap, GraduationCap, PawPrint, Bug,
    Bot, Gem, Puzzle, Gamepad, Database, Camera, Disc, Music, Star, Heart, ChefHat, Candy,
    Compass, Feather, LandPlot, Ghost, Sparkles, Flower, Flame, Globe, Blocks,
}

export function getSpaceIcon(name: string | undefined): LucideIcon {
    return (name && iconComponents[name]) || Layers; // Layers is Fallback.
}
