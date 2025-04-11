document.getElementById("iniciarDescarga").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, { action: "iniciarDescargaDesdePopup" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error al enviar mensaje al content script:", chrome.runtime.lastError.message);
            } else if (response && response.success) {
                console.log("Proceso iniciado correctamente.");
            } else {
                console.error("Error al iniciar el proceso:", response ? response.error : "Respuesta no válida.");
            }
        });
    });
});