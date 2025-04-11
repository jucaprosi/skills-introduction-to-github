// Configurar el número de resultados por página
function configurarResultadosPorPagina(callback) {
    console.log("Configurando resultados por página...");

    const intentarConfigurar = (intentosRestantes) => {
        const selectElement = document.querySelector(".ui-paginator-rpp-options"); // Usar la clase del selector
        if (selectElement) {
            selectElement.value = "25"; // Cambiar a 25 resultados por página
            const event = new Event("change", { bubbles: true });
            selectElement.dispatchEvent(event);

            console.log("Resultados por página configurados. Verificando aplicación del cambio...");
            setTimeout(() => {
                // Verificar si el cambio se aplicó correctamente
                const filas = document.querySelectorAll(".ui-datatable-data tr");
                if (filas.length > 10) {
                    console.log("Cambio aplicado correctamente. Continuando...");
                    callback();
                } else {
                    console.warn("El cambio no se aplicó correctamente. Reintentando...");
                    intentarConfigurar(intentosRestantes - 1);
                }
            }, 2000); // Esperar un momento para que la configuración se aplique
        } else if (intentosRestantes > 0) {
            console.warn("No se encontró el selector de resultados por página. Reintentando...");
            setTimeout(() => intentarConfigurar(intentosRestantes - 1), 1000); // Reintentar después de 1 segundo
        } else {
            console.error("No se encontró el selector de resultados por página después de varios intentos. Continuando sin configurar.");
            callback(); // Continuar sin configurar
        }
    };

    intentarConfigurar(10); // Intentar configurar hasta 10 veces
}

// Iniciar la descarga de documentos XML con manejo de paginación
const paginasProcesadas = new Set(); // Registro de páginas procesadas

function iniciarDescargaXMLConPaginacion(callback) {
    console.log("Iniciando proceso de descarga XML con manejo de paginación...");

    const panelElement = document.getElementById("frmPrincipal:panelListaComprobantes");
    if (panelElement) {
        const rows = panelElement.querySelectorAll(".ui-datatable-data tr");
        if (rows.length > 0) {
            let documentosProcesados = 0;
            let contadorDescargas = 0; // Contador de descargas
            rows.forEach(row => {
                const downloadLink = row.querySelector('a[id$=":lnkXml"]');
                const authNumberCell = row.querySelector('td:nth-child(4)');
                if (downloadLink && authNumberCell) {
                    const authorizationNumber = authNumberCell.textContent.trim();
                    const downloadUrl = extraerEnlaceDesdeOnclick(downloadLink.getAttribute('onclick'));
                    if (downloadUrl) {
                        console.log(`Archivo encontrado: ${authorizationNumber}.xml. Iniciando descarga...`);
                        descargarArchivo(downloadUrl, `${authorizationNumber}.xml`);
                        contadorDescargas++;
                        enviarActualizacionProgreso(`Descargando archivo: ${authorizationNumber}.xml`, contadorDescargas);
                    }
                }
                documentosProcesados++;
                if (documentosProcesados === rows.length) {
                    console.log("Todos los documentos de la página actual han sido procesados.");
                    setTimeout(() => avanzarPagina(callback), 3000); // Agregar un retraso antes de avanzar a la siguiente página
                }
            });
        } else {
            console.log("No se encontraron filas para descargar.");
            callback();
        }
    } else {
        console.error("No se encontró el panel de la lista de comprobantes.");
        callback();
    }
}

// Avanzar a la siguiente página
function avanzarPagina(callback) {
    const nextPageButton = document.querySelector(".ui-paginator-next");
    const currentPage = document.querySelector(".ui-paginator-current").textContent.trim();

    if (paginasProcesadas.has(currentPage)) {
        console.log(`La página ${currentPage} ya fue procesada. Finalizando.`);
        callback();
        return;
    }

    paginasProcesadas.add(currentPage);

    if (nextPageButton && !nextPageButton.classList.contains("ui-state-disabled")) {
        console.log(`Avanzando a la siguiente página: ${currentPage}`);
        enviarActualizacionProgreso(`Avanzando a la página ${currentPage}...`);
        nextPageButton.click();

        // Usar MutationObserver para esperar a que la tabla se actualice completamente
        const panelElement = document.getElementById("frmPrincipal:panelListaComprobantes");
        if (panelElement) {
            const observer = new MutationObserver((mutations, observerInstance) => {
                const rows = panelElement.querySelectorAll(".ui-datatable-data tr");
                const downloadLinks = panelElement.querySelectorAll('a[id$=":lnkXml"]');
                const loadingIndicator = document.querySelector(".ui-datatable-loading"); // Indicador de carga

                // Verificar que la tabla esté completamente cargada
                if (
                    rows.length > 0 &&
                    (!loadingIndicator || loadingIndicator.style.display === "none") &&
                    rows.length === downloadLinks.length
                ) {
                    console.log("Nueva página cargada. Procesando documentos...");
                    observerInstance.disconnect(); // Detener el observador
                    setTimeout(() => iniciarDescargaXMLConPaginacion(callback), 3000); // Agregar un retraso adicional
                }
            });

            // Configurar el observador para detectar cambios en el panel
            observer.observe(panelElement, { childList: true, subtree: true });
        } else {
            console.error("No se encontró el panel de la lista de comprobantes.");
            callback();
        }
    } else {
        console.log("No hay más páginas disponibles. Finalizando el proceso.");
        enviarActualizacionProgreso("El proceso ha finalizado.");
        callback();
    }
}

// Extraer el enlace de descarga desde el atributo onclick
function extraerEnlaceDesdeOnclick(onclick) {
    const regex = /mojarra\.jsfcljs\(document\.getElementById\('frmPrincipal'\),\{'(.*?)':'(.*?)'\},''\);return false/;
    const match = regex.exec(onclick);
    return match ? `/comprobantes-electronicos-internet/pages/consultas/recibidos/comprobantesRecibidos.jsf?${match[1]}=${match[1]}` : null;
}

// Descargar un archivo
function descargarArchivo(url, nombreArchivo) {
    console.log(`Intentando descargar el archivo desde la URL: ${url}`);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`Descarga iniciada para el archivo: ${nombreArchivo}`);
}

// Enviar actualizaciones al popup
function enviarActualizacionProgreso(mensaje, contador = null) {
    try {
        chrome.runtime.sendMessage({ action: "actualizarProgreso", mensaje, contador }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn("El popup puede haberse cerrado antes de recibir la respuesta:", chrome.runtime.lastError.message);
            }
        });
    } catch (error) {
        console.error("Error al enviar mensaje al popup:", error.message);
    }
}

// Escuchar mensajes desde el popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "iniciarDescargaDesdePopup") {
        console.log("Mensaje recibido desde el popup para iniciar descargas.");
        try {
            configurarResultadosPorPagina(() => {
                iniciarDescargaXMLConPaginacion(() => {
                    console.log("Descargas completadas.");
                    enviarActualizacionProgreso("El proceso ha finalizado.");
                    if (sendResponse) {
                        sendResponse({ success: true });
                    }
                });
            });
        } catch (error) {
            console.error("Error al iniciar el proceso:", error);
            if (sendResponse) {
                sendResponse({ success: false, error: error.message });
            }
        }
        // Indicar que la respuesta será enviada de forma asíncrona
        return true;
    }
});