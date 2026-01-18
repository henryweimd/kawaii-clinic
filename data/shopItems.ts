import { ShopItem } from "../types";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'staff_nurse_cat',
    name: 'Nurse Meow-dred',
    description: 'A dedicated feline nurse who helps organize files. Earns 5 coins every 10 seconds.',
    cost: 150,
    type: 'staff',
    effect: 'passive_income',
    value: 5
  },
  {
    id: 'equip_stethoscope',
    name: 'Littmann-y Cricket',
    description: 'Listen closely! A cute parody of a famous stethoscope brand. Allows you to rule out one incorrect diagnosis per patient.',
    cost: 500,
    type: 'equipment',
    effect: 'remove_wrong'
  },
  {
    id: 'equip_scrubs',
    name: 'Figs & Berries Scrubs',
    description: 'Stylish, berry-scented scrubs that make you look professional. Purely cosmetic, but boosts confidence!',
    cost: 200,
    type: 'cosmetic',
    effect: 'none'
  },
  {
    id: 'equip_mri',
    name: 'Mew-MRI Scanner',
    description: 'A magnetic resonance imager shaped like a giant cat head. Increases coin rewards by 50% for correct diagnoses.',
    cost: 1200,
    type: 'equipment',
    effect: 'double_coins',
    value: 1.5
  },
  {
    id: 'staff_robo_doc',
    name: 'Da Vinci-chi Code Bot',
    description: 'A surgical robot that paints masterpieces while operating. Earns 20 coins every 10 seconds.',
    cost: 2500,
    type: 'staff',
    effect: 'passive_income',
    value: 20
  },
  {
    id: 'equip_butterfly',
    name: 'Butterfly iQ-tie',
    description: 'A handheld ultrasound that looks like a bow tie. Makes you look smart.',
    cost: 800,
    type: 'cosmetic',
    effect: 'none'
  }
];