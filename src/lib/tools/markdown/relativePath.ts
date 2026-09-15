//
// Math for relative path search since @tauri-apps/api/path doesn't have an equivalent to Node's path.relative()
//

const PATH_SEP = /[\\/]/;

export function toRelativePath(fromDir: string, toPath: string): string {
    const fromParts = fromDir.split(PATH_SEP).filter(Boolean);
    const toParts   = toPath.split(PATH_SEP).filter(Boolean);
    
    let commonLength = 0;
    while (
        commonLength < fromParts.length &&
        commonLength < toParts.length &&
        fromParts[commonLength] === toParts[commonLength]
    ) {
        commonLength++;
    }

    const upCount   = fromParts.length - commonLength;
    const downParts = toParts.slice(commonLength);

    const relativeParts = [...Array(upCount).fill(".."), ...downParts];

    return relativeParts.length > 0 ? relativeParts.join("/") : ".";
}