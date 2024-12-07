<?php
//Set up database credentials and connection
$host = 'madelinem24.sg-host.com';
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
    for ($i = 0; $i < count($apiGenreData); $i++) {
        $listName = $apiGenreData['results'][1]['list_name_encoded'];
        $apiUrl = "https://api.nytimes.com/svc/books/v3/lists/2024-08-01/". $listName . ".json?api-key=3tE0vlJzLbCZGNF1G77W98oUmcGNYa5I";
        // echo $apiUrl;
        sleep(seconds: 20);
        $response = file_get_contents($apiUrl);
        if ($response == TRUE) {
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
                    $isbn = $apiData['results']['books'][$i]['primary_isbn13'];
                    $author = $apiData['results']['books'][$i]['author'];
                    echo "Start: ";

                    $authorList = explode('and', string: $author);
                    $authorListFinal = explode('with', $author);
                    for ($j = 0; $j < count($authorListFinal); $j++) {
                        array_push($authorList, $authorListFinal[$j]);
                        array_push($isbnList, $isbn);
                        // echo $isbn;
                        // echo " ";
                        // echo $authorListFinal[$j];
                        // echo " ";
                    }
                    // echo "Field1: $titleLower, Field2: $publish_date, Field3: $genre, Field4: $description, Field5: $product_url,Field6: $book_image,Field7:$ny_times_recommend, Field8:$isbn,Field9:$bestsellers_date  \n";
    
                    // if ($stmt->execute()) {
                    //     echo "Book Record inserted successfully!";
                    // } else {
                    //     continue; 
                    // }
                }
                echo "herre";
                for ( $i = 0; $i < count($authorListFinal); $i++ ) {
                    #parse author: if it has "and" or with "with" seperate into multiple
                    $stmt = $conn->prepare("INSERT IGNORE INTO authors (author_name, isbn) VALUES (?,?)");
                    echo "Author: $authorListFinal[$i], ISBN: $isbnList[$i]  \n";
    
                    $stmt->bind_param("ss", $authorListFinal[$i], $isbnList[$i]);
                    // if ($stmt->execute()) {
                    //     echo "Author Record inserted successfully!";
                    // } else {
                    //     continue; 
                    // }
            }
            }
        }
        else {
            continue;
        }
    }

}
$stmt->close();
$conn->close();
?>