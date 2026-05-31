<?php
// login.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once 'config.php';

$data = json_decode(file_get_contents("php://input"));

if(!empty($data->username) && !empty($data->password)) {
    try {
        $stmt = $pdo->prepare("SELECT id, username, password, email FROM users WHERE username = ?");
        $stmt->execute([$data->username]);
        
        if($stmt->rowCount() > 0) {
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Verifikasi password
            if(password_verify($data->password, $user['password'])) {
                // Di aplikasi nyata, Anda sebaiknya mempergunakan JWT(JSON Web Tokens) atau Session
                http_response_code(200);
                echo json_encode([
                    "status" => "success", 
                    "message" => "Login berhasil.",
                    "user" => [
                        "id" => $user['id'],
                        "username" => $user['username'],
                        "email" => $user['email']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode(["status" => "error", "message" => "Password salah."]);
            }
        } else {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Username tidak ditemukan."]);
        }
    } catch(PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Login gagal: " . $e->getMessage()]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
}
?>
