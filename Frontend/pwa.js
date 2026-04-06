if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then((registration) => {
                // Force a check for a newer SW on each load so cache-busted assets are picked quickly.
                registration.update().catch(() => { });
            })
            .catch((err) => {
                console.error("Service worker registration failed:", err);
            });

        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    });
}
