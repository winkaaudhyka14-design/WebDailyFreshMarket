import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SaleItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  user: string;
  date: string;
  total: number;
  status: string;
  items: SaleItem[];
}

export const INITIAL_SALES: Sale[] = [
  { id: 'TRX-001', user: 'budi@gmail.com', date: '2026-05-25 08:30', total: 109000, status: 'Selesai', items: [{ productName: 'Fillet Salmon Segar', quantity: 1, price: 85000 }, { productName: 'Apel Fuji Segar', quantity: 2, price: 12000 }] },
  { id: 'TRX-002', user: 'ani@gmail.com', date: '2026-05-25 09:15', total: 71000, status: 'Diproses', items: [{ productName: 'Dada Ayam Fillet Frozen', quantity: 2, price: 25000 }, { productName: 'Wortel Berastagi Segar', quantity: 2, price: 8000 }, { productName: 'Bayam Cabut Segar', quantity: 1, price: 5000 }] },
  { id: 'TRX-003', user: 'siti@gmail.com', date: '2026-05-24 14:20', total: 198000, status: 'Selesai', items: [{ productName: 'Sosis Sapi Bakar', quantity: 5, price: 30000 }, { productName: 'Kentang Goreng (Shoestring)', quantity: 2, price: 14000 }, { productName: 'Strawberry Manis', quantity: 1, price: 20000 }] },
  { id: 'TRX-004', user: 'dono@gmail.com', date: '2026-05-24 16:45', total: 45000, status: 'Selesai', items: [{ productName: 'Brokoli Hijau Segar', quantity: 3, price: 15000 }] },
];

export async function seedMissingSales() {
  try {
    const currentSnapshot = await getDocs(collection(db, 'sales'));
    const currentIds = currentSnapshot.docs.map(doc => doc.id);
    for (const s of INITIAL_SALES) {
      await setDoc(doc(db, 'sales', s.id), s);
    }
  } catch (error) {
    console.error("Error seeding sales", error);
  }
}

export async function getSales(): Promise<Sale[]> {
  const querySnapshot = await getDocs(collection(db, 'sales'));
  const sales: Sale[] = [];
  querySnapshot.forEach((doc) => {
    sales.push(doc.data() as Sale);
  });
  
  return sales.sort((a, b) => b.id.localeCompare(a.id));
}

export async function addSale(sale: Sale) {
  await setDoc(doc(db, 'sales', sale.id), sale);
}

export async function updateExistingSale(sale: Sale) {
  await updateDoc(doc(db, 'sales', sale.id), { ...sale });
}

export async function deleteSaleRecord(id: string) {
  await deleteDoc(doc(db, 'sales', id));
}
