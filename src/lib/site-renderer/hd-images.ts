import { ikUrl } from "@/lib/images/imagekit";
import { CATALOG_BY_SLUG } from "@/lib/categories/catalog";

/**
 * Free HD image source — no API key required.
 * Uses direct images.unsplash.com photo IDs (stable, CDN-cached, HD) with a
 * deterministic seeded pick so each site/section gets a different but
 * on-category set. Falls back to picsum.photos (also free, no key).
 */

const POOLS: Record<string, string[]> = {
  astrologer: ["photo-1446776811953-b23d57bd21aa", "photo-1462331940025-496dfbfc7564", "photo-1419242902214-272b3f66ee7a", "photo-1444703686981-a3abbc4d4fe3", "photo-1464802686167-b939a6910659", "photo-1519681393784-d120267933ba"],
  grocery: ["photo-1542838132-92c53300491e", "photo-1543168256-418811576931", "photo-1579113800032-c38bd7635818", "photo-1519996529931-28324d1a630e", "photo-1540340061722-9293d5163008", "photo-1566385101042-1a0aa0c1268c"],
  music: ["photo-1511671782779-c97d3d27a1d4", "photo-1511379938547-c1f69419868d", "photo-1510915361894-db8b60106cb1", "photo-1516280440614-37939bbacd81", "photo-1520523839897-bd0b52f945a0", "photo-1514320291840-2e0a9bf2a9ae"],
  pet: ["photo-1450778869180-41d0601e046e", "photo-1548199973-03cce0bbc87b", "photo-1583337130417-3346a1be7dee", "photo-1514888286974-6c03e2ca1dba", "photo-1587300003388-59208cc962cb", "photo-1537151625747-768eb6cf92b2"],
  construction: ["photo-1541888946425-d81bb19240f5", "photo-1504307651254-35680f356dfd", "photo-1503387762-592deb58ef4e", "photo-1486406146926-c627a92ad1ab", "photo-1487958449943-2429e8be8625", "photo-1497366811353-6870744d04b2"],
  law: ["photo-1589829545856-d10d557cf95f", "photo-1450101499163-c8848c66ca85", "photo-1505664194779-8beaceb93744", "photo-1521587760476-6c12a4b040da", "photo-1497366754035-f200968a6e72", "photo-1454165804606-c3d57bc86b40"],
  restaurant: ["photo-1517248135467-4c7edcad34c4", "photo-1552566626-52f8b828add9", "photo-1414235077428-338989a2e8c0", "photo-1466978913421-dad2ebd01d17", "photo-1555396273-367ea4eb4db5", "photo-1424847651672-bf20a4b0982b"],
  cafe: ["photo-1445116572660-236099ec97a0", "photo-1495474472287-4d71bcdd2085", "photo-1501339847302-ac426a4a7cbb", "photo-1509042239860-f550ce710b93", "photo-1453614512568-c4024d13c247", "photo-1521017432531-fbd92d768814"],
  bakery: ["photo-1509440159596-0249088772ff", "photo-1486427944299-d1955d23e34d", "photo-1587248720327-8eb72564be1e", "photo-1517433670267-08bbd4be890f", "photo-1555507036-ab1f4038808a", "photo-1464195244916-405fa0a82545"],
  gym: ["photo-1534438327276-14e5300c3a48", "photo-1571019613454-1cb2f99b2d8b", "photo-1517836357463-d25dfeac3438", "photo-1583454110551-21f2fa2afe61", "photo-1581009146145-b5ef050c2e1e", "photo-1594737625785-a6cbdabd333c"],
  fitness: ["photo-1517836357463-d25dfeac3438", "photo-1518611012118-696072aa579a", "photo-1544367567-0f2fcb009e0b", "photo-1552674605-db6ffd4facb5", "photo-1540497077202-7c8a3999166f", "photo-1571019614242-c5c5dee9f50b"],
  yoga: ["photo-1518611012118-696072aa579a", "photo-1544367567-0f2fcb009e0b", "photo-1506126613408-eca07ce68773", "photo-1552196563-55cd4e45efb3", "photo-1599901860904-17e6ed7083a0", "photo-1545205597-3d9d02c29597"],
  salon: ["photo-1560066984-138dadb4c035", "photo-1522337360788-8b13dee7a37e", "photo-1580618672591-eb180b1a973f", "photo-1487412947147-5cebf100ffc2", "photo-1595476108010-b4d1f102b1b1", "photo-1519415510236-718bdfcd89c8"],
  spa: ["photo-1544161515-4ab6ce6db874", "photo-1600334089648-b0d9d3028eb2", "photo-1540555700478-4be289fbecef", "photo-1512290923902-8a9f81dc236c", "photo-1596178065887-1198b6148b2b", "photo-1519823551278-64ac92734fb1"],
  clinic: ["photo-1519494026892-80bbd2d6fd0d", "photo-1576091160399-112ba8d25d1d", "photo-1631217868264-e5b90bb7e133", "photo-1579684385127-1ef15d508118", "photo-1538108149393-fbbd81895907", "photo-1584982751601-97dcc096659c"],
  dental: ["photo-1606811971618-4486d14f3f99", "photo-1588776814546-1ffcf47267a5", "photo-1629909613654-28e377c37b09", "photo-1609840114035-3c981b782dfe", "photo-1598256989800-fe5f95da9787", "photo-1590424693420-f0e9f0d0e5f6"],
  fashion: ["photo-1490481651871-ab68de25d43d", "photo-1441984904996-e0b6ba687e04", "photo-1483985988355-763728e1935b", "photo-1469334031218-e382a71b716b", "photo-1479064555552-3ef4979f8908", "photo-1445205170230-053b83016050"],
  jewellery: ["photo-1515562141207-7a88fb7ce338", "photo-1605100804763-247f67b3557e", "photo-1611591437281-460bfbe1220a", "photo-1599643478518-a784e5dc4c8f", "photo-1602173574767-37ac01994b2a", "photo-1584302179602-e4c3d3fd629d"],
  electronics: ["photo-1550009158-9ebf69173e03", "photo-1498049794561-7780e7231661", "photo-1526170375885-4d8ecf77b99f", "photo-1523206489230-c012c64b2b48", "photo-1517336714731-489689fd1ca8", "photo-1587829741301-dc798b83add3"],
  hotel: ["photo-1566073771259-6a8506099945", "photo-1445019980597-93fa8acb246c", "photo-1618773928121-c32242e63f39", "photo-1590490360182-c33d57733427", "photo-1571003123894-1f0594d2b5d9", "photo-1582719478250-c89cae4dc85b"],
  travel: ["photo-1476514525535-07fb3b4ae5f1", "photo-1501785888041-af3ef285b470", "photo-1469854523086-cc02fe5d8800", "photo-1500835556837-99ac94a94552", "photo-1508672019048-805c876b67e2", "photo-1503220317375-aaad61436b1b"],
  photography: ["photo-1502920917128-1aa500764cbd", "photo-1452587925148-ce544e77e70d", "photo-1516035069371-29a1b244cc32", "photo-1554048612-b6a482bc67e5", "photo-1500051638674-ff996a0ec29e", "photo-1510127034890-ba27508e9f1c"],
  agency: ["photo-1497366216548-37526070297c", "photo-1522071820081-009f0129c71c", "photo-1552664730-d307ca884978", "photo-1531482615713-2afd69097998", "photo-1600880292203-757bb62b4baf", "photo-1542744173-8e7e53415bb0"],
  business: ["photo-1497366811353-6870744d04b2", "photo-1600880292089-90a7e086ee0c", "photo-1454165804606-c3d57bc86b40", "photo-1521737604893-d14cc237f11d", "photo-1556761175-b413da4baf72", "photo-1573164713988-8665fc963095"],
  realestate: ["photo-1560518883-ce09059eeffa", "photo-1600596542815-ffad4c1539a9", "photo-1512917774080-9991f1c4c750", "photo-1600607687939-ce8a6c25118c", "photo-1613490493576-7fde63acd811", "photo-1580587771525-78b9dba3b914"],
  interior: ["photo-1618221195710-dd6b41faaea6", "photo-1616486338812-3dadae4b4ace", "photo-1586023492125-27b2c045efd7", "photo-1600210492486-724fe5c67fb0", "photo-1493809842364-78817add7ffb", "photo-1567016432779-094069958ea5"],
  wedding: ["photo-1519741497674-611481863552", "photo-1465495976277-4387d4b0b4c6", "photo-1511285560929-80b456fea0bc", "photo-1478146896981-b80fe463b330", "photo-1519225421980-715cb0215aed", "photo-1583939003579-730e3918a45a"],
  education: ["photo-1503676260728-1c00da094a0b", "photo-1523050854058-8df90110c9f1", "photo-1509062522246-3755977927d7", "photo-1427504494785-3a9ca7044f45", "photo-1541339907198-e08756dedf3f", "photo-1546410531-bb4caa6b424d"],
  automotive: ["photo-1503376780353-7e6692767b70", "photo-1492144534655-ae79c964c9d7", "photo-1552519507-da3b142c6e3d", "photo-1494976388531-d1058494cdd8", "photo-1583121274602-3e2820c69888", "photo-1511919884226-fd3cad34687c"],
  ecommerce: ["photo-1607082348824-0a96f2a4b9da", "photo-1556742049-0cfed4f6a45d", "photo-1472851294608-062f824d29cc", "photo-1483985988355-763728e1935b", "photo-1441986300917-64674bd600d8", "photo-1445205170230-053b83016050"],
  saas: ["photo-1551288049-bebda4e38f71", "photo-1460925895917-afdab827c52f", "photo-1504384308090-c894fdcc538d", "photo-1526628953301-3e589a6a8b74", "photo-1519389950473-47ba0277781c", "photo-1517245386807-bb43f82c33c4"],
};

