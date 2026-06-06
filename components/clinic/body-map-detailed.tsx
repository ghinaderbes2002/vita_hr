"use client";

import { useState, useCallback } from "react";

// ─── Bone Database ─────────────────────────────────────────────────────────────
export interface BoneInfo { ar: string; en: string; desc: string }

export const BONES: Record<string, BoneInfo> = {
  frontal:      { ar: "العظم الجبهي",             en: "Frontal Bone",              desc: "يشكل الجبين وسقف تجويفي العين." },
  parietal_r:   { ar: "العظم الجداري الأيمن",      en: "Right Parietal Bone",       desc: "يشكل الجزء العلوي والجانبي الأيمن من الجمجمة." },
  parietal_l:   { ar: "العظم الجداري الأيسر",      en: "Left Parietal Bone",        desc: "يشكل الجزء العلوي والجانبي الأيسر من الجمجمة." },
  occipital:    { ar: "العظم القذالي",              en: "Occipital Bone",            desc: "يشكل الجزء الخلفي والسفلي من الجمجمة." },
  temporal_r:   { ar: "العظم الصدغي الأيمن",       en: "Right Temporal Bone",       desc: "يحتوي على تجويف الأذن الداخلية." },
  temporal_l:   { ar: "العظم الصدغي الأيسر",       en: "Left Temporal Bone",        desc: "يحتوي على تجويف الأذن الداخلية." },
  sphenoid:     { ar: "العظم الوتدي",               en: "Sphenoid Bone",             desc: "عظمة مركزية تربط جميع عظام الجمجمة." },
  ethmoid:      { ar: "العظم الغربالي",             en: "Ethmoid Bone",              desc: "عظمة هشة تفصل تجويف الأنف عن الدماغ." },
  mandible:     { ar: "الفك السفلي",                en: "Mandible",                  desc: "العظمة المتحركة الوحيدة في الجمجمة." },
  maxilla:      { ar: "عظمة الفك العلوي",           en: "Maxilla",                   desc: "تشكل الفك العلوي وقاع تجويف الأنف." },
  zygomatic_r:  { ar: "عظمة الوجنة اليمنى",        en: "Right Zygomatic",           desc: "تشكل بروز الخد الأيمن." },
  zygomatic_l:  { ar: "عظمة الوجنة اليسرى",        en: "Left Zygomatic",            desc: "تشكل بروز الخد الأيسر." },
  nasal:        { ar: "عظام الأنف",                 en: "Nasal Bones",               desc: "عظمتان صغيرتان تشكلان جسر الأنف." },
  c1:  { ar: "الفقرة العنقية C1",  en: "Atlas C1",    desc: "أول فقرة عنقية تحمل الجمجمة." },
  c2:  { ar: "الفقرة العنقية C2",  en: "Axis C2",     desc: "تتيح دوران الرأس يميناً ويساراً." },
  c3:  { ar: "الفقرة العنقية C3",  en: "Cervical C3", desc: "فقرة عنقية نموذجية." },
  c4:  { ar: "الفقرة العنقية C4",  en: "Cervical C4", desc: "تقع عند مستوى الغدة الدرقية." },
  c5:  { ar: "الفقرة العنقية C5",  en: "Cervical C5", desc: "أكثر الفقرات تعرضاً للانزلاق في العنق." },
  c6:  { ar: "الفقرة العنقية C6",  en: "Cervical C6", desc: "تخرج منها أعصاب الرسغ." },
  c7:  { ar: "الفقرة العنقية C7",  en: "Cervical C7", desc: "آخر فقرة عنقية وأبرزها." },
  t1:  { ar: "الفقرة الصدرية T1",  en: "Thoracic T1", desc: "أول فقرة صدرية." },
  t2:  { ar: "الفقرة الصدرية T2",  en: "Thoracic T2", desc: "تتصل بالضلع الثاني." },
  t3:  { ar: "الفقرة الصدرية T3",  en: "Thoracic T3", desc: "تتصل بالضلع الثالث." },
  t4:  { ar: "الفقرة الصدرية T4",  en: "Thoracic T4", desc: "تتصل بالضلع الرابع." },
  t5:  { ar: "الفقرة الصدرية T5",  en: "Thoracic T5", desc: "تتصل بالضلع الخامس." },
  t6:  { ar: "الفقرة الصدرية T6",  en: "Thoracic T6", desc: "تتصل بالضلع السادس." },
  t7:  { ar: "الفقرة الصدرية T7",  en: "Thoracic T7", desc: "تمثل منتصف الفقرات الصدرية." },
  t8:  { ar: "الفقرة الصدرية T8",  en: "Thoracic T8", desc: "تتصل بالضلع الثامن." },
  t9:  { ar: "الفقرة الصدرية T9",  en: "Thoracic T9", desc: "تتصل بالضلع التاسع." },
  t10: { ar: "الفقرة الصدرية T10", en: "Thoracic T10",desc: "تتصل بالضلع العاشر." },
  t11: { ar: "الفقرة الصدرية T11", en: "Thoracic T11",desc: "تتصل بالضلع الحادي عشر." },
  t12: { ar: "الفقرة الصدرية T12", en: "Thoracic T12",desc: "آخر الفقرات الصدرية." },
  l1:  { ar: "الفقرة القطنية L1",  en: "Lumbar L1",   desc: "أول الفقرات القطنية." },
  l2:  { ar: "الفقرة القطنية L2",  en: "Lumbar L2",   desc: "تعطي الأعصاب الحركية لعضلة القطني." },
  l3:  { ar: "الفقرة القطنية L3",  en: "Lumbar L3",   desc: "مركز القوس القطني." },
  l4:  { ar: "الفقرة القطنية L4",  en: "Lumbar L4",   desc: "تتوافق مع قمة الحرقفة." },
  l5:  { ar: "الفقرة القطنية L5",  en: "Lumbar L5",   desc: "أكبر الفقرات القطنية وأكثرها عرضة للانزلاق." },
  sacrum:  { ar: "العجز",   en: "Sacrum", desc: "اندماج 5 فقرات عجزية في عظمة واحدة." },
  coccyx:  { ar: "العصعص", en: "Coccyx", desc: "اندماج 4-5 فقرات ضامرة." },
  sternum_manubrium: { ar: "مقبض القص",      en: "Manubrium",       desc: "الجزء العلوي من عظمة القص." },
  sternum_body:      { ar: "جسم القص",       en: "Sternum Body",    desc: "الجزء الرئيسي من عظمة القص." },
  xiphoid:           { ar: "الناتئ الخنجري", en: "Xiphoid Process", desc: "أصغر وأسفل أجزاء القص." },
  rib1_r:  { ar: "الضلع الأول الأيمن",         en: "Right Rib 1",  desc: "أقصر وأعرض الأضلاع." },
  rib2_r:  { ar: "الضلع الثاني الأيمن",        en: "Right Rib 2",  desc: "يتصل بمقبض القص." },
  rib3_r:  { ar: "الضلع الثالث الأيمن",        en: "Right Rib 3",  desc: "ضلع حقيقي." },
  rib4_r:  { ar: "الضلع الرابع الأيمن",        en: "Right Rib 4",  desc: "يقع عند مستوى تشعب القصبة." },
  rib5_r:  { ar: "الضلع الخامس الأيمن",        en: "Right Rib 5",  desc: "يحيط بقمة القلب." },
  rib6_r:  { ar: "الضلع السادس الأيمن",        en: "Right Rib 6",  desc: "آخر الأضلاع الحقيقية المستقلة." },
  rib7_r:  { ar: "الضلع السابع الأيمن",        en: "Right Rib 7",  desc: "آخر الأضلاع الحقيقية." },
  rib8_r:  { ar: "الضلع الثامن الأيمن",        en: "Right Rib 8",  desc: "أول الأضلاع الكاذبة." },
  rib9_r:  { ar: "الضلع التاسع الأيمن",        en: "Right Rib 9",  desc: "ضلع كاذب." },
  rib10_r: { ar: "الضلع العاشر الأيمن",        en: "Right Rib 10", desc: "آخر الأضلاع الكاذبة." },
  rib11_r: { ar: "الضلع الحادي عشر الأيمن",    en: "Right Rib 11", desc: "أول الأضلاع العائمة." },
  rib12_r: { ar: "الضلع الثاني عشر الأيمن",   en: "Right Rib 12", desc: "آخر وأقصر الأضلاع." },
  rib1_l:  { ar: "الضلع الأول الأيسر",         en: "Left Rib 1",   desc: "أقصر وأعرض الأضلاع." },
  rib2_l:  { ar: "الضلع الثاني الأيسر",        en: "Left Rib 2",   desc: "يتصل بمقبض القص." },
  rib3_l:  { ar: "الضلع الثالث الأيسر",        en: "Left Rib 3",   desc: "ضلع حقيقي أيسر." },
  rib4_l:  { ar: "الضلع الرابع الأيسر",        en: "Left Rib 4",   desc: "يقع عند مستوى تشعب القصبة." },
  rib5_l:  { ar: "الضلع الخامس الأيسر",        en: "Left Rib 5",   desc: "يحيط بالقلب من اليسار." },
  rib6_l:  { ar: "الضلع السادس الأيسر",        en: "Left Rib 6",   desc: "آخر الأضلاع الحقيقية المستقلة." },
  rib7_l:  { ar: "الضلع السابع الأيسر",        en: "Left Rib 7",   desc: "آخر الأضلاع الحقيقية." },
  rib8_l:  { ar: "الضلع الثامن الأيسر",        en: "Left Rib 8",   desc: "أول الأضلاع الكاذبة." },
  rib9_l:  { ar: "الضلع التاسع الأيسر",        en: "Left Rib 9",   desc: "ضلع كاذب." },
  rib10_l: { ar: "الضلع العاشر الأيسر",        en: "Left Rib 10",  desc: "آخر الأضلاع الكاذبة." },
  rib11_l: { ar: "الضلع الحادي عشر الأيسر",   en: "Left Rib 11",  desc: "أول الأضلاع العائمة." },
  rib12_l: { ar: "الضلع الثاني عشر الأيسر",   en: "Left Rib 12",  desc: "آخر ضلع في الجسم." },
  clavicle_r: { ar: "الترقوة اليمنى",  en: "Right Clavicle", desc: "عظمة S الشكل تربط الكتف بعظمة القص." },
  clavicle_l: { ar: "الترقوة اليسرى",  en: "Left Clavicle",  desc: "تمر تحتها الأوعية والأعصاب المتجهة للذراع." },
  scapula_r:  { ar: "لوح الكتف الأيمن", en: "Right Scapula", desc: "عظمة مثلثة بها 17 عضلة مرتبطة." },
  scapula_l:  { ar: "لوح الكتف الأيسر", en: "Left Scapula",  desc: "تحتوي على ناتئ الغرابي." },
  humerus_r:  { ar: "عظمة العضد الأيمن",  en: "Right Humerus", desc: "أطول عظام الذراع." },
  radius_r:   { ar: "الكعبرة اليمنى",     en: "Right Radius",  desc: "تدور 180° لتقليب اليد." },
  ulna_r:     { ar: "الزند الأيمن",        en: "Right Ulna",    desc: "العظمة الثابتة في الساعد." },
  scaphoid_r:  { ar: "العظم الزورقي الأيمن",  en: "Right Scaphoid",   desc: "أكبر عظام الرسغ الصف الأول." },
  lunate_r:    { ar: "العظم الهلالي الأيمن",  en: "Right Lunate",     desc: "عظمة هلالية تتصل بالكعبرة." },
  triquetrum_r:{ ar: "العظم المثلثي الأيمن",  en: "Right Triquetrum", desc: "تقع على الجانب الإنسي من الرسغ." },
  pisiform_r:  { ar: "عظمة البازلاء اليمنى", en: "Right Pisiform",   desc: "أصغر عظام الرسغ." },
  trapezium_r: { ar: "العظم المضربي الأيمن",  en: "Right Trapezium",  desc: "تشكل قاعدة مفصل الإبهام." },
  trapezoid_r: { ar: "العظم المضربي الصغير",  en: "Right Trapezoid",  desc: "أصغر عظام الصف الثاني." },
  capitate_r:  { ar: "العظم الرأسي الأيمن",   en: "Right Capitate",   desc: "أكبر وأكثر عظام الرسغ مركزية." },
  hamate_r:    { ar: "العظم المعقوفي الأيمن",  en: "Right Hamate",     desc: "تمتلك خطافاً تمر من تحته أعصاب الأصابع." },
  mc1_r: { ar: "عظمة المشط الأولى اليمنى",  en: "R 1st Metacarpal", desc: "تشكل قاعدة الإبهام." },
  mc2_r: { ar: "عظمة المشط الثانية اليمنى", en: "R 2nd Metacarpal", desc: "تحمل نسبة أعلى من قوى الضغط." },
  mc3_r: { ar: "عظمة المشط الثالثة اليمنى", en: "R 3rd Metacarpal", desc: "تشكل محور الرسغ التشريحي." },
  mc4_r: { ar: "عظمة المشط الرابعة اليمنى", en: "R 4th Metacarpal", desc: "أضعف عظام المشط." },
  mc5_r: { ar: "عظمة المشط الخامسة اليمنى", en: "R 5th Metacarpal", desc: "كسر عنقها شائع عند الملاكمين." },
  pp_thumb_r:  { ar: "السلامية القريبة للإبهام الأيمن",   en: "R Thumb Proximal",  desc: "السلامية الأولى في الإبهام." },
  dp_thumb_r:  { ar: "السلامية الطرفية للإبهام الأيمن",   en: "R Thumb Distal",    desc: "تحمل لوح الظفر." },
  pp_index_r:  { ar: "السلامية القريبة للسبابة اليمنى",   en: "R Index Proximal",  desc: "أطول سلاميات السبابة." },
  mp_index_r:  { ar: "السلامية الوسطى للسبابة اليمنى",   en: "R Index Middle",    desc: "ترتبط بها أوتار المثنيات." },
  dp_index_r:  { ar: "السلامية الطرفية للسبابة اليمنى",  en: "R Index Distal",    desc: "أكثر مستقبلات اللمس كثافة." },
  pp_middle_r: { ar: "السلامية القريبة للوسطى اليمنى",   en: "R Middle Proximal", desc: "أطول سلامية في الجسم." },
  mp_middle_r: { ar: "السلامية الوسطى للوسطى اليمنى",   en: "R Middle Middle",   desc: "تتحمل أعلى قوى الضغط." },
  dp_middle_r: { ar: "السلامية الطرفية للوسطى اليمنى",  en: "R Middle Distal",   desc: "تحمل ظفر الإصبع الوسطى." },
  pp_ring_r:   { ar: "السلامية القريبة للبنصر اليمنى",   en: "R Ring Proximal",   desc: "أضعف سلاميات الأصابع." },
  mp_ring_r:   { ar: "السلامية الوسطى للبنصر اليمنى",   en: "R Ring Middle",     desc: "ترتبط بها أوتار مشتركة." },
  dp_ring_r:   { ar: "السلامية الطرفية للبنصر اليمنى",  en: "R Ring Distal",     desc: "تحمل ظفر البنصر." },
  pp_little_r: { ar: "السلامية القريبة للخنصر الأيمن",   en: "R Little Proximal", desc: "أصغر السلاميات القريبة." },
  mp_little_r: { ar: "السلامية الوسطى للخنصر الأيمن",   en: "R Little Middle",   desc: "أصغر سلامية وسطى." },
  dp_little_r: { ar: "السلامية الطرفية للخنصر الأيمن",  en: "R Little Distal",   desc: "أصغر سلامية طرفية." },
  humerus_l:   { ar: "عظمة العضد الأيسر",   en: "Left Humerus",  desc: "أطول عظام الذراع الأيسر." },
  radius_l:    { ar: "الكعبرة اليسرى",       en: "Left Radius",   desc: "عظمة الساعد الأيسر الجانبية." },
  ulna_l:      { ar: "الزند الأيسر",          en: "Left Ulna",     desc: "العظمة الثابتة في الساعد الأيسر." },
  scaphoid_l:  { ar: "العظم الزورقي الأيسر",  en: "Left Scaphoid",   desc: "أكبر عظام رسغ اليسار." },
  lunate_l:    { ar: "العظم الهلالي الأيسر",  en: "Left Lunate",     desc: "عظمة هلالية في الرسغ الأيسر." },
  triquetrum_l:{ ar: "العظم المثلثي الأيسر",  en: "Left Triquetrum", desc: "تقع على الجانب الإنسي من الرسغ الأيسر." },
  pisiform_l:  { ar: "عظمة البازلاء اليسرى",  en: "Left Pisiform",   desc: "عظمة سمسمانية صغيرة في الرسغ الأيسر." },
  trapezium_l: { ar: "العظم المضربي الأيسر",  en: "Left Trapezium",  desc: "تشكل قاعدة مفصل الإبهام الأيسر." },
  trapezoid_l: { ar: "العظم المضربي الصغير الأيسر", en: "Left Trapezoid", desc: "أصغر عظام الصف الثاني في اليد اليسرى." },
  capitate_l:  { ar: "العظم الرأسي الأيسر",   en: "Left Capitate",   desc: "أكبر عظام الرسغ الأيسر." },
  hamate_l:    { ar: "العظم المعقوفي الأيسر",  en: "Left Hamate",     desc: "يمتلك خطافاً على وجهه الراحي." },
  mc1_l: { ar: "عظمة المشط الأولى اليسرى",  en: "L 1st Metacarpal", desc: "تشكل قاعدة الإبهام الأيسر." },
  mc2_l: { ar: "عظمة المشط الثانية اليسرى", en: "L 2nd Metacarpal", desc: "أقوى عظمة مشط في اليد اليسرى." },
  mc3_l: { ar: "عظمة المشط الثالثة اليسرى", en: "L 3rd Metacarpal", desc: "محور حركة الرسغ." },
  mc4_l: { ar: "عظمة المشط الرابعة اليسرى", en: "L 4th Metacarpal", desc: "أرق عظام المشط الأيسر." },
  mc5_l: { ar: "عظمة المشط الخامسة اليسرى", en: "L 5th Metacarpal", desc: "كسر عنقها شائع في اليد اليسرى." },
  pp_thumb_l:  { ar: "السلامية القريبة للإبهام الأيسر",   en: "L Thumb Proximal",  desc: "السلامية الأولى في الإبهام الأيسر." },
  dp_thumb_l:  { ar: "السلامية الطرفية للإبهام الأيسر",   en: "L Thumb Distal",    desc: "تحمل ظفر الإبهام الأيسر." },
  pp_index_l:  { ar: "السلامية القريبة للسبابة اليسرى",   en: "L Index Proximal",  desc: "سلامية السبابة الأولى." },
  mp_index_l:  { ar: "السلامية الوسطى للسبابة اليسرى",   en: "L Index Middle",    desc: "ترتبط بأوتار المثنيات السطحية." },
  dp_index_l:  { ar: "السلامية الطرفية للسبابة اليسرى",  en: "L Index Distal",    desc: "تحمل ظفر السبابة اليسرى." },
  pp_middle_l: { ar: "السلامية القريبة للوسطى اليسرى",   en: "L Middle Proximal", desc: "أطول سلاميات القريبة في اليد اليسرى." },
  mp_middle_l: { ar: "السلامية الوسطى للوسطى اليسرى",   en: "L Middle Middle",   desc: "الأكثر كثافة في الإمساك." },
  dp_middle_l: { ar: "السلامية الطرفية للوسطى اليسرى",  en: "L Middle Distal",   desc: "تحمل ظفر الوسطى اليسرى." },
  pp_ring_l:   { ar: "السلامية القريبة للبنصر الأيسر",   en: "L Ring Proximal",   desc: "مكان الخاتم تقليدياً." },
  mp_ring_l:   { ar: "السلامية الوسطى للبنصر الأيسر",   en: "L Ring Middle",     desc: "ترتبط بأوتار مشتركة." },
  dp_ring_l:   { ar: "السلامية الطرفية للبنصر الأيسر",  en: "L Ring Distal",     desc: "تحمل ظفر البنصر الأيسر." },
  pp_little_l: { ar: "السلامية القريبة للخنصر الأيسر",   en: "L Little Proximal", desc: "عضلة قائمة الخنصر ترتبط بها." },
  mp_little_l: { ar: "السلامية الوسطى للخنصر الأيسر",   en: "L Little Middle",   desc: "الأصغر بين السلاميات الوسطى." },
  dp_little_l: { ar: "السلامية الطرفية للخنصر الأيسر",  en: "L Little Distal",   desc: "أصغر عظمة في الطرف العلوي." },
  ilium_r:  { ar: "الحرقفة اليمنى",   en: "Right Ilium",   desc: "أكبر أجزاء عظمة الحوض." },
  ilium_l:  { ar: "الحرقفة اليسرى",   en: "Left Ilium",    desc: "الطرف العلوي الواسع للحوض الأيسر." },
  ischium_r:{ ar: "الإسك الأيمن",     en: "Right Ischium", desc: "الجزء السفلي الخلفي من الحوض." },
  ischium_l:{ ar: "الإسك الأيسر",     en: "Left Ischium",  desc: "الجزء السفلي الخلفي من الحوض الأيسر." },
  pubis_r:  { ar: "عظمة العانة اليمنى", en: "Right Pubis", desc: "الجزء الأمامي من عظمة الحوض الأيمن." },
  pubis_l:  { ar: "عظمة العانة اليسرى", en: "Left Pubis",  desc: "تتصل مع نظيرتها في الارتفاق العاني." },
  femur_r:   { ar: "عظمة الفخذ اليمنى",  en: "Right Femur",    desc: "أطول وأثقل عظمة في الجسم." },
  patella_r: { ar: "الرضفة اليمنى",       en: "Right Patella",  desc: "أكبر عظمة سمسمانية." },
  tibia_r:   { ar: "القصبة اليمنى",       en: "Right Tibia",    desc: "العظمة الرئيسية في أسفل الساق." },
  fibula_r:  { ar: "الشظية اليمنى",       en: "Right Fibula",   desc: "عظمة رفيعة تشكل الكعب الخارجي." },
  talus_r:   { ar: "عظمة الكاحل الأيمن", en: "Right Talus",    desc: "توزع 100% من وزن الجسم على القدم." },
  calcaneus_r:{ ar: "عظمة العقب الأيمن", en: "Right Calcaneus",desc: "أكبر عظام القدم." },
  navicular_r:{ ar: "العظم الزورقي القدمي الأيمن", en: "R Navicular",  desc: "تشكل قمة قوس القدم الداخلي." },
  cuboid_r:  { ar: "العظم المكعبي الأيمن",         en: "Right Cuboid", desc: "تشكل ركن القوس الخارجي للقدم." },
  cuneiform1_r:{ ar: "العظم المسماري الأول الأيمن", en: "R Medial Cuneiform",       desc: "أكبر العظام المسمارية." },
  cuneiform2_r:{ ar: "العظم المسماري الثاني الأيمن",en: "R Intermediate Cuneiform", desc: "أصغر العظام المسمارية." },
  cuneiform3_r:{ ar: "العظم المسماري الثالث الأيمن",en: "R Lateral Cuneiform",      desc: "يتصل بعظمة المشط الثالثة والرابعة." },
  mt1_r: { ar: "عظمة مشط القدم الأولى اليمنى",  en: "R 1st Metatarsal", desc: "تحمل ثلث وزن الجسم في كل خطوة." },
  mt2_r: { ar: "عظمة مشط القدم الثانية اليمنى", en: "R 2nd Metatarsal", desc: "الأطول عادةً وأكثرها عرضة للكسر الإجهادي." },
  mt3_r: { ar: "عظمة مشط القدم الثالثة اليمنى", en: "R 3rd Metatarsal", desc: "تتحمل 25% من قوى الدفع." },
  mt4_r: { ar: "عظمة مشط القدم الرابعة اليمنى", en: "R 4th Metatarsal", desc: "تحمل قدراً مساوياً لجارتها الثالثة." },
  mt5_r: { ar: "عظمة مشط القدم الخامسة اليمنى", en: "R 5th Metatarsal", desc: "قاعدتها تكسر عند التواء الكاحل." },
  hallux_pp_r: { ar: "السلامية القريبة لإبهام القدم الأيمن",  en: "R Hallux Proximal", desc: "تحمل وزناً كبيراً في مرحلة الدفع." },
  hallux_dp_r: { ar: "السلامية الطرفية لإبهام القدم الأيمن", en: "R Hallux Distal",   desc: "تحمل ظفر إبهام القدم الأيمن." },
  toe2_pp_r: { ar: "السلامية القريبة للإصبع الثاني (اليمنى)",  en: "R 2nd Prox", desc: "إذا كانت أطول من الإبهام: قدم مورتون." },
  toe2_mp_r: { ar: "السلامية الوسطى للإصبع الثاني (اليمنى)", en: "R 2nd Mid",  desc: "ترتبط بها أوتار المثنيات." },
  toe2_dp_r: { ar: "السلامية الطرفية للإصبع الثاني (اليمنى)",en: "R 2nd Dist", desc: "تحمل ظفر الإصبع الثاني." },
  toe3_pp_r: { ar: "السلامية القريبة للإصبع الثالث (اليمنى)",  en: "R 3rd Prox", desc: "يشارك في توازن القدم." },
  toe3_mp_r: { ar: "السلامية الوسطى للإصبع الثالث (اليمنى)", en: "R 3rd Mid",  desc: "ترتبط بها العضلة الدودية الثالثة." },
  toe3_dp_r: { ar: "السلامية الطرفية للإصبع الثالث (اليمنى)",en: "R 3rd Dist", desc: "تحمل ظفر الإصبع الثالث." },
  toe4_pp_r: { ar: "السلامية القريبة للإصبع الرابع (اليمنى)",  en: "R 4th Prox", desc: "قد تسبب عصبونة مورتون مع الثالثة." },
  toe4_mp_r: { ar: "السلامية الوسطى للإصبع الرابع (اليمنى)", en: "R 4th Mid",  desc: "ترتبط بها أوتار مثنية الأصابع." },
  toe4_dp_r: { ar: "السلامية الطرفية للإصبع الرابع (اليمنى)",en: "R 4th Dist", desc: "تحمل ظفر الإصبع الرابع." },
  toe5_pp_r: { ar: "السلامية القريبة للإصبع الخامس (اليمنى)",  en: "R 5th Prox", desc: "يميل للداخل في كثير من الناس." },
  toe5_mp_r: { ar: "السلامية الوسطى للإصبع الخامس (اليمنى)", en: "R 5th Mid",  desc: "قد تندمج مع الطرفية." },
  toe5_dp_r: { ar: "السلامية الطرفية للإصبع الخامس (اليمنى)",en: "R 5th Dist", desc: "أصغر عظمة في القدم." },
  femur_l:   { ar: "عظمة الفخذ اليسرى",  en: "Left Femur",    desc: "يبلغ طولها 26-28% من طول الشخص." },
  patella_l: { ar: "الرضفة اليسرى",       en: "Left Patella",  desc: "عظمة سمسمانية في وتر رباعية الرأس." },
  tibia_l:   { ar: "القصبة اليسرى",       en: "Left Tibia",    desc: "العظمة الرئيسية في أسفل الساق اليسرى." },
  fibula_l:  { ar: "الشظية اليسرى",       en: "Left Fibula",   desc: "عظمة رفيعة في الساق اليسرى." },
  talus_l:   { ar: "عظمة الكاحل الأيسر", en: "Left Talus",    desc: "كسرها نادر لكن خطير." },
  calcaneus_l:{ ar: "عظمة العقب الأيسر", en: "Left Calcaneus",desc: "أكبر عظام القدم اليسرى." },
  navicular_l:{ ar: "العظم الزورقي القدمي الأيسر", en: "L Navicular",  desc: "تشكل قمة قوس القدم الداخلي الأيسر." },
  cuboid_l:  { ar: "العظم المكعبي الأيسر",         en: "Left Cuboid",  desc: "القوس الخارجي الأيسر للقدم." },
  cuneiform1_l:{ ar: "العظم المسماري الأول الأيسر", en: "L Medial Cuneiform",       desc: "يحمل المشط الأول الأيسر." },
  cuneiform2_l:{ ar: "العظم المسماري الثاني الأيسر",en: "L Intermediate Cuneiform", desc: "أصغر العظام المسمارية اليسرى." },
  cuneiform3_l:{ ar: "العظم المسماري الثالث الأيسر",en: "L Lateral Cuneiform",      desc: "يدعم الجانب الخارجي للقدم اليسرى." },
  mt1_l: { ar: "عظمة مشط القدم الأولى اليسرى",  en: "L 1st Metatarsal", desc: "تحمل أعلى ضغط في كل خطوة." },
  mt2_l: { ar: "عظمة مشط القدم الثانية اليسرى", en: "L 2nd Metatarsal", desc: "الأطول في اليسرى غالباً." },
  mt3_l: { ar: "عظمة مشط القدم الثالثة اليمنى", en: "L 3rd Metatarsal", desc: "يتحمل ضغطاً مساوياً للثاني." },
  mt4_l: { ar: "عظمة مشط القدم الرابعة اليسرى", en: "L 4th Metatarsal", desc: "يشكل مع المكعبية المفصل الرسغي." },
  mt5_l: { ar: "عظمة مشط القدم الخامسة اليسرى", en: "L 5th Metatarsal", desc: "إبرتها الخارجية تكسر عند التفتيل." },
  hallux_pp_l: { ar: "السلامية القريبة لإبهام القدم الأيسر",  en: "L Hallux Proximal", desc: "يحمل ثلث الوزن في الدفع." },
  hallux_dp_l: { ar: "السلامية الطرفية لإبهام القدم الأيسر", en: "L Hallux Distal",   desc: "تحمل ظفر إبهام القدم الأيسر." },
  toe2_pp_l: { ar: "السلامية القريبة للإصبع الثاني (اليسرى)",  en: "L 2nd Prox", desc: "قدم مورتون اليسرى." },
  toe2_mp_l: { ar: "السلامية الوسطى للإصبع الثاني (اليسرى)", en: "L 2nd Mid",  desc: "ترتبط بها أوتار مثنيات الأصابع." },
  toe2_dp_l: { ar: "السلامية الطرفية للإصبع الثاني (اليسرى)",en: "L 2nd Dist", desc: "تحمل ظفر الإصبع الثاني الأيسر." },
  toe3_pp_l: { ar: "السلامية القريبة للإصبع الثالث (اليسرى)",  en: "L 3rd Prox", desc: "تشارك في التوازن." },
  toe3_mp_l: { ar: "السلامية الوسطى للإصبع الثالث (اليسرى)", en: "L 3rd Mid",  desc: "ترتبط بها العضلات الدودية." },
  toe3_dp_l: { ar: "السلامية الطرفية للإصبع الثالث (اليسرى)",en: "L 3rd Dist", desc: "تحمل ظفر الإصبع الثالث الأيسر." },
  toe4_pp_l: { ar: "السلامية القريبة للإصبع الرابع (اليسرى)",  en: "L 4th Prox", desc: "قد تسبب عصبونة مورتون." },
  toe4_mp_l: { ar: "السلامية الوسطى للإصبع الرابع (اليسرى)", en: "L 4th Mid",  desc: "ترتبط بها أوتار مثنية الأصابع." },
  toe4_dp_l: { ar: "السلامية الطرفية للإصبع الرابع (اليسرى)",en: "L 4th Dist", desc: "تحمل ظفر الإصبع الرابع الأيسر." },
  toe5_pp_l: { ar: "السلامية القريبة للإصبع الخامس (اليسرى)",  en: "L 5th Prox", desc: "الأكثر تضرراً من الأحذية الضيقة." },
  toe5_mp_l: { ar: "السلامية الوسطى للإصبع الخامس (اليسرى)", en: "L 5th Mid",  desc: "قد تندمج مع الطرفية." },
  toe5_dp_l: { ar: "السلامية الطرفية للإصبع الخامس (اليسرى)",en: "L 5th Dist", desc: "أصغر عظمة في الجسم البشري." },
};

