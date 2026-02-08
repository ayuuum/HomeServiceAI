// ハウスクリーニング向けサービステンプレート
export interface ServiceTemplate {
    id: string;
    title: string;
    description: string;
    basePrice: number;
    duration: number; // 分
    category: string;
    isPopular?: boolean;
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
    {
        id: 'aircon',
        title: 'エアコンクリーニング',
        description: '内部の汚れやカビを徹底洗浄。効きが良くなり、電気代節約にも。',
        basePrice: 12000,
        duration: 90,
        category: 'エアコン',
        isPopular: true,
    },
    {
        id: 'kitchen',
        title: 'キッチンクリーニング',
        description: '換気扇・コンロ・シンクの油汚れをピカピカに。',
        basePrice: 15000,
        duration: 120,
        category: 'キッチン',
        isPopular: true,
    },
    {
        id: 'bathroom',
        title: '浴室クリーニング',
        description: '水垢・カビを徹底除去。鏡もピカピカに仕上げます。',
        basePrice: 18000,
        duration: 120,
        category: '水回り',
        isPopular: true,
    },
    {
        id: 'toilet',
        title: 'トイレクリーニング',
        description: '便器・床・壁の汚れを隅々までクリーニング。',
        basePrice: 8000,
        duration: 60,
        category: '水回り',
    },
    {
        id: 'washroom',
        title: '洗面所クリーニング',
        description: '洗面台・鏡・床を清潔に。',
        basePrice: 8000,
        duration: 60,
        category: '水回り',
    },
    {
        id: 'water-set',
        title: '水回りセット',
        description: '浴室・トイレ・洗面所をまとめてキレイに。セット割引でお得！',
        basePrice: 30000,
        duration: 180,
        category: '水回り',
        isPopular: true,
    },
    {
        id: 'range-hood',
        title: 'レンジフードクリーニング',
        description: '分解洗浄で頑固な油汚れもスッキリ。',
        basePrice: 15000,
        duration: 90,
        category: 'キッチン',
    },
    {
        id: 'whole-house',
        title: 'まるごとハウスクリーニング',
        description: 'お部屋全体をプロの手で徹底クリーニング。',
        basePrice: 50000,
        duration: 300,
        category: '全体',
    },
];

export const SERVICE_CATEGORIES = [
    'エアコン',
    'キッチン',
    '水回り',
    '全体',
] as const;
