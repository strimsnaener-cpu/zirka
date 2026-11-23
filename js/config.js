/* ==========================================================================
   «Зірка оживає» — Lava Aroma Candles
   ЄДИНИЙ ФАЙЛ НАЛАШТУВАНЬ. Тут міняються фото, музика, фарби і геометрія.
   ========================================================================== */

/* ---------- 1. Фото для 3D-вітрини ----------------------------------------
   Покладіть файли у папку /assets і за потреби змініть шляхи.
   Якщо файлу немає — 3D-модель працює на заглушках: процедурне дерево,
   а силует підставки обводиться з макета села.

   starFront    — фронтальне фото зірки. Квадрат 1:1, зірка займає весь кадр
                  (кінчики променів торкаються країв), фон прозорий або будь-який
                  — по контуру зірки його все одно обріже 3D-форма.
   starBack     — те саме для зворотного боку.
   villageStand — фото силуету підставки спереду, PNG З ПРОЗОРИМ ФОНОМ, обрізане
                  впритул. З нього 3D-силует обводиться АВТОМАТИЧНО (1-в-1 з виробом),
                  і воно ж стає текстурою «Заготовки».
   textures     — фото текстури фанери (без виробу, просто дерево крупним планом):
                  face — лицьова поверхня, edge — торець/зріз фанери. Тайляться.
   calib        — точне підганяння фото під 3D-контур (масштаб/зсув/поворот).
--------------------------------------------------------------------------- */
/* ---------- Фото готових розписаних зірок ------------------------------
   Файли: public/images/painted/star-1.jpg … star-17.jpg (див. README.txt там же) + рядок у PAINTED_PHOTOS.files.
   Немає рядка — картка показує намальоване превʼю; є — справжнє фото з позначкою «Фото».
--------------------------------------------------------------------------- */
export const PAINTED_PHOTOS = {
  dir: 'public/images/painted/',
  /* Є фото — розкоментуй рядок (ключ = узор). Ні зайвих запитів, ні помилок 404. */
  files: {
    // rays: 'star-1.jpg', stripes: 'star-2.jpg', triangles: 'star-3.jpg', podillia: 'star-4.jpg',
    // hutsul: 'star-5.jpg', kalyna: 'star-6.jpg', kolosky: 'star-7.jpg', zirochky: 'star-8.jpg',
    // ruzha: 'star-9.jpg', pavuk: 'star-10.jpg', vyshyvanka: 'star-11.jpg', petrykivka: 'star-12.jpg',
    // moroz: 'star-13.jpg', merezhyvo: 'star-14.jpg', kosiv: 'star-15.jpg', hrona: 'star-16.jpg', pysanka: 'star-17.jpg',
  },
};

export const ASSETS = {
  // поки файлів немає — null (модель на процедурному дереві, жодних 404); є фото — впиши шлях
  starFront: null, // 'assets/star-front.png'
  starBack: null, // 'assets/star-back.png'
  villageStand: null, // 'assets/village-stand.png'
  textures: {
    face: null, // 'assets/textures/plywood-face.jpg'
    edge: null, // 'assets/textures/plywood-edge.jpg'
    repeatCm: 12, // скільки сантиметрів дерева вміщує одне фото текстури
  },
  calib: {
    front: { scale: 1, offsetX: 0, offsetY: 0, rotateDeg: 0 },
    back: { scale: 1, offsetX: 0, offsetY: 0, rotateDeg: 0 },
  },
  /* Референси для calibrate.html: кладіть сюди фото набору з лінійкою/збоку тощо.
     view: front | back | side | stand. Вони з’являться у списку інструмента калібрування. */
  references: [
    { view: 'front', src: 'assets/reference/star-front-ruler.jpg', note: 'зірка спереду з лінійкою' },
    { view: 'side', src: 'assets/reference/star-edge.jpg', note: 'торець — для товщини' },
    { view: 'stand', src: 'assets/reference/stand-front.jpg', note: 'підставка спереду' },
    { view: 'front', src: 'assets/photos/kit-raw-wood.webp', note: 'наявне фото (знято під кутом)' },
  ],
};

