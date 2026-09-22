import type { StaticImageData } from "next/image";
import az110 from "../../assets/characters/AZ110/online.png";
import cp100 from "../../assets/characters/CP100/online.png";
import gj200 from "../../assets/characters/GJ200/online.png";
import kl400 from "../../assets/characters/KL400/online.png";
import mj100 from "../../assets/characters/MJ100/online.png";
import nc200 from "../../assets/characters/NC200/online.png";
import oa400 from "../../assets/characters/OA400/online.png";
import pl500 from "../../assets/characters/PL500/online.png";

type Character = { model: string; image: StaticImageData };

const characters: Character[] = [
  { model: "AZ110", image: az110 },
  { model: "CP100", image: cp100 },
  { model: "GJ200", image: gj200 },
  { model: "KL400", image: kl400 },
  { model: "MJ100", image: mj100 },
  { model: "NC200", image: nc200 },
  { model: "OA400", image: oa400 },
  { model: "PL500", image: pl500 },
];

function hash(value: string) {
  return [...value].reduce((total, character) => ((total * 31) + character.charCodeAt(0)) >>> 0, 0);
}

export function characterFor(username: string): Character {
  return characters[hash(username) % characters.length];
}
