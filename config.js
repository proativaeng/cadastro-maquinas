// Configuração do app. Preencha clientId e tenantId depois de registrar o app no Entra ID (ver README.md).
// Com clientId vazio o app roda em MODO DEMONSTRAÇÃO (dados só no navegador).
window.APP_CONFIG = {
  appName: "Cadastro de Máquinas",
  clientId: "1a476634-931d-4e1d-a646-3045aa5fe599",            // ID do aplicativo (cliente) no Entra ID
  tenantId: "596a1584-d550-46d2-81c8-604438f498be",            // ID do diretório (locatário) TRBrasil
  allowedDomain: "trbrasil.onmicrosoft.com",
  // Link de compartilhamento da pasta raiz no SharePoint (Fichas de Máquinas)
  folderShareUrl: "https://trbrasil.sharepoint.com/:f:/s/home/IgA0SNtCds-9TaLycOME_Sw3AacEAeT05P7n0mxeHr-P-ts?e=AqdeVE",
  lists: { clientes: "FM_Clientes", maquinas: "FM_Maquinas", coletas: "FM_Coletas" },
  photoMaxPx: 1600,
  photoQuality: 0.8,
  maxPhotos: 10
};