// ─── Color Palette ─────────────────────────────────────────────────────────────
const C = {
  cortical: "#d4c9b0", inner: "#e8dfc8", joint: "#c8dde8",
  dark: "#8a7860", seam: "#b0a488",
  selected: "#f5a623", selectedStroke: "#c47d0a",
  light: "#ede3d0",
};

const PAIN_COLORS = ["#bbf7d0","#86efac","#fef08a","#fde047","#fdba74","#fb923c","#f87171","#ef4444","#dc2626","#b91c1c","#7f1d1d"];

function painFill(i: number) { return PAIN_COLORS[Math.min(10, Math.max(0, Math.round(i)))]; }

// ─── Color helpers (accept sel + markedBones) ──────────────────────────────────
function fill(id: string, sel: string | null, m: Record<string, number>): string {
  if (m[id] !== undefined) return painFill(m[id]);
  if (sel === id) return C.selected;
  return C.cortical;
}
function stroke(id: string, sel: string | null): string {
  return sel === id ? C.selectedStroke : C.dark;
}
function fi(id: string, sel: string | null, m: Record<string, number>): string {
  if (m[id] !== undefined) return painFill(m[id]);
  if (sel === id) return C.selected;
  return C.inner;
}
function fj(id: string, sel: string | null, m: Record<string, number>): string {
  if (m[id] !== undefined) return painFill(m[id]);
  if (sel === id) return C.selected;
  return C.joint;
}
function fl(id: string, sel: string | null, m: Record<string, number>): string {
  if (m[id] !== undefined) return painFill(m[id]);
  if (sel === id) return C.selected;
  return C.light;
}

