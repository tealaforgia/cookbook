#!/bin/bash
# Script di build e deploy per Zensical

# ==========================================
# CONFIGURAZIONE VARIABILI
# ==========================================

# Cartella sorgente del progetto Zensical
PROJECT_SRC="/srv/ssd/docker/zensical/cookbook.laforgia.xyz"

# Cartella di output generata da Zensical
BUILD_OUTPUT="${PROJECT_SRC}/site"

# Cartella di destinazione
DEPLOY_DEST="/srv/ssd/docker/nginx/html/cookbook.laforgia.xyz"

# Locale di default
DEFAULT_LOCALE="it_IT"

# Sitemap
SITEMAP="sitemap.xml"

# Service Worker
SERVICE_WORKER="service-worker.js"

# Immagine Docker
DOCKER_IMAGE="zensical/zensical"

# ==========================================
# ESECUZIONE
# ==========================================

# 1. Stop immediato in caso di errore
set -e

echo "Inizio build..."

# 2. Esecuzione Build via Docker
echo "Compilazione sito con Zensical..."
docker run --rm \
  -v "${PROJECT_SRC}:/docs" \
  "${DOCKER_IMAGE}" build --clean

# 3. Deploy
echo "Copia dei file in ${DEPLOY_DEST}..."

# Creiamo la cartella di destinazione se non esiste
mkdir -p "${DEPLOY_DEST}"

# Pulizia cartella di output
rm -rf "${DEPLOY_DEST}/*"

# Copia ricorsiva
cp -r "${BUILD_OUTPUT}/." "${DEPLOY_DEST}/"

# 4. Patch lingua dinamica (sostituisce la vecchia logica hardcoded)
echo "Avvio scansione per patch lingua in: ${DEPLOY_DEST}..."

# Trova tutti i file .html nella cartella di destinazione
find "${DEPLOY_DEST}" -type f -name "*.html" | while read -r file; do

    # 1. Estrai il valore di content da og:locale (se presente)
    # Usa sed per cercare la riga e catturare il contenuto tra virgolette
    og_locale=$(sed -n 's/.*<meta property="og:locale" content="\([^"]*\)".*/\1/p' "$file")

    # 2. Verifica se il locale esiste ed è diverso da it_IT
    if [[ -n "$og_locale" && "$og_locale" != "${DEFAULT_LOCALE}" ]]; then

        # 3. Estrai le prime due lettere
        lang_code="${og_locale:0:2}"

        echo "Trovato locale '$og_locale' in $(basename "$file"). Cambio lang in '$lang_code'..."

        # 4. Applica la patch solo se c'è match con la riga target
        sed -i "s/<html lang=\"it\" class=\"no-js\"/<html lang=\"${lang_code}\" class=\"no-js\"/g" "$file"
    fi
done

echo "Patch lingua dinamica completata."

# 5. Update Service Worker Cache ID
FULL_PATH_SW="${DEPLOY_DEST}/${SERVICE_WORKER}"

if [ -f "${FULL_PATH_SW}" ]; then
    TIMESTAMP=$(date +%s)
    echo "Aggiornamento cache ID su: ${SERVICE_WORKER} con timestamp ${TIMESTAMP}..."
    sed -i "s/SERVICE_WORKER_CACHE_NAME/${TIMESTAMP}/g" "${FULL_PATH_SW}"
    echo "Service Worker patchato."
else
    echo "ATTENZIONE: File ${SERVICE_WORKER} non trovato! Patch saltata."
fi

echo "Deploy completato con successo!"
