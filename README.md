# CRMS - Class Record Management System (Web Version)

A modern, responsive web application for managing academic records, student information, and class data. This is the **web-only frontend** version of the CRMS system, built with React and Vite.

## 🌐 Live Demo

The application will be available at `http://localhost:3000`

## 🚀 Features

### 👥 Multi-Role System
- **Admin**: User management, system oversight, approvals
- **Faculty**: Class management, attendance, grading, syllabi
- **Dean**: Analytics, reports, syllabus approval
- **Staff**: Student management, academic records
- **Program Chair**: Course management, analytics, submissions

### 📊 Dashboard Features
- **Real-time statistics** and metrics
- **Interactive charts** and visualizations
- **Quick action buttons** for common tasks
- **Recent activity feeds**
- **System alerts** and notifications

### 🎨 Modern UI/UX
- **Responsive design** for all devices
- **Dark/Light theme** support
- **Professional styling** with Tailwind CSS
- **Smooth animations** and transitions
- **Intuitive navigation** with sidebar

### 🔐 Authentication
- **Secure login** system
- **Role-based access** control
- **Protected routes** for each user type
- **Session management**

## 🛠️ Tech Stack

- **Frontend**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.3.6
- **Routing**: React Router DOM 6.8.1
- **HTTP Client**: Axios 1.6.0
- **Icons**: Lucide React 0.294.0
- **State Management**: React Context API
- **Code Quality**: ESLint

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/chappykun24/CRMS_WEB_V2.git
   cd CRMS_WEB_V2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   # Create .env file in the root directory
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 🎯 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 👤 Demo Credentials

For testing purposes, you can use these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@university.edu` | `admin123` |
| Faculty | `faculty@university.edu` | `admin123` |
| Dean | `dean@university.edu` | `admin123` |
| Staff | `staff@university.edu` | `admin123` |
| Program Chair | `chair@university.edu` | `admin123` |

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx      # Application header
│   ├── Sidebar.jsx     # Navigation sidebar
│   └── ProtectedRoute.jsx # Route protection
├── contexts/           # React Context providers
│   └── UserContext.jsx # User authentication state
├── pages/              # Page components
│   ├── admin/          # Admin-specific pages
│   ├── faculty/        # Faculty-specific pages
│   ├── dean/           # Dean-specific pages
│   ├── staff/          # Staff-specific pages
│   └── program-chair/  # Program Chair pages
├── utils/              # Utility functions
│   └── api.js          # API configuration
├── App.jsx             # Main application component
└── main.jsx            # Application entry point
```

## 🎨 Role-Specific Features

### 👨‍💼 Admin Dashboard
- **User Management**: Add, edit, delete system users
- **System Overview**: Performance metrics and health status
- **Approval Management**: Faculty and syllabus approvals
- **System Settings**: Configuration and security settings

### 👨‍🏫 Faculty Dashboard
- **My Classes**: View and manage assigned courses
- **Attendance Management**: Track student attendance
- **Grade Management**: Input and manage student grades
- **Syllabi Creation**: Create and manage course syllabi

### 🎓 Dean Dashboard
- **Analytics**: Institutional performance metrics
- **Reports**: Generate academic reports
- **Syllabus Approval**: Review and approve course syllabi
- **My Classes**: Manage assigned courses

### 👨‍💻 Staff Dashboard
- **Student Management**: Manage student records
- **Academic Records**: Handle academic documentation
- **Faculty Assignment**: Assign faculty to courses

### 🎯 Program Chair Dashboard
- **Course Management**: Oversee program courses
- **Analytics**: Program-specific metrics
- **Submissions**: Review student submissions
- **Reports**: Generate program reports

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### API Integration
The application is configured to work with a backend API. Update the `VITE_API_URL` in your `.env` file to point to your backend server.

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Deploy to Netlify
1. Build the project: `npm run build`
2. Upload the `dist` folder to Netlify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🔗 Links

- **Repository**: [https://github.com/chappykun24/CRMS_WEB_V2.git](https://github.com/chappykun24/CRMS_WEB_V2.git)
- **Issues**: [https://github.com/chappykun24/CRMS_WEB_V2/issues](https://github.com/chappykun24/CRMS_WEB_V2/issues)

## 📞 Support

For support and questions, please open an issue on GitHub or contact the development team.

---

**Note**: This is the web-only frontend version of CRMS. For the full system with backend integration, please refer to the main CRMS repository. 