interface VP { sel: string | null; go: (id: string) => void; m: Record<string, number> }

// ─── Skull ─────────────────────────────────────────────────────────────────────
function SkullFront({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("frontal")} style={{ cursor: "pointer" }}>
        <path d="M78,26 Q100,5 122,26 Q114,38 100,40 Q86,38 78,26 Z" fill={fill("frontal",sel,m)} stroke={stroke("frontal",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("parietal_r")} style={{ cursor: "pointer" }}>
        <path d="M100,40 Q114,38 122,26 Q128,14 122,8 Q110,4 100,5" fill={fill("parietal_r",sel,m)} stroke={stroke("parietal_r",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("parietal_l")} style={{ cursor: "pointer" }}>
        <path d="M100,40 Q86,38 78,26 Q72,14 78,8 Q90,4 100,5" fill={fill("parietal_l",sel,m)} stroke={stroke("parietal_l",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("temporal_r")} style={{ cursor: "pointer" }}>
        <path d="M122,26 Q132,30 136,38 Q134,46 128,48 Q120,44 118,38 Q118,32 122,26 Z" fill={fill("temporal_r",sel,m)} stroke={stroke("temporal_r",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("temporal_l")} style={{ cursor: "pointer" }}>
        <path d="M78,26 Q68,30 64,38 Q66,46 72,48 Q80,44 82,38 Q82,32 78,26 Z" fill={fill("temporal_l",sel,m)} stroke={stroke("temporal_l",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("zygomatic_r")} style={{ cursor: "pointer" }}>
        <path d="M128,48 Q134,52 132,58 Q126,60 120,56 Q118,50 124,48 Z" fill={fill("zygomatic_r",sel,m)} stroke={stroke("zygomatic_r",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("zygomatic_l")} style={{ cursor: "pointer" }}>
        <path d="M72,48 Q66,52 68,58 Q74,60 80,56 Q82,50 76,48 Z" fill={fill("zygomatic_l",sel,m)} stroke={stroke("zygomatic_l",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("nasal")} style={{ cursor: "pointer" }}>
        <path d="M96,40 Q100,38 104,40 L104,50 Q100,52 96,50 Z" fill={fill("nasal",sel,m)} stroke={stroke("nasal",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("maxilla")} style={{ cursor: "pointer" }}>
        <path d="M86,52 Q100,56 114,52 Q118,58 114,64 Q100,68 86,64 Q82,58 86,52 Z" fill={fill("maxilla",sel,m)} stroke={stroke("maxilla",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("sphenoid")} style={{ cursor: "pointer" }}>
        <path d="M90,40 Q100,42 110,40 Q112,46 100,48 Q88,46 90,40 Z" fill={fill("sphenoid",sel,m)} stroke={stroke("sphenoid",sel)} strokeWidth="0.6" />
      </g>
      <g onClick={() => go("mandible")} style={{ cursor: "pointer" }}>
        <path d="M84,64 Q100,70 116,64 Q120,72 116,80 Q100,84 84,80 Q80,72 84,64 Z" fill={fill("mandible",sel,m)} stroke={stroke("mandible",sel)} strokeWidth="0.8" />
        <path d="M84,64 L82,56 Q80,50 84,48" fill="none" stroke={stroke("mandible",sel)} strokeWidth="1" />
        <path d="M116,64 L118,56 Q120,50 116,48" fill="none" stroke={stroke("mandible",sel)} strokeWidth="1" />
        <line x1={100} y1={64} x2={100} y2={84} stroke={C.seam} strokeWidth="0.5" />
      </g>
      <path d="M100,5 L100,40" fill="none" stroke={C.seam} strokeWidth="0.5" strokeDasharray="2,2" />
      <path d="M78,26 Q100,30 122,26" fill="none" stroke={C.seam} strokeWidth="0.5" strokeDasharray="2,2" />
    </g>
  );
}

function SkullBack({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("occipital")} style={{ cursor: "pointer" }}>
        <path d="M78,26 Q100,20 122,26 Q128,34 122,44 Q110,50 100,52 Q90,50 78,44 Q72,34 78,26 Z" fill={fill("occipital",sel,m)} stroke={stroke("occipital",sel)} strokeWidth="0.8" />
        <ellipse cx={100} cy={42} rx={8} ry={6} fill={fi("occipital",sel,m)} stroke={stroke("occipital",sel)} strokeWidth="0.5" />
      </g>
      <g onClick={() => go("parietal_r")} style={{ cursor: "pointer" }}>
        <path d="M100,8 Q112,6 122,12 Q128,20 122,26 Q110,22 100,20 Z" fill={fill("parietal_r",sel,m)} stroke={stroke("parietal_r",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("parietal_l")} style={{ cursor: "pointer" }}>
        <path d="M100,8 Q88,6 78,12 Q72,20 78,26 Q90,22 100,20 Z" fill={fill("parietal_l",sel,m)} stroke={stroke("parietal_l",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("temporal_r")} style={{ cursor: "pointer" }}>
        <path d="M122,26 Q130,32 128,42 Q124,46 120,44 Q118,36 122,26 Z" fill={fill("temporal_r",sel,m)} stroke={stroke("temporal_r",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("temporal_l")} style={{ cursor: "pointer" }}>
        <path d="M78,26 Q70,32 72,42 Q76,46 80,44 Q82,36 78,26 Z" fill={fill("temporal_l",sel,m)} stroke={stroke("temporal_l",sel)} strokeWidth="0.7" />
      </g>
      <path d="M100,8 L100,26" fill="none" stroke={C.seam} strokeWidth="0.5" strokeDasharray="2,2" />
      <path d="M78,26 Q100,32 122,26" fill="none" stroke={C.seam} strokeWidth="0.5" strokeDasharray="2,2" />
    </g>
  );
}

// ─── Spine ─────────────────────────────────────────────────────────────────────
const SPINE_IDS = ["c1","c2","c3","c4","c5","c6","c7","t1","t2","t3","t4","t5","t6","t7","t8","t9","t10","t11","t12","l1","l2","l3","l4","l5"];
const SPINE_HEIGHTS = [6,6,6,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,7,9,9,9,9,9];

function SpineColumn({ sel, go, m, back = false }: VP & { back?: boolean }) {
  let y = 88;
  return (
    <g>
      {SPINE_IDS.map((id, i) => {
        const h = SPINE_HEIGHTS[i];
        const w = i < 7 ? 12 : i < 19 ? 13 : 15;
        const x = 100 - w / 2;
        const pw = i < 7 ? 5 : i < 19 ? 6 : 7;
        const thisY = y;
        y += h + 1;
        return (
          <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}>
            <rect x={x - pw} y={thisY + 1} width={pw} height={h - 2} rx={1} fill={fill(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.5" />
            <rect x={x + w} y={thisY + 1} width={pw} height={h - 2} rx={1} fill={fill(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.5" />
            <rect x={x} y={thisY} width={w} height={h} rx={1.5} fill={fi(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.7" />
            {back && <path d={`M${100},${thisY + h} L${100},${thisY + h + 3}`} fill="none" stroke={stroke(id,sel)} strokeWidth="1.2" />}
            {i < SPINE_IDS.length - 1 && <rect x={x + 1} y={thisY + h} width={w - 2} height={1} rx={0.5} fill="#e0d8c2" />}
          </g>
        );
      })}
    </g>
  );
}

// ─── Thorax ────────────────────────────────────────────────────────────────────
const RIB_DATA = [
  { y: 93,  lR: 28, id_r: "rib1_r",  id_l: "rib1_l"  },
  { y: 101, lR: 32, id_r: "rib2_r",  id_l: "rib2_l"  },
  { y: 109, lR: 35, id_r: "rib3_r",  id_l: "rib3_l"  },
  { y: 117, lR: 36, id_r: "rib4_r",  id_l: "rib4_l"  },
  { y: 125, lR: 36, id_r: "rib5_r",  id_l: "rib5_l"  },
  { y: 133, lR: 34, id_r: "rib6_r",  id_l: "rib6_l"  },
  { y: 141, lR: 32, id_r: "rib7_r",  id_l: "rib7_l"  },
  { y: 148, lR: 28, id_r: "rib8_r",  id_l: "rib8_l"  },
  { y: 154, lR: 24, id_r: "rib9_r",  id_l: "rib9_l"  },
  { y: 159, lR: 19, id_r: "rib10_r", id_l: "rib10_l" },
  { y: 163, lR: 12, id_r: "rib11_r", id_l: "rib11_l" },
  { y: 167, lR: 8,  id_r: "rib12_r", id_l: "rib12_l" },
];

function ThoraxFront({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("sternum_manubrium")} style={{ cursor: "pointer" }}>
        <path d="M95,88 L105,88 L106,100 L94,100 Z" fill={fill("sternum_manubrium",sel,m)} stroke={stroke("sternum_manubrium",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("sternum_body")} style={{ cursor: "pointer" }}>
        <path d="M94,100 L106,100 L105,148 L95,148 Z" fill={fill("sternum_body",sel,m)} stroke={stroke("sternum_body",sel)} strokeWidth="0.8" />
        {[108,116,124,132,140].map((yy,i) => (
          <line key={i} x1={94} y1={yy} x2={106} y2={yy} stroke={C.seam} strokeWidth="0.4" />
        ))}
      </g>
      <g onClick={() => go("xiphoid")} style={{ cursor: "pointer" }}>
        <path d="M95,148 L105,148 L102,156 L98,156 Z" fill={fill("xiphoid",sel,m)} stroke={stroke("xiphoid",sel)} strokeWidth="0.7" />
      </g>
      {RIB_DATA.map(({ y, lR, id_r, id_l }) => {
        const sw = lR > 24 ? 2.5 : 1.8;
        return (
          <g key={id_r}>
            <g onClick={() => go(id_r)} style={{ cursor: "pointer" }}>
              <path d={`M106,${y} Q${106 + lR * 0.6},${y + 4} ${106 + lR},${y + 10}`} fill="none" stroke={fill(id_r,sel,m)} strokeWidth={sw + 1} />
              <path d={`M106,${y} Q${106 + lR * 0.6},${y + 4} ${106 + lR},${y + 10}`} fill="none" stroke={stroke(id_r,sel)} strokeWidth="0.6" />
            </g>
            <g onClick={() => go(id_l)} style={{ cursor: "pointer" }}>
              <path d={`M94,${y} Q${94 - lR * 0.6},${y + 4} ${94 - lR},${y + 10}`} fill="none" stroke={fill(id_l,sel,m)} strokeWidth={sw + 1} />
              <path d={`M94,${y} Q${94 - lR * 0.6},${y + 4} ${94 - lR},${y + 10}`} fill="none" stroke={stroke(id_l,sel)} strokeWidth="0.6" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

// ─── Shoulder Girdle ───────────────────────────────────────────────────────────
function ShoulderGirdleFront({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("clavicle_r")} style={{ cursor: "pointer" }}>
        <path d="M106,92 Q118,88 128,91 Q136,94 140,98" fill="none" stroke={fill("clavicle_r",sel,m)} strokeWidth="5" strokeLinecap="round" />
        <path d="M106,92 Q118,88 128,91 Q136,94 140,98" fill="none" stroke={stroke("clavicle_r",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("clavicle_l")} style={{ cursor: "pointer" }}>
        <path d="M94,92 Q82,88 72,91 Q64,94 60,98" fill="none" stroke={fill("clavicle_l",sel,m)} strokeWidth="5" strokeLinecap="round" />
        <path d="M94,92 Q82,88 72,91 Q64,94 60,98" fill="none" stroke={stroke("clavicle_l",sel)} strokeWidth="0.8" />
      </g>
    </g>
  );
}

function ScapulaeBack({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("scapula_r")} style={{ cursor: "pointer" }}>
        <path d="M112,96 Q125,98 136,110 Q142,122 138,138 Q132,146 122,142 Q112,132 110,116 Z" fill={fill("scapula_r",sel,m)} stroke={stroke("scapula_r",sel)} strokeWidth="0.9" />
        <path d="M122,95 Q128,104 126,116" fill="none" stroke={stroke("scapula_r",sel)} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx={112} cy={100} rx={5} ry={4} fill={fj("scapula_r",sel,m)} stroke={stroke("scapula_r",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("scapula_l")} style={{ cursor: "pointer" }}>
        <path d="M88,96 Q75,98 64,110 Q58,122 62,138 Q68,146 78,142 Q88,132 90,116 Z" fill={fill("scapula_l",sel,m)} stroke={stroke("scapula_l",sel)} strokeWidth="0.9" />
        <path d="M78,95 Q72,104 74,116" fill="none" stroke={stroke("scapula_l",sel)} strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx={88} cy={100} rx={5} ry={4} fill={fj("scapula_l",sel,m)} stroke={stroke("scapula_l",sel)} strokeWidth="0.7" />
      </g>
    </g>
  );
}

// ─── Upper Limb ────────────────────────────────────────────────────────────────
function UpperLimbR({ sel, go, m, back = false }: VP & { back?: boolean }) {
  const xO = back ? 2 : 0;
  return (
    <g>
      <g onClick={() => go("humerus_r")} style={{ cursor: "pointer" }}>
        <ellipse cx={140 + xO} cy={102} rx={9} ry={9} fill={fj("humerus_r",sel,m)} stroke={stroke("humerus_r",sel)} strokeWidth="0.8" />
        <path d={`M140,110 Q${138+xO},125 ${136+xO},160 Q${135+xO},175 ${134+xO},184`} fill="none" stroke={fill("humerus_r",sel,m)} strokeWidth="11" strokeLinecap="round" />
        <path d={`M140,110 Q${138+xO},125 ${136+xO},160 Q${135+xO},175 ${134+xO},184`} fill="none" stroke={stroke("humerus_r",sel)} strokeWidth="0.8" />
        <ellipse cx={134+xO} cy={186} rx={11} ry={7} fill={fj("humerus_r",sel,m)} stroke={stroke("humerus_r",sel)} strokeWidth="0.8" />
        <ellipse cx={138+xO} cy={140} rx={4} ry={8} fill={fill("humerus_r",sel,m)} stroke={stroke("humerus_r",sel)} strokeWidth="0.5" />
      </g>
      <g onClick={() => go("radius_r")} style={{ cursor: "pointer" }}>
        <ellipse cx={140} cy={190} rx={5} ry={4} fill={fj("radius_r",sel,m)} stroke={stroke("radius_r",sel)} strokeWidth="0.6" />
        <path d="M144,192 Q147,215 146,244" fill="none" stroke={fill("radius_r",sel,m)} strokeWidth="7" strokeLinecap="round" />
        <path d="M144,192 Q147,215 146,244" fill="none" stroke={stroke("radius_r",sel)} strokeWidth="0.7" />
        <ellipse cx={146} cy={246} rx={7} ry={4} fill={fj("radius_r",sel,m)} stroke={stroke("radius_r",sel)} strokeWidth="0.6" />
      </g>
      <g onClick={() => go("ulna_r")} style={{ cursor: "pointer" }}>
        <path d="M128,184 L126,180 L132,177 L136,184" fill={fill("ulna_r",sel,m)} stroke={stroke("ulna_r",sel)} strokeWidth="0.7" />
        <path d="M130,186 Q128,212 130,244" fill="none" stroke={fi("ulna_r",sel,m)} strokeWidth="5" strokeLinecap="round" />
        <path d="M130,186 Q128,212 130,244" fill="none" stroke={stroke("ulna_r",sel)} strokeWidth="0.7" />
        <ellipse cx={130} cy={246} rx={5} ry={3} fill={fj("ulna_r",sel,m)} stroke={stroke("ulna_r",sel)} strokeWidth="0.6" />
      </g>
    </g>
  );
}

function UpperLimbL({ sel, go, m, back = false }: VP & { back?: boolean }) {
  const xO = back ? -2 : 0;
  return (
    <g>
      <g onClick={() => go("humerus_l")} style={{ cursor: "pointer" }}>
        <ellipse cx={60+xO} cy={102} rx={9} ry={9} fill={fj("humerus_l",sel,m)} stroke={stroke("humerus_l",sel)} strokeWidth="0.8" />
        <path d={`M60,110 Q${62+xO},125 ${64+xO},160 Q${65+xO},175 ${66+xO},184`} fill="none" stroke={fill("humerus_l",sel,m)} strokeWidth="11" strokeLinecap="round" />
        <path d={`M60,110 Q${62+xO},125 ${64+xO},160 Q${65+xO},175 ${66+xO},184`} fill="none" stroke={stroke("humerus_l",sel)} strokeWidth="0.8" />
        <ellipse cx={66+xO} cy={186} rx={11} ry={7} fill={fj("humerus_l",sel,m)} stroke={stroke("humerus_l",sel)} strokeWidth="0.8" />
        <ellipse cx={62+xO} cy={140} rx={4} ry={8} fill={fill("humerus_l",sel,m)} stroke={stroke("humerus_l",sel)} strokeWidth="0.5" />
      </g>
      <g onClick={() => go("radius_l")} style={{ cursor: "pointer" }}>
        <ellipse cx={60} cy={190} rx={5} ry={4} fill={fj("radius_l",sel,m)} stroke={stroke("radius_l",sel)} strokeWidth="0.6" />
        <path d="M56,192 Q53,215 54,244" fill="none" stroke={fill("radius_l",sel,m)} strokeWidth="7" strokeLinecap="round" />
        <path d="M56,192 Q53,215 54,244" fill="none" stroke={stroke("radius_l",sel)} strokeWidth="0.7" />
        <ellipse cx={54} cy={246} rx={7} ry={4} fill={fj("radius_l",sel,m)} stroke={stroke("radius_l",sel)} strokeWidth="0.6" />
      </g>
      <g onClick={() => go("ulna_l")} style={{ cursor: "pointer" }}>
        <path d="M72,184 L74,180 L68,177 L64,184" fill={fill("ulna_l",sel,m)} stroke={stroke("ulna_l",sel)} strokeWidth="0.7" />
        <path d="M70,186 Q72,212 70,244" fill="none" stroke={fi("ulna_l",sel,m)} strokeWidth="5" strokeLinecap="round" />
        <path d="M70,186 Q72,212 70,244" fill="none" stroke={stroke("ulna_l",sel)} strokeWidth="0.7" />
        <ellipse cx={70} cy={246} rx={5} ry={3} fill={fj("ulna_l",sel,m)} stroke={stroke("ulna_l",sel)} strokeWidth="0.6" />
      </g>
    </g>
  );
}

// ─── Hand ──────────────────────────────────────────────────────────────────────
const CARPALS_R = [
  { id: "scaphoid_r",   x: 0,  y: 0, w: 6, h: 5 }, { id: "lunate_r",     x: 7,  y: 0, w: 5, h: 5 },
  { id: "triquetrum_r", x: 13, y: 0, w: 5, h: 5 }, { id: "pisiform_r",   x: 19, y: 0, w: 4, h: 4 },
  { id: "trapezium_r",  x: 0,  y: 6, w: 6, h: 5 }, { id: "trapezoid_r",  x: 7,  y: 6, w: 5, h: 5 },
  { id: "capitate_r",   x: 13, y: 6, w: 6, h: 6 }, { id: "hamate_r",     x: 20, y: 6, w: 5, h: 5 },
];
const FINGERS_R = [
  { mc:"mc1_r", pp:"pp_thumb_r",  dp:"dp_thumb_r",  threeP:false, x:-2, mcH:9,  ppH:7,  mpH:0, dpH:5 },
  { mc:"mc2_r", pp:"pp_index_r",  mp:"mp_index_r",  dp:"dp_index_r",  threeP:true, x:7,  mcH:12,ppH:7,  mpH:5, dpH:4 },
  { mc:"mc3_r", pp:"pp_middle_r", mp:"mp_middle_r", dp:"dp_middle_r", threeP:true, x:13, mcH:13,ppH:8,  mpH:5, dpH:4 },
  { mc:"mc4_r", pp:"pp_ring_r",   mp:"mp_ring_r",   dp:"dp_ring_r",   threeP:true, x:19, mcH:12,ppH:7,  mpH:5, dpH:4 },
  { mc:"mc5_r", pp:"pp_little_r", mp:"mp_little_r", dp:"dp_little_r", threeP:true, x:25, mcH:10,ppH:6,  mpH:4, dpH:3 },
];
function HandR({ sel, go, m, xBase = 128, yBase = 248 }: VP & { xBase?: number; yBase?: number }) {
  return (
    <g transform={`translate(${xBase},${yBase})`}>
      {CARPALS_R.map(({ id, x, y, w, h }) => (
        <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}>
          <rect x={x} y={y} width={w} height={h} rx={1.5} fill={fill(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.6" />
        </g>
      ))}
      {FINGERS_R.map(({ mc, pp, mp, dp, threeP, x, mcH, ppH, mpH, dpH }) => {
        const cY = 12;
        return (
          <g key={mc}>
            <g onClick={() => go(mc)} style={{ cursor: "pointer" }}><rect x={x} y={cY} width={4} height={mcH} rx={1.5} fill={fi(mc,sel,m)} stroke={stroke(mc,sel)} strokeWidth="0.6" /></g>
            <g onClick={() => go(pp)} style={{ cursor: "pointer" }}><rect x={x} y={cY+mcH+1} width={4} height={ppH} rx={1.5} fill={fl(pp,sel,m)} stroke={stroke(pp,sel)} strokeWidth="0.5" /></g>
            {threeP && mp && <g onClick={() => go(mp)} style={{ cursor: "pointer" }}><rect x={x} y={cY+mcH+ppH+2} width={4} height={mpH} rx={1} fill={fill(mp,sel,m)} stroke={stroke(mp,sel)} strokeWidth="0.5" /></g>}
            <g onClick={() => go(dp)} style={{ cursor: "pointer" }}><rect x={x} y={cY+mcH+ppH+(threeP?mpH+3:1)} width={4} height={dpH} rx={2} fill={fl(dp,sel,m)} stroke={stroke(dp,sel)} strokeWidth="0.5" /></g>
          </g>
        );
      })}
    </g>
  );
}

const CARPALS_L = [
  { id: "scaphoid_l",   x: 25, y: 0, w: 6, h: 5 }, { id: "lunate_l",     x: 19, y: 0, w: 5, h: 5 },
  { id: "triquetrum_l", x: 13, y: 0, w: 5, h: 5 }, { id: "pisiform_l",   x: 8,  y: 0, w: 4, h: 4 },
  { id: "trapezium_l",  x: 25, y: 6, w: 6, h: 5 }, { id: "trapezoid_l",  x: 19, y: 6, w: 5, h: 5 },
  { id: "capitate_l",   x: 12, y: 6, w: 6, h: 6 }, { id: "hamate_l",     x: 6,  y: 6, w: 5, h: 5 },
];
const FINGERS_L = [
  { mc:"mc1_l", pp:"pp_thumb_l", dp:"dp_thumb_l", threeP:false, x:28, mcH:9,  ppH:7,  mpH:0, dpH:5 },
  { mc:"mc2_l", pp:"pp_index_l", mp:"mp_index_l", dp:"dp_index_l", threeP:true, x:22, mcH:12,ppH:7,mpH:5,dpH:4 },
  { mc:"mc3_l", pp:"pp_middle_l",mp:"mp_middle_l",dp:"dp_middle_l",threeP:true, x:16, mcH:13,ppH:8,mpH:5,dpH:4 },
  { mc:"mc4_l", pp:"pp_ring_l",  mp:"mp_ring_l",  dp:"dp_ring_l", threeP:true, x:10, mcH:12,ppH:7,mpH:5,dpH:4 },
  { mc:"mc5_l", pp:"pp_little_l",mp:"mp_little_l",dp:"dp_little_l",threeP:true,x:4,  mcH:10,ppH:6,mpH:4,dpH:3 },
];
function HandL({ sel, go, m, xBase = 42, yBase = 248 }: VP & { xBase?: number; yBase?: number }) {
  return (
    <g transform={`translate(${xBase},${yBase})`}>
      {CARPALS_L.map(({ id, x, y, w, h }) => (
        <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}>
          <rect x={x} y={y} width={w} height={h} rx={1.5} fill={fill(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.6" />
        </g>
      ))}
      {FINGERS_L.map(({ mc, pp, mp, dp, threeP, x, mcH, ppH, mpH, dpH }) => {
        const cY = 12;
        return (
          <g key={mc}>
            <g onClick={() => go(mc)} style={{ cursor: "pointer" }}><rect x={x} y={cY} width={4} height={mcH} rx={1.5} fill={fi(mc,sel,m)} stroke={stroke(mc,sel)} strokeWidth="0.6" /></g>
            <g onClick={() => go(pp)} style={{ cursor: "pointer" }}><rect x={x} y={cY+mcH+1} width={4} height={ppH} rx={1.5} fill={fl(pp,sel,m)} stroke={stroke(pp,sel)} strokeWidth="0.5" /></g>
            {threeP && mp && <g onClick={() => go(mp)} style={{ cursor: "pointer" }}><rect x={x} y={cY+mcH+ppH+2} width={4} height={mpH} rx={1} fill={fill(mp,sel,m)} stroke={stroke(mp,sel)} strokeWidth="0.5" /></g>}
            <g onClick={() => go(dp)} style={{ cursor: "pointer" }}><rect x={x} y={cY+mcH+ppH+(threeP?mpH+3:1)} width={4} height={dpH} rx={2} fill={fl(dp,sel,m)} stroke={stroke(dp,sel)} strokeWidth="0.5" /></g>
          </g>
        );
      })}
    </g>
  );
}

// ─── Pelvis ────────────────────────────────────────────────────────────────────
function PelvisFront({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("sacrum")} style={{ cursor: "pointer" }}>
        <path d="M94,292 Q100,288 106,292 L108,324 Q100,330 92,324 Z" fill={fill("sacrum",sel,m)} stroke={stroke("sacrum",sel)} strokeWidth="0.8" />
        {[1,2,3,4].map(i => <line key={i} x1={93} y1={292+i*7} x2={107} y2={292+i*7} stroke={C.seam} strokeWidth="0.4" />)}
      </g>
      <g onClick={() => go("coccyx")} style={{ cursor: "pointer" }}>
        <path d="M96,324 Q100,322 104,324 L103,336 Q100,340 97,336 Z" fill={fill("coccyx",sel,m)} stroke={stroke("coccyx",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("ilium_r")} style={{ cursor: "pointer" }}>
        <path d="M106,292 Q120,285 132,292 Q142,302 140,318 Q138,330 130,334 Q116,338 106,335" fill={fill("ilium_r",sel,m)} stroke={stroke("ilium_r",sel)} strokeWidth="0.9" />
      </g>
      <g onClick={() => go("ilium_l")} style={{ cursor: "pointer" }}>
        <path d="M94,292 Q80,285 68,292 Q58,302 60,318 Q62,330 70,334 Q84,338 94,335" fill={fill("ilium_l",sel,m)} stroke={stroke("ilium_l",sel)} strokeWidth="0.9" />
      </g>
      <g onClick={() => go("ischium_r")} style={{ cursor: "pointer" }}>
        <path d="M130,334 Q136,344 134,354 Q128,360 120,358 Q110,352 106,342 Q110,338 116,338 Z" fill={fill("ischium_r",sel,m)} stroke={stroke("ischium_r",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("ischium_l")} style={{ cursor: "pointer" }}>
        <path d="M70,334 Q64,344 66,354 Q72,360 80,358 Q90,352 94,342 Q90,338 84,338 Z" fill={fill("ischium_l",sel,m)} stroke={stroke("ischium_l",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("pubis_r")} style={{ cursor: "pointer" }}>
        <path d="M106,335 Q106,342 100,346 Q94,342 94,335 Q100,333 106,335 Z" fill={fill("pubis_r",sel,m)} stroke={stroke("pubis_r",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("pubis_l")} style={{ cursor: "pointer" }}>
        <path d="M94,335 Q94,342 100,346 Q106,342 106,335 Q100,333 94,335 Z" fill={fill("pubis_l",sel,m)} stroke={stroke("pubis_l",sel)} strokeWidth="0.7" />
      </g>
    </g>
  );
}

// ─── Lower Limb ────────────────────────────────────────────────────────────────
function LowerLimbR({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("femur_r")} style={{ cursor: "pointer" }}>
        <ellipse cx={122} cy={356} rx={11} ry={11} fill={fj("femur_r",sel,m)} stroke={stroke("femur_r",sel)} strokeWidth="0.8" />
        <line x1={114} y1={360} x2={122} y2={366} stroke={stroke("femur_r",sel)} strokeWidth="2" />
        <path d="M122,366 Q118,382 114,410 Q112,432 112,458" fill="none" stroke={fill("femur_r",sel,m)} strokeWidth="13" strokeLinecap="round" />
        <path d="M122,366 Q118,382 114,410 Q112,432 112,458" fill="none" stroke={stroke("femur_r",sel)} strokeWidth="0.8" />
        <ellipse cx={108} cy={460} rx={8} ry={6} fill={fj("femur_r",sel,m)} stroke={stroke("femur_r",sel)} strokeWidth="0.7" />
        <ellipse cx={118} cy={460} rx={8} ry={6} fill={fj("femur_r",sel,m)} stroke={stroke("femur_r",sel)} strokeWidth="0.7" />
        <ellipse cx={128} cy={368} rx={6} ry={5} fill={fill("femur_r",sel,m)} stroke={stroke("femur_r",sel)} strokeWidth="0.6" />
      </g>
      <g onClick={() => go("patella_r")} style={{ cursor: "pointer" }}>
        <ellipse cx={113} cy={465} rx={9} ry={7} fill={fl("patella_r",sel,m)} stroke={stroke("patella_r",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("tibia_r")} style={{ cursor: "pointer" }}>
        <path d="M104,472 Q113,470 122,472 L120,476 Q113,474 106,476 Z" fill={fj("tibia_r",sel,m)} stroke={stroke("tibia_r",sel)} strokeWidth="0.7" />
        <path d="M113,476 L115,484 L111,484 Z" fill={fill("tibia_r",sel,m)} stroke={stroke("tibia_r",sel)} strokeWidth="0.5" />
        <path d="M110,478 Q112,502 112,530 Q112,546 110,558" fill="none" stroke={fill("tibia_r",sel,m)} strokeWidth="9" strokeLinecap="round" />
        <path d="M110,478 Q112,502 112,530 Q112,546 110,558" fill="none" stroke={stroke("tibia_r",sel)} strokeWidth="0.8" />
        <ellipse cx={108} cy={560} rx={7} ry={5} fill={fj("tibia_r",sel,m)} stroke={stroke("tibia_r",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("fibula_r")} style={{ cursor: "pointer" }}>
        <path d="M120,476 Q122,506 122,536 Q122,550 121,560" fill="none" stroke={fi("fibula_r",sel,m)} strokeWidth="4" strokeLinecap="round" />
        <path d="M120,476 Q122,506 122,536 Q122,550 121,560" fill="none" stroke={stroke("fibula_r",sel)} strokeWidth="0.6" />
        <ellipse cx={121} cy={562} rx={6} ry={4} fill={fj("fibula_r",sel,m)} stroke={stroke("fibula_r",sel)} strokeWidth="0.6" />
      </g>
    </g>
  );
}

function LowerLimbL({ sel, go, m }: VP) {
  return (
    <g>
      <g onClick={() => go("femur_l")} style={{ cursor: "pointer" }}>
        <ellipse cx={78} cy={356} rx={11} ry={11} fill={fj("femur_l",sel,m)} stroke={stroke("femur_l",sel)} strokeWidth="0.8" />
        <line x1={86} y1={360} x2={78} y2={366} stroke={stroke("femur_l",sel)} strokeWidth="2" />
        <path d="M78,366 Q82,382 86,410 Q88,432 88,458" fill="none" stroke={fill("femur_l",sel,m)} strokeWidth="13" strokeLinecap="round" />
        <path d="M78,366 Q82,382 86,410 Q88,432 88,458" fill="none" stroke={stroke("femur_l",sel)} strokeWidth="0.8" />
        <ellipse cx={92} cy={460} rx={8} ry={6} fill={fj("femur_l",sel,m)} stroke={stroke("femur_l",sel)} strokeWidth="0.7" />
        <ellipse cx={82} cy={460} rx={8} ry={6} fill={fj("femur_l",sel,m)} stroke={stroke("femur_l",sel)} strokeWidth="0.7" />
        <ellipse cx={72} cy={368} rx={6} ry={5} fill={fill("femur_l",sel,m)} stroke={stroke("femur_l",sel)} strokeWidth="0.6" />
      </g>
      <g onClick={() => go("patella_l")} style={{ cursor: "pointer" }}>
        <ellipse cx={87} cy={465} rx={9} ry={7} fill={fl("patella_l",sel,m)} stroke={stroke("patella_l",sel)} strokeWidth="0.8" />
      </g>
      <g onClick={() => go("tibia_l")} style={{ cursor: "pointer" }}>
        <path d="M96,472 Q87,470 78,472 L80,476 Q87,474 94,476 Z" fill={fj("tibia_l",sel,m)} stroke={stroke("tibia_l",sel)} strokeWidth="0.7" />
        <path d="M87,476 L85,484 L89,484 Z" fill={fill("tibia_l",sel,m)} stroke={stroke("tibia_l",sel)} strokeWidth="0.5" />
        <path d="M90,478 Q88,502 88,530 Q88,546 90,558" fill="none" stroke={fill("tibia_l",sel,m)} strokeWidth="9" strokeLinecap="round" />
        <path d="M90,478 Q88,502 88,530 Q88,546 90,558" fill="none" stroke={stroke("tibia_l",sel)} strokeWidth="0.8" />
        <ellipse cx={92} cy={560} rx={7} ry={5} fill={fj("tibia_l",sel,m)} stroke={stroke("tibia_l",sel)} strokeWidth="0.7" />
      </g>
      <g onClick={() => go("fibula_l")} style={{ cursor: "pointer" }}>
        <path d="M80,476 Q78,506 78,536 Q78,550 79,560" fill="none" stroke={fi("fibula_l",sel,m)} strokeWidth="4" strokeLinecap="round" />
        <path d="M80,476 Q78,506 78,536 Q78,550 79,560" fill="none" stroke={stroke("fibula_l",sel)} strokeWidth="0.6" />
        <ellipse cx={79} cy={562} rx={6} ry={4} fill={fj("fibula_l",sel,m)} stroke={stroke("fibula_l",sel)} strokeWidth="0.6" />
      </g>
    </g>
  );
}

// ─── Foot ──────────────────────────────────────────────────────────────────────
const TARSALS_R = [
  { id:"talus_r",       d:"M14,0 Q22,0 24,6 Q22,12 14,12 Q8,8 10,2 Z" },
  { id:"calcaneus_r",   d:"M0,6 Q8,2 14,4 Q14,12 8,14 Q0,14 -4,10 Q-6,6 0,6 Z" },
  { id:"navicular_r",   d:"M24,4 Q30,2 34,6 Q34,12 28,14 Q22,12 22,8 Z" },
  { id:"cuboid_r",      d:"M14,12 Q20,12 22,16 Q20,22 14,22 Q8,22 8,16 Z" },
  { id:"cuneiform1_r",  d:"M34,6 Q38,4 42,8 Q42,14 36,16 Q32,14 32,10 Z" },
  { id:"cuneiform2_r",  d:"M42,6 Q46,4 48,8 Q48,14 44,16 Q40,14 40,10 Z" },
  { id:"cuneiform3_r",  d:"M48,6 Q52,4 54,8 Q54,16 50,18 Q46,16 46,12 Z" },
];
const MTS_R = [
  { id:"mt1_r",x:30,y:16,w:7,h:18 },{ id:"mt2_r",x:38,y:14,w:5,h:20 },
  { id:"mt3_r",x:44,y:14,w:5,h:20 },{ id:"mt4_r",x:50,y:16,w:4,h:18 },
  { id:"mt5_r",x:55,y:18,w:4,h:16 },
];
const TOES_R = [
  { pp:"hallux_pp_r",dp:"hallux_dp_r",mp:"",     x:30,ppH:8,mpH:0,dpH:6 },
  { pp:"toe2_pp_r",  dp:"toe2_dp_r",  mp:"toe2_mp_r",x:38,ppH:6,mpH:4,dpH:3 },
  { pp:"toe3_pp_r",  dp:"toe3_dp_r",  mp:"toe3_mp_r",x:44,ppH:6,mpH:4,dpH:3 },
  { pp:"toe4_pp_r",  dp:"toe4_dp_r",  mp:"toe4_mp_r",x:50,ppH:5,mpH:3,dpH:3 },
  { pp:"toe5_pp_r",  dp:"toe5_dp_r",  mp:"toe5_mp_r",x:55,ppH:4,mpH:3,dpH:2 },
];
function FootR({ sel, go, m, xBase = 96, yBase = 564 }: VP & { xBase?: number; yBase?: number }) {
  return (
    <g transform={`translate(${xBase},${yBase})`}>
      {TARSALS_R.map(({ id, d }) => (
        <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}><path d={d} fill={fill(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.7" /></g>
      ))}
      {MTS_R.map(({ id, x, y, w, h }) => (
        <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}><rect x={x} y={y} width={w} height={h} rx={2} fill={fi(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.6" /></g>
      ))}
      {TOES_R.map(({ pp, mp, dp, x, ppH, mpH, dpH }) => {
        const mt = MTS_R.find(t => t.x === x);
        const baseY = mt ? mt.y + mt.h + 1 : 36;
        const w = mt?.w ?? 5;
        return (
          <g key={pp}>
            <g onClick={() => go(pp)} style={{ cursor: "pointer" }}><rect x={x} y={baseY} width={w} height={ppH} rx={2} fill={fl(pp,sel,m)} stroke={stroke(pp,sel)} strokeWidth="0.5" /></g>
            {mp && <g onClick={() => go(mp)} style={{ cursor: "pointer" }}><rect x={x} y={baseY+ppH+1} width={w} height={mpH} rx={1.5} fill={fill(mp,sel,m)} stroke={stroke(mp,sel)} strokeWidth="0.5" /></g>}
            <g onClick={() => go(dp)} style={{ cursor: "pointer" }}><rect x={x} y={baseY+ppH+(mp?mpH+2:1)} width={w} height={dpH} rx={2} fill={fl(dp,sel,m)} stroke={stroke(dp,sel)} strokeWidth="0.5" /></g>
          </g>
        );
      })}
    </g>
  );
}

const TARSALS_L = [
  { id:"talus_l",       d:"M48,0 Q40,0 38,6 Q40,12 48,12 Q54,8 52,2 Z" },
  { id:"calcaneus_l",   d:"M62,6 Q54,2 48,4 Q48,12 54,14 Q62,14 66,10 Q68,6 62,6 Z" },
  { id:"navicular_l",   d:"M38,4 Q32,2 28,6 Q28,12 34,14 Q40,12 40,8 Z" },
  { id:"cuboid_l",      d:"M48,12 Q42,12 40,16 Q42,22 48,22 Q54,22 54,16 Z" },
  { id:"cuneiform1_l",  d:"M28,6 Q24,4 20,8 Q20,14 26,16 Q30,14 30,10 Z" },
  { id:"cuneiform2_l",  d:"M20,6 Q16,4 14,8 Q14,14 18,16 Q22,14 22,10 Z" },
  { id:"cuneiform3_l",  d:"M14,6 Q10,4 8,8 Q8,16 12,18 Q16,16 16,12 Z" },
];
const MTS_L = [
  { id:"mt1_l",x:25,y:16,w:7,h:18 },{ id:"mt2_l",x:19,y:14,w:5,h:20 },
  { id:"mt3_l",x:13,y:14,w:5,h:20 },{ id:"mt4_l",x:8, y:16,w:4,h:18 },
  { id:"mt5_l",x:3, y:18,w:4,h:16 },
];
const TOES_L = [
  { pp:"hallux_pp_l",dp:"hallux_dp_l",mp:"",      x:25,w:7,ppH:8,mpH:0,dpH:6 },
  { pp:"toe2_pp_l",  dp:"toe2_dp_l",  mp:"toe2_mp_l", x:19,w:5,ppH:6,mpH:4,dpH:3 },
  { pp:"toe3_pp_l",  dp:"toe3_dp_l",  mp:"toe3_mp_l", x:13,w:5,ppH:6,mpH:4,dpH:3 },
  { pp:"toe4_pp_l",  dp:"toe4_dp_l",  mp:"toe4_mp_l", x:8, w:4,ppH:5,mpH:3,dpH:3 },
  { pp:"toe5_pp_l",  dp:"toe5_dp_l",  mp:"toe5_mp_l", x:3, w:4,ppH:4,mpH:3,dpH:2 },
];
function FootL({ sel, go, m, xBase = 42, yBase = 564 }: VP & { xBase?: number; yBase?: number }) {
  return (
    <g transform={`translate(${xBase},${yBase})`}>
      {TARSALS_L.map(({ id, d }) => (
        <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}><path d={d} fill={fill(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.7" /></g>
      ))}
      {MTS_L.map(({ id, x, y, w, h }) => (
        <g key={id} onClick={() => go(id)} style={{ cursor: "pointer" }}><rect x={x} y={y} width={w} height={h} rx={2} fill={fi(id,sel,m)} stroke={stroke(id,sel)} strokeWidth="0.6" /></g>
      ))}
      {TOES_L.map(({ pp, mp, dp, x, w, ppH, mpH, dpH }) => {
        const mt = MTS_L.find(t => t.x === x);
        const baseY = mt ? mt.y + mt.h + 1 : 36;
        return (
          <g key={pp}>
            <g onClick={() => go(pp)} style={{ cursor: "pointer" }}><rect x={x} y={baseY} width={w} height={ppH} rx={2} fill={fl(pp,sel,m)} stroke={stroke(pp,sel)} strokeWidth="0.5" /></g>
            {mp && <g onClick={() => go(mp)} style={{ cursor: "pointer" }}><rect x={x} y={baseY+ppH+1} width={w} height={mpH} rx={1.5} fill={fill(mp,sel,m)} stroke={stroke(mp,sel)} strokeWidth="0.5" /></g>}
            <g onClick={() => go(dp)} style={{ cursor: "pointer" }}><rect x={x} y={baseY+ppH+(mp?mpH+2:1)} width={w} height={dpH} rx={2} fill={fl(dp,sel,m)} stroke={stroke(dp,sel)} strokeWidth="0.5" /></g>
          </g>
        );
      })}
    </g>
  );
}

// ─── Views ─────────────────────────────────────────────────────────────────────
function FrontView({ sel, go, m }: VP) {
  return (
    <svg viewBox="0 0 200 640" width="100%" style={{ maxWidth: 200, display: "block" }}>
      <SkullFront sel={sel} go={go} m={m} />
      <SpineColumn sel={sel} go={go} m={m} back={false} />
      <ThoraxFront sel={sel} go={go} m={m} />
      <ShoulderGirdleFront sel={sel} go={go} m={m} />
      <UpperLimbR sel={sel} go={go} m={m} />
      <UpperLimbL sel={sel} go={go} m={m} />
      <HandR sel={sel} go={go} m={m} xBase={128} yBase={248} />
      <HandL sel={sel} go={go} m={m} xBase={42} yBase={248} />
      <PelvisFront sel={sel} go={go} m={m} />
      <LowerLimbR sel={sel} go={go} m={m} />
      <LowerLimbL sel={sel} go={go} m={m} />
      <FootR sel={sel} go={go} m={m} xBase={96} yBase={564} />
      <FootL sel={sel} go={go} m={m} xBase={42} yBase={564} />
    </svg>
  );
}

function BackView({ sel, go, m }: VP) {
  return (
    <svg viewBox="0 0 200 640" width="100%" style={{ maxWidth: 200, display: "block" }}>
      <SkullBack sel={sel} go={go} m={m} />
      <ScapulaeBack sel={sel} go={go} m={m} />
      <SpineColumn sel={sel} go={go} m={m} back={true} />
      <ThoraxFront sel={sel} go={go} m={m} />
      <ShoulderGirdleFront sel={sel} go={go} m={m} />
      <UpperLimbR sel={sel} go={go} m={m} back={true} />
      <UpperLimbL sel={sel} go={go} m={m} back={true} />
      <HandR sel={sel} go={go} m={m} xBase={128} yBase={248} />
      <HandL sel={sel} go={go} m={m} xBase={42} yBase={248} />
      <PelvisFront sel={sel} go={go} m={m} />
      <LowerLimbR sel={sel} go={go} m={m} />
      <LowerLimbL sel={sel} go={go} m={m} />
      <FootR sel={sel} go={go} m={m} xBase={96} yBase={564} />
      <FootL sel={sel} go={go} m={m} xBase={42} yBase={564} />
    </svg>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export interface BodyMapDetailedProps {
  markedBones?: Record<string, number>;
  onBoneClick?: (id: string) => void;
  readonly?: boolean;
}

export default function BodyMapDetailed({ markedBones = {}, onBoneClick, readonly = false }: BodyMapDetailedProps) {
  const [sel, setSel] = useState<string | null>(null);

  const go = useCallback((id: string) => {
    if (readonly) return;
    setSel(id);
    onBoneClick?.(id);
  }, [onBoneClick, readonly]);

  return (
    <div className="flex gap-4 justify-center select-none" dir="ltr">
      <div>
        <p className="text-center text-xs text-muted-foreground mb-1">الأمام</p>
        <FrontView sel={sel} go={go} m={markedBones} />
      </div>
      <div>
        <p className="text-center text-xs text-muted-foreground mb-1">الخلف</p>
        <BackView sel={sel} go={go} m={markedBones} />
      </div>
    </div>
  );
}
