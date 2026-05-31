# Integrasi React ke PHP Backend

Karena pengembangan di environment ini secara default menggunakan Node.js (Vite), file PHP dan SQL ini tidak akan berjalan langsung di live preview editor. Anda perlu menjalankannya di environment server PHP/MySQL lokal (seperti XAMPP, MAMP) atau Web Hosting eksternal.

## Langkah Menggunakan Script PHP:
1. Buat database baru bernama `naturachill_db` di phpMyAdmin / MySQL lokal Anda.
2. Import schema yang ada di `schema.sql` ke database tersebut.
3. Simpan `config.php`, `get_products.php`, `register.php`, dan `login.php` di dalam folder public web server Anda (misal: `htdocs/api/`).

## Cara Mengintegrasikan ke React (`src/App.tsx`)

Anda dapat mengganti deklarasi konstanta `PRODUCTS` yang saat ini _hard-coded_ menjadi state React yang mengambil data dari API `get_products.php` menggunakan `useEffect`.

**Contoh Refactoring di React (`src/App.tsx`):**

```typescript
// 1. Ubah PRODUCTS dari const menjadi state
// Hapus const PRODUCTS = [ ... ];
// Dan tambahkan ini di dalam komponen `App`:
const [products, setProducts] = useState<Product[]>([]);
const [isLoadingProducts, setIsLoadingProducts] = useState(true);

// 2. Fetch API menggunakan useEffect
useEffect(() => {
  const fetchProducts = async () => {
    try {
      // Sesuaikan URL ini dengan lokasi backend PHP Anda dijalankan
      const response = await fetch('http://localhost/api/get_products.php');
      const json = await response.json();
      
      if (json.status === 'success') {
        setProducts(json.data);
      }
    } catch (error) {
      console.error("Gagal mengambil data produk: ", error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  fetchProducts();
}, []);

// 3. Gunakan state `products` pada UI Katalog Anda
// Ubah semua iterasi `PRODUCTS.map(...)` menjadi `products.map(...)`
```

Untuk Login dan Register, Anda bisa membuat fungsional form lalu menggunakan `fetch()` dengan method `POST`:

```typescript
const handleLogin = async (username, password) => {
  const res = await fetch('http://localhost/api/login.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.status === 'success') {
    // Simpan data user ke state atau localStorage
    console.log(data.user);
  }
}
```
