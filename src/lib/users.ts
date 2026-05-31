import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface AppUser {
  id: string; // email will act as id, or standard UID
  name: string;
  email: string;
  role: string;
}

export async function getUsers(): Promise<AppUser[]> {
  const querySnapshot = await getDocs(collection(db, 'users'));
  const users: AppUser[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    users.push({
      id: doc.id,
      name: data.name || '',
      email: data.email || '',
      role: data.role || 'pelanggan'
    });
  });
  
  return users;
}

export async function addUser(user: AppUser) {
  await setDoc(doc(db, 'users', user.id), {
    uid: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
}

export async function updateExistingUser(user: AppUser) {
  await updateDoc(doc(db, 'users', user.id), {
    name: user.name,
    email: user.email,
    role: user.role
  });
}

export async function deleteUserRecord(id: string) {
  await deleteDoc(doc(db, 'users', id));
}
