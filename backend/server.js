const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const documentRoutes = require("./routes/documentRoutes");
const outsourcingEmployeeRoutes = require("./routes/outsourcingEmployeeRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Route utama
app.get("/", (req, res) => {
res.json({
success: true,
message: "Employee Management API berjalan"
});
});

// Routes existing
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);

// Route pegawai outsourcing
app.use(
"/api/outsourcing-employees",
outsourcingEmployeeRoutes
);

// Menjalankan server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
console.log(`Server berjalan di http://localhost:${PORT}`);
});
