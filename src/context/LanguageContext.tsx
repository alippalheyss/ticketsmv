import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'dv';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isDhivehi: boolean;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'platform.title': 'CinemaMV.online',
    'platform.subtitle': 'Maldivian Island & Cinema Ticketing Platform',
    'nav.cinemas': 'Cinemas & Islands',
    'nav.movies': 'Now Showing',
    'nav.validator': 'Door Scanner',
    'nav.tenantAdmin': 'Tenant Portal',
    'nav.superAdmin': 'Super Admin',
    'nav.switchLang': 'ދިވެހި',
    'hero.badge': 'Official Maldivian Movie Ticketing Network',
    'hero.title': 'Experience the Magic of Island Cinema',
    'hero.desc': 'Book live seats for local blockbusters and premiere releases across Malé, Hulhumalé, and atoll community screens with instant QR delivery.',
    'search.placeholder': 'Search movies, cinema halls, or islands (e.g. Velidhoo, Malé, Kulhudhuffushi)...',
    'filter.allIslands': 'All Islands',
    'seats.screen': 'CINEMA SCREEN THIS WAY',
    'seats.available': 'Available',
    'seats.selected': 'Selected',
    'seats.held': 'Locked / Hold',
    'seats.sold': 'Sold',
    'seats.vip': 'VIP Seat',
    'seats.standard': 'Standard',
    'seats.couple': 'Couple Seat',
    'seats.accessible': 'Accessible',
    'timer.holdNotice': 'Seats are held for',
    'timer.minutes': 'min',
    'timer.seconds': 'sec',
    'timer.expired': 'Seat hold expired! Please select seats again.',
    'checkout.title': 'Guest Checkout',
    'checkout.subtitle': 'No account required. Fast digital pass delivery to your email and Maldivian phone.',
    'checkout.fullName': 'Full Name',
    'checkout.email': 'Email Address',
    'checkout.phone': 'Maldivian Mobile Number (+960)',
    'checkout.paymentMethod': 'BML / MIB Bank Transfer',
    'checkout.bmlGateway': 'Bank of Maldives (BML) Transfer',
    'checkout.bmlTransfer': 'Bank Transfer (BML / MIB)',
    'checkout.mfaisaa': 'BML / MIB Bank Transfer',
    'checkout.uploadSlip': 'Upload BML / MIB Transfer Slip Screenshot',
    'checkout.holdingWarning': 'Transfer slips hold seats pending cinema organizer verification within 15 mins.',
    'checkout.confirmPay': 'Confirm & Pay MVR',
    'ticket.confirmed': 'Booking Confirmed!',
    'ticket.ref': 'Booking Reference',
    'ticket.qrInstructions': 'Present this secure signed QR code at the cinema door for instant check-in.',
    'ticket.addToWallet': 'Book Another',
    'ticket.downloadPdf': 'Print / Save Ticket',
    'ticket.addToCalendar': 'Add to Calendar (.ics)',
    'ticket.emailSent': 'Confirmation email dispatched with QR pass and receipts.',
    'validator.title': 'Door Staff QR Ticket Validator',
    'validator.scanPrompt': 'Point your mobile camera at the guest QR pass to validate entrance',
    'validator.manualInput': 'Or Enter Booking Reference ID',
    'validator.checkinBtn': 'Validate & Check In',
    'admin.seatBuilder': 'Screen & Seat Matrix Visual Builder',
    'admin.multiHall': 'Multi-Hall & Screen Engine',
    'admin.freeNotice': 'Free Tier: 1 Active Cinema Sublink Enabled. Upgrade to Paid for Unlimited Island Halls.',
  },
  dv: {
    'platform.title': 'ޓިކެޓްސް.އެމްވީ',
    'platform.subtitle': 'ދިވެހިރާއްޖޭގެ ސިނަމާ އަދި ރަށު ޓިކެޓިންގ ޕްލެޓްފޯމް',
    'nav.cinemas': 'ސިނަމާތަކާއި ރަށްތައް',
    'nav.movies': 'މިހާރު އަޅުވާފައި',
    'nav.validator': 'ދޮރުމަތީ ކިއުއާރް ސްކޭނަރ',
    'nav.tenantAdmin': 'ސިނަމާ ޕޯޓަލް',
    'nav.superAdmin': 'ސުޕަރ އެޑްމިން',
    'nav.switchLang': 'English',
    'hero.badge': 'ދިވެހިރާއްޖޭގެ ރަސްމީ މޫވީ ޓިކެޓިންގ ނެޓްވޯކް',
    'hero.title': 'ރާއްޖޭގެ އެންމެ ފުރިހަމަ ސިނަމާ ތަޖުރިބާ',
    'hero.desc': 'މާލެ، ހުޅުމާލެ އަދި އަތޮޅުތަކުގެ ރަށްރަށުގައި އަޅުވާ ދިވެހި އަދި ބޭރުގެ ފިލްމުތަކަށް ސީޓް ހޮއްވަވާ ވަގުތުން ޑިޖިޓަލް ޓިކެޓް ހޯއްދަވާ.',
    'search.placeholder': 'ފިލްމު، ސިނަމާ ހޯލް، ނުވަތަ ރަށް ހޯއްދަވާ (މިސާލަކަށް: ވެލިދޫ، މާލެ، ކުޅުދުއްފުށި)...',
    'filter.allIslands': 'ހުރިހާ ރަށެއް',
    'seats.screen': 'ސްކްރީން މިދިމާލުގައި',
    'seats.available': 'ހުސްކޮށް',
    'seats.selected': 'ނަގާފައި',
    'seats.held': 'ހިފަހައްޓާފައި (10 މިނެޓް)',
    'seats.sold': 'ވިކިފައި',
    'seats.vip': 'ވީ.އައި.ޕީ ސީޓް',
    'seats.standard': 'އާދައިގެ ސީޓް',
    'seats.couple': 'ޖޯޑު ސީޓް',
    'seats.accessible': 'ޚާއްޞަ އެހީއަށް',
    'timer.holdNotice': 'ސީޓްތައް ހިފެހެއްޓިފައިވަނީ',
    'timer.minutes': 'މިނެޓް',
    'timer.seconds': 'ސިކުންތު',
    'timer.expired': 'ސީޓް ހިފެހެއްޓި ވަގުތު ހަމަވެއްޖެ! އަލުން ސީޓް ނަންގަވާ.',
    'checkout.title': 'ގެސްޓް ޗެކްއައުޓް',
    'checkout.subtitle': 'ރަޖިސްޓަރ ވާކަށް ނުޖެހޭނެ. ވަގުތުން އީމެއިލް އަދި ފޯނަށް ޓިކެޓް ލިބޭނެ.',
    'checkout.fullName': 'ފުރިހަމަ ނަން',
    'checkout.email': 'އީމެއިލް އެޑްރެސް',
    'checkout.phone': 'ދިވެހި ފޯނު ނަންބަރު (+960)',
    'checkout.paymentMethod': 'ފައިސާ ދައްކާނެ ގޮތް',
    'checkout.bmlGateway': 'ބޭންކް އޮފް މޯލްޑިވްސް (ބީ.އެމް.އެލް ޕޭމަންޓް)',
    'checkout.bmlTransfer': 'ބީ.އެމް.އެލް / އެމް.އައި.ބީ ޓްރާންސްފަރ ސްލިޕް',
    'checkout.mfaisaa': 'ދިރާގު ޕޭ / އުރީދޫ އެމް-ފައިސާ',
    'checkout.uploadSlip': 'ޓްރާންސްފަރ ސްލިޕްގެ ފޮޓޯ އަޕްލޯޑް ކުރައްވާ',
    'checkout.holdingWarning': 'ސްލިޕް އަޕްލޯޑް ކުރުމުން 15 މިނެޓަށް ސީޓް ހިފެހެއްޓޭނެއެވެ.',
    'checkout.confirmPay': 'ފައިސާ ދައްކަވާ - ލ.',
    'ticket.confirmed': 'ބުކިންގ ކަށަވަރުވެއްޖެ!',
    'ticket.ref': 'ބުކިންގ ނަންބަރު',
    'ticket.qrInstructions': 'ސިނަމާއަށް ވަންނައިރު މި ސެކިއުރިޓީ ކިއުއާރް ކޯޑު ދޮރުމަތީ ދައްކަވާ.',
    'ticket.addToWallet': 'އިތުރު ޓިކެޓެއް ނަންގަވާ',
    'ticket.downloadPdf': 'ޓިކެޓް ޑައުންލޯޑް / ޕްރިންޓް',
    'ticket.addToCalendar': 'ކަލަންޑަރަށް އިތުރުކުރައްވާ',
    'ticket.emailSent': 'ކިއުއާރް ކޯޑާއެކު ޓިކެޓް އީމެއިލް ކުރެވިއްޖެ.',
    'validator.title': 'ދޮރުމަތީ ޓިކެޓް ޗެކްކުރާ ސްކޭނަރ',
    'validator.scanPrompt': 'ޓިކެޓުގެ ކިއުއާރް ކޯޑު ކެމެރާއަށް ދައްކަވާ',
    'validator.manualInput': 'ނުވަތަ ބުކިންގ ނަންބަރު ޖައްސަވާ',
    'validator.checkinBtn': 'ޓިކެޓް ޗެކްކޮށް އެތެރެއަށް ވައްދާ',
    'admin.seatBuilder': 'ސީޓް މެޓްރިކްސް ޑިޒައިނަރ',
    'admin.multiHall': 'މަލްޓި-ހޯލް އަދި ސްކްރީންތައް',
    'admin.freeNotice': 'ހިލޭ ޕްލޭން: 1 އެކްޓިވް ސަބްލިންކް. އިތުރު ހޯލްތަކަށް ޕެއިޑް ޕްލޭނަށް އަޕްގްރޭޑް ކުރައްވާ.',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mv_tickets_lang');
      return (saved === 'dv' || saved === 'en') ? saved : 'en';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mv_tickets_lang', lang);
      if (lang === 'dv') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'dv');
      } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
      }
    }
  };

  useEffect(() => {
    if (language === 'dv') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'dv');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  const isDhivehi = language === 'dv';
  const currencySymbol = isDhivehi ? 'ލ.' : 'MVR';

  const formatCurrency = (amount: number): string => {
    return isDhivehi ? `${amount.toFixed(2)} ލ.` : `MVR ${amount.toFixed(2)}`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isDhivehi, currencySymbol, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
