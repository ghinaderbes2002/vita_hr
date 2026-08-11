// Syrian administrative geography — the 14 governorates and their main cities.
//
// A referral source stores its city as a plain name (not a `cityId`), so this
// list does not need to match any backend table. It is kept here because the
// clinic `/cities` endpoint returns nothing on the current deployment, which
// left the city picker empty.
export const SYRIA_GOVERNORATES: { governorate: string; cities: string[] }[] = [
  {
    governorate: "دمشق",
    cities: ["دمشق"],
  },
  {
    governorate: "ريف دمشق",
    cities: [
      "دوما", "حرستا", "عربين", "زملكا", "داريا", "معضمية الشام", "صحنايا",
      "جرمانا", "قدسيا", "التل", "الزبداني", "مضايا", "سرغايا", "يبرود",
      "النبك", "دير عطية", "قارة", "قطنا", "الكسوة", "يلدا", "ببيلا",
      "سيدنايا", "معربا", "رنكوس", "عين الفيجة", "الضمير", "النشابية",
    ],
  },
  {
    governorate: "حلب",
    cities: [
      "حلب", "أعزاز", "الباب", "منبج", "عفرين", "جرابلس", "السفيرة",
      "دير حافر", "عين العرب", "الأتارب", "دارة عزة", "تل رفعت", "مارع",
      "الراعي", "خان العسل", "نبل", "الزربة",
    ],
  },
  {
    governorate: "حمص",
    cities: [
      "حمص", "تدمر", "الرستن", "تلبيسة", "القصير", "تلكلخ", "المخرم",
      "القريتين", "الحولة", "صدد", "مهين", "الفرقلس",
    ],
  },
  {
    governorate: "حماة",
    cities: [
      "حماة", "سلمية", "مصياف", "محردة", "السقيلبية", "كفر زيتا", "مورك",
      "حلفايا", "طيبة الإمام", "كفر نبودة", "الغاب",
    ],
  },
  {
    governorate: "اللاذقية",
    cities: ["اللاذقية", "جبلة", "الحفة", "القرداحة", "كسب", "صلنفة", "عين البيضا", "ربيعة"],
  },
  {
    governorate: "طرطوس",
    cities: ["طرطوس", "بانياس", "صافيتا", "الدريكيش", "الشيخ بدر", "القدموس", "الحميدية"],
  },
  {
    governorate: "إدلب",
    cities: [
      "إدلب", "معرة النعمان", "جسر الشغور", "أريحا", "حارم", "سراقب", "بنش",
      "كفر نبل", "الدانا", "سلقين", "خان شيخون", "معرة مصرين", "كللي", "أطمة",
    ],
  },
  {
    governorate: "دير الزور",
    cities: ["دير الزور", "الميادين", "البوكمال", "الحسنة", "الطيبة", "الصالحية", "هجين"],
  },
  {
    governorate: "الحسكة",
    cities: [
      "الحسكة", "القامشلي", "رأس العين", "المالكية", "عامودا", "الدرباسية",
      "تل تمر", "الشدادي", "تل حميس", "اليعربية",
    ],
  },
  {
    governorate: "الرقة",
    cities: ["الرقة", "تل أبيض", "الثورة", "معدان", "السبخة", "سلوك"],
  },
  {
    governorate: "درعا",
    cities: [
      "درعا", "إزرع", "نوى", "الصنمين", "جاسم", "طفس", "الحراك",
      "بصرى الشام", "الشيخ مسكين", "داعل", "المزيريب", "تسيل", "الصورة",
    ],
  },
  {
    governorate: "السويداء",
    cities: ["السويداء", "شهبا", "صلخد", "القريا", "شقا", "المزرعة", "ذيبين"],
  },
  {
    governorate: "القنيطرة",
    cities: ["القنيطرة", "خان أرنبة", "فيق", "مسعدة", "البعث", "جباتا الخشب"],
  },
];

export interface CityOption {
  name: string;
  governorate: string;
}

/** Flat name/governorate pairs, in the order the governorates are declared. */
export const SYRIA_CITIES: CityOption[] = SYRIA_GOVERNORATES.flatMap((g) =>
  g.cities.map((name) => ({ name, governorate: g.governorate })),
);
