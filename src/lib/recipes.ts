export interface Recipe {
  id: number;
  title: string;
  calories: number;
  time: string;
  category: string;
  image: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  linkedProducts?: string[];
}

export const recipes: Recipe[] = [
  {
    id: 1,
    title: 'Dada Ayam Panggang Brokoli',
    calories: 320,
    time: '25 Min',
    category: 'Tinggi Protein',
    image: 'https://i.pinimg.com/1200x/fe/19/07/fe19075eee7a794ab51564933bd047a5.jpg',
    description: 'Santapan cepat, kaya protein dan serat, ideal setelah berolahraga.',
    ingredients: ['200g Dada Ayam Fillet', '150g Brokoli Segar', '1 sdm Minyak Zaitun', 'Bawang Putih Bubuk', 'Garam & Merica Hitam'],
    instructions: [
      'Marinasi dada ayam dengan bawang putih, garam, dan merica.',
      'Potong brokoli kecil-kecil lalu kukus selama 5 menit.',
      'Panggang ayam di atas teflon dengan minyak zaitun hingga matang merata.',
      'Sajikan ayam dengan brokoli kukus.'
    ],
    linkedProducts: ['7', '1']
  },
  {
    id: 2,
    title: 'Sup Krim Jamur Rendah Lemak',
    calories: 180,
    time: '20 Min',
    category: 'Rendah Kalori',
    image: 'https://i.pinimg.com/1200x/cd/dc/57/cddc574f530aa7dcfef0e3eb400e6e93.jpg',
    description: 'Kehangatan sup jamur lezat menggunakan susu rendah lemak.',
    ingredients: ['250g Jamur Kancing', '200ml Susu Rendah Lemak', '1/2 Bawang Bombay, cincang', '1 sdt Kaldu Jamur', 'Peterseli segar'],
    instructions: [
      'Tumis bawang bombay hingga layu.',
      'Masukkan jamur kancing, tumis hingga matang.',
      'Tuang susu rendah lemak, masukkan kaldu jamur. Masak hingga mendidih.',
      'Taburi peterseli cincang sebelum disajikan.'
    ],
    linkedProducts: ['11']
  },
  {
    id: 3,
    title: 'Salad Sayur Quinoa',
    calories: 250,
    time: '15 Min',
    category: 'Vegan',
    image: 'https://i.pinimg.com/1200x/33/f8/f4/33f8f48de9f4ccf84d928ea949489605.jpg',
    description: 'Salad segar dengan sayuran organik pilihan dan quinoa superfood.',
    ingredients: ['100g Quinoa matang', '50g Tomat Ceri', '50g Timun, potong dadu', 'Daun Selada', 'Saus Lemon & Olive Oil'],
    instructions: [
      'Siapkan quinoa yang telah dimasak di dalam mangkuk.',
      'Tambahkan tomat ceri, timun potong dadu, dan daun selada cincang.',
      'Siram dengan saus lemon dan olive oil.',
      'Aduk rata dan nikmati segar.'
    ],
    linkedProducts: ['12']
  },
  {
    id: 4,
    title: 'Oatmeal Buah Berry',
    calories: 220,
    time: '10 Min',
    category: 'Sarapan',
    image: 'https://i.pinimg.com/1200x/1f/ec/32/1fec323bb5161251df93868e5dcb2dc4.jpg',
    description: 'Sarapan hangat dengan rolled oats dan campuran berry segar tinggi antioksidan.',
    ingredients: ['50g Rolled Oats', '150ml Susu Almond', 'Segenggam Blueberry & Strawberry', '1 sdm Madu', 'Kacang Almond iris'],
    instructions: [
      'Masak oat dengan susu almond hingga mengental.',
      'Tuangkan ke dalam mangkuk.',
      'Tambahkan buah berry dan taburan almond di atasnya.',
      'Beri madu sesuai selera.'
    ],
    linkedProducts: ['13']
  },
  {
    id: 5,
    title: 'Pancake Pisang Gandum',
    calories: 280,
    time: '15 Min',
    category: 'Sarapan',
    image: 'https://i.pinimg.com/736x/2f/2f/2c/2f2f2c0f5fed348aae287952049d08a3.jpg',
    description: 'Pancake sehat tanpa gula tambahan, menggunakan kemanisan alami pisang matang.',
    ingredients: ['1 Buah Pisang Matang', '1 Butir Telur', '30g Tepung Gandum', '1/2 sdt Kayu Manis Bubuk', 'Madu'],
    instructions: [
      'Lumatkan pisang menggunakan garpu.',
      'Campur semua bahan (telur, tepung, kayu manis) ke dalam kocokan pisang.',
      'Masak adonan di teflon kecil berbentuk pancake hingga kecoklatan.',
      'Angkat dan sajikan dengan sedikit madu.'
    ],
    linkedProducts: ['6', '15']
  },
  {
    id: 6,
    title: 'Tumis Tahu Tauge',
    calories: 160,
    time: '10 Min',
    category: 'Vegan',
    image: 'https://i.pinimg.com/736x/e8/88/dc/e888dcab4760adf7f61ae02007b0adc1.jpg',
    description: 'Lauk sederhana bernutrisi tinggi, diproses dengan cara tumis yang cepat.',
    ingredients: ['150g Tahu Putih', '100g Tauge Segar', '2 Siung Bawang Merah & Putih', '1 sdm Kecap Asin', 'Minyak kelapa untuk menumis'],
    instructions: [
      'Potong tahu dadu kecil, lalu goreng setengah matang (opsional).',
      'Tumis irisan bawang hingga harum.',
      'Masukkan tahu dan tauge, aduk cepat.',
      'Tambahkan kecap asin. Angkat sebelum tauge terlalu layu.'
    ],
    linkedProducts: ['14']
  },
  {
    id: 7,
    title: 'Salmon Panggang Lemon',
    calories: 410,
    time: '20 Min',
    category: 'Tinggi Protein',
    image: 'https://i.pinimg.com/1200x/13/42/f9/1342f9618f50254c24c7b7dfe785887e.jpg',
    description: 'Kaya Omega-3, panggang salmon simple dengan ekstrak lemon murni.',
    ingredients: ['1 Potong Salmon (150g)', 'Perasan 1/2 Buah Lemon', 'Garam, Lada Hitam', 'Sejumput Rosemary'],
    instructions: [
      'Baluri salmon dengan perasan lemon, garam, dan lada hitam.',
      'Panggang salmon pada suhu 180°C selama 12-15 menit.',
      'Taburkan rosemary beberapa saat sebelum diangkat.',
      'Sajikan bersama sayuran favorit.'
    ],
    linkedProducts: ['16']
  },
  {
    id: 8,
    title: 'Smoothie Apel Pisang',
    calories: 120,
    time: '5 Min',
    category: 'Detoks',
    image: 'https://i.pinimg.com/736x/6c/f2/ca/6cf2ca1d6c19a966eac64741a91b580a.jpg',
    description: 'Minuman lumer menyegarkan kombinasi apel hijau manis dan pisang lembut.',
    ingredients: ['1 Buah Apel Hijau', '1 Buah Pisang Matang', '150ml Susu Almond', '1 sdt Madu'],
    instructions: [
      'Potong buah apel dan pisang menjadi ukuran kecil.',
      'Masukkan potongan buah ke dalam blender bersama susu almond.',
      'Tambahkan madu untuk pemanis alami, lalu blender hingga halus.',
      'Sajikan dingin agar lebih nikmat.'
    ],
    linkedProducts: ['2', '4']
  },
  {
    id: 9,
    title: 'Pepes Tahu Kemangi',
    calories: 140,
    time: '25 Min',
    category: 'Rendah Kalori',
    image: 'https://i.pinimg.com/1200x/c4/44/22/c44422934ff48a8690a69e48a984a154.jpg',
    description: 'Tahu lembut kukus dengan aroma kemangi segar yang harum dan menggugah selera.',
    ingredients: ['200g Tahu Putih', 'Genggam Daun Kemangi', '1 Butir Telur', 'Daun Pisang untuk membungkus', 'Bumbu Halus (Bawang, Cabai, Kemiri)'],
    instructions: [
      'Hancurkan tahu putih hingga halus.',
      'Campurkan tahu dengan bumbu halus, daun kemangi, dan telur.',
      'Bungkus adonan dengan daun pisang dan sematkan lidi.',
      'Kukus selama 20 menit hingga matang sempurna, lalu sajikan harum.'
    ],
    linkedProducts: ['14']
  },
  {
    id: 10,
    title: 'Puding Chia Santan',
    calories: 210,
    time: ' Overnight',
    category: 'Cemilan Sehat',
    image: 'https://i.pinimg.com/736x/5c/85/8d/5c858dd11c0d086b457abfc6551842be.jpg',
    description: 'Puding manis menyegarkan kaya antioksidan dan Omega-3, ramah vegan.',
    ingredients: ['3 sdm Chia Seeds', '150ml Santan Cair', '1 sdt Sirup Maple', 'Buah Segar (Mangga / Nanas)'],
    instructions: [
      'Aduk rata chia seeds dan santan bersama sirup maple dalam wadah.',
      'Diamkan di lemari es semalaman.',
      'Tambahkan potongan buah mangga atau nanas segar sebagai topping saat disajikan.'
    ],
    linkedProducts: ['5']
  }
];
