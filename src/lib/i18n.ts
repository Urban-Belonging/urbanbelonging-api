type LocalizedLanguage = 'en' | 'nl' | 'dk';

type TranslationKey =
  | 'userRegistrationTitle'
  | 'userRegistrationBody'
  | 'forgottenPasswordTitle'
  | 'forgottenPasswordBody';
type LocalizedContent = {
  [K in TranslationKey]: ((...args: string[]) => string) | string;
};

const translations: Record<LocalizedLanguage, LocalizedContent> = {
  en: {
    forgottenPasswordTitle: 'Reset your Urban Belonging Password',
    forgottenPasswordBody: (activationCode: string, expiresAt: string) =>
      `Your password reset code is ${activationCode} and expires ${expiresAt}`,
    userRegistrationTitle: 'Your Urban Belonging Activation Code',
    userRegistrationBody: (activationCode: string, expiresAt: string) =>
      `Your Urban Belonging activation code is ${activationCode} and expires ${expiresAt}`
  },

  // @TODO
  nl: {
    forgottenPasswordTitle: 'Reset your Urban Belonging Password',
    forgottenPasswordBody: (activationCode: string, expiresAt: string) =>
      `Your password reset code is ${activationCode} and expires ${expiresAt}`,
    userRegistrationTitle: 'Your Urban Belonging Activation Code',
    userRegistrationBody: (activationCode: string, expiresAt: string) =>
      `Your Urban Belonging activation code is ${activationCode} and expires ${expiresAt}`
  },

  // @TODO
  dk: {
    forgottenPasswordTitle: 'Reset your Urban Belonging Password',
    forgottenPasswordBody: (activationCode: string, expiresAt: string) =>
      `Your password reset code is ${activationCode} and expires ${expiresAt}`,
    userRegistrationTitle: 'Your Urban Belonging Activation Code',
    userRegistrationBody: (activationCode: string, expiresAt: string) =>
      `Your Urban Belonging activation code is ${activationCode} and expires ${expiresAt}`
  }
};

const i18n = {
  translate(language: LocalizedLanguage, key: TranslationKey, ...args: string[]) {
    const translation = translations[language][key];
    if (typeof translation === 'string') return translation;
    return translation(...args);
  }
};

export default i18n;
