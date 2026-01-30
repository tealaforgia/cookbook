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
docker run --rm -v "${PROJECT_SRC}:/docs" "${DOCKER_IMAGE}" build --clean

# 3. Deploy
echo "Copia dei file in ${DEPLOY_DEST}..."

# Creiamo la cartella di destinazione se non esiste
mkdir -p "${DEPLOY_DEST}"

# Pulizia cartella di output
rm -rf "${DEPLOY_DEST}"/*

# Copia ricorsiva
cp -r "${BUILD_OUTPUT}"/. "${DEPLOY_DEST}"/

echo "Patch lingua dinamica completata."

# 4. Update Service Worker Cache ID
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
