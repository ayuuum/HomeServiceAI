import { Service, ServiceOption } from "@/types/booking";
import serviceAircon from "@/assets/service-aircon.jpg";
import serviceKitchen from "@/assets/service-kitchen.jpg";
import serviceBathroom from "@/assets/service-bathroom.jpg";
import servicePcRepair from "@/assets/service-pc-repair.jpg";

export const mockServices: Service[] = [
  {
    id: "1",
    title: "エアコンクリーニング",
    description: "プロの技術でエアコンを徹底洗浄。カビや汚れをすっきり除去します。",
    basePrice: 12000,
    duration: 90,
    imageUrl: serviceAircon,
    category: "cleaning",
  },
  {
    id: "2",
    title: "キッチン掃除",
    description: "油汚れや水垢を専門機材で徹底クリーニング。ピカピカのキッチンに。",
    basePrice: 15000,
    duration: 120,
    imageUrl: serviceKitchen,
    category: "cleaning",
  },
  {
    id: "3",
    title: "バスルームクリーニング",
    description: "カビ・水垢・石鹸カスを完全除去。清潔で快適なバスルームへ。",
    basePrice: 13000,
    duration: 100,
    imageUrl: serviceBathroom,
    category: "cleaning",
  },
  {
    id: "4",
    title: "出張パソコン修理",
    description: "ご自宅でパソコンのトラブルを解決。データも安心です。",
    basePrice: 8000,
    duration: 60,
    imageUrl: servicePcRepair,
    category: "repair",
  },
];

export const mockServiceOptions: Record<string, ServiceOption[]> = {
  "1": [
    {
      id: "opt-1-1",
      serviceId: "1",
      title: "お掃除機能付きエアコン",
      price: 5000,
      description: "お掃除機能付きエアコンの追加料金",
    },
    {
      id: "opt-1-2",
      serviceId: "1",
      title: "防カビコート",
      price: 2000,
      description: "カビの発生を抑える特殊コーティング",
    },
    {
      id: "opt-1-3",
      serviceId: "1",
      title: "室外機洗浄",
      price: 3000,
      description: "室外機も一緒にクリーニング",
    },
  ],
  "2": [
    {
      id: "opt-2-1",
      serviceId: "2",
      title: "換気扇分解洗浄",
      price: 4000,
      description: "換気扇を分解して徹底洗浄",
    },
    {
      id: "opt-2-2",
      serviceId: "2",
      title: "魚焼きグリル洗浄",
      price: 2000,
      description: "手が届きにくいグリル内部をクリーニング",
    },
  ],
  "3": [
    {
      id: "opt-3-1",
      serviceId: "3",
      title: "防カビコーティング",
      price: 3000,
      description: "カビの再発を防ぐコーティング施工",
    },
    {
      id: "opt-3-2",
      serviceId: "3",
      title: "鏡のウロコ取り",
      price: 2000,
      description: "頑固な水垢を専門技術で除去",
    },
  ],
  "4": [
    {
      id: "opt-4-1",
      serviceId: "4",
      title: "データバックアップ",
      price: 3000,
      description: "大切なデータをバックアップ",
    },
    {
      id: "opt-4-2",
      serviceId: "4",
      title: "ウイルス駆除",
      price: 5000,
      description: "ウイルス・マルウェアの完全除去",
    },
  ],
};
