console.log("Service worker activo.");

// Mapa para almacenar los números de autorización asociados a los archivos descargados
let authorizationNumberMap = {};

// Escuchar mensajes desde el content script o popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "actualizarMapaAutorizaciones") {
        console.log("Service Worker: Actualizando mapa de autorizaciones.", request.data);
        authorizationNumberMap = request.data; // Actualizar el mapa con los datos recibidos
        sendResponse({ success: true });
    }
});

// Interceptar descargas y renombrar archivos
chrome.downloads.onDeterminingFilename.addListener(function (item, suggest) {
    console.log("Service Worker: Interceptando descarga para URL:", item.url);

    try {
        // Buscar el ID del enlace en la URL
        const linkIdMatch = item.url.match(/source:'([^']+)'/);
        if (linkIdMatch && authorizationNumberMap[linkIdMatch[1]]) {
            const authorizationNumber = authorizationNumberMap[linkIdMatch[1]];
            const filenameParts = item.filename.split('.');
            const extension = filenameParts.pop(); // Obtener la extensión del archivo
            const newFilename = `${authorizationNumber}.${extension}`;
            console.log(`Service Worker: Cambiando el nombre del archivo a: ${newFilename}`);
            suggest({ filename: newFilename }); // Sugerir el nuevo nombre del archivo
        } else {
            console.log("Service Worker: No se encontró el número de autorización, manteniendo el nombre original.");
            suggest({ filename: item.filename }); // Mantener el nombre original si no se encuentra el número de autorización
        }
    } catch (error) {
        console.error("Service Worker: Error al procesar la descarga:", error);
        suggest({ filename: item.filename }); // Mantener el nombre original en caso de error
    }
});

// Manejar errores de registro del service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log("Service Worker: Registrado correctamente.");
});