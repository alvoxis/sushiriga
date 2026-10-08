import type { Product } from '@/types';
import { ceptiRolliProducts } from './cepti-rolli';
import { doubleMixProducts } from './double-mix';
import { dzerieniProducts } from './dzerieni';
import { hosomakiProducts } from './hosomaki';
import { nigiriGunkanProducts } from './nigiri-gunkan';
import { pokeProducts } from './poke';
import { rolliProducts } from './rolli';
import { saucesProducts } from './sauces';
import { snacksProducts } from './snacks';
import { specialProducts } from './special';
import { sushiBurgerProducts } from './sushi-burger';
import { sushiSetiProducts } from './sushi-seti';
import { tempuraProducts } from './tempura';

export const products: Product[] = [
  ...sushiBurgerProducts,
  ...pokeProducts,
  ...nigiriGunkanProducts,
  ...hosomakiProducts,
  ...rolliProducts,
  ...ceptiRolliProducts,
  ...tempuraProducts,
  ...doubleMixProducts,
  ...specialProducts,
  ...sushiSetiProducts,
  ...dzerieniProducts,
  ...snacksProducts,
  ...saucesProducts,
];
