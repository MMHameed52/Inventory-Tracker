import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Button, Form, Table, Spinner } from 'react-bootstrap';

function App() {
    const [file, setFile] = useState(null);  // Handle file upload
    const [csvList, setCsvList] = useState([]);  // Store the list of uploaded CSVs
    const [selectedCsvData, setSelectedCsvData] = useState([]);  // Store data for the selected CSV
    const [headerKeys, setHeaderKeys] = useState([]);  // Store CSV column names
    const [loading, setLoading] = useState(false);  // Loading state for fetches

    // Fetch the list of uploaded CSVs on load
    useEffect(() => {
        setLoading(true);
        fetch('http://localhost:4000/csv-list')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                setCsvList(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching CSV list:', error);
                setLoading(false);
            });
    }, []);

    // Function to fetch CSV data when a CSV is selected
    const fetchCsvData = (fileId) => {
        fetch(`http://localhost:4000/csv-data/${fileId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.length > 0) {
                    setSelectedCsvData(data);  // This will update the table with the new data
                    setHeaderKeys(Object.keys(data[0]));  // Update the headers if necessary
                }
            })
            .catch(error => {
                console.error('Error fetching CSV data:', error);
            });
    };


    // Handle file change for CSV upload
    const handleOnChange = (e) => {
        setFile(e.target.files[0]);
    };

    // Convert CSV text to an array
    const csvFileToArray = (string) => {
        const csvHeader = string.slice(0, string.indexOf("\n")).split(",");
        const csvRows = string.slice(string.indexOf("\n") + 1).split("\n");

        const array = csvRows
            .filter(row => row.trim() !== "")
            .map(row => {
                const values = row.split(",");
                return csvHeader.reduce((object, header, index) => {
                    object[header] = values[index];
                    return object;
                }, {});
            });

        return { array, csvHeader };
    };

    // Handle CSV upload
    const handleOnSubmit = (e) => {
        e.preventDefault();
        if (file) {
            const fileReader = new FileReader();
            fileReader.onload = function (event) {
                const text = event.target.result;
                const { array, csvHeader } = csvFileToArray(text);

                // Set the headers and data for display
                setHeaderKeys(csvHeader);

                // Send CSV data to the backend
                fetch('http://localhost:4000/upload-csv', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ array, fileName: file.name }),  // Include file name in the body
                })
                    .then(response => response.json())
                    .then(result => {
                        alert('CSV uploaded successfully!');
                        setCsvList([...csvList, { id: result.fileId, file_name: file.name }]);
                    })
                    .catch(error => console.error('Error uploading CSV:', error));
            };

            fileReader.readAsText(file);
        }
    };

    // New form to append data
    const [newProduct, setNewProduct] = useState({ ProductName: '', Barcode: '', Price: '' });

// Handle form changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

// Function to submit the new product
    const handleAppendData = (fileId) => {
        fetch(`http://localhost:4000/append-csv/${fileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ array: [newProduct] }),  // Wrap newProduct in an array
        })
            .then(response => response.json())
            .then(result => {
                alert('Data appended successfully!');
                // Optionally, refresh the displayed data here
            })
            .catch(error => console.error('Error appending data:', error));
    };

    const handleSellProduct = (productId, availableQty, price) => {
        // Ensure that price is a number
        const numericPrice = typeof price === 'string' ? parseFloat(price.replace('$', '')) : price;

        // Prompt the user to enter the quantity to sell
        const quantityToSell = parseInt(window.prompt(`Enter quantity to sell (Available: ${availableQty})`), 10);

        // Validate the entered quantity
        if (!quantityToSell || quantityToSell <= 0 || quantityToSell > availableQty) {
            alert('Invalid quantity. Please enter a valid number that is less than or equal to available stock.');
            return;
        }

        // Log the values being sent to the backend for debugging
        console.log('Sending product sale:', { productId, quantityToSell, numericPrice });

        // Send the sale details to the backend
        fetch('http://localhost:4000/sell-product', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId, quantityToSell, price: numericPrice }),  // Send the product ID, quantity to sell, and numeric price
        })
            .then((response) => response.json())
            .then((data) => {
                alert('Product sold successfully!');
                // Optionally refresh data here to reflect updated quantities and sales
                fetchCsvData(selectedCsvData[0].file_id);  // Refresh the data to show updated quantities
            })
            .catch((error) => console.error('Error selling product:', error));
    };

    return (
        <Container fluid className="p-4">
            <Row>
                {/* Sidebar for uploaded CSVs */}
                <Col sm={3} className="bg-light p-3">
                    <h3>Uploaded CSVs</h3>
                    {loading ? (
                        <Spinner animation="border" />
                    ) : (
                        <ul className="list-group">
                            {csvList.map((csv) => (
                                <li key={csv.id} className="list-group-item">
                                    <Button
                                        variant="outline-primary"
                                        className="w-100"
                                        onClick={() => fetchCsvData(csv.id)}
                                    >
                                        {csv.file_name}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Col>

                {/* Main content area */}
                <Col sm={9}>
                    <h1 className="text-center mb-4">Upload a CSV File</h1>
                    <Form className="mb-4">
                        <Form.Group controlId="formFile" className="mb-3">
                            <Form.Control
                                type="file"
                                accept=".csv"
                                onChange={handleOnChange}
                            />
                        </Form.Group>
                        <Button variant="success" onClick={handleOnSubmit}>Upload CSV</Button>
                    </Form>

                    <hr />

                    {/* Display the uploaded CSV data */}
                    {headerKeys.length > 0 && (
                        <>
                            <Table striped bordered hover responsive>
                                <thead>
                                <tr>
                                    {headerKeys.map((key) => (
                                        <th key={key}>{key}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {selectedCsvData.length > 0 ? (
                                    selectedCsvData.map((item, index) => (
                                        <tr key={index}>
                                            {headerKeys.map((key, idx) => (
                                                <td key={idx}>
                                                    {key === 'Price' ? `$${item[key]}` : item[key]} {/* Add dollar sign for Price */}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={headerKeys.length}>No data available</td>
                                    </tr>
                                )}
                                </tbody>
                            </Table>

                            <Table striped bordered hover responsive>
                                <thead>
                                <tr>
                                    <th>ProductID</th>
                                    <th>ProductName</th>
                                    <th>Barcode</th>
                                    <th>Price</th>
                                    <th>Qty</th>  {/* New column for quantity */}
                                    <th>Action</th> {/* Column for the Sell button */}
                                </tr>
                                </thead>
                                <tbody>
                                {selectedCsvData.length > 0 ? (
                                    selectedCsvData.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.ProductID}</td>
                                            <td>{item.ProductName}</td>
                                            <td>{item.Barcode}</td>
                                            <td>${item.Price}</td>
                                            <td>{item.Qty}</td>  {/* Display the quantity */}
                                            <td>
                                                <Button
                                                    variant="danger"
                                                    onClick={() => handleSellProduct(item.ProductID, item.Qty, item.Price)}
                                                    disabled={item.Qty === 0}
                                                >
                                                    {item.Qty === 0 ? "Out of Stock" : "Sell"}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6}>No data available</td></tr>
                                    )}
                                </tbody>
                            </Table>

                            {/* Append Data Form */}
                            <h2 className="text-center mb-4">Add Data to the Selected CSV</h2>
                            <Form>
                                <Form.Group controlId="ProductName">
                                    <Form.Label>Product Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="ProductName"
                                        value={newProduct.ProductName}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>

                                <Form.Group controlId="Barcode">
                                    <Form.Label>Barcode</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="Barcode"
                                        value={newProduct.Barcode}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>

                                <Form.Group controlId="Price">
                                    <Form.Label>Price</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="Price"
                                        value={newProduct.Price.startsWith('$') ? newProduct.Price : `$${newProduct.Price}`}  // Add dollar sign if not present
                                        onChange={(e) => {
                                            const value = e.target.value.replace('$', '');  // Strip the dollar sign for the actual input
                                            setNewProduct(prevState => ({
                                                ...prevState,
                                                Price: value
                                            }));
                                        }}
                                    />
                                </Form.Group>

                                {/* New input field for Quantity */}
                                <Form.Group controlId="Qty">
                                    <Form.Label>Quantity</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="Qty"
                                        value={newProduct.Qty}
                                        onChange={handleInputChange}  // Reuse the handleInputChange function
                                    />
                                </Form.Group>

                                <Button
                                    variant="success"
                                    onClick={() => handleAppendData(selectedCsvData[0].file_id)}  // Ensure the form submits with the correct fileId
                                >
                                    Add Product
                                </Button>
                            </Form>
                        </>
                    )}
                </Col>
            </Row>
        </Container>
    );
}
export default App;
