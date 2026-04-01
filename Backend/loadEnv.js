const fs = require("fs");
const path = require("path");

function stripQuotes(value) {
    if (!value) return value;
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }
    return value;
}

function loadEnvFile() {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;

    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;

        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) return;

        const key = trimmed.slice(0, eqIndex).trim();
        const value = stripQuotes(trimmed.slice(eqIndex + 1).trim());
        if (!key || process.env[key] != null) return;

        process.env[key] = value;
    });
}

loadEnvFile();

