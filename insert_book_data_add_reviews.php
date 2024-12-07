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

// Fetch the list of ISBNs from the database
$isbnList = [];
$isbnQuery = "SELECT isbn FROM library_general WHERE isbn IS NOT NULL";
$result = $conn->query($isbnQuery);

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $isbnList[] = $row['isbn'];
    }
} else {
    die("Failed to fetch ISBNs from the database: " . $conn->error);
}

if (empty($isbnList)) {
    die("No ISBNs found in the database.");
}

// Google Books API base URL
$apiBaseUrl = "https://www.googleapis.com/books/v1/volumes?q=isbn:";

// Loop through the ISBNs and fetch reviews
foreach ($isbnList as $isbn) {
    $apiUrl = $apiBaseUrl . urlencode($isbn);

    // Fetch data from the API
    $response = file_get_contents($apiUrl);

    if (!$response) {
        echo "Failed to fetch data for ISBN: $isbn\n";
        continue;
    }

    $apiData = json_decode($response, true);

    if (!isset($apiData['items']) || empty($apiData['items'])) {
        echo "No data found for ISBN: $isbn\n";
        continue;
    }

    // Extract review data
    $volumeInfo = $apiData['items'][0]['volumeInfo'] ?? [];
    $reviews = $volumeInfo['description'] ?? 'No reviews available';

    // Insert reviews into the reviews table
    $stmt = $conn->prepare(
        "INSERT INTO book_reviews (isbn, reviews) VALUES (?, ?) 
        ON DUPLICATE KEY UPDATE reviews = VALUES(reviews)"
    );

    $stmt->bind_param("ss", $isbn, $reviews);

    if (!$stmt->execute()) {
        echo "Error inserting review for ISBN $isbn: " . $conn->error . "\n";
    } else {
        echo "Review successfully updated for ISBN: $isbn\n";
    }
}

// Close the connection
$conn->close();

echo "Book reviews import completed successfully.";
?>
