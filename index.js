const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const upload = multer({ dest: 'uploads/' });
const XLSX = require('xlsx');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://trendy-management.web.app',
        'https://trendy-management.firebaseapp.com',
    ],
    credentials: true
}));
app.use(express.json());






// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.camyj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server
        await client.connect();
        // console.log("Connected to MongoDB!");

        const database = client.db('Trendy_management');
        const productCollection = database.collection('Product');
        const ordersCollection = database.collection('OrderManagement');
        const facebookPagesCollection = database.collection('FacebookPages');
        const usersCollection = database.collection('Users');
        const redxAreaCollection = database.collection('RedxArea');
        const pathaowAreaCollection = database.collection('PathaowArea');





        // Route to fetch Call Center Summary report with updatedAt filtering
        app.post('/api/reports/call-center-summary', async (req, res) => {
            const { startDate, endDate } = req.body;

            // Log the incoming request body
            console.log("Received request with date range:", { startDate, endDate });

            // Convert dates to proper JavaScript Date objects
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // Include entire end date

            console.log("Formatted start date:", start, "Formatted end date:", end);

            try {
                const users = await usersCollection.find({}).toArray();

                // Log the number of users found
                console.log("Number of users found:", users.length);

                const results = [];

                for (const user of users) {
                    const userId = user.uid;
                    const userName = user.userName;

                    console.log(`Fetching orders for user: ${userName} (ID: ${userId})`);

                    // Count orders assigned to the user, filtered by `updatedAt`
                    const totalAssigned = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        updatedAt: { $gte: start, $lte: end },
                    });

                    console.log(`Total assigned orders for ${userName}:`, totalAssigned);

                    if (totalAssigned === 0) {
                        console.log(`Skipping user ${userName} because they have no assigned orders.`);
                        continue; // Skip users with 0 assigned orders
                    }

                    // Fetch other statuses using `updatedAt`
                    const totalPending = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        status: 'Pending',
                        updatedAt: { $gte: start, $lte: end },
                    });
                    console.log(`Total Pending orders for ${userName}:`, totalPending);

                    const totalCancelled = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        status: 'Cancel',
                        updatedAt: { $gte: start, $lte: end },
                    });
                    console.log(`Total Cancelled orders for ${userName}:`, totalCancelled);

                    const totalNoAnswer = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        status: 'No Answer',
                        updatedAt: { $gte: start, $lte: end },
                    });
                    console.log(`Total No Answer orders for ${userName}:`, totalNoAnswer);

                    const totalRedx = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        status: 'Redx',
                        updatedAt: { $gte: start, $lte: end },
                    });
                    console.log(`Total Redx orders for ${userName}:`, totalRedx);

                    const totalSteadfast = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        status: 'Steadfast',
                        updatedAt: { $gte: start, $lte: end },
                    });
                    console.log(`Total Steadfast orders for ${userName}:`, totalSteadfast);

                    const totalPathaow = await ordersCollection.countDocuments({
                        assignedTo: userId,
                        status: 'Pathaow',
                        updatedAt: { $gte: start, $lte: end },
                    });
                    console.log(`Total Pathaow orders for ${userName}:`, totalPathaow);

                    const userData = {
                        userName,
                        totalAssigned,
                        totalPending,
                        totalCancelled,
                        totalNoAnswer,
                        totalRedx,
                        totalSteadfast,
                        totalPathaow,
                    };

                    // Log the collected data for the user
                    console.log(`Collected data for ${userName}:`, userData);

                    results.push(userData);
                }

                // Log the final results before sending the response
                console.log("Final results:", results);

                res.status(200).json(results);
            } catch (error) {
                console.error('Error fetching call center summary:', error);
                res.status(500).json({ error: 'Error fetching call center summary' });
            }
        });















        // Route to fetch report data based on date range and various statuses
        app.post('/api/reports/date-wise', async (req, res) => {
            const { startDate, endDate } = req.body;

            try {
                // Ensure proper date parsing and include the entire end date
                const start = new Date(startDate);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);

                // Logging start and end dates for debugging purposes
                console.log(`Fetching report data for range: ${start} to ${end}`);

                // Define the base query for all documents within the date range
                const dateRangeQuery = { createdAt: { $gte: start, $lte: end } };

                // Define the queries for different statuses and logistic statuses
                const statusQueries = {
                    totalRedxOrders: { ...dateRangeQuery, status: 'Redx' },
                    totalSteadfastOrders: { ...dateRangeQuery, status: 'Steadfast' },
                    totalPathaowOrders: { ...dateRangeQuery, status: 'Pathaow' },
                    totalPending: { ...dateRangeQuery, status: 'Pending' },
                    totalMemo: { ...dateRangeQuery, status: 'Memo' },
                    totalCancelledMemo: { ...dateRangeQuery, status: 'Cancel' },
                    totalNoAnswerOrders: { ...dateRangeQuery, status: 'No Answer' },
                    totalPrintedMemo: { ...dateRangeQuery, markAsPrinted: 'True' },
                    totalReturned: { ...dateRangeQuery, logisticStatus: 'Returned' },
                    totalDamaged: { ...dateRangeQuery, logisticStatus: 'Damage' },
                    totalPartial: { ...dateRangeQuery, logisticStatus: 'Partial' },
                };

                // Fetch all the counts in parallel using Promise.all for efficiency
                const [
                    totalOrders,
                    totalRedxOrders,
                    totalSteadfastOrders,
                    totalPathaowOrders,
                    totalPending,
                    totalMemo,
                    totalCancelledMemo,
                    totalNoAnswerOrders,
                    totalPrintedMemo,
                    totalReturned,
                    totalDamaged,
                    totalPartial,
                ] = await Promise.all([
                    ordersCollection.countDocuments(dateRangeQuery),
                    ordersCollection.countDocuments(statusQueries.totalRedxOrders),
                    ordersCollection.countDocuments(statusQueries.totalSteadfastOrders),
                    ordersCollection.countDocuments(statusQueries.totalPathaowOrders),
                    ordersCollection.countDocuments(statusQueries.totalPending),
                    ordersCollection.countDocuments(statusQueries.totalMemo),
                    ordersCollection.countDocuments(statusQueries.totalCancelledMemo),
                    ordersCollection.countDocuments(statusQueries.totalNoAnswerOrders),
                    ordersCollection.countDocuments(statusQueries.totalPrintedMemo),
                    ordersCollection.countDocuments(statusQueries.totalReturned),
                    ordersCollection.countDocuments(statusQueries.totalDamaged),
                    ordersCollection.countDocuments(statusQueries.totalPartial),
                ]);

                // Send the report data as a JSON response
                res.status(200).json({
                    totalOrders,
                    totalRedxOrders,
                    totalSteadfastOrders,
                    totalPathaowOrders,
                    totalPending,
                    totalMemo,
                    totalCancelledMemo,
                    totalNoAnswerOrders,
                    totalPrintedMemo,
                    totalReturned,
                    totalDamaged,
                    totalPartial,
                });
            } catch (error) {
                console.error('Error fetching report data:', error);
                res.status(500).json({ error: 'Error fetching report data' });
            }
        });








        //Code to Fetch Redx Status

        app.get('/api/orders/redx-status/:trackingId', async (req, res) => {
            const { trackingId } = req.params;

            // Check if tracking ID is provided
            if (!trackingId) {
                return res.status(400).json({ message: "Tracking ID is required" });
            }

            console.log(`Fetching Redx status for tracking ID: ${trackingId}`);

            const myHeaders = new Headers();
            myHeaders.append("API-ACCESS-TOKEN", `Bearer ${process.env.REDX_API_TOKEN}`);

            const requestOptions = {
                method: 'GET',
                headers: myHeaders,
                redirect: 'follow'
            };

            try {
                const response = await fetch(`https://openapi.redx.com.bd/v1.0.0-beta/parcel/info/${trackingId}`, requestOptions);
                const result = await response.json();
                //console.log(`Redx API Response: `, result);

                if (response.ok) {
                    const status = result.parcel?.status || 'Status not found';
                    return res.status(200).json({ status });
                } else {
                    console.error('Failed to fetch status from Redx', result);
                    return res.status(400).json({ message: 'Failed to fetch status from Redx', error: result });
                }
            } catch (error) {
                console.error('Error fetching from Redx:', error);
                return res.status(500).json({ message: 'Internal server error', error });
            }
        });






        // redx order sent
        app.post('/api/orders/send-to-redx', async (req, res) => {
            const { orderId, customerName, phoneNumber, address, grandTotal, redxArea, redxAreaId } = req.body;

            // Log the received request body
            //console.log("Received request body:", req.body);

            if (!orderId) {
                // console.log("Missing orderId");
                return res.status(400).json({ message: "Invoice ID is required" });
            }

            const myHeaders = new Headers();
            myHeaders.append("API-ACCESS-TOKEN", `Bearer ${process.env.REDX_API_TOKEN}`);
            myHeaders.append("Content-Type", "application/json");

            // Log the raw data to be sent to Redx API
            const raw = JSON.stringify({
                customer_name: customerName,
                customer_phone: phoneNumber,
                delivery_area: redxArea,
                delivery_area_id: redxAreaId,
                customer_address: address,
                merchant_invoice_id: orderId,
                cash_collection_amount: grandTotal,
                parcel_weight: 500,
                value: grandTotal,
            });

            console.log("Raw payload for Redx API:", raw);

            const requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'follow'
            };

            try {
                // Log the request before sending
                // console.log("Sending request to Redx API...");

                const response = await fetch("https://openapi.redx.com.bd/v1.0.0-beta/parcel", requestOptions);
                const result = await response.json();

                // Log the result from Redx API
                // console.log("Response from Redx API:", result);

                if (response.ok) {
                    const consignmentId = result.tracking_id;

                    // Log the consignmentId
                    //  console.log("Received consignmentId from Redx API:", consignmentId);

                    if (!consignmentId) {
                        return res.status(400).json({ success: false, message: 'Failed to get consignmentId from Redx.' });
                    }

                    // Update the order with consignmentId in your MongoDB
                    // console.log("Updating MongoDB with consignmentId...");
                    await ordersCollection.updateOne(
                        { invoiceId: orderId },
                        { $set: { consignmentId, logisticStatus: 'Redx', updatedAt: new Date() } }
                    );

                    // Log success message
                    //  console.log("Order updated successfully in MongoDB");

                    // Send success response
                    return res.status(200).json({ success: true, message: 'Order sent to Redx successfully', consignmentId });
                } else {
                    // Log the error from Redx API
                    // console.error("Error from Redx API:", result);
                    return res.status(400).json({ success: false, message: 'Failed to send order to Redx', error: result });
                }
            } catch (error) {
                // Log any internal error
                // console.error('Error sending to Redx:', error);
                return res.status(500).json({ success: false, message: 'Internal server error', error });
            }
        });







        // Fetch Redx Areas based on district
        app.get('/api/redx/areas', async (req, res) => {
            let { districtName } = req.query;

            if (!districtName) {
                return res.status(400).json({ message: 'District name is required' });
            }

            districtName = districtName.toLowerCase(); // Convert to lowercase

            const apiToken = process.env.REDX_API_TOKEN; // Ensure this token is valid


            var myHeaders = new Headers();
            myHeaders.append("API-ACCESS-TOKEN", `Bearer ${apiToken}`);

            var requestOptions = {
                method: 'GET',
                headers: myHeaders,
                redirect: 'follow'
            };

            try {
                const response = await fetch(`https://openapi.redx.com.bd/v1.0.0-beta/areas?district_name=${encodeURIComponent(districtName)}`, requestOptions);
                const contentType = response.headers.get("content-type");

                // Check if the response is JSON
                if (contentType && contentType.includes("application/json")) {
                    const data = await response.json();
                    const areaNames = data.areas;
                    res.status(200).json({ areas: areaNames });
                } else {
                    // If it's not JSON, return an error
                    const errorText = await response.text();
                    console.error('Error fetching areas:', errorText); // Log the HTML response for debugging
                    res.status(500).json({ message: 'Failed to fetch areas', error: errorText });
                }
            } catch (error) {
                console.error('Error fetching areas from Redx:', error);
                res.status(500).json({ message: 'Error fetching areas from Redx', error });
            }
        });











        // Helper function to convert MongoDB `updatedAt` to JavaScript `Date`
        const parseMongoDate = (mongoDate) => {
            if (mongoDate && mongoDate.$date) {
                return new Date(mongoDate.$date);
            }
            return null;
        };





        // Route to mark selected orders as printed
        app.post('/api/orders/mark-printed', async (req, res) => {
            const { orderIds } = req.body;
            try {
                const objectIds = orderIds.map(id => new ObjectId(id));
                const result = await ordersCollection.updateMany(
                    { _id: { $in: objectIds } },
                    { $set: { markAsPrinted: 'True' } }
                );
                if (result.modifiedCount > 0) {
                    res.status(200).send('Orders marked as printed');
                } else {
                    res.status(404).send('No orders found to mark as printed');
                }
            } catch (error) {
                res.status(500).send('Error marking orders as printed');
            }
        });



        // API to find an order by invoiceId and status 'Pathaow'
        app.post('/api/orders/find', async (req, res) => {
            const { invoiceId, status } = req.body;

            try {
                // Find the order by invoiceId and status 'Pathaow'
                const order = await ordersCollection.findOne({ invoiceId, status });

                if (!order) {
                    return res.status(404).json({ message: 'Order not found with Pathaow status and the given Invoice ID.' });
                }

                res.status(200).json(order);
            } catch (error) {
                console.error('Error fetching order:', error);
                res.status(500).json({ message: 'Error fetching order.' });
            }
        });

        // API to update the logistic status of an order
        app.patch('/api/orders/update-status/:id', async (req, res) => {
            const { id } = req.params;
            const { logisticStatus, returnedProduct } = req.body;

            try {
                // Update the logisticStatus and returnedProduct (if applicable)
                const updateFields = {
                    logisticStatus,
                };

                if (logisticStatus === 'Partial' && returnedProduct) {
                    updateFields.returnedProduct = returnedProduct; // Only add returned products for Partial returns
                }

                const updateResult = await ordersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateFields }
                );

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).json({ message: 'Order not found or logistic status not updated.' });
                }

                res.status(200).json({ message: 'Logistic status updated successfully.' });
            } catch (error) {
                console.error('Error updating logistic status:', error);
                res.status(500).json({ message: 'Error updating logistic status.' });
            }
        });













        // Find order by status and consignmentId steadFast
        app.post('/api/orders/find', async (req, res) => {
            const { consignmentId, status } = req.body;
            console.log(status);
            console.log(consignmentId);

            try {
                const order = await ordersCollection.findOne({ consignmentId: parseInt(consignmentId), status: status });

                if (!order) {
                    return res.status(404).json({ message: 'Order not found with the given consignment ID and status.' });
                }

                res.status(200).json(order);
            } catch (error) {
                res.status(500).json({ message: 'Failed to retrieve order', error });
            }
        });


        // API to find Redx order by consignmentId (string)
        app.post('/api/orders/find-redx', async (req, res) => {
            const { consignmentId } = req.body;
            console.log('Redx Consignment ID:', consignmentId);

            try {
                // Query to find Redx orders by consignmentId as a string
                const order = await ordersCollection.findOne({ consignmentId: consignmentId, status: 'Redx' });

                if (!order) {
                    return res.status(404).json({ message: 'Redx order not found with the given consignment ID.' });
                }

                res.status(200).json(order);
            } catch (error) {
                console.error('Error retrieving Redx order:', error);
                res.status(500).json({ message: 'Failed to retrieve Redx order', error });
            }
        });







        // Endpoint to update the order logisticStatus by consignmentId and _id
        app.patch('/api/orders/update-status/:id', async (req, res) => {
            const { id } = req.params;
            const { logisticStatus, returnedProduct } = req.body;

            try {
                // Find the order by _id
                const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

                if (!order) {
                    return res.status(404).json({ message: 'Order not found with the given ID' });
                }

                // Update the logisticStatus and patch the returnedProduct array
                const updateFields = {
                    logisticStatus,
                    updatedAt: new Date(),
                };

                // If returnedProduct is provided, add it to the order
                if (returnedProduct && Array.isArray(returnedProduct)) {
                    updateFields.returnedProduct = returnedProduct;
                }

                const result = await ordersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateFields }
                );

                if (result.modifiedCount > 0) {
                    return res.status(200).json({ message: `Order logisticStatus updated to "${logisticStatus}" successfully!` });
                } else {
                    return res.status(500).json({ message: 'Failed to update order logisticStatus' });
                }
            } catch (error) {
                return res.status(500).json({ message: 'Error updating the order', error });
            }
        });











        // API to mark orders as exported
        app.post('/api/orders/mark-exported', async (req, res) => {
            try {
                const { orderIds } = req.body;

                if (!orderIds || !Array.isArray(orderIds)) {
                    return res.status(400).json({ message: 'orderIds must be an array' });
                }

                // Convert orderIds to ObjectId
                const objectIds = orderIds.map(id => new ObjectId(id));

                // Update orders to mark as exported
                const result = await ordersCollection.updateMany(
                    { _id: { $in: objectIds } },
                    { $set: { markAs: 'Exported', updatedAt: new Date() } }
                );

                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Orders marked as Exported successfully.' });
                } else {
                    res.status(404).json({ message: 'No orders found to update.' });
                }
            } catch (error) {
                console.error('Error marking orders as exported:', error);
                res.status(500).json({ error: 'Failed to mark orders as Exported' });
            }
        });




        /**
               * Get Orders Assigned to User
               */
        app.get('/api/orders/assigned/:userId', async (req, res) => {
            const { userId } = req.params;
            try {
                const orders = await ordersCollection
                    .find({ assignedTo: userId })
                    .sort({ date: -1 })
                    .toArray();
                res.status(200).json(orders);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching orders', error });
            }
        });









        /**
        * Update Order Status
        */
        app.put('/api/orders/:id', async (req, res) => {
            const { id } = req.params;
            const { consignmentId, status, redxDistrict, note, redxArea, comment, customerName, phoneNumber, address, deliveryCost, advance, discount } = req.body;

            const updateData = {
                status,
                customerName,
                phoneNumber,
                address,
                note,
                consignmentId,  // Save the consignmentId
                deliveryCost: parseFloat(deliveryCost),
                advance: parseFloat(advance),
                discount: parseFloat(discount),
                products: req.body.products.map(product => ({ ...product, total: parseFloat(product.total) })),
                grandTotal: parseFloat(req.body.grandTotal),
                updatedAt: new Date(),
                district: (redxDistrict),
                area: (redxArea),

            };
            console.log(updateData);

            if (status === 'Redx' || status === 'Pathaow') {
                updateData.district = redxDistrict;
                updateData.area = redxArea;
            }
            if (status === 'Hold') {
                updateData.comment = comment;
            }

            try {
                const result = await ordersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updateData }
                );
                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Order updated successfully!' });
                } else {
                    res.status(404).json({ message: 'Order not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error updating order', error });
            }
        });






        /**
        * Get Redx Districts and Areas
        */
        app.get('/api/redx', async (req, res) => {
            try {
                const districts = await redxAreaCollection.find({}).toArray();
                res.status(200).json(districts);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching Redx districts', error });
            }
        });




        //=================================================================================================================//
        //=================================================================================================================//
        //=================================================================================================================//
        //=================================================================================================================//
        //=================================================================================================================//
        //=================================================================================================================//
        //=================================================================================================================//




        /**
         * Get Pathaow Districts and Areas
         */
        app.get('/api/pathaow', async (req, res) => {
            try {
                const districts = await pathaowAreaCollection.find({}).toArray();
                res.status(200).json(districts);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching Pathaow districts', error });
            }
        });







        // 1. Add new district
        app.post('/api/pathaow/add-district', async (req, res) => {
            const { district } = req.body;
            if (!district) return res.status(400).json({ message: 'District name is required' });

            try {
                const existingDistrict = await pathaowAreaCollection.findOne({ name: district });
                if (existingDistrict) return res.status(400).json({ message: 'District already exists' });

                const result = await pathaowAreaCollection.insertOne({ name: district });
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ message: 'Failed to add district', error });
            }
        });




        // 2. Get all districts
        app.get('/api/pathaow', async (req, res) => {
            try {
                const districts = await pathaowAreaCollection.find({}).toArray();
                res.status(200).json(districts);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching districts', error });
            }
        });





        // 3. Delete district
        app.delete('/api/pathaow/delete-district/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const result = await pathaowAreaCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.status(200).json({ message: 'District deleted successfully' });
                } else {
                    res.status(404).json({ message: 'District not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to delete district', error });
            }
        });




        // 4. Bulk Upload Districts via Excel
        app.post('/api/pathaow/bulk-upload', upload.single('file'), async (req, res) => {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ message: 'Please upload a file' });
            }

            try {
                // Read the uploaded Excel file
                const workbook = XLSX.readFile(file.path);
                const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                // Store bulk operations to insert or update districts
                const bulkOps = [];

                sheet.forEach(row => {
                    const { District } = row;

                    if (District) {
                        bulkOps.push({
                            updateOne: {
                                filter: { name: District },
                                update: { $setOnInsert: { name: District } },
                                upsert: true
                            }
                        });
                    }
                });
                if (bulkOps.length > 0) {
                    // Perform bulk write operations
                    const result = await pathaowAreaCollection.bulkWrite(bulkOps);
                    res.status(200).json({ message: 'Bulk upload successful', result });
                } else {
                    res.status(400).json({ message: 'No valid data found in the file' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error processing file', error });
            }
        });





        //=========================================================================================================================
        //=========================================================================================================================
        //=========================================================================================================================
        //=========================================================================================================================
        //=========================================================================================================================


        /**
         * RedxArea Routes
         */

        // Add New District
        app.post('/api/redx/add-district', async (req, res) => {
            const { district } = req.body;  // Get the district name from request body

            // Validate that district name is provided
            if (!district) {
                return res.status(400).json({ message: 'District name is required' });
            }

            try {
                // Check if the district already exists
                const existingDistrict = await redxAreaCollection.findOne({ name: district });
                if (existingDistrict) {
                    return res.status(400).json({ message: 'District already exists' });
                }

                // Insert new district
                const result = await redxAreaCollection.insertOne({
                    name: district,
                    areas: [] // Initially, no areas under the district
                });

                res.status(201).json(result);
            } catch (error) {
                console.error('Failed to add district', error);
                res.status(500).json({ message: 'Failed to add district', error });
            }
        });

        // 2. Add Area to a District
        app.post('/api/redx/add-area/:districtId', async (req, res) => {
            const { districtId } = req.params;
            const { area } = req.body;

            if (!area) {
                return res.status(400).json({ message: 'Area name is required' });
            }

            try {
                const result = await redxAreaCollection.updateOne(
                    { _id: new ObjectId(districtId) },
                    { $push: { areas: { _id: new ObjectId(), name: area } } }
                );
                if (result.modifiedCount > 0) {
                    const updatedDistrict = await redxAreaCollection.findOne({ _id: new ObjectId(districtId) });
                    res.status(200).json(updatedDistrict);
                } else {
                    res.status(404).json({ message: 'District not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to add area', error });
            }
        });

        // 3. Bulk Upload Districts and Areas
        app.post('/api/redx/bulk-upload', upload.single('file'), async (req, res) => {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ message: 'Please upload a file' });
            }

            try {
                const workbook = XLSX.readFile(file.path);
                const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const bulkOps = [];

                sheet.forEach(row => {
                    const { 'District': district, 'Area': area } = row;
                    if (district && area) {
                        bulkOps.push({
                            updateOne: {
                                filter: { name: district },
                                update: { $setOnInsert: { name: district }, $addToSet: { areas: { _id: new ObjectId(), name: area } } },
                                upsert: true
                            }
                        });
                    }
                });

                if (bulkOps.length > 0) {
                    const result = await redxAreaCollection.bulkWrite(bulkOps);
                    res.status(200).json({ message: 'Bulk upload successful', result });
                } else {
                    res.status(400).json({ message: 'No valid data found in file' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error processing file', error });
            }
        });

        // 4. Update Area
        app.put('/api/redx/update-area/:districtId/:areaId', async (req, res) => {
            const { districtId, areaId } = req.params;
            const { area } = req.body;

            if (!area) {
                return res.status(400).json({ message: 'Area name is required' });
            }

            try {
                const result = await redxAreaCollection.updateOne(
                    { _id: new ObjectId(districtId), 'areas._id': new ObjectId(areaId) },
                    { $set: { 'areas.$.name': area } }
                );

                if (result.modifiedCount > 0) {
                    const updatedDistrict = await redxAreaCollection.findOne({ _id: new ObjectId(districtId) });
                    res.status(200).json(updatedDistrict);
                } else {
                    res.status(404).json({ message: 'Area not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to update area', error });
            }
        });

        // 5. Delete Area
        app.delete('/api/redx/delete-area/:districtId/:areaId', async (req, res) => {
            const { districtId, areaId } = req.params;

            try {
                const result = await redxAreaCollection.updateOne(
                    { _id: new ObjectId(districtId) },
                    { $pull: { areas: { _id: new ObjectId(areaId) } } }
                );

                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Area deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Area not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to delete area', error });
            }
        });

        // 6. Get all districts and areas
        app.get('/api/redx', async (req, res) => {
            try {
                const districts = await redxAreaCollection.find({}).toArray();
                res.status(200).json(districts);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching data', error });
            }
        });




        // =============================================================================================================
        // =============================================================================================================
        // =============================================================================================================
        // =============================================================================================================




        /**
         * User Routes
         */




        // 1. Get user by UID
        app.get('/api/users/:uid', async (req, res) => {
            const { uid } = req.params;
            try {
                const user = await usersCollection.findOne({ uid });
                if (user) {
                    res.status(200).json(user);
                } else {
                    res.status(404).json({ message: 'User not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error fetching user', error });
            }
        });

        // 2. Add a new user
        app.post('/api/users', async (req, res) => {
            const { userName, email, uid } = req.body;
            try {
                const result = await usersCollection.insertOne({
                    userName,
                    email,
                    uid,
                    createdAt: new Date(),
                });
                res.status(201).json({ message: 'User stored in database successfully', result });
            } catch (error) {
                res.status(500).json({ message: 'Failed to store user', error });
            }
        });

        // 3. Get all users
        app.get('/api/users', async (req, res) => {
            try {
                const users = await usersCollection.find({}).toArray();
                res.status(200).json(users);
            } catch (error) {
                res.status(500).json({ message: 'Failed to retrieve users', error });
            }
        });

        // 4. Update user role
        app.put('/api/users/:id/role', async (req, res) => {
            const { id } = req.params;
            const { role } = req.body;
            try {
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role } }
                );
                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Role updated successfully' });
                } else {
                    res.status(404).json({ message: 'User not found or no changes made' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to update role', error });
            }
        });

        // 5. Delete user
        app.delete('/api/users/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.status(200).json({ message: 'User deleted successfully' });
                } else {
                    res.status(404).json({ message: 'User not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to delete user', error });
            }
        });




        //************************************************************************************************************ */
        //************************************************************************************************************ */
        //************************************************************************************************************ */

        /**
         * Order Routes
         */






        // 1. Create an order
        app.post('/api/orders', async (req, res) => {
            const {
                invoiceId, date, pageName, customerName,
                phoneNumber, address, note, products,
                deliveryCost, advance, discount, grandTotal
            } = req.body;

            const order = {
                invoiceId, date, pageName, customerName, phoneNumber,
                address, note, products, deliveryCost, advance, discount,
                grandTotal, status: 'Pending', createdAt: new Date(),
            };

            try {
                await ordersCollection.insertOne(order);
                res.status(201).json({ message: 'Order created successfully!' });
            } catch (error) {
                res.status(500).json({ message: 'Failed to create order', error });
            }
        });

        // 2. Get all orders
        app.get('/api/orders', async (req, res) => {
            try {
                const orders = await ordersCollection.find({}).toArray();
                res.status(200).json(orders);
            } catch (error) {
                res.status(500).json({ message: 'Failed to retrieve orders', error });
            }
        });

        // 3. Bulk assign orders to users
        app.post('/api/orders/bulk-assign', async (req, res) => {
            const { orderIds, assignedUser } = req.body;
            try {
                const result = await ordersCollection.updateMany(
                    { _id: { $in: orderIds.map(id => new ObjectId(id)) } },
                    { $set: { assignedTo: assignedUser } }
                );
                res.status(200).json({ message: 'Orders assigned successfully!' });
            } catch (error) {
                res.status(500).json({ message: 'Failed to assign orders', error });
            }
        });

        // 4. Delete order
        app.delete('/api/orders/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.status(200).json({ message: 'Order deleted successfully!' });
                } else {
                    res.status(404).json({ message: 'Order not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to delete order', error });
            }
        });









        //************************************************************************************************************** */
        //************************************************************************************************************** */
        //************************************************************************************************************** */
        //************************************************************************************************************** */
        /**
         * Product Routes
         */


        app.get('/api/products/:parentCode/skus', async (req, res) => {
            const parentCode = req.params.parentCode;

            try {
                const collection = client.db('Trendy_management').collection('Product');
                const product = await collection.findOne({ _id: parentCode }, { projection: { 'parentcode.subproduct': 1 } });

                if (product) {
                    res.status(200).json({ skus: product.parentcode.subproduct });
                } else {
                    res.status(404).json({ message: 'Parent Code not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to retrieve SKUs', error });
            }
        });







        // 1. Add parent product
        app.post('/api/products/add-parent', async (req, res) => {
            const { _id } = req.body; // Parent code
            try {
                const newProduct = { _id, parentcode: { subproduct: [] } };
                await productCollection.insertOne(newProduct);
                res.status(201).json({ message: 'Parent code added successfully!' });
            } catch (error) {
                res.status(500).json({ message: 'Failed to add parent code', error });
            }
        });

        // Get all parent codes
        app.get('/api/products/parent-codes', async (req, res) => {
            try {
                const collection = client.db('Trendy_management').collection('Product');
                const parentCodes = await collection.find({}, { projection: { _id: 1 } }).toArray(); // Fetch only parent codes (_id)
                res.status(200).json(parentCodes);
            } catch (error) {
                res.status(500).json({ message: 'Failed to retrieve parent codes', error });
            }
        });

        //Fetch SKUs for a Parent SKU:
        app.get('/api/products/:parent-codes/skus', async (req, res) => {
            const { parentSku } = req.params;
            const collection = client.db('Trendy_management').collection('Product');

            try {
                const product = await collection.findOne({ _id: parentSku });
                if (product) {
                    res.json({ skus: product.parentcode.subproduct }); // Ensure subproduct includes price in the response
                } else {
                    res.status(404).json({ message: 'Parent SKU not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error fetching SKUs', error });
            }
        });


        // Add subproduct under a specific parent code
        app.post('/api/products/add-subproduct/:parentId', async (req, res) => {
            const { parentId } = req.params;
            const subproduct = req.body; // Expecting subproduct data

            try {
                const collection = client.db('Trendy_management').collection('Product');
                await collection.updateOne(
                    { _id: parentId },
                    { $push: { 'parentcode.subproduct': subproduct } }
                );
                res.status(200).json({ message: 'Subproduct added successfully!' });
            } catch (error) {
                res.status(500).json({ message: 'Failed to add subproduct', error });
            }
        });

        // 2. Bulk upload products
        app.post('/api/products/bulk-upload', async (req, res) => {
            const { products } = req.body;
            if (!products || !Array.isArray(products)) {
                return res.status(400).json({ message: 'Invalid data format. Products should be an array.' });
            }

            try {
                for (let product of products) {
                    const parentcode = product.parentcode;
                    const subproduct = {
                        sku: product.sku,
                        name: product.name,
                        buying_price: parseFloat(product.buying_price),  // Ensure numeric value
                        selling_price: parseFloat(product.selling_price), // Ensure numeric value
                        quantity: parseInt(product.quantity)              // Ensure numeric value
                    };

                    const parentProduct = await productCollection.findOne({ _id: parentcode });
                    if (parentProduct) {
                        // Update or add subproduct
                        const subproductExists = parentProduct.parentcode.subproduct.some(
                            (sub) => sub.sku === subproduct.sku
                        );
                        if (subproductExists) {
                            // Update existing subproduct
                            await productCollection.updateOne(
                                { _id: parentcode, 'parentcode.subproduct.sku': subproduct.sku },
                                {
                                    $set: {
                                        'parentcode.subproduct.$.name': subproduct.name,
                                        'parentcode.subproduct.$.buying_price': subproduct.buying_price,
                                        'parentcode.subproduct.$.selling_price': subproduct.selling_price,
                                        'parentcode.subproduct.$.quantity': subproduct.quantity
                                    }
                                }
                            );
                        } else {
                            // Add new subproduct
                            await productCollection.updateOne(
                                { _id: parentcode },
                                { $push: { 'parentcode.subproduct': subproduct } }
                            );
                        }
                    } else {
                        // Create new parent product
                        await productCollection.insertOne({
                            _id: parentcode,
                            parentcode: { subproduct: [subproduct] }
                        });
                    }
                }
                res.status(200).json({ message: 'Products uploaded successfully' });
            } catch (error) {
                res.status(500).json({ message: 'Error uploading products', error });
            }
        });

        // 3. Get all products
        app.get('/api/products', async (req, res) => {
            try {
                const products = await productCollection.find({}).toArray();
                res.status(200).json(products);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching products', error });
            }
        });

        // 4. Delete a subproduct
        app.delete('/api/products/:id/subproduct/:sku', async (req, res) => {
            const { id, sku } = req.params;
            try {
                const result = await productCollection.updateOne(
                    { _id: id },
                    { $pull: { 'parentcode.subproduct': { sku } } }
                );
                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Subproduct deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Subproduct not found or already deleted' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Error deleting subproduct', error });
            }
        });

        // 5. Update product
        app.put('/api/products/:id', async (req, res) => {
            const { id } = req.params;
            const updatedProduct = req.body;
            try {
                const result = await productCollection.updateOne(
                    { _id: id },
                    { $set: updatedProduct }
                );
                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Product updated successfully!' });
                } else {
                    res.status(404).json({ message: 'Product not found or no changes made.' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to update product', error });
            }
        });




        //********************************************************************************************************************************
        //********************************************************************************************************************************
        //********************************************************************************************************************************












        /*************************************************************************
         * Facebook Pages Routes
         ******************************************************************************/
        // 1. Create a Facebook Page
        app.post('/api/facebook-pages/create', async (req, res) => {
            const { pageName } = req.body;
            if (!pageName) {
                return res.status(400).json({ message: 'Page name is required.' });
            }

            try {
                const newPage = { pageName, createdAt: new Date() };
                await facebookPagesCollection.insertOne(newPage);
                res.status(201).json({ message: 'Facebook page created successfully!', newPage });
            } catch (error) {
                res.status(500).json({ message: 'Error creating Facebook page', error });
            }
        });

        // 2. Get all Facebook pages
        app.get('/api/facebook-pages', async (req, res) => {
            try {
                const pages = await facebookPagesCollection.find({}).toArray();
                res.status(200).json(pages);
            } catch (error) {
                res.status(500).json({ message: 'Failed to retrieve Facebook pages', error });
            }
        });

        // 3. Update a Facebook page
        app.put('/api/facebook-pages/:id', async (req, res) => {
            const { id } = req.params;
            const { pageName } = req.body;
            try {
                const result = await facebookPagesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { pageName } }
                );
                if (result.modifiedCount > 0) {
                    res.status(200).json({ message: 'Page updated successfully!' });
                } else {
                    res.status(404).json({ message: 'Page not found or no changes made.' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to update page', error });
            }
        });

        // 4. Delete a Facebook page
        app.delete('/api/facebook-pages/:id', async (req, res) => {
            const { id } = req.params;
            try {
                const result = await facebookPagesCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.status(200).json({ message: 'Page deleted successfully!' });
                } else {
                    res.status(404).json({ message: 'Page not found' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to delete page', error });
            }
        });


        //************************************************************************************************
        //************************************************************************************************
        //************************************************************************************************
        //************************************************************************************************
        //************************************************************************************************

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

run().catch(console.dir);

// Default route for health check
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
