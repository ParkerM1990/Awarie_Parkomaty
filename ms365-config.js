// Konfiguracja Microsoft 365 dla CPG Inkasacja.
// clientId i tenantId nie sa sekretami. NIE umieszczaj tutaj client secret.
// driveId powinien wskazywac WSPOLNA biblioteke dokumentow (SharePoint/Teams),
// do ktorej maja dostep planista i konwojent.
window.CPG_M365_CONFIG = {
  clientId: '',
  tenantId: '',
  driveId: '',
  balanceFolder: 'CPG/Inkasacja/Terminal Balance',
  plansFolder: 'CPG/Inkasacja/Plany',
  balanceNameContains: 'Terminal Balance',
  scopes: ['User.Read', 'Files.ReadWrite.All']
};