const GENERIC = [
  "photo-1497366811353-6870744d04b2",
  "photo-1522071820081-009f0129c71c",
  "photo-1600880292203-757bb62b4baf",
  "photo-1531973576160-7125cd663d86",
  "photo-1542744173-8e7e53415bb0",
  "photo-1553877522-43269d4ea984",
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function poolFor(category?: string) {
  const key = (category ?? "").toLowerCase().replace(/\s+/g, "-");
  if (POOLS[key]) return POOLS[key];
  const pack = CATALOG_BY_SLUG[key]?.pack ?? key;
  const aliases: Record<string, string> = { "gym-trainer": "gym", doctor: "clinic", "doctor-clinic": "clinic", dentist: "dental", "kirana": "grocery", "mehndi-art": "wedding", "coaching-center": "education", "real-estate": "realestate", "boutique": "fashion", "makeup": "salon", "digital-agency": "agency", "marketing-agency": "agency", "consulting": "business", "finance": "business", "cleaning": "interior", "packers-movers": "business", "event-decorator": "wedding", "tour-operator": "travel", "boutique-hotel": "hotel", "barber": "salon", "tutor": "education", "startup": "saas", "photographer-wedding": "wedding" };
  const mapped = aliases[pack] ?? pack;
  if (POOLS[mapped]) return POOLS[mapped];
  const hit = Object.keys(POOLS).find((k) => key.includes(k) || k.includes(key));
  return hit ? POOLS[hit] : GENERIC;
}

/** Single deterministic HD photo for a category + seed. */
export function hdImage(category?: string, seed = "", w = 1600): string {
  const pool = poolFor(category);
  const id = pool[hash(seed || category || "x") % pool.length];
  return ikUrl(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`, { w });
}

/** N distinct HD photos for a category, rotated by seed. */
export function hdImages(category: string | undefined, count: number, seed = "", w = 1600): string[] {
  const pool = poolFor(category);
  const start = hash(seed || "s") % pool.length;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = pool[(start + i) % pool.length];
    out.push(ikUrl(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`, { w }));
  }
  return out;
}

/** Keyless fallback (used if an unsplash id ever 404s). */
export function fallbackImage(seed: string, w = 1600, h = 1000) {
  return ikUrl(`https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`, { w, h });
}
