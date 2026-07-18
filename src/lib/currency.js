const inr = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
});

export function formatINR(value) {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") {
        return "-";
    }

    const n = Number(value);
    return Number.isFinite(n) ? inr.format(n) : "-";
}

export function parseAmount(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    const n = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}