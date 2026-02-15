/**
 * Configuração dos Adaptadores de Dados
 * Define qual adaptadores estão activados e suas configurações
 */

export const getAdaptersConfig = () => {
  const config = {};

  // Zoho CRM
  if (process.env.ZOHO_CLIENT_ID) {
    config['zoho-crm'] = {
      name: 'Zoho CRM',
      enabled: true,
      clientId: process.env.ZOHO_CLIENT_ID,
      clientSecret: process.env.ZOHO_CLIENT_SECRET,
      refreshToken: process.env.ZOHO_REFRESH_TOKEN,
      region: process.env.ZOHO_REGION || 'com',
      cronSchedule: '0 */4 * * *', // A cada 4 horas
    };
  }

  // Google Sheets
  if (process.env.GOOGLE_SHEETS_API_KEY) {
    config['google-sheets'] = {
      name: 'Google Sheets',
      enabled: true,
      apiKey: process.env.GOOGLE_SHEETS_API_KEY,
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      sheetName: process.env.GOOGLE_SHEETS_NAME || 'Receitas',
      cronSchedule: '0 */6 * * *', // A cada 6 horas
    };
  }

  // Accounting (genérico)
  if (process.env.ACCOUNTING_API_URL) {
    config['accounting'] = {
      name: 'Accounting',
      enabled: true,
      apiUrl: process.env.ACCOUNTING_API_URL,
      apiKey: process.env.ACCOUNTING_API_KEY,
      authType: process.env.ACCOUNTING_AUTH_TYPE || 'bearer',
      cronSchedule: '0 */8 * * *', // A cada 8 horas
    };
  }

  return config;
};

/**
 * Validar configuração de adaptadores
 */
export const validateAdaptersConfig = (config) => {
  const errors = [];

  if (!config || Object.keys(config).length === 0) {
    errors.push('Nenhum adaptador configurado. Configure variáveis de ambiente.');
  }

  // Validar Zoho CRM
  if (config['zoho-crm']) {
    if (!config['zoho-crm'].clientId) errors.push('ZOHO_CLIENT_ID obrigatório');
    if (!config['zoho-crm'].clientSecret) errors.push('ZOHO_CLIENT_SECRET obrigatório');
    if (!config['zoho-crm'].refreshToken) errors.push('ZOHO_REFRESH_TOKEN obrigatório');
  }

  // Validar Google Sheets
  if (config['google-sheets']) {
    if (!config['google-sheets'].apiKey) errors.push('GOOGLE_SHEETS_API_KEY obrigatório');
    if (!config['google-sheets'].spreadsheetId) errors.push('GOOGLE_SHEETS_ID obrigatório');
  }

  // Validar Accounting
  if (config['accounting']) {
    if (!config['accounting'].apiUrl) errors.push('ACCOUNTING_API_URL obrigatório');
    if (!config['accounting'].apiKey) errors.push('ACCOUNTING_API_KEY obrigatório');
  }

  return errors;
};

export default getAdaptersConfig;
