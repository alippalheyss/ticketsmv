// Comprehensive dataset of Maldivian Atolls and Inhabited Islands
// Used for cascading selection dropdowns across signup, settings, and filters

export interface AtollInfo {
  code: string;
  name: string;
  officialName: string;
  islands: string[];
}

export const MALDIVES_ATOLLS: AtollInfo[] = [
  {
    code: 'HA',
    name: 'Haa Alif (HA)',
    officialName: 'Thiladhunmathi Uthuruburi',
    islands: [
      'Dhidhdhoo', 'Hoarafushi', 'Ihavandhoo', 'Kelaa', 'Baarah',
      'Filladhoo', 'Utheemu', 'Vashafaru', 'Thakandhoo', 'Uligamu',
      'Molhadhoo', 'Berinmadhoo', 'Hathifushi'
    ]
  },
  {
    code: 'HDh',
    name: 'Haa Dhaalu (HDh)',
    officialName: 'Thiladhunmathi Dhekunuburi',
    islands: [
      'Kulhudhuffushi City', 'Hanimaadhoo', 'Nolhivaram', 'Nolhivaranfaru',
      'Kurinbi', 'Kunayandhoo', 'Vaikaradhoo', 'Nellaidhoo', 'Makunudhoo',
      'Kumundhoo', 'Finey', 'Hirimaradhoo'
    ]
  },
  {
    code: 'Sh',
    name: 'Shaviyani (Sh)',
    officialName: 'Miladhunmadulu Uthuruburi',
    islands: [
      'Funadhoo', 'Milandhoo', 'Foakaidhoo', 'Komandoo', 'Feevah',
      'Bileffahi', 'Kanditheemu', 'Noomaraa', 'Goidhoo', 'Lhaimagu',
      'Maroshi', 'Narudhoo', 'Feydhoo'
    ]
  },
  {
    code: 'N',
    name: 'Noonu (N)',
    officialName: 'Miladhunmadulu Dhekunuburi',
    islands: [
      'Manadhoo', 'Velidhoo', 'Holhudhoo', 'Kendhikulhudhoo', 'Henbadhoo',
      'Lhohi', 'Miladhoo', 'Magoodhoo', 'Foddhoo', 'Kudafari',
      'Landhoo', 'Maalhendhoo', 'Heenamafaru'
    ]
  },
  {
    code: 'R',
    name: 'Raa (R)',
    officialName: 'Maalhosmadulu Uthuruburi',
    islands: [
      'Ungoofaaru', 'Dhuvaafaru', 'Alifushi', 'Meedhoo', 'Maduvvari',
      'Hulhudhuffaaru', 'Innamadhoo', 'Kinolhas', 'Fainu', 'Rasgetheemu',
      'Angolhitheemu', 'Vaadhoo', 'Rasmaadhoo', 'Maakurathu'
    ]
  },
  {
    code: 'B',
    name: 'Baa (B)',
    officialName: 'Maalhosmadulu Dhekunuburi',
    islands: [
      'Eydhafushi', 'Thulhaadhoo', 'Dharavandhoo', 'Kendhoo', 'Kamadhoo',
      'Kudarikilu', 'Kihaadhoo', 'Dhonfanu', 'Goidhoo', 'Fehendhoo',
      'Fulhadhoo', 'Hithaadhoo', 'Maalhos'
    ]
  },
  {
    code: 'Lh',
    name: 'Lhaviyani (Lh)',
    officialName: 'Faadhippolhu',
    islands: [
      'Naifaru', 'Hinnavaru', 'Kurendhoo', 'Olhuvelifushi'
    ]
  },
  {
    code: 'K',
    name: 'Kaafu (K)',
    officialName: 'Malé Atoll',
    islands: [
      'Malé City', 'Hulhumalé', 'Villimalé', 'Maafushi', 'Guraidhoo',
      'Gulhi', 'Thulusdhoo', 'Huraa', 'Himmafushi', 'Kaashidhoo',
      'Gaafaru', 'Dhiffushi'
    ]
  },
  {
    code: 'AA',
    name: 'Alif Alif (AA)',
    officialName: 'Ari Atoll Uthuruburi',
    islands: [
      'Rasdhoo', 'Thoddoo', 'Ukulhas', 'Mathiveri', 'Bodufolhudhoo',
      'Feridhoo', 'Himandhoo', 'Maalhos'
    ]
  },
  {
    code: 'ADh',
    name: 'Alif Dhaal (ADh)',
    officialName: 'Ari Atoll Dhekunuburi',
    islands: [
      'Mahibadhoo', 'Maamigili', 'Dhigurah', 'Dhangethi', 'Fenfushi',
      'Mandhoo', 'Omadhoo', 'Hangnaameedhoo', 'Kunburudhoo'
    ]
  },
  {
    code: 'V',
    name: 'Vaavu (V)',
    officialName: 'Felidhe Atoll',
    islands: [
      'Felidhoo', 'Keyodhoo', 'Thinadhoo', 'Fulidhoo', 'Rakeedhoo'
    ]
  },
  {
    code: 'M',
    name: 'Meemu (M)',
    officialName: 'Mulaku Atoll',
    islands: [
      'Muli', 'Dhiggaru', 'Mulah', 'Kolhufushi', 'Maduvvari',
      'Veyvah', 'Raimmandhoo', 'Naalaafushi'
    ]
  },
  {
    code: 'F',
    name: 'Faafu (F)',
    officialName: 'Nilandhe Atoll Uthuruburi',
    islands: [
      'Nilandhoo', 'Magoodhoo', 'Dharanboodhoo', 'Feeali', 'Bileddhoo'
    ]
  },
  {
    code: 'Dh',
    name: 'Dhaalu (Dh)',
    officialName: 'Nilandhe Atoll Dhekunuburi',
    islands: [
      'Kudahuvadhoo', 'Meedhoo', 'Maaenboodhoo', 'Bandidhoo', 'Rinbudhoo',
      'Hulhudheli'
    ]
  },
  {
    code: 'Th',
    name: 'Thaa (Th)',
    officialName: 'Kolhumadulu',
    islands: [
      'Veymandoo', 'Thimarafushi', 'Guraidhoo', 'Kinbidhoo', 'Vilufushi',
      'Madifushi', 'Dhiyamigili', 'Hirilandhoo', 'Kandoodhoo', 'Omadhoo',
      'Buruni', 'Gaadhiffushi', 'Vandhoo'
    ]
  },
  {
    code: 'L',
    name: 'Laamu (L)',
    officialName: 'Haddhunmathi',
    islands: [
      'Fonadhoo', 'Gan', 'Isdhoo', 'Kalaidhoo', 'Maabaidhoo',
      'Dhanbidhoo', 'Hithadhoo', 'Kunahandhoo', 'Maavah', 'Mavah',
      'Mundoo'
    ]
  },
  {
    code: 'GA',
    name: 'Gaafu Alif (GA)',
    officialName: 'Huvadhu Atoll Uthuruburi',
    islands: [
      'Villingili', 'Kolamaafushi', 'Dhaandhoo', 'Dhevvadhoo', 'Gemanafushi',
      'Kondey', 'Maamendhoo', 'Nilandhoo'
    ]
  },
  {
    code: 'GDh',
    name: 'Gaafu Dhaalu (GDh)',
    officialName: 'Huvadhu Atoll Dhekunuburi',
    islands: [
      'Thinadhoo City', 'Gadhdhoo', 'Madaveli', 'Hoandeddhoo', 'Vaadhoo',
      'Faresmaathodaa', 'Fiyoari', 'Rathafandhoo', 'Nadella'
    ]
  },
  {
    code: 'Gn',
    name: 'Gnaviyani (Gn)',
    officialName: 'Fuvahmulah',
    islands: [
      'Fuvahmulah City'
    ]
  },
  {
    code: 'S',
    name: 'Addu City (S)',
    officialName: 'Addu Atoll',
    islands: [
      'Hithadhoo', 'Maradhoo', 'Maradhoo-Feydhoo', 'Feydhoo', 'Hulhudhoo',
      'Meedhoo'
    ]
  }
];

export function getIslandsByAtoll(atollNameOrCode: string): string[] {
  if (!atollNameOrCode) return [];
  const query = atollNameOrCode.trim().toLowerCase();
  const match = MALDIVES_ATOLLS.find(
    (a) =>
      a.code.toLowerCase() === query ||
      a.name.toLowerCase() === query ||
      a.name.toLowerCase().includes(query) ||
      a.officialName.toLowerCase().includes(query)
  );
  return match ? match.islands : [];
}