/* ---------- 2. Фарби набору (рівно 5) ----------------------------------- */
export const PAINTS = [
  { id: 'black', name: 'Чорний', hex: '#1C1C1C', dark: '#0d0d0d' },
  { id: 'red', name: 'Червоний', hex: '#B8292F', dark: '#8a1d22' },
  { id: 'white', name: 'Білий', hex: '#F8F6F0', dark: '#d9d5ca' },
  { id: 'green', name: 'Зелений', hex: '#1F4E3D', dark: '#143528' },
  { id: 'gold', name: 'Золотий', hex: '#D4AF37', dark: '#9c7a1b', metallic: true },
];
export const PAINT = Object.fromEntries(PAINTS.map((p) => [p.id, p]));

/* ---------- 3. Плейлист -------------------------------------------------
   Покладіть свої .mp3 у /audio з такими назвами (або змініть src).
   Поки файлу немає, грає м’яка синтезована «музична скринька» (заглушка).
--------------------------------------------------------------------------- */
export const PLAYLIST = [
  { title: 'Щедрик', note: 'щедрівка', src: 'audio/01-shchedryk.mp3', synth: { seed: 3, root: 64, mode: 'minor', bpm: 92 } },
  { title: 'Нова радість стала', note: 'колядка', src: 'audio/02-nova-radist.mp3', synth: { seed: 11, root: 62, mode: 'major', bpm: 76 } },
  { title: 'Добрий вечір тобі', note: 'колядка', src: 'audio/03-dobryi-vechir.mp3', synth: { seed: 7, root: 57, mode: 'minor', bpm: 70 } },
  { title: 'Різдвяні дзвіночки', note: 'інструментальна', src: 'audio/04-dzvinochky.mp3', synth: { seed: 19, root: 69, mode: 'major', bpm: 100 } },
];

/* ---------- 4. Геометрія зірки -------------------------------------------
   Одиниці: R = 100 = половина ширини зірки (17 см → 1 од. = 0,085 см).
   Ці числа підганяються під реальний виріб інструментом calibrate.html.
--------------------------------------------------------------------------- */
export const STAR = {
  sizeCm: 17,
  R: 100, // радіус кінчиків променів
  innerRatio: 0.54, // радіус «западин» між променями / R
  ringR: 43, // радіус круглого вікна
  hubR: 21, // наскільки близько до центру сходяться трикутні прорізи
  openingHalfDeg: 18, // половина кутової ширини прорізу на колі
  holeR: 2.6, // отвір / магніт у центрі
  rotateDeg: 0, // поворот усієї зірки (0 = промінь догори)
  thicknessCm: 0.4, // товщина фанери, см
  chamferCm: 0.06, // фаска по краях і прорізах, см
};

/* ---------- 4б. Підставка «Зимове село» ----------------------------------
   Плаский силует, вирізаний з фанери, що стоїть у пазу платформи;
   паличка зірки вставляється в паз платформи перед силуетом.
--------------------------------------------------------------------------- */
export const STAND = {
  widthCm: 15, // ширина силуету (без фото — масштаб береться з макета, ≈15 см)
  thicknessCm: 0.4, // товщина фанери силуету
  foot: { widthCm: 16, depthCm: 5.2, thicknessCm: 0.8 }, // платформа знизу
  groove: { depthCm: 0.3 }, // паз у платформі під силует
  stick: { widthCm: 1.1, thicknessCm: 0.35, slotDepthCm: 0.6, frontOffsetCm: 1.1 }, // паличка і її паз
  starCenterCm: null, // висота центру зірки над платформою; null = як у макеті майстерні
  photoHeightCm: null, // висота силуету на фото villageStand; null = за пропорціями фото
};

/* ---------- 5. Бренд ---------------------------------------------------- */
export const BRAND = {
  name: 'Lava Aroma Candles',
  product: 'Зірка оживає',
  hashtag: '#ЗіркаОживає',
};

