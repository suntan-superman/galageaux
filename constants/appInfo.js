/**
 * Application Information Constants
 * 
 * Central location for app-wide information like version, copyright year, etc.
 * Update these values in one place to reflect changes across the entire app.
 */

export const APP_INFO = {
  name: 'Galageaux',
  version: '1.0.0',
  copyrightYear: 2026,
  companyName: 'Galageaux',
  
  // For sample/demo screens
  sampleCompanyName: 'Workside Software LLC',
};

// Helper function to generate copyright text
export const getCopyrightText = (format = 'default') => {
  switch (format) {
    case 'symbol-first':
      return `© ${APP_INFO.copyrightYear} ${APP_INFO.name}`;
    case 'name-first':
      return `${APP_INFO.name} © ${APP_INFO.copyrightYear}`;
    case 'sample':
      return `${APP_INFO.sampleCompanyName} Copyright ${APP_INFO.copyrightYear}`;
    default:
      return `© ${APP_INFO.copyrightYear} ${APP_INFO.name}`;
  }
};

// For web pages - HTML entity version
export const getHtmlCopyrightText = () => {
  return `&copy; ${APP_INFO.copyrightYear} ${APP_INFO.name}. All rights reserved.`;
};

// For "Last Updated" text on legal pages
export const getLastUpdatedText = (month = 'January') => {
  return `${month} ${APP_INFO.copyrightYear}`;
};

export default APP_INFO;
