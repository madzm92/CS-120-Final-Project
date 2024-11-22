<?php
//Set up database credentials and connection
$host = 'localhost';
$user = 'uxeox6t17bz87';
$password = 'cs120webprogramming';
$db_name = 'dbag7wdyv3ziyt';

$conn = new mysqli($host, $user, $password);
$conn->select_db($db_name);

$data = file_get_contents("php://input");
$bookDict = json_decode($data, true);
echo "<h2>$data</h2>";
echo "<h2>$bookDict</h2>";


if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}
//GET LIST OF GENRES
$apiGenres = "https://api.nytimes.com/svc/books/v3/lists/names?api-key=3tE0vlJzLbCZGNF1G77W98oUmcGNYa5I";
$genreResponse = file_get_contents($apiGenres);
if ($genreResponse === FALSE) {
    die("Error fetching API data (location 1).");
}
$apiGenreData = json_decode($genreResponse, true);
if ($apiGenreData['status'] == 'OK') {
    for ($i = 0; $i < count($apiGenreData['results']); $i++) {
        $listName = $apiGenreData['results'][$i]['list_name_encoded'];
        $apiUrl = "https://api.nytimes.com/svc/books/v3/lists/2024-01-22/". $listName . ".json?api-key=3tE0vlJzLbCZGNF1G77W98oUmcGNYa5I";
        $response = file_get_contents($apiUrl);
        // echo $apiUrl;
        if ($response === FALSE) {
            die("Error fetching API data. (location 2)");
        }
        $apiData = json_decode($response, true);
        if (!$apiData) {
            die("Invalid JSON data received.");
        }
        $authorList = [];
        $isbnList = [];
        if ($apiData['status'] == 'OK') {
            $total_results = $apiData['num_results'];
            $genre = $apiData['results']['list_name'];
            $bestsellers_date = $apiData['results']['bestsellers_date'];
            $publish_date = (int) mb_substr($bestsellers_date, 0, 4);

            $ny_times_recommend = 1;
            for ($i = 0; $i < $total_results; $i++) {
                $stmt = $conn->prepare("INSERT IGNORE INTO library_general (book_title, publish_date, genre, description, product_url, book_image,ny_times_recommended,isbn,bestsellers_date) VALUES (?,?,?,?,?,?,?,?,?)");
                $stmt->bind_param("sissssiss", $titleLower, $publish_date, $genre, $description, $product_url, $book_image, $ny_times_recommend, $isbn, $bestsellers_date);

                $book_title = $apiData['results']['books'][$i]['title'];
                $titleLower = ucwords(mb_strtolower($book_title, 'UTF-8'));
                $description = $apiData['results']['books'][$i]['description'];
                $product_url = $apiData['results']['books'][$i]['amazon_product_url'];
                if ($product_url == '') {
                    $product_url = 'None';
                }
                $book_image = $apiData['results']['books'][$i]['book_image'];
                if ($book_image == ''){
                    $book_image = 'None';
                }
                array_push($authorList, $apiData['results']['books'][$i]['author']);
                array_push($isbnList, $apiData['results']['books'][$i]['primary_isbn13']);
                $isbn = $apiData['results']['books'][$i]['primary_isbn13'];
                $author = $apiData['results']['books'][$i]['author'];

                echo "Field1: $titleLower, Field2: $publish_date, Field3: $genre, Field4: $description, Field5: $product_url,Field6: $book_image,Field7:$ny_times_recommend, Field8:$isbn,Field9:$bestsellers_date  \n";

                if ($stmt->execute()) {
                    echo "Book Record inserted successfully!";
                } else {
                    continue; 
                }
                sleep(3);
            }
        }
        for ( $i = 0; $i < count($authorList); $i++ ) {
            $stmt = $conn->prepare("INSERT IGNORE INTO authors (author_name, isbn) VALUES (?,?)");
            $stmt->bind_param("ss", $authorList[$i], $isbnList[$i]);
            if ($stmt->execute()) {
                echo "Author Record inserted successfully!";
            } else {
                continue; 
            }
        }
    }

}


$stmt->close();
$conn->close();
?>