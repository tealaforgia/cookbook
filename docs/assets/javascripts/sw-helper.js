if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then((registration) => {
        const syncLoadedResources = () => {
            if (!navigator.serviceWorker.controller) return;
            const resources = performance.getEntriesByType('resource')
                .map(r => r.name);
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_ALREADY_LOADED',
                payload: resources
            });
        };
        if (navigator.serviceWorker.controller) {
            syncLoadedResources();
        } 
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            syncLoadedResources();
        });
    }).catch((error) => {
        console.error('Service Worker registration failed:', error);
    });
}