const CACHE_NAME = 'SERVICE_WORKER_CACHE_NAME';
const BASE_URL = self.location.origin;
const DYNAMIC_CACHE_EXTENSIONS = /\.(jpg|png|svg|avif|webp|gif|pdf|mp3|ogg|wav|jxl|css|js|woff2)$/i;

const BASE_ASSETS = [
    '/',
    '/assets/stylesheets/fonts.css',
    '/manifest.json',
    '/sitemap.xml',
    '/search.json'
];

const isSameOrigin = (url) => {
    try {
        const urlObj = new URL(url, BASE_URL);
        return urlObj.origin === BASE_URL;
    } catch (e) {
        return false;
    }
};

const safeCache = async (cache, req) => {
    const targetUrl = req instanceof Request ? req.url : req;
    if (!isSameOrigin(targetUrl)) {
        return;
    }
    try {
        const response = await fetch(req);
        if (!response.ok) throw new Error(`Status ${response.status}`);
        await cache.put(req, response);
    } catch (error) {
        console.warn(`[SW] Failed to cache: ${req} - ${error.message}`);
        return error; 
    }
};

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(BASE_ASSETS.map(url => safeCache(cache, url)));
        try {
            const sitemapReq = new Request(`${BASE_URL}/sitemap.xml`);
            const sitemapRes = await fetch(sitemapReq);
            const sitemapText = await sitemapRes.text();
            const pageUrls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)]
                .map(m => m[1])
                .filter(url => isSameOrigin(url));
            await Promise.allSettled(pageUrls.map(url => safeCache(cache, url)));
        } catch (e) {
            console.error('[SW] Error processing sitemap:', e);
        }
        try {
            const fontCssUrl = `${BASE_URL}/assets/stylesheets/fonts.css`;
            const cssRes = await fetch(fontCssUrl);
            if (cssRes.ok) {
                const cssText = await cssRes.text();
                const urlRegex = /url\s*\((?:['"]?)(.*?)(?:['"]?)\)/g;
                const fontUrls = [];
                let match;
                while ((match = urlRegex.exec(cssText)) !== null) {
                    let relativePath = match[1];
                    if (relativePath.startsWith('data:')) continue;
                    const absoluteFontUrl = new URL(relativePath, fontCssUrl).href;
                    if (isSameOrigin(absoluteFontUrl)) {
                        fontUrls.push(absoluteFontUrl);
                    }
                }
                await Promise.allSettled(fontUrls.map(url => safeCache(cache, url)));
            }
        } catch (e) {
            console.error('[SW] Error processing fonts.css:', e);
        }
        console.log('[SW] Installation complete.');
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_ALREADY_LOADED') {
        const resources = event.data.payload;
        event.waitUntil((async () => {
            const cache = await caches.open(CACHE_NAME);
            const promises = resources.map(url => {
                const urlObj = new URL(url, BASE_URL);
                if (!DYNAMIC_CACHE_EXTENSIONS.test(urlObj.pathname)) {
                    return Promise.resolve();
                }
                return safeCache(cache, url);
            });
            await Promise.allSettled(promises);
        })());
    }
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);

    if (url.origin !== BASE_URL) {
        return; 
    }

    event.respondWith((async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }

        let fixedUrl = null;

        if (url.pathname.includes('/assets/')) {
            const assetPath = '/assets/' + url.pathname.split('/assets/').pop();
            fixedUrl = new URL(assetPath, BASE_URL);
        }

        const rootFiles = ['/sitemap.xml', '/favicon.png', '/favicon.ico', '/manifest.json', '/search.json'];
        const fileName = rootFiles.find(f => url.pathname.endsWith(f));

        if (fileName && url.pathname !== fileName) {
             fixedUrl = new URL(fileName, BASE_URL);
        }

        if (fixedUrl) {
            const cachedFixedAsset = await caches.match(fixedUrl);
            if (cachedFixedAsset) {
                return cachedFixedAsset;
            }
        }

        try {
            const networkResponse = await fetch(event.request);
            if (
                url.origin === BASE_URL && 
                DYNAMIC_CACHE_EXTENSIONS.test(url.pathname) && 
                networkResponse.status === 200
            ) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            if (event.request.mode === 'navigate') {
                const offlinePage = await caches.match('/');
                if (offlinePage) return offlinePage;
            }

            if (event.request.destination === 'image' || url.pathname.match(/\.(jpg|png|svg|avif|webp|gif|mp4|webm|pdf|mp3|ogg|wav|jxl)$/i)) {

                const offlinePhrases = [
                    "Snake? Snake?! SNAKEEEE!",
                    "Fibrillazione ventricolare del router. Defibrillare.",
                    "Pacchetti persi nel nulla, come le dipendenze AUR",
                    "Layer 8 Error: Il problema è tra la sedia e la tastiera?",
                    "Kernel Panic: Il modem ha sventolato bandiera bianca",
                    "Connessione bloccata dalla Cronopioggia",
                    "I Clicker hanno mangiato i cavi della fibra ottica",
                    "Riavvolgi il tempo, il router ha fatto una scelta sbagliata",
                    "La tua connessione è in un altro castello",
                    "3.6 Mbps. Not great, not terrible. (In realtà è 0)",
                    "L'immagine è bloccata nel 1986. Sic mundus creatus est.",
                    "Say my name. Say Offline. You're goddamn right.",
                    "Il segnale è finito nel Sottosopra",
                    "Manca il legame covalente tra te e il server",
                    "Hanno suonato al server, ma lui ha fatto finta di non essere in casa",
                    "Questa immagine si è disassociata dalla rete",
                    "Houston, abbiamo un problema",
                    "Hello friend. Sei disconnesso.",
                    "Il controllo è un'illusione. La rete pure.",
                    "Bonsoir, Elliot. Niente dati qui.",
                    "La Evil Corp ha pignorato i pacchetti",
                    "Errore 404: fsociety was here",
                    "Sei un 1 o uno 0? Per ora sei zero segnale.",
                    "Hella offline! Che sfiga.",
                    "Questa immagine è nella Dark Room",
                    "Resisti e sopravvivi (senza Wi-Fi)",
                    "I Clicker sentono che stai ricaricando la pagina...",
                    "Giura che sistemerai il modem. Giuralo.",
                    "Snake? Rispondi! SNAKEEEE!",
                    "Un glitch nel Matrix",
                    "Sic Mundus Creatus Est: Errore di rete",
                    "Il segnale è bloccato nel 1986",
                    "Better Call Internet Provider",
                    "Somministrare 3mg di adenosina al router",
                    "Lento come la burocrazia per il cambio nome",
                    "Connessione instabile come l'umore sotto HRT",
                    "Bussano alla porta: non è la rete, non aprire",
                    "Useless lesbian drama: il modem non ha capito che piace al server",
                    "Effetti collaterale: nausea, vomito e zero segnale",
                    "Questa connessione è tossica come Nate Jacobs",
                    "Stabilità della rete: livello Rue Bennett",
                    "I dati hanno preso il treno come Jules",
                    "Fezco dice che non c'è segnale, bro",
                    "Sei offline. Bitch, you better be joking.",
                    "Siamo finiti nel Limbo. Niente segnale laggiù.",
                    "Il totem gira all'infinito: sei offline",
                    "Serve un 'calcio' al router per svegliarlo",
                    "Siamo in un sogno dentro un sogno... senza Wi-Fi",
                    "Immagine 'Apostata': il firewall la evita",
                    "L'immagine arriverà... come la Fine. Presto™.",
                    "Immagine disponibile solo per i 144.000",
                    "È colpa della 'Gente del Mondo'",
                    "Nuova Luce: file eliminato, come la pericope dell'adultera nella TNM",
                    "Generazione che non passerà (ma il file sì)",
                    "Rifiuto cosciente: niente trasfusioni di dati",
                    "Chi tra voi è senza rete, scagli la prima pietra",
                    "Le luci di Natale dicono: O - F - F- L - I - N - E",
                    "File risucchiato nel Sottosopra",
                    "La mattina è fatta per il caffè e la contemplazione",
                    "Il Mind Flayer si è impossessato del router",
                    "Amici non mentono. Ma il Wi-Fi sì.",
                    "Rating utente: 0 stelle. Blocco attivo.",
                    "Monkey needs a hug :( (Server needs a ping)",
                    "La tua vita è in buffering su Streamberry",
                    "White Bear: sei condannata a ricaricare",
                    "San Junipero è offline oggi",
                    "I am the one who knocks (ma il router non apre)",
                    "Purezza del segnale: 0.0% (Blue Meth not found)",
                    "Yeah, Science! No Internet!",
                    "Sotto il suo occhio (il server non ti vede)",
                    "Benedetto sia il frutto (ma il download è marcio)",
                    "Possa il Signore schiudere (le porte del firewall)",
                    "Torre attivata da XANA. Settore offline.",
                    "Ritorno al passato... per cercare il segnale",
                    "Materializzazione fallita",
                    "Aelita non risponde",
                    "Prima regola del Fight Club: Non parlare del 404",
                    "Why are you wearing that stupid Wi-Fi suit?",
                    "Il mondo finirà tra 28 giorni... il download mai",
                    "Le connessioni internet sono come le cipolle: ti fanno piangere",
                    "Siamo arrivati? Noooooo. (Ancora offline).",
                    "Fiona è umana di giorno, offline di notte",
                    "Wolfwalkers: il segnale dorme nella foresta",
                    "Six ha mangiato il cavo ethernet",
                    "Le Fauci hanno ingoiato i dati",
                    "Torre 1 non risponde a Torre 2",
                    "La foresta è silenziosa. Troppo silenziosa.",
                    "Cosa rimane di Edith Finch? Un 404.",
                    "La maledizione dei Finch ha colpito il modem",
                    "'Cia-ciao!' No aspetta: 'Cia-Crash'",
                    "Le bugie hanno le gambe corte, e il ping lungo",
                    "It's dangerous to go alone! Prendi questo 404",
                    "Surprise, Motherf*cker! (Sei Offline)",
                    "Il mio Passeggero Oscuro ha tagliato i cavi",
                    "Tonight's the night... che il modem muore",
                    "Sono velocità. Pura velocità. (No, scherzo, sono offline)",
                    "Zero Assoluto (-273.15°C): Il server è congelato"
                ];

                const randomTitle = offlinePhrases[Math.floor(Math.random() * offlinePhrases.length)];

                let filename = url.pathname.split('/').pop() || 'Immagine';
                if (filename.length > 64) filename = filename.substring(0, 61) + '...';
                
                const svgMarkup = `
                <svg width="100%" height="100%" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
                    <style>
                        /* Light Mode */
                        .bg { fill: #f0f0f0; stroke: #d0d0d0; }
                        .icon { fill: #757575; }
                        .text-title { fill: #555; font-weight: bold; }
                        .text-file { fill: #999; }

                        /* Dark Mode */
                        @media (prefers-color-scheme: dark) {
                            .bg { fill: #1e1e1e; stroke: #333; }
                            .icon { fill: #aaa; }
                            .text-title { fill: #ddd; }
                            .text-file { fill: #666; }
                        }
                    </style>

                    <rect x="1" y="1" width="398" height="118" rx="4" stroke-width="1" class="bg"/>
                    
                    <g transform="translate(168, 5) scale(0.5)"> 
                        <path d="M0,142L8,142L8,144L0,144L0,142ZM28,142L32,142L32,144L28,144L28,142ZM96,142L104,142L104,144L96,144L96,142ZM80,100L76,100L76,114L72,114L72,120L68,120L68,124L64,124L64,140L68,140L68,144L60,144L60,132L56,132L56,128L52,128L52,132L48,132L48,136L44,136L44,140L48,140L48,144L40,144L40,128L36,128L36,124L32,124L32,120L28,120L28,116L24,116L24,112L20,112L20,88L24,88L24,96L28,96L28,100L32,100L32,104L40,104L40,100L44,100L44,96L50,96L50,92L56,92L56,88L60,88L60,62L64,62L64,58L96,58L96,62L100,62L100,80L80,80L80,84L92,84L92,88L76,88L76,96L84,96L84,104L80,104L80,100ZM82,140L84,140L84,142L82,142L82,140ZM12,136L20,136L20,138L12,138L12,136ZM110,134L116,134L116,136L110,136L110,134ZM0,128L32,128L32,130L0,130L0,128ZM72,128L128,128L128,130L72,130L72,128ZM68,64L68,68L72,68L72,64L68,64Z" class="icon"/>
                    </g>
                    
                    <text x="200" y="90" font-family="sans-serif" font-size="11" text-anchor="middle" class="text-title">
                        ${randomTitle.trim()}
                    </text>

                    <text x="200" y="106" font-family="monospace" font-size="10" text-anchor="middle" class="text-file">
                        ${filename.trim()}
                    </text>
                </svg>`;

                const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml' });
                return new Response(svgBlob, { status: 200, statusText: 'Offline Placeholder' });
            }

            throw error;
        }
    })());
});