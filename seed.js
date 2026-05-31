import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

const configRaw = fs.readFileSync("firebase-applet-config.json", "utf8");
const config = JSON.parse(configRaw);

// Use the explicit AI Studio database id if present
const firebaseConfig = {
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, config.firestoreDatabaseId);

const INITIAL_PRODUCTS = [
  { id: '1', name: 'Brokoli Hijau Segar', category: 'Sayuran', tgl_masuk: '2026-05-18', tgl_expired: '2026-06-01', imageUrls: ['https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=800&q=80'], description: 'Brokoli segar hijau, dipanen langsung dari kebun lokal. Kaya akan vitamin C dan K.' },
  { id: '2', name: 'Bayam Cabut Segar', category: 'Sayuran', tgl_masuk: '2026-05-18', tgl_expired: '2026-05-25', imageUrls: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=800&q=80'], description: 'Bayam segar kaya akan zat besi, dipanen dari petani organik lokal.' },
  { id: '3', name: 'Wortel Berastagi Segar', category: 'Sayuran', tgl_masuk: '2026-05-18', tgl_expired: '2026-06-10', imageUrls: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=800&q=80'], description: 'Wortel berkualitas tinggi dari dataran tinggi, kaya vitamin A untuk kesehatan mata.' },
  { id: '4', name: 'Apel Fuji Segar', category: 'Buah', tgl_masuk: '2026-05-19', tgl_expired: '2026-06-15', imageUrls: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6faa6?auto=format&fit=crop&w=800&q=80'], description: 'Apel Fuji segar manis, tekstur garing dan sangat menyegarkan.' },
  { id: '5', name: 'Mangga Arumanis Segar', category: 'Buah', tgl_masuk: '2026-05-19', tgl_expired: '2026-05-28', imageUrls: ['https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80'], description: 'Mangga arumanis pilihan dengan rasa manis sempurna dan tanpa serat.' },
  { id: '6', name: 'Pisang Cavendish', category: 'Buah', tgl_masuk: '2026-05-19', tgl_expired: '2026-05-24', imageUrls: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?auto=format&fit=crop&w=800&q=80'], description: 'Pisang Cavendish manis dan tinggi kalium, sumber energi instan yang lezat.' },
  { id: '7', name: 'Dada Ayam Fillet Frozen', category: 'Daging', tgl_masuk: '2026-05-15', tgl_expired: '2026-11-15', imageUrls: ['https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=80'], description: 'Dada ayam tanpa tulang beku siap diolah. Sangat pas untuk menu diet protein tinggi.' },
  { id: '8', name: 'Sayap Ayam (Wings) Frozen', category: 'Daging', tgl_masuk: '2026-05-15', tgl_expired: '2026-11-15', imageUrls: ['https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80'], description: 'Sayap ayam beku, mudah dimasak untuk sajian chicken wings di rumah.' },
  { id: '9', name: 'Kentang Goreng (Shoestring)', category: 'Cemilan', tgl_masuk: '2026-05-18', tgl_expired: '2027-02-18', imageUrls: ['https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80'], description: 'Kentang goreng beku tipe lurus tipis, enak dan gurih untuk cemilan santai.' },
  { id: '10', name: 'Sosis Sapi Bakar', category: 'Cemilan', tgl_masuk: '2026-05-20', tgl_expired: '2026-12-20', imageUrls: ['https://images.unsplash.com/photo-1628292850383-e28acdba88b4?auto=format&fit=crop&w=800&q=80'], description: 'Sosis sapi dengan rasa kaldu mantap, sangat cocok dibakar, digoreng, atau dibuat campuran sup.' }
];

async function run() {
  for (const prod of INITIAL_PRODUCTS) {
    console.log("Seeding", prod.id);
    await setDoc(doc(db, 'products', prod.id), prod);
  }
  console.log("Done!");
  process.exit(0);
}

run();
