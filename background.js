// Mapa para almacenar los números de autorización asociados a los archivos descargados
const authorizationNumbers = {};

// Escuchar eventos de descargas
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    console.log("Background Script: Evento de descarga detectado:", downloadItem);

    // Buscar el número de autorización asociado al archivo descargado
    const tempId = Object.keys(authorizationNumbers).find((key) =>
        downloadItem.filename.includes(key)
    );

    if (tempId) {
        const authorizationNumber = authorizationNumbers[tempId];
        console.log("Background Script: Renombrando archivo con número de autorización:", authorizationNumber);

        // Sugerir un nuevo nombre para el archivo descargado (solo el número de autorización con extensión .xml)
        const newFilename = `${authorizationNumber}.xml`;
        suggest({ filename: newFilename });

        // Eliminar el ID temporal del mapa
        delete authorizationNumbers[tempId];
    } else {
        console.log("Background Script: No se encontró un número de autorización para este archivo.");
    }
});

// Escuchar mensajes desde el content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "guardarNumeroAutorizacion") {
        const { tempId, authorizationNumber } = message;
        console.log("Background Script: Guardando número de autorización:", authorizationNumber, "con ID temporal:", tempId);

        // Guardar el número de autorización en el mapa
        authorizationNumbers[tempId] = authorizationNumber;
        sendResponse({ success: true });
    }
});