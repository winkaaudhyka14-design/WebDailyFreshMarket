import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface Product {
  id: string;
  name: string;
  category: string;
  tgl_masuk: string;
  tgl_expired: string;
  description?: string;
  imageUrls: string[];
  price?: number;
  stock?: number;
}

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Brokoli Hijau Segar', category: 'Sayuran', tgl_masuk: '2026-05-18', tgl_expired: '2026-06-01', imageUrls: ['https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=800&q=80'], description: 'Brokoli segar hijau, dipanen langsung dari kebun lokal. Kaya akan vitamin C dan K.', price: 15000, stock: 45 },
  { id: '2', name: 'Bayam Cabut Segar', category: 'Sayuran', tgl_masuk: '2026-05-18', tgl_expired: '2026-05-25', imageUrls: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=80'], description: 'Bayam segar kaya akan zat besi, dipanen dari petani organik lokal.', price: 5000, stock: 30 },
  { id: '3', name: 'Wortel Berastagi Segar', category: 'Sayuran', tgl_masuk: '2026-05-18', tgl_expired: '2026-06-10', imageUrls: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80'], description: 'Wortel berkualitas tinggi dari dataran tinggi, kaya vitamin A untuk kesehatan mata.', price: 8000, stock: 65 },
  { id: '4', name: 'Apel Fuji Segar', category: 'Buah', tgl_masuk: '2026-05-19', tgl_expired: '2026-06-15', imageUrls: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?auto=format&fit=crop&w=800&q=80'], description: 'Apel Fuji segar manis, tekstur garing dan sangat menyegarkan.', price: 12000, stock: 120 },
  { id: '5', name: 'Mangga Arumanis Segar', category: 'Buah', tgl_masuk: '2026-05-19', tgl_expired: '2026-05-28', imageUrls: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80'], description: 'Mangga arumanis pilihan dengan rasa manis sempurna dan tanpa serat.', price: 18000, stock: 40 },
  { id: '6', name: 'Pisang Cavendish', category: 'Buah', tgl_masuk: '2026-05-19', tgl_expired: '2026-05-24', imageUrls: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=800&q=80'], description: 'Pisang Cavendish manis dan tinggi kalium, sumber energi instan yang lezat.', price: 10000, stock: 55 },
  { id: '7', name: 'Dada Ayam Fillet Frozen', category: 'Daging', tgl_masuk: '2026-05-15', tgl_expired: '2026-11-15', imageUrls: ['https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80'], description: 'Dada ayam tanpa tulang beku siap diolah. Sangat pas untuk menu diet protein tinggi.', price: 25000, stock: 20 },
  { id: '8', name: 'Sayap Ayam (Wings) Frozen', category: 'Daging', tgl_masuk: '2026-05-15', tgl_expired: '2026-11-15', imageUrls: ['https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80'], description: 'Sayap ayam beku, mudah dimasak untuk sajian chicken wings di rumah.', price: 28000, stock: 15 },
  { id: '9', name: 'Kentang Goreng (Shoestring)', category: 'Cemilan', tgl_masuk: '2026-05-18', tgl_expired: '2027-02-18', imageUrls: ['https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80'], description: 'Kentang goreng beku tipe lurus tipis, enak dan gurih untuk cemilan santai.', price: 14000, stock: 80 },
  { id: '10', name: 'Sosis Sapi Bakar', category: 'Cemilan', tgl_masuk: '2026-05-20', tgl_expired: '2026-12-20', imageUrls: ['https://images.unsplash.com/photo-1628292850383-e28acdba88b4?auto=format&fit=crop&w=800&q=80'], description: 'Sosis sapi dengan rasa kaldu mantap, sangat cocok dibakar, digoreng, atau dibuat campuran sup.', price: 30000, stock: 35 },
  { id: '11', name: 'Jamur Kancing Segar', category: 'Jamur', tgl_masuk: '2026-05-22', tgl_expired: '2026-05-29', imageUrls: ['https://images.unsplash.com/photo-1596766099513-33fd32f170e7?auto=format&fit=crop&w=800&q=80'], description: 'Jamur kancing segar, sumber vitamin B dan rendah lemak.', price: 11000, stock: 25 },
  { id: '12', name: 'Tomat Segar', category: 'Sayuran', tgl_masuk: '2026-05-23', tgl_expired: '2026-06-05', imageUrls: ['https://images.unsplash.com/photo-1558818498-28c1e002b655?auto=format&fit=crop&w=800&q=80'], description: 'Tomat ceri merah segar yang kaya akan antioksidan lycopene.', price: 9000, stock: 50 },
  { id: '13', name: 'Strawberry Manis', category: 'Buah', tgl_masuk: '2026-05-23', tgl_expired: '2026-05-30', imageUrls: ['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=800&q=80'], description: 'Buah strawberry merah merona manis sedikit asam.', price: 20000, stock: 18 },
  { id: '14', name: 'Tahu Sutra Putih', category: 'Sayuran', tgl_masuk: '2026-05-24', tgl_expired: '2026-05-30', imageUrls: ['https://images.unsplash.com/photo-1582283594248-2617789326eb?auto=format&fit=crop&w=800&q=80'], description: 'Tahu putih lembut berbahan dasar kedelai asli.', price: 6000, stock: 40 },
  { id: '15', name: 'Telur Ayam', category: 'Daging', tgl_masuk: '2026-05-20', tgl_expired: '2026-06-10', imageUrls: ['https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=80'], description: 'Telur ayam negeri pilihan dengan kandungan protein tinggi.', price: 28000, stock: 90 },
  { id: '16', name: 'Fillet Salmon Segar', category: 'Daging', tgl_masuk: '2026-05-24', tgl_expired: '2026-05-31', imageUrls: ['https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=800&q=80'], description: 'Potongan fillet salmon premium kaya Omega-3.', price: 85000, stock: 12 },
];

export async function seedMissingProducts() {
  try {
    const currentSnapshot = await getDocs(collection(db, 'products'));
    const currentIds = currentSnapshot.docs.map(doc => doc.id);
    for (const p of INITIAL_PRODUCTS) {
      if (!currentIds.includes(p.id)) {
        await setDoc(doc(db, 'products', p.id), p);
      }
    }
  } catch (error) {
    console.error("Error seeding products", error);
  }
}

export async function getProducts(): Promise<Product[]> {
  const querySnapshot = await getDocs(collection(db, 'products'));
  const products: Product[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as Product;
    
    if (data.price === undefined) {
      const initialMatch = INITIAL_PRODUCTS.find(p => p.id === data.id);
      data.price = initialMatch && initialMatch.price !== undefined ? initialMatch.price : 0;
    }

    if (data.stock === undefined) {
      const initialMatch = INITIAL_PRODUCTS.find(p => p.id === data.id);
      data.stock = initialMatch && initialMatch.stock !== undefined ? initialMatch.stock : 0;
    }
    
    products.push(data);
  });
  
  return products.sort((a, b) => parseInt(a.id) - parseInt(b.id));
}

export async function addProduct(product: Product) {
  await setDoc(doc(db, 'products', product.id), product);
}

export async function updateExistingProduct(product: Product) {
  await updateDoc(doc(db, 'products', product.id), { ...product });
}

export async function deleteProductRecord(id: string) {
  await deleteDoc(doc(db, 'products', id));
}
