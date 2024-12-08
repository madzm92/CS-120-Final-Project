<head>
    <title>Choose Genre</title>
</head>
<?php
//Set up database credentials and connection
$host = 'madelinem24.sg-host.com';
$user = 'uxeox6t17bz87';
$password = 'cs120webprogramming';
$db_name = 'dbag7wdyv3ziyt';

$conn = new mysqli($host, $user, $password);
$conn->select_db($db_name);

//TODO: GET SEARCH VALUE FROM OTHER FILE

//SQL Query and results
$sql = "SELECT book_title, isbn from library_general WHERE book_title = 'zsdfhkjfkjs'";
$result = $conn->query(query: $sql);

if ($result->num_rows <= 0) {
    echo "no data";
}

// echo "<form action='db2.php' method='POST'>";

// //Create Selection Options & Submit Button
// echo "<h2>Select Song Genres to Display</h2>";
while ($row = $result->fetch_assoc()) {
    $book_title = $row['book_title'];
    $book_isbn = $row['isbn'];
    echo 'Book title: '. $book_title .' ISBN: '. $book_isbn;
}
// echo "<br><button type='submit'>Submit</button>";
// echo "</form>";

$conn->close();
?>