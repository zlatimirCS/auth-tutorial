// Translation messages for different languages
const translations = {
  en: {
    logout: {
      success: "Logged out successfully",
      error: "Internal server error",
    },
    login: {
      fill_all_fields: "Please fill all the fields",
      verify_email_first: "Please verify your email first",
    },
  },
  sr: {
    // Serbian translations
    logout: {
      success: "Успешно сте се одјавили",
      error: "Интерна грешка сервера",
    },
    login: {
      fill_all_fields: "Молимо попуните сва поља",
      verify_email_first: "Молимо прво верификујте ваш емаил",
    },
  },
};

/**
 * Get translated message based on language code
 * @param {string} acceptLanguage - Accept-Language header value
 * @returns {string} Language code (defaults to 'en')
 */
export const getLanguage = (acceptLanguage) => {
  if (!acceptLanguage) return "en";

  // Parse Accept-Language header (e.g., "sr-RS,sr;q=0.9,en;q=0.8")
  const languages = acceptLanguage.split(",").map((lang) => {
    const parts = lang.split(";");
    const code = parts[0].trim().toLowerCase().split("-")[0]; // Get primary language code
    return code;
  });

  // Find first supported language
  for (const lang of languages) {
    if (translations[lang]) {
      return lang;
    }
  }

  return "en"; // Default fallback
};

/**
 * Get translation for a specific key
 * @param {string} lang - Language code
 * @param {string} section - Section of translations (e.g., 'logout')
 * @param {string} key - Translation key (e.g., 'success')
 * @returns {string} Translated message
 */
export const translate = (lang, section, key) => {
  return translations[lang]?.[section]?.[key] || translations.en[section][key];
};

export default translations;
