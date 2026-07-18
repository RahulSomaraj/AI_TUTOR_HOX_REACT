export function downloadFile(source, fileName = "download") {
    const url = typeof source === "string" ? source : URL.createObjectURL(source);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (typeof source !== "string") URL.revokeObjectURL(url);
};