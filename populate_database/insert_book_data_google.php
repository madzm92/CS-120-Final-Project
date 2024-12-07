<?php
// Database credentials and connection setup
$host = 'madelinem24.sg-host.com';
$user = 'uxeox6t17bz87';
$password = 'cs120webprogramming';
$db_name = 'dbag7wdyv3ziyt';

$conn = new mysqli($host, $user, $password, $db_name);

if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// API URL
$apiUrl = "https://www.googleapis.com/books/v1/volumes?q=apple&maxResults=40";

// Fetch data from the API
$response = file_get_contents($apiUrl);

if (!$response) {
    die("Failed to fetch data from the API.");
}

$apiData = json_decode($response, true);

if (!isset($apiData['items']) || empty($apiData['items'])) {
    die("No books found in the API response.");
}

// Loop through each book item
foreach ($apiData['items'] as $item) {
    $volumeInfo = $item['volumeInfo'] ?? [];

    // Handle ISBNs
    $industryIdentifiers = $volumeInfo['industryIdentifiers'] ?? [];
    $isbn = null;
    foreach ($industryIdentifiers as $identifier) {
        if ($identifier['type'] === 'ISBN_13') {
            $isbn = $identifier['identifier'];
            break;
        }
    }

    // Skip books without ISBN_13
    if (!$isbn) {
        continue;
    }

    // Extract book details
    $book_title = $volumeInfo['title'] ?? 'Unknown Title';
    $publish_date = $volumeInfo['publishedDate'] ?? null;
    $genre = $volumeInfo['categories'][0] ?? 'Unknown Genre';
    $description = $volumeInfo['description'] ?? 'No Description Available';
    $product_url = $volumeInfo['infoLink'] ?? 'None';
    $book_image = $volumeInfo['imageLinks']['thumbnail'] ?? 'None';
    $ny_times_recommended = 0; // Default as NYT data isn't provided
    $bestsellers_date = null; // Default as no bestseller data is available
    $review_text = $item['searchInfo']['textSnippet'] ?? 'No Review Available';

    // Insert book into the library_general table
    $stmt = $conn->prepare(
        "INSERT IGNORE INTO library_general 
        (book_title, publish_date, genre, description, product_url, book_image, ny_times_recommended, isbn, bestsellers_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->bind_param(
        "ssssssiss",
        $book_title,
        $publish_date,
        $genre,
        $description,
        $product_url,
        $book_image,
        $ny_times_recommended,
        $isbn,
        $bestsellers_date
    );

    if (!$stmt->execute()) {
        echo "Error inserting book: " . $conn->error . "\n";
        continue;
    }

    // Insert authors into the authors table
    $authors = $volumeInfo['authors'] ?? [];
    foreach ($authors as $author_name) {
        $stmt = $conn->prepare(
            "INSERT IGNORE INTO authors (author_name, isbn) VALUES (?, ?)"
        );
        $stmt->bind_param("ss", $author_name, $isbn);

        if (!$stmt->execute()) {
            echo "Error inserting author: " . $conn->error . "\n";
            continue;
        }
    }

    // Insert review into the reviews table
    $stmt = $conn->prepare(
        "INSERT IGNORE INTO book_reviews (isbn, review_text) VALUES (?, ?)"
    );
    $stmt->bind_param("ss", $isbn, $review_text);

    if (!$stmt->execute()) {
        echo "Error inserting review: " . $conn->error . "\n";
        continue;
    }
}

// Close the connection
$stmt->close();
$conn->close();

echo "Data import completed successfully.";
?>
