CREATE DATABASE IF NOT EXISTS naturachill_db;
USE naturachill_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    tgl_masuk DATE NOT NULL,
    tgl_expired DATE NOT NULL,
    imageUrl VARCHAR(255) NOT NULL,
    description TEXT
);

INSERT INTO products (id, name, category, tgl_masuk, tgl_expired, imageUrl, description) VALUES
(1, 'Brokoli Segar', 'Sayuran', '2023-10-01', '2024-10-01', 'https://placehold.co/150x150?text=Brokoli+Segar', 'Brokoli segar hijau, dipanen langsung dari kebun lokal. Kaya akan vitamin C dan K, serta serat untuk menjaga pencernaan.'),
(2, 'Beri Campur', 'Buah', '2023-11-15', '2024-11-15', 'https://placehold.co/150x150?text=Beri+Campur', 'Campuran buah beri pilihan (blueberry, raspberry, strawberry) yang dibekukan sempurna untuk menjaga antioksidan.'),
(3, 'Jamur Enoki', 'Jamur', '2024-01-10', '2024-07-10', 'https://placehold.co/150x150?text=Jamur+Enoki', 'Jamur Enoki segar dengan tekstur renyah, sangat cocok untuk hotpot, sup, atau hidangan tumis sehat.'),
(4, 'Dada Ayam Beku', 'Daging', '2023-12-05', '2024-12-05', 'https://placehold.co/150x150?text=Dada+Ayam+Beku', 'Potongan dada ayam tanpa tulang dan tanpa kulit, dibekukan segar untuk menjaga kandungan protein tinggi.'),
(5, 'Edamame', 'Sayuran', '2024-02-20', '2025-02-20', 'https://placehold.co/150x150?text=Edamame', 'Kacang kedelai muda berkualitas premium. Camilan sehat yang sangat meregangkan, tinggi protein nabati.'),
(6, 'Kentang Goreng', 'Cemilan', '2023-09-10', '2024-09-10', 'https://placehold.co/150x150?text=Kentang+Goreng', 'Kentang potong lurus siap goreng atau panggang. Praktis untuk disajikan kapan saja sebagai camilan keluarga.'),
(7, 'Sosis Sapi Beku', 'Cemilan', '2023-08-01', '2024-02-01', 'https://placehold.co/150x150?text=Sosis+Sapi+Beku', 'Sosis sapi dengan perpaduan rempah pilihan. Bisa direbus, dibakar, maupun digoreng.'),
(8, 'Bayam Beku', 'Sayuran', '2024-03-01', '2025-03-01', 'https://placehold.co/150x150?text=Bayam+Beku', 'Bayam yang dibekukan segera setelah dipanen. Mempermudah Anda dalam membuat pasta, smoothie, atau sup sehat.'),
(9, 'Mangga Manis', 'Buah', '2024-01-25', '2025-01-25', 'https://placehold.co/150x150?text=Mangga+Manis', 'Potongan mangga arumanis yang sangat manis. Langsung bisa dimakan dingin atau dicampur menjadi smoothies lezat.'),
(10, 'Hashbrown', 'Cemilan', '2023-11-11', '2024-11-11', 'https://placehold.co/150x150?text=Hashbrown', 'Camilan kentang parut renyah yang sangat populer untuk sarapan bergaya Barat.');
