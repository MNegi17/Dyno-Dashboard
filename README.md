# 📊 Dyno Sales Dashboard

A high-performance, real-time sales analytics dashboard built for tracking revenue, units, and performance targets across multiple channels.

![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3EC98E?style=for-the-badge&logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

## 🚀 Live Demo
Check out the live application here: **[https://dyno-dashboard.vercel.app](https://dyno-dashboard.vercel.app)**

## ✨ Features

### 📈 Sales Overview
- Real-time tracking of **Revenue**, **Units**, and **ASP** (Average Selling Price).
- Interactive charts powered by Recharts (Bar & Line charts).
- Dynamic filtering by **Month**, **Date**, **Division**, **Channel**, and **Category**.

### 🎯 Target & Goal Tracking
- Monthly and Yearly target tracking based on predefined business goals.
- Visual progress bars showing "Target vs Achievement".
- Automatic calculation of **Units Left** to reach the goal.
- Separate tracking for **Apparel** and **Footwear** divisions.

### 🌟 Smart Insights
- **Top 5 Performers**: Quickly identify your best-selling categories, SKUs, and highest revenue products.
- **Toggle Views**: Switch between Revenue and Unit-based insights with a single click.

### 🔄 MoM Growth Analysis
- Automatic comparison between the current and previous month.
- Growth percentage indicators for Revenue, Units, and ASP.
- Channel-wise performance breakdown.

### 🔐 Secure Authentication
- Full Login/Sign-up system powered by **Supabase Auth**.
- **Admin & User Roles**: Role-based access control for data management.

### 📂 Data Management (Admin Only)
- **Bulk Upload**: Upload `.xlsx` or `.csv` sales reports directly to the dashboard.
- **Historical Syncing**: Efficient batch processing for large datasets.

## 🛠️ Tech Stack
- **Frontend**: React.js (Vite)
- **Styling**: Vanilla CSS (Custom Design System)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend/Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## ⚙️ Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MNegi17/Dyno-Dashboard.git
   cd Dyno-Dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file or update `src/supabaseClient.js` with your Supabase credentials:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

## 📄 License
This project is for internal business analytics.

---
Built with ❤️ by Antigravity AI for MNegi17.
